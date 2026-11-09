using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Acceso;
using Services.DTO;
using Services.Implementations;

namespace FluencyAPI.Controllers;

[Authorize(Policy = RolesYPermisos.GestionarAcademia)]
[ApiController, Route("profesores")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(AcademiaErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public sealed class ProfesoresController(ProfesorService profesores) : ControllerBase
{
    /// <summary>Profesores con sus niveles, cursos y clases. Solo el Administrador.</summary>
    [HttpGet, Authorize(Policy = RolesYPermisos.AdministrarProfesores)]
    [ProducesResponseType<IReadOnlyList<ProfesorResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProfesorResponse>>> List(CancellationToken ct, [FromQuery] bool incluirInactivos = false)
        => Ok(await profesores.ListAsync(incluirInactivos, ct));

    /// <summary>Niveles de inglés disponibles y los que el profesor autenticado marcó como propios.</summary>
    [HttpGet("yo/niveles")]
    [ProducesResponseType<NivelesProfesorResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<NivelesProfesorResponse>> GetLevels(CancellationToken ct) => Ok(await profesores.GetLevelsAsync(ct));

    /// <summary>Reemplaza los niveles del profesor autenticado; la identidad sale de la sesión.</summary>
    [HttpPut("yo/niveles")]
    [ProducesResponseType<NivelesProfesorResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<NivelesProfesorResponse>> SetLevels([FromBody] NivelesProfesorRequest request, CancellationToken ct)
        => Ok(await profesores.SetLevelsAsync(request, ct));
}
