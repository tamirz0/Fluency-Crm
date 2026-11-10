using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class MovimientoTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<int> CreateAsync(HttpClient client, object body)
    {
        var response = await client.PostAsJsonAsync("/oportunidades", body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetInt32();
    }

    private static Task<HttpResponseMessage> Move(HttpClient client, int id, string json)
        => client.PostAsync($"/oportunidades/{id}/mover", new StringContent(json, Encoding.UTF8, "application/json"));

    private static async Task<long> HistoryAsync(AuthApiFactory factory, int id)
    {
        await using var db = await factory.OpenAsync();
        return await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM historial_etapas WHERE id_oportunidad={id}");
    }

    [Fact]
    public async Task OnlyOpenActiveStagesOfTheSameFunnelAreAcceptedAndEachRealMoveWritesItsHistory()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int inactiveStage;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, $"INSERT INTO etapa_comercial(id_embudo,id_estado,nombre,orden,activo) SELECT {seed.Funnel},id,'Retirada',9,false FROM estado_oportunidad WHERE codigo='ABIERTA'");
            inactiveStage = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM etapa_comercial WHERE nombre='Retirada'");
        }
        var mine = await CreateAsync(seller, new { titulo = "Propia", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var theirs = await CreateAsync(admin, new { titulo = "Del admin", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var closed = await CreateAsync(admin, new { titulo = "Cerrada", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var removed = await CreateAsync(admin, new { titulo = "Eliminada", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE oportunidad SET id_etapa={seed.Won}, fecha_cierre=now() WHERE id={closed}; UPDATE oportunidad SET activo=false WHERE id={removed}");
        string Target(int stage, string? note = null) => note is null ? $$"""{"idEtapa":{{stage}}}""" : $$"""{"idEtapa":{{stage}},"observacion":"{{note}}"}""";

        Assert.Equal(HttpStatusCode.Unauthorized, (await Move(anonymous, mine, Target(seed.SecondOpen))).StatusCode);

        // Movimiento real: cambia la etapa y registra anterior/nueva, autor de la sesión y observación recortada.
        var moved = await Move(seller, mine, Target(seed.SecondOpen, "  Envió propuesta  "));
        Assert.Equal(HttpStatusCode.OK, moved.StatusCode);
        var body = await Json(moved);
        Assert.Equal(seed.SecondOpen, body.GetProperty("idEtapa").GetInt32());
        Assert.Equal("ABIERTA", body.GetProperty("estado").GetString());
        Assert.True(body.GetProperty("accionesPermitidas").GetProperty("mover").GetBoolean());
        Assert.Equal(2L, await HistoryAsync(factory, mine));
        await using (var db = await factory.OpenAsync())
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db,
                $"SELECT count(*) FROM historial_etapas WHERE id_oportunidad={mine} AND id_etapa_anterior={seed.FirstOpen} AND id_nueva_etapa={seed.SecondOpen} AND id_usuario={factory.SellerId} AND observacion='Envió propuesta'"));

        // Mismo destino: devuelve el estado actual sin entrada nueva. Volver atrás sin observación sí registra.
        Assert.Equal(HttpStatusCode.OK, (await Move(seller, mine, Target(seed.SecondOpen))).StatusCode);
        Assert.Equal(2L, await HistoryAsync(factory, mine));
        Assert.Equal(HttpStatusCode.OK, (await Move(seller, mine, Target(seed.FirstOpen))).StatusCode);
        Assert.Equal(3L, await HistoryAsync(factory, mine));

        // Destinos rechazados: ninguno cambia la etapa ni agrega historial.
        var final = await Move(seller, mine, Target(seed.Won));
        Assert.Equal(HttpStatusCode.BadRequest, final.StatusCode);
        Assert.Equal("VALIDATION_FAILED", (await Json(final)).GetProperty("code").GetString());
        foreach (var stage in new[] { seed.OtherFunnelOpen, inactiveStage, 999999 })
        {
            var rejected = await Move(seller, mine, Target(stage));
            Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
            Assert.Equal("REFERENCE_UNAVAILABLE", (await Json(rejected)).GetProperty("code").GetString());
        }
        foreach (var invalid in new[] { """{}""", """{"idEtapa":0}""", $$"""{"idEtapa":{{seed.SecondOpen}},"idUsuario":1}""", $$"""{"idEtapa":{{seed.SecondOpen}},"fechaHora":"2020-01-01"}""" })
            Assert.Equal(HttpStatusCode.BadRequest, (await Move(seller, mine, invalid)).StatusCode);
        Assert.Equal(3L, await HistoryAsync(factory, mine));
        Assert.Equal(seed.FirstOpen, (await Json(await seller.GetAsync($"/oportunidades/{mine}"))).GetProperty("idEtapa").GetInt32());

        // Ajena: 403 para el vendedor; un superior sí mueve y firma el historial.
        Assert.Equal(HttpStatusCode.Forbidden, (await Move(seller, theirs, Target(seed.SecondOpen))).StatusCode);
        Assert.Equal(1L, await HistoryAsync(factory, theirs));
        Assert.Equal(HttpStatusCode.OK, (await Move(admin, mine, Target(seed.SecondOpen))).StatusCode);
        await using (var db = await factory.OpenAsync())
            Assert.Equal(factory.AdminId, await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id_usuario FROM historial_etapas WHERE id_oportunidad={mine} ORDER BY id DESC LIMIT 1"));

        // Cerrada: 409 (reapertura previa); dada de baja o inexistente: 404.
        var closedRejected = await Move(admin, closed, Target(seed.SecondOpen));
        Assert.Equal(HttpStatusCode.Conflict, closedRejected.StatusCode);
        Assert.Equal("BUSINESS_CONFLICT", (await Json(closedRejected)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await Move(admin, removed, Target(seed.SecondOpen))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Move(admin, 999999, Target(seed.SecondOpen))).StatusCode);

        // La historia leída por la API refleja los cuatro movimientos en orden.
        var history = await Json(await seller.GetAsync($"/oportunidades/{mine}/historial-etapas"));
        Assert.Equal(4, history.GetProperty("totalCount").GetInt32());
        Assert.Equal(new[] { "Primera", "Segunda", "Primera", "Segunda" }, history.GetProperty("items").EnumerateArray().Select(e => e.GetProperty("etapaNuevaNombre").GetString()!).ToArray());
    }

    [Fact]
    public async Task AFailureWritingTheHistoryRevertsTheMoveAndConcurrentMovesStayConsistent()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        var id = await CreateAsync(seller, new { titulo = "Atómica", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });

        // Dos movimientos simultáneos a destinos distintos: ninguno falla con error de servidor y la historia concuerda con la etapa final.
        for (var round = 0; round < 4; round++)
        {
            var results = await Task.WhenAll(
                seller.PostAsync($"/oportunidades/{id}/mover", new StringContent($$"""{"idEtapa":{{seed.SecondOpen}}}""", Encoding.UTF8, "application/json")),
                admin.PostAsync($"/oportunidades/{id}/mover", new StringContent($$"""{"idEtapa":{{seed.FirstOpen}}}""", Encoding.UTF8, "application/json")));
            Assert.All(results, r => Assert.Contains(r.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict }));
            await using var db = await factory.OpenAsync();
            Assert.Equal(await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id_etapa FROM oportunidad WHERE id={id}"),
                await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id_nueva_etapa FROM historial_etapas WHERE id_oportunidad={id} ORDER BY id DESC LIMIT 1"));
        }

        // Un fallo al escribir la historia deshace también el cambio de etapa.
        var before = await Json(await seller.GetAsync($"/oportunidades/{id}"));
        var stage = before.GetProperty("idEtapa").GetInt32();
        var other = stage == seed.FirstOpen ? seed.SecondOpen : seed.FirstOpen;
        var count = await HistoryAsync(factory, id);
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, "ALTER TABLE historial_etapas ADD CONSTRAINT ck_prueba_rollback CHECK (observacion IS NOT NULL) NOT VALID");
        HttpResponseMessage? response = null;
        var error = await Record.ExceptionAsync(async () => response = await seller.PostAsync($"/oportunidades/{id}/mover", new StringContent($$"""{"idEtapa":{{other}}}""", Encoding.UTF8, "application/json")));
        Assert.True(error is not null || response!.StatusCode == HttpStatusCode.InternalServerError);
        Assert.Equal(stage, (await Json(await seller.GetAsync($"/oportunidades/{id}"))).GetProperty("idEtapa").GetInt32());
        Assert.Equal(count, await HistoryAsync(factory, id));
    }
}
