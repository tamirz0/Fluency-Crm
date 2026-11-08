using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Services.DTO;
using Services.Implementations;

namespace FluencyAPI.Controllers;

/// <summary>Historial comercial combinado (actividades y transiciones de etapa): una proyección de lectura compartida por todos los usuarios activos.</summary>
[ApiController]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(OportunidadErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
public sealed class HistorialComercialController(HistorialComercialService historial) : ControllerBase
{
    /// <summary>Actividades de la empresa (por su FK directa) y transiciones de sus oportunidades vigentes. Fecha descendente; <c>desde</c> inclusivo, <c>hasta</c> exclusivo.</summary>
    [HttpGet("/empresas/{id:int}/historial-comercial")]
    [ProducesResponseType<PageResponse<HistorialComercialItem>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<HistorialComercialItem>>> Company(int id, [FromQuery] DateTimeOffset? desde, [FromQuery] DateTimeOffset? hasta, CancellationToken ct,
        [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await historial.ForCompanyAsync(id, desde, hasta, page, pageSize, ct));

    /// <summary>Igual criterio por contacto: no incluye automáticamente lo de su empresa actual.</summary>
    [HttpGet("/contactos/{id:int}/historial-comercial")]
    [ProducesResponseType<PageResponse<HistorialComercialItem>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<HistorialComercialItem>>> Contact(int id, [FromQuery] DateTimeOffset? desde, [FromQuery] DateTimeOffset? hasta, CancellationToken ct,
        [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await historial.ForContactAsync(id, desde, hasta, page, pageSize, ct));

    /// <summary>Actividades asociadas y transiciones de la oportunidad vigente.</summary>
    [HttpGet("/oportunidades/{id:int}/historial-comercial")]
    [ProducesResponseType<PageResponse<HistorialComercialItem>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResponse<HistorialComercialItem>>> Opportunity(int id, [FromQuery] DateTimeOffset? desde, [FromQuery] DateTimeOffset? hasta, CancellationToken ct,
        [FromQuery, Range(1, int.MaxValue)] int page = 1, [FromQuery, Range(1, 100)] int pageSize = 25)
        => Ok(await historial.ForOpportunityAsync(id, desde, hasta, page, pageSize, ct));
}
