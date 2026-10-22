using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ServiciosTests
{
    [Fact]
    public async Task ServicesPreserveDecimalInactiveReferencesAndIndependentFunnels()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/servicios")).StatusCode);
        foreach (var role in new[] { "VENDEDOR", "RESPONSABLE_COMERCIAL" })
        {
            await using var db = await factory.OpenAsync();
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE usuario_rol SET id_rol=(SELECT id FROM rol WHERE nombre='{role}') WHERE id_usuario={factory.SellerId}");
            Assert.Equal(HttpStatusCode.OK, (await seller.GetAsync("/servicios")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/servicios?activo=todos")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsJsonAsync("/servicios", new { nombre = "Prohibido", precioReferencia = 0 })).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await seller.PatchAsJsonAsync("/servicios/1", new { nombre = "Prohibido" })).StatusCode);
            foreach (var action in new[] { "desactivar", "reactivar" })
                Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsync($"/servicios/1/{action}", null)).StatusCode);
        }
        using var created = await admin.PostAsJsonAsync("/servicios", new { nombre = "Inglés CP06", precioReferencia = 1234567890.12m, idNivel = 1, idModalidad = 1, duracionHoras = 20 });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode); Assert.NotNull(created.Headers.Location);
        var item = await created.Content.ReadFromJsonAsync<JsonElement>(); var id = item.GetProperty("id").GetInt32();
        Assert.Equal(1234567890.12m, item.GetProperty("precioReferencia").GetDecimal());
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE nivel_ingles SET activo=false WHERE id=1; UPDATE modalidad SET activo=false WHERE id=1; INSERT INTO embudo(nombre,id_servicio) VALUES ('Embudo CP06',{id})");
        }
        var edited = await admin.PatchAsJsonAsync($"/servicios/{id}", new { nombre = "Reunión CP06", precioReferencia = 0 });
        edited.EnsureSuccessStatusCode();
        item = await edited.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(item.GetProperty("nivel").GetProperty("activo").GetBoolean());
        Assert.False(item.GetProperty("modalidad").GetProperty("activo").GetBoolean());
        Assert.Equal(20, item.GetProperty("duracionHoras").GetInt32());
        (await admin.PatchAsJsonAsync($"/servicios/{id}", new { idNivel = 1, idModalidad = 1 })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/servicios", new { nombre = "Otro", precioReferencia = 0, idNivel = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/servicios", new { nombre = "Otro", precioReferencia = 0, idModalidad = 1 })).StatusCode);
        foreach (var action in new[] { "desactivar", "desactivar" })
            (await admin.PostAsync($"/servicios/{id}/{action}", null)).EnsureSuccessStatusCode();
        Assert.Empty((await seller.GetFromJsonAsync<JsonElement>("/servicios")).GetProperty("items").EnumerateArray());
        item = await seller.GetFromJsonAsync<JsonElement>($"/servicios/{id}");
        Assert.False(item.GetProperty("activo").GetBoolean()); Assert.Equal(0m, item.GetProperty("precioReferencia").GetDecimal());
        await using (var db = await factory.OpenAsync())
        {
            Assert.True(await CommercialSchemaFixture.ScalarAsync<bool>(db, $"SELECT activo FROM embudo WHERE id_servicio={id}"));
            Assert.Equal(0m, await CommercialSchemaFixture.ScalarAsync<decimal>(db, $"SELECT precio_referencia FROM servicio WHERE id={id}"));
        }
        var page = await admin.GetFromJsonAsync<JsonElement>("/servicios?q=reunion&activo=false&pageSize=1");
        Assert.Equal(1, page.GetProperty("totalCount").GetInt32());
        Assert.Empty((await admin.GetFromJsonAsync<JsonElement>("/servicios?activo=todos&page=999")).GetProperty("items").EnumerateArray());
        (await admin.PostAsync($"/servicios/{id}/reactivar", null)).EnsureSuccessStatusCode();
        (await admin.PatchAsJsonAsync($"/servicios/{id}", new { descripcion = "   ", duracionHoras = (int?)null, idNivel = (int?)null, idModalidad = (int?)null })).EnsureSuccessStatusCode();
        item = await admin.GetFromJsonAsync<JsonElement>($"/servicios/{id}");
        Assert.Equal(JsonValueKind.Null, item.GetProperty("nivel").ValueKind);
        Assert.Equal(JsonValueKind.Null, item.GetProperty("modalidad").ValueKind);
        Assert.Equal(JsonValueKind.Null, item.GetProperty("duracionHoras").ValueKind);
        Assert.Equal(JsonValueKind.Null, item.GetProperty("descripcion").ValueKind);
    }

    [Fact]
    public async Task ValidatesRequiredPricePrecisionPatchPresenceAndReferences()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        foreach (var body in new[] { "{}", "{\"nombre\":\"Curso\"}", "{\"precioReferencia\":0}", "{\"nombre\":\"Curso\",\"precioReferencia\":null}", "{\"nombre\":\" \",\"precioReferencia\":0}", "{\"nombre\":\"Curso\",\"precioReferencia\":-1}", "{\"nombre\":\"Curso\",\"precioReferencia\":1.001}", "{\"nombre\":\"Curso\",\"precioReferencia\":10000000000}", "{\"nombre\":\"Curso\",\"precioReferencia\":0,\"activo\":false}", "{\"nombre\":\"Curso\",\"precioReferencia\":0,\"idNivel\":99999}" })
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsync("/servicios", JsonBody(body))).StatusCode);
        var created = await admin.PostAsJsonAsync("/servicios", new { nombre = "Curso", precioReferencia = 10.25m }); created.EnsureSuccessStatusCode();
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        foreach (var body in new[] { "{}", "{\"nombre\":null}", "{\"precioReferencia\":null}", "{\"precioReferencia\":-0.01}", "{\"precioReferencia\":1.005}", "{\"activo\":false}", "{\"idModalidad\":99999}" })
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.PatchAsync($"/servicios/{id}", JsonBody(body))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/servicios", new { nombre = new string('x',151), precioReferencia = 0 })).StatusCode);
        foreach (var suffix in new[] { "?page=0", "?pageSize=101", "?activo=otro" })
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync("/servicios" + suffix)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync("/servicios/99999")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsync("/servicios/99999/desactivar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync("/Servicios/ListadoServicios")).StatusCode);
    }
    private static StringContent JsonBody(string body) => new(body, Encoding.UTF8, "application/json");
}
