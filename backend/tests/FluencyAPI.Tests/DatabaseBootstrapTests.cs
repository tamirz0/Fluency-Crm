using FluencyAPI.Bootstrap;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Persistence.Models;
using Services.DTO;
using Services.Implementations;
using System.Diagnostics;

namespace FluencyAPI.Tests;

public sealed class DatabaseBootstrapTests
{
    private static ProcessStartInfo ApiProcess(string connection, bool initialize)
    {
        var start = new ProcessStartInfo("dotnet")
        {
            RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false,
            CreateNoWindow = true, WorkingDirectory = AppContext.BaseDirectory
        };
        start.ArgumentList.Add(typeof(DatabaseBootstrap).Assembly.Location);
        if (initialize) start.ArgumentList.Add("--initialize-database");
        else
        {
            start.ArgumentList.Add("--urls");
            start.ArgumentList.Add("http://127.0.0.1:0");
        }
        start.Environment["ASPNETCORE_ENVIRONMENT"] = initialize ? "Production" : "Development";
        start.Environment["DOTNET_ENVIRONMENT"] = initialize ? "Production" : "Development";
        start.Environment["ConnectionStrings__FluencyLocalDB"] = connection;
        start.Environment["Seed__DemoPassword"] = "";
        return start;
    }

    [Theory]
    [InlineData("", "Falta ConnectionStrings")]
    [InlineData("Host=db.example.com;Database=newdb;Password=do-not-print-this", "únicamente")]
    public async Task CommandReportsConfigurationErrorsWithoutLeakingSecrets(string connection, string message)
    {
        using var process = Process.Start(ApiProcess(connection, true))!;
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        try { await process.WaitForExitAsync(timeout.Token); }
        finally { if (!process.HasExited) process.Kill(entireProcessTree: true); }
        var output = await stdout + await stderr;
        Assert.NotEqual(0, process.ExitCode);
        Assert.Contains(message, output);
        Assert.DoesNotContain("do-not-print-this", output);
    }

    [Fact]
    public async Task NormalHttpStartupDoesNotInitializeAnEmptyDatabase()
    {
        await using var target = await TestDatabase.CreateAsync();
        using var process = Process.Start(ApiProcess(target.ConnectionString, false))!;
        var stderr = process.StandardError.ReadToEndAsync();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        try
        {
            string? baseUrl = null;
            while (await process.StandardOutput.ReadLineAsync(timeout.Token) is { } line)
            {
                const string prefix = "Now listening on: ";
                var index = line.IndexOf(prefix, StringComparison.Ordinal);
                if (index < 0) continue;
                baseUrl = line[(index + prefix.Length)..].Trim();
                break;
            }
            Assert.NotNull(baseUrl);
            using var http = new HttpClient { BaseAddress = new Uri(baseUrl), Timeout = TimeSpan.FromSeconds(10) };
            Assert.True((await http.GetAsync("/openapi/v1.json", timeout.Token)).IsSuccessStatusCode);
            Assert.Equal(0L, await target.ScalarAsync("SELECT count(*) FROM pg_tables WHERE schemaname='public'"));
        }
        finally
        {
            if (!process.HasExited) process.Kill(entireProcessTree: true);
            await process.WaitForExitAsync();
            await stderr;
        }
    }

    [Theory]
    [InlineData("Host=db.example.com;Database=newdb")]
    [InlineData("Host=localhost,db.example.com;Database=newdb")]
    [InlineData("Host=/tmp;Database=newdb")]
    [InlineData("Host=localhost;Database=FluencyLocalDB")]
    [InlineData("Host=localhost;Database=postgres")]
    [InlineData("Host=localhost")]
    [InlineData("Host=localhost;Database=newdb;Search Path=other")]
    [InlineData("Host=localhost;Database=newdb;Options=-c search_path=other")]
    public void RejectsUnsafeTargetsBeforeConnecting(string connection) =>
        Assert.Throws<BootstrapException>(() => DatabaseBootstrap.ValidateLocalConnection(connection));

    [Theory]
    [InlineData("localhost")]
    [InlineData("127.0.0.1")]
    [InlineData("::1")]
    public void AcceptsLoopback(string host) =>
        DatabaseBootstrap.ValidateLocalConnection($"Host={host};Database=newdb");

