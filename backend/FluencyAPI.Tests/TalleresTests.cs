using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class TalleresTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    [Fact]
    public async Task WorkshopsAreSingleDateAndOnlyStudentsOrClientsWhoBoughtItCanEnrollWithTheirCount()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var teacher = await ProfesorAccesoTests.TeacherAsync(factory, admin, "profe1");
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int workshopService, workshopFunnel, plainService;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "UPDATE servicio SET es_taller=true WHERE nombre='Otro servicio'");
            workshopService = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM servicio WHERE nombre='Otro servicio'");
            plainService = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM servicio WHERE nombre='Servicio ficticio'");
            workshopFunnel = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM embudo WHERE nombre='Otro embudo'");
        }

        // El profesor solo ve servicios de taller al crear, aunque no accede al listado de servicios.
        Assert.Equal(HttpStatusCode.Forbidden, (await teacher.GetAsync("/servicios")).StatusCode);
        var options = await Json(await teacher.GetAsync("/talleres/servicios"));
        Assert.Equal(["Otro servicio"], options.EnumerateArray().Select(x => x.GetProperty("descripcion").GetString()!).ToArray());
        object Workshop(int service, string start = "18:00:00", string end = "19:30:00", string day = "2026-11-20") => new { titulo = "Taller de conversación", idServicio = service, fecha = day, horaInicio = start, horaFin = end };
        Assert.Equal(HttpStatusCode.BadRequest, (await teacher.PostAsJsonAsync("/talleres", Workshop(plainService))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await teacher.PostAsJsonAsync("/talleres", Workshop(workshopService, "19:00:00", "18:00:00"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsJsonAsync("/talleres", Workshop(workshopService))).StatusCode);
        var created = await teacher.PostAsJsonAsync("/talleres", Workshop(workshopService));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var workshop = (await Json(created)).GetProperty("taller").GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/talleres", Workshop(workshopService, day: "2026-12-05"))).StatusCode);

        // Un contacto que ganó el taller pasa a Cliente y es candidato; un alumno también; un contacto cualquiera no.
        var bought = await admin.PostAsJsonAsync("/oportunidades", new { idEmbudo = workshopFunnel, idEmpresa = seed.CompanyA, idContacto = seed.ContactA });
        var opportunity = (await Json(bought)).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/oportunidades/{opportunity}/ganar", new StringContent("""{"fechaCierre":"2026-11-09","valor":1}""", Encoding.UTF8, "application/json"))).StatusCode);
        var student = await AlumnosTests.SeedStudentsAsync(factory, admin, ("Alicia", "Alumna", 0));
        var stranger = (await Json(await admin.PostAsJsonAsync("/contactos", new { nombre = "Ruben", apellido = "Ajeno", correo = "ruben@example.invalid" }))).GetProperty("id").GetInt32();
        int studentContact;
        await using (var db = await factory.OpenAsync())
            studentContact = await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id_contacto FROM alumno WHERE id={student[0]}");

        var candidates = await Json(await teacher.GetAsync($"/talleres/{workshop}/candidatos"));
        Assert.Equal(new[] { seed.ContactA, studentContact }.Order().ToArray(), candidates.EnumerateArray().Select(x => x.GetProperty("idContacto").GetInt32()).Order().ToArray());
        Assert.Equal(HttpStatusCode.Conflict, (await teacher.PostAsJsonAsync($"/talleres/{workshop}/inscripciones", new { idContacto = stranger })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync($"/talleres/{workshop}/candidatos")).StatusCode);

        var enrolled = await teacher.PostAsJsonAsync($"/talleres/{workshop}/inscripciones", new { idContacto = seed.ContactA });
        Assert.Equal(HttpStatusCode.OK, enrolled.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await teacher.PostAsJsonAsync($"/talleres/{workshop}/inscripciones", new { idContacto = seed.ContactA })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsJsonAsync($"/talleres/{workshop}/inscripciones", new { idContacto = studentContact })).StatusCode);
        var detail = await Json(await teacher.GetAsync($"/talleres/{workshop}"));
        Assert.Equal(2, detail.GetProperty("taller").GetProperty("cantidadInscriptos").GetInt32());
        var people = detail.GetProperty("inscriptos").EnumerateArray().ToArray();
        Assert.Equal(2, people.Length);
        Assert.False(people.Single(p => p.GetProperty("idContacto").GetInt32() == seed.ContactA).GetProperty("esAlumno").GetBoolean());
        Assert.True(people.Single(p => p.GetProperty("idContacto").GetInt32() == studentContact).GetProperty("esAlumno").GetBoolean());
        Assert.Equal(0, (await Json(await teacher.GetAsync($"/talleres/{workshop}/candidatos"))).GetArrayLength());

        // Ganar un taller no creó un alumno nuevo para ContactA; el listado por rango muestra ambos talleres y su cantidad.
        await using (var db = await factory.OpenAsync())
            Assert.Equal(0L, await CommercialSchemaFixture.ScalarAsync<long>(db, $"SELECT count(*) FROM alumno WHERE id_contacto={seed.ContactA}"));
        var month = await Json(await teacher.GetAsync("/talleres?desde=2026-11-01&hasta=2026-11-30"));
        Assert.Equal(1, month.GetArrayLength());
        Assert.Equal(2, month[0].GetProperty("cantidadInscriptos").GetInt32());
        Assert.Equal(2, (await Json(await admin.GetAsync("/talleres?desde=2026-11-01&hasta=2026-12-31"))).GetArrayLength());
        Assert.Equal(HttpStatusCode.BadRequest, (await teacher.GetAsync("/talleres?desde=2026-01-01&hasta=2026-12-31")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await teacher.GetAsync("/talleres/999999")).StatusCode);
    }
}
