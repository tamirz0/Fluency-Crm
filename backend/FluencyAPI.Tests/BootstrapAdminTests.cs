using System.Diagnostics;
using Npgsql;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class BootstrapAdminTests
{
    private static Dictionary<string, string> Credentials() => new()
    {
        ["Nombre"] = "  Administrador  ", ["Apellido"] = "  Inicial  ",
        ["Correo"] = "  bootstrap@example.invalid  ", ["Username"] = "  bootstrap  ",
        ["Password"] = " " + Guid.NewGuid().ToString("N") + " "
    };

    [Fact]
    public async Task CommandRejectsMissingEnvironmentWithoutStartingHttp()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        var result = await RunAsync(connection, new Dictionary<string, string>());
        Assert.Equal(1, result.Code);
        Assert.Contains("BootstrapAdmin__Nombre", result.Output);
        Assert.DoesNotContain("Now listening", result.Output);
        Assert.Equal(0L, await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario"));
    }

    [Fact]
    public async Task CommandCreatesOnlyOneActiveAdministratorAndReexecutionPreservesEverything()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SeedRolesAsync(connection);
        var values = Credentials();
        var first = await RunAsync(connection, values);
        Assert.Equal(0, first.Code);
        Assert.Contains("Administrador inicial creado", first.Output);
        Assert.DoesNotContain("Now listening", first.Output);
        await using var query = new NpgsqlCommand("SELECT nombre,apellido,correo,username,password_hash,activo FROM usuario", connection);
        string hash;
        await using (var reader = await query.ExecuteReaderAsync())
        {
            Assert.True(await reader.ReadAsync());
            Assert.Equal("Administrador", reader.GetString(0));
            Assert.Equal("Inicial", reader.GetString(1));
            Assert.Equal("bootstrap@example.invalid", reader.GetString(2));
            Assert.Equal("bootstrap", reader.GetString(3));
            hash = reader.GetString(4);
            Assert.True(reader.GetBoolean(5));
            Assert.False(await reader.ReadAsync());
        }
        Assert.True(BCrypt.Net.BCrypt.Verify(values["Password"], hash), "La contraseña debe conservarse sin trim.");
        Assert.True(hash.StartsWith("$2a$12$", StringComparison.Ordinal), "BCrypt debe usar costo 12.");
        Assert.Equal("ADMINISTRADOR", await CommercialSchemaFixture.ScalarAsync<string>(connection,
            "SELECT r.nombre FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol"));
        Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario_rol"));
        Assert.Equal(0L, await CommercialSchemaFixture.ScalarAsync<long>(connection,
            "SELECT (SELECT count(*) FROM empresa)+(SELECT count(*) FROM contacto)+(SELECT count(*) FROM servicio)+(SELECT count(*) FROM embudo)+(SELECT count(*) FROM oportunidad)"));
        var second = await RunAsync(connection, Credentials());
        var withoutSecrets = await RunAsync(connection, []);
        Assert.Equal(0, second.Code);
        Assert.Equal(0, withoutSecrets.Code);
        Assert.Contains("ya inicializado", second.Output);
        Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario"));
        Assert.True(hash == await CommercialSchemaFixture.ScalarAsync<string>(connection, "SELECT password_hash FROM usuario"),
            "La reejecución no debe cambiar el hash.");
        AssertRedacted(first.Output + second.Output + withoutSecrets.Output, values);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ExistingAccountsWithoutActiveAdministratorRequireRecoveryWithoutElevation(bool inactiveAdmin)
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SeedRolesAsync(connection);
        await CommercialSchemaFixture.ExecuteAsync(connection, """
            INSERT INTO usuario(nombre,apellido,correo,username,password_hash,activo)
            VALUES ('Usuario','Existente','existente@example.invalid','existente','hash-ficticio',true);
            """);
        await CommercialSchemaFixture.ExecuteAsync(connection, inactiveAdmin
            ? "UPDATE usuario SET activo=false; INSERT INTO usuario_rol SELECT u.id,r.id FROM usuario u CROSS JOIN rol r WHERE r.nombre='ADMINISTRADOR'"
            : "INSERT INTO usuario_rol SELECT u.id,r.id FROM usuario u CROSS JOIN rol r WHERE r.nombre='VENDEDOR'");
        var result = await RunAsync(connection, Credentials());
        Assert.Equal(2, result.Code);
        Assert.Contains("recuperación operativa", result.Output);
        Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario"));
        Assert.Equal(!inactiveAdmin, await CommercialSchemaFixture.ScalarAsync<bool>(connection, "SELECT activo FROM usuario"));
        Assert.Equal("hash-ficticio", await CommercialSchemaFixture.ScalarAsync<string>(connection, "SELECT password_hash FROM usuario"));
        Assert.Equal(1L,
            await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario_rol"));
        Assert.Equal(inactiveAdmin ? "ADMINISTRADOR" : "VENDEDOR", await CommercialSchemaFixture.ScalarAsync<string>(connection,
            "SELECT nombre FROM rol r JOIN usuario_rol ur ON ur.id_rol=r.id"));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task AspNetCoreDevelopmentAlonePreservesNormalEnvironmentAndLocalHostGuard(bool remoteHost)
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SeedRolesAsync(connection);
        var result = await RunAsync(connection, Credentials(), dotnetEnvironment: false, remoteHost: remoteHost);
        Assert.Equal(remoteHost ? 1 : 0, result.Code);
        Assert.Contains(remoteHost ? "Development exige un único host local" : "Administrador inicial creado", result.Output);
        Assert.Equal(remoteHost ? 0L : 1L,
            await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario"));
    }

    [Fact]
    public async Task MissingSchemaOrRolesDoesNotCreateOrRepairThem()
    {
        foreach (var commercial in new[] { false, true })
        {
            await using var fixture = new CommercialSchemaFixture();
            await fixture.InitializeAsync(commercial);
            await using var connection = await fixture.OpenAsync();
            var before = await CommercialSchemaFixture.ScalarAsync<long>(connection,
                "SELECT count(*) FROM information_schema.tables WHERE table_schema=current_schema()");
            var values = Credentials();
            var result = await RunAsync(connection, values);
            Assert.Equal(4, result.Code);
            Assert.Equal(before, await CommercialSchemaFixture.ScalarAsync<long>(connection,
                "SELECT count(*) FROM information_schema.tables WHERE table_schema=current_schema()"));
            if (commercial)
                Assert.Equal(0L, await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario"));
            AssertRedacted(result.Output, values);
        }
    }

    [Theory]
    [InlineData("Nombre", " ")]
    [InlineData("Apellido", " ")]
    [InlineData("Correo", "invalido")]
    [InlineData("Username", " ")]
    [InlineData("Nombre", "100+")]
    [InlineData("Apellido", "100+")]
    [InlineData("Correo", "150+")]
    [InlineData("Username", "50+")]
    [InlineData("Password", "7")]
    [InlineData("Password", "73")]
    [InlineData("Password", "unicode73+")]
    public async Task InvalidInputIsRejectedWithoutPartialWritesOrValuesInDiagnostics(string field, string example)
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SeedRolesAsync(connection);
        var values = Credentials();
        values[field] = example switch
        {
            "100+" => new string('x', 101), "50+" => new string('x', 51),
            "150+" => new string('x', 136) + "@example.invalid",
            "7" => new string('x', 7), "73" => new string('x', 73),
            "unicode73+" => new string('é', 37), _ => example
        };
        var result = await RunAsync(connection, values);
        Assert.Equal(1, result.Code);
        Assert.Contains("BootstrapAdmin__" + field, result.Output);
        Assert.Equal(0L, await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario"));
        Assert.Equal(0L, await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario_rol"));
        AssertRedacted(result.Output, values.Where(pair => pair.Value.Length >= 7).ToDictionary());
    }

    [Theory]
    [InlineData("minimum")]
    [InlineData("ascii72")]
    [InlineData("utf8_72")]
    public async Task BoundaryLengthsAreAccepted(string example)
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SeedRolesAsync(connection);
        var values = Credentials();
        values["Nombre"] = new string('n', 100);
        values["Apellido"] = new string('a', 100);
        values["Username"] = new string('u', 50);
        values["Correo"] = new string('c', 134) + "@example.invalid";
        values["Password"] = example switch
        {
            "minimum" => new string(' ', 8), "ascii72" => new string('x', 72), _ => new string('é', 36)
        };
        var result = await RunAsync(connection, values);
        Assert.Equal(0, result.Code);
        Assert.True(BCrypt.Net.BCrypt.Verify(values["Password"],
            await CommercialSchemaFixture.ScalarAsync<string>(connection, "SELECT password_hash FROM usuario")));
    }

    [Fact]
    public async Task CredentialsCannotComeFromCommandLineOrConfigurationFallback()
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SeedRolesAsync(connection);
        var values = Credentials();
        var extraArgument = "--BootstrapAdmin:Password=" + values["Password"];
        var environmentWithoutPassword = values.Where(pair => pair.Key != "Password").ToDictionary();
        var fromArguments = await RunAsync(connection, environmentWithoutPassword, extraArgument);
        Assert.Equal(1, fromArguments.Code);
        AssertRedacted(fromArguments.Output, values);
        var directory = Path.Combine(Path.GetTempPath(), "fluency_bootstrap_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        var configuration = Path.Combine(directory, "appsettings.json");
        try
        {
            await File.WriteAllTextAsync(configuration, System.Text.Json.JsonSerializer.Serialize(new { BootstrapAdmin = values }));
            var fromConfiguration = await RunAsync(connection, [], workingDirectory: directory);
            Assert.Equal(1, fromConfiguration.Code);
            Assert.Contains("BootstrapAdmin__Nombre", fromConfiguration.Output);
            AssertRedacted(fromConfiguration.Output, values);
        }
        finally
        {
            File.Delete(configuration);
            Directory.Delete(directory);
        }
        Assert.Equal(0L, await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario"));
    }

    private static async Task SeedRolesAsync(NpgsqlConnection connection)
    {
        await using var transaction = await connection.BeginTransactionAsync();
        await CommercialSchemaFixture.SetTargetAsync(connection, transaction);
        await CommercialSchemaFixture.ExecuteAsync(connection, CommercialSchemaFixture.Script("roles"), transaction);
        await transaction.CommitAsync();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ConcurrentProcessesRollbackOneAttemptEvenWithDifferentCandidates(bool differentCandidates)
    {
        await using var fixture = new CommercialSchemaFixture();
        await fixture.InitializeAsync();
        await using var connection = await fixture.OpenAsync();
        await SeedRolesAsync(connection);
        await using var blocker = await connection.BeginTransactionAsync();
        await CommercialSchemaFixture.ExecuteAsync(connection, "LOCK TABLE usuario IN SHARE MODE", blocker);
        var firstValues = Credentials();
        var secondValues = Credentials();
        if (differentCandidates)
        {
            secondValues["Username"] = "otro";
            secondValues["Correo"] = "otro@example.invalid";
        }
        var first = RunAsync(connection, firstValues);
        var second = RunAsync(connection, secondValues);
        var overlapped = false;
        try
        {
            await using var monitor = await fixture.OpenAsync();
            var watch = Stopwatch.StartNew();
            while (watch.Elapsed < TimeSpan.FromSeconds(8))
            {
                if (await CommercialSchemaFixture.ScalarAsync<long>(monitor,
                    "SELECT count(*) FROM pg_locks WHERE relation='usuario'::regclass AND mode='RowExclusiveLock' AND NOT granted") == 2)
                {
                    overlapped = true;
                    break;
                }
                await Task.Delay(50);
            }
        }
        finally
        {
            await blocker.RollbackAsync();
        }
        var results = await Task.WhenAll(first, second);
        Assert.True(overlapped, "Ambos procesos deben llegar a la escritura con la lectura inicial vacía.");
        Assert.Equal(new[] { 0, 3 }, results.Select(result => result.Code).Order().ToArray());
        Assert.Contains("concurrente", results.Single(result => result.Code == 3).Output);
        Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario"));
        Assert.Equal(1L, await CommercialSchemaFixture.ScalarAsync<long>(connection, "SELECT count(*) FROM usuario_rol"));
        foreach (var result in results)
        {
            AssertRedacted(result.Output, firstValues);
            AssertRedacted(result.Output, secondValues);
            Assert.DoesNotContain("Now listening", result.Output);
        }
    }

    private static void AssertRedacted(string output, Dictionary<string, string> values)
    {
        foreach (var value in values.Values)
            Assert.True(!output.Contains(value, StringComparison.Ordinal), "El diagnóstico no debe revelar datos de entrada.");
        Assert.DoesNotContain("Npgsql", output);
        Assert.DoesNotContain("Exception", output);
        Assert.DoesNotContain("$2a$", output);
    }

    private static async Task<(int Code, string Output)> RunAsync(NpgsqlConnection connection,
        Dictionary<string, string> values, string? argument = null, string? workingDirectory = null,
        bool dotnetEnvironment = true, bool remoteHost = false)
    {
        var start = new ProcessStartInfo("dotnet")
        {
            WorkingDirectory = workingDirectory ?? AppContext.BaseDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        start.ArgumentList.Add(Path.Combine(AppContext.BaseDirectory, "FluencyAPI.dll"));
        start.ArgumentList.Add("--bootstrap-admin");
        if (argument is not null) start.ArgumentList.Add(argument);
        foreach (var key in start.Environment.Keys.Where(key => key.StartsWith("BootstrapAdmin", StringComparison.OrdinalIgnoreCase)).ToArray())
            start.Environment.Remove(key);
        start.Environment.Remove("DOTNET_ENVIRONMENT");
        if (dotnetEnvironment) start.Environment["DOTNET_ENVIRONMENT"] = "Development";
        start.Environment["ASPNETCORE_ENVIRONMENT"] = "Development";
        // An opened NpgsqlConnection hides its password. Reload only the validated test secret
        // and preserve the exact namespace/options of this already-verified fixture.
        var target = new NpgsqlConnectionStringBuilder(TestDatabaseSettings.Load().ConnectionString);
        var own = new NpgsqlConnectionStringBuilder(connection.ConnectionString);
        target.SearchPath = own.SearchPath;
        target.Options = own.Options;
        if (remoteHost) target.Host = "bootstrap.example.invalid";
        start.Environment["ConnectionStrings__SegundaEntregaDB"] = target.ConnectionString;
        start.Environment["ASPNETCORE_URLS"] = "http://127.0.0.1:0";
        foreach (var (key, value) in values) start.Environment["BootstrapAdmin__" + key] = value;
        using var process = Process.Start(start)!;
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        try
        {
            await process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(15));
        }
        catch (TimeoutException)
        {
            process.Kill(entireProcessTree: true);
            await process.WaitForExitAsync();
            Assert.Fail("El modo bootstrap no terminó: podría haber iniciado HTTP.");
        }
        return (process.ExitCode, await stdout + await stderr);
    }
}
