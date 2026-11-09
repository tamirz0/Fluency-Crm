using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ClasesTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    internal static async Task<(int Course, int[] Students, int Teacher)> SeedCourseAsync(AuthApiFactory factory, HttpClient admin, HttpClient teacher, string username, int levelIndex = 0)
    {
        int level, teacherId;
        await using (var db = await factory.OpenAsync())
        {
            level = (await CommercialSchemaFixture.ScalarAsync<int[]>(db, "SELECT array_agg(id ORDER BY id) FROM nivel_ingles"))[levelIndex];
            teacherId = await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id FROM usuario WHERE username='{username}'");
        }
        Assert.Equal(HttpStatusCode.OK, (await teacher.PutAsJsonAsync("/profesores/yo/niveles", new { idNiveles = new[] { level } })).StatusCode);
        var students = await AlumnosTests.SeedStudentsAsync(factory, admin, ($"Ana{username}", "Uno", levelIndex), ($"Beto{username}", "Dos", levelIndex));
        var created = await teacher.PostAsJsonAsync("/cursos", new { nombre = "Curso " + username, idNivel = level, idAlumnos = students });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        return ((await Json(created)).GetProperty("curso").GetProperty("id").GetInt32(), students, teacherId);
    }

    [Fact]
    public async Task ClassesAreCreatedListedAndScopedToTheTeachersCoursesWithAttendanceAndExamGrades()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var t1 = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe1");
        using var t2 = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe2");
        var one = await SeedCourseAsync(factory, admin, t1, "profe1", 0);
        var two = await SeedCourseAsync(factory, admin, t2, "profe2", 1);
        object Lesson(int course, string title = "Unidad 1", string start = "10:00:00", string end = "11:00:00", bool exam = false, string? topics = null, string day = "2026-11-10")
            => new { titulo = title, idCurso = course, fecha = day, horaInicio = start, horaFin = end, esExamen = exam, temasExamen = topics };

        Assert.Equal(HttpStatusCode.BadRequest, (await t1.PostAsJsonAsync("/clases", Lesson(one.Course, start: "12:00:00", end: "11:00:00"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await t1.PostAsJsonAsync("/clases", Lesson(one.Course, topics: "Temas sin examen"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await t1.PostAsJsonAsync("/clases", Lesson(two.Course))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsJsonAsync("/clases", Lesson(one.Course))).StatusCode);

        var created = await t1.PostAsJsonAsync("/clases", Lesson(one.Course));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var lessonId = (await Json(created)).GetProperty("clase").GetProperty("id").GetInt32();
        var exam = await t1.PostAsJsonAsync("/clases", Lesson(one.Course, "Examen parcial", "09:00:00", "10:30:00", true, "Unidades 1 a 3", "2026-11-12"));
        var examId = (await Json(exam)).GetProperty("clase").GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/clases", Lesson(two.Course, day: "2026-11-11"))).StatusCode);

        // Listado por rango: cada profesor ve solo lo suyo y el administrador todo, ordenado por fecha y hora.
        var mine = await Json(await t1.GetAsync("/clases?desde=2026-11-01&hasta=2026-11-30"));
        Assert.Equal(["Unidad 1", "Examen parcial"], mine.EnumerateArray().Select(x => x.GetProperty("titulo").GetString()!).ToArray());
        Assert.Equal(1, (await Json(await t2.GetAsync("/clases?desde=2026-11-01&hasta=2026-11-30"))).GetArrayLength());
        Assert.Equal(3, (await Json(await admin.GetAsync("/clases?desde=2026-11-01&hasta=2026-11-30"))).GetArrayLength());
        Assert.Equal(1, (await Json(await admin.GetAsync($"/clases?desde=2026-11-01&hasta=2026-11-30&idProfesor={two.Teacher}"))).GetArrayLength());
        Assert.Equal(0, (await Json(await t1.GetAsync("/clases?desde=2026-12-01&hasta=2026-12-31"))).GetArrayLength());
        Assert.Equal(HttpStatusCode.BadRequest, (await t1.GetAsync("/clases?desde=2026-01-01&hasta=2026-12-31")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/clases?desde=2026-11-01&hasta=2026-11-30")).StatusCode);

        // Detalle y asistencia: sin registrar al inicio; upsert; solo alumnos del curso; otro profesor no la ve.
        var detail = await Json(await t1.GetAsync($"/clases/{lessonId}"));
        Assert.Equal(2, detail.GetProperty("alumnos").GetArrayLength());
        Assert.All(detail.GetProperty("alumnos").EnumerateArray(), a => Assert.Equal(JsonValueKind.Null, a.GetProperty("presente").ValueKind));
        Assert.Equal(HttpStatusCode.NotFound, (await t2.GetAsync($"/clases/{lessonId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await t2.PutAsJsonAsync($"/clases/{lessonId}/asistencia", new { items = new[] { new { idAlumno = one.Students[0], presente = true } } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await t1.PutAsJsonAsync($"/clases/{lessonId}/asistencia", new { items = new[] { new { idAlumno = two.Students[0], presente = true } } })).StatusCode);
        var marked = await t1.PutAsJsonAsync($"/clases/{lessonId}/asistencia", new { items = new[] { new { idAlumno = one.Students[0], presente = true }, new { idAlumno = one.Students[1], presente = false } } });
        Assert.Equal(HttpStatusCode.OK, marked.StatusCode);
        Assert.Equal(new[] { false, true }, (await Json(marked)).GetProperty("alumnos").EnumerateArray().Select(a => a.GetProperty("presente").GetBoolean()).ToArray());
        var changed = await t1.PutAsJsonAsync($"/clases/{lessonId}/asistencia", new { items = new[] { new { idAlumno = one.Students[1], presente = true } } });
        Assert.Equal(new[] { true, true }, (await Json(changed)).GetProperty("alumnos").EnumerateArray().Select(a => a.GetProperty("presente").GetBoolean()).ToArray());

        // Notas: solo en exámenes, 0 a 10 con dos decimales; null borra.
        Assert.Equal(HttpStatusCode.Conflict, (await t1.PutAsJsonAsync($"/clases/{lessonId}/notas", new { items = new[] { new { idAlumno = one.Students[0], nota = 8 } } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await t1.PutAsJsonAsync($"/clases/{examId}/notas", new { items = new[] { new { idAlumno = one.Students[0], nota = 11 } } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await t1.PutAsJsonAsync($"/clases/{examId}/notas", new { items = new[] { new { idAlumno = one.Students[0], nota = 7.555 } } })).StatusCode);
        var graded = await t1.PutAsJsonAsync($"/clases/{examId}/notas", new { items = new[] { new { idAlumno = one.Students[0], nota = 8.5 }, new { idAlumno = one.Students[1], nota = 6.0 } } });
        Assert.Equal(HttpStatusCode.OK, graded.StatusCode);
        var body = await Json(graded);
        Assert.Equal("Unidades 1 a 3", body.GetProperty("clase").GetProperty("temasExamen").GetString());
        Assert.Equal([6m, 8.5m], body.GetProperty("alumnos").EnumerateArray().Select(a => a.GetProperty("nota").GetDecimal()).ToArray());
        var cleared = await t1.PutAsJsonAsync($"/clases/{examId}/notas", new { items = new[] { new { idAlumno = one.Students[1], nota = (decimal?)null } } });
        Assert.Equal(HttpStatusCode.OK, cleared.StatusCode);
        var clearedBody = await Json(cleared);
        Assert.Equal(JsonValueKind.Null, clearedBody.GetProperty("alumnos")[0].GetProperty("nota").ValueKind);
        // Alumnos por apellido: Dos (Beto) y Uno (Ana). La nota sin asistencia deja la asistencia sin registrar.
        Assert.Equal(JsonValueKind.Null, clearedBody.GetProperty("alumnos")[1].GetProperty("presente").ValueKind);
    }
}
