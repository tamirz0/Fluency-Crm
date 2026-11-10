using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class EmbudosTests
{
    // Identidades de la semilla de tipos (segunda-entrega-catalogos.sql): Clases y Talleres, en ese orden.
    internal const int ClassesType = 1, WorkshopsType = 2;

    internal static async Task<int> Opportunity(AuthApiFactory factory, int stage, bool active = true)
    {
        await using var db = await factory.OpenAsync();
        var company = await CommercialSchemaFixture.ScalarAsync<int>(db, $"INSERT INTO empresa(razon_social,id_estado,id_responsable) VALUES ('Fixture CP07',1,{factory.AdminId}) RETURNING id");
        return await CommercialSchemaFixture.ScalarAsync<int>(db, $"INSERT INTO oportunidad(titulo,id_responsable,id_empresa,id_etapa,id_servicio,valor,activo) VALUES ('Fixture CP07',{factory.AdminId},{company},{stage},(SELECT min(id) FROM servicio),0,{active.ToString().ToLowerInvariant()}) RETURNING id");
    }
    internal static async Task<int> Create(HttpClient client, string path, object body)
    {
        var response = await client.PostAsJsonAsync(path, body);
        Assert.True(response.StatusCode == HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }
    /// <summary>Servicio de tipo Clases (con nivel y modalidad, como exige la API).</summary>
    internal static Task<int> ClassService(HttpClient admin, string name = "CP07") => Create(admin, "/servicios",
        new { nombre = name, precioReferencia = 0, idTipoServicio = ClassesType, idModalidad = 1, idNivel = 1 });
    /// <summary>Admisión por tipo completo (todos los servicios de cada tipo).</summary>
    internal static object[] Types(params int[] types) => types.Select(t => (object)new { idTipoServicio = t }).ToArray();
    private static async Task<int[]> FunnelIds(HttpClient client, string query)
        => (await client.GetFromJsonAsync<JsonElement>($"/embudos{query}")).GetProperty("items").EnumerateArray().Select(x => x.GetProperty("id").GetInt32()).Order().ToArray();

    [Fact]
    public async Task CreatesInitialStagesAndFinalsAndKeepsAdmissionOfInactiveService()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var service = await ClassService(admin);
        var funnel = await Create(admin, "/embudos", new { nombre = "Inscripciones", tipos = new[] { new { idTipoServicio = ClassesType, idServicios = new[] { service } } } });
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal("ABIERTA:1:Consulta recibida,ABIERTA:2:Necesidad relevada,ABIERTA:3:Nivel de inglés evaluado,ABIERTA:4:Presupuesto enviado,GANADA:5:Ganada,PERDIDA:6:Perdida",
                await CommercialSchemaFixture.ScalarAsync<string>(db,
                    $"SELECT string_agg(s.codigo || ':' || e.orden || ':' || e.nombre, ',' ORDER BY e.orden) FROM etapa_comercial e JOIN estado_oportunidad s ON s.id=e.id_estado WHERE id_embudo={funnel} AND e.activo"));
        }
        (await admin.PostAsync($"/servicios/{service}/desactivar", null)).EnsureSuccessStatusCode();
        (await admin.PatchAsJsonAsync($"/embudos/{funnel}", new { nombre = "Conservado", tipos = new[] { new { idTipoServicio = ClassesType, idServicios = new[] { service } } } })).EnsureSuccessStatusCode();
        var saved = await admin.GetFromJsonAsync<JsonElement>($"/embudos/{funnel}");
        Assert.Equal(service, saved.GetProperty("tipos")[0].GetProperty("servicios")[0].GetProperty("id").GetInt32());
        Assert.False(saved.GetProperty("tipos")[0].GetProperty("servicios")[0].GetProperty("activo").GetBoolean());
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/embudos", new { nombre = "Inválido", tipos = new[] { new { idTipoServicio = ClassesType, idServicios = new[] { service } } } })).StatusCode);
        (await admin.PostAsync($"/embudos/{funnel}/desactivar", null)).EnsureSuccessStatusCode();
        (await admin.PostAsync($"/embudos/{funnel}/reactivar", null)).EnsureSuccessStatusCode();
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal(6L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM etapa_comercial WHERE id_embudo={funnel} AND activo"));
            // Force the second final to fail after the new funnel has been inserted.
            await CommercialSchemaFixture.ExecuteAsync(db, "CREATE UNIQUE INDEX fixture_perdida ON etapa_comercial(nombre) WHERE nombre='Perdida'");
        }
        (await admin.PostAsync($"/servicios/{service}/reactivar", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync("/embudos", new { nombre = "Rollback", tipos = Types(ClassesType) })).StatusCode);
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM embudo"));
            Assert.Equal(6L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM etapa_comercial"));
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM embudo_tipo_servicio"));
        }
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        Assert.Equal(HttpStatusCode.OK, (await seller.GetAsync("/embudos")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsJsonAsync("/embudos", new { nombre = "No", tipos = Types(ClassesType) })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/embudos?activo=todos")).StatusCode);
    }

    [Fact]
    public async Task HistoricalUsageIsImmutableAndOnlyActiveOpenOpportunitiesBlockBaja()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var service = await ClassService(admin);
        var funnel = await Create(admin, "/embudos", new { nombre = "Proceso", tipos = Types(ClassesType) });
        int open, won;
        await using (var db = await factory.OpenAsync())
        {
            open = await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT e.id FROM etapa_comercial e JOIN estado_oportunidad s ON s.id=e.id_estado WHERE e.id_embudo={funnel} AND s.codigo='ABIERTA' ORDER BY e.orden LIMIT 1");
            won = await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT e.id FROM etapa_comercial e JOIN estado_oportunidad s ON s.id=e.id_estado WHERE e.id_embudo={funnel} AND s.codigo='GANADA'");
        }
        var opportunity = await Opportunity(factory, open);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/embudos/{funnel}/desactivar", null)).StatusCode);
        // Quitar el tipo del servicio de una oportunidad existente dejaría a esa oportunidad sin admisión.
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PatchAsJsonAsync($"/embudos/{funnel}", new { nombre = "No debe guardarse", tipos = Types(WorkshopsType) })).StatusCode);
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal("Proceso", await CommercialSchemaFixture.ScalarAsync<string>(db, $"SELECT nombre FROM embudo WHERE id={funnel}"));
            await CommercialSchemaFixture.ExecuteAsync(db, $"INSERT INTO historial_etapas(id_oportunidad,id_etapa_anterior,id_nueva_etapa,id_usuario) VALUES ({opportunity},{open},{won},{factory.AdminId}); UPDATE oportunidad SET id_etapa={won} WHERE id={opportunity}");
        }
        (await admin.PostAsync($"/embudos/{funnel}/desactivar", null)).EnsureSuccessStatusCode();
        (await admin.PostAsync($"/embudos/{funnel}/reactivar", null)).EnsureSuccessStatusCode();
        await using (var db = await factory.OpenAsync()) await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE oportunidad SET id_etapa={open},activo=false WHERE id={opportunity}");
        (await admin.PostAsync($"/embudos/{funnel}/desactivar", null)).EnsureSuccessStatusCode();
        (await admin.PostAsync($"/embudos/{funnel}/reactivar", null)).EnsureSuccessStatusCode();
        // La baja de la oportunidad no libera el historial: el servicio sigue necesitando admisión.
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PatchAsJsonAsync($"/embudos/{funnel}", new { tipos = Types(WorkshopsType) })).StatusCode);
        // Agregar tipos sí se puede, y también restringir a una selección que incluya el servicio usado.
        (await admin.PatchAsJsonAsync($"/embudos/{funnel}", new { tipos = Types(ClassesType, WorkshopsType) })).EnsureSuccessStatusCode();
        (await admin.PatchAsJsonAsync($"/embudos/{funnel}", new { tipos = new[] { new { idTipoServicio = ClassesType, idServicios = new[] { service } } } })).EnsureSuccessStatusCode();
        await using (var db = await factory.OpenAsync()) Assert.False(await CommercialSchemaFixture.ScalarAsync<bool>(db, $"SELECT activo FROM oportunidad WHERE id={opportunity}"));
    }

    [Fact]
    public async Task AdmissionByTypeWithOptionalServiceSelectionDecidesWhichFunnelsAcceptAService()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        var first = await ClassService(admin, "Clases A");
        var workshop = await Create(admin, "/servicios", new { nombre = "Taller", precioReferencia = 0, idTipoServicio = WorkshopsType, idModalidad = 1 });
        var all = await Create(admin, "/embudos", new { nombre = "Clases", tipos = Types(ClassesType) });
        var picked = await Create(admin, "/embudos", new { nombre = "Solo A", tipos = new[] { new { idTipoServicio = ClassesType, idServicios = new[] { first } } } });
        var workshops = await Create(admin, "/embudos", new { nombre = "Talleres", tipos = Types(WorkshopsType) });

        Assert.Equal(new[] { all, picked }.Order().ToArray(), await FunnelIds(seller, $"?idServicio={first}"));
        // Un servicio nuevo del tipo entra solo donde se admite el tipo completo.
        var second = await ClassService(admin, "Clases B");
        Assert.Equal(new[] { all }, await FunnelIds(seller, $"?idServicio={second}"));
        Assert.Equal(new[] { workshops }, await FunnelIds(seller, $"?idServicio={workshop}"));
        Assert.Empty(await FunnelIds(seller, "?idServicio=999999"));
        Assert.Equal(new[] { all, picked, workshops }.Order().ToArray(), await FunnelIds(seller, ""));
        var detail = await admin.GetFromJsonAsync<JsonElement>($"/embudos/{picked}");
        Assert.True(detail.GetProperty("tipos")[0].GetProperty("tipo").GetProperty("nivelObligatorio").GetBoolean());
        Assert.Equal(first, detail.GetProperty("tipos")[0].GetProperty("servicios")[0].GetProperty("id").GetInt32());
        Assert.Equal(0, (await admin.GetFromJsonAsync<JsonElement>($"/embudos/{all}")).GetProperty("tipos")[0].GetProperty("servicios").GetArrayLength());

        // Admisiones inválidas: sin tipos, repetidos, inexistentes o con un servicio que no es del tipo.
        foreach (var body in new object[]
                 {
                     new { nombre = "A", tipos = Array.Empty<object>() }, new { nombre = "B" },
                     new { nombre = "C", tipos = Types(ClassesType, ClassesType) }, new { nombre = "D", tipos = Types(999999) },
                     new { nombre = "E", tipos = new[] { new { idTipoServicio = ClassesType, idServicios = new[] { workshop } } } },
                     new { nombre = "F", tipos = new[] { new { idTipoServicio = 0, idServicios = (int[]?)null } } }
                 })
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/embudos", body)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PatchAsJsonAsync($"/embudos/{all}", new { tipos = Array.Empty<object>() })).StatusCode);

        // Una oportunidad solo se crea con un servicio que el embudo admite.
        var company = await Create(admin, "/empresas", new { razonSocial = "Empresa X" });
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/oportunidades", new { idEmbudo = picked, idServicio = second, idEmpresa = company })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/oportunidades", new { idEmbudo = all, idServicio = workshop, idEmpresa = company })).StatusCode);
        var created = await admin.PostAsJsonAsync("/oportunidades", new { idEmbudo = picked, idServicio = first, idEmpresa = company });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal(first, (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("idServicio").GetInt32());
        // Con una oportunidad del servicio, el embudo no puede dejar de admitirlo.
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PatchAsJsonAsync($"/embudos/{picked}", new { tipos = new[] { new { idTipoServicio = ClassesType, idServicios = new[] { second } } } })).StatusCode);
    }
}
