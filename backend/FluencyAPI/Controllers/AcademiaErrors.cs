using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Npgsql;
using Services.DTO;

namespace FluencyAPI.Controllers;

/// <summary>Traduce errores de negocio y de concurrencia del módulo académico a ProblemDetails con código estable.</summary>
public sealed class AcademiaErrors : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var operation = context.Exception as AcademiaOperationException;
        var postgres = context.Exception.GetBaseException() as PostgresException;
        if (postgres?.SqlState == PostgresErrorCodes.ForeignKeyViolation)
            operation = new(400, "REFERENCE_UNAVAILABLE", "La referencia no está disponible.");
        if (postgres?.SqlState is PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected or PostgresErrorCodes.UniqueViolation)
            operation = new(409, "CONCURRENT_CHANGE", "Los datos cambiaron. Recargue e intente nuevamente.");
        if (operation is null) return;
        var problem = new ProblemDetails { Status = operation.Status, Title = operation.Message };
        problem.Extensions["code"] = operation.Code;
        context.Result = new ObjectResult(problem) { StatusCode = operation.Status };
        context.ExceptionHandled = true;
    }
}
