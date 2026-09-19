using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>
/// Datos de un contacto. Los campos <c>*Descripcion</c>/<c>*RazonSocial</c> acompañan a su id correspondiente
/// con el valor legible desde la tabla referenciada, para que el frontend no tenga que resolverlo con una
/// consulta aparte.
/// </summary>
public sealed record ContactoResponse(
    int Id,
    string Nombre,
    string Apellido,
    string? Documento,
    string? Cargo,
    string Correo,
    string? Telefono,
    int? IdEstado,
    string? EstadoDescripcion,
    int? IdOrigen,
    string? OrigenDescripcion,
    int? IdEmpresa,
    string? EmpresaRazonSocial,
    string? Observaciones);

/// <summary>Payload para dar de alta un contacto.</summary>
public sealed record CreateContactoRequest
{
    [Required, MaxLength(100)]
    public required string Nombre { get; init; }

    [Required, MaxLength(100)]
    public required string Apellido { get; init; }

    [Required, MaxLength(150), EmailAddress]
    public required string Correo { get; init; }

    [MaxLength(20)]
    public string? Documento { get; init; }

    [MaxLength(100)]
    public string? Cargo { get; init; }

    [MaxLength(50)]
    public string? Telefono { get; init; }

    public int? IdEstado { get; init; }

    public int? IdOrigen { get; init; }

    public int? IdEmpresa { get; init; }

    public string? Observaciones { get; init; }
}

/// <summary>
/// Payload para modificar un contacto existente. Solo los campos enviados (no nulos) se actualizan; el resto
/// conserva su valor actual.
/// </summary>
public sealed record UpdateContactoRequest
{
    [MaxLength(100)]
    public string? Nombre { get; init; }

    [MaxLength(100)]
    public string? Apellido { get; init; }

    [MaxLength(150), EmailAddress]
    public string? Correo { get; init; }

    [MaxLength(20)]
    public string? Documento { get; init; }

    [MaxLength(100)]
    public string? Cargo { get; init; }

    [MaxLength(50)]
    public string? Telefono { get; init; }

    public int? IdEstado { get; init; }

    public int? IdOrigen { get; init; }

    public int? IdEmpresa { get; init; }

    public string? Observaciones { get; init; }
}

/// <summary>Resultado posible de intentar modificar un contacto.</summary>
public enum UpdateContactoOutcome
{
    Success,
    NotFound
}

/// <summary>Envuelve el resultado de modificar un contacto y, si tuvo éxito, el contacto ya actualizado.</summary>
public sealed record UpdateContactoResult(UpdateContactoOutcome Outcome, ContactoResponse? Contacto);

/// <summary>Un cambio de etapa comercial registrado en el historial de una oportunidad del contacto.</summary>
public sealed record HistorialEtapaResponse(
    int Id,
    int? IdOportunidad,
    string? OportunidadTitulo,
    int? IdEtapaAnterior,
    string? EtapaAnteriorNombre,
    int? IdNuevaEtapa,
    string? EtapaNuevaNombre,
    DateTime? Fecha,
    int? IdUsuario,
    string? UsuarioNombre,
    string? UsuarioApellido,
    string? Observacion);
