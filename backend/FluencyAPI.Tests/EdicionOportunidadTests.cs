using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class EdicionOportunidadTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<int> CreateAsync(HttpClient client, object body)
    {
        var response = await client.PostAsJsonAsync("/oportunidades", body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetInt32();
    }

    private static Task<HttpResponseMessage> Patch(HttpClient client, int id, string json)
        => client.PatchAsync($"/oportunidades/{id}", new StringContent(json, Encoding.UTF8, "application/json"));

    [Fact]
    public async Task OnlyTheOwnerSellerOrASuperiorEditsAnOpenOpportunityWithTheAgreedFields()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        var mine = await CreateAsync(seller, new { titulo = "Propia", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var theirs = await CreateAsync(admin, new { titulo = "Del admin", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var closed = await CreateAsync(admin, new { titulo = "Cerrada", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var removed = await CreateAsync(admin, new { titulo = "Eliminada", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE oportunidad SET id_etapa={seed.Won}, fecha_cierre=now() WHERE id={closed}; UPDATE oportunidad SET activo=false WHERE id={removed}");

        Assert.Equal(HttpStatusCode.Unauthorized, (await Patch(anonymous, mine, """{"titulo":"X"}""")).StatusCode);

        // Edición válida de la propia: solo cambia lo enviado; cero es un importe válido; vacío limpia lo opcional.
        var edited = await Patch(seller, mine, """{"titulo":"  Curso B2  ","valor":0,"cantidadParticipantes":5,"fechaEstimadaCierre":"2027-01-31","observaciones":"Seguimiento","objetivoAprendizaje":"  "}""");
        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        var body = await Json(edited);
        Assert.Equal("Curso B2", body.GetProperty("titulo").GetString());
        Assert.Equal(0m, body.GetProperty("valor").GetDecimal());
        Assert.Equal(5, body.GetProperty("cantidadParticipantes").GetInt32());
        Assert.Equal("2027-01-31", body.GetProperty("fechaEstimadaCierre").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("objetivoAprendizaje").ValueKind);
        Assert.Equal(seed.CompanyA, body.GetProperty("idEmpresa").GetInt32());
        Assert.Equal(seed.FirstOpen, body.GetProperty("idEtapa").GetInt32());
        Assert.Equal(factory.SellerId, body.GetProperty("idResponsable").GetInt32());
        Assert.True(body.GetProperty("accionesPermitidas").GetProperty("editar").GetBoolean());

        // Título null lo limpia y el nombre visible vuelve a ser el del cliente.
        var cleared = await Json(await Patch(seller, mine, """{"titulo":null,"cantidadParticipantes":null}"""));
        Assert.Equal(JsonValueKind.Null, cleared.GetProperty("titulo").ValueKind);
        Assert.Equal("Empresa A", cleared.GetProperty("tituloVisible").GetString());
        Assert.Equal(JsonValueKind.Null, cleared.GetProperty("cantidadParticipantes").ValueKind);

        // Un superior edita la de otro; el vendedor no edita la ajena aunque fuerce la llamada.
        Assert.Equal(HttpStatusCode.OK, (await Patch(admin, mine, """{"titulo":"Revisada"}""")).StatusCode);
        var denied = await Patch(seller, theirs, """{"titulo":"Hackeada"}""");
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
        Assert.Equal("FORBIDDEN", (await Json(denied)).GetProperty("code").GetString());
        Assert.Equal("Del admin", (await Json(await admin.GetAsync($"/oportunidades/{theirs}"))).GetProperty("titulo").GetString());

        // Cerrada: se rechaza también al superior (reapertura previa); inexistente o dada de baja: 404.
        var closedPatch = await Patch(admin, closed, """{"titulo":"Cambio"}""");
        Assert.Equal(HttpStatusCode.Conflict, closedPatch.StatusCode);
        Assert.Equal("BUSINESS_CONFLICT", (await Json(closedPatch)).GetProperty("code").GetString());
        Assert.Equal("Cerrada", (await Json(await admin.GetAsync($"/oportunidades/{closed}"))).GetProperty("titulo").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await Patch(admin, 999999, """{"titulo":"X"}""")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Patch(admin, removed, """{"titulo":"X"}""")).StatusCode);

        // Valores y campos inválidos: 400 y nada cambia (incluido lo que sí era válido en el mismo cuerpo).
        foreach (var invalid in new[]
                 {
                     """{"titulo":"Nuevo","valor":null}""", """{"titulo":"Nuevo","valor":-1}""", """{"titulo":"Nuevo","valor":1.234}""",
                     """{"titulo":"Nuevo","cantidadParticipantes":0}""", """{"titulo":"Nuevo","fechaEstimadaCierre":"2027-02-30"}""",
                     $$"""{"titulo":"{{new string('x', 101)}}"}""", """{}""",
                     """{"titulo":"Nuevo","idEmpresa":null,"idContacto":null}""",
                     """{"titulo":"Nuevo","idResponsable":1}""", """{"titulo":"Nuevo","idEtapa":1}""", """{"titulo":"Nuevo","estado":"GANADA"}""",
                     """{"titulo":"Nuevo","activo":false}""", """{"titulo":"Nuevo","idEmbudo":1}""", """{"titulo":"Nuevo","idUsuario":1}""",
                 })
            Assert.Equal(HttpStatusCode.BadRequest, (await Patch(seller, mine, invalid)).StatusCode);
        var unchanged = await Json(await seller.GetAsync($"/oportunidades/{mine}"));
        Assert.Equal("Revisada", unchanged.GetProperty("titulo").GetString());
        Assert.Equal(0m, unchanged.GetProperty("valor").GetDecimal());

        // Editar no crea movimientos ficticios: solo las cuatro entradas iniciales.
        await using var check = await factory.OpenAsync();
        Assert.Equal(4L, await CommercialSchemaFixture.ScalarAsync<long>(check, "SELECT count(*) FROM historial_etapas"));
    }

    [Fact]
    public async Task AssociationsAreValidatedOnlyWhenTheyChangeAndHistoricalReferencesSurviveOrdinaryEdits()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int origin, otherOrigin, inactiveCompany;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "INSERT INTO origen_comercial(descripcion,activo) VALUES ('Activo',true),('Retirado',false)");
            origin = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM origen_comercial WHERE descripcion='Activo'");
            otherOrigin = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM origen_comercial WHERE descripcion='Retirado'");
        }
        inactiveCompany = (await Json(await admin.PostAsJsonAsync("/empresas", new { razonSocial = "Empresa C" }))).GetProperty("id").GetInt32();
        var id = await CreateAsync(admin, new { titulo = "Con contacto", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA, idContacto = seed.ContactA });
        await using (var db = await factory.OpenAsync())
            // El contacto cambió de empresa después del alta: la pareja guardada ya no es compatible.
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE contacto SET id_empresa={seed.CompanyB} WHERE id={seed.ContactA}; UPDATE empresa SET activo=false WHERE id={inactiveCompany}");

        // Editar título/valor conserva las asociaciones históricas, aunque ya no sean compatibles.
        var ordinary = await Json(await Patch(admin, id, """{"titulo":"Renovada","valor":250.5}"""));
        Assert.Equal(seed.CompanyA, ordinary.GetProperty("idEmpresa").GetInt32());
        Assert.Equal(seed.ContactA, ordinary.GetProperty("idContacto").GetInt32());
        Assert.Equal(250.5m, ordinary.GetProperty("valor").GetDecimal());
        // Reenviar las mismas asociaciones no es un cambio efectivo.
        Assert.Equal(HttpStatusCode.OK, (await Patch(admin, id, $$"""{"idEmpresa":{{seed.CompanyA}},"idContacto":{{seed.ContactA}},"observaciones":"Mismos datos"}""")).StatusCode);

        // Un cambio efectivo exige disponibilidad y compatibilidad.
        async Task<HttpResponseMessage> Reject(string json, string code)
        {
            var response = await Patch(admin, id, json);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal(code, (await Json(response)).GetProperty("code").GetString());
            return response;
        }
        await Reject($$"""{"titulo":"No","idEmpresa":{{inactiveCompany}}}""", "REFERENCE_UNAVAILABLE");
        await Reject("""{"titulo":"No","idEmpresa":999999}""", "REFERENCE_UNAVAILABLE");
        await Reject("""{"titulo":"No","idContacto":999999}""", "REFERENCE_UNAVAILABLE");
        await Reject($$"""{"titulo":"No","idOrigen":{{otherOrigin}}}""", "REFERENCE_UNAVAILABLE");
        // Otra empresa activa no es la del contacto actual (ahora de B).
        var companyD = (await Json(await admin.PostAsJsonAsync("/empresas", new { razonSocial = "Empresa D" }))).GetProperty("id").GetInt32();
        await Reject($$"""{"titulo":"No","idEmpresa":{{companyD}}}""", "VALIDATION_FAILED");
        Assert.Equal("Renovada", (await Json(await admin.GetAsync($"/oportunidades/{id}"))).GetProperty("titulo").GetString());

        // Cambios válidos: empresa compatible con el contacto, origen activo, quitar empresa conservando el contacto.
        var toCompanyB = await Json(await Patch(admin, id, $$"""{"idEmpresa":{{seed.CompanyB}},"idOrigen":{{origin}}}"""));
        Assert.Equal(seed.CompanyB, toCompanyB.GetProperty("idEmpresa").GetInt32());
        Assert.Equal(origin, toCompanyB.GetProperty("idOrigen").GetInt32());
        var onlyContact = await Json(await Patch(admin, id, """{"idEmpresa":null}"""));
        Assert.Equal(JsonValueKind.Null, onlyContact.GetProperty("idEmpresa").ValueKind);
        Assert.Equal(seed.ContactA, onlyContact.GetProperty("idContacto").GetInt32());
        // Sin empresa ni contacto la oportunidad no tiene cliente.
        await Reject("""{"idContacto":null}""", "VALIDATION_FAILED");

        // Un contacto dado de baja después del alta no impide editar otros campos.
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE contacto SET activo=false WHERE id={seed.ContactA}");
        Assert.Equal(HttpStatusCode.OK, (await Patch(admin, id, """{"observaciones":"Contacto retirado"}""")).StatusCode);
    }
}
