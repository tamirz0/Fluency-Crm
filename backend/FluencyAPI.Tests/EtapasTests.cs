using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Npgsql;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class EtapasTests
{
    [Fact]
    public async Task CreatingStageUnderMissingFunnelReturns404()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsJsonAsync("/embudos/99999/etapas", new { nombre = "Sin padre", orden = 3 })).StatusCode);
        await using var db = await factory.OpenAsync();
        Assert.Equal(0L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM etapa_comercial"));
        var stage = await CommercialSchemaFixture.ScalarAsync<int>(db, """
            WITH s AS (INSERT INTO servicio(nombre,precio_referencia) VALUES ('Fixture',0) RETURNING id),
                 b AS (INSERT INTO embudo(nombre,id_servicio) SELECT 'Fixture',id FROM s RETURNING id)
            INSERT INTO etapa_comercial(nombre,id_embudo,id_estado,orden)
            SELECT 'Abierta',b.id,e.id,3 FROM b CROSS JOIN estado_oportunidad e WHERE e.codigo='ABIERTA' RETURNING id
            """);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PatchAsJsonAsync($"/etapas/{stage}", new { nombre = "No guardar", idEmbudo = 99999 })).StatusCode);
        Assert.Equal("Abierta", (await admin.GetFromJsonAsync<JsonElement>($"/etapas/{stage}")).GetProperty("nombre").GetString());
    }
    [Fact]
    public async Task SerializableBajaRejectsConcurrentFixtureOpportunityCreation()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var service = await EmbudosTests.Create(admin, "/servicios", new { nombre = "CP07", precioReferencia = 0 });
        var funnel = await EmbudosTests.Create(admin, "/embudos", new { nombre = "Proceso", idServicio = service });
        var stage = await EmbudosTests.Create(admin, $"/embudos/{funnel}/etapas", new { nombre = "Abierta", orden = 3 });
        await using var db = await factory.OpenAsync();
        var company = await CommercialSchemaFixture.ScalarAsync<int>(db, $"INSERT INTO empresa(razon_social,id_estado,id_responsable) VALUES ('Carrera fixture',1,{factory.AdminId}) RETURNING id");
        await using var tx = await db.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        await using (var available = new NpgsqlCommand($"SELECT activo FROM etapa_comercial WHERE id={stage}", db, tx))
            Assert.True((bool)(await available.ExecuteScalarAsync())!);
        (await admin.PostAsync($"/etapas/{stage}/desactivar", null)).EnsureSuccessStatusCode();
        var error = await Assert.ThrowsAsync<PostgresException>(async () =>
        {
            await CommercialSchemaFixture.ExecuteAsync(db, $"INSERT INTO oportunidad(titulo,id_responsable,id_empresa,id_etapa,valor) VALUES ('Carrera fixture',{factory.AdminId},{company},{stage},0)", tx);
            await tx.CommitAsync();
        });
        Assert.Equal(PostgresErrorCodes.SerializationFailure, error.SqlState);
        await tx.RollbackAsync();
        Assert.Equal(0L, await CommercialSchemaFixture.ScalarAsync<long>(db, "SELECT count(*) FROM oportunidad"));
        Assert.False((await admin.GetFromJsonAsync<JsonElement>($"/etapas/{stage}")).GetProperty("activo").GetBoolean());
    }
    [Fact]
    public async Task HistoryLocksFunnelAndOpenActiveUsageBlocksBajaWithAdminOnlyWrites()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var service = await EmbudosTests.Create(admin, "/servicios", new { nombre = "CP07", precioReferencia = 0 });
        var funnel = await EmbudosTests.Create(admin, "/embudos", new { nombre = "Proceso", idServicio = service });
        var other = await EmbudosTests.Create(admin, "/embudos", new { nombre = "Otro", idServicio = service });
        var open = await EmbudosTests.Create(admin, $"/embudos/{funnel}/etapas", new { nombre = "Consulta", orden = 3 });
        var unused = await EmbudosTests.Create(admin, $"/embudos/{funnel}/etapas", new { nombre = "Sin uso", orden = 4 });
        (await admin.PatchAsJsonAsync($"/etapas/{unused}", new { idEmbudo = other, orden = 9 })).EnsureSuccessStatusCode();
        var opportunity = await EmbudosTests.Opportunity(factory, open);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/etapas/{open}/desactivar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PatchAsJsonAsync($"/etapas/{open}", new { nombre = "No guardar", idEmbudo = other })).StatusCode);
        await using (var db = await factory.OpenAsync())
        {
            var won = await CommercialSchemaFixture.ScalarAsync<int>(db, $"SELECT e.id FROM etapa_comercial e JOIN estado_oportunidad s ON s.id=e.id_estado WHERE e.id_embudo={funnel} AND s.codigo='GANADA'");
            await CommercialSchemaFixture.ExecuteAsync(db, $"INSERT INTO historial_etapas(id_oportunidad,id_etapa_anterior,id_nueva_etapa,id_usuario) VALUES ({opportunity},{open},{won},{factory.AdminId}); UPDATE oportunidad SET id_etapa={won},activo=false WHERE id={opportunity}");
        }
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PatchAsJsonAsync($"/etapas/{open}", new { idEmbudo = other })).StatusCode);
        (await admin.PatchAsJsonAsync($"/etapas/{open}", new { nombre = "Texto corregido", descripcion = " " })).EnsureSuccessStatusCode();
        (await admin.PostAsync($"/etapas/{open}/desactivar", null)).EnsureSuccessStatusCode();
        Assert.False((await admin.GetFromJsonAsync<JsonElement>($"/etapas/{open}")).GetProperty("activo").GetBoolean());
        using var seller = factory.Client(); await UsuariosTests.SignIn(seller, factory, "seller");
        using var anonymous = factory.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"/embudos/{funnel}/etapas")).StatusCode);
        foreach (var role in new[] { "VENDEDOR", "RESPONSABLE_COMERCIAL" })
        {
            await using var db = await factory.OpenAsync();
            await CommercialSchemaFixture.ExecuteAsync(db, $"UPDATE usuario_rol SET id_rol=(SELECT id FROM rol WHERE nombre='{role}') WHERE id_usuario={factory.SellerId}");
            Assert.Equal(HttpStatusCode.OK, (await seller.GetAsync($"/embudos/{funnel}/etapas")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await seller.GetAsync($"/embudos/{funnel}/etapas?activo=todos")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsJsonAsync($"/embudos/{funnel}/etapas", new { nombre = "No", orden = 12 })).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await seller.PatchAsJsonAsync($"/etapas/{open}", new { nombre = "No" })).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await seller.PutAsJsonAsync($"/embudos/{funnel}/orden-etapas", new { etapas = Array.Empty<object>() })).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await seller.PatchAsJsonAsync($"/embudos/{funnel}", new { nombre = "No" })).StatusCode);
            foreach (var action in new[] { "desactivar", "reactivar" })
            {
                Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsync($"/etapas/{open}/{action}", null)).StatusCode);
                Assert.Equal(HttpStatusCode.Forbidden, (await seller.PostAsync($"/embudos/{funnel}/{action}", null)).StatusCode);
            }
        }
    }

    [Fact]
    public async Task ConcurrentDuplicateOrderHasOneWinnerAndFinalIndexRejectsCompetingFinal()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var first = factory.Client(); await UsuariosTests.SignIn(first, factory);
        using var second = factory.Client(); await UsuariosTests.SignIn(second, factory);
        var service = await EmbudosTests.Create(first, "/servicios", new { nombre = "CP07", precioReferencia = 0 });
        var funnel = await EmbudosTests.Create(first, "/embudos", new { nombre = "Carrera", idServicio = service });
        var results = await Task.WhenAll(first.PostAsJsonAsync($"/embudos/{funnel}/etapas", new { nombre = "Primera", orden = 3 }), second.PostAsJsonAsync($"/embudos/{funnel}/etapas", new { nombre = "Segunda", orden = 3 }));
        Assert.Single(results, r => r.StatusCode == HttpStatusCode.Created);
        var conflict = Assert.Single(results, r => r.StatusCode == HttpStatusCode.Conflict);
        Assert.Contains((await conflict.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString(), new[] { "DUPLICATE_VALUE", "CONCURRENT_CHANGE" });
        await using var a = await factory.OpenAsync(); await using var b = await factory.OpenAsync();
        Assert.Equal(3L, await CommercialSchemaFixture.ScalarAsync<long>(a, $"SELECT count(*) FROM etapa_comercial WHERE id_embudo={funnel}"));
        var rawFunnel = await CommercialSchemaFixture.ScalarAsync<int>(a, $"INSERT INTO embudo(nombre,id_servicio) VALUES ('Solo fixture',{service}) RETURNING id");
        await using var ta = await a.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        await using var tb = await b.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        await CommercialSchemaFixture.ExecuteAsync(a, $"INSERT INTO etapa_comercial(nombre,id_embudo,id_estado,orden) SELECT 'Ganada A',{rawFunnel},id,1 FROM estado_oportunidad WHERE codigo='GANADA'", ta);
        var competing = CommercialSchemaFixture.ExecuteAsync(b, $"INSERT INTO etapa_comercial(nombre,id_embudo,id_estado,orden) SELECT 'Ganada B',{rawFunnel},id,2 FROM estado_oportunidad WHERE codigo='GANADA'", tb);
        await ta.CommitAsync();
        var error = await Assert.ThrowsAsync<PostgresException>(() => competing);
        Assert.Equal(PostgresErrorCodes.UniqueViolation, error.SqlState);
        await tb.RollbackAsync();
        Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(a, $"SELECT count(*) FROM etapa_comercial WHERE id_embudo={rawFunnel}"));
    }
    [Fact]
    public async Task ReordersAtomicallyAndReactivatesAtEndWithoutChangingFinals()
    {
        await using var factory = new AuthApiFactory(); await factory.InitializeAsync();
        using var admin = factory.Client(); await UsuariosTests.SignIn(admin, factory);
        var service = await EmbudosTests.Create(admin, "/servicios", new { nombre = "CP07", precioReferencia = 0 });
        var funnel = await EmbudosTests.Create(admin, "/embudos", new { nombre = "Proceso", idServicio = service });
        var stages = (await admin.GetFromJsonAsync<JsonElement>($"/embudos/{funnel}/etapas")).EnumerateArray().ToArray();
        Assert.Equal(2, stages.Length);
        var won = stages[0].GetProperty("id").GetInt32(); var lost = stages[1].GetProperty("id").GetInt32();
        var open = await EmbudosTests.Create(admin, $"/embudos/{funnel}/etapas", new { nombre = "Consulta", orden = 7 });
        (await admin.PutAsJsonAsync($"/embudos/{funnel}/orden-etapas", new { etapas = new[] { new { id = won, orden = 2 }, new { id = lost, orden = 1 }, new { id = open, orden = 7 } } })).EnsureSuccessStatusCode();
        Assert.Equal(2, (await admin.GetFromJsonAsync<JsonElement>($"/etapas/{won}")).GetProperty("orden").GetInt32());
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PatchAsJsonAsync($"/etapas/{open}", new { nombre = "No guardar", orden = 1 })).StatusCode);
        Assert.Equal("Consulta", (await admin.GetFromJsonAsync<JsonElement>($"/etapas/{open}")).GetProperty("nombre").GetString());
        foreach (var final in new[] { won, lost })
        {
            Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/etapas/{final}/desactivar", null)).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.PatchAsJsonAsync($"/etapas/{final}", new { idEstado = 1 })).StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, (await admin.PatchAsJsonAsync($"/etapas/{final}", new { idEmbudo = funnel })).StatusCode);
            (await admin.PatchAsJsonAsync($"/etapas/{final}", new { nombre = "Final editada" })).EnsureSuccessStatusCode();
        }
        (await admin.PostAsync($"/etapas/{open}/desactivar", null)).EnsureSuccessStatusCode();
        await EmbudosTests.Create(admin, $"/embudos/{funnel}/etapas", new { nombre = "Nueva", orden = 7 });
        (await admin.PostAsync($"/etapas/{open}/reactivar", null)).EnsureSuccessStatusCode();
        (await admin.PostAsync($"/etapas/{open}/reactivar", null)).EnsureSuccessStatusCode();
        Assert.Equal(8, (await admin.GetFromJsonAsync<JsonElement>($"/etapas/{open}")).GetProperty("orden").GetInt32());
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync($"/embudos/{funnel}/orden-etapas", new { etapas = new[] { new { id = won, orden = 4 }, new { id = won, orden = 5 } } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync($"/embudos/{funnel}/orden-etapas", new { etapas = new object?[] { null } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"/embudos/{funnel}/etapas", new { nombre = "No", orden = 12, idEstado = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"/embudos/{funnel}/etapas", new { nombre = "No" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PatchAsJsonAsync($"/etapas/{open}", new { activo = false })).StatusCode);
        var before = await admin.GetFromJsonAsync<JsonElement>($"/embudos/{funnel}/etapas");
        var secondFunnel = await EmbudosTests.Create(admin, "/embudos", new { nombre = "Otro", idServicio = service });
        await EmbudosTests.Create(admin, $"/embudos/{secondFunnel}/etapas", new { nombre = "Ocupada", orden = 99 });
        await using (var db = await factory.OpenAsync()) await CommercialSchemaFixture.ExecuteAsync(db, "CREATE UNIQUE INDEX fixture_orden_99 ON etapa_comercial(orden) WHERE orden=99");
        var positions = before.EnumerateArray().Select(s => new { id = s.GetProperty("id").GetInt32(), orden = s.GetProperty("id").GetInt32() == won ? 99 : s.GetProperty("orden").GetInt32() }).ToArray();
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PutAsJsonAsync($"/embudos/{funnel}/orden-etapas", new { etapas = positions })).StatusCode);
        Assert.Equal(before.GetRawText(), (await admin.GetFromJsonAsync<JsonElement>($"/embudos/{funnel}/etapas")).GetRawText());
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync("/EtapasComerciales/ListadoEtapasComerciales")).StatusCode);
    }
}
