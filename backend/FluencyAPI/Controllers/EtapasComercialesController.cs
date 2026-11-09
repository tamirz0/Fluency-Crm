using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Services.Acceso;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[Authorize(Policy = RolesYPermisos.ConsultarComercial)]
[ApiController, Route("etapas")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(ConfiguracionErrors))]
[ProducesResponseType<ValidationProblemDetails>(400)]
[ProducesResponseType<ProblemDetails>(401)]
[ProducesResponseType<ProblemDetails>(403)]
[ProducesResponseType<ProblemDetails>(404)]
[ProducesResponseType<ProblemDetails>(409)]
public sealed class EtapasComercialesController(IEtapaComercialService service) : ControllerBase
{
    /// <summary>Etapas del embudo, por orden; conserva referencias inactivas.</summary>
    [HttpGet("/embudos/{id:int}/etapas"), ProducesResponseType<IReadOnlyList<EtapaComercialResponse>>(200)]
    public async Task<ActionResult<IReadOnlyList<EtapaComercialResponse>>> List(int id, CancellationToken ct, [FromQuery] string activo = "true")
        => Ok(await service.ListAsync(id, activo, ct));
    /// <summary>Consulta una etapa aun si está inactiva.</summary>
    [HttpGet("{id:int}"), ProducesResponseType<EtapaComercialResponse>(200)]
    public async Task<ActionResult<EtapaComercialResponse>> Get(int id, CancellationToken ct) => Ok(await service.GetAsync(id, ct));
    /// <summary>Crea exclusivamente una etapa abierta.</summary>
    [HttpPost("/embudos/{id:int}/etapas"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion), ProducesResponseType<EtapaComercialResponse>(201)]
    public async Task<ActionResult<EtapaComercialResponse>> Create(int id, [FromBody] EtapaComercialRequest request, CancellationToken ct)
    {
        var result = await service.WriteAsync(null, id, request, null, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }
    /// <summary>Edita textos y orden; solo una abierta sin uso puede cambiar de embudo.</summary>
    [HttpPatch("{id:int}"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion), ProducesResponseType<EtapaComercialResponse>(200)]
    public async Task<ActionResult<EtapaComercialResponse>> Patch(int id, [FromBody] EtapaComercialRequest request, CancellationToken ct)
        => Ok(await service.WriteAsync(id, null, request, null, ct));
    /// <summary>Desactiva una abierta sin oportunidades vigentes situadas en ella.</summary>
    [HttpPost("{id:int}/desactivar"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion), ProducesResponseType<EtapaComercialResponse>(200)]
    public async Task<ActionResult<EtapaComercialResponse>> Deactivate(int id, CancellationToken ct) => Ok(await service.WriteAsync(id, null, null, false, ct));
    /// <summary>Reactiva una abierta al final del orden activo.</summary>
    [HttpPost("{id:int}/reactivar"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion), ProducesResponseType<EtapaComercialResponse>(200)]
    public async Task<ActionResult<EtapaComercialResponse>> Reactivate(int id, CancellationToken ct) => Ok(await service.WriteAsync(id, null, null, true, ct));
    /// <summary>Reordena todas las activas en una transacción, sin cambiar activo.</summary>
    [HttpPut("/embudos/{id:int}/orden-etapas"), Authorize(Policy = RolesYPermisos.AdministrarConfiguracion), ProducesResponseType<IReadOnlyList<EtapaComercialResponse>>(200)]
    public async Task<ActionResult<IReadOnlyList<EtapaComercialResponse>>> Reorder(int id, [FromBody] OrdenEtapasRequest request, CancellationToken ct)
        => Ok(await service.ReorderAsync(id, request, ct));
}
