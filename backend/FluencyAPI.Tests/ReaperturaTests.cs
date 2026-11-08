using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ReaperturaTests
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
    public async Task OnlySuperiorsReopenAndTheFirstClosureSurvivesAsTextThroughCloseReopenCorrectCloseAgain()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        var managerId = (await Json(await admin.PostAsJsonAsync("/usuarios", new { nombre = "Gema", apellido = "Gerente", correo = "gerente@example.invalid", username = "gerente", password = "Ficticia123!", roles = new[] { "RESPONSABLE_COMERCIAL" } }))).GetProperty("id").GetInt32();
        using var manager = factory.Client(); await UsuariosTests.SignIn(manager, factory, "gerente", "Ficticia123!");
        int reason, otherFunnelStage = seed.OtherFunnelOpen;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "INSERT INTO motivo_perdida(descripcion) VALUES ('Precio')");
            reason = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM motivo_perdida WHERE descripcion='Precio'");
        }
        var id = await CreateAsync(seller, new { titulo = "Ciclo", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, valor = 100 });
        var stillOpen = await CreateAsync(seller, new { titulo = "Abierta", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
        var removed = await CreateAsync(admin, new { titulo = "Eliminada", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE oportunidad SET activo=false WHERE id={removed}");
        Assert.Equal(HttpStatusCode.OK, (await Post(seller, id, "ganar", """{"fechaCierre":"2026-12-01","valor":100}""")).StatusCode);
        string Reopen(int stage, string? reasonText = "Error de carga") => reasonText is null ? $$"""{"idEtapa":{{stage}}}""" : $$"""{"idEtapa":{{stage}},"justificacion":"{{reasonText}}"}""";

        // El dueño vendedor no reabre, aunque la vea como cerrada; la API lo rechaza y no cambia nada.
        var closedForSeller = await Json(await seller.GetAsync($"/oportunidades/{id}"));
        Assert.False(closedForSeller.GetProperty("accionesPermitidas").GetProperty("reabrir").GetBoolean());
        Assert.Equal(HttpStatusCode.Forbidden, (await Post(seller, id, "reabrir", Reopen(seed.FirstOpen))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(factory.Client(), id, "reabrir", Reopen(seed.FirstOpen))).StatusCode);
        Assert.True((await Json(await manager.GetAsync($"/oportunidades/{id}"))).GetProperty("accionesPermitidas").GetProperty("reabrir").GetBoolean());

        // Solicitudes inválidas de un superior: ninguna modifica la oportunidad ni su historia.
        foreach (var invalid in new[] { Reopen(seed.FirstOpen, null), Reopen(seed.FirstOpen, "   "), """{"justificacion":"x"}""", $$"""{"idEtapa":{{seed.FirstOpen}},"justificacion":"x","valor":1}""" })
            Assert.Equal(HttpStatusCode.BadRequest, (await Post(admin, id, "reabrir", invalid)).StatusCode);
        foreach (var stage in new[] { seed.Won, otherFunnelStage, 999999 })
        {
            var rejected = await Post(admin, id, "reabrir", Reopen(stage));
            Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
            Assert.Equal("REFERENCE_UNAVAILABLE", (await Json(rejected)).GetProperty("code").GetString());
        }
        Assert.Equal(HttpStatusCode.Conflict, (await Post(admin, stillOpen, "reabrir", Reopen(seed.SecondOpen))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Post(admin, removed, "reabrir", Reopen(seed.SecondOpen))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Post(admin, 999999, "reabrir", Reopen(seed.SecondOpen))).StatusCode);
        Assert.Equal(2L, await HistoryAsync(factory, id));
        Assert.Equal("GANADA", (await Json(await admin.GetAsync($"/oportunidades/{id}"))).GetProperty("estado").GetString());

        // Un embudo inactivo bloquea la reapertura; con responsable y servicio inactivos reabrir no obliga a reasignar.
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE embudo SET activo=false WHERE id={seed.Funnel}");
        Assert.Equal(HttpStatusCode.Conflict, (await Post(admin, id, "reabrir", Reopen(seed.FirstOpen))).StatusCode);
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE embudo SET activo=true WHERE id={seed.Funnel}; UPDATE servicio SET activo=false; UPDATE usuario SET activo=false WHERE id={factory.SellerId}");

        var reopened = await Post(manager, id, "reabrir", Reopen(seed.SecondOpen, "Error de carga"));
        Assert.Equal(HttpStatusCode.OK, reopened.StatusCode);
        var body = await Json(reopened);
        Assert.Equal("ABIERTA", body.GetProperty("estado").GetString());
        Assert.Equal(seed.SecondOpen, body.GetProperty("idEtapa").GetInt32());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("fechaCierre").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("idMotivoPerdida").ValueKind);
        Assert.Equal(100m, body.GetProperty("valor").GetDecimal());
        Assert.Equal(factory.SellerId, body.GetProperty("idResponsable").GetInt32());
        Assert.False(body.GetProperty("responsableActivo").GetBoolean());
        Assert.False(body.GetProperty("servicioActivo").GetBoolean());
        string? firstNote;
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db,
                $"SELECT count(*) FROM historial_etapas WHERE id_oportunidad={id} AND id_etapa_anterior={seed.Won} AND id_nueva_etapa={seed.SecondOpen} AND id_usuario={managerId}"));
            firstNote = await CommercialSchemaFixture.ScalarAsync<string>(db, $"SELECT observacion FROM historial_etapas WHERE id_oportunidad={id} ORDER BY id DESC LIMIT 1");
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE usuario SET activo=true WHERE id={factory.SellerId}");
        }
        Assert.Equal("Reapertura. Cierre anterior: ganada el 01/12/2026, valor 100,00. Justificación: Error de carga", firstNote);

        // Corregir y cerrar de nuevo como perdida; una segunda reapertura conserva ambas historias.
        Assert.Equal(HttpStatusCode.OK, (await seller.PatchAsync($"/oportunidades/{id}", new StringContent("""{"valor":250}""", Encoding.UTF8, "application/json"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(seller, id, "perder", $$"""{"fechaCierre":"2026-12-10","idMotivoPerdida":{{reason}}}""")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(admin, id, "reabrir", Reopen(seed.FirstOpen, "Volvió a contactar"))).StatusCode);
        var history = await Json(await admin.GetAsync($"/oportunidades/{id}/historial-etapas"));
        var notes = history.GetProperty("items").EnumerateArray().Select(e => e.GetProperty("observacion").GetString()).ToArray();
        Assert.Equal(5, notes.Length);
        Assert.Equal("Reapertura. Cierre anterior: ganada el 01/12/2026, valor 100,00. Justificación: Error de carga", notes[2]);
        Assert.Equal("Reapertura. Cierre anterior: perdida el 10/12/2026, valor 250,00, motivo: Precio. Justificación: Volvió a contactar", notes[4]);
        var final = await Json(await admin.GetAsync($"/oportunidades/{id}"));
        Assert.Equal("ABIERTA", final.GetProperty("estado").GetString());
        Assert.Equal(250m, final.GetProperty("valor").GetDecimal());
        Assert.Equal(JsonValueKind.Null, final.GetProperty("idMotivoPerdida").ValueKind);
    }

    [Fact]
    public async Task ConcurrentReopeningsLeaveASingleEntryAndAFailedHistoryWriteKeepsItClosed()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        for (var round = 0; round < 3; round++)
        {
            var id = await CreateAsync(admin, new { titulo = $"Carrera {round}", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
            Assert.Equal(HttpStatusCode.OK, (await Post(admin, id, "ganar", """{"fechaCierre":"2026-12-01","valor":10}""")).StatusCode);
            var results = await Task.WhenAll(Post(admin, id, "reabrir", $$"""{"idEtapa":{{seed.FirstOpen}},"justificacion":"A"}"""), Post(admin, id, "reabrir", $$"""{"idEtapa":{{seed.SecondOpen}},"justificacion":"B"}"""));
            Assert.Equal(1, results.Count(r => r.StatusCode == HttpStatusCode.OK));
            Assert.Equal(1, results.Count(r => r.StatusCode == HttpStatusCode.Conflict));
            Assert.Equal(3L, await HistoryAsync(factory, id));
        }

        var closed = await CreateAsync(admin, new { titulo = "Atómica", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, valor = 70 });
        Assert.Equal(HttpStatusCode.OK, (await Post(admin, closed, "ganar", """{"fechaCierre":"2026-12-01","valor":70,"observacion":"ok"}""")).StatusCode);
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, "ALTER TABLE historial_etapas ADD CONSTRAINT ck_prueba_rollback CHECK (observacion IS NULL OR observacion NOT LIKE 'Reapertura%') NOT VALID");
        HttpResponseMessage? response = null;
        var error = await Record.ExceptionAsync(async () => response = await Post(admin, closed, "reabrir", $$"""{"idEtapa":{{seed.FirstOpen}},"justificacion":"X"}"""));
        Assert.True(error is not null || response!.StatusCode == HttpStatusCode.InternalServerError);
        var unchanged = await Json(await admin.GetAsync($"/oportunidades/{closed}"));
        Assert.Equal("GANADA", unchanged.GetProperty("estado").GetString());
        Assert.StartsWith("2026-12-01", unchanged.GetProperty("fechaCierre").GetString());
        Assert.Equal(2L, await HistoryAsync(factory, closed));
    }
}
