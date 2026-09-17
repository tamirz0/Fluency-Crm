using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Datos de una empresa.</summary>
public sealed record EmpresaResponse(
    int Id,
    string RazonSocial,
    string? Cuit,
    string? Industria,
    string? Correo,
    string? Telefono,
    string? Direccion,
    int? IdEstado,
    int? IdOrigen,
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
    NotFound
}

/// <summary>Envuelve el resultado de modificar una empresa y, si tuvo éxito, la empresa ya actualizada.</summary>
public sealed record UpdateEmpresaResult(UpdateEmpresaOutcome Outcome, EmpresaResponse? Empresa);
