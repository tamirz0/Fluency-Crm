using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class EmbudosTests
{
    internal static async Task<int> Opportunity(AuthApiFactory factory, int stage, bool active = true)
    {
        await using var db = await factory.OpenAsync();
        var company = await CommercialSchemaFixture.ScalarAsync<int>(db, $"INSERT INTO empresa(razon_social,id_estado,id_responsable) VALUES ('Fixture CP07',1,{factory.AdminId}) RETURNING id");
        return await CommercialSchemaFixture.ScalarAsync<int>(db, $"INSERT INTO oportunidad(titulo,id_responsable,id_empresa,id_etapa,valor,activo) VALUES ('Fixture CP07',{factory.AdminId},{company},{stage},0,{active.ToString().ToLowerInvariant()}) RETURNING id");
    }
    internal static async Task<int> Create(HttpClient client, string path, object body)
    {
        var response = await client.PostAsJsonAsync(path, body);
        Assert.True(response.StatusCode == HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    [Fact]
    public async Task CreatesExactlyTwoFinalsAndPreservesInactiveService()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var service = await Create(admin, "/servicios", new { nombre = "CP07", precioReferencia = 0 });
        var funnel = await Create(admin, "/embudos", new { nombre = "Inscripciones", idServicio = service });
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal("GANADA:1,PERDIDA:2", await CommercialSchemaFixture.ScalarAsync<string>(db,
                $"SELECT string_agg(s.codigo || ':' || e.orden, ',' ORDER BY e.orden) FROM etapa_comercial e JOIN estado_oportunidad s ON s.id=e.id_estado WHERE id_embudo={funnel}"));
        }
        (await admin.PostAsync($"/servicios/{service}/desactivar", null)).EnsureSuccessStatusCode();
        (await admin.PatchAsJsonAsync($"/embudos/{funnel}", new { nombre = "Conservado", idServicio = service })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/embudos", new { nombre = "Inválido", idServicio = service })).StatusCode);
        (await admin.PostAsync($"/embudos/{funnel}/desactivar", null)).EnsureSuccessStatusCode();
        (await admin.PostAsync($"/embudos/{funnel}/reactivar", null)).EnsureSuccessStatusCode();
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal(2L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM etapa_comercial WHERE id_embudo={funnel} AND activo"));
            // Force the second final to fail after the new funnel has been inserted.
            await CommercialSchemaFixture.ExecuteAsync(db, "CREATE UNIQUE INDEX fixture_perdida ON etapa_comercial(nombre) WHERE nombre='Perdida'");
        }
        (await admin.PostAsync($"/servicios/{service}/reactivar", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync("/embudos", new { nombre = "Rollback", idServicio = service })).StatusCode);
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM embudo"));
            Assert.Equal(2L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM etapa_comercial"));
        }
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        Assert.Equal(HttpStatusCode.OK, (await seller.GetAsync("/embudos")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsJsonAsync("/embudos", new { nombre = "No", idServicio = service })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/embudos?activo=todos")).StatusCode);
    }

    [Fact]
    public async Task HistoricalUsageIsImmutableAndOnlyActiveOpenOpportunitiesBlockBaja()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var service = await Create(admin, "/servicios", new { nombre = "CP07", precioReferencia = 0 });
        var other = await Create(admin, "/servicios", new { nombre = "Otro", precioReferencia = 0 });
        var funnel = await Create(admin, "/embudos", new { nombre = "Proceso", idServicio = service });
        int open, won;
        await using (var db = await factory.OpenAsync())
        {
            open = await CommercialSchemaFixture.ScalarAsync<int>(db, $"INSERT INTO etapa_comercial(nombre,id_embudo,id_estado,orden) SELECT 'Abierta',{funnel},id,3 FROM estado_oportunidad WHERE codigo='ABIERTA' RETURNING id");
            won = await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT e.id FROM etapa_comercial e JOIN estado_oportunidad s ON s.id=e.id_estado WHERE e.id_embudo={funnel} AND s.codigo='GANADA'");
        }
        var opportunity = await Opportunity(factory, open);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/embudos/{funnel}/desactivar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PatchAsJsonAsync($"/embudos/{funnel}", new { nombre = "No debe guardarse", idServicio = other })).StatusCode);
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
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PatchAsJsonAsync($"/embudos/{funnel}", new { idServicio = other })).StatusCode);
        await using (var db = await factory.OpenAsync()) Assert.False(await CommercialSchemaFixture.ScalarAsync<bool>(db, $"SELECT activo FROM oportunidad WHERE id={opportunity}"));
    }
}
