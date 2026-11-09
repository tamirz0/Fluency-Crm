using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Acceso;
using Services.DTO;
using Services.Implementations;

namespace FluencyAPI.Controllers;

/// <summary>Lo académico visible desde la ficha comercial del contacto, para los roles que ya consultan contactos.</summary>
[Authorize(Policy = RolesYPermisos.ConsultarComercial)]
[ApiController, Route("contactos/{id:int}/academico")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(AcademiaErrors))]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
public sealed class ContactoAcademicoController(AlumnoService alumnos) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<ContactoAcademicoResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ContactoAcademicoResponse>> Get(int id, CancellationToken ct) => Ok(await alumnos.AcademicoDeContactoAsync(id, ct));
}
