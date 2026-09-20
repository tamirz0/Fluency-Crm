using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController]
[Route("[controller]")]
public sealed class EstadosClienteController(IEstadoClienteService service) : ControllerBase
{
    /// <summary>Obtiene el listado de estados de cliente.</summary>
    /// <remarks>Incluye todos los registros, ordenados por descripción e id. Devuelve una lista vacía si no hay registros.</remarks>
    [HttpGet("ListadoEstadosCliente", Name = "ListadoEstadosCliente")]
    [ProducesResponseType(typeof(IReadOnlyList<EstadoClienteResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<EstadoClienteResponse>>> ListadoEstadosCliente(
        CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(cancellationToken));
}
