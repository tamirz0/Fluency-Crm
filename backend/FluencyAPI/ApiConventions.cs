using System.Diagnostics;
using System.Reflection;
using System.Text.Json.Serialization;
using FluencyAPI.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace FluencyAPI;

internal static class ApiConventions
{
    internal static void AddHttpContracts(this IServiceCollection services)
    {
        services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
            CompleteProblem(context.HttpContext, context.ProblemDetails));

        services.AddControllers(options => options.Filters.Add(new ProblemResultFilter()))
            .AddJsonOptions(options =>
            {
                options.AllowInputFormatterExceptionMessages = false;
                options.JsonSerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow;
                options.JsonSerializerOptions.AllowDuplicateProperties = false;
            })
            .ConfigureApiBehaviorOptions(options =>
            {
                options.SuppressInferBindingSourcesForParameters = true;
                options.InvalidModelStateResponseFactory = context =>
                {
                    var safeState = new ModelStateDictionary();
                    foreach (var entry in context.ModelState)
                    foreach (var error in entry.Value.Errors)
                        safeState.AddModelError(entry.Key, error.Exception is null
                            ? error.ErrorMessage : "El valor enviado no es válido.");
                    var factory = context.HttpContext.RequestServices.GetRequiredService<ProblemDetailsFactory>();
                    return new BadRequestObjectResult(factory.CreateValidationProblemDetails(
                        context.HttpContext, safeState));
                };
            })
            .ConfigureApplicationPartManager(manager => manager.FeatureProviders.Add(new RetiredControllers()));
    }

    private static void CompleteProblem(HttpContext context, ProblemDetails problem)
    {
        problem.Extensions.TryAdd("code", problem.Status switch
        {
            400 => "VALIDATION_FAILED",
            401 => "UNAUTHENTICATED",
            403 => "FORBIDDEN",
            404 => "NOT_FOUND",
            405 => "METHOD_NOT_ALLOWED",
            409 => "BUSINESS_CONFLICT",
            415 => "UNSUPPORTED_MEDIA_TYPE",
            429 => "RATE_LIMITED",
            >= 500 => "INTERNAL_ERROR",
            _ => "HTTP_ERROR"
        });
        problem.Extensions["traceId"] = Activity.Current?.Id ?? context.TraceIdentifier;
        if (problem.Status >= 500)
        {
            problem.Title = "Ocurrió un error interno.";
            problem.Detail = null;
        }
    }

    private sealed class ProblemResultFilter : IAlwaysRunResultFilter
    {
        public void OnResultExecuting(ResultExecutingContext context)
        {
            if (context.Result is ObjectResult { Value: ProblemDetails problem } result)
            {
                problem.Status ??= result.StatusCode ?? 500;
                CompleteProblem(context.HttpContext, problem);
            }
        }

        public void OnResultExecuted(ResultExecutedContext context) { }
    }

    // Remove each entry only when its replacement is complete. No configuration flag reopens legacy routes.
    private sealed class RetiredControllers : IApplicationFeatureProvider<ControllerFeature>
    {
        public void PopulateFeature(IEnumerable<ApplicationPart> parts, ControllerFeature feature)
        {
            Type[] retired = [typeof(EmpresaController), typeof(ContactoController),
                typeof(OportunidadesController), typeof(ServiciosController), typeof(EtapasComercialesController),
                typeof(EstadosClienteController), typeof(OrigenesComercialesController)];
            foreach (var type in retired)
                feature.Controllers.Remove(type.GetTypeInfo());
        }
    }
}
