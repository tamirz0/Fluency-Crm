using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Scalar.AspNetCore;
using Services.Implementations;
using Services.Interface;
using FluencyAPI.Bootstrap;

var initializeDatabase = args.Contains("--initialize-database", StringComparer.Ordinal);
var builder = WebApplication.CreateBuilder(
    args.Where(arg => arg != "--initialize-database").ToArray());

var connectionString = builder.Configuration.GetConnectionString("FluencyLocalDB");
if (string.IsNullOrWhiteSpace(connectionString))
{
    Console.Error.WriteLine("Falta ConnectionStrings:FluencyLocalDB. Configure User Secrets o ConnectionStrings__FluencyLocalDB.");
    return 1;
}

if (initializeDatabase)
{
    return await DatabaseBootstrap.RunAsync(connectionString, builder.Configuration["Seed:DemoPassword"]);
}

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<FluencyLocalDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<IOportunidadService, OportunidadService>();
builder.Services.AddScoped<IContactoService, ContactoService>();
builder.Services.AddScoped<IEmpresaService, EmpresaService>();
builder.Services.AddScoped<ILoginService, LoginService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // Interactive Swagger-style docs at /scalar/v1, reading the OpenAPI document from MapOpenApi() above.
    // Swashbuckle is intentionally not used here: it has known compatibility issues with .NET 9+/10 OpenAPI
    // types (see .agents/skills/dotnet-webapi).
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.UseCors();

app.MapControllers();

app.Run();
return 0;
