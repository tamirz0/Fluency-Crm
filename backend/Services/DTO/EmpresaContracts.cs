using System.ComponentModel.DataAnnotations;

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
