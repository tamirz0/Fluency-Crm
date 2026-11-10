using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ActividadesTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<int> CreateOpportunityAsync(HttpClient client, object body)
    {
        var response = await client.PostAsJsonAsync("/oportunidades", body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetInt32();
    }

    private static Task<HttpResponseMessage> Post(HttpClient client, string json) => client.PostAsync("/actividades", new StringContent(json, Encoding.UTF8, "application/json"));

    private static string Iso(DateTime value) => value.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", System.Globalization.CultureInfo.InvariantCulture);

    private static int[] Ids(JsonElement items) => items.EnumerateArray().Select(i => i.GetProperty("id").GetInt32()).ToArray();

    private sealed record Setup(AuthApiFactory Factory, HttpClient Admin, HttpClient Seller, AltaOportunidadTests.Seed Seed, int Type, int RetiredType);

    private static async Task<Setup> StartAsync()
    {
        var factory = new AuthApiFactory(); await factory.InitializeAsync();
        var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int type, retired;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "INSERT INTO tipo_actividad(nombre,activo) VALUES ('Llamada ficticia',true),('Tipo retirado',false)");
            type = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM tipo_actividad WHERE nombre='Llamada ficticia'");
            retired = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM tipo_actividad WHERE nombre='Tipo retirado'");
        }
        return new(factory, admin, seller, seed, type, retired);
    }

    [Fact]
    public async Task RegistersAYesterdaysCallTodayKeepingBothDatesAndTheRealAuthorAndRejectsForgedOrInvalidData()
    {
        var s = await StartAsync(); await using var factory = s.Factory; using var admin = s.Admin; using var seller = s.Seller;
        using var anonymous = factory.Client();
        var yesterday = DateTime.UtcNow.AddDays(-1);
        string Body(string extra = "", int? type = null) => $$"""{"idTipo":{{type ?? s.Type}},"idContacto":{{s.Seed.ContactA}},"fechaHora":"{{Iso(yesterday)}}","descripcion":"  Llamada de seguimiento  "{{extra}}}""";

        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(anonymous, Body())).StatusCode);
        var created = await Post(seller, Body(""","resultado":"  Pidió presupuesto  " """));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var body = await Json(created);
        var id = body.GetProperty("id").GetInt32();
        Assert.EndsWith($"/actividades/{id}", created.Headers.Location!.ToString());
        Assert.Equal("Llamada de seguimiento", body.GetProperty("descripcion").GetString());
        Assert.Equal("Pidió presupuesto", body.GetProperty("resultado").GetString());
        Assert.Equal(factory.SellerId, body.GetProperty("idUsuario").GetInt32());
        Assert.Equal("Llamada ficticia", body.GetProperty("tipoNombre").GetString());
        Assert.Equal("Ana Prueba", body.GetProperty("contactoNombre").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("idEmpresa").ValueKind);
        Assert.Equal(yesterday, body.GetProperty("fechaHora").GetDateTime().ToUniversalTime(), TimeSpan.FromMilliseconds(5));
        Assert.True(DateTime.UtcNow - body.GetProperty("fechaRegistro").GetDateTime().ToUniversalTime() < TimeSpan.FromMinutes(5));
        Assert.True(body.GetProperty("fechaRegistro").GetDateTime() - body.GetProperty("fechaHora").GetDateTime() > TimeSpan.FromHours(23));
        Assert.True(body.GetProperty("accionesPermitidas").GetProperty("editar").GetBoolean());

        // El cuerpo no puede falsificar autor, fecha de registro ni baja.
        foreach (var extra in new[] { $",\"idUsuario\":{factory.AdminId}", ",\"fechaRegistro\":\"2020-01-01T00:00:00Z\"", ",\"activo\":false", ",\"id\":1" })
            Assert.Equal(HttpStatusCode.BadRequest, (await Post(seller, Body(extra))).StatusCode);
        // Datos inválidos: ninguno escribe.
        foreach (var invalid in new[]
                 {
                     $$"""{"idTipo":{{s.Type}},"idContacto":{{s.Seed.ContactA}},"descripcion":"Sin fecha"}""",
                     $$"""{"idTipo":{{s.Type}},"idContacto":{{s.Seed.ContactA}},"fechaHora":"{{Iso(yesterday)}}"}""",
                     $$"""{"idTipo":{{s.Type}},"idContacto":{{s.Seed.ContactA}},"fechaHora":"{{Iso(yesterday)}}","descripcion":"   "}""",
                     $$"""{"idContacto":{{s.Seed.ContactA}},"fechaHora":"{{Iso(yesterday)}}","descripcion":"Sin tipo"}""",
                     $$"""{"idTipo":{{s.Type}},"fechaHora":"{{Iso(yesterday)}}","descripcion":"Sin cliente"}""",
                     $$"""{"idTipo":{{s.Type}},"idContacto":{{s.Seed.ContactA}},"fechaHora":"{{Iso(DateTime.UtcNow.AddDays(2))}}","descripcion":"Futura"}""",
                 })
            Assert.Equal(HttpStatusCode.BadRequest, (await Post(seller, invalid)).StatusCode);
        foreach (var bad in new[] { Body("", s.RetiredType), Body("", 999999), Body().Replace($"\"idContacto\":{s.Seed.ContactA}", "\"idContacto\":999999"), Body().Replace($"\"idContacto\":{s.Seed.ContactA}", "\"idEmpresa\":999999") })
        {
            var rejected = await Post(seller, bad);
            Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
            Assert.Equal("REFERENCE_UNAVAILABLE", (await Json(rejected)).GetProperty("code").GetString());
        }
        // Sin oportunidad, un cliente dado de baja no se selecciona; tampoco se infiere la empresa del contacto ni se exige coincidencia.
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE empresa SET activo=false WHERE id={s.Seed.CompanyB}");
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(seller, Body().Replace($"\"idContacto\":{s.Seed.ContactA}", $"\"idEmpresa\":{s.Seed.CompanyB}"))).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await Post(seller, Body().Replace($"\"idContacto\":{s.Seed.ContactA}", $"\"idEmpresa\":{s.Seed.CompanyA},\"idContacto\":{s.Seed.ContactA}"))).StatusCode);
        await using (var db = await factory.OpenAsync())
            Assert.Equal(2L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM actividad"));
    }

    [Fact]
    public async Task WithAnOpportunityOnlyItsOwnerOrASuperiorRegistersEvenWhenClosedAndTheClientsMustBeTheOpportunitys()
    {
        var s = await StartAsync(); await using var factory = s.Factory; using var admin = s.Admin; using var seller = s.Seller;
        var when = Iso(DateTime.UtcNow.AddHours(-2));
        string Body(int? opportunity, string client) => $$"""{"idTipo":{{s.Type}},{{client}},{{(opportunity is null ? "" : $"\"idOportunidad\":{opportunity},")}}"fechaHora":"{{when}}","descripcion":"Reunión"}""";
        var company = $"\"idEmpresa\":{s.Seed.CompanyA}";
        var mine = await CreateOpportunityAsync(seller, new { titulo = "Propia", idEmbudo = s.Seed.Funnel, idServicio = s.Seed.Service, idEmpresa = s.Seed.CompanyA, idContacto = s.Seed.ContactA });
        var theirs = await CreateOpportunityAsync(admin, new { titulo = "Del admin", idEmbudo = s.Seed.Funnel, idServicio = s.Seed.Service, idEmpresa = s.Seed.CompanyA });
        var closed = await CreateOpportunityAsync(seller, new { titulo = "Cerrada", idEmbudo = s.Seed.Funnel, idServicio = s.Seed.Service, idEmpresa = s.Seed.CompanyA });
        Assert.Equal(HttpStatusCode.OK, (await seller.PostAsync($"/oportunidades/{closed}/ganar", new StringContent("""{"fechaCierre":"2026-12-01","valor":10}""", Encoding.UTF8, "application/json"))).StatusCode);
        long history;
        await using (var db = await factory.OpenAsync()) history = await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM historial_etapas");

        // Propia y propia cerrada: se registra sin reabrir ni modificar la oportunidad.
        Assert.Equal(HttpStatusCode.Created, (await Post(seller, Body(mine, company))).StatusCode);
        var afterClose = await Post(seller, Body(closed, company));
        Assert.Equal(HttpStatusCode.Created, afterClose.StatusCode);
        Assert.Equal("Cerrada", (await Json(afterClose)).GetProperty("oportunidadTitulo").GetString());
        var stillClosed = await Json(await seller.GetAsync($"/oportunidades/{closed}"));
        Assert.Equal("GANADA", stillClosed.GetProperty("estado").GetString());
        await using (var db = await factory.OpenAsync()) Assert.Equal(history, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM historial_etapas"));

        // Ajena: 403 aunque se invoque solo con el cliente; un superior sí registra; sin oportunidad todos pueden.
        var denied = await Post(seller, Body(theirs, company));
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
        Assert.Equal("FORBIDDEN", (await Json(denied)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Created, (await Post(admin, Body(mine, company))).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await Post(seller, Body(null, company))).StatusCode);

        // La empresa/contacto deben ser los de la oportunidad (una o ambas), no otros.
        foreach (var other in new[] { $"\"idEmpresa\":{s.Seed.CompanyB}", $"\"idContacto\":{s.Seed.ContactA + 999}" })
        {
            var rejected = await Post(seller, Body(mine, other));
            Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
            Assert.Equal("VALIDATION_FAILED", (await Json(rejected)).GetProperty("code").GetString());
        }
        Assert.Equal(HttpStatusCode.Created, (await Post(seller, Body(mine, $"\"idContacto\":{s.Seed.ContactA}"))).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await Post(seller, Body(mine, $"{company},\"idContacto\":{s.Seed.ContactA}"))).StatusCode);
        // Una oportunidad dada de baja no se elige; las asociaciones históricas de una vigente se conservan aunque el cliente haya dejado de estar activo.
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE contacto SET activo=false WHERE id={s.Seed.ContactA}");
        Assert.Equal(HttpStatusCode.Created, (await Post(seller, Body(mine, $"\"idContacto\":{s.Seed.ContactA}"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await seller.DeleteAsync($"/oportunidades/{mine}")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(seller, Body(mine, company))).StatusCode);
    }

    [Fact]
    public async Task ListsSharedVigentActivitiesByTheMomentOfTheFactWithFiltersAndHidesRemovedOrOrphanedOnes()
    {
        var s = await StartAsync(); await using var factory = s.Factory; using var admin = s.Admin; using var seller = s.Seller;
        var now = DateTime.UtcNow;
        var opportunity = await CreateOpportunityAsync(admin, new { titulo = "Del admin", idEmbudo = s.Seed.Funnel, idServicio = s.Seed.Service, idEmpresa = s.Seed.CompanyA, idContacto = s.Seed.ContactA });
        async Task<int> Add(HttpClient client, string context, DateTime occurred, string text, string? result = null)
        {
            var response = await Post(client, $$"""{"idTipo":{{s.Type}},{{context}},"fechaHora":"{{Iso(occurred)}}","descripcion":"{{text}}"{{(result is null ? "" : $",\"resultado\":\"{result}\"")}}}""");
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return (await Json(response)).GetProperty("id").GetInt32();
        }
        // Se cargan en un orden distinto al de su fecha: la lista ordena por el hecho, no por la carga.
        var recent = await Add(seller, $"\"idEmpresa\":{s.Seed.CompanyB}", now.AddHours(-1), "Visita a la sede", "Quedó en responder");
        var oldest = await Add(admin, $"\"idContacto\":{s.Seed.ContactA}", now.AddDays(-5), "Llamada inicial");
        var viaOpportunity = await Add(admin, $"\"idEmpresa\":{s.Seed.CompanyA},\"idOportunidad\":{opportunity}", now.AddDays(-2), "Reunión de presupuesto");
        var removed = await Add(seller, $"\"idEmpresa\":{s.Seed.CompanyB}", now.AddDays(-3), "Dada de baja");
        var orphan = await Add(seller, $"\"idEmpresa\":{s.Seed.CompanyB}", now.AddDays(-4), "Sin contexto vigente");
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE actividad SET activo=false WHERE id={removed}; UPDATE empresa SET activo=false WHERE id={s.Seed.CompanyB}");
        // «Sin contexto vigente» solo tenía la empresa B, ahora inactiva; «Visita a la sede» también: ambas quedan almacenadas pero sin vista.
        async Task<JsonElement> List(string query = "") { var r = await seller.GetAsync("/actividades" + query); Assert.Equal(HttpStatusCode.OK, r.StatusCode); return await Json(r); }

        var all = await List();
        Assert.Equal(new[] { viaOpportunity, oldest }, Ids(all.GetProperty("items")));
        Assert.Equal(2, all.GetProperty("totalCount").GetInt32());
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync($"/actividades/{removed}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync($"/actividades/{orphan}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync($"/actividades/{recent}")).StatusCode);
        // Lectura compartida: el vendedor ve la actividad de una oportunidad ajena pero sin acciones; la sin oportunidad sí la gestiona.
        var detail = await Json(await seller.GetAsync($"/actividades/{viaOpportunity}"));
        Assert.False(detail.GetProperty("accionesPermitidas").GetProperty("editar").GetBoolean());
        Assert.Equal("Del admin", detail.GetProperty("oportunidadTitulo").GetString());
        Assert.True((await Json(await seller.GetAsync($"/actividades/{oldest}"))).GetProperty("accionesPermitidas").GetProperty("darDeBaja").GetBoolean());

        // Una oportunidad dada de baja no oculta la actividad que sigue teniendo otro contexto vigente.
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE empresa SET activo=true WHERE id={s.Seed.CompanyB}; UPDATE oportunidad SET activo=false WHERE id={opportunity}");
        Assert.Equal(new[] { recent, viaOpportunity, orphan, oldest }, Ids((await List()).GetProperty("items")));
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE empresa SET activo=false WHERE id={s.Seed.CompanyA}");
        Assert.Equal(new[] { recent, orphan, oldest }, Ids((await List()).GetProperty("items")));
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE empresa SET activo=true WHERE id={s.Seed.CompanyA}");

        // Filtros, búsqueda sin tildes, fechas con inicio inclusivo y fin exclusivo, y paginación sobre el total filtrado.
        Assert.Equal(new[] { oldest }, Ids((await List($"?idContacto={s.Seed.ContactA}")).GetProperty("items")));
        Assert.Equal(new[] { recent, orphan }, Ids((await List($"?idEmpresa={s.Seed.CompanyB}")).GetProperty("items")));
        Assert.Equal(new[] { viaOpportunity }, Ids((await List($"?idOportunidad={opportunity}")).GetProperty("items")));
        Assert.Equal(new[] { recent, orphan }, Ids((await List($"?idUsuario={factory.SellerId}")).GetProperty("items")));
        Assert.Equal(4, (await List($"?idTipo={s.Type}")).GetProperty("totalCount").GetInt32());
        Assert.Equal(0, (await List($"?idTipo={s.RetiredType}")).GetProperty("totalCount").GetInt32());
        Assert.Equal(new[] { viaOpportunity }, Ids((await List("?q=PRESUPUESTO")).GetProperty("items")));
        Assert.Equal(new[] { recent }, Ids((await List("?q=respondér")).GetProperty("items")));
        var from = Uri.EscapeDataString(Iso(now.AddDays(-2)));
        Assert.Equal(new[] { recent, viaOpportunity }, Ids((await List($"?desde={from}")).GetProperty("items")));
        Assert.Equal(new[] { recent, viaOpportunity }, Ids((await List($"?desde={from}&hasta={Uri.EscapeDataString(Iso(now))}")).GetProperty("items")));
        Assert.Equal(new[] { orphan, oldest }, Ids((await List($"?hasta={Uri.EscapeDataString(Iso(now.AddDays(-2)))}")).GetProperty("items")));
        var first = await List("?pageSize=2"); var second = await List("?pageSize=2&page=2");
        Assert.Equal(new[] { recent, viaOpportunity }, Ids(first.GetProperty("items")));
        Assert.Equal(new[] { orphan, oldest }, Ids(second.GetProperty("items")));
        Assert.Equal(4, second.GetProperty("totalCount").GetInt32());
        foreach (var invalid in new[] { "?page=0", "?pageSize=101", "?idTipo=0", "?desde=ayer" })
            Assert.Equal(HttpStatusCode.BadRequest, (await seller.GetAsync("/actividades" + invalid)).StatusCode);
    }
}
