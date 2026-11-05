using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class AltaOportunidadTests
{
    private sealed record Seed(int CompanyA, int CompanyB, int ContactA, int Funnel, int FirstOpen, int SecondOpen, int Won, int OtherFunnelOpen);

    // Fixture mínimo propio: SeedContextAsync multiplica filas por cada usuario de AuthApiFactory.
    private static async Task<Seed> SeedAsync(AuthApiFactory factory, HttpClient client)
    {
        async Task<int> CreateAsync(string url, object body) => (await (await client.PostAsJsonAsync(url, body)).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var companyA = await CreateAsync("/empresas", new { razonSocial = "Empresa A" });
        var companyB = await CreateAsync("/empresas", new { razonSocial = "Empresa B" });
        var contactA = await CreateAsync("/contactos", new { nombre = "Ana", apellido = "Prueba", correo = "ana@example.invalid", idEmpresa = companyA });
        await using var db = await factory.OpenAsync();
        await CommercialSchemaFixture.ExecuteAsync(db, """
            INSERT INTO servicio(nombre,precio_referencia) VALUES ('Servicio ficticio',100.25),('Otro servicio',50);
            INSERT INTO embudo(nombre,id_servicio) SELECT 'Embudo ficticio',id FROM servicio WHERE nombre='Servicio ficticio';
            INSERT INTO embudo(nombre,id_servicio) SELECT 'Otro embudo',id FROM servicio WHERE nombre='Otro servicio';
            INSERT INTO etapa_comercial(id_embudo,id_estado,nombre,orden)
            SELECT b.id,e.id,CASE e.codigo WHEN 'ABIERTA' THEN 'Primera' WHEN 'GANADA' THEN 'Ganada' ELSE 'Perdida' END,
            CASE e.codigo WHEN 'GANADA' THEN 1 WHEN 'PERDIDA' THEN 2 ELSE 3 END FROM embudo b CROSS JOIN estado_oportunidad e;
            INSERT INTO etapa_comercial(id_embudo,id_estado,nombre,orden)
            SELECT b.id,e.id,'Segunda',4 FROM embudo b CROSS JOIN estado_oportunidad e WHERE b.nombre='Embudo ficticio' AND e.codigo='ABIERTA';
            """);
        return new(companyA, companyB, contactA,
            await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM embudo WHERE nombre='Embudo ficticio'"),
            await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM etapa_comercial WHERE nombre='Primera' AND id_embudo=(SELECT id FROM embudo WHERE nombre='Embudo ficticio')"),
            await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM etapa_comercial WHERE nombre='Segunda'"),
            await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM etapa_comercial WHERE nombre='Ganada' AND id_embudo=(SELECT id FROM embudo WHERE nombre='Embudo ficticio')"),
            await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM etapa_comercial WHERE nombre='Primera' AND id_embudo=(SELECT id FROM embudo WHERE nombre='Otro embudo')"));
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<long> CountAsync(AuthApiFactory factory, string table)
    {
        await using var db = await factory.OpenAsync();
        return await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM {table}");
    }

    [Fact]
    public async Task MinimalCreationAssignsFirstOpenStageActorValueAndInitialHistory()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        var seed = await SeedAsync(factory, admin);

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync("/oportunidades", new { titulo = "X", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA })).StatusCode);
        // El servicio inactivo no bloquea un embudo activo.
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, "UPDATE servicio SET activo=false WHERE nombre='Servicio ficticio'");

        var response = await seller.PostAsJsonAsync("/oportunidades", new { titulo = "  Curso B1  ", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await Json(response);
        var id = created.GetProperty("id").GetInt32();
        Assert.EndsWith($"/oportunidades/{id}", response.Headers.Location!.ToString());
        Assert.Equal("Curso B1", created.GetProperty("titulo").GetString());
        Assert.Equal("Curso B1", created.GetProperty("tituloVisible").GetString());
        Assert.Equal(seed.FirstOpen, created.GetProperty("idEtapa").GetInt32());
        Assert.Equal("ABIERTA", created.GetProperty("estado").GetString());
        Assert.Equal(seed.Funnel, created.GetProperty("idEmbudo").GetInt32());
        Assert.Equal("Servicio ficticio", created.GetProperty("servicioNombre").GetString());
        Assert.False(created.GetProperty("servicioActivo").GetBoolean());
        Assert.Equal(factory.SellerId, created.GetProperty("idResponsable").GetInt32());
        Assert.Equal(100.25m, created.GetProperty("valor").GetDecimal());
        Assert.True(created.GetProperty("activo").GetBoolean());
        var actions = created.GetProperty("accionesPermitidas");
        Assert.True(actions.GetProperty("editar").GetBoolean());
        Assert.False(actions.GetProperty("reabrir").GetBoolean());

        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM historial_etapas WHERE id_oportunidad={id} AND id_etapa_anterior IS NULL AND id_nueva_etapa={seed.FirstOpen} AND id_usuario={factory.SellerId} AND observacion IS NULL"));
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM historial_etapas"));
        }

        // Cualquier usuario lee la oportunidad, pero el vendedor ajeno no recibe acciones.
        var seenByAdmin = await Json(await admin.GetAsync($"/oportunidades/{id}"));
        Assert.True(seenByAdmin.GetProperty("accionesPermitidas").GetProperty("editar").GetBoolean());
        var adminsOwn = await Json(await admin.PostAsJsonAsync("/oportunidades", new { titulo = "Del admin", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA }));
        var seenBySeller = await Json(await seller.GetAsync($"/oportunidades/{adminsOwn.GetProperty("id").GetInt32()}"));
        Assert.Equal(factory.AdminId, seenBySeller.GetProperty("idResponsable").GetInt32());
        Assert.All(seenBySeller.GetProperty("accionesPermitidas").EnumerateObject(), action => Assert.False(action.Value.GetBoolean(), action.Name));
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync("/oportunidades/999999")).StatusCode);
    }

    [Fact]
    public async Task ValueDefaultsKeepExplicitZeroAndParticipantsDoNotMultiplyAndOptionalFieldsDoNotBlock()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var seed = await SeedAsync(factory, admin);
        async Task<JsonElement> Create(object body) { var r = await admin.PostAsJsonAsync("/oportunidades", body); Assert.Equal(HttpStatusCode.Created, r.StatusCode); return await Json(r); }

        var omitted = await Create(new { titulo = "A", idEmbudo = seed.Funnel, idContacto = seed.ContactA, cantidadParticipantes = 5 });
        Assert.Equal(100.25m, omitted.GetProperty("valor").GetDecimal());
        Assert.Equal(5, omitted.GetProperty("cantidadParticipantes").GetInt32());
        Assert.Equal(JsonValueKind.Null, omitted.GetProperty("idEmpresa").ValueKind);
        Assert.Equal(100.25m, (await Create(new { titulo = "B", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, valor = (decimal?)null })).GetProperty("valor").GetDecimal());
        Assert.Equal(0m, (await Create(new { titulo = "C", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, valor = 0 })).GetProperty("valor").GetDecimal());
        var full = await Create(new
        {
            titulo = "D", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idContacto = seed.ContactA, idEtapa = seed.SecondOpen,
            valor = 1500.5, fechaEstimadaCierre = "2026-12-31", objetivoAprendizaje = "  Reuniones  ", disponibilidadHoraria = "Martes", observaciones = "  "
        });
        Assert.Equal(seed.SecondOpen, full.GetProperty("idEtapa").GetInt32());
        Assert.Equal(1500.5m, full.GetProperty("valor").GetDecimal());
        Assert.Equal("2026-12-31", full.GetProperty("fechaEstimadaCierre").GetString());
        Assert.Equal("Reuniones", full.GetProperty("objetivoAprendizaje").GetString());
        Assert.Equal(JsonValueKind.Null, full.GetProperty("observaciones").ValueKind);
        // El precio del servicio cambia después y no recalcula lo ya guardado.
        await using var db = await factory.OpenAsync();
        await CommercialSchemaFixture.ExecuteAsync(db, "UPDATE servicio SET precio_referencia=999 WHERE nombre='Servicio ficticio'");
        Assert.Equal(100.25m, (await Json(await admin.GetAsync($"/oportunidades/{omitted.GetProperty("id").GetInt32()}"))).GetProperty("valor").GetDecimal());
    }

    [Fact]
    public async Task WithoutATitleTheClientNameIsShownAndAnExplicitTitlePrevails()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var seed = await SeedAsync(factory, admin);
        async Task<JsonElement> Create(object body) { var r = await admin.PostAsJsonAsync("/oportunidades", body); Assert.Equal(HttpStatusCode.Created, r.StatusCode); return await Json(r); }

        var company = await Create(new { idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
        Assert.Equal(JsonValueKind.Null, company.GetProperty("titulo").ValueKind);
        Assert.Equal("Empresa A", company.GetProperty("tituloVisible").GetString());
        var contact = await Create(new { idEmbudo = seed.Funnel, idContacto = seed.ContactA });
        Assert.Equal("Ana Prueba", contact.GetProperty("tituloVisible").GetString());
        var both = await Create(new { idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idContacto = seed.ContactA, titulo = "   " });
        Assert.Equal(JsonValueKind.Null, both.GetProperty("titulo").ValueKind);
        Assert.Equal("Empresa A – Ana Prueba", both.GetProperty("tituloVisible").GetString());
        var titled = await Create(new { idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, titulo = "Curso B1" });
        Assert.Equal("Curso B1", titled.GetProperty("titulo").GetString());
        Assert.Equal("Curso B1", titled.GetProperty("tituloVisible").GetString());
        // La lectura posterior muestra lo mismo.
        Assert.Equal("Empresa A – Ana Prueba", (await Json(await admin.GetAsync($"/oportunidades/{both.GetProperty("id").GetInt32()}"))).GetProperty("tituloVisible").GetString());
    }

    [Fact]
    public async Task ResponsibleRulesAndForgedFieldsAreRejected()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        var seed = await SeedAsync(factory, admin);
        var body = new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA };

        var assigned = await admin.PostAsJsonAsync("/oportunidades", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idResponsable = factory.SellerId });
        Assert.Equal(HttpStatusCode.Created, assigned.StatusCode);
        var created = await Json(assigned);
        Assert.Equal(factory.SellerId, created.GetProperty("idResponsable").GetInt32());
        // El superior que asigna a otro no es el dueño, pero conserva acciones; el historial lo firma el actor.
        Assert.True(created.GetProperty("accionesPermitidas").GetProperty("editar").GetBoolean());
        await using (var db = await factory.OpenAsync())
            Assert.Equal(factory.AdminId, await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id_usuario FROM historial_etapas WHERE id_oportunidad={created.GetProperty("id").GetInt32()}"));

        var other = await seller.PostAsJsonAsync("/oportunidades", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idResponsable = factory.AdminId });
        Assert.Equal(HttpStatusCode.Forbidden, other.StatusCode);
        Assert.Equal("FORBIDDEN", (await Json(other)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Created, (await seller.PostAsJsonAsync("/oportunidades", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idResponsable = factory.SellerId })).StatusCode);

        foreach (var forged in new object[]
                 {
                     new { titulo = "F", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idUsuario = factory.AdminId },
                     new { titulo = "F", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, estado = "GANADA" },
                     new { titulo = "F", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, activo = false },
                     new { titulo = "F", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idServicio = 1 },
                     new { titulo = "F", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, fechaCreacion = "2020-01-01T00:00:00Z" },
                 })
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/oportunidades", forged)).StatusCode);

        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE usuario SET activo=false WHERE id={factory.SellerId}");
        var inactive = await admin.PostAsJsonAsync("/oportunidades", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idResponsable = factory.SellerId });
        Assert.Equal(HttpStatusCode.BadRequest, inactive.StatusCode);
        Assert.Equal("REFERENCE_UNAVAILABLE", (await Json(inactive)).GetProperty("code").GetString());
        Assert.Equal(2L, await CountAsync(factory, "oportunidad"));
    }

    [Fact]
    public async Task InvalidClientsFunnelsStagesAndValuesAreRejectedWithoutWritingAnything()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var seed = await SeedAsync(factory, admin);
        int inactiveCompany;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "INSERT INTO empresa(razon_social,id_estado,id_responsable) SELECT 'Inactiva',min(e.id),min(u.id) FROM estado_cliente e CROSS JOIN usuario u; UPDATE empresa SET activo=false WHERE razon_social='Inactiva'");
            inactiveCompany = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM empresa WHERE razon_social='Inactiva'");
        }
        var cases = new (string Name, object Body, string Code)[]
        {
            ("sin cliente", new { titulo = "A", idEmbudo = seed.Funnel }, "VALIDATION_FAILED"),
            ("título demasiado largo", new { titulo = new string('x', 101), idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA }, "VALIDATION_FAILED"),
            ("sin embudo", new { titulo = "A", idEmpresa = seed.CompanyA }, "VALIDATION_FAILED"),
            ("valor negativo", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, valor = -1 }, "VALIDATION_FAILED"),
            ("valor con tres decimales", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, valor = 1.005 }, "VALIDATION_FAILED"),
            ("participantes cero", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, cantidadParticipantes = 0 }, "VALIDATION_FAILED"),
            ("embudo inexistente", new { titulo = "A", idEmbudo = 999999, idEmpresa = seed.CompanyA }, "REFERENCE_UNAVAILABLE"),
            ("empresa inactiva", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = inactiveCompany }, "REFERENCE_UNAVAILABLE"),
            ("contacto inexistente", new { titulo = "A", idEmbudo = seed.Funnel, idContacto = 999999 }, "REFERENCE_UNAVAILABLE"),
            ("origen inexistente", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idOrigen = 999999 }, "REFERENCE_UNAVAILABLE"),
            ("contacto de otra empresa", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyB, idContacto = seed.ContactA }, "VALIDATION_FAILED"),
            ("etapa final", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idEtapa = seed.Won }, "REFERENCE_UNAVAILABLE"),
            ("etapa de otro embudo", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idEtapa = seed.OtherFunnelOpen }, "REFERENCE_UNAVAILABLE"),
        };
        foreach (var (name, body, code) in cases)
        {
            var response = await admin.PostAsJsonAsync("/oportunidades", body);
            Assert.True(HttpStatusCode.BadRequest == response.StatusCode, name);
            var problem = await Json(response);
            if (problem.TryGetProperty("code", out var actual)) Assert.True(code == actual.GetString(), name);
        }

        // Etapa desactivada y embudo desactivado tampoco sirven; sin abierta activa el alta se bloquea con 409.
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE etapa_comercial SET activo=false WHERE id={seed.SecondOpen}");
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/oportunidades", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idEtapa = seed.SecondOpen })).StatusCode);
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE etapa_comercial SET activo=false WHERE id={seed.FirstOpen}");
        var blocked = await admin.PostAsJsonAsync("/oportunidades", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        Assert.Equal("BUSINESS_CONFLICT", (await Json(blocked)).GetProperty("code").GetString());
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE etapa_comercial SET activo=true WHERE id={seed.FirstOpen}; UPDATE embudo SET activo=false WHERE id={seed.Funnel}");
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/oportunidades", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA })).StatusCode);

        Assert.Equal(0L, await CountAsync(factory, "oportunidad"));
        Assert.Equal(0L, await CountAsync(factory, "historial_etapas"));
    }

    [Fact]
    public async Task AFailureWhileWritingTheHistoryLeavesNoOpportunityBehind()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var seed = await SeedAsync(factory, admin);
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, "ALTER TABLE historial_etapas ADD CONSTRAINT ck_prueba_rollback CHECK (observacion IS NOT NULL)");

        HttpResponseMessage? response = null;
        var error = await Record.ExceptionAsync(async () => response = await admin.PostAsJsonAsync("/oportunidades", new { titulo = "A", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA }));
        Assert.True(error is not null || response!.StatusCode == HttpStatusCode.InternalServerError);
        Assert.Equal(0L, await CountAsync(factory, "oportunidad"));
        Assert.Equal(0L, await CountAsync(factory, "historial_etapas"));
    }

    [Fact]
    public async Task CreationRacingTheRemovalOfItsClientNeverLeavesAnActiveOpportunityOnAnInactiveClient()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        var seed = await SeedAsync(factory, admin);
        for (var round = 1; round <= 6; round++)
        {
            var company = (await Json(await admin.PostAsJsonAsync("/empresas", new { razonSocial = $"Carrera {round}" }))).GetProperty("id").GetInt32();
            var contact = (await Json(await admin.PostAsJsonAsync("/contactos", new { nombre = "Eva", apellido = $"R{round}", correo = $"r{round}@example.invalid" }))).GetProperty("id").GetInt32();
            var removals = new[] { admin.DeleteAsync($"/empresas/{company}"), admin.DeleteAsync($"/contactos/{contact}") };
            var creation = seller.PostAsJsonAsync("/oportunidades", new { titulo = $"R{round}", idEmbudo = seed.Funnel, idEmpresa = company, idContacto = (int?)null });
            var creationWithContact = seller.PostAsJsonAsync("/oportunidades", new { titulo = $"C{round}", idEmbudo = seed.Funnel, idContacto = contact });
            await Task.WhenAll(removals.Append(creation).Append(creationWithContact));
            foreach (var removal in removals) Assert.Contains((await removal).StatusCode, new[] { HttpStatusCode.NoContent, HttpStatusCode.Conflict });
            foreach (var result in new[] { await creation, await creationWithContact })
                Assert.Contains(result.StatusCode, new[] { HttpStatusCode.Created, HttpStatusCode.BadRequest, HttpStatusCode.Conflict });
            await using var db = await factory.OpenAsync();
            Assert.Equal(0L, await CommercialSchemaFixture.ScalarAsync<long>(db, """
                SELECT count(*) FROM oportunidad o
                LEFT JOIN empresa e ON e.id=o.id_empresa LEFT JOIN contacto c ON c.id=o.id_contacto
                WHERE o.activo AND (NOT e.activo OR NOT c.activo)
                """));
        }
    }
}
