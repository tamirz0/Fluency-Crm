using System.Net;
using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text;
using System.Text.Json;
using FluencyAPI.Controllers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Services.DTO;
using Xunit;

namespace FluencyAPI.Tests;

public sealed class HttpContractTests
{
    [Fact]
    public async Task ApplicationMapsOnlyCompletedAuthActionsAndNoLegacyRoutes()
    {
        await using var factory = new ContractApiFactory(includeProbe: false);
        using var client = factory.CreateClient();
        var actions = factory.Services.GetRequiredService<IActionDescriptorCollectionProvider>().ActionDescriptors.Items;
        Assert.Equal(13, actions.Count);
        Assert.All(actions, action => Assert.Contains(
            Assert.IsType<Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor>(action).ControllerTypeInfo.AsType(),
            new[] { typeof(LoginController), typeof(UsuariosController) }));

        using var response = await client.GetAsync("/openapi/v1.json");
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(new[] { "/auth/csrf", "/auth/login", "/auth/logout", "/auth/me", "/roles", "/usuarios", "/usuarios/opciones", "/usuarios/{id}", "/usuarios/{id}/desactivar", "/usuarios/{id}/password", "/usuarios/{id}/reactivar" },
            document.RootElement.GetProperty("paths").EnumerateObject().Select(path => path.Name).Order(StringComparer.Ordinal).ToArray());

        // Enumerate source actions as well as the actual routing table: no alternate verb survives.
        var controllers = typeof(LoginController).Assembly.GetTypes()
            .Where(type => type.Namespace == typeof(LoginController).Namespace
                && type.IsSubclassOf(typeof(ControllerBase)) && type != typeof(LoginController) && type != typeof(UsuariosController));
        foreach (var controller in controllers)
        {
            var prefix = controller.GetCustomAttribute<RouteAttribute>()!.Template
                .Replace("[controller]", controller.Name.Replace("Controller", ""));
            foreach (var method in controller.GetMethods())
            foreach (var route in method.GetCustomAttributes<Microsoft.AspNetCore.Mvc.Routing.HttpMethodAttribute>())
            foreach (var verb in route.HttpMethods)
            {
                var path = System.Text.RegularExpressions.Regex.Replace(route.Template ?? "", @"\{[^}]+\}", "1");
                using var request = new HttpRequestMessage(new HttpMethod(verb), $"/{prefix}/{path}")
                {
                    Content = JsonBody("{}")
                };
                using var retired = await client.SendAsync(request);
                Assert.Equal(HttpStatusCode.Unauthorized, retired.StatusCode);
            }
        }
    }

    [Fact]
    public async Task UnmappedRouteReturnsProblemDetailsWithStableCodeAndTraceId()
    {
        await using var factory = new ContractApiFactory();
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/no-existe");
        await AssertProblem(response, HttpStatusCode.Unauthorized, "UNAUTHENTICATED");
    }

    [Theory]
    [InlineData("{\"razonSocial\":\"Academia\",\"activo\":false}")]
    [InlineData("{\"razonSocial\":null}")]
    [InlineData("{}")]
    [InlineData("{\"idEstado\":\"invalido\"}")]
    [InlineData("{\"razonSocial\":\"A\",\"razonSocial\":\"B\"}")]
    [InlineData("{")]
    public async Task InvalidBodyNeverReachesMutation(string body)
    {
        await using var factory = new ContractApiFactory();
        using var client = factory.CreateClient();
        using var response = await client.PatchAsync("/contract-probe/1", JsonBody(body));
        await AssertProblem(response, HttpStatusCode.BadRequest, "VALIDATION_FAILED");
        Assert.Equal(0, factory.Services.GetRequiredService<ContractProbeState>().Writes);
    }

    [Fact]
    public async Task PatchPreservesOmittedFieldsAndClearsOnlyOptionalNulls()
    {
        await using var factory = new ContractApiFactory();
        using var client = factory.CreateClient();
        var state = factory.Services.GetRequiredService<ContractProbeState>();
        using var first = await client.PatchAsync("/contract-probe/1", JsonBody("{\"razonSocial\":\"Nueva\"}"));
        first.EnsureSuccessStatusCode();
        Assert.Equal("Nueva", state.RazonSocial);
        Assert.Equal("previa", state.Observaciones);
        using var second = await client.PatchAsync("/contract-probe/1", JsonBody("{\"observaciones\":null}"));
        second.EnsureSuccessStatusCode();
        Assert.Equal("Nueva", state.RazonSocial);
        Assert.Null(state.Observaciones);
        Assert.Equal(2, state.Writes);
    }

    [Theory]
    [InlineData("", 1, 25)]
    [InlineData("?page=2&pageSize=100", 2, 100)]
    public async Task PaginationUsesCommonDefaultsAndBounds(string query, int page, int pageSize)
    {
        await using var factory = new ContractApiFactory();
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/contract-probe" + query);
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(page, document.RootElement.GetProperty("page").GetInt32());
        Assert.Equal(pageSize, document.RootElement.GetProperty("pageSize").GetInt32());
        Assert.Equal(0, document.RootElement.GetProperty("totalCount").GetInt32());
        Assert.Empty(document.RootElement.GetProperty("items").EnumerateArray());
    }

    [Theory]
    [InlineData("/contract-probe?page=0")]
    [InlineData("/contract-probe?pageSize=101")]
    [InlineData("/contract-probe?pageSize=0")]
    [InlineData("/contract-probe?page=texto")]
    public async Task InvalidQueryReturnsValidationProblem(string path)
    {
        await using var factory = new ContractApiFactory();
        using var client = factory.CreateClient();
        using var response = await client.GetAsync(path);
        await AssertProblem(response, HttpStatusCode.BadRequest, "VALIDATION_FAILED");
    }

