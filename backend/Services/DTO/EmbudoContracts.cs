using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Tipo admitido por un embudo; Servicios lista la selección puntual (vacía: entran todos los servicios del tipo).</summary>
public sealed record EmbudoTipoResponse
{
    public required TipoServicioResponse Tipo { get; init; }
    public required IReadOnlyList<CatalogoResponse> Servicios { get; init; }
}

/// <summary>Embudo con los tipos de servicio que admite, legibles incluso si están inactivos.</summary>
public sealed record EmbudoResponse
{
    public required int Id { get; init; }
    public required string Nombre { get; init; }
    public string? Descripcion { get; init; }
    public required IReadOnlyList<EmbudoTipoResponse> Tipos { get; init; }
    public required bool Activo { get; init; }
}

/// <summary>Tipo admitido por el embudo; IdServicios opcional restringe a esos servicios del tipo.</summary>
public sealed record EmbudoTipoRequest
{
    public int IdTipoServicio { get; init; }
    public List<int>? IdServicios { get; init; }
}

/// <summary>Campos de alta y PATCH; las omisiones conservan su valor.</summary>
public sealed record EmbudoRequest : PatchRequest
{
    private string? nombre, descripcion;
    private List<EmbudoTipoRequest>? tipos;
    [MaxLength(100)] public string? Nombre { get => nombre; init { nombre = value; ProvidedFields.Add(nameof(Nombre)); } }
    public string? Descripcion { get => descripcion; init { descripcion = value; ProvidedFields.Add(nameof(Descripcion)); } }
    /// <summary>Reemplaza la admisión completa del embudo; al menos un tipo.</summary>
    public List<EmbudoTipoRequest>? Tipos { get => tipos; init { tipos = value; ProvidedFields.Add(nameof(Tipos)); } }
    public override IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        foreach (var error in base.Validate(context)) yield return error;
        if (HasField(nameof(Nombre)) && string.IsNullOrWhiteSpace(Nombre)) yield return new("El nombre es obligatorio.", [nameof(Nombre)]);
        if (HasField(nameof(Tipos)))
        {
            if (Tipos is null || Tipos.Count == 0 || Tipos.Any(t => t is null || t.IdTipoServicio <= 0 || t.IdServicios?.Any(s => s <= 0) == true))
                yield return new("Seleccione al menos un tipo de servicio.", [nameof(Tipos)]);
            else if (Tipos.Select(t => t.IdTipoServicio).Distinct().Count() != Tipos.Count)
                yield return new("Un tipo de servicio no puede repetirse.", [nameof(Tipos)]);
        }
    }
}

/// <summary>Error público de configuración.</summary>
public sealed class ConfiguracionOperationException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
