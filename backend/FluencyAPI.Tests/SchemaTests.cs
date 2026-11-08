using Npgsql;
using Xunit;
using static FluencyAPI.Tests.CommercialSchemaFixture;

namespace FluencyAPI.Tests;

public sealed class SchemaTests
{
    [Fact]
    public async Task CreatesCompleteSchemaAndCatalogsWithoutProductDemoData()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = await fixture.OpenAsync();
        Assert.Equal(21L, await ScalarAsync<long>(db,
            "SELECT count(*) FROM information_schema.tables WHERE table_schema=current_schema()"));
        Assert.Equal(new[] { "ABIERTA", "GANADA", "PERDIDA" },
            await ScalarAsync<string[]>(db, "SELECT array_agg(codigo ORDER BY codigo) FROM estado_oportunidad"));
        Assert.Equal(4L, await ScalarAsync<long>(db, "SELECT count(*) FROM estado_cliente WHERE activo"));
        Assert.Equal(9L, await ScalarAsync<long>(db, "SELECT count(*) FROM tipo_actividad WHERE activo"));
        Assert.Equal(6L, await ScalarAsync<long>(db, "SELECT count(*) FROM nivel_ingles WHERE activo"));
        Assert.Equal(3L, await ScalarAsync<long>(db, "SELECT count(*) FROM modalidad WHERE activo"));
        Assert.Equal(0L, await ScalarAsync<long>(db,
            "SELECT (SELECT count(*) FROM usuario)+(SELECT count(*) FROM rol)+(SELECT count(*) FROM permiso)+(SELECT count(*) FROM servicio)+(SELECT count(*) FROM embudo)"));
        Assert.Equal(0L, await ScalarAsync<long>(db, """
            SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema()
            AND table_name='oportunidad' AND column_name IN ('id_embudo','id_servicio','id_estado')
            """));
        Assert.Equal(2L, await ScalarAsync<long>(db, """
            SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema()
            AND ((table_name='servicio' AND column_name='precio_referencia') OR (table_name='oportunidad' AND column_name='valor'))
            AND data_type='numeric' AND numeric_precision=12 AND numeric_scale=2 AND is_nullable='NO'
            """));
        Assert.Equal("date", await ScalarAsync<string>(db, """
            SELECT data_type FROM information_schema.columns WHERE table_schema=current_schema()
            AND table_name='oportunidad' AND column_name='fecha_estimada_cierre'
            """));
        Assert.Equal(7L, await ScalarAsync<long>(db, """
            SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema()
            AND data_type='timestamp with time zone'
            """));
        Assert.Equal(0L, await ScalarAsync<long>(db, """
            SELECT count(*) FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_namespace n ON n.oid=c.connamespace
            WHERE n.nspname=current_schema() AND c.contype='f' AND (c.confdeltype <> 'r' OR c.confupdtype <> 'r')
            """));
    }

    [Fact]
    public async Task RejectsExistingTablesAndMissingExplicitTargetWithoutChangingData()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync(commercial: false);
        await using var db = await fixture.OpenAsync();
        await ExecuteAsync(db, "INSERT INTO probe VALUES ('00000000-0000-0000-0000-000000000004')");
        await using (var transaction = await db.BeginTransactionAsync())
        {
            await SetTargetAsync(db, transaction);
            var error = await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(db, Script("esquema"), transaction));
            Assert.Equal(PostgresErrorCodes.RaiseException, error.SqlState);
            await transaction.RollbackAsync();
        }
        await using (var transaction = await db.BeginTransactionAsync())
        {
            await ExecuteAsync(db, "DROP TABLE probe RESTRICT", transaction);
            var error = await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(db, Script("esquema"), transaction));
            Assert.Equal(PostgresErrorCodes.RaiseException, error.SqlState);
            await transaction.RollbackAsync();
        }
        await using (var transaction = await db.BeginTransactionAsync())
        {
            await ExecuteAsync(db, "DROP TABLE probe RESTRICT; SELECT set_config('fluency.target_database','otra_base_ficticia',true)", transaction);
            var error = await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(db, Script("esquema"), transaction));
            Assert.Equal(PostgresErrorCodes.RaiseException, error.SqlState);
            await transaction.RollbackAsync();
        }
        Assert.Equal(1L, await ScalarAsync<long>(db, "SELECT count(*) FROM probe"));
        Assert.Equal(1L, await ScalarAsync<long>(db,
            "SELECT count(*) FROM information_schema.tables WHERE table_schema=current_schema()"));
    }

    [Fact]
    public async Task ReexecutionOfSchemaOrSeedsFailsAndPreservesCommercialRows()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = await fixture.OpenAsync();
        await SeedContextAsync(db);
        foreach (var script in new[] { "esquema", "catalogos" })
        {
            await using var transaction = await db.BeginTransactionAsync();
            await SetTargetAsync(db, transaction);
            var error = await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(db, Script(script), transaction));
            Assert.Equal(PostgresErrorCodes.RaiseException, error.SqlState);
            await transaction.RollbackAsync();
        }
        Assert.Equal("Negociación", await ScalarAsync<string>(db, "SELECT titulo FROM oportunidad"));
        Assert.Equal(4L, await ScalarAsync<long>(db, "SELECT count(*) FROM estado_cliente"));
    }

    [Theory]
    [InlineData("UPDATE oportunidad SET id_empresa=NULL,id_contacto=NULL", PostgresErrorCodes.CheckViolation)]
    [InlineData("UPDATE oportunidad SET cantidad_participantes=0", PostgresErrorCodes.CheckViolation)]
    [InlineData("UPDATE oportunidad SET valor=-0.01", PostgresErrorCodes.CheckViolation)]
    [InlineData("UPDATE oportunidad SET valor='NaN'::numeric", PostgresErrorCodes.CheckViolation)]
    [InlineData("UPDATE servicio SET precio_referencia=-1", PostgresErrorCodes.CheckViolation)]
    [InlineData("UPDATE estado_oportunidad SET codigo='OTRO' WHERE codigo='ABIERTA'", PostgresErrorCodes.CheckViolation)]
    [InlineData("UPDATE oportunidad SET id_responsable=2147483647", PostgresErrorCodes.ForeignKeyViolation)]
    [InlineData("DELETE FROM usuario", PostgresErrorCodes.ForeignKeyViolation)]
    [InlineData("DELETE FROM etapa_comercial WHERE nombre='Abierta'", PostgresErrorCodes.ForeignKeyViolation)]
    [InlineData("UPDATE usuario SET nombre='   '", PostgresErrorCodes.CheckViolation)]
    [InlineData("INSERT INTO actividad(id_tipo,id_usuario,fecha_hora,descripcion) SELECT (SELECT min(id) FROM tipo_actividad),id,now(),'Hecho' FROM usuario", PostgresErrorCodes.CheckViolation)]
    [InlineData("INSERT INTO historial_etapas(id_oportunidad,id_nueva_etapa,id_usuario) SELECT o.id,e.id,NULL FROM oportunidad o CROSS JOIN etapa_comercial e LIMIT 1", PostgresErrorCodes.NotNullViolation)]
    public async Task PostgreSqlRejectsInvalidLocalValuesOrBrokenReferences(string sql, string state)
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = await fixture.OpenAsync();
        await SeedContextAsync(db);
        var error = await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(db, sql));
        Assert.Equal(state, error.SqlState);
        Assert.Equal(1L, await ScalarAsync<long>(db, "SELECT count(*) FROM oportunidad"));
    }

    [Fact]
    public async Task PartialIndexesAllowInactiveOrderReuseAndRejectDuplicateFinalsEvenInactive()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = await fixture.OpenAsync();
        await SeedContextAsync(db);
        const string duplicateOrder = """
            INSERT INTO etapa_comercial(id_embudo,id_estado,nombre,orden,activo)
            SELECT b.id,e.id,'Otra',3,{0} FROM embudo b CROSS JOIN estado_oportunidad e WHERE e.codigo='ABIERTA'
            """;
        Assert.Equal(PostgresErrorCodes.UniqueViolation, (await Assert.ThrowsAsync<PostgresException>(
            () => ExecuteAsync(db, string.Format(duplicateOrder, "true")))).SqlState);
        await ExecuteAsync(db, string.Format(duplicateOrder, "false"));
        foreach (var code in new[] { "GANADA", "PERDIDA" })
        {
            await using var command = new NpgsqlCommand("""
                INSERT INTO etapa_comercial(id_embudo,id_estado,nombre,orden,activo)
                SELECT b.id,e.id,'Final duplicada',9,false FROM embudo b CROSS JOIN estado_oportunidad e WHERE e.codigo=@code
                """, db);
            command.Parameters.AddWithValue("code", code);
            Assert.Equal(PostgresErrorCodes.UniqueViolation,
                (await Assert.ThrowsAsync<PostgresException>(() => command.ExecuteNonQueryAsync())).SqlState);
        }
        await ExecuteAsync(db, "INSERT INTO embudo(nombre,id_servicio) SELECT 'Segundo',id FROM servicio");
        await ExecuteAsync(db, """
            INSERT INTO etapa_comercial(id_embudo,id_estado,nombre,orden)
            SELECT b.id,e.id,'Abierta segundo',3 FROM embudo b CROSS JOIN estado_oportunidad e
            WHERE b.nombre='Segundo' AND e.codigo='ABIERTA'
            """);
    }

    [Fact]
    public async Task IndependentHistoricalAssociationsAndSoftDeletionKeepActivityAndTransition()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = await fixture.OpenAsync();
        await SeedContextAsync(db);
        await ExecuteAsync(db, """
            INSERT INTO historial_etapas(id_oportunidad,id_nueva_etapa,id_usuario)
            SELECT id,id_etapa,id_responsable FROM oportunidad;
            INSERT INTO actividad(id_tipo,id_usuario,id_empresa,id_contacto,id_oportunidad,fecha_hora,descripcion)
            SELECT (SELECT min(id) FROM tipo_actividad),id_responsable,id_empresa,id_contacto,id,now()-interval '1 day','Llamada realizada' FROM oportunidad;
            UPDATE contacto SET id_empresa=(SELECT id FROM empresa WHERE razon_social='Empresa B');
            UPDATE oportunidad SET activo=false,valor=0,cantidad_participantes=10,fecha_estimada_cierre='2026-11-12';
            UPDATE empresa SET activo=false WHERE razon_social='Empresa A';
            """);
        Assert.Equal("Empresa A", await ScalarAsync<string>(db, "SELECT e.razon_social FROM oportunidad o JOIN empresa e ON e.id=o.id_empresa"));
        Assert.True(await ScalarAsync<bool>(db, "SELECT activo AND fecha_hora < fecha_registro FROM actividad"));
        Assert.Equal(1L, await ScalarAsync<long>(db, "SELECT count(*) FROM historial_etapas WHERE id_etapa_anterior IS NULL"));
        Assert.Equal(0m, await ScalarAsync<decimal>(db, "SELECT valor FROM oportunidad"));
        Assert.True(await ScalarAsync<bool>(db, "SELECT activo FROM usuario"));
    }

    [Fact]
    public async Task UserRolesAreManyToManyAndIdentityValuesAreNormalizedUnique()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = await fixture.OpenAsync();
        await SeedContextAsync(db);
        await ExecuteAsync(db, """
            INSERT INTO rol(nombre) VALUES ('Rol uno'),('Rol dos');
            INSERT INTO usuario_rol SELECT u.id,r.id FROM usuario u CROSS JOIN rol r;
            INSERT INTO permiso(codigo) VALUES ('PermisoPrueba');
            INSERT INTO permiso_rol SELECT r.id,p.id FROM rol r CROSS JOIN permiso p;
            """);
        Assert.Equal(2L, await ScalarAsync<long>(db, "SELECT count(*) FROM usuario_rol"));
        Assert.Equal(2L, await ScalarAsync<long>(db, "SELECT count(*) FROM permiso_rol"));
        foreach (var sql in new[]
        {
            "INSERT INTO usuario(nombre,apellido,correo,username,password_hash) VALUES ('Otro','Usuario','otro@example.invalid','  PRUEBA  ','hash-ficticio')",
            "INSERT INTO usuario(nombre,apellido,correo,username,password_hash) VALUES ('Otro','Usuario','  PRUEBA@EXAMPLE.INVALID  ','otro','hash-ficticio')",
            "INSERT INTO usuario_rol SELECT * FROM usuario_rol LIMIT 1"
        })
            Assert.Equal(PostgresErrorCodes.UniqueViolation,
                (await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(db, sql))).SqlState);
    }

    [Fact]
    public async Task TwoFixturesHaveIndependentSchemasAndCleanup()
    {
        await using var first = new CommercialSchemaFixture();
        await using var second = new CommercialSchemaFixture();
        await Task.WhenAll(first.InitializeAsync(), second.InitializeAsync());
        Assert.NotEqual(first.SchemaName, second.SchemaName);
        await using var firstDb = await first.OpenAsync();
        await using var secondDb = await second.OpenAsync();
        await SeedContextAsync(firstDb);
        Assert.Equal(0L, await ScalarAsync<long>(secondDb, "SELECT count(*) FROM usuario"));
        await first.CleanupAsync();
        Assert.Equal(4L, await ScalarAsync<long>(secondDb, "SELECT count(*) FROM estado_cliente"));
        Assert.Equal(0L, await ScalarAsync<long>(firstDb, "SELECT count(*) FROM pg_catalog.pg_namespace WHERE nspname=current_setting('search_path')"));
    }

    [Fact]
    public async Task CleanupRejectsUnexpectedObjectsAndRollsBackAllItsDrops()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = await fixture.OpenAsync();
        await ExecuteAsync(db, "CREATE TABLE unexpected_guard (id integer PRIMARY KEY); INSERT INTO unexpected_guard VALUES (4)");
        try
        {
            await Assert.ThrowsAsync<InvalidOperationException>(() => fixture.CleanupAsync());
            Assert.Equal(4, await ScalarAsync<int>(db, "SELECT id FROM unexpected_guard"));
            Assert.Equal(4L, await ScalarAsync<long>(db, "SELECT count(*) FROM estado_cliente"));
        }
        finally
        {
            await ExecuteAsync(db, "DROP TABLE unexpected_guard RESTRICT");
        }
        // A view is deliberately outside the explicit table manifest and blocks RESTRICT.
        await ExecuteAsync(db, "CREATE VIEW unexpected_guard AS SELECT id FROM usuario");
        try
        {
            await Assert.ThrowsAsync<InvalidOperationException>(() => fixture.CleanupAsync());
            Assert.Equal(21L, await ScalarAsync<long>(db,
                "SELECT count(*) FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE'"));
            Assert.Equal(0L, await ScalarAsync<long>(db, "SELECT count(*) FROM unexpected_guard"));
        }
        finally
        {
            // This test created this exact view; never sweep other objects or fixture leftovers.
            await ExecuteAsync(db, "DROP VIEW unexpected_guard RESTRICT");
        }
        await fixture.CleanupAsync();
    }

    internal static Task SeedContextAsync(NpgsqlConnection db) => ExecuteAsync(db, """
        INSERT INTO usuario(nombre,apellido,correo,username,password_hash)
        VALUES ('Usuario','Ficticio','prueba@example.invalid','prueba','hash-ficticio');
        INSERT INTO empresa(razon_social,id_estado,id_responsable)
        SELECT nombres.nombre,e.id,u.id FROM (VALUES ('Empresa A'),('Empresa B')) AS nombres(nombre)
        CROSS JOIN estado_cliente e CROSS JOIN usuario u WHERE e.descripcion='Potencial';
        INSERT INTO contacto(nombre,apellido,correo,id_empresa,id_estado,id_responsable)
        SELECT 'Ana','Prueba','ana@example.invalid',c.id,e.id,u.id
        FROM empresa c CROSS JOIN estado_cliente e CROSS JOIN usuario u WHERE c.razon_social='Empresa A' AND e.descripcion='Potencial';
        INSERT INTO servicio(nombre,precio_referencia) VALUES ('Servicio ficticio',100.25);
        INSERT INTO embudo(nombre,id_servicio) SELECT 'Embudo ficticio',id FROM servicio;
        INSERT INTO etapa_comercial(id_embudo,id_estado,nombre,orden)
        SELECT b.id,e.id,CASE e.codigo WHEN 'ABIERTA' THEN 'Abierta' WHEN 'GANADA' THEN 'Ganada' ELSE 'Perdida' END,
        CASE e.codigo WHEN 'GANADA' THEN 1 WHEN 'PERDIDA' THEN 2 ELSE 3 END FROM embudo b CROSS JOIN estado_oportunidad e;
        INSERT INTO oportunidad(titulo,id_responsable,id_empresa,id_contacto,id_etapa,valor)
        SELECT 'Negociación',u.id,c.id,p.id,e.id,100.25 FROM usuario u CROSS JOIN empresa c CROSS JOIN contacto p
        CROSS JOIN etapa_comercial e WHERE c.razon_social='Empresa A' AND e.nombre='Abierta';
        """);
}
