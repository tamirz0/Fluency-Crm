using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ConsultaOportunidadesTests
{
    private static async Task<JsonElement> Json(HttpResponseMessage response) => await response.Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<int> CreateAsync(HttpClient client, object body)
    {
        var response = await client.PostAsJsonAsync("/oportunidades", body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetInt32();
    }

    private static int[] Ids(JsonElement items) => items.EnumerateArray().Select(i => i.GetProperty("id").GetInt32()).ToArray();

    [Fact]
    public async Task ListIsSharedFilteredBeforePagingAndStablyOrdered()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int otherFunnel, origin;
        await using (var db = await factory.OpenAsync())
        {
            await CommercialSchemaFixture.ExecuteAsync(db, "INSERT INTO origen_comercial(descripcion) VALUES ('Referido')");
            otherFunnel = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM embudo WHERE nombre='Otro embudo'");
            origin = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM origen_comercial WHERE descripcion='Referido'");
        }
        var first = await CreateAsync(admin, new { titulo = "Curso Inglés", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA, idResponsable = factory.SellerId, idOrigen = origin });
        var second = await CreateAsync(admin, new { idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyB });
        var third = await CreateAsync(seller, new { idEmbudo = otherFunnel, idServicio = seed.OtherService, idContacto = seed.ContactA });
        var closed = await CreateAsync(admin, new { titulo = "Cerrada", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var removed = await CreateAsync(admin, new { titulo = "Eliminada", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE oportunidad SET id_etapa={seed.Won}, fecha_cierre=now() WHERE id={closed}; UPDATE oportunidad SET activo=false WHERE id={removed}");

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/oportunidades")).StatusCode);
        async Task<JsonElement> List(string query = "") { var r = await seller.GetAsync("/oportunidades" + query); Assert.Equal(HttpStatusCode.OK, r.StatusCode); return await Json(r); }

        // Lectura compartida: el vendedor ve las ajenas y las cerradas, no la dada de baja; creación e ID descendentes.
        var all = await List();
        Assert.Equal(new[] { closed, third, second, first }, Ids(all.GetProperty("items")));
        Assert.Equal(4, all.GetProperty("totalCount").GetInt32());
        var byId = all.GetProperty("items").EnumerateArray().ToDictionary(i => i.GetProperty("id").GetInt32());
        Assert.False(byId[second].GetProperty("accionesPermitidas").GetProperty("editar").GetBoolean());
        Assert.True(byId[first].GetProperty("accionesPermitidas").GetProperty("editar").GetBoolean());
        Assert.Equal("Ana Prueba", byId[third].GetProperty("tituloVisible").GetString());
        Assert.Equal("GANADA", byId[closed].GetProperty("estado").GetString());

        // Paginación sobre el total filtrado, sin pérdidas ni duplicados.
        var page1 = await List("?page=1&pageSize=3"); var page2 = await List("?page=2&pageSize=3");
        Assert.Equal(4, page2.GetProperty("totalCount").GetInt32());
        Assert.Equal(new[] { closed, third, second }, Ids(page1.GetProperty("items")));
        Assert.Equal(new[] { first }, Ids(page2.GetProperty("items")));

        // Búsqueda (sin tildes ni mayúsculas) sobre título, empresa y nombre/apellido del contacto, antes de contar.
        Assert.Equal(new[] { first }, Ids((await List("?q=ingles")).GetProperty("items")));
        Assert.Equal(new[] { second }, Ids((await List("?q=EMPRESA%20B")).GetProperty("items")));
        Assert.Equal(new[] { third }, Ids((await List("?q=ana%20prueba")).GetProperty("items")));
        var searched = await List("?q=empresa%20a&pageSize=1");
        Assert.Equal(2, searched.GetProperty("totalCount").GetInt32());
        Assert.Single(searched.GetProperty("items").EnumerateArray());
        Assert.Equal(0, (await List("?q=inexistente")).GetProperty("totalCount").GetInt32());

        // Filtros individuales.
        Assert.Equal(new[] { first }, Ids((await List($"?idResponsable={factory.SellerId}&idEmpresa={seed.CompanyA}&estado=ABIERTA")).GetProperty("items")));
        Assert.Equal(new[] { third }, Ids((await List($"?idContacto={seed.ContactA}")).GetProperty("items")));
        Assert.Equal(new[] { third }, Ids((await List($"?idEmbudo={otherFunnel}&idEtapa={seed.OtherFunnelOpen}")).GetProperty("items")));
        Assert.Equal(new[] { first }, Ids((await List($"?idOrigen={origin}")).GetProperty("items")));
        Assert.Equal(new[] { closed }, Ids((await List("?estado=GANADA")).GetProperty("items")));
        Assert.Empty((await List("?estado=PERDIDA")).GetProperty("items").EnumerateArray());
        // Filtros incompatibles: conjunto vacío, nunca una mezcla.
        Assert.Equal(0, (await List($"?idEmbudo={seed.Funnel}&idEtapa={seed.OtherFunnelOpen}")).GetProperty("totalCount").GetInt32());
        Assert.Equal(0, (await List($"?estado=GANADA&idEtapa={seed.FirstOpen}")).GetProperty("totalCount").GetInt32());

        foreach (var invalid in new[] { "?estado=abierta", "?estado=X", "?page=0", "?pageSize=101", "?idEmpresa=0" })
            Assert.Equal(HttpStatusCode.BadRequest, (await seller.GetAsync("/oportunidades" + invalid)).StatusCode);
    }

    [Fact]
    public async Task StageHistoryIsReadOnlyOrderedAndPaged()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        var id = await CreateAsync(admin, new { titulo = "Con historia", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var removed = await CreateAsync(admin, new { titulo = "Eliminada", idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"""
                INSERT INTO historial_etapas(id_oportunidad,id_etapa_anterior,id_nueva_etapa,fecha_hora,id_usuario,observacion) VALUES
                ({id},{seed.FirstOpen},{seed.SecondOpen},'2030-01-01T00:00:00Z',{factory.SellerId},'misma hora A'),
                ({id},{seed.SecondOpen},{seed.FirstOpen},'2030-01-01T00:00:00Z',{factory.AdminId},'misma hora B');
                UPDATE oportunidad SET activo=false WHERE id={removed};
                """);

        // Un vendedor lee la historia ajena; el orden es fecha e ID ascendentes (empate resuelto por ID).
        var response = await seller.GetAsync($"/oportunidades/{id}/historial-etapas");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await Json(response);
        Assert.Equal(3, page.GetProperty("totalCount").GetInt32());
        var items = page.GetProperty("items").EnumerateArray().ToArray();
        Assert.Equal(JsonValueKind.Null, items[0].GetProperty("idEtapaAnterior").ValueKind);
        Assert.Equal("Primera", items[0].GetProperty("etapaNuevaNombre").GetString());
        Assert.Equal(factory.AdminId, items[0].GetProperty("idUsuario").GetInt32());
        Assert.Equal(new[] { "misma hora A", "misma hora B" }, items[1..].Select(i => i.GetProperty("observacion").GetString()).ToArray());
        Assert.Equal("Primera", items[1].GetProperty("etapaAnteriorNombre").GetString());
        Assert.Equal("Segunda", items[1].GetProperty("etapaNuevaNombre").GetString());
        Assert.Equal(factory.SellerId, items[1].GetProperty("idUsuario").GetInt32());

        var second = await Json(await seller.GetAsync($"/oportunidades/{id}/historial-etapas?page=2&pageSize=1"));
        Assert.Equal(3, second.GetProperty("totalCount").GetInt32());
        Assert.Equal("misma hora A", second.GetProperty("items")[0].GetProperty("observacion").GetString());

        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync("/oportunidades/999999/historial-etapas")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync($"/oportunidades/{removed}/historial-etapas")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.GetAsync($"/oportunidades/{id}/historial-etapas?pageSize=0")).StatusCode);
        // Sin endpoints de edición.
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await admin.PostAsJsonAsync($"/oportunidades/{id}/historial-etapas", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await admin.DeleteAsync($"/oportunidades/{id}/historial-etapas")).StatusCode);
    }

    [Fact]
    public async Task FunnelKeepsEmptyAndFinalColumnsAndForcesTheSellersOwnPortfolio()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        var seed = await AltaOportunidadTests.SeedAsync(factory, admin);
        int otherFunnel;
        await using (var db = await factory.OpenAsync())
            otherFunnel = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM embudo WHERE nombre='Otro embudo'");
        var mine = await CreateAsync(seller, new { idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var theirs = await CreateAsync(admin, new { idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyB });
        var closed = await CreateAsync(admin, new { idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA, idResponsable = factory.SellerId });
        var removed = await CreateAsync(admin, new { idEmbudo = seed.Funnel, idServicio = seed.Service, idEmpresa = seed.CompanyA });
        var elsewhere = await CreateAsync(admin, new { idEmbudo = otherFunnel, idServicio = seed.OtherService, idEmpresa = seed.CompanyA });
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE oportunidad SET id_etapa={seed.Won}, fecha_cierre=now() WHERE id={closed}; UPDATE oportunidad SET activo=false WHERE id={removed}");

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"/embudos/{seed.Funnel}/funnel")).StatusCode);
        async Task<JsonElement> Funnel(HttpClient client, string query = "", int? id = null)
        {
            var r = await client.GetAsync($"/embudos/{id ?? seed.Funnel}/funnel{query}"); Assert.Equal(HttpStatusCode.OK, r.StatusCode); return await Json(r);
        }
        static int[] Cards(JsonElement funnel, string stage) => Ids(funnel.GetProperty("etapas").EnumerateArray().Single(e => e.GetProperty("nombre").GetString() == stage).GetProperty("oportunidades"));

        // El superior ve todo el embudo: columnas vacías y finales incluidas, sin oportunidades de otro embudo ni dadas de baja.
        var all = await Funnel(admin);
        Assert.Equal(seed.Funnel, all.GetProperty("idEmbudo").GetInt32());
        Assert.True(all.GetProperty("activo").GetBoolean());
        Assert.Equal(new[] { "Ganada", "Perdida", "Primera", "Segunda" }, all.GetProperty("etapas").EnumerateArray().Select(e => e.GetProperty("nombre").GetString()!).Order().ToArray());
        Assert.Equal(new[] { theirs, mine }, Cards(all, "Primera"));
        Assert.Empty(Cards(all, "Segunda"));
        Assert.Equal(new[] { closed }, Cards(all, "Ganada"));
        Assert.Empty(Cards(all, "Perdida"));
        // Filtro opcional de responsable para superiores.
        var filtered = await Funnel(admin, $"?idResponsable={factory.SellerId}");
        Assert.Equal(new[] { mine }, Cards(filtered, "Primera"));
        Assert.Equal(new[] { closed }, Cards(filtered, "Ganada"));

        // El vendedor recibe siempre su cartera: pedir otra no la amplía ni la sustituye.
        foreach (var query in new[] { "", $"?idResponsable={factory.AdminId}", $"?idResponsable={factory.SellerId}" })
        {
            var own = await Funnel(seller, query);
            Assert.Equal(new[] { mine }, Cards(own, "Primera"));
            Assert.Equal(new[] { closed }, Cards(own, "Ganada"));
            Assert.Empty(Cards(own, "Segunda"));
        }
        // La tabla global sigue mostrando todas.
        Assert.Equal(4, (await Json(await seller.GetAsync("/oportunidades"))).GetProperty("totalCount").GetInt32());

        // Etapas dadas de baja desaparecen y un embudo inactivo se consulta explicando su situación.
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE etapa_comercial SET activo=false WHERE id={seed.SecondOpen}; UPDATE embudo SET activo=false WHERE id={seed.Funnel}");
        var inactive = await Funnel(admin);
        Assert.False(inactive.GetProperty("activo").GetBoolean());
        Assert.Equal(3, inactive.GetProperty("etapas").GetArrayLength());
        Assert.Equal(new[] { theirs, mine }, Cards(inactive, "Primera"));

        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync("/embudos/999999/funnel")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync($"/embudos/{seed.Funnel}/funnel?idResponsable=0")).StatusCode);
        Assert.Equal(new[] { elsewhere }, Cards(await Funnel(admin, id: otherFunnel), "Primera"));
    }
}
