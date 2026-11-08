using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Services.DTO;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class AuthTests
{
    private const string CookieName = "Fluency.Session";
    [Theory]
    [InlineData("GET", "/auth/csrf", HttpStatusCode.OK)]
    [InlineData("GET", "/auth/me", HttpStatusCode.Unauthorized)]
    [InlineData("POST", "/auth/login", HttpStatusCode.BadRequest)]
    public async Task AnonymousHttpAccessUsesSessionContract(string method, string path, HttpStatusCode status)
    {
        await using var factory = new ContractApiFactory(includeProbe: false);
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(new HttpMethod(method), path);
        if (method == "POST") request.Content = new StringContent("{}", Encoding.UTF8, "application/json");
        using var response = await client.SendAsync(request);
        Assert.Equal(status, response.StatusCode);
    }

    [Fact]
    public async Task LoginMeAndLogoutUseSessionCookieAndRenewedCsrf()
    {
        await using var factory = new AuthApiFactory();
        await factory.InitializeAsync();
        using var client = factory.Client();
        var anonymousToken = await Csrf(client);
        using var missing = await client.PostAsJsonAsync("/auth/login", new { username = "admin", password = factory.Password });
        Assert.Equal(HttpStatusCode.BadRequest, missing.StatusCode);
        Assert.False(HasSessionCookie(missing));

        using var login = await Login(client, factory, "  ADMIN  ", anonymousToken);
        login.EnsureSuccessStatusCode();
        Assert.True(login.Headers.CacheControl?.NoStore);
        var session = (await login.Content.ReadFromJsonAsync<SesionResponse>())!;
        Assert.Equal(factory.AdminId, session.Usuario.Id);
        Assert.Contains("ADMINISTRADOR", session.Usuario.Roles);
        Assert.Equal(7, session.Usuario.Permisos.Count);
        var cookie = SessionCookie(login);
        Assert.True(cookie.Contains("httponly", StringComparison.OrdinalIgnoreCase));
        Assert.True(cookie.Contains("samesite=lax", StringComparison.OrdinalIgnoreCase));
        Assert.True(cookie.Contains("path=/", StringComparison.OrdinalIgnoreCase));
        Assert.True(cookie.Contains("secure", StringComparison.OrdinalIgnoreCase));
        Assert.False(cookie.Contains("expires=", StringComparison.OrdinalIgnoreCase));
        Assert.False(cookie.Contains("max-age=", StringComparison.OrdinalIgnoreCase));
        Assert.False(cookie.Contains("domain=", StringComparison.OrdinalIgnoreCase));
        var options = factory.Services.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>()
            .Get(CookieAuthenticationDefaults.AuthenticationScheme);
        var ticket = options.TicketDataFormat.Unprotect(cookie.Split(';')[0][(CookieName.Length + 1)..])!;
        Assert.False(ticket.Properties.IsPersistent);
        Assert.Equal(TimeSpan.FromHours(8), ticket.Properties.ExpiresUtc - ticket.Properties.IssuedUtc);
        var responseBody = await login.Content.ReadAsStringAsync();
        Assert.False(responseBody.Contains("fingerprint", StringComparison.OrdinalIgnoreCase));
        Assert.False(responseBody.Contains("hash", StringComparison.OrdinalIgnoreCase));
        Assert.False(responseBody.Contains(factory.Password, StringComparison.Ordinal));

        using var me = await client.GetAsync("/auth/me");
        me.EnsureSuccessStatusCode();
        Assert.Equal(session.ExpiresAt.ToUnixTimeSeconds(),
            (await me.Content.ReadFromJsonAsync<SesionResponse>())!.ExpiresAt.ToUnixTimeSeconds());
        using var staleLogout = await Send(client, "/auth/logout", anonymousToken);
        Assert.Equal(HttpStatusCode.BadRequest, staleLogout.StatusCode);
        using var missingLogout = await client.PostAsync("/auth/logout", null);
        Assert.Equal(HttpStatusCode.BadRequest, missingLogout.StatusCode);
        using var stillLoggedIn = await client.GetAsync("/auth/me");
        stillLoggedIn.EnsureSuccessStatusCode();

        var authenticatedToken = await Csrf(client);
        using var logout = await Send(client, "/auth/logout", authenticatedToken);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.True(HasSessionCookie(logout));
        using var after = await client.GetAsync("/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, after.StatusCode);
        Assert.Null(after.Headers.Location);
        using var staleLogin = await Login(client, factory, "admin", authenticatedToken);
        Assert.Equal(HttpStatusCode.BadRequest, staleLogin.StatusCode);
        using var renewedLogin = await Login(client, factory, "admin", await Csrf(client));
        renewedLogin.EnsureSuccessStatusCode();
        await AssertUserCount(factory, 2);
    }

    [Fact]
    public async Task WrongUnknownAndInactiveCredentialsHaveSameGenericRejection()
    {
        await using var factory = new AuthApiFactory();
        await factory.InitializeAsync();
        await using (var connection = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(connection, "UPDATE usuario SET activo=false WHERE username='seller'");
        using var client = factory.Client();
        var csrf = await Csrf(client);
        foreach (var entry in new[] { ("admin", "incorrecta"), ("missing", factory.Password), ("seller", factory.Password) })
        {
            using var response = await Send(client, "/auth/login", csrf, new { username = entry.Item1, password = entry.Item2 });
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal("Usuario o contraseña incorrectos.", document.RootElement.GetProperty("title").GetString());
            Assert.False(HasSessionCookie(response));
        }
        await AssertUserCount(factory, 2);
    }

    [Theory]
    [InlineData("inactive")]
    [InlineData("password")]
    [InlineData("deleted")]
    [InlineData("no-roles")]
    public async Task ServerChangesInvalidateExistingSessionOnNextRequest(string change)
    {
        await using var factory = new AuthApiFactory();
        await factory.InitializeAsync();
        using var client = factory.Client();
        using var login = await Login(client, factory, "admin", await Csrf(client));
        login.EnsureSuccessStatusCode();
        await using (var connection = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(connection, change switch
            {
                "inactive" => "UPDATE usuario SET activo=false WHERE username='admin'",
                "password" => "UPDATE usuario SET password_hash='changed-fictitious-hash' WHERE username='admin'",
                "deleted" => "DELETE FROM usuario_rol WHERE id_usuario=(SELECT id FROM usuario WHERE username='admin'); DELETE FROM usuario WHERE username='admin'",
                _ => "DELETE FROM usuario_rol WHERE id_usuario=(SELECT id FROM usuario WHERE username='admin')"
            });
        using var response = await client.GetAsync("/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.True(HasSessionCookie(response));
    }

    [Fact]
    public async Task RolesAreRecalculatedAndActorCannotBeChosenInBody()
    {
        await using var factory = new AuthApiFactory();
        await factory.InitializeAsync();
        using var client = factory.Client();
        using var anonymous = await client.GetAsync("/auth-probe");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        using var login = await Login(client, factory, "seller", await Csrf(client));
        login.EnsureSuccessStatusCode();
        var csrf = await Csrf(client);
        using var denied = await Send(client, "/auth-probe/admin", csrf, new { descripcion = "prueba" });
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
        Assert.Null(denied.Headers.Location);
        Assert.Equal(0, factory.Services.GetRequiredService<AuthProbeState>().Writes);

        await using (var connection = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(connection, """
                INSERT INTO usuario_rol SELECT u.id,r.id FROM usuario u CROSS JOIN rol r
                WHERE u.username='seller' AND r.nombre='ADMINISTRADOR';
                UPDATE usuario SET nombre='Actualizado' WHERE username='seller';
                """);
        using var me = await client.GetAsync("/auth/me");
        var session = (await me.Content.ReadFromJsonAsync<SesionResponse>())!;
        Assert.Equal(new[] { "ADMINISTRADOR", "VENDEDOR" }, session.Usuario.Roles);
        Assert.Equal("Actualizado", session.Usuario.Nombre);
        Assert.False(HasSessionCookie(me));
        using var missingCsrf = await client.PostAsJsonAsync("/auth-probe/admin", new { descripcion = "prueba" });
        Assert.Equal(HttpStatusCode.BadRequest, missingCsrf.StatusCode);
        using var spoof = await Send(client, "/auth-probe/admin", csrf, new { descripcion = "prueba", idUsuario = factory.AdminId });
        Assert.Equal(HttpStatusCode.BadRequest, spoof.StatusCode);
        Assert.Equal(0, factory.Services.GetRequiredService<AuthProbeState>().Writes);
        using var allowed = await Send(client, "/auth-probe/admin", csrf, new { descripcion = "prueba" });
        allowed.EnsureSuccessStatusCode();
        using var body = JsonDocument.Parse(await allowed.Content.ReadAsStringAsync());
        Assert.Equal(factory.SellerId, body.RootElement.GetProperty("id").GetInt32());
        Assert.Equal(1, factory.Services.GetRequiredService<AuthProbeState>().Writes);
    }

    [Fact]
    public async Task ExpirationIsAbsoluteAndTamperedCookieIsRejected()
    {
        await using var factory = new AuthApiFactory();
        await factory.InitializeAsync();
        using var client = factory.Client();
        using var login = await Login(client, factory, "admin", await Csrf(client));
        login.EnsureSuccessStatusCode();
        var expires = (await login.Content.ReadFromJsonAsync<SesionResponse>())!.ExpiresAt;
        using var tamperedClient = factory.Client(cookies: false);
        tamperedClient.DefaultRequestHeaders.Add("Cookie", SessionCookie(login).Split(';')[0] + "X");
        using var tampered = await tamperedClient.GetAsync("/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, tampered.StatusCode);
        factory.Clock.Advance(TimeSpan.FromHours(4));
        using var middle = await client.GetAsync("/auth/me");
        middle.EnsureSuccessStatusCode();
        Assert.Equal(expires.ToUnixTimeSeconds(), (await middle.Content.ReadFromJsonAsync<SesionResponse>())!.ExpiresAt.ToUnixTimeSeconds());
        Assert.False(HasSessionCookie(middle));
        factory.Clock.Advance(TimeSpan.FromHours(4).Add(TimeSpan.FromSeconds(1)));
        using var expired = await client.GetAsync("/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, expired.StatusCode);
    }

    [Fact]
    public async Task LoginLimitsAllAttemptsAndDoesNotTrustForwardedIp()
    {
        await using var factory = new ContractApiFactory(includeProbe: false);
        using var client = factory.CreateClient();
        for (var attempt = 0; attempt < 10; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/auth/login")
            {
                Content = JsonContent.Create(new { username = "missing", password = "fictitious" })
            };
            request.Headers.Add("X-Forwarded-For", "192.0.2." + (attempt + 1));
            using var rejectedCsrf = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.BadRequest, rejectedCsrf.StatusCode);
        }
        using var limited = await client.PostAsJsonAsync("/auth/login", new { username = "missing", password = "fictitious" });
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.InRange(limited.Headers.RetryAfter!.Delta!.Value.TotalSeconds, 1, 60);
        using var document = JsonDocument.Parse(await limited.Content.ReadAsStringAsync());
        Assert.Equal("RATE_LIMITED", document.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task LegacyRegistrationIsNotMappedAndCannotCreateUsers()
    {
        await using var factory = new AuthApiFactory();
        await factory.InitializeAsync();
        using var client = factory.Client();
        using var login = await Login(client, factory, "admin", await Csrf(client));
        login.EnsureSuccessStatusCode();
        foreach (var path in new[] { "/Login/Register", "/Login/Login" })
        {
            using var response = await Send(client, path, await Csrf(client), new { username = "unexpected" });
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
        await AssertUserCount(factory, 2);
    }

    private static async Task<string> Csrf(HttpClient client)
    {
        using var response = await client.GetAsync("/auth/csrf");
        response.EnsureSuccessStatusCode();
        Assert.True(response.Headers.CacheControl?.NoStore);
        return (await response.Content.ReadFromJsonAsync<CsrfResponse>())!.RequestToken;
    }

    private static Task<HttpResponseMessage> Login(HttpClient client, AuthApiFactory factory, string username, string token) =>
        Send(client, "/auth/login", token, new { username, password = factory.Password });

    private static async Task<HttpResponseMessage> Send(HttpClient client, string path, string csrf, object? body = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path);
        request.Headers.Add("X-CSRF-TOKEN", csrf);
        if (body is not null) request.Content = JsonContent.Create(body);
        return await client.SendAsync(request);
    }

    private static bool HasSessionCookie(HttpResponseMessage response) => response.Headers.TryGetValues("Set-Cookie", out var values)
        && values.Any(value => value.StartsWith(CookieName + "=", StringComparison.Ordinal));

    private static string SessionCookie(HttpResponseMessage response) => response.Headers.GetValues("Set-Cookie")
        .Single(value => value.StartsWith(CookieName + "=", StringComparison.Ordinal));

    private static async Task AssertUserCount(AuthApiFactory factory, long expected)
    {
        await using var connection = await factory.OpenAsync();
        Assert.Equal(expected, await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario"));
    }
}
