using Microsoft.Extensions.Configuration;
using Npgsql;

namespace FluencyAPI.Tests;

internal sealed class TestDatabaseSettings
{
    internal const string DatabaseName = "fluency_segunda_entrega_test";
    internal string ConnectionString { get; }
    internal string SchemaName { get; }
    private readonly string username;

    private TestDatabaseSettings(NpgsqlConnectionStringBuilder connection)
    {
        username = connection.Username!;
        SchemaName = "t03_" + Guid.NewGuid().ToString("N");
        connection.SearchPath = SchemaName;
        // Explicit Options also prevents ambient PGOPTIONS from changing role/search_path.
        connection.Options = "-c search_path=" + SchemaName;
        connection.IncludeErrorDetail = false;
        connection.LogParameters = false;
        connection.Pooling = false;
        connection.Enlist = false;
        connection.ApplicationName = "FluencyAPI.Tests";
        connection.Timeout = 10;
        connection.CommandTimeout = 15;
        ConnectionString = connection.ConnectionString;
    }

    internal static TestDatabaseSettings Load() => Load(new ConfigurationBuilder()
        .AddUserSecrets<Program>(optional: true)
        .AddEnvironmentVariables()
        .Build());

    internal static TestDatabaseSettings Load(IConfiguration configuration)
    {
        var configured = configuration.GetConnectionString("SegundaEntregaTestDB");
        if (string.IsNullOrWhiteSpace(configured))
        {
            throw new InvalidOperationException(
                "Falta configurar ConnectionStrings:SegundaEntregaTestDB; las pruebas no usan la conexión de desarrollo.");
        }

        NpgsqlConnectionStringBuilder connection;
        try
        {
            connection = new NpgsqlConnectionStringBuilder(configured);
        }
        catch (ArgumentException)
        {
            throw new InvalidOperationException("ConnectionStrings:SegundaEntregaTestDB tiene formato inválido.");
        }

        if (connection.Host is not ("localhost" or "127.0.0.1" or "::1")
            || connection.Port != 5433
            || connection.Database != DatabaseName
            || string.IsNullOrWhiteSpace(connection.Username)
            || string.IsNullOrEmpty(connection.Password)
            || !string.IsNullOrWhiteSpace(connection.Options))
        {
            throw new InvalidOperationException(
                "La conexión de pruebas exige host local único, puerto 5433, base fluency_segunda_entrega_test, usuario y contraseña explícitos, sin Options externos.");
        }

        return new TestDatabaseSettings(connection);
    }

    internal void ValidateIdentity(string database, string currentUser, string sessionUser, string owner)
    {
        if (database != DatabaseName || currentUser != username || sessionUser != username || owner != username)
        {
            throw new InvalidOperationException(
                "La identidad, la base o su propietario no coinciden con el destino exclusivo de pruebas.");
        }
    }

    internal void ValidateResourceOwners(string schemaOwner, string tableOwner)
    {
        if (schemaOwner != username || tableOwner != username)
        {
            throw new InvalidOperationException("El esquema o la tabla probe no pertenecen al usuario verificado.");
        }
    }
}
