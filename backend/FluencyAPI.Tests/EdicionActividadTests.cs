using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class EdicionActividadTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static Task<HttpResponseMessage> Patch(HttpClient client, int id, string json) => client.PatchAsync($"/actividades/{id}", new StringContent(json, Encoding.UTF8, "application/json"));

    private static string Iso(DateTime value) => value.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", System.Globalization.CultureInfo.InvariantCulture);

    [Fact]
    public async Task EditingKeepsAuthorAndRegistrationAndNeverRevalidatesHistoricalAssociationsForPlainEdits()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int type, otherType, retiredType;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "INSERT INTO tipo_actividad(nombre,activo) VALUES ('Llamada ficticia',true),('Reunión ficticia',true),('Retirado',false)");
            type = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM tipo_actividad WHERE nombre='Llamada ficticia'");
            otherType = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM tipo_actividad WHERE nombre='Reunión ficticia'");
            retiredType = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM tipo_actividad WHERE nombre='Retirado'");
        }
        async Task<int> Opportunity(HttpClient client, string title)
        {
            var r = await client.PostAsJsonAsync("/oportunidades", new { titulo = title, idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA, idContacto = seed.ContactA });
            return (await Json(r)).GetProperty("id").GetInt32();
        }
        async Task<int> Activity(HttpClient client, string context, string text = "Original")
        {
            var r = await client.PostAsync("/actividades", new StringContent($$"""{"idTipo":{{type}},{{context}},"fechaHora":"{{Iso(DateTime.UtcNow.AddDays(-1))}}","descripcion":"{{text}}"}""", Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.Created, r.StatusCode);
            return (await Json(r)).GetProperty("id").GetInt32();
        }
        var mine = await Opportunity(seller, "Propia"); var theirs = await Opportunity(admin, "Del admin");
        var sellerLinked = await Activity(seller, $"\"idEmpresa\":{seed.CompanyA},\"idContacto\":{seed.ContactA},\"idOportunidad\":{mine}");
        var adminLinked = await Activity(admin, $"\"idEmpresa\":{seed.CompanyA},\"idContacto\":{seed.ContactA},\"idOportunidad\":{theirs}");
        var shared = await Activity(admin, $"\"idContacto\":{seed.ContactA}");
        string author, registered;
        await using (var db = await factory.OpenAsync())
        {
            author = (await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id_usuario FROM actividad WHERE id={sellerLinked}")).ToString();
            registered = (await CommercialSchemaFixture.ScalarAsync<DateTime>(db, $"SELECT fecha_registro FROM actividad WHERE id={sellerLinked}")).ToString("O");
            // El contacto cambió de empresa después: la pareja histórica de la actividad ya no coincide con su empresa actual.
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE contacto SET id_empresa={seed.CompanyB} WHERE id={seed.ContactA}");
        }

        // Editar texto, resultado y fecha conserva autor, registro y asociaciones, aunque la empresa actual del contacto sea otra.
        var newDate = DateTime.UtcNow.AddDays(-3);
        var edited = await Patch(seller, sellerLinked, $$"""{"descripcion":"  Corregida  ","resultado":"  Aceptó  ","fechaHora":"{{Iso(newDate)}}","idTipo":{{otherType}}}""");
        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        var body = await Json(edited);
        Assert.Equal("Corregida", body.GetProperty("descripcion").GetString());
        Assert.Equal("Aceptó", body.GetProperty("resultado").GetString());
        Assert.Equal(otherType, body.GetProperty("idTipo").GetInt32());
        Assert.Equal(newDate, body.GetProperty("fechaHora").GetDateTime().ToUniversalTime(), TimeSpan.FromMilliseconds(5));
        Assert.Equal(seed.CompanyA, body.GetProperty("idEmpresa").GetInt32());
        Assert.Equal(seed.ContactA, body.GetProperty("idContacto").GetInt32());
        Assert.Equal(mine, body.GetProperty("idOportunidad").GetInt32());
        Assert.Equal(factory.SellerId.ToString(), author);
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal(factory.SellerId, await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id_usuario FROM actividad WHERE id={sellerLinked}"));
            Assert.Equal(registered, (await CommercialSchemaFixture.ScalarAsync<DateTime>(db, $"SELECT fecha_registro FROM actividad WHERE id={sellerLinked}")).ToString("O"));
        }
        // El resultado se puede completar después y limpiar con null.
        Assert.Equal(JsonValueKind.Null, (await Json(await Patch(seller, sellerLinked, """{"resultado":null}"""))).GetProperty("resultado").ValueKind);

        // Campos que no se editan, datos inválidos y referencias no disponibles.
        foreach (var invalid in new[] { """{}""", $$"""{"idUsuario":{{factory.AdminId}}}""", """{"fechaRegistro":"2020-01-01T00:00:00Z"}""", """{"activo":false}""", """{"descripcion":"  "}""", """{"descripcion":null}""", """{"idTipo":null}""", """{"fechaHora":null}""",
                                       $$"""{"fechaHora":"{{Iso(DateTime.UtcNow.AddDays(3))}}"}""", """{"idEmpresa":null,"idContacto":null}""" })
            Assert.Equal(HttpStatusCode.BadRequest, (await Patch(seller, sellerLinked, invalid)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Patch(seller, sellerLinked, $$"""{"idTipo":{{retiredType}}}""")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Patch(seller, 999999, """{"descripcion":"x"}""")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Patch(factory.Client(), sellerLinked, """{"descripcion":"x"}""")).StatusCode);
        Assert.Equal("Corregida", (await Json(await seller.GetAsync($"/actividades/{sellerLinked}"))).GetProperty("descripcion").GetString());

        // Origen: la actividad de una oportunidad ajena no se edita ni se da de baja; la compartida sí, por cualquiera.
        Assert.Equal(HttpStatusCode.Forbidden, (await Patch(seller, adminLinked, """{"descripcion":"x"}""")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.DeleteAsync($"/actividades/{adminLinked}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Patch(seller, shared, """{"descripcion":"Editada por otro usuario"}""")).StatusCode);
        // Quitar la oportunidad ajena exige permiso sobre el origen; un superior sí puede.
        Assert.Equal(HttpStatusCode.Forbidden, (await Patch(seller, adminLinked, """{"idOportunidad":null}""")).StatusCode);
        // Destino: no se incorpora una actividad a una oportunidad ajena, ni con otras asociaciones.
        Assert.Equal(HttpStatusCode.Forbidden, (await Patch(seller, shared, $$"""{"idOportunidad":{{theirs}}}""")).StatusCode);
        var wrongClient = await Patch(seller, shared, $$"""{"idOportunidad":{{mine}},"idEmpresa":{{seed.CompanyB}}}""");
        Assert.Equal(HttpStatusCode.BadRequest, wrongClient.StatusCode);
        Assert.Equal("VALIDATION_FAILED", (await Json(wrongClient)).GetProperty("code").GetString());
        var linked = await Patch(seller, shared, $$"""{"idOportunidad":{{mine}},"idEmpresa":{{seed.CompanyA}}}""");
        Assert.Equal(HttpStatusCode.OK, linked.StatusCode);
        Assert.Equal(mine, (await Json(linked)).GetProperty("idOportunidad").GetInt32());
        var unlinked = await Patch(admin, adminLinked, """{"idOportunidad":null}""");
        Assert.Equal(HttpStatusCode.OK, unlinked.StatusCode);
        Assert.Equal(JsonValueKind.Null, (await Json(unlinked)).GetProperty("idOportunidad").ValueKind);
        // Ya sin oportunidad, la gestión es compartida: el vendedor la edita.
        Assert.Equal(HttpStatusCode.OK, (await Patch(seller, adminLinked, """{"descripcion":"Ahora compartida"}""")).StatusCode);

        // Cambio de dueño de la oportunidad: el anterior pierde el permiso sobre sus actividades.
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/oportunidades/{mine}/reasignar", new StringContent($$"""{"idResponsable":{{factory.AdminId}}}""", Encoding.UTF8, "application/json"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Patch(seller, sellerLinked, """{"descripcion":"Ya no es mía"}""")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.DeleteAsync($"/actividades/{sellerLinked}")).StatusCode);
        Assert.False((await Json(await seller.GetAsync($"/actividades/{sellerLinked}"))).GetProperty("accionesPermitidas").GetProperty("editar").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, (await Patch(admin, sellerLinked, """{"descripcion":"Editada por el nuevo dueño"}""")).StatusCode);
    }

    [Fact]
    public async Task RemovalIsLogicalPermanentAndNeverCascades()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int type;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "INSERT INTO tipo_actividad(nombre) VALUES ('Llamada ficticia')");
            type = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM tipo_actividad WHERE nombre='Llamada ficticia'");
        }
        var opportunity = (await Json(await seller.PostAsJsonAsync("/oportunidades", new { titulo = "Propia", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA, idContacto = seed.ContactA }))).GetProperty("id").GetInt32();
        async Task<int> Activity(string context)
        {
            var r = await seller.PostAsync("/actividades", new StringContent($$"""{"idTipo":{{type}},{{context}},"fechaHora":"{{Iso(DateTime.UtcNow.AddHours(-1))}}","descripcion":"Hecho"}""", Encoding.UTF8, "application/json"));
            Assert.Equal(HttpStatusCode.Created, r.StatusCode);
            return (await Json(r)).GetProperty("id").GetInt32();
        }
        var withOpportunity = await Activity($"\"idEmpresa\":{seed.CompanyA},\"idContacto\":{seed.ContactA},\"idOportunidad\":{opportunity}");
        var contactOnly = await Activity($"\"idContacto\":{seed.ContactA}");
        long history; await using (var db = await factory.OpenAsync()) history = await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM historial_etapas");

        Assert.Equal(HttpStatusCode.Unauthorized, (await factory.Client().DeleteAsync($"/actividades/{contactOnly}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await seller.DeleteAsync($"/actividades/{withOpportunity}")).StatusCode);
        // Sin restauración: desaparece de la consulta y de toda operación; repetir no cambia nada.
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync($"/actividades/{withOpportunity}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.DeleteAsync($"/actividades/{withOpportunity}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Patch(admin, withOpportunity, """{"descripcion":"Revivir"}""")).StatusCode);
        Assert.Equal(new[] { contactOnly }, (await Json(await seller.GetAsync("/actividades"))).GetProperty("items").EnumerateArray().Select(i => i.GetProperty("id").GetInt32()).ToArray());
        // Sin cascadas: ni la oportunidad, ni el contacto, ni la empresa, ni la historia de etapas, ni la otra actividad cambian.
        Assert.Equal("ABIERTA", (await Json(await seller.GetAsync($"/oportunidades/{opportunity}"))).GetProperty("estado").GetString());
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM oportunidad WHERE id={opportunity} AND activo"));
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM contacto WHERE id={seed.ContactA} AND activo"));
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM empresa WHERE id={seed.CompanyA} AND activo"));
            Assert.Equal(history, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM historial_etapas"));
            Assert.Equal(2L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM actividad"));
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM actividad WHERE id={contactOnly} AND activo"));
        }
        // Una actividad compartida la da de baja cualquier usuario activo.
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/actividades/{contactOnly}")).StatusCode);
    }
}
