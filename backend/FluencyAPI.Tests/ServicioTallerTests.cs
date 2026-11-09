using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ServicioTallerTests
{
    [Fact]
    public async Task ServiceIsNotAWorkshopByDefaultAndTheFlagCanBeSetAndChanged()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

        var plain = await admin.PostAsJsonAsync("/servicios", new { nombre = "Inglés B1", precioReferencia = 100 });
        Assert.Equal(HttpStatusCode.Created, plain.StatusCode);
        var plainBody = await Json(plain);
        Assert.False(plainBody.GetProperty("esTaller").GetBoolean());

        var workshop = await admin.PostAsJsonAsync("/servicios", new { nombre = "Taller de conversación", precioReferencia = 20, esTaller = true });
        Assert.Equal(HttpStatusCode.Created, workshop.StatusCode);
        var id = (await Json(workshop)).GetProperty("id").GetInt32();
        Assert.True((await Json(await admin.GetAsync($"/servicios/{id}"))).GetProperty("esTaller").GetBoolean());

        var off = await admin.PatchAsync($"/servicios/{id}", new StringContent("""{"esTaller":false}""", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, off.StatusCode);
        Assert.False((await Json(off)).GetProperty("esTaller").GetBoolean());
        var invalid = await admin.PatchAsync($"/servicios/{id}", new StringContent("""{"esTaller":null}""", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
    }
}
