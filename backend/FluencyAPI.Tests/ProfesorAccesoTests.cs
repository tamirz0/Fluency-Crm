using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

// Barrido: un usuario con solo el rol PROFESOR no puede leer ni modificar nada comercial, de configuración ni de cuentas.
public sealed class ProfesorAccesoTests
{
    internal static async Task<HttpClient> TeacherAsync(AuthApiFactory factory, HttpClient admin, string username = "profe")
    {
        var created = await admin.PostAsJsonAsync("/usuarios", new
        {
            nombre = "Paula", apellido = "Docente", correo = username + "@example.invalid", username,
            password = "Ficticia123!", roles = new[] { "PROFESOR" }
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var teacher = factory.Client();
        await UsuariosTests.SignIn(teacher, factory, username, "Ficticia123!");
        return teacher;
    }

    private static StringContent Body(string json = "{}") => new(json, Encoding.UTF8, "application/json");

    [Fact]
    public async Task TeacherCanSignInAndSeesOnlyAcademyPermissionButNoCommercialSurface()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        using var teacher = await TeacherAsync(factory, admin);

        var me = await teacher.GetFromJsonAsync<JsonElement>("/auth/me");
        var user = me.TryGetProperty("usuario", out var wrapped) ? wrapped : me;
        Assert.Equal(["PROFESOR"], user.GetProperty("roles").EnumerateArray().Select(r => r.GetString()!).ToArray());
        Assert.Equal(["GestionarAcademia"], user.GetProperty("permisos").EnumerateArray().Select(r => r.GetString()!).ToArray());

        var reads = new[]
        {
            "/empresas", $"/empresas/{seed.CompanyA}", $"/empresas/{seed.CompanyA}/historial-comercial",
            "/contactos", $"/contactos/{seed.ContactA}", $"/contactos/{seed.ContactA}/historial-comercial",
            "/oportunidades", "/oportunidades/1", "/oportunidades/1/historial-etapas", "/oportunidades/1/historial-comercial",
            $"/embudos/{seed.Funnel}/funnel", "/actividades", "/actividades/1",
            "/servicios", "/servicios/1", "/embudos", $"/embudos/{seed.Funnel}", $"/embudos/{seed.Funnel}/etapas", $"/etapas/{seed.FirstOpen}",
            "/catalogos/niveles-ingles", "/catalogos/niveles-ingles/opciones", "/catalogos/niveles-ingles/1",
            "/catalogos/tipos-actividad/opciones", "/estados-oportunidad",
            "/usuarios", "/usuarios/opciones", "/usuarios/1", "/roles", "/inicio/resumen"
        };
        foreach (var url in reads)
            Assert.True(HttpStatusCode.Forbidden == (await teacher.GetAsync(url)).StatusCode, "GET " + url);

        var writes = new (HttpMethod Method, string Url)[]
        {
            (HttpMethod.Post, "/empresas"), (HttpMethod.Patch, $"/empresas/{seed.CompanyA}"), (HttpMethod.Delete, $"/empresas/{seed.CompanyA}"),
            (HttpMethod.Post, "/contactos"), (HttpMethod.Patch, $"/contactos/{seed.ContactA}"), (HttpMethod.Delete, $"/contactos/{seed.ContactA}"),
            (HttpMethod.Post, "/oportunidades"), (HttpMethod.Patch, "/oportunidades/1"), (HttpMethod.Delete, "/oportunidades/1"),
            (HttpMethod.Post, "/oportunidades/1/ganar"), (HttpMethod.Post, "/oportunidades/1/perder"), (HttpMethod.Post, "/oportunidades/1/mover"),
            (HttpMethod.Post, "/oportunidades/1/reasignar"), (HttpMethod.Post, "/oportunidades/1/reabrir"),
            (HttpMethod.Post, "/actividades"), (HttpMethod.Patch, "/actividades/1"), (HttpMethod.Delete, "/actividades/1"),
            (HttpMethod.Post, "/servicios"), (HttpMethod.Patch, "/servicios/1"), (HttpMethod.Post, "/embudos"), (HttpMethod.Patch, $"/embudos/{seed.Funnel}"),
            (HttpMethod.Post, $"/embudos/{seed.Funnel}/etapas"), (HttpMethod.Post, "/catalogos/niveles-ingles"),
            (HttpMethod.Post, "/usuarios"), (HttpMethod.Patch, "/usuarios/1"), (HttpMethod.Put, "/usuarios/1/password")
        };
        foreach (var (method, url) in writes)
        {
            using var request = new HttpRequestMessage(method, url) { Content = Body() };
            Assert.True(HttpStatusCode.Forbidden == (await teacher.SendAsync(request)).StatusCode, method + " " + url);
        }

        // Nada cambió por las peticiones rechazadas.
        await using var db = await factory.OpenAsync();
        Assert.Equal(2L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM empresa WHERE activo"));
        Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM contacto WHERE activo"));
        Assert.Equal(3L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM usuario"));
    }

    [Fact]
    public async Task AdministratorKeepsAcademyPermissionAndOtherRolesDoNot()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        Assert.Contains("PROFESOR", (await admin.GetFromJsonAsync<JsonElement[]>("/roles"))!.Select(r => r.GetProperty("codigo").GetString()));
        await using var db = await factory.OpenAsync();
        Assert.Equal(["ADMINISTRADOR", "PROFESOR"], await CommercialSchemaFixture.ScalarAsync<string[]>(db, """
            SELECT array_agg(r.nombre ORDER BY r.nombre) FROM permiso_rol pr JOIN rol r ON r.id=pr.id_rol
            JOIN permiso p ON p.id=pr.id_permiso WHERE p.codigo='GestionarAcademia'
            """));
        Assert.Equal(HttpStatusCode.OK, (await seller.GetAsync("/empresas")).StatusCode);
    }
}
