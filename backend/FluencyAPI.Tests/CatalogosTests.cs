using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class CatalogosTests
{
    [Fact]
    public async Task AdminCrudPreservesReferencesAndOperatorsReadOnlyActiveOptions()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/catalogos/origenes-comerciales/opciones")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/catalogos/origenes-comerciales")).StatusCode);
        foreach (var catalog in new[] { "estados-cliente", "origenes-comerciales", "niveles-ingles", "modalidades", "motivos-perdida", "tipos-actividad" })
        {
            var body = catalog == "tipos-actividad" ? new { nombre = "Prueba CP05" } as object : new { descripcion = "Prueba CP05" };
            var path = "/catalogos/" + catalog;
            Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsJsonAsync(path, body)).StatusCode);
            using var created = await admin.PostAsJsonAsync(path, body);
            Assert.Equal(HttpStatusCode.Created, created.StatusCode); Assert.NotNull(created.Headers.Location);
            var item = await created.Content.ReadFromJsonAsync<JsonElement>(); var id = item.GetProperty("id").GetInt32();
            Assert.True(item.GetProperty("activo").GetBoolean());
            Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync(path, catalog == "tipos-actividad" ? new { nombre = " PRUEBA cp05 " } as object : new { descripcion = " PRUEBA cp05 " })).StatusCode);
            foreach (var operation in new[] { "desactivar", "reactivar" })
                Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsync($"{path}/{id}/{operation}", null)).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await seller.PatchAsJsonAsync($"{path}/{id}", body)).StatusCode);
            if (catalog == "origenes-comerciales")
            {
                await using var db = await factory.OpenAsync();
                await CommercialSchemaFixture.ExecuteAsync(db, $"INSERT INTO empresa(razon_social,id_estado,id_responsable,id_origen) SELECT 'Empresa CP05',id,{factory.AdminId},{id} FROM estado_cliente LIMIT 1");
            }
            (await admin.PostAsync($"{path}/{id}/desactivar", null)).EnsureSuccessStatusCode();
            (await admin.PostAsync($"{path}/{id}/desactivar", null)).EnsureSuccessStatusCode();
            var options = await seller.GetFromJsonAsync<JsonElement>($"{path}/opciones");
            Assert.DoesNotContain(options.EnumerateArray(), x => x.GetProperty("id").GetInt32() == id);
            var detail = await seller.GetFromJsonAsync<JsonElement>($"{path}/{id}");
            Assert.False(detail.GetProperty("activo").GetBoolean());
            Assert.Equal("Prueba CP05", detail.GetProperty(catalog == "tipos-actividad" ? "nombre" : "descripcion").GetString());
            if (catalog == "origenes-comerciales")
            {
                await using var db = await factory.OpenAsync();
                Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM empresa WHERE id_origen={id} AND activo"));
            }
            (await admin.PostAsync($"{path}/{id}/reactivar", null)).EnsureSuccessStatusCode();
            Assert.Contains((await seller.GetFromJsonAsync<JsonElement>($"{path}/opciones")).EnumerateArray(), x => x.GetProperty("id").GetInt32() == id);
            var edited = await admin.PatchAsJsonAsync($"{path}/{id}", catalog == "tipos-actividad" ? new { nombre = "Editado CP05" } as object : new { descripcion = "Editado CP05" });
            edited.EnsureSuccessStatusCode();
        }
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE usuario_rol SET id_rol=(SELECT id FROM rol WHERE nombre='RESPONSABLE_COMERCIAL') WHERE id_usuario={factory.SellerId}");
        Assert.Equal(HttpStatusCode.OK, (await seller.GetAsync("/catalogos/origenes-comerciales/opciones")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/catalogos/origenes-comerciales?activo=todos")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsJsonAsync("/catalogos/origenes-comerciales", new { descripcion = "No permitido" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await seller.GetAsync("/estados-oportunidad")).StatusCode);
    }

    [Fact]
    public async Task ClosedCatalogsFixedStatesValidationAndFiltering()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        const string path = "/catalogos/origenes-comerciales";
        foreach (var body in new[] { "{}", "{\"descripcion\":null}", "{\"descripcion\":\" \"}", "{\"nombre\":\"Otro\"}", "{\"descripcion\":\"Otro\",\"activo\":false}", "{\"descripcion\":\"Otro\",\"nombre\":\"Otro\"}" })
        {
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsync(path, JsonBody(body))).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.PatchAsync(path + "/1", JsonBody(body))).StatusCode);
        }
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync(path, new { descripcion = new string('x', 101) })).StatusCode);
        foreach (var suffix in new[] { "?page=0", "?pageSize=101", "?activo=otro" })
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync(path + suffix)).StatusCode);
        (await admin.PostAsJsonAsync(path, new { descripcion = "Reunión CP05" })).EnsureSuccessStatusCode();
        var page = await admin.GetFromJsonAsync<JsonElement>(path + "?q=reunion&activo=todos&pageSize=1");
        Assert.Equal(1, page.GetProperty("totalCount").GetInt32()); Assert.Equal(1, page.GetProperty("items").GetArrayLength());
        Assert.Empty((await admin.GetFromJsonAsync<JsonElement>(path + "?page=999")).GetProperty("items").EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync(path + "/99999")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsync(path + "/99999/desactivar", null)).StatusCode);
        foreach (var catalog in new[] { "usuarios", "estado-oportunidad", "origen_comercial", "no-existe" })
        {
            Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"/catalogos/{catalog}/opciones")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsJsonAsync($"/catalogos/{catalog}", new { descripcion = "Intruso" })).StatusCode);
        }
        var states = await admin.GetFromJsonAsync<JsonElement>("/estados-oportunidad");
        Assert.Equal(new[] { "ABIERTA", "GANADA", "PERDIDA" }, states.EnumerateArray().Select(x => x.GetProperty("codigo").GetString()).Order().ToArray());
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await admin.PostAsJsonAsync("/estados-oportunidad", new { codigo = "OTRO" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PatchAsJsonAsync("/estados-oportunidad/1", new { descripcion = "Otro" })).StatusCode);
    }
    private static StringContent JsonBody(string body) => new(body, Encoding.UTF8, "application/json");
}
