using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Acceso;
using Services.DTO;
using Services.Implementations;

namespace FluencyAPI.Controllers;

[Authorize(Policy = RolesYPermisos.GestionarAcademia)]
[ApiController, Route("alumnos")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(AcademiaErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
public sealed class AlumnosController(AlumnoService alumnos) : ControllerBase
{
    /// <summary>Lista alumnos visibles para el actor (el Profesor, solo los de sus niveles), ordenados por apellido y nombre.</summary>
    [HttpGet]
    [ProducesResponseType<PageResponse<AlumnoResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<AlumnoResponse>>> List([FromQuery] string? q, [FromQuery, Range(1, int.MaxValue)] int? idNivel,
        [FromQuery, Range(1, int.MaxValue)] int? idCurso, [FromQuery] bool? sinCurso, CancellationToken ct,
        [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await alumnos.ListAsync(q, idNivel, idCurso, sinCurso, page, pageSize, ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType<AlumnoResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AlumnoResponse>> Get(int id, CancellationToken ct) => Ok(await alumnos.GetAsync(id, ct));
}
