using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Npgsql;

namespace FluencyAPI.Tests;

internal sealed class LocalApiFactory : WebApplicationFactory<Program>
{
    private readonly TestDatabaseSettings settings;
    private uint? databaseOid;
    private OwnedResources? resources;
    private bool disposed;

    internal string SchemaName => settings.SchemaName;

    internal LocalApiFactory() : this(TestDatabaseSettings.Load()) { }

    internal LocalApiFactory(TestDatabaseSettings settings) => this.settings = settings;

    protected override IHost CreateHost(IHostBuilder builder)
    {
        // Program reads configuration immediately after CreateBuilder(args), before Build.
        builder.ConfigureHostConfiguration(configuration => configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                [HostDefaults.EnvironmentKey] = Environments.Development,
                ["ConnectionStrings:SegundaEntregaDB"] = settings.ConnectionString
            }));
        return base.CreateHost(builder);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.UseEnvironment(Environments.Development);

    internal async Task InitializeDatabaseAsync()
    {
        if (resources is not null)
        {
            throw new InvalidOperationException("El recurso de esta instancia ya fue preparado.");
        }

        await using var connection = await OpenVerifiedConnectionAsync(requireSchema: false);
        await using var transaction = await connection.BeginTransactionAsync();
        await using var command = new NpgsqlCommand(
            $"CREATE SCHEMA \"{SchemaName}\"; CREATE TABLE \"{SchemaName}\".\"probe\" (id uuid PRIMARY KEY);",
            connection, transaction);
        await command.ExecuteNonQueryAsync();
        var created = await ReadResourcesAsync(connection, transaction);
        await transaction.CommitAsync();
        resources = created;
    }

    internal async Task<NpgsqlConnection> OpenVerifiedConnectionAsync(bool requireSchema = true)
    {
        var connection = new NpgsqlConnection(settings.ConnectionString);
        try
        {
            await connection.OpenAsync();
            await VerifyConnectionAsync(connection, requireSchema);
            return connection;
        }
        catch (NpgsqlException)
        {
            await connection.DisposeAsync();
            throw new InvalidOperationException(
                "No se pudo conectar al PostgreSQL exclusivo de pruebas; comprobar servicio y configuración local sin compartir secretos.");
        }
        catch
        {
            await connection.DisposeAsync();
            throw;
        }
    }

    internal async Task VerifyConnectionAsync(NpgsqlConnection connection, bool requireSchema = true)
    {
        await using var command = new NpgsqlCommand("""
            SELECT d.oid, current_database(), current_user, session_user,
                   pg_catalog.pg_get_userbyid(d.datdba), current_schema(), current_setting('search_path')
            FROM pg_catalog.pg_database d WHERE d.datname = current_database()
            """, connection);
        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            throw new InvalidOperationException("No se pudo verificar la identidad de la base de pruebas.");
        }

        settings.ValidateIdentity(reader.GetString(1), reader.GetString(2), reader.GetString(3), reader.GetString(4));
        var actualOid = reader.GetFieldValue<uint>(0);
        if (databaseOid is not null && databaseOid != actualOid)
        {
            throw new InvalidOperationException("La base de pruebas fue reemplazada durante la ejecución.");
        }
        databaseOid = actualOid;
        if (reader.GetString(6) != SchemaName
            || (requireSchema && (reader.IsDBNull(5) || reader.GetString(5) != SchemaName)))
        {
            throw new InvalidOperationException("El search_path efectivo no corresponde al esquema de esta instancia.");
        }
    }

    public override async ValueTask DisposeAsync()
    {
        if (disposed) return;
        disposed = true;
        await base.DisposeAsync();
        if (resources is null) return;

        try
        {
            await using var connection = await OpenVerifiedConnectionAsync();
            await using var transaction = await connection.BeginTransactionAsync();
            var actual = await ReadResourcesAsync(connection, transaction);
            ValidateResources(resources, actual);
            await using var command = new NpgsqlCommand(
                $"DROP TABLE \"{SchemaName}\".\"probe\" RESTRICT; DROP SCHEMA \"{SchemaName}\" RESTRICT;",
                connection, transaction);
            await command.ExecuteNonQueryAsync();
            await transaction.CommitAsync();
            if (await SchemaExistsAsync(connection))
            {
                throw new InvalidOperationException("El esquema sigue presente después de la limpieza.");
            }
        }
        catch (Exception)
        {
            throw new InvalidOperationException(
                $"No se completó la limpieza verificada del recurso {SchemaName}. Revisar sus restos manualmente; no se ejecutan borrados amplios.");
        }
    }

    internal async Task<bool> SchemaExistsAsync(NpgsqlConnection connection)
    {
        await using var command = new NpgsqlCommand(
            "SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = @schema)", connection);
        command.Parameters.AddWithValue("schema", SchemaName);
        return (bool)(await command.ExecuteScalarAsync())!;
    }

    private async Task<OwnedResources> ReadResourcesAsync(NpgsqlConnection connection, NpgsqlTransaction transaction)
    {
        await using var command = new NpgsqlCommand("""
            SELECT n.oid, c.oid, pg_catalog.pg_get_userbyid(n.nspowner), pg_catalog.pg_get_userbyid(c.relowner)
            FROM pg_catalog.pg_namespace n
            JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid
            WHERE n.nspname = @schema AND c.relname = 'probe' AND c.relkind = 'r'
            """, connection, transaction);
        command.Parameters.AddWithValue("schema", SchemaName);
        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            throw new InvalidOperationException("No se identificaron el esquema y la tabla probe propios.");
        }

        var result = new OwnedResources(reader.GetFieldValue<uint>(0), reader.GetFieldValue<uint>(1),
            reader.GetString(2), reader.GetString(3));
        settings.ValidateResourceOwners(result.SchemaOwner, result.TableOwner);
        return result;
    }

    internal static void ValidateResources(OwnedResources expected, OwnedResources actual)
    {
        if (expected != actual)
        {
            throw new InvalidOperationException("Los recursos actuales no son los creados por esta instancia; se conserva su contenido.");
        }
    }

    internal sealed record OwnedResources(uint SchemaOid, uint TableOid, string SchemaOwner, string TableOwner);
}
