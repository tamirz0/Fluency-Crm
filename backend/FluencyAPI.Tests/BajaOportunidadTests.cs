using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class BajaOportunidadTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<int> CreateAsync(HttpClient client, object body)
    {
        var response = await client.PostAsJsonAsync("/oportunidades", body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetInt32();
    }

    private static async Task<long> CountAsync(AuthApiFactory factory, string sql)
    {
        await using var db = await factory.OpenAsync();
        return await CommercialSchemaFixture.ScalarAsync<long>(db, sql);
    }

    [Fact]
    public async Task OwnerOrSuperiorRemovesOpenOrClosedWithoutReopeningAndNothingIsDeletedOrRestored()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        var open = await CreateAsync(seller, new { titulo = "Abierta", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
        var closed = await CreateAsync(seller, new { titulo = "Cerrada", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
        var theirs = await CreateAsync(admin, new { titulo = "Del admin", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
        var kept = await CreateAsync(seller, new { titulo = "Se queda", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
        Assert.Equal(HttpStatusCode.OK, (await seller.PostAsync($"/oportunidades/{closed}/ganar", new StringContent("""{"fechaCierre":"2026-12-01","valor":10}""", Encoding.UTF8, "application/json"))).StatusCode);
        var historyBefore = await CountAsync(factory, "SELECT count(*) FROM historial_etapas");

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.DeleteAsync($"/oportunidades/{open}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.DeleteAsync($"/oportunidades/{theirs}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.DeleteAsync("/oportunidades/999999")).StatusCode);
        Assert.True((await Json(await seller.GetAsync($"/oportunidades/{closed}"))).GetProperty("accionesPermitidas").GetProperty("darDeBaja").GetBoolean());

        // Abierta y cerrada (sin reabrir): 204. Un superior da de baja la ajena.
        Assert.Equal(HttpStatusCode.NoContent, (await seller.DeleteAsync($"/oportunidades/{open}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await seller.DeleteAsync($"/oportunidades/{closed}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/oportunidades/{theirs}")).StatusCode);

        // Repetir no cambia nada ni agrega historia; el recurso deja de publicarse y no se puede mutar ni restaurar.
        foreach (var id in new[] { open, closed, theirs })
        {
            Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteAsync($"/oportunidades/{id}")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"/oportunidades/{id}")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"/oportunidades/{id}/historial-etapas")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await admin.PatchAsync($"/oportunidades/{id}", new StringContent("""{"titulo":"Revivir"}""", Encoding.UTF8, "application/json"))).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsync($"/oportunidades/{id}/mover", new StringContent($$"""{"idEtapa":{{seed.SecondOpen}}}""", Encoding.UTF8, "application/json"))).StatusCode);
        }
        Assert.Equal(historyBefore, await CountAsync(factory, "SELECT count(*) FROM historial_etapas"));
        Assert.Equal(4L, await CountAsync(factory, "SELECT count(*) FROM oportunidad"));
        Assert.Equal(3L, await CountAsync(factory, "SELECT count(*) FROM oportunidad WHERE NOT activo"));

        // Las vistas ya no las muestran; la que sigue vigente permanece.
        var list = await Json(await admin.GetAsync("/oportunidades"));
        Assert.Equal(new[] { kept }, list.GetProperty("items").EnumerateArray().Select(e => e.GetProperty("id").GetInt32()).ToArray());
        var funnel = await Json(await admin.GetAsync($"/embudos/{seed.Funnel}/funnel"));
        Assert.Equal(new[] { kept }, funnel.GetProperty("etapas").EnumerateArray().SelectMany(e => e.GetProperty("oportunidades").EnumerateArray()).Select(e => e.GetProperty("id").GetInt32()).ToArray());
    }

    [Fact]
    public async Task RemovalLiftsTheBlocksOfClientsAndFunnelsMeasuredWithRealOpportunities()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        var companyOnly = (await Json(await admin.PostAsJsonAsync("/empresas", new { razonSocial = "Solo empresa" }))).GetProperty("id").GetInt32();
        var open = await CreateAsync(admin, new { titulo = "Abierta", idEmbudo = seed.Funnel, idEmpresa = companyOnly });
        var withContact = await CreateAsync(admin, new { titulo = "Con contacto", idEmbudo = seed.Funnel, idContacto = seed.ContactA });
        var closed = await CreateAsync(admin, new { titulo = "Cerrada", idEmbudo = seed.Funnel, idEmpresa = companyOnly });
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/oportunidades/{closed}/ganar", new StringContent("""{"fechaCierre":"2026-12-01","valor":10}""", Encoding.UTF8, "application/json"))).StatusCode);

        // Con oportunidades vigentes (abiertas o cerradas) los bloqueos de clientes y embudos se aplican.
        var companyBlocked = await admin.DeleteAsync($"/empresas/{companyOnly}");
        Assert.Equal(HttpStatusCode.Conflict, companyBlocked.StatusCode);
        Assert.Contains("oportunidad", (await Json(companyBlocked)).GetProperty("title").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync($"/contactos/{seed.ContactA}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/embudos/{seed.Funnel}/desactivar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/etapas/{seed.FirstOpen}/desactivar", null)).StatusCode);

        // Una baja levanta solo el bloqueo que le correspondía.
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/oportunidades/{closed}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync($"/empresas/{companyOnly}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/oportunidades/{open}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/empresas/{companyOnly}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync($"/contactos/{seed.ContactA}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/oportunidades/{withContact}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/contactos/{seed.ContactA}")).StatusCode);

        // Sin oportunidades vigentes la etapa y el embudo pueden desactivarse; las bajas no restauran nada.
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/etapas/{seed.FirstOpen}/desactivar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/embudos/{seed.Funnel}/desactivar", null)).StatusCode);
        Assert.Equal(3L, await CountAsync(factory, "SELECT count(*) FROM historial_etapas WHERE id_oportunidad IN (SELECT id FROM oportunidad WHERE NOT activo) AND id_etapa_anterior IS NULL"));
    }

    [Fact]
    public async Task RemovalRacingAnEditNeverLetsTheEditSucceedAfterwards()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        for (var round = 0; round < 4; round++)
        {
            var id = await CreateAsync(seller, new { titulo = $"Ronda {round}", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA });
            var results = await Task.WhenAll(
                seller.PatchAsync($"/oportunidades/{id}", new StringContent("""{"observaciones":"edición"}""", Encoding.UTF8, "application/json")),
                admin.DeleteAsync($"/oportunidades/{id}"));
            Assert.Contains(results[0].StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.Conflict });
            Assert.Contains(results[1].StatusCode, new[] { HttpStatusCode.NoContent, HttpStatusCode.Conflict });
            if (results[1].StatusCode == HttpStatusCode.NoContent)
            {
                Assert.Equal(HttpStatusCode.NotFound, (await seller.PatchAsync($"/oportunidades/{id}", new StringContent("""{"observaciones":"tarde"}""", Encoding.UTF8, "application/json"))).StatusCode);
                Assert.Equal(0L, await CountAsync(factory, $"SELECT count(*) FROM oportunidad WHERE id={id} AND activo"));
            }
        }
    }
}
