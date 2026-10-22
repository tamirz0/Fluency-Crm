using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Services.DTO;
using Npgsql;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class UsuariosTests
{
    internal static async Task SignIn(HttpClient client, AuthApiFactory factory, string username = "admin", string? password = null)
    {
        var token = (await client.GetFromJsonAsync<CsrfResponse>("/auth/csrf"))!.RequestToken;
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", token);
        (await client.PostAsJsonAsync("/auth/login", new { username, password = password ?? factory.Password })).EnsureSuccessStatusCode();
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", (await client.GetFromJsonAsync<CsrfResponse>("/auth/csrf"))!.RequestToken);
    }
    private static object Account(string username = "nuevo", string[]? roles = null) => new {
        nombre = "Ana", apellido = "Pérez", correo = username + "@example.invalid", username, password = "Ficticia123!", roles = roles ?? ["VENDEDOR"]
    };
    [Fact]
    public async Task AdminManagesAccountsRolesAndSessionRevocationWithoutRenewal()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await SignIn(admin, factory);
        var roles = await admin.GetFromJsonAsync<JsonElement>("/roles"); Assert.Equal(3, roles.GetArrayLength());
        using var created = await admin.PostAsJsonAsync("/usuarios", Account());
        Assert.Equal(HttpStatusCode.Created, created.StatusCode); Assert.NotNull(created.Headers.Location);
        var user = (await created.Content.ReadFromJsonAsync<UsuarioResponse>())!;
        Assert.True(user.Activo); Assert.Equal(new[] { "VENDEDOR" }, user.Roles);
        await using (var connection = await factory.OpenAsync())
        {
            await using var assignment = new NpgsqlCommand("INSERT INTO empresa(razon_social,id_estado,id_responsable) SELECT 'Empresa ficticia CP04',id,@user FROM estado_cliente ORDER BY id LIMIT 1", connection);
            assignment.Parameters.AddWithValue("user", user.Id);
            await assignment.ExecuteNonQueryAsync();
        }
        var text = await created.Content.ReadAsStringAsync(); Assert.DoesNotContain("hash", text, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Ficticia123!", text);
        using var member = factory.Client(); await SignIn(member, factory, "nuevo", "Ficticia123!");
        var before = (await member.GetFromJsonAsync<SesionResponse>("/auth/me"))!;
        factory.Clock.Advance(TimeSpan.FromMinutes(2));
        (await admin.PatchAsJsonAsync($"/usuarios/{user.Id}", new { roles = new[] { "RESPONSABLE_COMERCIAL", "VENDEDOR" }, nombre = "Ana María" })).EnsureSuccessStatusCode();
        var after = (await member.GetFromJsonAsync<SesionResponse>("/auth/me"))!;
        Assert.Contains("RESPONSABLE_COMERCIAL", after.Usuario.Roles); Assert.Equal(before.ExpiresAt, after.ExpiresAt);
        Assert.Equal("Ana María", after.Usuario.Nombre); Assert.Equal(user.Correo, after.Usuario.Correo);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/usuarios")).StatusCode);
        (await admin.PutAsJsonAsync($"/usuarios/{user.Id}/password", new { password = "OtraFicticia123!" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await member.GetAsync("/auth/me")).StatusCode);
        await SignIn(member, factory, "nuevo", "OtraFicticia123!");
        (await admin.PostAsync($"/usuarios/{user.Id}/desactivar", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await member.GetAsync("/auth/me")).StatusCode);
        await using (var connection = await factory.OpenAsync())
        {
            await using var assignment = new NpgsqlCommand("SELECT count(*) FROM empresa WHERE id_responsable=@user AND activo", connection);
            assignment.Parameters.AddWithValue("user", user.Id);
            Assert.Equal(1L, await assignment.ExecuteScalarAsync());
        }
        var options = await admin.GetFromJsonAsync<JsonElement>("/usuarios/opciones?q=nuevo"); Assert.Equal(0, options.GetProperty("totalCount").GetInt32());
        (await admin.PostAsync($"/usuarios/{user.Id}/desactivar", null)).EnsureSuccessStatusCode();
        (await admin.PostAsync($"/usuarios/{user.Id}/reactivar", null)).EnsureSuccessStatusCode();
        await SignIn(member, factory, "nuevo", "OtraFicticia123!");
        Assert.Equal(HttpStatusCode.OK, (await member.GetAsync("/auth/me")).StatusCode);
    }
    [Fact]
    public async Task ValidationUniquenessPaginationAndMinimalOptionsAreEnforced()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var client = factory.Client(); await SignIn(client, factory);
        (await client.PostAsJsonAsync("/usuarios", Account())).EnsureSuccessStatusCode();
        using var duplicate = await client.PostAsJsonAsync("/usuarios", Account(" NUEVO "));
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Contains("DUPLICATE_VALUE", await duplicate.Content.ReadAsStringAsync());
        foreach (var body in new[] { "{}", "{\"roles\":[]}", "{\"roles\":[\"OTRO\"]}", "{\"nombre\":null}", "{\"nombre\":\"   \"}", "{\"activo\":false}", "{\"id\":1}" })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PatchAsync($"/usuarios/{factory.SellerId}", new StringContent(body, Encoding.UTF8, "application/json"))).StatusCode);
        foreach (var password in new[] { "corta", new string('é', 37) })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"/usuarios/{factory.SellerId}/password", new { password })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/usuarios?page=0")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/usuarios?pageSize=101")).StatusCode);
        var page = await client.GetFromJsonAsync<JsonElement>("/usuarios?q=nuevo&pageSize=1");
        Assert.Equal(1, page.GetProperty("totalCount").GetInt32()); Assert.Equal(1, page.GetProperty("items").GetArrayLength());
        Assert.Equal(0, (await client.GetFromJsonAsync<JsonElement>("/usuarios?page=999")).GetProperty("items").GetArrayLength());
        Assert.Equal(1, (await client.GetFromJsonAsync<JsonElement>("/usuarios?q=perez")).GetProperty("totalCount").GetInt32());
        using var emailDuplicate = await client.PatchAsJsonAsync($"/usuarios/{factory.SellerId}", new { correo = " ADMIN@EXAMPLE.INVALID " });
        Assert.Equal(HttpStatusCode.Conflict, emailDuplicate.StatusCode);
        Assert.Contains("DUPLICATE_VALUE", await emailDuplicate.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/usuarios", Account("sinrol", []))).StatusCode);
        (await client.PutAsJsonAsync($"/usuarios/{factory.SellerId}/password", new { password = new string('é', 36) })).EnsureSuccessStatusCode();
        using var seller = factory.Client(); await SignIn(seller, factory, "seller", new string('é', 36));
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/usuarios")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/roles")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsJsonAsync("/usuarios", Account("intruso"))).StatusCode);
        var options = await seller.GetFromJsonAsync<JsonElement>("/usuarios/opciones?rol=VENDEDOR");
        Assert.All(options.GetProperty("items").EnumerateArray(), item => Assert.Equal(new[] { "apellido", "id", "nombre", "roles" }, item.EnumerateObject().Select(p => p.Name).Order().ToArray()));
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/usuarios/99999")).StatusCode);
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await client.DeleteAsync($"/usuarios/{factory.SellerId}")).StatusCode);
    }
}
