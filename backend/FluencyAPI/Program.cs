using Microsoft.EntityFrameworkCore;
using FluencyAPI;
using FluencyAPI.Authentication;
using Npgsql;
using Persistence.Models;
using Scalar.AspNetCore;
using Services.Implementations;
using Services.Interface;

if (args.Contains("--bootstrap-admin", StringComparer.Ordinal))
{
    Environment.ExitCode = await BootstrapAdmin.RunAsync(args);
    return;
}

var builder = WebApplication.CreateBuilder(args);

var connectionName = builder.Environment.IsProduction() ? "SegundaEntregaProductionDB" : "SegundaEntregaDB";
var connectionString = builder.Configuration.GetConnectionString(connectionName);
if (builder.Environment.IsProduction() && connectionString is null)
    connectionString = new ConfigurationBuilder().AddUserSecrets<Program>(optional: true)
        .Build().GetConnectionString(connectionName);
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        $"Falta configurar ConnectionStrings:{connectionName} mediante User Secrets o variables de entorno.");
}

NpgsqlConnectionStringBuilder connectionSettings;
try
{
    connectionSettings = new NpgsqlConnectionStringBuilder(connectionString);
}
catch (ArgumentException)
{
    throw new InvalidOperationException($"La configuración ConnectionStrings:{connectionName} no es válida.");
}

if (string.IsNullOrWhiteSpace(connectionSettings.Host)
    || string.IsNullOrWhiteSpace(connectionSettings.Database))
{
    throw new InvalidOperationException(
        $"La configuración ConnectionStrings:{connectionName} debe indicar Host y Database no vacíos.");
}

if (builder.Environment.IsDevelopment()
    && connectionSettings.Host is not ("localhost" or "127.0.0.1" or "::1"))
{
    throw new InvalidOperationException(
        "En Development, ConnectionStrings:SegundaEntregaDB debe usar un único host local: localhost, 127.0.0.1 o ::1.");
}

// Add services to the container.

builder.Services.AddHttpContracts();
builder.Services.AddSession(builder.Environment);
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<FluencyLocalDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<IOportunidadService, OportunidadService>();
builder.Services.AddScoped<IContactoService, ContactoService>();
builder.Services.AddScoped<IEmpresaService, EmpresaService>();
builder.Services.AddScoped<ILoginService, LoginService>();
builder.Services.AddScoped<UsuarioService>();
builder.Services.AddScoped<IServicioService, ServicioService>();
builder.Services.AddScoped<IEstadoClienteService, EstadoClienteService>();
builder.Services.AddScoped<IOrigenComercialService, OrigenComercialService>();
builder.Services.AddScoped<IEtapaComercialService, EtapaComercialService>();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
    // Interactive Swagger-style docs at /scalar/v1, reading the OpenAPI document from MapOpenApi() above.
    // Swashbuckle is intentionally not used here: it has known compatibility issues with .NET 9+/10 OpenAPI
    // types (see .agents/skills/dotnet-webapi).
    app.MapScalarApiReference().AllowAnonymous();
}

app.UseHttpsRedirection();

app.UseRouting();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();

app.Run();

public partial class Program { }
