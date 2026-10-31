using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Empresa compartida y disponibilidad de sus referencias actuales.</summary>
public sealed record EmpresaResponse
{
    public required int Id { get; init; }
    public required string RazonSocial { get; init; }
    public string? Cuit { get; init; }
    public string? Industria { get; init; }
    public string? Correo { get; init; }
    public string? Telefono { get; init; }
    public string? Direccion { get; init; }
    public string? Observaciones { get; init; }
    public required int IdEstado { get; init; }
    public required string EstadoDescripcion { get; init; }
    public required bool EstadoActivo { get; init; }
    public int? IdOrigen { get; init; }
    public string? OrigenDescripcion { get; init; }
    public bool? OrigenActivo { get; init; }
    public required int IdResponsable { get; init; }
    public required string ResponsableNombre { get; init; }
    public required bool ResponsableActivo { get; init; }
    public required DateTime FechaCreacion { get; init; }
    public required bool Activo { get; init; }
}

/// <summary>Alta requiere razón social; los defaults se aplican solo a campos omitidos.</summary>
public sealed record EmpresaRequest : PatchRequest
{
    [MaxLength(150)] public string? RazonSocial { get; init { field = value; ProvidedFields.Add(nameof(RazonSocial)); } }
    [MaxLength(20)] public string? Cuit { get; init { field = value; ProvidedFields.Add(nameof(Cuit)); } }
    [MaxLength(100)] public string? Industria { get; init { field = value; ProvidedFields.Add(nameof(Industria)); } }
    [MaxLength(150), EmailAddress] public string? Correo { get; init { field = value; ProvidedFields.Add(nameof(Correo)); } }
    [MaxLength(50)] public string? Telefono { get; init { field = value; ProvidedFields.Add(nameof(Telefono)); } }
    public string? Direccion { get; init { field = value; ProvidedFields.Add(nameof(Direccion)); } }
    public string? Observaciones { get; init { field = value; ProvidedFields.Add(nameof(Observaciones)); } }
    public int? IdEstado { get; init { field = value; ProvidedFields.Add(nameof(IdEstado)); } }
    public int? IdOrigen { get; init { field = value; ProvidedFields.Add(nameof(IdOrigen)); } }
    public int? IdResponsable { get; init { field = value; ProvidedFields.Add(nameof(IdResponsable)); } }
    public override IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        foreach (var error in base.Validate(context)) yield return error;
        if (HasField(nameof(RazonSocial)) && string.IsNullOrWhiteSpace(RazonSocial))
            yield return new ValidationResult("La razón social es obligatoria.", [nameof(RazonSocial)]);
        foreach (var (name, value) in new[] { (nameof(IdEstado), IdEstado), (nameof(IdResponsable), IdResponsable) })
            if (HasField(name) && value is null) yield return new ValidationResult("El campo es obligatorio.", [name]);
        foreach (var (name, value) in new[] { (nameof(IdEstado), IdEstado), (nameof(IdOrigen), IdOrigen), (nameof(IdResponsable), IdResponsable) })
            if (value <= 0) yield return new ValidationResult("Seleccione una referencia válida.", [name]);
    }
}

/// <summary>Error público sin detalles de persistencia.</summary>
public sealed class EmpresaOperationException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
