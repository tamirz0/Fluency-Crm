using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class CierreTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<int> CreateAsync(HttpClient client, object body)
    {
        var response = await client.PostAsJsonAsync("/oportunidades", body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetInt32();
    }

    private static Task<HttpResponseMessage> Post(HttpClient client, int id, string action, string json)
        => client.PostAsync($"/oportunidades/{id}/{action}", new StringContent(json, Encoding.UTF8, "application/json"));

    private static async Task<long> HistoryAsync(AuthApiFactory factory, int id)
    {
        await using var db = await factory.OpenAsync();
        return await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM historial_etapas WHERE id_oportunidad={id}");
    }

    [Fact]
    public async Task WinningNeedsDateAndValueLosingNeedsDateAndAnActiveReasonAndRepeatingIsAConflict()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int reason, retiredReason, lost;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "INSERT INTO motivo_perdida(descripcion,activo) VALUES ('Precio',true),('Retirado',false)");
            reason = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM motivo_perdida WHERE descripcion='Precio'");
            retiredReason = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM motivo_perdida WHERE descripcion='Retirado'");
            lost = await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id FROM etapa_comercial WHERE nombre='Perdida' AND id_embudo={seed.Funnel}");
        }
        var won = await CreateAsync(seller, new { titulo = "Para ganar", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, valor = 100 });
        var toLose = await CreateAsync(seller, new { titulo = "Para perder", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, valor = 300 });
        var theirs = await CreateAsync(admin, new { titulo = "Del admin", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
        var removed = await CreateAsync(admin, new { titulo = "Eliminada", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE oportunidad SET activo=false WHERE id={removed}");

        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(anonymous, won, "ganar", """{"fechaCierre":"2026-12-01","valor":1}""")).StatusCode);

        // Datos inválidos: ninguno cierra ni escribe historial.
        foreach (var invalid in new[]
                 {
                     """{"valor":1}""", """{"fechaCierre":"2026-12-01"}""", """{"fechaCierre":"2026-12-01","valor":null}""", """{"fechaCierre":"2026-12-01","valor":-1}""",
                     """{"fechaCierre":"2026-12-01","valor":1.234}""", """{"fechaCierre":"2026-02-30","valor":1}""", """{"fechaCierre":"2026-12-01","valor":1,"idEtapa":1}""",
                 })
            Assert.Equal(HttpStatusCode.BadRequest, (await Post(seller, won, "ganar", invalid)).StatusCode);
        foreach (var invalid in new[] { """{"fechaCierre":"2026-12-01"}""", $$"""{"idMotivoPerdida":{{reason}}}""", $$"""{"fechaCierre":"2026-12-01","idMotivoPerdida":0}""", $$"""{"fechaCierre":"2026-12-01","idMotivoPerdida":{{reason}},"valor":1}""" })
            Assert.Equal(HttpStatusCode.BadRequest, (await Post(seller, toLose, "perder", invalid)).StatusCode);
        foreach (var missing in new[] { retiredReason, 999999 })
        {
            var rejected = await Post(seller, toLose, "perder", $$"""{"fechaCierre":"2026-12-01","idMotivoPerdida":{{missing}}}""");
            Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
            Assert.Equal("REFERENCE_UNAVAILABLE", (await Json(rejected)).GetProperty("code").GetString());
        }
        Assert.Equal(1L, await HistoryAsync(factory, won));
        Assert.Equal(1L, await HistoryAsync(factory, toLose));
        Assert.Equal("ABIERTA", (await Json(await seller.GetAsync($"/oportunidades/{toLose}"))).GetProperty("estado").GetString());

        // Ganar con valor cero: se acepta, reemplaza el valor, resuelve la final y firma el historial con el actor.
        var closed = await Post(seller, won, "ganar", """{"fechaCierre":"2026-12-01","valor":0,"observacion":"  Firmó el contrato  "}""");
        Assert.Equal(HttpStatusCode.OK, closed.StatusCode);
        var body = await Json(closed);
        Assert.Equal("GANADA", body.GetProperty("estado").GetString());
        Assert.Equal(seed.Won, body.GetProperty("idEtapa").GetInt32());
        Assert.Equal(0m, body.GetProperty("valor").GetDecimal());
        Assert.StartsWith("2026-12-01", body.GetProperty("fechaCierre").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("idMotivoPerdida").ValueKind);
        Assert.All(body.GetProperty("accionesPermitidas").EnumerateObject().Where(a => a.Name != "darDeBaja" && a.Name != "gestionarActividades"), a => Assert.False(a.Value.GetBoolean(), a.Name));
        await using (var db = await factory.OpenAsync())
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db,
                $"SELECT count(*) FROM historial_etapas WHERE id_oportunidad={won} AND id_etapa_anterior={seed.FirstOpen} AND id_nueva_etapa={seed.Won} AND id_usuario={factory.SellerId} AND observacion='Firmó el contrato'"));

        // Repetir (o cambiar el resultado) es un conflicto sin efectos; mover y editar tampoco eluden el cierre.
        foreach (var attempt in new[] { Post(seller, won, "ganar", """{"fechaCierre":"2027-01-01","valor":999}"""), Post(seller, won, "perder", $$"""{"fechaCierre":"2027-01-01","idMotivoPerdida":{{reason}}}"""),
                                        Post(seller, won, "mover", $$"""{"idEtapa":{{seed.SecondOpen}}}""") })
        {
            var response = await attempt;
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Equal("BUSINESS_CONFLICT", (await Json(response)).GetProperty("code").GetString());
        }
        Assert.Equal(HttpStatusCode.Conflict, (await seller.PatchAsync($"/oportunidades/{won}", new StringContent("""{"valor":5}""", Encoding.UTF8, "application/json"))).StatusCode);
        var afterRepeats = await Json(await seller.GetAsync($"/oportunidades/{won}"));
        Assert.Equal(0m, afterRepeats.GetProperty("valor").GetDecimal());
        Assert.StartsWith("2026-12-01", afterRepeats.GetProperty("fechaCierre").GetString());
        Assert.Equal(2L, await HistoryAsync(factory, won));

        // Perder: motivo activo, conserva el valor vigente y deja la entrada de historial.
        var lostResponse = await Post(seller, toLose, "perder", $$"""{"fechaCierre":"2026-12-02","idMotivoPerdida":{{reason}}}""");
        Assert.Equal(HttpStatusCode.OK, lostResponse.StatusCode);
        var lostBody = await Json(lostResponse);
        Assert.Equal("PERDIDA", lostBody.GetProperty("estado").GetString());
        Assert.Equal(lost, lostBody.GetProperty("idEtapa").GetInt32());
        Assert.Equal(300m, lostBody.GetProperty("valor").GetDecimal());
        Assert.Equal("Precio", lostBody.GetProperty("motivoPerdidaDescripcion").GetString());
        Assert.StartsWith("2026-12-02", lostBody.GetProperty("fechaCierre").GetString());
        Assert.Equal(2L, await HistoryAsync(factory, toLose));

        // Ajena: 403 para el vendedor y un superior sí cierra; baja o inexistente: 404.
        Assert.Equal(HttpStatusCode.Forbidden, (await Post(seller, theirs, "ganar", """{"fechaCierre":"2026-12-01","valor":1}""")).StatusCode);
        Assert.Equal(1L, await HistoryAsync(factory, theirs));
        Assert.Equal(HttpStatusCode.OK, (await Post(admin, theirs, "ganar", """{"fechaCierre":"2026-12-01","valor":1}""")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Post(admin, removed, "ganar", """{"fechaCierre":"2026-12-01","valor":1}""")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Post(admin, 999999, "perder", $$"""{"fechaCierre":"2026-12-01","idMotivoPerdida":{{reason}}}""")).StatusCode);

        // Las cerradas siguen visibles y el funnel las ubica en sus finales.
        var funnel = await Json(await admin.GetAsync($"/embudos/{seed.Funnel}/funnel"));
        int Cards(string stage) => funnel.GetProperty("etapas").EnumerateArray().Single(e => e.GetProperty("nombre").GetString() == stage).GetProperty("oportunidades").GetArrayLength();
        Assert.Equal(2, Cards("Ganada")); Assert.Equal(1, Cards("Perdida"));
    }

    [Fact]
    public async Task ConcurrentClosuresLeaveASingleResultAndAFailedHistoryWriteLeavesTheOpportunityOpen()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int reason;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "INSERT INTO motivo_perdida(descripcion) VALUES ('Precio')");
            reason = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM motivo_perdida WHERE descripcion='Precio'");
        }

        for (var round = 0; round < 3; round++)
        {
            var id = await CreateAsync(seller, new { titulo = $"Carrera {round}", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
            var results = await Task.WhenAll(Post(seller, id, "ganar", """{"fechaCierre":"2026-12-01","valor":10}"""), Post(admin, id, "perder", $$"""{"fechaCierre":"2026-12-02","idMotivoPerdida":{{reason}}}"""));
            Assert.Equal(1, results.Count(r => r.StatusCode == HttpStatusCode.OK));
            Assert.Equal(1, results.Count(r => r.StatusCode == HttpStatusCode.Conflict));
            Assert.Equal(2L, await HistoryAsync(factory, id));
            await using var db = await factory.OpenAsync();
            // Un único resultado: el motivo solo existe si ganó el cierre perdido.
            var state = await CommercialSchemaFixture.ScalarAsync<string>(db, $"SELECT e.codigo FROM oportunidad o JOIN etapa_comercial c ON c.id=o.id_etapa JOIN estado_oportunidad e ON e.id=c.id_estado WHERE o.id={id}");
            Assert.Equal(state == "PERDIDA" ? 1L : 0L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM oportunidad WHERE id={id} AND id_motivo_perdida IS NOT NULL"));
        }

        var open = await CreateAsync(seller, new { titulo = "Atómica", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, valor = 50 });
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, "ALTER TABLE historial_etapas ADD CONSTRAINT ck_prueba_rollback CHECK (observacion IS NOT NULL) NOT VALID");
        HttpResponseMessage? response = null;
        var error = await Record.ExceptionAsync(async () => response = await Post(seller, open, "ganar", """{"fechaCierre":"2026-12-01","valor":99}"""));
        Assert.True(error is not null || response!.StatusCode == HttpStatusCode.InternalServerError);
        var unchanged = await Json(await seller.GetAsync($"/oportunidades/{open}"));
        Assert.Equal("ABIERTA", unchanged.GetProperty("estado").GetString());
        Assert.Equal(50m, unchanged.GetProperty("valor").GetDecimal());
        Assert.Equal(JsonValueKind.Null, unchanged.GetProperty("fechaCierre").ValueKind);
        Assert.Equal(1L, await HistoryAsync(factory, open));
    }

    [Fact]
    public async Task WinningPromotesPotentialCompanyAndContactToClienteButLosingOrOtherStatesDoNot()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int reason;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "INSERT INTO motivo_perdida(descripcion,activo) VALUES ('Precio',true)");
            reason = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM motivo_perdida WHERE descripcion='Precio'");
        }
        async Task<string> State(string table, int id)
        {
            await using var db = await factory.OpenAsync();
            return await CommercialSchemaFixture.ScalarAsync<string>(db, $"SELECT e.descripcion FROM {table} t JOIN estado_cliente e ON e.id=t.id_estado WHERE t.id={id}");
        }

        // Perder no cambia el estado de nadie.
        var lost = await CreateAsync(admin, new { titulo = "Perdida", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idContacto = seed.ContactA });
        Assert.Equal(HttpStatusCode.OK, (await Post(admin, lost, "perder", $$"""{"fechaCierre":"2026-12-01","idMotivoPerdida":{{reason}}}""")).StatusCode);
        Assert.Equal("Potencial", await State("empresa", seed.CompanyA));
        Assert.Equal("Potencial", await State("contacto", seed.ContactA));

        // Ganar pasa empresa y contacto de Potencial a Cliente.
        var won = await CreateAsync(admin, new { titulo = "Ganada", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idContacto = seed.ContactA });
        Assert.Equal(HttpStatusCode.OK, (await Post(admin, won, "ganar", """{"fechaCierre":"2026-12-02","valor":1}""")).StatusCode);
        Assert.Equal("Cliente", await State("empresa", seed.CompanyA));
        Assert.Equal("Cliente", await State("contacto", seed.ContactA));

        // Un estado distinto de Potencial se respeta.
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE empresa SET id_estado=(SELECT id FROM estado_cliente WHERE descripcion='No contactar') WHERE id={seed.CompanyB}");
        var other = await CreateAsync(admin, new { titulo = "Otra", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyB });
        Assert.Equal(HttpStatusCode.OK, (await Post(admin, other, "ganar", """{"fechaCierre":"2026-12-03","valor":1}""")).StatusCode);
        Assert.Equal("No contactar", await State("empresa", seed.CompanyB));
    }
}
