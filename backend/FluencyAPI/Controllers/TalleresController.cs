using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Acceso;
using Services.DTO;
using Services.Implementations;

namespace FluencyAPI.Controllers;

[Authorize(Policy = RolesYPermisos.GestionarAcademia)]
[ApiController, Route("talleres")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[TypeFilter(typeof(AcademiaErrors))]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public sealed class TalleresController(TallerService talleres) : ControllerBase
{
    /// <summary>Talleres del rango de fechas (máximo 93 días), con la cantidad de anotados.</summary>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<TallerResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TallerResponse>>> List([FromQuery, Required] DateOnly desde, [FromQuery, Required] DateOnly hasta, CancellationToken ct)
        => Ok(await talleres.ListAsync(desde, hasta, ct));

    /// <summary>Servicios de taller activos, para elegir al crear un taller.</summary>
    [HttpGet("servicios")]
    [ProducesResponseType<IReadOnlyList<OpcionResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<OpcionResponse>>> Services(CancellationToken ct) => Ok(await talleres.ServiciosAsync(ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType<TallerDetalleResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<TallerDetalleResponse>> Get(int id, CancellationToken ct) => Ok(await talleres.GetAsync(id, ct));

    [HttpPost]
    [ProducesResponseType<TallerDetalleResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<TallerDetalleResponse>> Create([FromBody] CreateTallerRequest request, CancellationToken ct)
    {
        var result = await talleres.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Taller.Id }, result);
    }

    /// <summary>Alumnos y clientes con este taller vendido que todavía no están anotados.</summary>
    [HttpGet("{id:int}/candidatos")]
    [ProducesResponseType<IReadOnlyList<PersonaTallerResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PersonaTallerResponse>>> Candidates(int id, CancellationToken ct) => Ok(await talleres.CandidatesAsync(id, ct));

    [HttpPost("{id:int}/inscripciones")]
    [ProducesResponseType<TallerDetalleResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<TallerDetalleResponse>> Enroll(int id, [FromBody] InscribirTallerRequest request, CancellationToken ct)
        => Ok(await talleres.EnrollAsync(id, request, ct));
}
