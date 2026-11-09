using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class EdicionClasesPerfilTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();
    private static StringContent Raw(string json) => new(json, Encoding.UTF8, "application/json");

    private static object Lesson(int course, string start, string end, string day = "2026-11-10", string title = "Clase", bool exam = false, string? topics = null)
        => new { titulo = title, idCurso = course, fecha = day, horaInicio = start, horaFin = end, esExamen = exam, temasExamen = topics };
    private static object Edit(string start, string end, string day = "2026-11-10", string title = "Clase", bool exam = false, string? topics = null)
        => new { titulo = title, fecha = day, horaInicio = start, horaFin = end, esExamen = exam, temasExamen = topics };

    [Fact]
    public async Task ACourseCannotHaveOverlappingClassesButOtherCoursesOfTheSameLevelCan_AndClassesAreEditable()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var t1 = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe1");
        using var t2 = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe2");
        var one = await ClasesTests.SeedCourseAsync(factory, admin, t1, "profe1", 0);
        var two = await ClasesTests.SeedCourseAsync(factory, admin, t2, "profe2", 0);
        async Task<int> IdOf(HttpResponseMessage r) { Assert.Equal(HttpStatusCode.Created, r.StatusCode); return (await Json(r)).GetProperty("clase").GetProperty("id").GetInt32(); }

        var first = await IdOf(await t1.PostAsJsonAsync("/clases", Lesson(one.Course, "10:00:00", "11:00:00", title: "Primera")));
        Assert.Equal(HttpStatusCode.Conflict, (await t1.PostAsJsonAsync("/clases", Lesson(one.Course, "10:30:00", "11:30:00"))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await t1.PostAsJsonAsync("/clases", Lesson(one.Course, "09:00:00", "10:01:00"))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await t1.PostAsJsonAsync("/clases", Lesson(one.Course, "10:15:00", "10:45:00"))).StatusCode);
        // Horarios contiguos o de otro día no se pisan; otro curso del mismo nivel puede coincidir.
        var second = await IdOf(await t1.PostAsJsonAsync("/clases", Lesson(one.Course, "11:00:00", "12:00:00", title: "Segunda")));
        await IdOf(await t1.PostAsJsonAsync("/clases", Lesson(one.Course, "10:00:00", "11:00:00", day: "2026-11-11")));
        await IdOf(await t2.PostAsJsonAsync("/clases", Lesson(two.Course, "10:00:00", "11:00:00")));
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync("/clases", Lesson(two.Course, "10:30:00", "10:45:00"))).StatusCode);

        // Edición: título, horario y fecha; no puede pisar otra clase del curso, pero sí su propio horario.
        var edited = await t1.PutAsJsonAsync($"/clases/{first}", Edit("10:00:00", "10:30:00", title: "Primera (corregida)"));
        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        var clase = (await Json(edited)).GetProperty("clase");
        Assert.Equal("Primera (corregida)", clase.GetProperty("titulo").GetString());
        Assert.Equal("10:30:00", clase.GetProperty("horaFin").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await t1.PutAsJsonAsync($"/clases/{first}", Edit("10:00:00", "11:30:00"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await t1.PutAsJsonAsync($"/clases/{second}", Edit("11:00:00", "12:00:00", day: "2026-11-12"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await t1.PutAsJsonAsync($"/clases/{first}", Edit("12:00:00", "11:00:00"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await t1.PutAsJsonAsync($"/clases/{first}", Edit("10:00:00", "10:30:00", topics: "Sin examen"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await t2.PutAsJsonAsync($"/clases/{first}", Edit("10:00:00", "10:30:00"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.PutAsJsonAsync($"/clases/{first}", Edit("10:00:00", "10:30:00"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.PutAsJsonAsync($"/clases/{first}", Edit("10:00:00", "10:45:00", title: "Admin"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await t1.PutAsJsonAsync("/clases/999999", Edit("10:00:00", "10:30:00"))).StatusCode);

        // Convertir en examen con temas; con notas cargadas ya no puede dejar de serlo.
        var exam = await t1.PutAsJsonAsync($"/clases/{first}", Edit("10:00:00", "10:45:00", exam: true, topics: "Unidades 1 a 3"));
        Assert.True((await Json(exam)).GetProperty("clase").GetProperty("esExamen").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, (await t1.PutAsJsonAsync($"/clases/{first}/notas", new { items = new[] { new { idAlumno = one.Students[0], nota = 9.0 } } })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await t1.PutAsJsonAsync($"/clases/{first}", Edit("10:00:00", "10:45:00", exam: false))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await t1.PutAsJsonAsync($"/clases/{first}", Edit("10:00:00", "10:45:00", exam: true, topics: ""))).StatusCode);
    }

    [Fact]
    public async Task EveryUserEditsOwnProfileFromTheSessionAndAdministratorsEditTeacherLevels()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var teacher = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe1");
        using var anonymous = factory.Client();

        var updated = await seller.PatchAsync("/auth/me", Raw("""{"nombre":"Vera","apellido":"Nueva","correo":"vera@example.invalid"}"""));
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        var user = (await Json(updated)).GetProperty("usuario");
        Assert.Equal(("Vera", "Nueva", "vera@example.invalid"), (user.GetProperty("nombre").GetString(), user.GetProperty("apellido").GetString(), user.GetProperty("correo").GetString()));
        Assert.Equal("Vera", (await Json(await seller.GetAsync("/auth/me"))).GetProperty("usuario").GetProperty("nombre").GetString());
        Assert.Equal("seller", user.GetProperty("username").GetString());
        Assert.Equal(["VENDEDOR"], user.GetProperty("roles").EnumerateArray().Select(x => x.GetString()!).ToArray());

        // Un profesor también; el administrador ve el cambio en Usuarios. El rol y el estado no se pueden tocar desde aquí.
        Assert.Equal(HttpStatusCode.OK, (await teacher.PatchAsync("/auth/me", Raw("""{"apellido":"Docente Actualizada","username":"paula.docente"}"""))).StatusCode);
        var listed = await Json(await admin.GetAsync("/usuarios?q=paula.docente"));
        Assert.Equal(1, listed.GetProperty("totalCount").GetInt32());
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.PatchAsync("/auth/me", Raw("""{"roles":["ADMINISTRADOR"]}"""))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.PatchAsync("/auth/me", Raw("""{"activo":false}"""))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.PatchAsync("/auth/me", Raw("""{"nombre":"  "}"""))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.PatchAsync("/auth/me", Raw("""{"correo":"no-es-correo"}"""))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.PatchAsync("/auth/me", Raw("{}"))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await seller.PatchAsync("/auth/me", Raw("""{"username":"admin"}"""))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await seller.PatchAsync("/auth/me", Raw("""{"correo":"admin@example.invalid"}"""))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PatchAsync("/auth/me", Raw("""{"nombre":"X"}"""))).StatusCode);

        // El administrador define los niveles de un profesor; un profesor no puede hacerlo por otro y no se quita un nivel con cursos.
        int teacherId, adminId; int[] levels;
        await using (var db = await factory.OpenAsync())
        {
            teacherId = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM usuario WHERE username='paula.docente'");
            adminId = factory.AdminId;
            levels = await CommercialSchemaFixture.ScalarAsync<int[]>(db, "SELECT array_agg(id ORDER BY id) FROM nivel_ingles");
        }
        var set = await admin.PutAsJsonAsync($"/profesores/{teacherId}/niveles", new { idNiveles = new[] { levels[0], levels[1] } });
        Assert.Equal(HttpStatusCode.OK, set.StatusCode);
        Assert.Equal(new[] { levels[0], levels[1] }, (await Json(set)).GetProperty("seleccionados").EnumerateArray().Select(x => x.GetInt32()).ToArray());
        Assert.Equal(HttpStatusCode.Forbidden, (await teacher.PutAsJsonAsync($"/profesores/{teacherId}/niveles", new { idNiveles = new[] { levels[2] } })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.PutAsJsonAsync($"/profesores/{teacherId}/niveles", new { idNiveles = new[] { levels[2] } })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PutAsJsonAsync($"/profesores/{adminId}/niveles", new { idNiveles = new[] { levels[0] } })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await teacher.PostAsJsonAsync("/cursos", new { nombre = "Curso A1", idNivel = levels[0] })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PutAsJsonAsync($"/profesores/{teacherId}/niveles", new { idNiveles = new[] { levels[1] } })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.PutAsJsonAsync($"/profesores/{teacherId}/niveles", new { idNiveles = new[] { levels[0], levels[2] } })).StatusCode);
    }
}
