using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController, Route("actividades")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(OportunidadErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public sealed class ActividadesController(IActividadService actividades) : ControllerBase
{
    /// <summary>
    /// Lista las actividades vigentes (lectura compartida) con filtros previos al conteo, ordenadas por la fecha del hecho descendente.
    /// <c>desde</c> es inclusivo y <c>hasta</c> exclusivo.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<PageResponse<ActividadResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<ActividadResponse>>> List([FromQuery] string? q,
        [FromQuery, Range(1, int.MaxValue)] int? idEmpresa, [FromQuery, Range(1, int.MaxValue)] int? idContacto, [FromQuery, Range(1, int.MaxValue)] int? idOportunidad,
        [FromQuery, Range(1, int.MaxValue)] int? idTipo, [FromQuery, Range(1, int.MaxValue)] int? idUsuario, [FromQuery] DateTimeOffset? desde, [FromQuery] DateTimeOffset? hasta,
        CancellationToken ct, [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await actividades.ListAsync(new(q, idEmpresa, idContacto, idOportunidad, idTipo, idUsuario, desde, hasta), page, pageSize, ct));

    /// <summary>Consulta una actividad vigente, también ajena. Una dada de baja responde 404.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<ActividadResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ActividadResponse>> Get(int id, CancellationToken ct) => Ok(await actividades.GetAsync(id, ct));

    /// <summary>
    /// Edita los campos enviados. Exige gestionar la oportunidad de origen y, si se cambia o quita, también la de destino; el autor y la
    /// fecha de registro no cambian.
    /// </summary>
    [HttpPatch("{id:int}")]
    [ProducesResponseType<ActividadResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ActividadResponse>> Patch(int id, [FromBody] PatchActividadRequest request, CancellationToken ct)
        => Ok(await actividades.PatchAsync(id, request, ct));

    /// <summary>Baja lógica sin restauración ni cascadas (204). Repetirla responde 404.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await actividades.DeleteAsync(id, ct);
        return NoContent();
    }

    /// <summary>
    /// Registra una actividad ya realizada. El autor y la fecha de registro los fija el servidor. Sin oportunidad cualquier usuario activo
    /// gestiona; con oportunidad, solo su responsable vendedor o un superior (también si está cerrada).
    /// </summary>
    [HttpPost]
    [ProducesResponseType<ActividadResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<ActividadResponse>> Create([FromBody] CreateActividadRequest request, CancellationToken ct)
    {
        var result = await actividades.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }
}
