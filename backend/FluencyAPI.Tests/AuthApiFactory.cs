using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Npgsql;
using Services.Acceso;

namespace FluencyAPI.Tests;

internal sealed class AuthApiFactory : WebApplicationFactory<Program>
{
    private readonly CommercialSchemaFixture database = new();
    internal SessionTestClock Clock { get; } = new();
    internal string Password { get; } = Guid.NewGuid().ToString("N");
    internal int AdminId { get; private set; }
    internal int SellerId { get; private set; }

    internal async Task InitializeAsync()
    {
        await database.InitializeAsync();
        await using var connection = await database.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        await CommercialSchemaFixture.SetTargetAsync(connection, transaction);
        await CommercialSchemaFixture.ExecuteAsync(connection, CommercialSchemaFixture.Script("roles"), transaction);
        // Low work factor for fictitious fixture accounts only; product bootstrap remains cost 12.
        var hash = BCrypt.Net.BCrypt.HashPassword(Password, 4);
        foreach (var role in new[] { RolesYPermisos.Administrador, RolesYPermisos.Vendedor })
        {
            var username = role == RolesYPermisos.Administrador ? "admin" : "seller";
            await using var command = new NpgsqlCommand("""
                INSERT INTO usuario(nombre,apellido,correo,username,password_hash,activo)
                VALUES ('Usuario','Ficticio',@email,@username,@hash,true) RETURNING id
                """, connection, transaction);
            command.Parameters.AddWithValue("email", username + "@example.invalid");
            command.Parameters.AddWithValue("username", username);
            command.Parameters.AddWithValue("hash", hash);
            var id = (int)(await command.ExecuteScalarAsync())!;
            if (username == "admin") AdminId = id; else SellerId = id;
            await using var assignment = new NpgsqlCommand(
                "INSERT INTO usuario_rol SELECT @id,id FROM rol WHERE nombre=@role", connection, transaction);
            assignment.Parameters.AddWithValue("id", id);
            assignment.Parameters.AddWithValue("role", role);
            await assignment.ExecuteNonQueryAsync();
        }
        await transaction.CommitAsync();
    }

    internal Task<NpgsqlConnection> OpenAsync() => database.OpenAsync();

    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.ConfigureHostConfiguration(configuration => configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                [HostDefaults.EnvironmentKey] = Environments.Development,
                ["ConnectionStrings:SegundaEntregaDB"] = database.ConnectionString
            }));
        return base.CreateHost(builder);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Development);
        builder.ConfigureServices(services =>
        {
            services.AddSingleton<TimeProvider>(Clock);
            services.AddSingleton<AuthProbeState>();
            services.AddControllers().AddApplicationPart(typeof(AuthProbeController).Assembly);
        });
    }

    internal HttpClient Client(bool cookies = true) => CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false, HandleCookies = cookies
    });

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await database.DisposeAsync();
    }
}

internal sealed class SessionTestClock : TimeProvider
{
    private DateTimeOffset now = DateTimeOffset.UtcNow;
    public override DateTimeOffset GetUtcNow() => now;
    internal void Advance(TimeSpan elapsed) => now += elapsed;
}

public sealed class AuthProbeState
{
    public int Writes { get; set; }
}

public sealed record AuthProbeRequest
{
    [Required]
    public required string Descripcion { get; init; }
}

// Only in the test host: exercises default authorization, role policy, CSRF and server actor.
[ApiController]
[Route("auth-probe")]
public sealed class AuthProbeController(ActorActual actor, AuthProbeState state) : ControllerBase
{
    [HttpGet]
    public IActionResult Read() => Ok(new { actor.Id });

    [Microsoft.AspNetCore.Authorization.Authorize(Policy = RolesYPermisos.AdministrarUsuarios)]
    [HttpPost("admin")]
    public IActionResult Write([FromBody] AuthProbeRequest request)
    {
        state.Writes++;
        return Ok(new { actor.Id, request.Descripcion });
    }
}
