using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class HistorialComercialTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static string Iso(DateTime value) => value.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", System.Globalization.CultureInfo.InvariantCulture);

    private static (string Tipo, int Id)[] Keys(JsonElement page) => page.GetProperty("items").EnumerateArray().Select(i => (i.GetProperty("tipo").GetString()!, i.GetProperty("idOrigen").GetInt32())).ToArray();

    [Fact]
    public async Task JoinsActivitiesAndTransitionsBeforePagingWithDirectHistoricalKeysAndNoDuplicates()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int type;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "INSERT INTO tipo_actividad(nombre) VALUES ('Llamada ficticia')");
            type = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM tipo_actividad WHERE nombre='Llamada ficticia'");
        }
        var now = DateTime.UtcNow;
        async Task<int> Activity(HttpClient client, string context, DateTime occurred, string text)
        {
            var r = await client.PostAsync("/actividades", new StringContent($$"""{"idTipo":{{type}},{{context}},"fechaHora":"{{Iso(occurred)}}","descripcion":"{{text}}"}""", Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.Created, r.StatusCode);
            return (await Json(r)).GetProperty("id").GetInt32();
        }
        var opportunity = (await Json(await seller.PostAsJsonAsync("/oportunidades", new { titulo = "Propia", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA, idContacto = seed.ContactA }))).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await seller.PostAsync($"/oportunidades/{opportunity}/mover", new StringContent($$"""{"idEtapa":{{seed.SecondOpen}},"observacion":"Avanzó"}""", Encoding.UTF8, "application/json"))).StatusCode);
        var both = await Activity(seller, $"\"idEmpresa\":{seed.CompanyA},\"idContacto\":{seed.ContactA}", now.AddDays(-3), "Por empresa y contacto");
        var contactOnly = await Activity(admin, $"\"idContacto\":{seed.ContactA}", now.AddDays(-1), "Solo contacto");
        var viaOpportunity = await Activity(seller, $"\"idEmpresa\":{seed.CompanyA},\"idContacto\":{seed.ContactA},\"idOportunidad\":{opportunity}", now.AddDays(-2), "Con oportunidad");
        var otherCompany = await Activity(admin, $"\"idEmpresa\":{seed.CompanyB}", now.AddHours(-5), "Otra empresa");
        int creation, moved;
        await using (var db = await factory.OpenAsync())
        {
            creation = await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id FROM historial_etapas WHERE id_oportunidad={opportunity} AND id_etapa_anterior IS NULL");
            moved = await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id FROM historial_etapas WHERE id_oportunidad={opportunity} AND id_etapa_anterior IS NOT NULL");
            // Fechas controladas, con un empate exacto entre una actividad y una transición: desempata el tipo y luego el ID.
            await CommercialSchemaFixture.ExecuteAsync(db, $"""
                UPDATE historial_etapas SET fecha_hora='{Iso(now.AddDays(-4))}' WHERE id={creation};
                UPDATE historial_etapas SET fecha_hora='{Iso(now.AddDays(-2))}' WHERE id={moved};
                UPDATE actividad SET fecha_hora='{Iso(now.AddDays(-2))}' WHERE id={viaOpportunity};
                """);
        }
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"/empresas/{seed.CompanyA}/historial-comercial")).StatusCode);
        async Task<JsonElement> Read(string path) { var r = await seller.GetAsync(path); Assert.Equal(HttpStatusCode.OK, r.StatusCode); return await Json(r); }

        // Empresa: FKs directas; una actividad con empresa y contacto aparece una sola vez; la de contacto solo o de otra empresa no.
        var company = await Read($"/empresas/{seed.CompanyA}/historial-comercial");
        Assert.Equal(new[] { ("TRANSICION", moved), ("ACTIVIDAD", viaOpportunity), ("ACTIVIDAD", both), ("TRANSICION", creation) }, Keys(company));
        Assert.Equal(4, company.GetProperty("totalCount").GetInt32());
        var first = company.GetProperty("items")[0];
        Assert.Equal("Primera", first.GetProperty("etapaAnterior").GetString()); Assert.Equal("Segunda", first.GetProperty("etapaNueva").GetString());
        Assert.Equal("Avanzó", first.GetProperty("observacion").GetString()); Assert.Equal("Propia", first.GetProperty("oportunidadTitulo").GetString());
        var activity = company.GetProperty("items")[1];
        Assert.Equal("Llamada ficticia", activity.GetProperty("tipoActividad").GetString()); Assert.Equal("Con oportunidad", activity.GetProperty("descripcion").GetString());
        Assert.True(activity.GetProperty("fechaRegistro").GetDateTime() > activity.GetProperty("fechaHora").GetDateTime());
        Assert.Equal(JsonValueKind.Null, company.GetProperty("items")[3].GetProperty("etapaAnterior").ValueKind);
        // Contacto: incluye lo suyo, no automáticamente lo de su empresa.
        Assert.Equal(new[] { ("ACTIVIDAD", contactOnly), ("TRANSICION", moved), ("ACTIVIDAD", viaOpportunity), ("ACTIVIDAD", both), ("TRANSICION", creation) },
            Keys(await Read($"/contactos/{seed.ContactA}/historial-comercial")));
        // Oportunidad: sus actividades y transiciones.
        Assert.Equal(new[] { ("TRANSICION", moved), ("ACTIVIDAD", viaOpportunity), ("TRANSICION", creation) }, Keys(await Read($"/oportunidades/{opportunity}/historial-comercial")));

        // Páginas intercaladas sobre una única proyección: sin pérdidas ni duplicados y con el mismo total.
        var pages = new List<(string, int)>();
        for (var page = 1; page <= 3; page++)
        {
            var current = await Read($"/contactos/{seed.ContactA}/historial-comercial?pageSize=2&page={page}");
            Assert.Equal(5, current.GetProperty("totalCount").GetInt32());
            pages.AddRange(Keys(current));
        }
        Assert.Equal(Keys(await Read($"/contactos/{seed.ContactA}/historial-comercial")), pages);

        // Fechas: desde inclusivo y hasta exclusivo, sobre ambas fuentes.
        var from = Uri.EscapeDataString(Iso(now.AddDays(-2)));
        Assert.Equal(new[] { ("ACTIVIDAD", contactOnly), ("TRANSICION", moved), ("ACTIVIDAD", viaOpportunity) }, Keys(await Read($"/contactos/{seed.ContactA}/historial-comercial?desde={from}")));
        Assert.Equal(new[] { ("ACTIVIDAD", both), ("TRANSICION", creation) }, Keys(await Read($"/contactos/{seed.ContactA}/historial-comercial?hasta={from}")));

        // Cambio de empresa del contacto (A→B): la historia de A no se mueve a B ni se mezcla.
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE contacto SET id_empresa={seed.CompanyB} WHERE id={seed.ContactA}");
        Assert.Equal(4, (await Read($"/empresas/{seed.CompanyA}/historial-comercial")).GetProperty("totalCount").GetInt32());
        Assert.Equal(new[] { ("ACTIVIDAD", otherCompany) }, Keys(await Read($"/empresas/{seed.CompanyB}/historial-comercial")));
        Assert.Equal(5, (await Read($"/contactos/{seed.ContactA}/historial-comercial")).GetProperty("totalCount").GetInt32());

        // Oportunidad dada de baja: sus transiciones dejan de usarse, la actividad sigue visible desde sus clientes vigentes
        // y la propia oportunidad ya no se consulta. Una actividad dada de baja desaparece de todas las vistas.
        Assert.Equal(HttpStatusCode.NoContent, (await seller.DeleteAsync($"/oportunidades/{opportunity}")).StatusCode);
        Assert.Equal(new[] { ("ACTIVIDAD", viaOpportunity), ("ACTIVIDAD", both) }, Keys(await Read($"/empresas/{seed.CompanyA}/historial-comercial")));
        Assert.Equal(new[] { ("ACTIVIDAD", contactOnly), ("ACTIVIDAD", viaOpportunity), ("ACTIVIDAD", both) }, Keys(await Read($"/contactos/{seed.ContactA}/historial-comercial")));
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync($"/oportunidades/{opportunity}/historial-comercial")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/actividades/{both}")).StatusCode);
        Assert.Equal(new[] { ("ACTIVIDAD", viaOpportunity) }, Keys(await Read($"/empresas/{seed.CompanyA}/historial-comercial")));

        // Cada actividad indica qué puede intentar el actor: la de una oportunidad ajena no se edita, la propia y la compartida sí.
        var adminOpportunity = (await Json(await admin.PostAsJsonAsync("/oportunidades", new { titulo = "Del admin", idEmbudo = seed.Funnel, idEmpresa = seed.CompanyA }))).GetProperty("id").GetInt32();
        var foreign = await Activity(admin, $"\"idEmpresa\":{seed.CompanyA},\"idOportunidad\":{adminOpportunity}", now.AddHours(-1), "De una oportunidad ajena");
        var shared = await Activity(admin, $"\"idEmpresa\":{seed.CompanyA}", now.AddHours(-2), "Compartida");
        var withActions = (await Read($"/empresas/{seed.CompanyA}/historial-comercial")).GetProperty("items").EnumerateArray()
            .Where(i => i.GetProperty("tipo").GetString() == "ACTIVIDAD").ToDictionary(i => i.GetProperty("idOrigen").GetInt32(), i => i.GetProperty("accionesPermitidas").GetProperty("editar").GetBoolean());
        Assert.False(withActions[foreign]); Assert.True(withActions[shared]); Assert.True(withActions[viaOpportunity]);
        Assert.Equal(JsonValueKind.Null, (await Read($"/empresas/{seed.CompanyA}/historial-comercial")).GetProperty("items").EnumerateArray().First(i => i.GetProperty("tipo").GetString() == "TRANSICION").GetProperty("accionesPermitidas").ValueKind);
        // Un contexto dado de baja no se consulta (sin papelera) y los parámetros inválidos se rechazan.
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE empresa SET activo=false WHERE id={seed.CompanyB}");
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync($"/empresas/{seed.CompanyB}/historial-comercial")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync("/contactos/999999/historial-comercial")).StatusCode);
        foreach (var invalid in new[] { "?page=0", "?pageSize=101", "?desde=ayer" })
            Assert.Equal(HttpStatusCode.BadRequest, (await seller.GetAsync($"/contactos/{seed.ContactA}/historial-comercial{invalid}")).StatusCode);
    }
}
