using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController]
[Route("[controller]")]
public sealed class EtapasComercialesController(IEtapaComercialService service) : ControllerBase
{
    /// <summary>Obtiene el listado de etapas comerciales.</summary>
    /// <remarks>Incluye todos los registros, ordenados por orden e id. Devuelve una lista vacía si no hay registros. No incluye oportunidades; también devuelve etapas sin oportunidades.</remarks>
    [HttpGet("ListadoEtapasComerciales", Name = "ListadoEtapasComerciales")]
    [ProducesResponseType(typeof(IReadOnlyList<EtapaComercialResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<EtapaComercialResponse>>> ListadoEtapasComerciales(
        CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(cancellationToken));
}
