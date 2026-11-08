using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Datos de consulta del catálogo de etapas comerciales.</summary>
public sealed record EtapaComercialResponse(int Id, string Nombre, string? Descripcion, int Orden, int IdEmbudo, string Estado, bool Activo);

/// <summary>Alta abierta y PATCH explícito; el estado es inmutable.</summary>
public sealed record EtapaComercialRequest : PatchRequest
{
    private string? nombre, descripcion;
    private int? orden, idEmbudo;
    [MaxLength(100)] public string? Nombre { get => nombre; init { nombre = value; ProvidedFields.Add(nameof(Nombre)); } }
    public string? Descripcion { get => descripcion; init { descripcion = value; ProvidedFields.Add(nameof(Descripcion)); } }
    public int? Orden { get => orden; init { orden = value; ProvidedFields.Add(nameof(Orden)); } }
    public int? IdEmbudo { get => idEmbudo; init { idEmbudo = value; ProvidedFields.Add(nameof(IdEmbudo)); } }
    public override IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        foreach (var error in base.Validate(context)) yield return error;
        if (HasField(nameof(Nombre)) && string.IsNullOrWhiteSpace(Nombre)) yield return new("El nombre es obligatorio.", [nameof(Nombre)]);
        if (HasField(nameof(Orden)) && Orden is null) yield return new("El orden es obligatorio.", [nameof(Orden)]);
        if (HasField(nameof(IdEmbudo)) && IdEmbudo is null or <= 0) yield return new("El embudo es obligatorio.", [nameof(IdEmbudo)]);
    }
}

/// <summary>Incluye todas las etapas activas una vez; admite huecos.</summary>
public sealed record OrdenEtapasRequest
{
    [Required] public required IReadOnlyList<PosicionEtapaRequest> Etapas { get; init; }
}
/// <summary>Posición definitiva de una etapa activa.</summary>
public sealed record PosicionEtapaRequest
{
    [Required] public required int Id { get; init; }
    [Required] public required int Orden { get; init; }
}
