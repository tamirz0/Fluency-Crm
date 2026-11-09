using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ProfesorResumenTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();
    private static string[] Titles(JsonElement list) => list.EnumerateArray().Select(x => x.GetProperty("titulo").GetString()!).ToArray();

    [Fact]
    public async Task TeacherHomeSummarizesOnlyTheTeachersCoursesTodayTheWeekAndUpcomingExams()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var t1 = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe1");
        using var t2 = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe2");

        // Sin niveles ni cursos todo está en cero.
        var empty = await Json(await t1.GetAsync("/profesores/yo/resumen"));
        Assert.Equal((0, 0, 0), (empty.GetProperty("cantidadNiveles").GetInt32(), empty.GetProperty("cantidadCursos").GetInt32(), empty.GetProperty("cantidadAlumnos").GetInt32()));
        Assert.Equal(0, empty.GetProperty("clasesHoy").GetArrayLength());

        var one = await ClasesTests.SeedCourseAsync(factory, admin, t1, "profe1", 0);
        var two = await ClasesTests.SeedCourseAsync(factory, admin, t2, "profe2", 1);
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
        async Task LessonAsync(HttpClient client, int course, int daysFromToday, string title, string start, bool exam = false)
        {
            var response = await client.PostAsJsonAsync("/clases", new { titulo = title, idCurso = course, fecha = today.AddDays(daysFromToday).ToString("yyyy-MM-dd"), horaInicio = start + ":00", horaFin = start[..2] + ":59:00", esExamen = exam, temasExamen = (string?)null });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }
        await LessonAsync(t1, one.Course, 0, "Hoy tarde", "15:00");
        await LessonAsync(t1, one.Course, 0, "Hoy mañana", "09:00");
        await LessonAsync(t1, one.Course, -1, "Ayer", "09:00");
        await LessonAsync(t1, one.Course, 1, "Mañana", "09:00");
        await LessonAsync(t1, one.Course, 7, "En una semana", "09:00");
        await LessonAsync(t1, one.Course, 8, "Fuera de la semana", "09:00");
        await LessonAsync(t1, one.Course, 3, "Examen cercano", "11:00", exam: true);
        await LessonAsync(t1, one.Course, 40, "Examen lejano", "11:00", exam: true);
        await LessonAsync(t2, two.Course, 0, "De otro profesor", "09:00", exam: true);

        var summary = await Json(await t1.GetAsync("/profesores/yo/resumen"));
        Assert.Equal((1, 1, 2), (summary.GetProperty("cantidadNiveles").GetInt32(), summary.GetProperty("cantidadCursos").GetInt32(), summary.GetProperty("cantidadAlumnos").GetInt32()));
        Assert.Equal(["Hoy mañana", "Hoy tarde"], Titles(summary.GetProperty("clasesHoy")));
        Assert.Equal(["Mañana", "Examen cercano", "En una semana"], Titles(summary.GetProperty("proximasClases")));
        Assert.Equal(["Examen cercano"], Titles(summary.GetProperty("proximosExamenes")));

        // Solo el profesor tiene este inicio: el administrador usa el comercial y el vendedor no accede.
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.GetAsync("/profesores/yo/resumen")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync("/profesores/yo/resumen")).StatusCode);
        Assert.Equal(["De otro profesor"], Titles((await Json(await t2.GetAsync("/profesores/yo/resumen"))).GetProperty("proximosExamenes")));
    }
}
