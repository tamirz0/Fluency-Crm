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

[ApiController, Route("catalogos/{catalogo}")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(CatalogoErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public sealed class CatalogosController(CatalogoService catalogs) : ControllerBase
{
    [HttpGet, Authorize(Policy = RolesYPermisos.AdministrarConfiguracion)]
    [ProducesResponseType<PageResponse<CatalogoResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<CatalogoResponse>>> List(string catalogo, [FromQuery] string? q, CancellationToken ct,
        [FromQuery] string activo = "true", [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await catalogs.ListAsync(catalogo, q, activo, page, pageSize, ct));

    [HttpGet("opciones")]
    [ProducesResponseType<IReadOnlyList<CatalogoResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CatalogoResponse>>> Options(string catalogo, [FromQuery] string? q, CancellationToken ct)
        => Ok(await catalogs.OptionsAsync(catalogo, q, ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType<CatalogoResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CatalogoResponse>> Get(string catalogo, int id, CancellationToken ct) => Ok(await catalogs.GetAsync(catalogo, id, ct));

    [HttpGet("/estados-oportunidad")]
    [ProducesResponseType<IReadOnlyList<EstadoOportunidadResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<EstadoOportunidadResponse>>> States(CancellationToken ct) => Ok(await catalogs.StatesAsync(ct));

    [HttpPost, Authorize(Policy = RolesYPermisos.AdministrarConfiguracion)]
    [ProducesResponseType<CatalogoResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<CatalogoResponse>> Create(string catalogo, [FromBody] CatalogoRequest request, CancellationToken ct)
    {
        var result = await catalogs.WriteAsync(catalogo, null, request, null, ct);
        return CreatedAtAction(nameof(Get), new { catalogo, id = result.Id }, result);
    }
    [HttpPatch("{id:int}"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion)]
    [ProducesResponseType<CatalogoResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CatalogoResponse>> Patch(string catalogo, int id, [FromBody] CatalogoRequest request, CancellationToken ct)
        => Ok(await catalogs.WriteAsync(catalogo, id, request, null, ct));

    [HttpPost("{id:int}/desactivar"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion)]
    [ProducesResponseType<CatalogoResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CatalogoResponse>> Deactivate(string catalogo, int id, CancellationToken ct)
        => Ok(await catalogs.WriteAsync(catalogo, id, null, false, ct));

    [HttpPost("{id:int}/reactivar"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion)]
    [ProducesResponseType<CatalogoResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CatalogoResponse>> Reactivate(string catalogo, int id, CancellationToken ct)
        => Ok(await catalogs.WriteAsync(catalogo, id, null, true, ct));
}

public sealed class CatalogoErrors : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var operation = context.Exception as CatalogoOperationException;
        var postgres = (context.Exception is DbUpdateException ? context.Exception.InnerException : context.Exception) as PostgresException;
        if (postgres?.SqlState == PostgresErrorCodes.UniqueViolation)
            operation = new(409, "DUPLICATE_VALUE", "Ya existe una opción con esa etiqueta.");
        if (postgres?.SqlState is PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected)
            operation = new(409, "CONCURRENT_CHANGE", "Los datos cambiaron. Recargue e intente nuevamente.");
        if (operation is null) return;
        var problem = new ProblemDetails { Status = operation.Status, Title = operation.Message };
        problem.Extensions["code"] = operation.Code;
        context.Result = new ObjectResult(problem) { StatusCode = operation.Status };
        context.ExceptionHandled = true;
    }
}
