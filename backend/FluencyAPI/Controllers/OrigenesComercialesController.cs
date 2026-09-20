using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController]
[Route("[controller]")]
public sealed class OrigenesComercialesController(IOrigenComercialService service) : ControllerBase
{
    /// <summary>Obtiene el listado de orígenes comerciales.</summary>
    /// <remarks>Incluye todos los registros, ordenados por descripción e id. Devuelve una lista vacía si no hay registros.</remarks>
    [HttpGet("ListadoOrigenesComerciales", Name = "ListadoOrigenesComerciales")]
    [ProducesResponseType(typeof(IReadOnlyList<OrigenComercialResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<OrigenComercialResponse>>> ListadoOrigenesComerciales(
        CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(cancellationToken));
}
