using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class AlumnosTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<int> NewOpportunityAsync(HttpClient client, int funnel, int? company, int? contact)
    {
        var response = await client.PostAsJsonAsync("/oportunidades", new { idEmbudo = funnel, idEmpresa = company, idContacto = contact });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetInt32();
    }

    private static async Task WinAsync(HttpClient client, int id)
    {
        var response = await client.PostAsync($"/oportunidades/{id}/ganar", new StringContent("""{"fechaCierre":"2026-11-09","valor":1}""", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task<long> StudentsAsync(AuthApiFactory factory)
    {
        await using var db = await factory.OpenAsync();
        return await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM alumno");
    }

    [Fact]
    public async Task WinningCreatesAStudentOnlyForAContactWithALevelServiceThatIsNotAWorkshop()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        var other = (await Json(await admin.PostAsJsonAsync("/contactos", new { nombre = "Beto", apellido = "Segundo", correo = "beto@example.invalid" }))).GetProperty("id").GetInt32();
        int otherFunnel, level;
        await using (var db = await factory.OpenAsync())
        {
            otherFunnel = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM embudo WHERE nombre='Otro embudo'");
            level = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT min(id) FROM nivel_ingles");
        }

        // Servicio sin nivel: no hay alumno.
        await WinAsync(admin, await NewOpportunityAsync(admin, seed.Funnel, null, seed.ContactA));
        Assert.Equal(0, await StudentsAsync(factory));

        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE servicio SET id_nivel={level} WHERE nombre='Servicio ficticio'");
        // Una empresa sin contacto nunca genera alumno.
        await WinAsync(admin, await NewOpportunityAsync(admin, seed.Funnel, seed.CompanyB, null));
        Assert.Equal(0, await StudentsAsync(factory));

        // Un contacto de empresa gana un servicio con nivel: es alumno de ese nivel y sin curso.
        var won = await NewOpportunityAsync(admin, seed.Funnel, seed.CompanyA, seed.ContactA);
        await WinAsync(admin, won);
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM alumno WHERE id_contacto={seed.ContactA} AND id_nivel={level} AND id_curso IS NULL AND activo"));
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM empresa e JOIN estado_cliente s ON s.id=e.id_estado WHERE s.descripcion='Cliente' AND e.razon_social='Empresa A'"));
        }

        // Ganar otra vez con el mismo contacto no duplica; reabrir no revierte.
        await WinAsync(admin, await NewOpportunityAsync(admin, seed.Funnel, null, seed.ContactA));
        var reopen = await admin.PostAsync($"/oportunidades/{won}/reabrir", new StringContent($$"""{"idEtapa":{{seed.FirstOpen}},"justificacion":"Error de carga"}""", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, reopen.StatusCode);
        Assert.Equal(1, await StudentsAsync(factory));

        // Un taller no crea alumno aunque el servicio tenga nivel.
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE servicio SET es_taller=true, id_nivel={level} WHERE nombre='Otro servicio'");
        await WinAsync(admin, await NewOpportunityAsync(admin, otherFunnel, null, other));
        Assert.Equal(1, await StudentsAsync(factory));
    }

    internal static async Task<int[]> SeedStudentsAsync(AuthApiFactory factory, HttpClient admin, params (string Name, string Last, int LevelIndex)[] people)
    {
        var ids = new List<int>();
        await using var db = await factory.OpenAsync();
        var levels = await CommercialSchemaFixture.ScalarAsync<int[]>(db, "SELECT array_agg(id ORDER BY id) FROM nivel_ingles");
        foreach (var (name, last, levelIndex) in people)
        {
            var contact = (await Json(await admin.PostAsJsonAsync("/contactos", new { nombre = name, apellido = last, correo = $"{name}.{last}@example.invalid".ToLowerInvariant(), documento = "30" + (1000 + ids.Count) }))).GetProperty("id").GetInt32();
            ids.Add(await CommercialSchemaFixture.ScalarAsync<int>(db, $"INSERT INTO alumno(id_contacto,id_nivel) VALUES ({contact},{levels[levelIndex]}) RETURNING id"));
        }
        return [.. ids];
    }

    [Fact]
    public async Task StudentListAndDetailAreScopedToTheTeachersLevelsAndHiddenFromCommercialRoles()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var teacher = await ProfesorAccesoTests.TeacherAsync(factory, admin);
        var ids = await SeedStudentsAsync(factory, admin, ("Ana", "Zorro", 0), ("Beto", "Alvarez", 1), ("Carla", "Mora", 2));
        int[] levels;
        await using (var db = await factory.OpenAsync())
            levels = await CommercialSchemaFixture.ScalarAsync<int[]>(db, "SELECT array_agg(id ORDER BY id) FROM nivel_ingles");

        var all = await Json(await admin.GetAsync("/alumnos"));
        Assert.Equal(3, all.GetProperty("totalCount").GetInt32());
        Assert.Equal(["Alvarez", "Mora", "Zorro"], all.GetProperty("items").EnumerateArray().Select(x => x.GetProperty("apellido").GetString()!).ToArray());
        Assert.Equal(1, (await Json(await admin.GetAsync("/alumnos?q=zorro"))).GetProperty("totalCount").GetInt32());
        Assert.Equal(1, (await Json(await admin.GetAsync("/alumnos?q=301001"))).GetProperty("totalCount").GetInt32());
        Assert.Equal(1, (await Json(await admin.GetAsync($"/alumnos?idNivel={levels[1]}"))).GetProperty("totalCount").GetInt32());
        Assert.Equal(2, (await Json(await admin.GetAsync("/alumnos?page=2&pageSize=2"))).GetProperty("page").GetInt32());

        // Un profesor sin niveles no ve alumnos; con A1 y B1 ve solo esos.
        Assert.Equal(0, (await Json(await teacher.GetAsync("/alumnos"))).GetProperty("totalCount").GetInt32());
        Assert.Equal(HttpStatusCode.NotFound, (await teacher.GetAsync($"/alumnos/{ids[0]}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await teacher.PutAsJsonAsync("/profesores/yo/niveles", new { idNiveles = new[] { levels[0], levels[2] } })).StatusCode);
        var mine = await Json(await teacher.GetAsync("/alumnos"));
        Assert.Equal(["Mora", "Zorro"], mine.GetProperty("items").EnumerateArray().Select(x => x.GetProperty("apellido").GetString()!).ToArray());
        Assert.Equal(HttpStatusCode.OK, (await teacher.GetAsync($"/alumnos/{ids[0]}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await teacher.GetAsync($"/alumnos/{ids[1]}")).StatusCode);
        var detail = await Json(await teacher.GetAsync($"/alumnos/{ids[2]}"));
        Assert.Equal("Carla", detail.GetProperty("nombre").GetString());
        Assert.Equal(levels[2], detail.GetProperty("nivel").GetProperty("id").GetInt32());
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("curso").ValueKind);

        // Responsable y Vendedor no acceden a lo académico.
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/alumnos")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync($"/alumnos/{ids[0]}")).StatusCode);
    }
}
