using System.Text.RegularExpressions;
using Npgsql;
using Xunit;
using static FluencyAPI.Tests.CommercialSchemaFixture;

namespace FluencyAPI.Tests;

// creacion-tablas.sql (base nueva), agregar-bonus-academia.sql y agregar-tipos-servicio-embudos.sql (bases ya instaladas)
// deben seguir al esquema vigente.
public sealed class ScriptsSqlTests
{
    // Sin comentarios ni diferencias de espacios: compara las sentencias, no el formato.
    private static string Normalize(string sql) => Regex.Replace(Regex.Replace(sql, @"--[^\r\n]*", ""), @"\s+", " ").Trim();
    private static string FromFirstGuard(string sql) => sql[sql.IndexOf("DO $$", StringComparison.Ordinal)..];

    [Fact]
    public void CreationScriptContainsEveryInstallScriptInOrderAndTheAdministrator()
    {
        var creation = Normalize(ScriptFile("creacion-tablas.sql"));
        var position = -1;
        foreach (var name in new[] { "esquema", "catalogos", "roles", "bonus", "bonus-roles", "embudos-base" })
        {
            var piece = Normalize(FromFirstGuard(Script(name)));
            var at = creation.IndexOf(piece, position + 1, StringComparison.Ordinal);
            Assert.True(at > position, $"creacion-tablas.sql no contiene, en orden, el contenido de segunda-entrega-{name}.sql.");
            position = at;
        }
        Assert.True(creation.IndexOf("INSERT INTO usuario ", position, StringComparison.Ordinal) > position, "Falta el alta del administrador después de los scripts.");
        Assert.EndsWith("COMMIT;", creation);
    }

    [Fact]
    public async Task PasteScriptAddsTheBonusToAnInstalledBaseAndCanBeRunAgainWithoutChanges()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync(bonus: false);
        await using var db = await fixture.OpenAsync();
        await using (var transaction = await db.BeginTransactionAsync())
        {
            await SetTargetAsync(db, transaction);
            await ExecuteAsync(db, Script("roles"), transaction);
            await transaction.CommitAsync();
        }
        Assert.Equal(0L, await ScalarAsync<long>(db, "SELECT count(*) FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='alumno'"));
        var script = ScriptFile("agregar-bonus-academia.sql");

        Task Run() => ExecuteAsync(db, script);
        async Task<string> StateAsync() => await ScalarAsync<string>(db, """
            SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema=current_schema())::text || '/' ||
                   (SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='servicio' AND column_name='es_taller')::text || '/' ||
                   (SELECT count(*) FROM rol)::text || '/' || (SELECT count(*) FROM permiso)::text || '/' || (SELECT count(*) FROM permiso_rol)::text || '/' ||
                   (SELECT count(*) FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_namespace n ON n.oid=c.connamespace WHERE n.nspname=current_schema())::text
            """);
        await Run();
        var first = await StateAsync();
        await Run();
        Assert.Equal(first, await StateAsync());
        // 23 tablas base (con tipo de servicio y la admisión de embudos) + 1 de prueba + 7 del bonus; la columna nueva; 4 roles; 8 permisos;
        // permisos de rol: 16 base + 2 de academia.
        Assert.StartsWith("31/1/4/8/18/", first);