    [Fact]
    public async Task CreatesSchemaSeedsAndAuthenticatesWithoutOverwritingOnRerun()
    {
        await using var target = await TestDatabase.CreateAsync();
        var password = Guid.NewGuid().ToString("N");
        await DatabaseBootstrap.InitializeAsync(target.ConnectionString, password);
        await using var db = target.Context();
        Assert.Single(await db.Database.GetAppliedMigrationsAsync());
        Assert.Equal(3, await db.OrigenComerciales.CountAsync());
        Assert.Equal(3, await db.EstadoClientes.CountAsync());
        Assert.Equal(6, await db.NivelesIngles.CountAsync());
        Assert.Equal(3, await db.Modalidades.CountAsync());
        Assert.Equal(2, await db.Servicios.CountAsync());
        Assert.Equal(4, await db.EtapaComerciales.CountAsync());
        var demo = await db.Usuarios.SingleAsync();
        Assert.True(demo.Activo);
        Assert.True(BCrypt.Net.BCrypt.Verify(password, demo.PasswordHash));
        var originalHash = demo.PasswordHash;
        var login = await new LoginService(db).LoginAsync(
            new LoginRequest { Username = "vendedor", Password = password }, CancellationToken.None);
        Assert.Equal(LoginOutcome.Success, login.Outcome);
        Assert.Equal(4, (await new OportunidadService(db).GetOportunidadesPorEtapaAsync(CancellationToken.None)).Count);

        var course = await db.Servicios.Include(x => x.IdNivelNavigation).Include(x => x.IdModalidadNavigation)
            .SingleAsync(x => x.Nombre == "Inglés General B1");
        Assert.Equal("B1", course.IdNivelNavigation!.Descripcion);
        Assert.Equal("Grupal Online", course.IdModalidadNavigation!.Descripcion);
        course.PrecioReferencia = 99m;
        await db.SaveChangesAsync();

        await DatabaseBootstrap.InitializeAsync(target.ConnectionString, null);
        await DatabaseBootstrap.InitializeAsync(target.ConnectionString, "not-used-on-existing-user");
        db.ChangeTracker.Clear();
        Assert.Equal(originalHash, (await db.Usuarios.SingleAsync()).PasswordHash);
        Assert.Equal(99m, (await db.Servicios.SingleAsync(x => x.Nombre == course.Nombre)).PrecioReferencia);
        Assert.Equal(2, await db.Servicios.CountAsync());
        Assert.Equal(4, await db.EtapaComerciales.CountAsync());
        Assert.Equal(6, await db.NivelesIngles.CountAsync());

        var company = new Empresa { RazonSocial = "Persistencia prueba" };
        db.Empresas.Add(company);
        await db.SaveChangesAsync();
        await DatabaseBootstrap.InitializeAsync(target.ConnectionString, null);
        Assert.Equal("Persistencia prueba", (await db.Empresas.SingleAsync()).RazonSocial);
    }

    [Fact]
    public async Task MissingPasswordDoesNotCreateTables()
    {
        await using var target = await TestDatabase.CreateAsync();
        await Assert.ThrowsAsync<BootstrapException>(() => DatabaseBootstrap.InitializeAsync(target.ConnectionString, null));
        Assert.Equal(0L, await target.ScalarAsync("SELECT count(*) FROM pg_tables WHERE schemaname='public'"));
    }

    [Fact]
    public async Task RejectsLegacyAndForeignHistoryWithoutChangingData()
    {
        await using var target = await TestDatabase.CreateAsync();
        await target.ExecuteAsync("CREATE TABLE sentinel (id integer); INSERT INTO sentinel VALUES (42)");
        await Assert.ThrowsAsync<BootstrapException>(() => DatabaseBootstrap.InitializeAsync(target.ConnectionString, "unused"));
        Assert.Equal(42, await target.ScalarAsync("SELECT id FROM sentinel"));
        Assert.Equal(1L, await target.ScalarAsync("SELECT count(*) FROM pg_tables WHERE schemaname='public'"));
        await target.ExecuteAsync("""
            CREATE TABLE "__EFMigrationsHistory" ("MigrationId" varchar(150), "ProductVersion" varchar(32));
            INSERT INTO "__EFMigrationsHistory" VALUES ('foreign_migration', '10.0.12')
            """);
        await Assert.ThrowsAsync<BootstrapException>(() => DatabaseBootstrap.InitializeAsync(target.ConnectionString, "unused"));
        Assert.Equal(42, await target.ScalarAsync("SELECT id FROM sentinel"));
        Assert.Equal(2L, await target.ScalarAsync("SELECT count(*) FROM pg_tables WHERE schemaname='public'"));
    }

