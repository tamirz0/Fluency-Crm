using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Implementations;

namespace FluencyAPI.Controllers;

[ApiController, Route("inicio")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
public sealed class InicioController(InicioService inicio) : ControllerBase
{
    /// <summary>Cifras globales del inicio (alumnos, oportunidades abiertas y cerradas este mes); lectura compartida por los roles autenticados.</summary>
    [HttpGet("resumen")]
    [ProducesResponseType<InicioResumenResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<InicioResumenResponse>> Resumen(CancellationToken ct) => Ok(await inicio.ResumenAsync(ct));
}
