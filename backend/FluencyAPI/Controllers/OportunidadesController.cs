using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController]
[Route("[controller]")]
public sealed class OportunidadesController(IOportunidadService oportunidadService) : ControllerBase
{
    /// <summary>Da de alta una nueva oportunidad.</summary>
    [HttpPost("AltaOportunidad", Name = "AltaOportunidad")]
    [ProducesResponseType(typeof(OportunidadResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<OportunidadResponse>> AltaOportunidad(
        [FromBody] CreateOportunidadRequest request,
        CancellationToken cancellationToken)
    {
        var result = await oportunidadService.CreateAsync(request, cancellationToken);

        return result.Outcome switch
        {
            CreateOportunidadOutcome.Success
                => Created($"/Oportunidades/{result.Oportunidad!.Id}", result.Oportunidad),
            CreateOportunidadOutcome.ValidationFailed => BadRequest(new { errors = result.Errors }),
            _ => Problem()
        };
    }

    /// <summary>Devuelve todas las oportunidades agrupadas por etapa comercial (vista de embudo).</summary>
    [HttpGet("OportunidadesPorEtapa", Name = "OportunidadesPorEtapa")]
    [ProducesResponseType(typeof(IReadOnlyList<EtapaConOportunidadesResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<EtapaConOportunidadesResponse>>> OportunidadesPorEtapa(
        CancellationToken cancellationToken)
        => Ok(await oportunidadService.GetOportunidadesPorEtapaAsync(cancellationToken));

    /// <summary>Obtiene los datos de una oportunidad por id.</summary>
    [HttpGet("DatosOportunidad/{idOportunidad:int}", Name = "DatosOportunidad")]
    [ProducesResponseType(typeof(OportunidadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OportunidadResponse>> DatosOportunidad(
        int idOportunidad,
        CancellationToken cancellationToken)
    {
        var oportunidad = await oportunidadService.GetByIdAsync(idOportunidad, cancellationToken);
        return oportunidad is null ? NotFound($"No existe la oportunidad {idOportunidad}.") : Ok(oportunidad);
    }

    /// <summary>Modifica los datos de una oportunidad existente (no cambia su etapa comercial).</summary>
    [HttpPost("ModificarOportunidad/{idOportunidad:int}", Name = "ModificarOportunidad")]
    [ProducesResponseType(typeof(OportunidadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OportunidadResponse>> ModificarOportunidad(
        int idOportunidad,
        [FromBody] UpdateOportunidadRequest request,
        CancellationToken cancellationToken)
    {
        var result = await oportunidadService.UpdateAsync(idOportunidad, request, cancellationToken);

        return result.Outcome switch
        {
            UpdateOportunidadOutcome.Success => Ok(result.Oportunidad),
            UpdateOportunidadOutcome.NotFound
                => NotFound($"No existe la oportunidad {idOportunidad}."),
            UpdateOportunidadOutcome.ValidationFailed => BadRequest(new { errors = result.Errors }),
            _ => Problem()
        };
    }

    /// <summary>Mueve una oportunidad a una nueva etapa comercial y lo asienta en el historial.</summary>
    [HttpPost("UpdateEtapaOportunidad/{idOportunidad:int}", Name = "UpdateEtapaOportunidad")]
    [ProducesResponseType(typeof(OportunidadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OportunidadResponse>> UpdateEtapaOportunidad(
        int idOportunidad,
        [FromBody] UpdateEtapaOportunidadRequest request,
        CancellationToken cancellationToken)
    {
        var result = await oportunidadService.UpdateEtapaAsync(idOportunidad, request, cancellationToken);

        return result.Outcome switch
        {
            UpdateEtapaOportunidadOutcome.Success => Ok(result.Oportunidad),
            UpdateEtapaOportunidadOutcome.OportunidadNotFound
                => NotFound($"No existe la oportunidad {idOportunidad}."),
            UpdateEtapaOportunidadOutcome.EtapaNotFound
                => BadRequest($"No existe la etapa comercial {request.IdNuevaEtapa}."),
            _ => Problem()
        };
    }
}
