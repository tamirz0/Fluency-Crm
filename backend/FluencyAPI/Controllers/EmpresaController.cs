using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController, Route("empresas")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(EmpresaErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public sealed class EmpresaController(IEmpresaService empresas) : ControllerBase
{
    /// <summary>Lista empresas compartidas, con filtros previos al conteo y orden razón social/ID.</summary>
    [HttpGet]
    [ProducesResponseType<PageResponse<EmpresaResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<EmpresaResponse>>> List([FromQuery] string? q,
        [FromQuery, Range(1, int.MaxValue)] int? idEstado, [FromQuery, Range(1, int.MaxValue)] int? idOrigen,
        [FromQuery, Range(1, int.MaxValue)] int? idResponsable, CancellationToken ct,
        [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await empresas.ListAsync(q, idEstado, idOrigen, idResponsable, page, pageSize, ct));

    /// <summary>Consulta una empresa vigente, con referencias históricas legibles.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<EmpresaResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<EmpresaResponse>> Get(int id, CancellationToken ct) => Ok(await empresas.GetAsync(id, ct));

    /// <summary>Crea una empresa compartida; defaults de responsable y estado desde el servidor.</summary>
    [HttpPost]
    [ProducesResponseType<EmpresaResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<EmpresaResponse>> Create([FromBody] EmpresaRequest request, CancellationToken ct)
    {
        var result = await empresas.WriteAsync(null, request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    /// <summary>Edita atómicamente campos enviados; omisión conserva y null limpia opcionales.</summary>
    [HttpPatch("{id:int}")]
    [ProducesResponseType<EmpresaResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<EmpresaResponse>> Patch(int id, [FromBody] EmpresaRequest request, CancellationToken ct)
        => Ok(await empresas.WriteAsync(id, request, ct));
}

public sealed class EmpresaErrors : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var operation = context.Exception as EmpresaOperationException;
        var postgres = (context.Exception is DbUpdateException ? context.Exception.InnerException : context.Exception) as PostgresException;
        if (postgres?.SqlState == PostgresErrorCodes.ForeignKeyViolation)
            operation = new(400, "REFERENCE_UNAVAILABLE", "La referencia no está disponible.");
        if (postgres?.SqlState is PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected)
            operation = new(409, "CONCURRENT_CHANGE", "Los datos cambiaron. Recargue e intente nuevamente.");
        if (operation is null) return;
        var problem = new ProblemDetails { Status = operation.Status, Title = operation.Message };
        problem.Extensions["code"] = operation.Code;
        context.Result = new ObjectResult(problem) { StatusCode = operation.Status };
        context.ExceptionHandled = true;
    }
}
