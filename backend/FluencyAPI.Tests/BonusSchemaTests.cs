using Npgsql;
using Xunit;
using static FluencyAPI.Tests.CommercialSchemaFixture;

namespace FluencyAPI.Tests;

public sealed class BonusSchemaTests
{
    private static async Task<CommercialSchemaFixture> PreparedAsync()
    {
        var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = await fixture.OpenAsync();
        await SchemaTests.SeedContextAsync(db);
        await ExecuteAsync(db, """
            INSERT INTO curso(nombre,id_nivel,id_profesor) SELECT 'Curso B1',n.id,u.id FROM nivel_ingles n CROSS JOIN usuario u LIMIT 1;
            INSERT INTO alumno(id_contacto,id_nivel,id_curso) SELECT c.id,k.id_nivel,k.id FROM contacto c CROSS JOIN curso k;
            INSERT INTO clase(id_curso,titulo,fecha,hora_inicio,hora_fin) SELECT id,'Clase 1','2026-11-10','10:00','11:00' FROM curso;
            """);
        return fixture;
    }

    private static async Task<string?> FailureAsync(NpgsqlConnection db, string sql)
    {
        try { await ExecuteAsync(db, sql); return null; }
        catch (PostgresException error) { return error.SqlState; }
    }

    [Fact]
    public async Task CreatesAcademicTablesAndNoLongerKeepsTheTallerFlagOnServices()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = await fixture.OpenAsync();
        Assert.Equal(7L, await ScalarAsync<long>(db, """
            SELECT count(*) FROM information_schema.tables WHERE table_schema=current_schema()
            AND table_name IN ('profesor_nivel','alumno','curso','clase','clase_alumno','taller','taller_inscripcion')
            """));
        // El servicio de taller se identifica por su tipo, no por un indicador propio.
        Assert.Equal(0L, await ScalarAsync<long>(db, """
            SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema()
            AND table_name='servicio' AND column_name='es_taller'
            """));
        Assert.Equal(0L, await ScalarAsync<long>(db, """
            SELECT count(*) FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_namespace n ON n.oid=c.connamespace
            WHERE n.nspname=current_schema() AND c.contype='f' AND (c.confdeltype <> 'r' OR c.confupdtype <> 'r')
            """));
    }

    [Fact]
    public async Task EnforcesAlumnoUniquenessMarkRangeAndScheduleRules()
    {
        await using var fixture = await PreparedAsync();
        await using var db = await fixture.OpenAsync();
        Assert.Equal(PostgresErrorCodes.UniqueViolation, await FailureAsync(db,
            "INSERT INTO alumno(id_contacto,id_nivel) SELECT id_contacto,id_nivel FROM alumno"));
        Assert.Equal(PostgresErrorCodes.CheckViolation, await FailureAsync(db,
            "INSERT INTO clase(id_curso,titulo,fecha,hora_inicio,hora_fin) SELECT id,'Mala','2026-11-10','11:00','10:00' FROM curso"));
        Assert.Equal(PostgresErrorCodes.CheckViolation, await FailureAsync(db,
            "INSERT INTO clase(id_curso,titulo,fecha,hora_inicio,hora_fin,temas_examen) SELECT id,'Temas','2026-11-10','10:00','11:00','Unidad 1' FROM curso"));
        Assert.Null(await FailureAsync(db,
            "INSERT INTO clase(id_curso,titulo,fecha,hora_inicio,hora_fin,es_examen,temas_examen) SELECT id,'Examen','2026-11-11','10:00','11:00',true,NULL FROM curso"));
        Assert.Null(await FailureAsync(db,
            "INSERT INTO clase_alumno(id_clase,id_alumno,presente,nota) SELECT c.id,a.id,NULL,7.5 FROM clase c CROSS JOIN alumno a WHERE c.titulo='Clase 1'"));
        Assert.Equal(PostgresErrorCodes.UniqueViolation, await FailureAsync(db,
            "INSERT INTO clase_alumno(id_clase,id_alumno,presente) SELECT id_clase,id_alumno,true FROM clase_alumno"));
        Assert.Equal(PostgresErrorCodes.CheckViolation, await FailureAsync(db, "UPDATE clase_alumno SET nota=10.5"));
        Assert.Equal(PostgresErrorCodes.CheckViolation, await FailureAsync(db, "UPDATE clase_alumno SET nota=-1"));
    }

    [Fact]
    public async Task RestrictsDeletionOfReferencedAcademicRows()
    {
        await using var fixture = await PreparedAsync();
        await using var db = await fixture.OpenAsync();
        Assert.Equal(PostgresErrorCodes.ForeignKeyViolation, await FailureAsync(db, "DELETE FROM curso"));
        Assert.Equal(PostgresErrorCodes.ForeignKeyViolation, await FailureAsync(db, "DELETE FROM contacto"));
        Assert.Equal(PostgresErrorCodes.ForeignKeyViolation, await FailureAsync(db, "DELETE FROM nivel_ingles"));
        Assert.Equal(PostgresErrorCodes.ForeignKeyViolation, await FailureAsync(db,
            "INSERT INTO taller(id_servicio,titulo,fecha,hora_inicio,hora_fin) VALUES (-1,'Sin servicio','2026-11-12','10:00','11:00')"));
    }

    [Fact]
    public async Task BonusRolesScriptIsAdditiveAndIdempotent()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var db = await fixture.OpenAsync();
        await using (var transaction = await db.BeginTransactionAsync())
        {
            await SetTargetAsync(db, transaction);
            var error = await Assert.ThrowsAsync<PostgresException>(() => ExecuteAsync(db, Script("bonus-roles"), transaction));
            Assert.Equal(PostgresErrorCodes.RaiseException, error.SqlState);
            await transaction.RollbackAsync();
        }
        await using (var transaction = await db.BeginTransactionAsync())
        {
            await SetTargetAsync(db, transaction);
            await ExecuteAsync(db, Script("roles"), transaction);
            await ExecuteAsync(db, Script("bonus-roles"), transaction);
            await ExecuteAsync(db, Script("bonus-roles"), transaction);
            await transaction.CommitAsync();
        }
        Assert.Equal(4L, await ScalarAsync<long>(db, "SELECT count(*) FROM rol"));
        Assert.Equal(new[] { "ADMINISTRADOR", "PROFESOR" }, await ScalarAsync<string[]>(db, """
            SELECT array_agg(r.nombre ORDER BY r.nombre) FROM permiso_rol pr JOIN rol r ON r.id=pr.id_rol
            JOIN permiso p ON p.id=pr.id_permiso WHERE p.codigo='GestionarAcademia'
            """));
        Assert.Equal(0L, await ScalarAsync<long>(db, """
            SELECT count(*) FROM permiso_rol pr JOIN rol r ON r.id=pr.id_rol
            WHERE r.nombre='PROFESOR' AND pr.id_permiso <> (SELECT id FROM permiso WHERE codigo='GestionarAcademia')
            """));
    }
}
