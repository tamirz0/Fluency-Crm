using System.Text.RegularExpressions;
using Npgsql;
using Xunit;
using static FluencyAPI.Tests.CommercialSchemaFixture;

namespace FluencyAPI.Tests;

// creacion-tablas.sql (base nueva) y agregar-bonus-academia.sql (base ya instalada) deben seguir al esquema vigente.
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
        foreach (var name in new[] { "esquema", "catalogos", "roles", "bonus", "bonus-roles" })
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
        // 20 tablas base + 1 de prueba + 7 del bonus; la columna nueva; 4 roles; 8 permisos; permisos de rol: 16 base + 2 de academia.
        Assert.StartsWith("28/1/4/8/18/", first);

        // Las reglas del esquema están vigentes: un alumno por contacto y notas de 0 a 10.
        await ExecuteAsync(db, SchemaSeed);
        await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(db, "INSERT INTO alumno(id_contacto,id_nivel) SELECT id_contacto,id_nivel FROM alumno"));
        await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(db, "UPDATE clase_alumno SET nota=11"));

        // Se deja la base como la encontró el fixture para que su limpieza propia la acepte.
        await ExecuteAsync(db, string.Join('\n', BonusTables.Select(table => $"DROP TABLE {table} RESTRICT;")) + "\nALTER TABLE servicio DROP COLUMN es_taller;");
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
