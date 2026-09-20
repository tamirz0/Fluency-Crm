using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Services.DTO;

/// <summary>
/// Datos de una empresa. Los campos <c>*Descripcion</c> acompañan a su id correspondiente con el valor
/// legible desde la tabla referenciada (por ejemplo, <see cref="EstadoDescripcion"/> es la descripción de
/// <see cref="IdEstado"/>), para que el frontend no tenga que resolverlo con una consulta aparte.
/// </summary>
public sealed record EmpresaResponse(
    int Id,
    string RazonSocial,
    string? Cuit,
    string? Industria,
    string? Correo,
    string? Telefono,
    string? Direccion,
    int? IdEstado,
    string? EstadoDescripcion,
    int? IdOrigen,
    string? OrigenDescripcion,
    string? Observaciones);

/// <summary>Payload para dar de alta una empresa.</summary>
public sealed record CreateEmpresaRequest
{
    [Required, MaxLength(150)]
    public required string RazonSocial { get; init; }

    [MaxLength(20)]
    public string? Cuit { get; init; }

    [MaxLength(100)]
    public string? Industria { get; init; }

    [MaxLength(150), EmailAddress]
    public string? Correo { get; init; }

    [MaxLength(50)]
    public string? Telefono { get; init; }

    public string? Direccion { get; init; }

    public int? IdEstado { get; init; }

    public int? IdOrigen { get; init; }

    public string? Observaciones { get; init; }
}

/// <summary>Resultado posible de intentar registrar una nueva empresa.</summary>
public enum CreateEmpresaOutcome
{
    Success,
    ValidationFailed
}

/// <summary>
/// Envuelve el resultado de dar de alta una empresa y los errores de validación de referencias, si los hubo.
/// </summary>
public sealed record CreateEmpresaResult(
    CreateEmpresaOutcome Outcome,
    EmpresaResponse? Empresa,
    IReadOnlyList<string> Errors);

/// <summary>
/// Payload para modificar una empresa existente. Solo los campos enviados (no nulos) se actualizan; el resto
/// conserva su valor actual.
/// </summary>
public sealed record UpdateEmpresaRequest
{
    [MaxLength(150)]
    public string? RazonSocial { get; init; }

    [MaxLength(20)]
    public string? Cuit { get; init; }

    [MaxLength(100)]
    public string? Industria { get; init; }

    [MaxLength(150), EmailAddress]
    public string? Correo { get; init; }

    [MaxLength(50)]
    public string? Telefono { get; init; }

    public string? Direccion { get; init; }

    public int? IdEstado { get; init; }

    public int? IdOrigen { get; init; }

    public string? Observaciones { get; init; }
}

/// <summary>Resultado posible de intentar modificar una empresa.</summary>
public enum UpdateEmpresaOutcome
{
    Success,
    NotFound,
    ValidationFailed
}

/// <summary>
/// Envuelve el resultado de modificar una empresa y los errores de validación de referencias, si los hubo.
/// </summary>
public sealed record UpdateEmpresaResult(
    UpdateEmpresaOutcome Outcome,
    EmpresaResponse? Empresa,
    IReadOnlyList<string> Errors);

/// <summary>
/// Actualización parcial de empresa: un campo omitido conserva su valor y un null explícito
/// borra un campo opcional. RazonSocial no puede borrarse. No admite campos desconocidos.
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PatchEmpresaRequest : IValidatableObject
{
    private readonly HashSet<string> providedFields = [];

    /// <summary>Razón social. Si se envía, no puede ser null, vacía ni contener solo espacios.</summary>
    [MaxLength(150)]
    public string? RazonSocial
    {
        get;
        init { field = value; providedFields.Add(nameof(RazonSocial)); }
    }

    /// <summary>CUIT; null elimina el valor guardado.</summary>
    [MaxLength(20)]
    public string? Cuit
    {
        get;
        init { field = value; providedFields.Add(nameof(Cuit)); }
    }

    /// <summary>Industria; null elimina el valor guardado.</summary>
    [MaxLength(100)]
    public string? Industria
    {
        get;
        init { field = value; providedFields.Add(nameof(Industria)); }
    }

    /// <summary>Correo electrónico; null elimina el valor guardado.</summary>
    [MaxLength(150), EmailAddress]
    public string? Correo
    {
        get;
        init { field = value; providedFields.Add(nameof(Correo)); }
    }

    /// <summary>Teléfono; null elimina el valor guardado.</summary>
    [MaxLength(50)]
    public string? Telefono
    {
        get;
        init { field = value; providedFields.Add(nameof(Telefono)); }
    }

    /// <summary>Dirección; null elimina el valor guardado.</summary>
    public string? Direccion
    {
        get;
        init { field = value; providedFields.Add(nameof(Direccion)); }
    }

    /// <summary>Estado de cliente existente; null elimina la asociación.</summary>
    public int? IdEstado
    {
        get;
        init { field = value; providedFields.Add(nameof(IdEstado)); }
    }

    /// <summary>Origen comercial existente; null elimina la asociación.</summary>
    public int? IdOrigen
    {
        get;
        init { field = value; providedFields.Add(nameof(IdOrigen)); }
    }

    /// <summary>Observaciones; null elimina el valor guardado.</summary>
    public string? Observaciones
    {
        get;
        init { field = value; providedFields.Add(nameof(Observaciones)); }
    }

    /// <summary>Indica si el campo fue enviado, incluso si su valor es null.</summary>
    public bool HasField(string propertyName) => providedFields.Contains(propertyName);

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (HasField(nameof(RazonSocial)) && string.IsNullOrWhiteSpace(RazonSocial))
        {
            yield return new ValidationResult(
                "La razón social no puede ser nula, vacía ni contener solo espacios.",
                [nameof(RazonSocial)]);
        }
    }
}