    [Fact]
    public async Task SeedRollsBackOnConflictAndResolvesIdsRatherThanAssumingThem()
    {
        await using var target = await TestDatabase.CreateAsync();
        await using var db = target.Context();
        await db.Database.MigrateAsync();
        db.NivelesIngles.Add(new NivelIngles { Descripcion = "Otro nivel" });
        db.Modalidades.Add(new Modalidad { Descripcion = "Otra modalidad" });
        var conflict = new Usuario { Nombre = "Otro", Apellido = "Usuario", Username = "otro",
            Correo = "vendedor@academia.com", PasswordHash = "not-a-demo", Activo = true };
        db.Usuarios.Add(conflict);
        await db.SaveChangesAsync();
        await Assert.ThrowsAnyAsync<Exception>(() => DatabaseBootstrap.InitializeAsync(target.ConnectionString, "local-test-password"));
        Assert.Equal(0, await db.EtapaComerciales.CountAsync());
        Assert.Equal(1, await db.NivelesIngles.CountAsync());
        db.Usuarios.Remove(conflict);
        await db.SaveChangesAsync();
        await DatabaseBootstrap.InitializeAsync(target.ConnectionString, "local-test-password");
        var course = await db.Servicios.Include(x => x.IdNivelNavigation).Include(x => x.IdModalidadNavigation)
            .SingleAsync(x => x.Nombre == "Inglés General B1");
        Assert.Equal("B1", course.IdNivelNavigation!.Descripcion);
        Assert.Equal("Grupal Online", course.IdModalidadNavigation!.Descripcion);
        Assert.NotEqual(3, course.IdNivel);
        Assert.NotEqual(1, course.IdModalidad);
    }
}

/// <summary>Owns only a randomly named test database; never drops a supplied database.</summary>
internal sealed class TestDatabase : IAsyncDisposable
{
    private readonly string adminConnection;
    private readonly string name = "fluency_bootstrap_test_" + Guid.NewGuid().ToString("N");
    public string ConnectionString { get; }

    private TestDatabase(string configuredConnection)
    {
        var settings = new NpgsqlConnectionStringBuilder(configuredConnection) { Database = name, Pooling = false };
        DatabaseBootstrap.ValidateLocalConnection(settings.ConnectionString);
        ConnectionString = settings.ConnectionString;
        settings.Database = "postgres";
        adminConnection = settings.ConnectionString;
    }

    public static async Task<TestDatabase> CreateAsync()
    {
        var configured = Environment.GetEnvironmentVariable("FLUENCY_TEST_CONNECTION");
        if (string.IsNullOrWhiteSpace(configured))
            throw new InvalidOperationException("Configure FLUENCY_TEST_CONNECTION a PostgreSQL local con permiso CREATEDB. Las pruebas no se omiten silenciosamente.");
        var target = new TestDatabase(configured);
        await using var connection = new NpgsqlConnection(target.adminConnection);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand($"CREATE DATABASE \"{target.name}\"", connection);
        await command.ExecuteNonQueryAsync();
        return target;
    }

    public FluencyLocalDbContext Context() => new(new DbContextOptionsBuilder<FluencyLocalDbContext>()
        .UseNpgsql(ConnectionString).Options);

    public async Task ExecuteAsync(string sql)
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }

    public async Task<object?> ScalarAsync(string sql)
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        return await command.ExecuteScalarAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await using var connection = new NpgsqlConnection(adminConnection);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand($"DROP DATABASE \"{name}\"", connection);
        await command.ExecuteNonQueryAsync();
    }
}
