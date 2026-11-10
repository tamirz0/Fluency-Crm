using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

// Tipos de servicio (Clases, Talleres y los que agregue el administrador) y su regla de nivel.
public sealed class ServicioTallerTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();
    private static StringContent Body(string json) => new(json, Encoding.UTF8, "application/json");

    [Fact]
    public async Task BaseTypesAreSeededAndTheAdminCanAddMoreByName()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");

        var types = await Json(await seller.GetAsync("/servicios/tipos"));
        Assert.Equal(["Clases:True", "Talleres:False"], types.EnumerateArray().Select(t => $"{t.GetProperty("descripcion").GetString()}:{t.GetProperty("nivelObligatorio").GetBoolean()}").ToArray());

        Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsJsonAsync("/catalogos/tipos-servicio", new { descripcion = "Evaluaciones" })).StatusCode);
        var created = await admin.PostAsJsonAsync("/catalogos/tipos-servicio", new { descripcion = "Evaluaciones de nivel" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync("/catalogos/tipos-servicio", new { descripcion = "  evaluaciones DE nivel " })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/catalogos/tipos-servicio", new { nombre = "Con nombre" })).StatusCode);
        var custom = (await Json(created)).GetProperty("id").GetInt32();
        var all = await Json(await seller.GetAsync("/servicios/tipos"));
        Assert.Equal(3, all.GetArrayLength());
        Assert.False(all.EnumerateArray().Single(t => t.GetProperty("id").GetInt32() == custom).GetProperty("nivelObligatorio").GetBoolean());
    }

    [Fact]
    public async Task ClassesRequireALevelWhileWorkshopsAndOtherTypesAcceptItOptionallyAndEveryServiceNeedsAModality()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var custom = await EmbudosTests.Create(admin, "/catalogos/tipos-servicio", new { descripcion = "Evaluaciones de nivel" });

        object Service(int type, int? level, int? modality = 1, string name = "Servicio") => new { nombre = name, precioReferencia = 10, idTipoServicio = type, idNivel = level, idModalidad = modality };
        // Clases: nivel obligatorio.
        var noLevel = await admin.PostAsJsonAsync("/servicios", Service(EmbudosTests.ClassesType, null));
        Assert.Equal(HttpStatusCode.BadRequest, noLevel.StatusCode);
        var classes = await admin.PostAsJsonAsync("/servicios", Service(EmbudosTests.ClassesType, 1, 2, "Inglés B1"));
        Assert.Equal(HttpStatusCode.Created, classes.StatusCode);
        var body = await Json(classes);
        Assert.Equal("Clases", body.GetProperty("tipo").GetProperty("descripcion").GetString());
        Assert.True(body.GetProperty("tipo").GetProperty("nivelObligatorio").GetBoolean());
        var classId = body.GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PatchAsync($"/servicios/{classId}", Body("""{"idNivel":null}"""))).StatusCode);

        // Talleres y tipos propios: nivel opcional, con o sin él.
        foreach (var type in new[] { EmbudosTests.WorkshopsType, custom })
        {
            Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/servicios", Service(type, null, 1, $"Sin nivel {type}"))).StatusCode);
            var withLevel = await admin.PostAsJsonAsync("/servicios", Service(type, 2, 1, $"Con nivel {type}"));
            Assert.Equal(HttpStatusCode.Created, withLevel.StatusCode);
            var id = (await Json(withLevel)).GetProperty("id").GetInt32();
            Assert.Equal(HttpStatusCode.OK, (await admin.PatchAsync($"/servicios/{id}", Body("""{"idNivel":null}"""))).StatusCode);
        }

        // Tipo y modalidad son obligatorios y deben existir y estar activos.
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/servicios", new { nombre = "Sin tipo", precioReferencia = 1, idModalidad = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/servicios", new { nombre = "Sin modalidad", precioReferencia = 1, idTipoServicio = EmbudosTests.WorkshopsType })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/servicios", Service(999999, null))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PatchAsync($"/servicios/{classId}", Body("""{"idModalidad":null}"""))).StatusCode);
        (await admin.PostAsync($"/catalogos/tipos-servicio/{custom}/desactivar", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/servicios", Service(custom, null, 1, "Tipo inactivo"))).StatusCode);

        // El listado se filtra por tipo.
        var workshops = await Json(await admin.GetAsync($"/servicios?idTipoServicio={EmbudosTests.WorkshopsType}"));
        Assert.Equal(2, workshops.GetProperty("totalCount").GetInt32());
        Assert.All(workshops.GetProperty("items").EnumerateArray(), s => Assert.Equal("Talleres", s.GetProperty("tipo").GetProperty("descripcion").GetString()));
    }

    [Fact]
    public async Task AUsedServiceKeepsItsTypeButAnUnusedOneCanChangeIt()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var free = await EmbudosTests.ClassService(admin, "Libre");
        var used = await EmbudosTests.ClassService(admin, "Usado");
        await EmbudosTests.Create(admin, "/embudos", new { nombre = "Selección", tipos = new[] { new { idTipoServicio = EmbudosTests.ClassesType, idServicios = new[] { used } } } });

        Assert.Equal(HttpStatusCode.Conflict, (await admin.PatchAsync($"/servicios/{used}", Body($$"""{"idTipoServicio":{{EmbudosTests.WorkshopsType}}}"""))).StatusCode);
        var moved = await admin.PatchAsync($"/servicios/{free}", Body($$"""{"idTipoServicio":{{EmbudosTests.WorkshopsType}}}"""));
        Assert.Equal(HttpStatusCode.OK, moved.StatusCode);
        Assert.Equal("Talleres", (await Json(moved)).GetProperty("tipo").GetProperty("descripcion").GetString());
        // Cambiar a Clases exige el nivel final: el servicio libre ya lo tenía.
        Assert.Equal(HttpStatusCode.OK, (await admin.PatchAsync($"/servicios/{free}", Body($$"""{"idTipoServicio":{{EmbudosTests.ClassesType}}}"""))).StatusCode);
    }
}
