using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController]
[Route("[controller]")]
public sealed class ServiciosController(IServicioService servicioService) : ControllerBase
{
    /// <summary>Obtiene los servicios activos disponibles para las oportunidades.</summary>
    /// <remarks>Ordenados por nombre e id. Excluye activo falso o nulo; devuelve una lista vacía si no hay servicios activos.</remarks>
    [HttpGet("ListadoServicios", Name = "ListadoServicios")]
    [ProducesResponseType(typeof(IReadOnlyList<ServicioResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ServicioResponse>>> ListadoServicios(
        CancellationToken cancellationToken)
        => Ok(await servicioService.GetAllAsync(cancellationToken));
}
