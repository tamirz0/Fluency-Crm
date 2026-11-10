using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Servicio y referencias legibles aun cuando están inactivos.</summary>
public sealed record ServicioResponse
{
    public required int Id { get; init; }
    public required string Nombre { get; init; }
    public string? Descripcion { get; init; }
    public required decimal PrecioReferencia { get; init; }
    public int? DuracionHoras { get; init; }
    public CatalogoResponse? Nivel { get; init; }
    public CatalogoResponse? Modalidad { get; init; }
    public required TipoServicioResponse Tipo { get; init; }
    public required bool Activo { get; init; }
}

/// <summary>Tipo de servicio; NivelObligatorio indica que sus servicios exigen un nivel de inglés (Clases).</summary>
public sealed record TipoServicioResponse
{
    public required int Id { get; init; }
    public required string Descripcion { get; init; }
    public required bool Activo { get; init; }
    public required bool NivelObligatorio { get; init; }
}

/// <summary>Campos editables; alta requiere nombre, precio, tipo y modalidad, PATCH conserva omisiones.</summary>
public sealed record ServicioRequest : PatchRequest
{
    private string? nombre, descripcion;
    private decimal? precioReferencia;
    private int? duracionHoras, idNivel, idModalidad, idTipoServicio;
    [MaxLength(150)] public string? Nombre { get => nombre; init { nombre = value; ProvidedFields.Add(nameof(Nombre)); } }
    public string? Descripcion { get => descripcion; init { descripcion = value; ProvidedFields.Add(nameof(Descripcion)); } }
    public decimal? PrecioReferencia { get => precioReferencia; init { precioReferencia = value; ProvidedFields.Add(nameof(PrecioReferencia)); } }
    public int? DuracionHoras { get => duracionHoras; init { duracionHoras = value; ProvidedFields.Add(nameof(DuracionHoras)); } }
    public int? IdNivel { get => idNivel; init { idNivel = value; ProvidedFields.Add(nameof(IdNivel)); } }
    public int? IdModalidad { get => idModalidad; init { idModalidad = value; ProvidedFields.Add(nameof(IdModalidad)); } }
    public int? IdTipoServicio { get => idTipoServicio; init { idTipoServicio = value; ProvidedFields.Add(nameof(IdTipoServicio)); } }
    public override IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        foreach (var error in base.Validate(context)) yield return error;
        if (HasField(nameof(IdTipoServicio)) && IdTipoServicio is null or <= 0)
            yield return new ValidationResult("El tipo de servicio es obligatorio.", [nameof(IdTipoServicio)]);
        if (HasField(nameof(IdModalidad)) && IdModalidad is null or <= 0)
            yield return new ValidationResult("La modalidad es obligatoria.", [nameof(IdModalidad)]);
        if (HasField(nameof(Nombre)) && string.IsNullOrWhiteSpace(Nombre))
            yield return new ValidationResult("El nombre es obligatorio.", [nameof(Nombre)]);
        if (HasField(nameof(PrecioReferencia)) && (PrecioReferencia is null || PrecioReferencia < 0 || PrecioReferencia > 9999999999.99m
            || decimal.Round(PrecioReferencia.Value, 2) != PrecioReferencia))
            yield return new ValidationResult("El precio es obligatorio, no negativo, hasta 9999999999.99 y con hasta dos decimales.", [nameof(PrecioReferencia)]);
    }
}
/// <summary>Error público de servicios sin detalles internos.</summary>
public sealed class ServicioOperationException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
