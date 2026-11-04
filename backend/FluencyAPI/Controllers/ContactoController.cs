using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Npgsql;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController, Route("contactos")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(ContactoErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public sealed class ContactoController(IContactoService contactos) : ControllerBase
{
    /// <summary>Lista contactos compartidos, con filtros previos al conteo y orden apellido/nombre/ID.</summary>
    [HttpGet]
    [ProducesResponseType<PageResponse<ContactoResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<ContactoResponse>>> List([FromQuery] string? q,
        [FromQuery, Range(1, int.MaxValue)] int? idEstado, [FromQuery, Range(1, int.MaxValue)] int? idOrigen,
        [FromQuery, Range(1, int.MaxValue)] int? idResponsable, [FromQuery, Range(1, int.MaxValue)] int? idEmpresa,
        CancellationToken ct, [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await contactos.ListAsync(q, idEstado, idOrigen, idResponsable, idEmpresa, page, pageSize, ct));

    /// <summary>Consulta un contacto vigente, con referencias históricas legibles.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<ContactoResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ContactoResponse>> Get(int id, CancellationToken ct) => Ok(await contactos.GetAsync(id, ct));

    /// <summary>Crea un contacto compartido; defaults de responsable y estado desde el servidor.</summary>
    [HttpPost]
    [ProducesResponseType<ContactoResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<ContactoResponse>> Create([FromBody] ContactoRequest request, CancellationToken ct)
    {
        var result = await contactos.WriteAsync(null, request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    /// <summary>Edita atómicamente campos enviados; omisión conserva y null limpia opcionales. Cambiar la empresa solo afecta al contacto.</summary>
    [HttpPatch("{id:int}")]
    [ProducesResponseType<ContactoResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ContactoResponse>> Patch(int id, [FromBody] ContactoRequest request, CancellationToken ct)
        => Ok(await contactos.WriteAsync(id, request, ct));

    /// <summary>Baja definitiva (sin borrado físico ni restauración); bloqueada por oportunidades activas, con la causa en el 409.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await contactos.DeleteAsync(id, ct);
        return NoContent();
    }
}

public sealed class ContactoErrors : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var operation = context.Exception as ContactoOperationException;
        // Con transacciones de usuario EF envuelve el error de PostgreSQL (p. ej. 40001) en varios niveles: se toma el original.
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
