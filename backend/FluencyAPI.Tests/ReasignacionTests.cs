using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ReasignacionTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<int> CreateAsync(HttpClient client, object body)
    {
        var response = await client.PostAsJsonAsync("/oportunidades", body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetInt32();
    }

    private static async Task<int> AccountAsync(HttpClient admin, string username, string[] roles)
    {
        var response = await admin.PostAsJsonAsync("/usuarios", new { nombre = "Cuenta", apellido = username, correo = username + "@example.invalid", username, password = "Ficticia123!", roles });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetInt32();
    }

    private static Task<HttpResponseMessage> Reassign(HttpClient client, int id, string json)
        => client.PostAsync($"/oportunidades/{id}/reasignar", new StringContent(json, Encoding.UTF8, "application/json"));

    private static Task<HttpResponseMessage> Patch(HttpClient client, int id, string json)
        => client.PatchAsync($"/oportunidades/{id}", new StringContent(json, Encoding.UTF8, "application/json"));

    [Fact]
    public async Task ReassignmentRulesTransferEditingAndLeavePreviousOwnerReadOnly()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        var otherSeller = await AccountAsync(admin, "vendedor2", ["VENDEDOR"]);
        var managerOnly = await AccountAsync(admin, "gerente", ["RESPONSABLE_COMERCIAL"]);
        var retired = await AccountAsync(admin, "retirado", ["VENDEDOR"]);
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/usuarios/{retired}/desactivar", null)).StatusCode);
        using var seller2 = factory.Client(); await UsuariosTests.SignIn(seller2, factory, "vendedor2", "Ficticia123!");
        var mine = await CreateAsync(seller, new { titulo = "Propia", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var adminsOwn = await CreateAsync(admin, new { titulo = "Del admin", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var closed = await CreateAsync(admin, new { titulo = "Cerrada", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var removed = await CreateAsync(admin, new { titulo = "Eliminada", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE oportunidad SET id_etapa={seed.Won}, fecha_cierre=now() WHERE id={closed}; UPDATE oportunidad SET activo=false WHERE id={removed}");
        string Target(int user) => $$"""{"idResponsable":{{user}}}""";

        Assert.Equal(HttpStatusCode.Unauthorized, (await Reassign(anonymous, mine, Target(otherSeller))).StatusCode);

        // El vendedor solo puede pasarla a un vendedor activo; ninguna de estas llamadas cambia nada.
        foreach (var user in new[] { managerOnly, retired, factory.AdminId, 999999 })
        {
            var rejected = await Reassign(seller, mine, Target(user));
            Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
            Assert.Equal("REFERENCE_UNAVAILABLE", (await Json(rejected)).GetProperty("code").GetString());
        }
        foreach (var invalid in new[] { """{}""", """{"idResponsable":0}""", $$"""{"idResponsable":{{otherSeller}},"idEtapa":1}""", $$"""{"idResponsable":{{otherSeller}},"activo":false}""" })
            Assert.Equal(HttpStatusCode.BadRequest, (await Reassign(seller, mine, invalid)).StatusCode);
        Assert.Equal(factory.SellerId, (await Json(await seller.GetAsync($"/oportunidades/{mine}"))).GetProperty("idResponsable").GetInt32());

        // Reasignación válida: responde con permisos recalculados y sin crear un movimiento ficticio.
        var moved = await Reassign(seller, mine, Target(otherSeller));
        Assert.Equal(HttpStatusCode.OK, moved.StatusCode);
        var body = await Json(moved);
        Assert.Equal(otherSeller, body.GetProperty("idResponsable").GetInt32());
        Assert.All(body.GetProperty("accionesPermitidas").EnumerateObject(), action => Assert.False(action.Value.GetBoolean(), action.Name));
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal(4L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM historial_etapas"));
            Assert.Equal(0L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM empresa WHERE id_responsable={otherSeller}"));
        }

        // El responsable anterior conserva la lectura y recibe 403 en la siguiente mutación; el nuevo ya edita.
        var previous = await Json(await seller.GetAsync($"/oportunidades/{mine}"));
        Assert.Equal("Propia", previous.GetProperty("titulo").GetString());
        Assert.All(previous.GetProperty("accionesPermitidas").EnumerateObject(), action => Assert.False(action.Value.GetBoolean(), action.Name));
        Assert.Equal(HttpStatusCode.Forbidden, (await Patch(seller, mine, """{"titulo":"Sigo editando"}""")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Reassign(seller, mine, Target(factory.SellerId))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Patch(seller2, mine, """{"titulo":"Del nuevo dueño"}""")).StatusCode);
        Assert.True((await Json(await seller2.GetAsync($"/oportunidades/{mine}"))).GetProperty("accionesPermitidas").GetProperty("reasignar").GetBoolean());

        // Mismo destino: no hay cambio. Un vendedor no reasigna la ajena; una cerrada exige reapertura; baja o inexistente: 404.
        Assert.Equal(HttpStatusCode.OK, (await Reassign(seller2, mine, Target(otherSeller))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Reassign(seller, adminsOwn, Target(factory.SellerId))).StatusCode);
        var closedRejected = await Reassign(admin, closed, Target(otherSeller));
        Assert.Equal(HttpStatusCode.Conflict, closedRejected.StatusCode);
        Assert.Equal("BUSINESS_CONFLICT", (await Json(closedRejected)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await Reassign(admin, removed, Target(otherSeller))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Reassign(admin, 999999, Target(otherSeller))).StatusCode);

        // Un superior elige cualquier usuario activo (también sin rol de vendedor), pero no uno inactivo.
        var toManager = await Reassign(admin, mine, Target(managerOnly));
        Assert.Equal(HttpStatusCode.OK, toManager.StatusCode);
        Assert.Equal(managerOnly, (await Json(toManager)).GetProperty("idResponsable").GetInt32());
        Assert.Equal(HttpStatusCode.BadRequest, (await Reassign(admin, mine, Target(retired))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Patch(seller2, mine, """{"titulo":"Ya no es mía"}""")).StatusCode);
    }

    [Fact]
    public async Task ReassignmentRacingAnEditNeverLetsThePreviousOwnerWriteAfterwards()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        var otherSeller = await AccountAsync(admin, "vendedor2", ["VENDEDOR"]);

        for (var round = 0; round < 5; round++)
        {
            var id = await CreateAsync(seller, new { titulo = $"Ronda {round}", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
            var edit = Patch(seller, id, $$"""{"observaciones":"edición {{round}}"}""");
            var reassign = Reassign(seller, id, $$"""{"idResponsable":{{otherSeller}}}""");
            var results = await Task.WhenAll(edit, reassign);
            // La edición ocurrió antes (200) o ya no le corresponde (403) o chocó con la serialización (409): nunca un error del servidor.
            Assert.Contains(results[0].StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Forbidden, HttpStatusCode.Conflict });
            Assert.Contains(results[1].StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict });
            if (results[1].StatusCode == HttpStatusCode.OK)
            {
                Assert.Equal(otherSeller, (await Json(await admin.GetAsync($"/oportunidades/{id}"))).GetProperty("idResponsable").GetInt32());
                Assert.Equal(HttpStatusCode.Forbidden, (await Patch(seller, id, """{"observaciones":"tarde"}""")).StatusCode);
            }
        }
    }
}
