using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Acceso;
using Services.DTO;
using Services.Implementations;

namespace FluencyAPI.Controllers;

[Authorize(Policy = RolesYPermisos.GestionarAcademia)]
[ApiController, Route("cursos")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(AcademiaErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public sealed class CursosController(CursoService cursos) : ControllerBase
{
    /// <summary>Lista los cursos visibles (el Profesor, solo los propios), con cantidad de alumnos y clases.</summary>
    [HttpGet]
    [ProducesResponseType<PageResponse<CursoResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<CursoResponse>>> List([FromQuery, Range(1, int.MaxValue)] int? idProfesor,
        [FromQuery, Range(1, int.MaxValue)] int? idNivel, CancellationToken ct,
        [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await cursos.ListAsync(idProfesor, idNivel, page, pageSize, ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType<CursoDetalleResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CursoDetalleResponse>> Get(int id, CancellationToken ct) => Ok(await cursos.GetAsync(id, ct));

    /// <summary>Crea un curso de un nivel del profesor, con alumnos opcionales de ese nivel.</summary>
    [HttpPost]
    [ProducesResponseType<CursoDetalleResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<CursoDetalleResponse>> Create([FromBody] CreateCursoRequest request, CancellationToken ct)
    {
        var result = await cursos.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Curso.Id }, result);
    }

    /// <summary>Baja del curso: sus alumnos quedan sin curso y sus clases dejan de listarse.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await cursos.DeleteAsync(id, ct);
        return NoContent();
    }

    /// <summary>Suma alumnos del mismo nivel y sin curso; todo o nada. Para quitar o cambiar el curso de un alumno, PUT /alumnos/{id}/curso.</summary>
    [HttpPost("{id:int}/alumnos")]
    [ProducesResponseType<CursoDetalleResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CursoDetalleResponse>> AddStudents(int id, [FromBody] AgregarAlumnosRequest request, CancellationToken ct)
        => Ok(await cursos.AddStudentsAsync(id, request, ct));
}