    [Fact]
    public async Task InvalidRouteIdDoesNotReachMutation()
    {
        await using var factory = new ContractApiFactory();
        using var client = factory.CreateClient();
        using var response = await client.PatchAsync("/contract-probe/texto", JsonBody("{\"observaciones\":null}"));
        await AssertProblem(response, HttpStatusCode.BadRequest, "VALIDATION_FAILED");
        Assert.Equal(0, factory.Services.GetRequiredService<ContractProbeState>().Writes);
    }

    [Theory]
    [InlineData("denied", HttpStatusCode.Forbidden, "FORBIDDEN")]
    [InlineData("conflict", HttpStatusCode.Conflict, "DUPLICATE_VALUE")]
    public async Task MvcProblemsUseCommonExtensionsAndPreserveBusinessCodes(string path, HttpStatusCode status, string code)
    {
        await using var factory = new ContractApiFactory();
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/contract-probe/" + path);
        await AssertProblem(response, status, code);
    }

    [Fact]
    public async Task UnexpectedExceptionDoesNotExposeInternalDetails()
    {
        await using var factory = new ContractApiFactory();
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/contract-probe/failure");
        await AssertProblem(response, HttpStatusCode.InternalServerError, "INTERNAL_ERROR");
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("internal-sensitive-marker", body);
        Assert.DoesNotContain("stackTrace", body, StringComparison.OrdinalIgnoreCase);
    }

    private static StringContent JsonBody(string body) => new(body, Encoding.UTF8, "application/json");

    private static async Task AssertProblem(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal((int)status, document.RootElement.GetProperty("status").GetInt32());
        Assert.Equal(code, document.RootElement.GetProperty("code").GetString());
        Assert.False(string.IsNullOrWhiteSpace(document.RootElement.GetProperty("traceId").GetString()));
    }
}

internal sealed class ContractApiFactory(bool includeProbe = true) : WebApplicationFactory<Program>
{
    protected override IHost CreateHost(IHostBuilder builder)
    {
        // No persistence is needed for binding/routing. This destination is deliberately unusable.
        builder.ConfigureHostConfiguration(configuration => configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                [HostDefaults.EnvironmentKey] = Environments.Development,
                ["ConnectionStrings:SegundaEntregaDB"] = "Host=127.0.0.1;Port=1;Database=fluency_segunda_entrega_test;Username=contract_no_connection;Timeout=1"
            }));
        return base.CreateHost(builder);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Development);
        builder.ConfigureServices(services =>
        {
            services.AddSingleton<ContractProbeState>();
            if (includeProbe)
                services.AddControllers().AddApplicationPart(typeof(ContractProbeController).Assembly);
            else
                services.AddControllers().ConfigureApplicationPartManager(manager =>
                {
                    var testPart = manager.ApplicationParts.OfType<AssemblyPart>()
                        .SingleOrDefault(part => part.Assembly == typeof(ContractProbeController).Assembly);
                    if (testPart is not null) manager.ApplicationParts.Remove(testPart);
                });
        });
    }

    public new HttpClient CreateClient() => base.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false
    });
}

public sealed class ContractProbeState
{
    public int Writes { get; set; }
    public string? RazonSocial { get; set; } = "Academia";
    public string? Observaciones { get; set; } = "previa";
}

public sealed record ContractPatchRequest : PatchRequest
{
    public string? RazonSocial
    {
        get;
        init { field = value; ProvidedFields.Add(nameof(RazonSocial)); }
    }

    public string? Observaciones
    {
        get;
        init { field = value; ProvidedFields.Add(nameof(Observaciones)); }
    }

    public int? IdEstado
    {
        get;
        init { field = value; ProvidedFields.Add(nameof(IdEstado)); }
    }

    public override IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        foreach (var error in base.Validate(validationContext)) yield return error;
        if (HasField(nameof(RazonSocial)) && string.IsNullOrWhiteSpace(RazonSocial))
            yield return new ValidationResult("La razón social es obligatoria.", [nameof(RazonSocial)]);
    }
}

// Test assembly only; never registered by the production application.
[ApiController]
[AllowAnonymous]
[IgnoreAntiforgeryToken]
[Route("contract-probe")]
public sealed class ContractProbeController(ContractProbeState state) : ControllerBase
{
    [HttpPatch("{id}")]
    public IActionResult Patch([FromRoute] int id, [FromBody] ContractPatchRequest request)
    {
        state.Writes++;
        if (request.HasField(nameof(request.RazonSocial))) state.RazonSocial = request.RazonSocial;
        if (request.HasField(nameof(request.Observaciones))) state.Observaciones = request.Observaciones;
        return Ok(new { id });
    }

    [HttpGet]
    public ActionResult<PageResponse<int>> List([FromQuery] PageQuery query) =>
        Ok(new PageResponse<int>([], query.Page, query.PageSize, 0));

    [HttpGet("denied")]
    public IActionResult Denied() => StatusCode(403);

    [HttpGet("conflict")]
    public IActionResult ConflictExample() => Conflict(new ProblemDetails
    {
        Status = 409,
        Title = "Valor duplicado.",
        Extensions = { ["code"] = "DUPLICATE_VALUE" }
    });

    [HttpGet("failure")]
    public IActionResult Failure() => throw new InvalidOperationException("internal-sensitive-marker");
}
