using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class InicioTests
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

    private static async Task<(int Students, int Open, int Closed)> Summary(HttpClient client)
    {
        var response = await client.GetAsync("/inicio/resumen");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        return (body.GetProperty("alumnos").GetInt32(), body.GetProperty("oportunidadesAbiertas").GetInt32(), body.GetProperty("cerradasEsteMes").GetInt32());
    }

    [Fact]
    public async Task SummaryCountsActiveClientContactsOpenOpportunitiesAndClosuresOfTheCurrentMonthWithoutSessionRejected()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int reason, firstOpen = seed.FirstOpen;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "INSERT INTO motivo_perdida(descripcion,activo) VALUES ('Precio',true)");
            // Alumno = contacto cuya oportunidad ganada era un servicio con nivel.
            await CommercialSchemaFixture.ExecuteAsync(db, "UPDATE servicio SET id_nivel=(SELECT min(id) FROM nivel_ingles) WHERE nombre='Servicio ficticio'");
            reason = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM motivo_perdida WHERE descripcion='Precio'");
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/inicio/resumen")).StatusCode);
        Assert.Equal((0, 0, 0), await Summary(seller));

        // Mes calendario actual de Buenos Aires (UTC-3, sin horario de verano).
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
        var first = new DateOnly(today.Year, today.Month, 1);
        var nextFirst = first.AddMonths(1);
        var previousLast = first.AddDays(-1);
        var lastDay = nextFirst.AddDays(-1);
        string Win(DateOnly date) => $$"""{"fechaCierre":"{{date:yyyy-MM-dd}}","valor":1}""";
        string Lose(DateOnly date) => $$"""{"fechaCierre":"{{date:yyyy-MM-dd}}","idMotivoPerdida":{{reason}}}""";
        async Task<int> NewAsync(string title, int? contact = null) => await CreateAsync(seller, contact is null
            ? new { titulo = title, idEmbudo = seed.Funnel, idEmpresa = seed.CompanyB } : new { titulo = title, idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idContacto = contact });

        await NewAsync("Abierta 1");
        await NewAsync("Abierta 2");
        var wonFirstDay = await NewAsync("Ganada primer día", seed.ContactA);
        var lostLastDay = await NewAsync("Perdida último día");
        var wonPreviousMonth = await NewAsync("Ganada mes anterior");
        var lostNextMonth = await NewAsync("Perdida mes siguiente");
        var reopened = await NewAsync("Reabierta");
        var removed = await NewAsync("Eliminada");
        Assert.Equal(HttpStatusCode.OK, (await Post(seller, wonFirstDay, "ganar", Win(first))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(seller, lostLastDay, "perder", Lose(lastDay))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(seller, wonPreviousMonth, "ganar", Win(previousLast))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(seller, lostNextMonth, "perder", Lose(nextFirst))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(seller, reopened, "ganar", Win(today))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(admin, reopened, "reabrir", $$"""{"idEtapa":{{firstOpen}},"justificacion":"Error de carga"}""")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(seller, removed, "ganar", Win(today))).StatusCode);
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE oportunidad SET activo=false WHERE id={removed}");

        // Abiertas: 2 + la reabierta. Cerradas del mes: primer y último día; no el mes anterior, el siguiente, la reabierta ni la eliminada.
        // Alumnos: solo el contacto que ganó un servicio con nivel; la empresa Cliente y el contacto dado de baja no cuentan.
        Assert.Equal((1, 3, 2), await Summary(seller));
        Assert.Equal((1, 3, 2), await Summary(admin));

        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE contacto SET activo=false WHERE id={seed.ContactA}");
        Assert.Equal((0, 3, 2), await Summary(seller));
    }
}
