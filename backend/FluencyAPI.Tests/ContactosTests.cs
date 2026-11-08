using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class ContactosTests
{
    private const string Estado = "SELECT id FROM estado_cliente WHERE activo AND descripcion<>'Potencial' ORDER BY id LIMIT 1";

    private static Task<HttpResponseMessage> Raw(HttpClient client, HttpMethod method, string url, string body)
        => client.SendAsync(new HttpRequestMessage(method, url) { Content = new StringContent(body, Encoding.UTF8, "application/json") });

    [Fact]
    public async Task AllRolesShareContactsWithDefaultsAndAtomicDifferentialPatch()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/contactos")).StatusCode);
        var created = await admin.PostAsJsonAsync("/contactos", new { nombre = "  Ana  ", apellido = "Pérez", correo = "ana@example.invalid", cargo = "Directora", idOrigen = 1 });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode); Assert.NotNull(created.Headers.Location);
        var item = await created.Content.ReadFromJsonAsync<JsonElement>(); var id = item.GetProperty("id").GetInt32();
        Assert.Equal(factory.AdminId, item.GetProperty("idResponsable").GetInt32());
        Assert.Equal("Potencial", item.GetProperty("estadoDescripcion").GetString());
        Assert.Equal("Ana", item.GetProperty("nombre").GetString());
        Assert.Equal(JsonValueKind.Null, item.GetProperty("idEmpresa").ValueKind);
        Assert.True(item.GetProperty("activo").GetBoolean());
        Assert.True(item.GetProperty("fechaCreacion").GetDateTime().ToUniversalTime() > DateTime.UtcNow.AddMinutes(-2));
        foreach (var role in new[] { "VENDEDOR", "RESPONSABLE_COMERCIAL" })
        {
            await using var db = await factory.OpenAsync();
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE usuario_rol SET id_rol=(SELECT id FROM rol WHERE nombre='{role}') WHERE id_usuario={factory.SellerId}");
            (await seller.GetAsync($"/contactos/{id}")).EnsureSuccessStatusCode();
            (await seller.PatchAsJsonAsync($"/contactos/{id}", new { telefono = role, idResponsable = factory.AdminId })).EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.Created, (await seller.PostAsJsonAsync("/contactos",
                new { nombre = role, apellido = "Propio", correo = "propio@example.invalid", idResponsable = factory.AdminId })).StatusCode);
        }
        int otherState;
        await using (var db = await factory.OpenAsync())
        {
            otherState = await CommercialSchemaFixture.ScalarAsync<int>(db, Estado);
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE usuario SET activo=false WHERE id={factory.AdminId}; UPDATE estado_cliente SET activo=false WHERE descripcion='Potencial'; UPDATE origen_comercial SET activo=false WHERE id=1");
        }
        var updated = await seller.PatchAsJsonAsync($"/contactos/{id}", new { cargo = (string?)null, observaciones = "Conservadas" });
        updated.EnsureSuccessStatusCode(); item = await updated.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, item.GetProperty("cargo").ValueKind);
        Assert.False(item.GetProperty("responsableActivo").GetBoolean());
        Assert.False(item.GetProperty("estadoActivo").GetBoolean());
        Assert.False(item.GetProperty("origenActivo").GetBoolean());
        // Keeping previously assigned inactive references is not selecting them again.
        (await seller.PatchAsJsonAsync($"/contactos/{id}", new { idResponsable = factory.AdminId, idEstado = item.GetProperty("idEstado").GetInt32(), idOrigen = 1 })).EnsureSuccessStatusCode();
        foreach (var body in new[] { "{}", "{\"nombre\":null}", "{\"apellido\":\" \"}", "{\"correo\":\"no-es-correo\"}", "{\"correo\":null}", "{\"idEstado\":null}", "{\"idResponsable\":null}",
            "{\"activo\":false}", "{\"idUsuario\":1}", "{\"fechaCreacion\":\"2020-01-01\"}", "{\"nombre\":\"No guardar\",\"idOrigen\":999999}", "{\"nombre\":\"No guardar\",\"idEmpresa\":999999}", "{\"idEmpresa\":-1}" })
            Assert.Equal(HttpStatusCode.BadRequest, (await Raw(seller, HttpMethod.Patch, $"/contactos/{id}", body)).StatusCode);
        item = await seller.GetFromJsonAsync<JsonElement>($"/contactos/{id}");
        Assert.Equal("Ana", item.GetProperty("nombre").GetString());
        Assert.Equal("Conservadas", item.GetProperty("observaciones").GetString());
        // No default state available: the client must pick one explicitly. Inactive responsible is rejected.
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.PostAsJsonAsync("/contactos", new { nombre = "Sin", apellido = "Default", correo = "sin@example.invalid" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.PostAsJsonAsync("/contactos", new { nombre = "Sin", apellido = "Resp", correo = "sin@example.invalid", idEstado = otherState, idResponsable = factory.AdminId })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await seller.PostAsJsonAsync("/contactos", new { nombre = "Sin", apellido = "Origen", correo = "sin@example.invalid", idEstado = otherState, idOrigen = 1 })).StatusCode);
        var own = await seller.PostAsJsonAsync("/contactos", new { nombre = "Con", apellido = "Estado", correo = "con@example.invalid", idEstado = otherState });
        Assert.Equal(HttpStatusCode.Created, own.StatusCode);
        Assert.Equal(factory.SellerId, (await own.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("idResponsable").GetInt32());
        foreach (var body in new[] { "{}", "{\"nombre\":\"A\",\"apellido\":\"B\"}", "{\"nombre\":\" \",\"apellido\":\"B\",\"correo\":\"a@example.invalid\"}",
            "{\"nombre\":\"A\",\"apellido\":\"B\",\"correo\":\"a@example.invalid\",\"activo\":false}", "{\"nombre\":\"A\",\"apellido\":\"B\",\"correo\":\"a@example.invalid\",\"autor\":1}",
            "{\"nombre\":\"A\",\"apellido\":\"B\",\"correo\":\"a@example.invalid\",\"idEstado\":null}", "{\"nombre\":\"A\",\"apellido\":\"B\",\"correo\":\"no-es-correo\"}" })
            Assert.Equal(HttpStatusCode.BadRequest, (await Raw(seller, HttpMethod.Post, "/contactos", body)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync("/contactos/999999")).StatusCode);
        await using (var db = await factory.OpenAsync()) await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE contacto SET activo=false WHERE id={id}");
        Assert.Equal(HttpStatusCode.NotFound, (await seller.GetAsync($"/contactos/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await seller.PatchAsJsonAsync($"/contactos/{id}", new { telefono = "No" })).StatusCode);
    }

    [Fact]
    public async Task ChangingOrRemovingTheCompanyOnlyChangesTheContactAndKeepsOpportunityRelations()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var client = factory.Client(); await UsuariosTests.SignIn(client, factory, "seller");
        int companyA, companyB, contactId;
        await using (var db = await factory.OpenAsync())
        {
            await SchemaTests.SeedContextAsync(db);
            companyA = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM empresa WHERE razon_social='Empresa A'");
            companyB = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM empresa WHERE razon_social='Empresa B'");
            contactId = await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id FROM contacto");
        }
        async Task AssertOpportunityIntactAsync()
        {
            await using var db = await factory.OpenAsync();
            Assert.Equal(companyA, await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id_empresa FROM oportunidad"));
            Assert.Equal(contactId, await CommercialSchemaFixture.ScalarAsync<int>(db, "SELECT id_contacto FROM oportunidad"));
        }
        // A -> B succeeds even though the contact has an opportunity, and the opportunity keeps company A.
        var moved = await client.PatchAsJsonAsync($"/contactos/{contactId}", new { idEmpresa = companyB });
        moved.EnsureSuccessStatusCode();
        Assert.Equal("Empresa B", (await moved.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("empresaRazonSocial").GetString());
        await AssertOpportunityIntactAsync();
        // Removing the company only unlinks the contact.
        var removed = await client.PatchAsJsonAsync($"/contactos/{contactId}", new { idEmpresa = (int?)null });
        removed.EnsureSuccessStatusCode();
        Assert.Equal(JsonValueKind.Null, (await removed.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("idEmpresa").ValueKind);
        await AssertOpportunityIntactAsync();
        // A company that was removed cannot be selected, but one already linked keeps its label when editing other fields.
        (await client.PatchAsJsonAsync($"/contactos/{contactId}", new { idEmpresa = companyA })).EnsureSuccessStatusCode();
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE empresa SET activo=false WHERE id={companyB}");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PatchAsJsonAsync($"/contactos/{contactId}", new { idEmpresa = companyB })).StatusCode);
        await using (var db = await factory.OpenAsync())
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE empresa SET activo=false WHERE id={companyA}");
        var kept = await client.PatchAsJsonAsync($"/contactos/{contactId}", new { cargo = "Compras" });
        kept.EnsureSuccessStatusCode();
        var item = await kept.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(companyA, item.GetProperty("idEmpresa").GetInt32());
        Assert.Equal("Empresa A", item.GetProperty("empresaRazonSocial").GetString());
        await AssertOpportunityIntactAsync();
    }

    [Fact]
    public async Task CombinesFiltersBeforeCountingSearchesCompanyAndPaginatesWithStableOrder()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var client = factory.Client(); await UsuariosTests.SignIn(client, factory, "seller");
        int state;
        await using (var db = await factory.OpenAsync()) state = await CommercialSchemaFixture.ScalarAsync<int>(db, Estado);
        async Task<int> Company(string name) => (await (await client.PostAsJsonAsync("/empresas", new { razonSocial = name })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var acme = await Company("Ácme S.A."); var beta = await Company("Beta SRL");
        async Task Contact(string first, string last, int company, int? responsible = null)
            => (await client.PostAsJsonAsync("/contactos", new { nombre = first, apellido = last, correo = $"{first}@example.invalid", idEmpresa = company, idEstado = state, idOrigen = 1, idResponsable = responsible ?? factory.AdminId })).EnsureSuccessStatusCode();
        await Contact("Ana", "Zeta", acme); await Contact("Ana", "Zeta", acme); await Contact("Beto", "Alvarez", acme);
        await Contact("Carla", "Otra", beta); await Contact("Dora", "Excluida", acme, factory.SellerId);
        var filter = $"/contactos?q=ACME&idEstado={state}&idOrigen=1&idResponsable={factory.AdminId}&idEmpresa={acme}&pageSize=2";
        var page1 = await client.GetFromJsonAsync<JsonElement>(filter);
        var page2 = await client.GetFromJsonAsync<JsonElement>(filter + "&page=2");
        Assert.Equal(3, page1.GetProperty("totalCount").GetInt32()); Assert.Equal(3, page2.GetProperty("totalCount").GetInt32());
        var items = page1.GetProperty("items").EnumerateArray().Concat(page2.GetProperty("items").EnumerateArray()).ToArray();
        Assert.Equal(new[] { "Alvarez", "Zeta", "Zeta" }, items.Select(x => x.GetProperty("apellido").GetString()).ToArray());
        var ids = items.Select(x => x.GetProperty("id").GetInt32()).ToArray();
        Assert.Equal(3, ids.Distinct().Count()); Assert.True(ids[1] < ids[2]);
        Assert.Empty((await client.GetFromJsonAsync<JsonElement>(filter + "&page=999")).GetProperty("items").EnumerateArray());
        foreach (var (text, expected) in new[] { ("beta", 1), ("ÁCME", 4), ("alvarez", 1), ("ÁLVAREZ", 1), ("ana zeta", 2), ("zeta ana", 2), ("carla@example", 1), ("inexistente", 0) })
            Assert.Equal(expected, (await client.GetFromJsonAsync<JsonElement>("/contactos?q=" + Uri.EscapeDataString(text))).GetProperty("totalCount").GetInt32());
        Assert.Equal(1, (await client.GetFromJsonAsync<JsonElement>($"/contactos?idEmpresa={beta}")).GetProperty("totalCount").GetInt32());
        foreach (var query in new[] { "page=0", "pageSize=101", "idEstado=0", "idOrigen=-1", "idEmpresa=-1", "idResponsable=no" })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/contactos?" + query)).StatusCode);
    }
}
