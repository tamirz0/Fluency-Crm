using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Services.Acceso;
using Services.DTO;
using Services.Implementations;
using System.ComponentModel.DataAnnotations;

namespace FluencyAPI.Controllers;

[ApiController, Route("usuarios")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(UsuarioErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public sealed class UsuariosController(UsuarioService users) : ControllerBase
{
    [HttpGet("/roles"), Authorize(Policy = RolesYPermisos.AdministrarUsuarios)]
    [ProducesResponseType<IReadOnlyList<RolResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RolResponse>>> Roles(CancellationToken ct) => Ok(await users.RolesAsync(ct));
    [HttpGet, Authorize(Policy = RolesYPermisos.AdministrarUsuarios)]
    [ProducesResponseType<PageResponse<UsuarioResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<UsuarioResponse>>> List([FromQuery] string? q, [FromQuery] bool? activo,
        [FromQuery] string? rol, CancellationToken ct, [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await users.ListAsync(new UsuarioQuery { Q = q, Activo = activo, Rol = rol, Page = page, PageSize = pageSize }, ct));
    [HttpGet("opciones")]
    [ProducesResponseType<PageResponse<UsuarioOpcionResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<UsuarioOpcionResponse>>> Options([FromQuery] string? q, [FromQuery] string? rol,
        CancellationToken ct, [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await users.OptionsAsync(new UsuarioQuery { Q = q, Rol = rol, Page = page, PageSize = pageSize }, ct));
    [HttpGet("{id:int}"), Authorize(Policy = RolesYPermisos.AdministrarUsuarios)]
    [ProducesResponseType<UsuarioResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<UsuarioResponse>> Get(int id, CancellationToken ct) => Ok(await users.GetAsync(id, ct));
    [HttpPost, Authorize(Policy = RolesYPermisos.AdministrarUsuarios)]
    [ProducesResponseType<UsuarioResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<UsuarioResponse>> Create([FromBody] CreateUsuarioRequest request, CancellationToken ct)
    {
        var result = await users.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }
    [HttpPatch("{id:int}"), Authorize(Policy = RolesYPermisos.AdministrarUsuarios)]
    [ProducesResponseType<UsuarioResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<UsuarioResponse>> Patch(int id, [FromBody] PatchUsuarioRequest request, CancellationToken ct) => Ok(await users.UpdateAsync(id, request, null, null, ct));
    [HttpPut("{id:int}/password"), Authorize(Policy = RolesYPermisos.AdministrarUsuarios)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Password(int id, [FromBody] UsuarioPasswordRequest request, CancellationToken ct)
    {
        await users.UpdateAsync(id, null, null, request.Password, ct); return NoContent();
    }
    [HttpPost("{id:int}/desactivar"), Authorize(Policy = RolesYPermisos.AdministrarUsuarios)]
    [ProducesResponseType<UsuarioResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<UsuarioResponse>> Deactivate(int id, CancellationToken ct) => Ok(await users.UpdateAsync(id, null, false, null, ct));
    [HttpPost("{id:int}/reactivar"), Authorize(Policy = RolesYPermisos.AdministrarUsuarios)]
    [ProducesResponseType<UsuarioResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<UsuarioResponse>> Reactivate(int id, CancellationToken ct) => Ok(await users.UpdateAsync(id, null, true, null, ct));
}

public sealed class UsuarioErrors : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var error = context.Exception;
        var operation = error as UsuarioOperationException;
        var postgres = (error is DbUpdateException ? error.InnerException : error) as PostgresException;
        if (postgres?.SqlState == PostgresErrorCodes.UniqueViolation)
            operation = new(409, "DUPLICATE_VALUE", "El usuario o correo ya existe.");
        if (postgres?.SqlState is PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected)
            operation = new(409, "CONCURRENT_CHANGE", "Los datos cambiaron. Recargue e intente nuevamente.");
        if (operation is null) return;
        var problem = new ProblemDetails { Status = operation.Status, Title = operation.Message };
        problem.Extensions["code"] = operation.Code;
        context.Result = new ObjectResult(problem) { StatusCode = operation.Status };
        context.ExceptionHandled = true;
    }
}
