using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ProfesoresTests
{
    private static async Task<int[]> Selected(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("seleccionados").EnumerateArray().Select(x => x.GetInt32()).ToArray();
    }

    [Fact]
    public async Task TeacherDefinesOwnLevelsFromSessionAndCannotRemoveALevelWithCourses()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var teacher = await ProfesorAccesoTests.TeacherAsync(factory, admin);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();

        var initial = await teacher.GetFromJsonAsync<JsonElement>("/profesores/yo/niveles");
        Assert.Equal(6, initial.GetProperty("disponibles").GetArrayLength());
        Assert.Empty(initial.GetProperty("seleccionados").EnumerateArray());

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/profesores/yo/niveles")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/profesores/yo/niveles")).StatusCode);
        // El administrador tiene el permiso académico pero no es profesor: no tiene niveles propios.
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.GetAsync("/profesores/yo/niveles")).StatusCode);

        await using var db = await factory.OpenAsync();
        var levels = (await CommercialSchemaFixture.ScalarAsync<int[]>(db, "SELECT array_agg(id ORDER BY id) FROM nivel_ingles"))[..3];
        Assert.Equal(levels[..2], await Selected(await teacher.PutAsJsonAsync("/profesores/yo/niveles", new { idNiveles = levels[..2] })));
        Assert.Equal(levels[1..3], await Selected(await teacher.PutAsJsonAsync("/profesores/yo/niveles", new { idNiveles = levels[1..3] })));
        Assert.Equal(levels[1..3], await Selected(await teacher.GetAsync("/profesores/yo/niveles")));
        Assert.Equal(HttpStatusCode.BadRequest, (await teacher.PutAsJsonAsync("/profesores/yo/niveles", new { idNiveles = new[] { 0 } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await teacher.PutAsJsonAsync("/profesores/yo/niveles", new { })).StatusCode);
        Assert.Equal(levels[1..3], await Selected(await teacher.GetAsync("/profesores/yo/niveles")));

        await CommercialSchemaFixture.ExecuteAsync(db, $"INSERT INTO curso(nombre,id_nivel,id_profesor) SELECT 'Curso',{levels[1]},id FROM usuario WHERE username='profe'");
        var blocked = await teacher.PutAsJsonAsync("/profesores/yo/niveles", new { idNiveles = new[] { levels[2] } });
        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        Assert.Equal("BUSINESS_CONFLICT", (await blocked.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(levels[1..3], await Selected(await teacher.GetAsync("/profesores/yo/niveles")));
    }
}
