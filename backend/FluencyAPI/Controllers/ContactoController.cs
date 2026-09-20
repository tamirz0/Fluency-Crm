using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Interface;

namespace FluencyAPI.Controllers;

[ApiController]
[Route("[controller]")]
public sealed class ContactoController(IContactoService contactoService) : ControllerBase
{
    /// <summary>Da de alta un nuevo contacto.</summary>
    [HttpPost("AltaContacto", Name = "AltaContacto")]
    [ProducesResponseType(typeof(ContactoResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ContactoResponse>> AltaContacto(
        [FromBody] CreateContactoRequest request,
        CancellationToken cancellationToken)
    {
        var result = await contactoService.CreateAsync(request, cancellationToken);

        return result.Outcome switch
        {
            CreateContactoOutcome.Success => CreatedAtAction(
                nameof(DatosContacto), new { idContacto = result.Contacto!.Id }, result.Contacto),
            CreateContactoOutcome.ValidationFailed => BadRequest(new { errors = result.Errors }),
            _ => Problem()
        };
    }

    /// <summary>Obtiene los datos de un contacto por id.</summary>
    [HttpGet("DatosContacto/{idContacto:int}", Name = "DatosContacto")]
    [ProducesResponseType(typeof(ContactoResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContactoResponse>> DatosContacto(
        int idContacto,
        CancellationToken cancellationToken)
    {
        var contacto = await contactoService.GetByIdAsync(idContacto, cancellationToken);
        return contacto is null ? NotFound($"No existe el contacto {idContacto}.") : Ok(contacto);
    }

    /// <summary>Obtiene el listado de todos los contactos.</summary>
    [HttpGet("ListadoContactos", Name = "ListadoContactos")]
    [ProducesResponseType(typeof(IReadOnlyList<ContactoResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ContactoResponse>>> ListadoContactos(
        CancellationToken cancellationToken)
        => Ok(await contactoService.GetAllAsync(cancellationToken));

    /// <summary>Modifica los datos de un contacto existente.</summary>
    [HttpPost("ModificarContacto/{idContacto:int}", Name = "ModificarContacto")]
    [ProducesResponseType(typeof(ContactoResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ContactoResponse>> ModificarContacto(
        int idContacto,
        [FromBody] UpdateContactoRequest request,
        CancellationToken cancellationToken)
    {
        var result = await contactoService.UpdateAsync(idContacto, request, cancellationToken);

        return result.Outcome switch
        {
            UpdateContactoOutcome.Success => Ok(result.Contacto),
            UpdateContactoOutcome.NotFound => NotFound($"No existe el contacto {idContacto}."),
            UpdateContactoOutcome.ValidationFailed => BadRequest(new { errors = result.Errors }),
            _ => Problem()
        };
    }

    /// <summary>Obtiene el historial de cambios de etapa de las oportunidades del contacto.</summary>
    [HttpGet("HistorialEtapas/{idContacto:int}", Name = "HistorialEtapasContacto")]
    [ProducesResponseType(typeof(IReadOnlyList<HistorialEtapaResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<HistorialEtapaResponse>>> HistorialEtapas(
        int idContacto,
        CancellationToken cancellationToken)
    {
        var historial = await contactoService.GetHistorialEtapasAsync(idContacto, cancellationToken);
        return historial is null ? NotFound($"No existe el contacto {idContacto}.") : Ok(historial);
    }
}
