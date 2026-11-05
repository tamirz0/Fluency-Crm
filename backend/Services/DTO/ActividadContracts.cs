using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Qué puede intentar el actor sobre una actividad; la API vuelve a comprobarlo al ejecutar.</summary>
public sealed record AccionesActividad(bool Editar, bool DarDeBaja);

/// <summary>Actividad con sus referencias etiquetadas. Fecha del hecho y de registro son instantes distintos.</summary>
public sealed record ActividadResponse
{
    public required int Id { get; init; }
    public required int IdTipo { get; init; }
    public required string TipoNombre { get; init; }
    public required bool TipoActivo { get; init; }
    public required int IdUsuario { get; init; }
    public required string UsuarioNombre { get; init; }
    public int? IdEmpresa { get; init; }
    public string? EmpresaRazonSocial { get; init; }
    public int? IdContacto { get; init; }
    public string? ContactoNombre { get; init; }
    public int? IdOportunidad { get; init; }
    public string? OportunidadTitulo { get; init; }
    public required DateTime FechaHora { get; init; }
    public required DateTime FechaRegistro { get; init; }
    public required string Descripcion { get; init; }
    public string? Resultado { get; init; }
    public required bool Activo { get; init; }
    public AccionesActividad AccionesPermitidas { get; init; } = new(false, false);
}

/// <summary>Filtros del listado; se combinan con AND. Las fechas son instantes: inicio inclusivo y fin exclusivo.</summary>
public sealed record ActividadFilters(string? Q, int? IdEmpresa, int? IdContacto, int? IdOportunidad, int? IdTipo, int? IdUsuario, DateTimeOffset? Desde, DateTimeOffset? Hasta);

/// <summary>
/// Edición de una actividad: omitir un campo lo conserva; null solo limpia el resultado y las asociaciones opcionales.
/// Autor y fecha de registro no se editan (propiedades desconocidas: 400).
/// </summary>
public sealed record PatchActividadRequest : PatchRequest
{
    [Range(1, int.MaxValue)] public int? IdTipo { get; init { field = value; ProvidedFields.Add(nameof(IdTipo)); } }
    [Range(1, int.MaxValue)] public int? IdEmpresa { get; init { field = value; ProvidedFields.Add(nameof(IdEmpresa)); } }
    [Range(1, int.MaxValue)] public int? IdContacto { get; init { field = value; ProvidedFields.Add(nameof(IdContacto)); } }
    [Range(1, int.MaxValue)] public int? IdOportunidad { get; init { field = value; ProvidedFields.Add(nameof(IdOportunidad)); } }
    public DateTimeOffset? FechaHora { get; init { field = value; ProvidedFields.Add(nameof(FechaHora)); } }
    public string? Descripcion { get; init { field = value; ProvidedFields.Add(nameof(Descripcion)); } }
    public string? Resultado { get; init { field = value; ProvidedFields.Add(nameof(Resultado)); } }

    public override IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        foreach (var error in base.Validate(context)) yield return error;
        if (HasField(nameof(IdTipo)) && IdTipo is null) yield return new("El tipo de actividad no puede quedar vacío.", [nameof(IdTipo)]);
        if (HasField(nameof(FechaHora)) && FechaHora is null) yield return new("La fecha de la actividad no puede quedar vacía.", [nameof(FechaHora)]);
        if (HasField(nameof(Descripcion)) && string.IsNullOrWhiteSpace(Descripcion)) yield return new("La descripción es obligatoria.", [nameof(Descripcion)]);
    }
}

/// <summary>
/// Alta de una actividad ya realizada. Autor, fecha de registro y baja los fija el servidor (propiedades desconocidas: 400).
/// Debe indicar empresa o contacto; la oportunidad por sí sola no alcanza.
/// </summary>
public sealed record CreateActividadRequest : IValidatableObject
{
    [Range(1, int.MaxValue)] public int IdTipo { get; init; }
    [Range(1, int.MaxValue)] public int? IdEmpresa { get; init; }
    [Range(1, int.MaxValue)] public int? IdContacto { get; init; }
    [Range(1, int.MaxValue)] public int? IdOportunidad { get; init; }
    /// <summary>Instante en que ocurrió la interacción (no puede ser futuro).</summary>
    public DateTimeOffset? FechaHora { get; init; }
    public string? Descripcion { get; init; }
    public string? Resultado { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (IdTipo <= 0) yield return new("El tipo de actividad es obligatorio.", [nameof(IdTipo)]);
        if (IdEmpresa is null && IdContacto is null) yield return new("Indique una empresa o un contacto.", [nameof(IdEmpresa), nameof(IdContacto)]);
        if (FechaHora is null) yield return new("La fecha de la actividad es obligatoria.", [nameof(FechaHora)]);
        if (string.IsNullOrWhiteSpace(Descripcion)) yield return new("La descripción es obligatoria.", [nameof(Descripcion)]);
    }
}
