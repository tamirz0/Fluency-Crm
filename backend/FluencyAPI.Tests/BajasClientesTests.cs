using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class BajasClientesTests
{
    private static async Task<(string Code, string Title)> Conflict(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        return (problem.GetProperty("code").GetString()!, problem.GetProperty("title").GetString()!);
    }

    [Fact]
    public async Task ActiveRelationsBlockDefinitiveRemovalAndTheRemovalKeepsEveryReference()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        // Fixture mínimo propio: SeedContextAsync multiplica filas por cada usuario de AuthApiFactory.
        async Task<int> CreateAsync(string url, object body) => (await (await seller.PostAsJsonAsync(url, body)).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var companyA = await CreateAsync("/empresas", new { razonSocial = "Empresa A" });
        var companyB = await CreateAsync("/empresas", new { razonSocial = "Empresa B" });
        var contactId = await CreateAsync("/contactos", new { nombre = "Ana", apellido = "Prueba", correo = "ana@example.invalid", idEmpresa = companyA });
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"""
                INSERT INTO servicio(nombre,precio_referencia) VALUES ('Servicio ficticio',100.25);
                INSERT INTO embudo(nombre,id_servicio) SELECT 'Embudo ficticio',id FROM servicio;
                INSERT INTO etapa_comercial(id_embudo,id_estado,nombre,orden)
                SELECT b.id,e.id,CASE e.codigo WHEN 'ABIERTA' THEN 'Abierta' WHEN 'GANADA' THEN 'Ganada' ELSE 'Perdida' END,
                CASE e.codigo WHEN 'GANADA' THEN 1 WHEN 'PERDIDA' THEN 2 ELSE 3 END FROM embudo b CROSS JOIN estado_oportunidad e;
                INSERT INTO oportunidad(titulo,id_responsable,id_empresa,id_contacto,id_etapa,valor)
                SELECT 'Negociación',{factory.AdminId},{companyA},{contactId},id,100.25 FROM etapa_comercial WHERE nombre='Abierta'
                """);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.DeleteAsync($"/empresas/{companyA}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.DeleteAsync($"/contactos/{contactId}")).StatusCode);

        // A company with an active contact and an active opportunity reports both causes and changes nothing.
        var blocked = await Conflict(await seller.DeleteAsync($"/empresas/{companyA}"));
        Assert.Equal("BUSINESS_CONFLICT", blocked.Code);
        Assert.Contains("1 contacto activo y 1 oportunidad activa", blocked.Title);
        (await seller.GetAsync($"/empresas/{companyA}")).EnsureSuccessStatusCode();

        // Any active opportunity blocks the contact, also a won or lost one; an activity never does.
        foreach (var stage in new[] { "Ganada", "Perdida" })
        {
            await using var db = await factory.OpenAsync();
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE oportunidad SET id_etapa=(SELECT id FROM etapa_comercial WHERE nombre='{stage}'), fecha_cierre=now()");
            var closed = await Conflict(await seller.DeleteAsync($"/contactos/{contactId}"));
            Assert.Equal("BUSINESS_CONFLICT", closed.Code); Assert.Contains("1 oportunidad activa", closed.Title);
            (await seller.GetAsync($"/contactos/{contactId}")).EnsureSuccessStatusCode();
        }
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, """
                INSERT INTO actividad(id_tipo,id_usuario,id_empresa,id_contacto,fecha_hora,descripcion)
                SELECT (SELECT min(id) FROM tipo_actividad),id_responsable,id_empresa,id_contacto,now(),'Llamada' FROM oportunidad;
                UPDATE oportunidad SET activo=false
                """);

        // With only an inactive opportunity and an activity the contact can be removed; nothing else changes.
        Assert.Equal(HttpStatusCode.NoContent, (await seller.DeleteAsync($"/contactos/{contactId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync($"/contactos/{contactId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.DeleteAsync($"/contactos/{contactId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.PatchAsJsonAsync($"/contactos/{contactId}", new { cargo = "Compras" })).StatusCode);
        var list = await (await seller.GetAsync("/contactos")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, list.GetProperty("totalCount").GetInt32());
        await using (var db = await factory.OpenAsync())
        {
            Assert.False(await CommercialSchemaFixture.ScalarAsync<bool>(db, $"SELECT activo FROM contacto WHERE id={contactId}"));
            Assert.Equal(companyA, await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id_empresa FROM contacto WHERE id={contactId}"));
            Assert.Equal(contactId, await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id_contacto FROM oportunidad"));
            Assert.Equal(contactId, await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id_contacto FROM actividad"));
        }

        // The company no longer has active contacts or opportunities, so it can be removed without emptying its references.
        Assert.Equal(HttpStatusCode.NoContent, (await seller.DeleteAsync($"/empresas/{companyA}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync($"/empresas/{companyA}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.DeleteAsync($"/empresas/{companyA}")).StatusCode);
        await using (var db = await factory.OpenAsync())
        {
            Assert.False(await CommercialSchemaFixture.ScalarAsync<bool>(db, $"SELECT activo FROM empresa WHERE id={companyA}"));
            Assert.Equal("Empresa A", await CommercialSchemaFixture.ScalarAsync<string>(db, "SELECT e.razon_social FROM oportunidad o JOIN empresa e ON e.id=o.id_empresa"));
            Assert.Equal(companyA, await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT id_empresa FROM contacto WHERE id={contactId}"));
        }

        // A removed company is no longer selectable, and active contacts alone are reported with their count.
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.PostAsJsonAsync("/contactos", new { nombre = "Eva", apellido = "Paz", correo = "eva@example.invalid", idEmpresa = companyA })).StatusCode);
        for (var i = 1; i <= 2; i++)
            Assert.Equal(HttpStatusCode.Created, (await seller.PostAsJsonAsync("/contactos", new { nombre = $"Contacto{i}", apellido = "Paz", correo = $"c{i}@example.invalid", idEmpresa = companyB })).StatusCode);
        Assert.Contains("2 contactos activos", (await Conflict(await seller.DeleteAsync($"/empresas/{companyB}"))).Title);
        Assert.Equal(HttpStatusCode.Created, (await seller.PostAsJsonAsync("/empresas", new { razonSocial = "Sin relaciones" })).StatusCode);
    }

    [Fact]
    public async Task ARemovalRacingAnAssociationNeverLeavesAnInactiveCompanyWithActiveContacts()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        for (var round = 1; round <= 6; round++)
        {
            var created = await admin.PostAsJsonAsync("/empresas", new { razonSocial = $"Carrera {round}" });
            var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
            var removal = admin.DeleteAsync($"/empresas/{id}");
            var association = seller.PostAsJsonAsync("/contactos", new { nombre = "Ana", apellido = $"R{round}", correo = $"r{round}@example.invalid", idEmpresa = id });
            await Task.WhenAll(removal, association);
            Assert.Contains((await removal).StatusCode, new[] { HttpStatusCode.NoContent, HttpStatusCode.Conflict });
            Assert.Contains((await association).StatusCode, new[] { HttpStatusCode.Created, HttpStatusCode.BadRequest, HttpStatusCode.Conflict });
            Assert.False((await removal).StatusCode == HttpStatusCode.NoContent && (await association).StatusCode == HttpStatusCode.Created);
            await using var db = await factory.OpenAsync();
            Assert.Equal(0L, await CommercialSchemaFixture.ScalarAsync<long>(db,
                "SELECT count(*) FROM contacto c JOIN empresa e ON e.id=c.id_empresa WHERE c.activo AND NOT e.activo"));
        }
    }
}
