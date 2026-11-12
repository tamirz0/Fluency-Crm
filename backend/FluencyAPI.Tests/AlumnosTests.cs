using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class AlumnosTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<int> NewOpportunityAsync(HttpClient client, int funnel, int service, int? company, int? contact)
    {
        var response = await client.PostAsJsonAsync("/oportunidades", new { idEmbudo = funnel, idServicio = service, idEmpresa = company, idContacto = contact });
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
        await WinAsync(admin, await NewOpportunityAsync(admin, seed.Funnel, seed.Service, null, seed.ContactA));
        Assert.Equal(0, await StudentsAsync(factory));

        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE servicio SET id_nivel={level} WHERE nombre='Servicio ficticio'");
        // Una empresa sin contacto nunca genera alumno.
        await WinAsync(admin, await NewOpportunityAsync(admin, seed.Funnel, seed.Service, seed.CompanyB, null));
        Assert.Equal(0, await StudentsAsync(factory));

        // Un contacto de empresa gana un servicio con nivel: es alumno de ese nivel y sin curso.
        var won = await NewOpportunityAsync(admin, seed.Funnel, seed.Service, seed.CompanyA, seed.ContactA);
        await WinAsync(admin, won);
        await using (var db = await factory.OpenAsync())
        {
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM alumno WHERE id_contacto={seed.ContactA} AND id_nivel={level} AND id_curso IS NULL AND activo"));
            Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM empresa e JOIN estado_cliente s ON s.id=e.id_estado WHERE s.descripcion='Cliente' AND e.razon_social='Empresa A'"));
        }

        // Ganar otra vez con el mismo contacto no duplica; reabrir no revierte.
        await WinAsync(admin, await NewOpportunityAsync(admin, seed.Funnel, seed.Service, null, seed.ContactA));
        var reopen = await admin.PostAsync($"/oportunidades/{won}/reabrir", new StringContent($$"""{"idEtapa":{{seed.FirstOpen}},"justificacion":"Error de carga"}""", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, reopen.StatusCode);
        Assert.Equal(1, await StudentsAsync(factory));

        // Un taller no crea alumno aunque el servicio tenga nivel (su tipo es Talleres).
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE servicio SET id_nivel={level} WHERE nombre='Otro servicio'");
        await WinAsync(admin, await NewOpportunityAsync(admin, otherFunnel, seed.OtherService, null, other));
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

    private static async Task<int> NewContactAsync(AuthApiFactory factory, HttpClient admin, string name, string last, string state)
    {
        var id = (await Json(await admin.PostAsJsonAsync("/contactos", new { nombre = name, apellido = last, correo = $"{name}.{last}@example.invalid".ToLowerInvariant() }))).GetProperty("id").GetInt32();
        await using var db = await factory.OpenAsync();
        await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE contacto SET id_estado=(SELECT id FROM estado_cliente WHERE descripcion='{state}') WHERE id={id}");
        return id;
    }

    [Fact]
    public async Task TheAdministratorEnrollsClientContactsAndLevelAndCourseAreEditedWithinEachRolesScope()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var t1 = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe1");
        using var t2 = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe2");
        int[] levels;
        await using (var db = await factory.OpenAsync())
            levels = await CommercialSchemaFixture.ScalarAsync<int[]>(db, "SELECT array_agg(id ORDER BY id) FROM nivel_ingles");
        Assert.Equal(HttpStatusCode.OK, (await t1.PutAsJsonAsync("/profesores/yo/niveles", new { idNiveles = new[] { levels[0], levels[1] } })).StatusCode);
        var ana = await NewContactAsync(factory, admin, "Ana", "Uno", "Cliente");
        var potential = await NewContactAsync(factory, admin, "Beto", "Dos", "Potencial");
        var carla = await NewContactAsync(factory, admin, "Carla", "Tres", "Cliente");

        // Candidatos: solo contactos Cliente que no son alumnos, y solo para el administrador.
        var candidates = await Json(await admin.GetAsync("/alumnos/candidatos"));
        Assert.Equal(["Tres", "Uno"], candidates.GetProperty("items").EnumerateArray().Select(x => x.GetProperty("apellido").GetString()!).ToArray());
        Assert.Equal(1, (await Json(await admin.GetAsync("/alumnos/candidatos?q=carla"))).GetProperty("totalCount").GetInt32());
        Assert.Equal(HttpStatusCode.Forbidden, (await t1.GetAsync("/alumnos/candidatos")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/alumnos/candidatos")).StatusCode);

        // Alta: Cliente vigente, sin alta previa, con nivel activo; el profesor y el vendedor no pueden.
        Assert.Equal(HttpStatusCode.Forbidden, (await t1.PostAsJsonAsync("/alumnos", new { idContacto = ana, idNivel = levels[0] })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsJsonAsync("/alumnos", new { idContacto = ana, idNivel = levels[0] })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync("/alumnos", new { idContacto = potential, idNivel = levels[0] })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/alumnos", new { idContacto = 999999, idNivel = levels[0] })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/alumnos", new { idContacto = ana, idNivel = 999999 })).StatusCode);
        var created = await admin.PostAsJsonAsync("/alumnos", new { idContacto = ana, idNivel = levels[0] });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var anaStudent = (await Json(created)).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync("/alumnos", new { idContacto = ana, idNivel = levels[0] })).StatusCode);
        Assert.Equal(1, (await Json(await admin.GetAsync("/alumnos/candidatos"))).GetProperty("totalCount").GetInt32());

        // Con curso: debe ser del mismo nivel.
        var course = (await Json(await t1.PostAsJsonAsync("/cursos", new { nombre = "A1 mañana", idNivel = levels[0] }))).GetProperty("curso").GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync("/alumnos", new { idContacto = carla, idNivel = levels[1], idCurso = course })).StatusCode);
        var withCourse = await admin.PostAsJsonAsync("/alumnos", new { idContacto = carla, idNivel = levels[0], idCurso = course });
        Assert.Equal(HttpStatusCode.Created, withCourse.StatusCode);
        var carlaStudent = (await Json(withCourse)).GetProperty("id").GetInt32();
        Assert.Equal(course, (await Json(await admin.GetAsync($"/alumnos/{carlaStudent}"))).GetProperty("curso").GetProperty("id").GetInt32());

        // Nivel: el profesor solo entre sus niveles; si el curso es de otro nivel el alumno queda sin curso.
        var up = await t1.PutAsJsonAsync($"/alumnos/{anaStudent}/nivel", new { idNivel = levels[1] });
        Assert.Equal(HttpStatusCode.OK, up.StatusCode);
        Assert.Equal(levels[1], (await Json(up)).GetProperty("nivel").GetProperty("id").GetInt32());
        Assert.Equal(HttpStatusCode.Conflict, (await t1.PutAsJsonAsync($"/alumnos/{anaStudent}/nivel", new { idNivel = levels[2] })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync($"/alumnos/{anaStudent}/nivel", new { idNivel = 999999 })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.PutAsJsonAsync($"/alumnos/{anaStudent}/nivel", new { idNivel = levels[0] })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await t2.PutAsJsonAsync($"/alumnos/{anaStudent}/nivel", new { idNivel = levels[0] })).StatusCode);
        var promoted = await admin.PutAsJsonAsync($"/alumnos/{carlaStudent}/nivel", new { idNivel = levels[1] });
        Assert.Equal(HttpStatusCode.OK, promoted.StatusCode);
        Assert.Equal(JsonValueKind.Null, (await Json(promoted)).GetProperty("curso").ValueKind);

        // Curso: cambiar a uno del nivel actual, quitar, y rechazar otro nivel, inexistente o ajeno.
        var next = (await Json(await t1.PostAsJsonAsync("/cursos", new { nombre = "A2 tarde", idNivel = levels[1] }))).GetProperty("curso").GetProperty("id").GetInt32();
        var assigned = await t1.PutAsJsonAsync($"/alumnos/{anaStudent}/curso", new { idCurso = next });
        Assert.Equal(HttpStatusCode.OK, assigned.StatusCode);
        Assert.Equal(next, (await Json(assigned)).GetProperty("curso").GetProperty("id").GetInt32());
        Assert.Equal(HttpStatusCode.Conflict, (await t1.PutAsJsonAsync($"/alumnos/{anaStudent}/curso", new { idCurso = course })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await t1.PutAsJsonAsync($"/alumnos/{anaStudent}/curso", new { idCurso = 999999 })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.PutAsJsonAsync($"/alumnos/{anaStudent}/curso", new { idCurso = next })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await t2.PutAsJsonAsync($"/alumnos/{anaStudent}/curso", new { idCurso = next })).StatusCode);
        var removed = await admin.PutAsJsonAsync($"/alumnos/{anaStudent}/curso", new { idCurso = (int?)null });
        Assert.Equal(HttpStatusCode.OK, removed.StatusCode);
        Assert.Equal(JsonValueKind.Null, (await Json(removed)).GetProperty("curso").ValueKind);
        Assert.Equal(0, (await Json(await admin.GetAsync($"/cursos/{next}"))).GetProperty("curso").GetProperty("cantidadAlumnos").GetInt32());
    }
}
