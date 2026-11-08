using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Services.Acceso;
using Services.DTO;
using Services.Implementations;

namespace FluencyAPI.Controllers;

[ApiController, Route("embudos")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(ConfiguracionErrors))]
[ProducesResponseType<ValidationProblemDetails>(400)]
[ProducesResponseType<ProblemDetails>(401)]
[ProducesResponseType<ProblemDetails>(403)]
[ProducesResponseType<ProblemDetails>(404)]
[ProducesResponseType<ProblemDetails>(409)]
public sealed class EmbudosController(EmbudoService service) : ControllerBase
{
    /// <summary>Lista embudos; solo administrador consulta inactivos.</summary>
    [HttpGet, ProducesResponseType<PageResponse<EmbudoResponse>>(200)]
    public async Task<ActionResult<PageResponse<EmbudoResponse>>> List([FromQuery] string? q, CancellationToken ct,
        [FromQuery] string activo = "true", [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await service.ListAsync(q, activo, page, pageSize, ct));
    /// <summary>Consulta un embudo y sus referencias conservadas.</summary>
    [HttpGet("{id:int}"), ProducesResponseType<EmbudoResponse>(200)]
    public async Task<ActionResult<EmbudoResponse>> Get(int id, CancellationToken ct) => Ok(await service.GetAsync(id, ct));
    /// <summary>Crea embudo y sus dos finales en una transacción.</summary>
    [HttpPost, Authorize(Policy = RolesYPermisos.AdministrarConfiguracion), ProducesResponseType<EmbudoResponse>(201)]
    public async Task<ActionResult<EmbudoResponse>> Create([FromBody] EmbudoRequest request, CancellationToken ct)
    {
        var result = await service.WriteAsync(null, request, null, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }
    /// <summary>Edita sin reinterpretar negociaciones históricas.</summary>
    [HttpPatch("{id:int}"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion), ProducesResponseType<EmbudoResponse>(200)]
    public async Task<ActionResult<EmbudoResponse>> Patch(int id, [FromBody] EmbudoRequest request, CancellationToken ct) => Ok(await service.WriteAsync(id, request, null, ct));
    /// <summary>Desactiva si no tiene oportunidades abiertas y activas.</summary>
    [HttpPost("{id:int}/desactivar"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion), ProducesResponseType<EmbudoResponse>(200)]
    public async Task<ActionResult<EmbudoResponse>> Deactivate(int id, CancellationToken ct) => Ok(await service.WriteAsync(id, null, false, ct));
    /// <summary>Reactiva solo el embudo.</summary>
    [HttpPost("{id:int}/reactivar"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion), ProducesResponseType<EmbudoResponse>(200)]
    public async Task<ActionResult<EmbudoResponse>> Reactivate(int id, CancellationToken ct) => Ok(await service.WriteAsync(id, null, true, ct));
}

public sealed class ConfiguracionErrors : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var operation = context.Exception as ConfiguracionOperationException;
        var postgres = (context.Exception is DbUpdateException ? context.Exception.InnerException : context.Exception) as PostgresException;
        if (postgres?.SqlState == PostgresErrorCodes.ForeignKeyViolation) operation = new(400, "REFERENCE_UNAVAILABLE", "La referencia no está disponible.");
        if (postgres?.SqlState == PostgresErrorCodes.UniqueViolation) operation = new(409, "DUPLICATE_VALUE", "El orden o la etapa final ya existe. Recargue los datos.");
        if (postgres?.SqlState is PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected) operation = new(409, "CONCURRENT_CHANGE", "Los datos cambiaron. Recargue e intente nuevamente.");
        if (operation is null) return;
        var problem = new ProblemDetails { Status = operation.Status, Title = operation.Message };
        problem.Extensions["code"] = operation.Code;
        context.Result = new ObjectResult(problem) { StatusCode = operation.Status };
        context.ExceptionHandled = true;
    }
}
