using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Services.Acceso;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController, Route("servicios")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(ServicioErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public sealed class ServiciosController(IServicioService services) : ControllerBase
{
    /// <summary>Lista paginada; operadores consultan activos, administrador puede filtrar inactivos/todos.</summary>
    [HttpGet]
    [ProducesResponseType<PageResponse<ServicioResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<ServicioResponse>>> List([FromQuery] string? q, CancellationToken ct,
        [FromQuery] string activo = "true", [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await services.ListAsync(q, activo, page, pageSize, ct));

    /// <summary>Consulta el servicio conservando referencias inactivas.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<ServicioResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ServicioResponse>> Get(int id, CancellationToken ct) => Ok(await services.GetAsync(id, ct));

    /// <summary>Crea un servicio activo; precio requerido, cero válido.</summary>
    [HttpPost, Authorize(Policy = RolesYPermisos.AdministrarConfiguracion)]
    [ProducesResponseType<ServicioResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<ServicioResponse>> Create([FromBody] ServicioRequest request, CancellationToken ct)
    {
        var result = await services.WriteAsync(null, request, null, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }
    /// <summary>Edita los campos enviados, sin modificar embudos ni oportunidades.</summary>
    [HttpPatch("{id:int}"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion)]
    [ProducesResponseType<ServicioResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ServicioResponse>> Patch(int id, [FromBody] ServicioRequest request, CancellationToken ct)
        => Ok(await services.WriteAsync(id, request, null, ct));
    /// <summary>Desactiva el servicio conservando sus embudos.</summary>
    [HttpPost("{id:int}/desactivar"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion)]
    [ProducesResponseType<ServicioResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ServicioResponse>> Deactivate(int id, CancellationToken ct)
        => Ok(await services.WriteAsync(id, null, false, ct));
    /// <summary>Reactiva el servicio sin restaurar otros registros.</summary>
    [HttpPost("{id:int}/reactivar"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion)]
    [ProducesResponseType<ServicioResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ServicioResponse>> Reactivate(int id, CancellationToken ct)
        => Ok(await services.WriteAsync(id, null, true, ct));
}

public sealed class ServicioErrors : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var operation = context.Exception as ServicioOperationException;
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
