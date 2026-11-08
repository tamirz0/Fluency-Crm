using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Referencia consultable aun cuando está inactiva; tipo de actividad usa nombre.</summary>
public sealed record CatalogoResponse
{
    public required int Id { get; init; }
    public string? Descripcion { get; init; }
    public string? Nombre { get; init; }
    public required bool Activo { get; init; }
}
/// <summary>Estado fijo del circuito; no admite mutaciones.</summary>
public sealed record EstadoOportunidadResponse(int Id, string Codigo, string Descripcion);
/// <summary>Alta o edición de la etiqueta obligatoria según el catálogo; omisión y null no la borran.</summary>
public sealed record CatalogoRequest : PatchRequest
{
    private string? descripcion, nombre;
    [MaxLength(100)] public string? Descripcion { get => descripcion; init { descripcion = value; ProvidedFields.Add(nameof(Descripcion)); } }
    [MaxLength(100)] public string? Nombre { get => nombre; init { nombre = value; ProvidedFields.Add(nameof(Nombre)); } }
    public override IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        foreach (var error in base.Validate(context)) yield return error;
        if (HasField(nameof(Descripcion)) && string.IsNullOrWhiteSpace(Descripcion))
            yield return new ValidationResult("La descripción es obligatoria.", [nameof(Descripcion)]);
        if (HasField(nameof(Nombre)) && string.IsNullOrWhiteSpace(Nombre))
            yield return new ValidationResult("El nombre es obligatorio.", [nameof(Nombre)]);
    }
}
/// <summary>Error público de catálogos, sin detalles de persistencia.</summary>
public sealed class CatalogoOperationException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
