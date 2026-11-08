using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Contacto compartido, con etiquetas y disponibilidad de sus referencias actuales.</summary>
public sealed record ContactoResponse
{
    public required int Id { get; init; }
    public required string Nombre { get; init; }
    public required string Apellido { get; init; }
    public string? Documento { get; init; }
    public string? Cargo { get; init; }
    public required string Correo { get; init; }
    public string? Telefono { get; init; }
    public string? Observaciones { get; init; }
    public required int IdEstado { get; init; }
    public required string EstadoDescripcion { get; init; }
    public required bool EstadoActivo { get; init; }
    public int? IdOrigen { get; init; }
    public string? OrigenDescripcion { get; init; }
    public bool? OrigenActivo { get; init; }
    public int? IdEmpresa { get; init; }
    public string? EmpresaRazonSocial { get; init; }
    public required int IdResponsable { get; init; }
    public required string ResponsableNombre { get; init; }
    public required bool ResponsableActivo { get; init; }
    public required DateTime FechaCreacion { get; init; }
    public required bool Activo { get; init; }
}

/// <summary>Alta requiere nombre, apellido y correo; los defaults se aplican solo a campos omitidos.</summary>
public sealed record ContactoRequest : PatchRequest
{
    [MaxLength(100)] public string? Nombre { get; init { field = value; ProvidedFields.Add(nameof(Nombre)); } }
    [MaxLength(100)] public string? Apellido { get; init { field = value; ProvidedFields.Add(nameof(Apellido)); } }
    [MaxLength(150), EmailAddress] public string? Correo { get; init { field = value; ProvidedFields.Add(nameof(Correo)); } }
    [MaxLength(20)] public string? Documento { get; init { field = value; ProvidedFields.Add(nameof(Documento)); } }
    [MaxLength(100)] public string? Cargo { get; init { field = value; ProvidedFields.Add(nameof(Cargo)); } }
    [MaxLength(50)] public string? Telefono { get; init { field = value; ProvidedFields.Add(nameof(Telefono)); } }
    public string? Observaciones { get; init { field = value; ProvidedFields.Add(nameof(Observaciones)); } }
    public int? IdEstado { get; init { field = value; ProvidedFields.Add(nameof(IdEstado)); } }
    public int? IdOrigen { get; init { field = value; ProvidedFields.Add(nameof(IdOrigen)); } }
    public int? IdEmpresa { get; init { field = value; ProvidedFields.Add(nameof(IdEmpresa)); } }
    public int? IdResponsable { get; init { field = value; ProvidedFields.Add(nameof(IdResponsable)); } }

    public override IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        foreach (var error in base.Validate(context)) yield return error;
        foreach (var (name, value) in new[] { (nameof(Nombre), Nombre), (nameof(Apellido), Apellido), (nameof(Correo), Correo) })
            if (HasField(name) && string.IsNullOrWhiteSpace(value))
                yield return new ValidationResult($"{name} no puede ser nulo, vacío ni contener solo espacios.", [name]);
        foreach (var (name, value) in new[] { (nameof(IdEstado), IdEstado), (nameof(IdResponsable), IdResponsable) })
            if (HasField(name) && value is null) yield return new ValidationResult("El campo es obligatorio.", [name]);
        foreach (var (name, value) in new[] { (nameof(IdEstado), IdEstado), (nameof(IdOrigen), IdOrigen), (nameof(IdEmpresa), IdEmpresa), (nameof(IdResponsable), IdResponsable) })
            if (value <= 0) yield return new ValidationResult("Seleccione una referencia válida.", [name]);
    }
}

/// <summary>Error público sin detalles de persistencia.</summary>
public sealed class ContactoOperationException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
