using Npgsql;

namespace FluencyAPI.Tests;

// No API host or EF DDL: this fixture installs the versioned SQL in its own namespace.
internal sealed class CommercialSchemaFixture : IAsyncDisposable
{
    internal static readonly string[] TablesInDropOrder =
    [
        "actividad", "historial_etapas", "oportunidad", "etapa_comercial", "embudo", "servicio",
        "contacto", "empresa", "permiso_rol", "usuario_rol", "tipo_actividad", "motivo_perdida",
        "estado_oportunidad", "modalidad", "nivel_ingles", "origen_comercial", "estado_cliente",
        "permiso", "rol", "usuario", "probe"
    ];

    private readonly TestDatabaseSettings settings = TestDatabaseSettings.Load();
    private uint? databaseOid;
    private uint? schemaOid;
    private Dictionary<string, uint>? tableOids;
    internal string SchemaName => settings.SchemaName;
    internal string ConnectionString => settings.ConnectionString;

    internal static string Script(string name) => File.ReadAllText(
        Path.Combine(AppContext.BaseDirectory, "SQL", $"segunda-entrega-{name}.sql"));

    internal async Task InitializeAsync(bool commercial = true)
    {
        if (schemaOid is not null) throw new InvalidOperationException("Fixture ya preparado.");
        await using var connection = await OpenAsync(requireSchema: false);
        await using var transaction = await connection.BeginTransactionAsync();
        await ExecuteAsync(connection, $"CREATE SCHEMA \"{SchemaName}\"", transaction);
        if (commercial)
        {
            await SetTargetAsync(connection, transaction);
            await ExecuteAsync(connection, Script("esquema"), transaction);
            await ExecuteAsync(connection, Script("catalogos"), transaction);
        }
        await ExecuteAsync(connection, "CREATE TABLE probe (id uuid PRIMARY KEY)", transaction);
        var owned = await ReadResourcesAsync(connection, transaction);
        var expected = commercial ? TablesInDropOrder : ["probe"];
        if (!owned.Tables.Keys.Order().SequenceEqual(expected.Order()))
            throw new InvalidOperationException("El SQL no creó el manifiesto comercial esperado.");
        await transaction.CommitAsync();
        schemaOid = owned.SchemaOid;
        tableOids = owned.Tables;
    }

    internal static async Task SetTargetAsync(NpgsqlConnection connection, NpgsqlTransaction transaction)
    {
        await using var command = new NpgsqlCommand(
            "SELECT set_config('fluency.target_database', @target, true)", connection, transaction);
        command.Parameters.AddWithValue("target", TestDatabaseSettings.DatabaseName);
        await command.ExecuteNonQueryAsync();
    }

    internal async Task<NpgsqlConnection> OpenAsync(bool requireSchema = true)
    {
        var connection = new NpgsqlConnection(settings.ConnectionString);
        try
        {
            await connection.OpenAsync();
            await using var command = new NpgsqlCommand("""
                SELECT d.oid, current_database(), current_user, session_user,
                       pg_catalog.pg_get_userbyid(d.datdba), current_schema(), current_setting('search_path')
                FROM pg_catalog.pg_database d WHERE d.datname = current_database()
                """, connection);
            await using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) throw new InvalidOperationException("Base no identificada.");
            settings.ValidateIdentity(reader.GetString(1), reader.GetString(2), reader.GetString(3), reader.GetString(4));
            var oid = reader.GetFieldValue<uint>(0);
            if (databaseOid is not null && oid != databaseOid)
                throw new InvalidOperationException("La base fue reemplazada durante la prueba.");
            databaseOid = oid;
            if (reader.GetString(6) != SchemaName ||
                (requireSchema && (reader.IsDBNull(5) || reader.GetString(5) != SchemaName)))
                throw new InvalidOperationException("Search path fuera del fixture propio.");
            return connection;
        }
        catch (NpgsqlException)
        {
            await connection.DisposeAsync();
            throw new InvalidOperationException("No se pudo conectar al PostgreSQL exclusivo de pruebas; revisar configuración local.");
        }
        catch
        {
            await connection.DisposeAsync();
            throw;
        }
    }

    internal static async Task<int> ExecuteAsync(NpgsqlConnection connection, string sql, NpgsqlTransaction? transaction = null)
    {
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        return await command.ExecuteNonQueryAsync();
    }

    internal static async Task<T> ScalarAsync<T>(NpgsqlConnection connection, string sql)
    {
        await using var command = new NpgsqlCommand(sql, connection);
        return (T)(await command.ExecuteScalarAsync())!;
    }

    private async Task<(uint SchemaOid, Dictionary<string, uint> Tables)> ReadResourcesAsync(
        NpgsqlConnection connection, NpgsqlTransaction transaction)
    {
        await using var command = new NpgsqlCommand("""
            SELECT n.oid, pg_catalog.pg_get_userbyid(n.nspowner), c.relname, c.oid,
                   pg_catalog.pg_get_userbyid(c.relowner)
            FROM pg_catalog.pg_namespace n
            JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid AND c.relkind IN ('r', 'p')
            WHERE n.nspname = @schema
            """, connection, transaction);
        command.Parameters.AddWithValue("schema", SchemaName);
        await using var reader = await command.ExecuteReaderAsync();
        uint? oid = null;
        var tables = new Dictionary<string, uint>(StringComparer.Ordinal);
        while (await reader.ReadAsync())
        {
            settings.ValidateResourceOwners(reader.GetString(1), reader.GetString(4));
            oid = reader.GetFieldValue<uint>(0);
            tables.Add(reader.GetString(2), reader.GetFieldValue<uint>(3));
        }
        return (oid ?? throw new InvalidOperationException("Esquema propio sin tablas verificables."), tables);
    }

    internal async Task CleanupAsync()
    {
        if (schemaOid is null || tableOids is null) return;
        try
        {
            await using var connection = await OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();
            var ownedTables = TablesInDropOrder.Where(tableOids.ContainsKey)
                .Select(table => $"\"{SchemaName}\".\"{table}\"");
            await ExecuteAsync(connection, $"LOCK TABLE {string.Join(',', ownedTables)} IN ACCESS EXCLUSIVE MODE", transaction);
            var actual = await ReadResourcesAsync(connection, transaction);
            if (actual.SchemaOid != schemaOid || actual.Tables.Count != tableOids.Count ||
                tableOids.Any(table => !actual.Tables.TryGetValue(table.Key, out var oid) || oid != table.Value))
                throw new InvalidOperationException("Los objetos actuales difieren del manifiesto propio.");
            var drops = TablesInDropOrder.Where(tableOids.ContainsKey)
                .Select(table => $"DROP TABLE \"{SchemaName}\".\"{table}\" RESTRICT;");
            await ExecuteAsync(connection, string.Join('\n', drops) + $"\nDROP SCHEMA \"{SchemaName}\" RESTRICT;", transaction);
            await transaction.CommitAsync();
            schemaOid = null;
            tableOids = null;
        }
        catch (Exception)
        {
            throw new InvalidOperationException($"Limpieza de {SchemaName} rechazada; revisar recursos propios sin barridos ni cascadas.");
        }
    }

    public async ValueTask DisposeAsync() => await CleanupAsync();
}
