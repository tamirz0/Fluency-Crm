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
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public sealed class AlumnosController(AlumnoService alumnos) : ControllerBase
{
    /// <summary>Lista alumnos visibles para el actor (el Profesor, solo los de sus niveles), ordenados por apellido y nombre.</summary>
    [HttpGet]
    [ProducesResponseType<PageResponse<AlumnoResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<AlumnoResponse>>> List([FromQuery] string? q, [FromQuery, Range(1, int.MaxValue)] int? idNivel,
        [FromQuery, Range(1, int.MaxValue)] int? idCurso, [FromQuery] bool? sinCurso, CancellationToken ct,
        [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await alumnos.ListAsync(q, idNivel, idCurso, sinCurso, page, pageSize, ct));

    /// <summary>Asistencia del alumno: presentes sobre las clases de su curso hasta hoy, y el detalle por clase.</summary>
    [HttpGet("{id:int}/asistencia")]
    [ProducesResponseType<AsistenciaAlumnoResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AsistenciaAlumnoResponse>> Attendance(int id, CancellationToken ct) => Ok(await alumnos.AsistenciaAsync(id, ct));

    /// <summary>Contactos Cliente que todavía no son alumnos, para dar de alta. Solo el Administrador.</summary>
    [HttpGet("candidatos")]
    [ProducesResponseType<PageResponse<AlumnoCandidatoResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<AlumnoCandidatoResponse>>> Candidates([FromQuery] string? q, CancellationToken ct,
        [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await alumnos.CandidatesAsync(q, page, pageSize, ct));

    /// <summary>Alta de un alumno desde un contacto en estado Cliente, con nivel y curso opcional. Solo el Administrador.</summary>
    [HttpPost]
    [ProducesResponseType<AlumnoResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<AlumnoResponse>> Create([FromBody] CreateAlumnoRequest request, CancellationToken ct)
    {
        var result = await alumnos.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    /// <summary>Cambia el nivel de inglés; si el curso actual es de otro nivel, el alumno queda sin curso.</summary>
    [HttpPut("{id:int}/nivel")]
    [ProducesResponseType<AlumnoResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AlumnoResponse>> ChangeLevel(int id, [FromBody] CambiarNivelAlumnoRequest request, CancellationToken ct)
        => Ok(await alumnos.ChangeLevelAsync(id, request, ct));

    /// <summary>Asigna, cambia o quita (idCurso nulo) el curso del alumno.</summary>
    [HttpPut("{id:int}/curso")]
    [ProducesResponseType<AlumnoResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AlumnoResponse>> ChangeCourse(int id, [FromBody] CambiarCursoAlumnoRequest request, CancellationToken ct)
        => Ok(await alumnos.ChangeCourseAsync(id, request, ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType<AlumnoResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AlumnoResponse>> Get(int id, CancellationToken ct) => Ok(await alumnos.GetAsync(id, ct));
}
