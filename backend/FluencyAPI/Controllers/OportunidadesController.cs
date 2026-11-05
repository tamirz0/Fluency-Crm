using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Npgsql;
using Services.Acceso;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController, Route("oportunidades")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(OportunidadErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public sealed class OportunidadesController(IOportunidadService oportunidades) : ControllerBase
{
    /// <summary>Consulta una oportunidad vigente, también ajena (lectura compartida).</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<OportunidadResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<OportunidadResponse>> Get(int id, CancellationToken ct) => Ok(await oportunidades.GetAsync(id, ct));

    /// <summary>
    /// Crea una oportunidad con su historial inicial en una sola transacción. Sin etapa usa la primera abierta activa del embudo;
    /// sin valor copia el precio del servicio; sin responsable usa al actor. El vendedor solo crea a su nombre.
    /// </summary>
    [HttpPost, Authorize(Policy = RolesYPermisos.GestionarOportunidad)]
    [ProducesResponseType<OportunidadResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<OportunidadResponse>> Create([FromBody] CreateOportunidadRequest request, CancellationToken ct)
    {
        var result = await oportunidades.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }
}

public sealed class OportunidadErrors : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var operation = context.Exception as OportunidadOperationException;
        var postgres = context.Exception.GetBaseException() as PostgresException;
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
