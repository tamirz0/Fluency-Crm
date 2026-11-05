using System.ComponentModel.DataAnnotations;
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
    /// <summary>Lista todas las oportunidades vigentes (lectura compartida), con filtros previos al conteo; creación e ID descendentes.</summary>
    [HttpGet]
    [ProducesResponseType<PageResponse<OportunidadResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<OportunidadResponse>>> List([FromQuery] string? q,
        [FromQuery, Range(1, int.MaxValue)] int? idResponsable, [FromQuery, Range(1, int.MaxValue)] int? idEmpresa,
        [FromQuery, Range(1, int.MaxValue)] int? idContacto, [FromQuery, Range(1, int.MaxValue)] int? idEmbudo,
        [FromQuery, Range(1, int.MaxValue)] int? idEtapa, [FromQuery, RegularExpression("^(ABIERTA|GANADA|PERDIDA)$")] string? estado,
        [FromQuery, Range(1, int.MaxValue)] int? idOrigen, CancellationToken ct,
        [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await oportunidades.ListAsync(new(q, idResponsable, idEmpresa, idContacto, idEmbudo, idEtapa, estado, idOrigen), page, pageSize, ct));

    /// <summary>Historial de etapas de una oportunidad vigente, paginado por fecha e ID ascendentes. Solo lectura.</summary>
    [HttpGet("{id:int}/historial-etapas")]
    [ProducesResponseType<PageResponse<HistorialEtapaResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<HistorialEtapaResponse>>> Historial(int id, CancellationToken ct,
        [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await oportunidades.HistorialAsync(id, page, pageSize, ct));

    /// <summary>
    /// Funnel de un embudo (activo o no): columnas activas, también vacías y finales. El vendedor siempre recibe su propia cartera;
    /// administrador y responsable comercial ven todas y pueden filtrar por responsable.
    /// </summary>
    [HttpGet("/embudos/{id:int}/funnel")]
    [ProducesResponseType<FunnelResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<FunnelResponse>> Funnel(int id, [FromQuery, Range(1, int.MaxValue)] int? idResponsable, CancellationToken ct)
        => Ok(await oportunidades.FunnelAsync(id, idResponsable, ct));

    /// <summary>Consulta una oportunidad vigente, también ajena (lectura compartida).</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<OportunidadResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<OportunidadResponse>> Get(int id, CancellationToken ct) => Ok(await oportunidades.GetAsync(id, ct));

    /// <summary>
    /// Edita atómicamente los campos enviados de una oportunidad abierta. Solo el responsable vendedor o un superior; una cerrada
    /// exige reapertura. Responsable, etapa, cierre y baja usan comandos específicos.
    /// </summary>
    [HttpPatch("{id:int}"), Authorize(Policy = RolesYPermisos.GestionarOportunidad)]
    [ProducesResponseType<OportunidadResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<OportunidadResponse>> Patch(int id, [FromBody] PatchOportunidadRequest request, CancellationToken ct)
        => Ok(await oportunidades.PatchAsync(id, request, ct));

    /// <summary>
    /// Reasigna una oportunidad abierta. El responsable vendedor solo puede elegir otro vendedor activo; un superior, cualquier usuario activo.
    /// Devuelve las acciones recalculadas: quien la pierde conserva la lectura y recibe 403 en su siguiente mutación.
    /// </summary>
    [HttpPost("{id:int}/reasignar"), Authorize(Policy = RolesYPermisos.GestionarOportunidad)]
    [ProducesResponseType<OportunidadResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<OportunidadResponse>> Reasignar(int id, [FromBody] ReasignarOportunidadRequest request, CancellationToken ct)
        => Ok(await oportunidades.ReasignarAsync(id, request, ct));

    /// <summary>
    /// Mueve una oportunidad abierta a otra etapa abierta y activa de su embudo, con su entrada de historial (autor: la sesión).
    /// Mismo destino: sin cambios ni historial. Las etapas finales se alcanzan con ganar/perder.
    /// </summary>
    [HttpPost("{id:int}/mover"), Authorize(Policy = RolesYPermisos.GestionarOportunidad)]
    [ProducesResponseType<OportunidadResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<OportunidadResponse>> Mover(int id, [FromBody] MoverOportunidadRequest request, CancellationToken ct)
        => Ok(await oportunidades.MoverAsync(id, request, ct));

    /// <summary>
    /// Cierra una oportunidad abierta como ganada: exige fecha y valor final (cero es válido) y la mueve a la etapa final ganada del embudo.
    /// Repetir el cierre responde 409.
    /// </summary>
    [HttpPost("{id:int}/ganar"), Authorize(Policy = RolesYPermisos.GestionarOportunidad)]
    [ProducesResponseType<OportunidadResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<OportunidadResponse>> Ganar(int id, [FromBody] GanarOportunidadRequest request, CancellationToken ct)
        => Ok(await oportunidades.GanarAsync(id, request, ct));

    /// <summary>Cierra una oportunidad abierta como perdida: exige fecha y un motivo de pérdida activo; conserva el valor vigente.</summary>
    [HttpPost("{id:int}/perder"), Authorize(Policy = RolesYPermisos.GestionarOportunidad)]
    [ProducesResponseType<OportunidadResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<OportunidadResponse>> Perder(int id, [FromBody] PerderOportunidadRequest request, CancellationToken ct)
        => Ok(await oportunidades.PerderAsync(id, request, ct));

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
