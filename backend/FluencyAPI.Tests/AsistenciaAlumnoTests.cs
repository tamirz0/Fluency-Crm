using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class AsistenciaAlumnoTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    [Fact]
    public async Task AttendanceCountsPresentOverPastClassesOfTheCourseAndIsVisibleFromTheCommercialContactSheet()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var teacher = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe1");
        using var other = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe2");
        var one = await ClasesTests.SeedCourseAsync(factory, admin, teacher, "profe1", 0);
        var elsewhere = await AlumnosTests.SeedStudentsAsync(factory, admin, ("Zeta", "Ajeno", 3));
        var standalone = (await Json(await admin.PostAsJsonAsync("/contactos", new { nombre = "Sin", apellido = "Alumno", correo = "sin@example.invalid" }))).GetProperty("id").GetInt32();
        int contactOfFirst;
        await using (var db = await factory.OpenAsync())
            contactOfFirst = await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id_contacto FROM alumno WHERE id={one.Students[0]}");

        async Task<int> LessonAsync(string day, string title)
            => (await Json(await teacher.PostAsJsonAsync("/clases", new { titulo = title, idCurso = one.Course, fecha = day, horaInicio = "10:00:00", horaFin = "11:00:00", esExamen = false }))).GetProperty("clase").GetProperty("id").GetInt32();
        var first = await LessonAsync("2026-01-10", "Clase 1");
        var second = await LessonAsync("2026-01-11", "Clase 2");
        await LessonAsync("2099-01-01", "Clase futura");
        Assert.Equal(HttpStatusCode.OK, (await teacher.PutAsJsonAsync($"/clases/{first}/asistencia", new { items = new[] { new { idAlumno = one.Students[0], presente = true } } })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await teacher.PutAsJsonAsync($"/clases/{second}/asistencia", new { items = new[] { new { idAlumno = one.Students[0], presente = false } } })).StatusCode);

        // Presentes sobre las clases del curso dictadas hasta hoy; la futura no cuenta y lo no registrado es no asistido.
        var mine = await Json(await teacher.GetAsync($"/alumnos/{one.Students[0]}/asistencia"));
        Assert.Equal(1, mine.GetProperty("presentes").GetInt32());
        Assert.Equal(2, mine.GetProperty("clases").GetInt32());
        Assert.Equal(["Clase 2", "Clase 1"], mine.GetProperty("items").EnumerateArray().Select(x => x.GetProperty("titulo").GetString()!).ToArray());
        var unmarked = await Json(await teacher.GetAsync($"/alumnos/{one.Students[1]}/asistencia"));
        Assert.Equal((0, 2), (unmarked.GetProperty("presentes").GetInt32(), unmarked.GetProperty("clases").GetInt32()));
        Assert.All(unmarked.GetProperty("items").EnumerateArray(), x => Assert.Equal(JsonValueKind.Null, x.GetProperty("presente").ValueKind));

        // Un profesor ve la asistencia solo de alumnos de sus niveles; el vendedor la ve desde la ficha del contacto.
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/alumnos/{one.Students[0]}/asistencia")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await teacher.GetAsync($"/alumnos/{elsewhere[0]}/asistencia")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync($"/alumnos/{one.Students[0]}/asistencia")).StatusCode);
        var sheet = await Json(await seller.GetAsync($"/contactos/{contactOfFirst}/academico"));
        Assert.Equal((1, 2), (sheet.GetProperty("alumno").GetProperty("presentes").GetInt32(), sheet.GetProperty("alumno").GetProperty("clases").GetInt32()));
        Assert.Equal(JsonValueKind.Null, (await Json(await seller.GetAsync($"/contactos/{standalone}/academico"))).GetProperty("alumno").ValueKind);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync("/contactos/999999/academico")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await teacher.GetAsync($"/contactos/{contactOfFirst}/academico")).StatusCode);
    }
}
