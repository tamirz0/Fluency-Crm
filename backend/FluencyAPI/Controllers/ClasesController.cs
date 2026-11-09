using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Acceso;
using Services.DTO;
using Services.Implementations;

namespace FluencyAPI.Controllers;

[Authorize(Policy = RolesYPermisos.GestionarAcademia)]
[ApiController, Route("clases")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(AcademiaErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public sealed class ClasesController(ClaseService clases) : ControllerBase
{
    /// <summary>Clases del rango de fechas (máximo 93 días), de los cursos visibles para el actor.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ClaseResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ClaseResponse>>> List([FromQuery, Required] DateOnly desde, [FromQuery, Required] DateOnly hasta,
        [FromQuery, Range(1, int.MaxValue)] int? idCurso, [FromQuery, Range(1, int.MaxValue)] int? idProfesor, CancellationToken ct)
        => Ok(await clases.ListAsync(desde, hasta, idCurso, idProfesor, ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType<ClaseDetalleResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ClaseDetalleResponse>> Get(int id, CancellationToken ct) => Ok(await clases.GetAsync(id, ct));

    [HttpPost]
    [ProducesResponseType<ClaseDetalleResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<ClaseDetalleResponse>> Create([FromBody] CreateClaseRequest request, CancellationToken ct)
    {
        var result = await clases.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Clase.Id }, result);
    }

    /// <summary>Marca presente o ausente a alumnos del curso de la clase (upsert).</summary>
    [HttpPut("{id:int}/asistencia")]
    [ProducesResponseType<ClaseDetalleResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ClaseDetalleResponse>> SaveAttendance(int id, [FromBody] GuardarAsistenciaRequest request, CancellationToken ct)
        => Ok(await clases.SaveAttendanceAsync(id, request, ct));

    /// <summary>Carga notas de un examen (0 a 10).</summary>
    [HttpPut("{id:int}/notas")]
    [ProducesResponseType<ClaseDetalleResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ClaseDetalleResponse>> SaveGrades(int id, [FromBody] GuardarNotasRequest request, CancellationToken ct)
        => Ok(await clases.SaveGradesAsync(id, request, ct));
}
