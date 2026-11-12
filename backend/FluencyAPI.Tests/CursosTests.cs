using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class CursosTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    [Fact]
    public async Task CoursesFollowLevelTeacherAndOneCoursePerStudentRulesWithAllOrNothingAdds()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var t1 = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe1");
        using var t2 = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe2");
        var students = await AlumnosTests.SeedStudentsAsync(factory, admin, ("Ana", "Uno", 0), ("Beto", "Dos", 0), ("Carla", "Tres", 1), ("Dani", "Cuatro", 2));
        int[] levels; int teacher1, teacher2, sellerId;
        await using (var db = await factory.OpenAsync())
        {
            levels = await CommercialSchemaFixture.ScalarAsync<int[]>(db, "SELECT array_agg(id ORDER BY id) FROM nivel_ingles");
            teacher1 = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM usuario WHERE username='profe1'");
            teacher2 = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM usuario WHERE username='profe2'");
            sellerId = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM usuario WHERE username='seller'");
        }
        Assert.Equal(HttpStatusCode.OK, (await t1.PutAsJsonAsync("/profesores/yo/niveles", new { idNiveles = new[] { levels[0], levels[1] } })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await t2.PutAsJsonAsync("/profesores/yo/niveles", new { idNiveles = new[] { levels[2] } })).StatusCode);

        // El profesor solo abre cursos de sus niveles; sus alumnos opcionales deben ser de ese nivel.
        Assert.Equal(HttpStatusCode.Conflict, (await t1.PostAsJsonAsync("/cursos", new { nombre = "C1 tarde", idNivel = levels[2] })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await t1.PostAsJsonAsync("/cursos", new { nombre = "Ajeno", idNivel = levels[0], idProfesor = teacher2 })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await t1.PostAsJsonAsync("/cursos", new { nombre = "Mezcla", idNivel = levels[0], idAlumnos = new[] { students[0], students[2] } })).StatusCode);
        Assert.Equal(0, (await Json(await admin.GetAsync("/cursos"))).GetProperty("totalCount").GetInt32());

        var created = await t1.PostAsJsonAsync("/cursos", new { nombre = "A1 mañana", idNivel = levels[0], idAlumnos = new[] { students[0] } });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var body = await Json(created);
        var course = body.GetProperty("curso").GetProperty("id").GetInt32();
        Assert.Equal(1, body.GetProperty("curso").GetProperty("cantidadAlumnos").GetInt32());
        Assert.Equal(teacher1, body.GetProperty("curso").GetProperty("profesor").GetProperty("id").GetInt32());

        // Sumar: nivel distinto o alumno ya con curso rechazan todo el lote.
        Assert.Equal(HttpStatusCode.Conflict, (await t1.PostAsJsonAsync($"/cursos/{course}/alumnos", new { idAlumnos = new[] { students[2] } })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await t1.PostAsJsonAsync($"/cursos/{course}/alumnos", new { idAlumnos = new[] { students[1], students[0] } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await t1.PostAsJsonAsync($"/cursos/{course}/alumnos", new { idAlumnos = new[] { 999999 } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await t1.PostAsJsonAsync($"/cursos/{course}/alumnos", new { idAlumnos = Array.Empty<int>() })).StatusCode);
        Assert.Equal(1, (await Json(await t1.GetAsync($"/cursos/{course}"))).GetProperty("curso").GetProperty("cantidadAlumnos").GetInt32());
        var added = await t1.PostAsJsonAsync($"/cursos/{course}/alumnos", new { idAlumnos = new[] { students[1] } });
        Assert.Equal(HttpStatusCode.OK, added.StatusCode);
        Assert.Equal(["Dos", "Uno"], (await Json(added)).GetProperty("alumnos").EnumerateArray().Select(x => x.GetProperty("apellido").GetString()!).ToArray());
        Assert.Equal(1, (await Json(await t1.GetAsync($"/alumnos?sinCurso=true"))).GetProperty("totalCount").GetInt32());

        // Otro profesor no ve ni modifica cursos ajenos; el vendedor no accede.
        Assert.Equal(HttpStatusCode.NotFound, (await t2.GetAsync($"/cursos/{course}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await t2.PostAsJsonAsync($"/cursos/{course}/alumnos", new { idAlumnos = new[] { students[3] } })).StatusCode);
        Assert.Equal(0, (await Json(await t2.GetAsync("/cursos"))).GetProperty("totalCount").GetInt32());
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/cursos")).StatusCode);

        // El administrador elige profesor; debe ser un usuario con rol Profesor que trabaje con el nivel.
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/cursos", new { nombre = "Sin profe", idNivel = levels[2] })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/cursos", new { nombre = "Vendedor", idNivel = levels[2], idProfesor = sellerId })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync("/cursos", new { nombre = "Nivel ajeno", idNivel = levels[0], idProfesor = teacher2 })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/cursos", new { nombre = "B2 noche", idNivel = levels[2], idProfesor = teacher2, idAlumnos = new[] { students[3] } })).StatusCode);
        Assert.Equal(2, (await Json(await admin.GetAsync("/cursos"))).GetProperty("totalCount").GetInt32());
        Assert.Equal(1, (await Json(await admin.GetAsync($"/cursos?idProfesor={teacher2}"))).GetProperty("totalCount").GetInt32());

        // Listado de profesores: solo el administrador.
        var teachers = await Json(await admin.GetAsync("/profesores"));
        Assert.Equal(2, teachers.GetArrayLength());
        var first = teachers.EnumerateArray().Single(t => t.GetProperty("id").GetInt32() == teacher1);
        Assert.Equal(2, first.GetProperty("niveles").GetArrayLength());
        Assert.Equal(1, first.GetProperty("cantidadCursos").GetInt32());
        Assert.Equal(HttpStatusCode.Forbidden, (await t1.GetAsync("/profesores")).StatusCode);
    }

    [Fact]
    public async Task DeletingACourseLeavesItsStudentsWithoutCourseAndHidesIt()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var t1 = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe1");
        using var t2 = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe2");
        var students = await AlumnosTests.SeedStudentsAsync(factory, admin, ("Ana", "Uno", 0), ("Beto", "Dos", 0));
        int level;
        await using (var db = await factory.OpenAsync())
            level = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT min(id) FROM nivel_ingles");
        Assert.Equal(HttpStatusCode.OK, (await t1.PutAsJsonAsync("/profesores/yo/niveles", new { idNiveles = new[] { level } })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await t2.PutAsJsonAsync("/profesores/yo/niveles", new { idNiveles = new[] { level } })).StatusCode);
        var course = (await Json(await t1.PostAsJsonAsync("/cursos", new { nombre = "A1 mañana", idNivel = level, idAlumnos = students }))).GetProperty("curso").GetProperty("id").GetInt32();

        // Solo el dueño o el administrador; el vendedor no accede.
        Assert.Equal(HttpStatusCode.NotFound, (await t2.DeleteAsync($"/cursos/{course}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.DeleteAsync($"/cursos/{course}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteAsync("/cursos/999999")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await t1.DeleteAsync($"/cursos/{course}")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await t1.GetAsync($"/cursos/{course}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteAsync($"/cursos/{course}")).StatusCode);
        Assert.Equal(0, (await Json(await admin.GetAsync("/cursos"))).GetProperty("totalCount").GetInt32());
        // Siguen siendo alumnos, ahora sin curso y disponibles para otro.
        var list = await Json(await admin.GetAsync("/alumnos?sinCurso=true"));
        Assert.Equal(2, list.GetProperty("totalCount").GetInt32());
        Assert.All(list.GetProperty("items").EnumerateArray(), item => Assert.Equal(JsonValueKind.Null, item.GetProperty("curso").ValueKind));
    }
}
