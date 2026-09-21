using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController]
[Route("[controller]")]
public sealed class EmpresaController(IEmpresaService empresaService) : ControllerBase
{
    /// <summary>Da de alta una nueva empresa.</summary>
    [HttpPost("AltaEmpresa", Name = "AltaEmpresa")]
    [ProducesResponseType(typeof(EmpresaResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<EmpresaResponse>> AltaEmpresa(
        [FromBody] CreateEmpresaRequest request,
        CancellationToken cancellationToken)
    {
        var result = await empresaService.CreateAsync(request, cancellationToken);

        return result.Outcome switch
        {
            CreateEmpresaOutcome.Success => CreatedAtAction(
                nameof(DatosEmpresa), new { idEmpresa = result.Empresa!.Id }, result.Empresa),
            CreateEmpresaOutcome.ValidationFailed => BadRequest(new { errors = result.Errors }),
            _ => Problem()
        };
    }

    /// <summary>Obtiene los datos de una empresa por id.</summary>
    [HttpGet("DatosEmpresa/{idEmpresa:int}", Name = "DatosEmpresa")]
    [ProducesResponseType(typeof(EmpresaResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmpresaResponse>> DatosEmpresa(
        int idEmpresa,
        CancellationToken cancellationToken)
    {
        var empresa = await empresaService.GetByIdAsync(idEmpresa, cancellationToken);
        return empresa is null ? NotFound($"No existe la empresa {idEmpresa}.") : Ok(empresa);
    }

    /// <summary>Obtiene el listado de todas las empresas.</summary>
    [HttpGet("ListadoEmpresas", Name = "ListadoEmpresas")]
    [ProducesResponseType(typeof(IReadOnlyList<EmpresaResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<EmpresaResponse>>> ListadoEmpresas(
        CancellationToken cancellationToken)
        => Ok(await empresaService.GetAllAsync(cancellationToken));

    /// <summary>Modifica solo los campos enviados de una empresa y permite borrar valores opcionales.</summary>
    /// <remarks>
    /// Un campo omitido conserva su valor. Un null explícito borra un campo opcional, pero no puede borrar
    /// razonSocial. Un objeto vacío no cambia la empresa. Los campos desconocidos se rechazan.
    /// El POST de esta misma ruta conserva su comportamiento anterior: null no modifica.
    /// </remarks>
    [HttpPatch("ModificarEmpresa/{idEmpresa:int}", Name = "PatchEmpresa")]
    [ProducesResponseType(typeof(EmpresaResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmpresaResponse>> PatchEmpresa(
        int idEmpresa,
        [FromBody] PatchEmpresaRequest request,
        CancellationToken cancellationToken)
    {
        var result = await empresaService.PatchAsync(idEmpresa, request, cancellationToken);

        return result.Outcome switch
        {
            UpdateEmpresaOutcome.Success => Ok(result.Empresa),
            UpdateEmpresaOutcome.NotFound => NotFound($"No existe la empresa {idEmpresa}."),
            UpdateEmpresaOutcome.ValidationFailed => BadRequest(new { errors = result.Errors }),
            _ => Problem()
        };
    }

    /// <summary>Modifica los datos de una empresa existente.</summary>
    [HttpPost("ModificarEmpresa/{idEmpresa:int}", Name = "ModificarEmpresa")]
    [ProducesResponseType(typeof(EmpresaResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EmpresaResponse>> ModificarEmpresa(
        int idEmpresa,
        [FromBody] UpdateEmpresaRequest request,
        CancellationToken cancellationToken)
    {
        var result = await empresaService.UpdateAsync(idEmpresa, request, cancellationToken);

        return result.Outcome switch
        {
            UpdateEmpresaOutcome.Success => Ok(result.Empresa),
            UpdateEmpresaOutcome.NotFound => NotFound($"No existe la empresa {idEmpresa}."),
            UpdateEmpresaOutcome.ValidationFailed => BadRequest(new { errors = result.Errors }),
            _ => Problem()
        };
    }
}
