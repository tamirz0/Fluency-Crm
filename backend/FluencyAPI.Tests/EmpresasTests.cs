using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class EmpresasTests
{
    [Fact]
    public async Task AllRolesShareClientsWithDefaultsAndAtomicDifferentialPatch()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/empresas")).StatusCode);
        var created = await admin.PostAsJsonAsync("/empresas", new { razonSocial = "  Ácme  ", cuit = "123", idOrigen = 1 });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode); Assert.NotNull(created.Headers.Location);
        var item = await created.Content.ReadFromJsonAsync<JsonElement>(); var id = item.GetProperty("id").GetInt32();
        Assert.Equal(factory.AdminId, item.GetProperty("idResponsable").GetInt32());
        Assert.Equal("Potencial", item.GetProperty("estadoDescripcion").GetString());
        Assert.Equal("Ácme", item.GetProperty("razonSocial").GetString());
        Assert.True(item.GetProperty("activo").GetBoolean());
        Assert.True(item.GetProperty("fechaCreacion").GetDateTime().ToUniversalTime() > DateTime.UtcNow.AddMinutes(-2));
        foreach (var role in new[] { "VENDEDOR", "RESPONSABLE_COMERCIAL" })
        {
            await using var db = await factory.OpenAsync();
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE usuario_rol SET id_rol=(SELECT id FROM rol WHERE nombre='{role}') WHERE id_usuario={factory.SellerId}");
            (await seller.GetAsync($"/empresas/{id}")).EnsureSuccessStatusCode();
            (await seller.PatchAsJsonAsync($"/empresas/{id}", new { telefono = role, idResponsable = factory.AdminId })).EnsureSuccessStatusCode();
            var own = await seller.PostAsJsonAsync("/empresas", new { razonSocial = role, idResponsable = factory.AdminId });
            Assert.Equal(HttpStatusCode.Created, own.StatusCode);
        }
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE usuario SET activo=false WHERE id={factory.AdminId}; UPDATE estado_cliente SET activo=false WHERE descripcion='Potencial'; UPDATE origen_comercial SET activo=false WHERE id=1");
        var updated = await seller.PatchAsJsonAsync($"/empresas/{id}", new { cuit = (string?)null, observaciones = "Conservadas" });
        updated.EnsureSuccessStatusCode(); item = await updated.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, item.GetProperty("cuit").ValueKind);
        Assert.False(item.GetProperty("responsableActivo").GetBoolean());
        Assert.False(item.GetProperty("estadoActivo").GetBoolean());
        Assert.False(item.GetProperty("origenActivo").GetBoolean());
        (await seller.PatchAsJsonAsync($"/empresas/{id}", new { idResponsable = factory.AdminId, idEstado = item.GetProperty("idEstado").GetInt32(), idOrigen = 1 })).EnsureSuccessStatusCode();
        foreach (var body in new[] { "{}", "{\"razonSocial\":null}", "{\"idEstado\":null}", "{\"idResponsable\":null}", "{\"activo\":false}", "{\"idUsuario\":1}", "{\"fechaCreacion\":\"2020-01-01\"}", "{\"razonSocial\":\"No guardar\",\"idOrigen\":999999}", "{\"idResponsable\":-1}" })
            Assert.Equal(HttpStatusCode.BadRequest, (await seller.PatchAsync($"/empresas/{id}", new StringContent(body, Encoding.UTF8, "application/json"))).StatusCode);
        item = await seller.GetFromJsonAsync<JsonElement>($"/empresas/{id}");
        Assert.Equal("Ácme", item.GetProperty("razonSocial").GetString());
        Assert.Equal("Conservadas", item.GetProperty("observaciones").GetString());
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.PostAsJsonAsync("/empresas", new { razonSocial = "Sin default" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.PostAsJsonAsync("/empresas", new { razonSocial = "No disponible", idEstado = 2, idResponsable = factory.AdminId })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.PostAsJsonAsync("/empresas", new { razonSocial = "No disponible", idEstado = 2, idOrigen = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await seller.PostAsJsonAsync("/empresas", new { razonSocial = "Comercial inactiva", idEstado = 3 })).StatusCode);
        foreach (var body in new[] { "{}", "{\"razonSocial\":\" \"}", "{\"razonSocial\":\"Oculto\",\"activo\":false}", "{\"razonSocial\":\"Oculto\",\"autor\":1}", "{\"razonSocial\":\"Inválido\",\"idEstado\":null}", "{\"razonSocial\":\"Inválido\",\"correo\":\"no-es-correo\"}" })
            Assert.Equal(HttpStatusCode.BadRequest, (await seller.PostAsync("/empresas", new StringContent(body, Encoding.UTF8, "application/json"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync("/empresas/999999")).StatusCode);
        await using (var db = await factory.OpenAsync()) await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE empresa SET activo=false WHERE id={id}");
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync($"/empresas/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.PatchAsJsonAsync($"/empresas/{id}", new { telefono = "No" })).StatusCode);
    }

    [Fact]
    public async Task CombinesFiltersBeforeCountingAndPaginatesWithStableOrder()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var client = factory.Client(); await UsuariosTests.SignIn(client, factory, "seller");
        foreach (var name in new[] { "Ácme", "Ácme", "Ácme Z", "Otra" })
            (await client.PostAsJsonAsync("/empresas", new { razonSocial = name, idEstado = 2, idOrigen = 1, idResponsable = factory.AdminId })).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/empresas", new { razonSocial = "Ácme excluida", idOrigen = 1 })).EnsureSuccessStatusCode();
        var filter = $"/empresas?q=ACME&idEstado=2&idOrigen=1&idResponsable={factory.AdminId}&pageSize=2";
        var page1 = await client.GetFromJsonAsync<JsonElement>(filter);
        var page2 = await client.GetFromJsonAsync<JsonElement>(filter + "&page=2");
        Assert.Equal(3, page1.GetProperty("totalCount").GetInt32()); Assert.Equal(3, page2.GetProperty("totalCount").GetInt32());
        var ids = page1.GetProperty("items").EnumerateArray().Concat(page2.GetProperty("items").EnumerateArray()).Select(x => x.GetProperty("id").GetInt32()).ToArray();
        Assert.Equal(3, ids.Distinct().Count()); Assert.True(ids[0] < ids[1]);
        Assert.Empty((await client.GetFromJsonAsync<JsonElement>(filter + "&page=999")).GetProperty("items").EnumerateArray());
        foreach (var query in new[] { "page=0", "pageSize=101", "idEstado=0", "idOrigen=-1", "idResponsable=no" })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/empresas?" + query)).StatusCode);
    }
}