        // Las reglas del esquema están vigentes: un alumno por contacto y notas de 0 a 10.
        await ExecuteAsync(db, SchemaSeed);
        await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(db, "INSERT INTO alumno(id_contacto,id_nivel) SELECT id_contacto,id_nivel FROM alumno"));
        await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(db, "UPDATE clase_alumno SET nota=11"));

        // Se deja la base como la encontró el fixture para que su limpieza propia la acepte.
        await ExecuteAsync(db, string.Join('\n', BonusTables.Select(table => $"DROP TABLE {table} RESTRICT;")) + "\nALTER TABLE servicio DROP COLUMN es_taller;");
    }

    private static async Task<string> TypeStateAsync(Npgsql.NpgsqlConnection db) => await ScalarAsync<string>(db, """
        SELECT (SELECT count(*) FROM tipo_servicio)::text || '/' || (SELECT count(*) FROM modalidad)::text || '/' || (SELECT count(*) FROM embudo)::text || '/' ||
               (SELECT count(*) FROM etapa_comercial)::text || '/' || (SELECT count(*) FROM embudo_tipo_servicio)::text || '/' ||
               (SELECT count(*) FROM embudo_servicio)::text || '/' || (SELECT count(*) FROM servicio)::text || '/' || (SELECT count(*) FROM oportunidad)::text
        """);

    [Fact]
    public async Task BaseFunnelsScriptSeedsTwoFunnelsWithTheirStagesAndTheMigrationDoesNotDuplicateThem()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = await fixture.OpenAsync();
        await using (var transaction = await db.BeginTransactionAsync())
        {
            await SetTargetAsync(db, transaction);
            await ExecuteAsync(db, Script("embudos-base"), transaction);
            await transaction.CommitAsync();
        }
        Assert.Equal("Clases de Inglés:CLASES,Talleres:TALLERES", await ScalarAsync<string>(db,
            "SELECT string_agg(b.nombre || ':' || t.codigo, ',' ORDER BY b.nombre) FROM embudo b JOIN embudo_tipo_servicio x ON x.id_embudo=b.id JOIN tipo_servicio t ON t.id=x.id_tipo_servicio"));
        Assert.Equal(2L, await ScalarAsync<long>(db, """
            SELECT count(*) FROM (SELECT b.id FROM embudo b JOIN etapa_comercial e ON e.id_embudo=b.id JOIN estado_oportunidad s ON s.id=e.id_estado
            GROUP BY b.id HAVING string_agg(s.codigo || ':' || e.orden || ':' || e.nombre, ',' ORDER BY e.orden) =
            'ABIERTA:1:Consulta recibida,ABIERTA:2:Necesidad relevada,ABIERTA:3:Nivel de inglés evaluado,ABIERTA:4:Presupuesto enviado,GANADA:5:Ganada,PERDIDA:6:Perdida') q
            """));
        // No se aplica dos veces ni sobre embudos propios.
        await using (var transaction = await db.BeginTransactionAsync())
        {
            await SetTargetAsync(db, transaction);
            await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(db, Script("embudos-base"), transaction));
            await transaction.RollbackAsync();
        }
        var state = await TypeStateAsync(db);
        Assert.Equal("2/5/2/12/2/0/0/0", state);
        // La migración para bases instaladas es repetible y no agrega embudos si ya existen.
        var script = ScriptFile("agregar-tipos-servicio-embudos.sql");
        await ExecuteAsync(db, script);
        await ExecuteAsync(db, script);
        Assert.Equal(state, await TypeStateAsync(db));
    }

    [Fact]
    public async Task TypeMigrationMovesLegacyServicesFunnelsAndOpportunitiesAndCanBeRunAgain()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = await fixture.OpenAsync();
        // Forma anterior: es_taller, embudo.id_servicio y ni tipo en el servicio ni servicio en la oportunidad.
        await ExecuteAsync(db, """
            ALTER TABLE servicio ADD COLUMN es_taller boolean NOT NULL DEFAULT false;
            ALTER TABLE servicio ALTER COLUMN id_tipo_servicio DROP NOT NULL;
            ALTER TABLE oportunidad ALTER COLUMN id_servicio DROP NOT NULL;
            ALTER TABLE embudo ADD COLUMN id_servicio integer REFERENCES servicio(id);
            INSERT INTO servicio(nombre,precio_referencia,id_nivel,es_taller)
            SELECT v.nombre,1,CASE WHEN v.nivel THEN (SELECT min(id) FROM nivel_ingles) END,v.taller
            FROM (VALUES ('Clases A',true,false),('Taller B',true,true),('Otro C',false,false)) AS v(nombre,nivel,taller);
            INSERT INTO embudo(nombre,id_servicio) SELECT 'Legado',id FROM servicio WHERE nombre='Clases A';
            INSERT INTO etapa_comercial(id_embudo,id_estado,nombre,orden) SELECT b.id,e.id,'Abierta',1 FROM embudo b CROSS JOIN estado_oportunidad e WHERE e.codigo='ABIERTA';
            INSERT INTO usuario(nombre,apellido,correo,username,password_hash) VALUES ('Usuario','Ficticio','legado@example.invalid','legado','hash-ficticio');
            INSERT INTO empresa(razon_social,id_estado,id_responsable) SELECT 'Empresa legado',e.id,u.id FROM estado_cliente e CROSS JOIN usuario u WHERE e.descripcion='Potencial';
            INSERT INTO oportunidad(titulo,id_responsable,id_empresa,id_etapa,valor)
            SELECT 'Legado',u.id,c.id,e.id,1 FROM usuario u CROSS JOIN empresa c CROSS JOIN etapa_comercial e;
            """);
        var script = ScriptFile("agregar-tipos-servicio-embudos.sql");
        await ExecuteAsync(db, script);

        Assert.Equal("Clases A:CLASES,Otro C:Otros,Taller B:TALLERES", await ScalarAsync<string>(db,
            "SELECT string_agg(s.nombre || ':' || coalesce(t.codigo, t.descripcion), ',' ORDER BY s.nombre) FROM servicio s JOIN tipo_servicio t ON t.id=s.id_tipo_servicio"));
        Assert.Equal("Legado:CLASES:Clases A", await ScalarAsync<string>(db, """
            SELECT string_agg(b.nombre || ':' || t.codigo || ':' || s.nombre, ',')
            FROM embudo b JOIN embudo_tipo_servicio x ON x.id_embudo=b.id JOIN tipo_servicio t ON t.id=x.id_tipo_servicio
            JOIN embudo_servicio y ON y.id_embudo=b.id JOIN servicio s ON s.id=y.id_servicio
            """));
        Assert.Equal("Clases A", await ScalarAsync<string>(db, "SELECT s.nombre FROM oportunidad o JOIN servicio s ON s.id=o.id_servicio"));
        Assert.Equal(0L, await ScalarAsync<long>(db, """
            SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema()
            AND ((table_name='servicio' AND column_name='es_taller') OR (table_name='embudo' AND column_name='id_servicio'))
            """));
        Assert.Equal(1L, await ScalarAsync<long>(db, "SELECT count(*) FROM embudo"));
        Assert.Equal(5L, await ScalarAsync<long>(db, "SELECT count(*) FROM modalidad"));
        var state = await TypeStateAsync(db);
        await ExecuteAsync(db, script);
        Assert.Equal(state, await TypeStateAsync(db));
    }

    private const string SchemaSeed = """
        INSERT INTO usuario(nombre,apellido,correo,username,password_hash) VALUES ('Usuario','Ficticio','script@example.invalid','script','hash-ficticio');
        INSERT INTO contacto(nombre,apellido,correo,id_estado,id_responsable)
        SELECT 'Ana','Prueba','ana@example.invalid',e.id,u.id FROM estado_cliente e CROSS JOIN usuario u WHERE e.descripcion='Potencial' AND u.username='script';
        INSERT INTO curso(nombre,id_nivel,id_profesor) SELECT 'Curso',n.id,u.id FROM nivel_ingles n CROSS JOIN usuario u WHERE u.username='script' LIMIT 1;
        INSERT INTO alumno(id_contacto,id_nivel,id_curso) SELECT c.id,k.id_nivel,k.id FROM contacto c CROSS JOIN curso k;
        INSERT INTO clase(id_curso,titulo,fecha,hora_inicio,hora_fin,es_examen) SELECT id,'Examen','2026-11-10','10:00','11:00',true FROM curso;
        INSERT INTO clase_alumno(id_clase,id_alumno,nota) SELECT c.id,a.id,8 FROM clase c CROSS JOIN alumno a;
        """;
}
