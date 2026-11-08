using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Embudo con su servicio legible incluso si está inactivo.</summary>
public sealed record EmbudoResponse
{
    public required int Id { get; init; }
    public required string Nombre { get; init; }
    public string? Descripcion { get; init; }
    public required CatalogoResponse Servicio { get; init; }
    public required bool Activo { get; init; }
}

/// <summary>Campos de alta y PATCH; las omisiones conservan su valor.</summary>
public sealed record EmbudoRequest : PatchRequest
{
    private string? nombre, descripcion;
    private int? idServicio;
    [MaxLength(100)] public string? Nombre { get => nombre; init { nombre = value; ProvidedFields.Add(nameof(Nombre)); } }
    public string? Descripcion { get => descripcion; init { descripcion = value; ProvidedFields.Add(nameof(Descripcion)); } }
    public int? IdServicio { get => idServicio; init { idServicio = value; ProvidedFields.Add(nameof(IdServicio)); } }
    public override IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        foreach (var error in base.Validate(context)) yield return error;
        if (HasField(nameof(Nombre)) && string.IsNullOrWhiteSpace(Nombre)) yield return new("El nombre es obligatorio.", [nameof(Nombre)]);
        if (HasField(nameof(IdServicio)) && (IdServicio is null or <= 0)) yield return new("El servicio es obligatorio.", [nameof(IdServicio)]);
    }
}

/// <summary>Error público de configuración.</summary>
public sealed class ConfiguracionOperationException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
