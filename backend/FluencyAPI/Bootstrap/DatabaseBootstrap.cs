using System.Net;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Persistence.Models;

namespace FluencyAPI.Bootstrap;

/// <summary>Preparación explícita de una base local; nunca se invoca al iniciar HTTP.</summary>
public static class DatabaseBootstrap
{
    public static async Task<int> RunAsync(string connectionString, string? demoPassword)
    {
        try
        {
            await InitializeAsync(connectionString, demoPassword);
            Console.WriteLine("Base local inicializada: migraciones y datos iniciales disponibles.");
            return 0;
        }
        catch (BootstrapException ex)
        {
            Console.Error.WriteLine(ex.Message);
        }
        catch (Exception)
        {
            // Npgsql/EF exceptions may contain connection details or parameter values.
            Console.Error.WriteLine("No se pudo inicializar la base local. Revise conexión, permisos y compatibilidad del esquema. No se eliminaron bases; puede reintentar tras corregir la causa.");
        }
        return 1;
    }

    public static async Task InitializeAsync(string connectionString, string? demoPassword)
    {
        ValidateLocalConnection(connectionString);
        connectionString = new NpgsqlConnectionStringBuilder(connectionString)
        {
            SearchPath = "public"
        }.ConnectionString;
        var options = new DbContextOptionsBuilder<FluencyLocalDbContext>()
            .UseNpgsql(connectionString).Options;
        await using var db = new FluencyLocalDbContext(options);
        var knownMigrations = db.Database.GetMigrations().ToArray();
        if (knownMigrations.Length == 0)
            throw new BootstrapException("No hay migraciones disponibles.");

        var hasDemo = await InspectAsync(connectionString, knownMigrations);
        if (!hasDemo && string.IsNullOrWhiteSpace(demoPassword))
            throw new BootstrapException("Falta Seed:DemoPassword para crear el usuario vendedor. No se aplicaron migraciones.");

        await db.Database.MigrateAsync();
        await DemoSeed.ApplyAsync(db, demoPassword);
    }

    public static void ValidateLocalConnection(string connectionString)
    {
        NpgsqlConnectionStringBuilder settings;
        try { settings = new NpgsqlConnectionStringBuilder(connectionString); }
        catch (ArgumentException) { throw new BootstrapException("La cadena de conexión no es válida."); }

        var host = settings.Host;
        var local = string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase)
            || (IPAddress.TryParse(host, out var address) && IPAddress.IsLoopback(address));
        if (!local)
            throw new BootstrapException("La inicialización admite únicamente localhost o una dirección IP de loopback. No se abrió ninguna conexión remota.");
        if (string.IsNullOrWhiteSpace(settings.Database)
            || new[] { "postgres", "template0", "template1", "FluencyLocalDB" }
                .Contains(settings.Database, StringComparer.OrdinalIgnoreCase))
            throw new BootstrapException("Indique una base nueva, por ejemplo FluencyLocalDB_Migrations. La base original y las bases de sistema están protegidas.");
        if (!string.IsNullOrWhiteSpace(settings.SearchPath))
            throw new BootstrapException("La inicialización utiliza el esquema public; no configure Search Path.");
        if (!string.IsNullOrWhiteSpace(settings.Options))
            throw new BootstrapException("La inicialización no admite Options adicionales de PostgreSQL.");
    }

    private static async Task<bool> InspectAsync(string connectionString, string[] knownMigrations)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        try { await connection.OpenAsync(); }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidCatalogName)
        {
            // EF will create this new database only after all preflight checks succeed.
            return false;
        }

        await using var objects = new NpgsqlCommand("""
            SELECT EXISTS (
                SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
                  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
                  AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f'))
            """, connection);
        if (!(bool)(await objects.ExecuteScalarAsync())!) return false;

        await using var historyExists = new NpgsqlCommand(
            "SELECT to_regclass('public.\"__EFMigrationsHistory\"') IS NOT NULL", connection);
        if (!(bool)(await historyExists.ExecuteScalarAsync())!)
            throw new BootstrapException("La base contiene objetos sin historial de migraciones. Use una base nueva; no se modificó el esquema existente.");

        var applied = new List<string>();
        await using (var history = new NpgsqlCommand(
            "SELECT \"MigrationId\" FROM public.\"__EFMigrationsHistory\" ORDER BY \"MigrationId\"", connection))
        await using (var reader = await history.ExecuteReaderAsync())
            while (await reader.ReadAsync()) applied.Add(reader.GetString(0));

        if (applied.Count == 0 || applied.Count > knownMigrations.Length
            || !applied.SequenceEqual(knownMigrations.Take(applied.Count)))
            throw new BootstrapException("El historial de la base no corresponde a las migraciones de este proyecto. No se modificó la base.");

        await using var demo = new NpgsqlCommand(
            "SELECT EXISTS (SELECT 1 FROM public.usuario WHERE username = 'vendedor')", connection);
        return (bool)(await demo.ExecuteScalarAsync())!;
    }
}

public sealed class BootstrapException(string message) : Exception(message);
