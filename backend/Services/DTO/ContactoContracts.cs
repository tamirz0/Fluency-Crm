using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

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

/// <summary>Resultado posible de intentar registrar un nuevo contacto.</summary>
public enum CreateContactoOutcome
{
    Success,
    ValidationFailed
}

/// <summary>
/// Envuelve el resultado de dar de alta un contacto y los errores de validación de referencias, si los hubo.
/// </summary>
public sealed record CreateContactoResult(
    CreateContactoOutcome Outcome,
    ContactoResponse? Contacto,
    IReadOnlyList<string> Errors);

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
    NotFound,
    ValidationFailed
}

/// <summary>
/// Envuelve el resultado de modificar un contacto y los errores de validación de referencias, si los hubo.
/// </summary>
public sealed record UpdateContactoResult(
    UpdateContactoOutcome Outcome,
    ContactoResponse? Contacto,
    IReadOnlyList<string> Errors);

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

/// <summary>
/// Actualización parcial de contacto: un campo omitido conserva su valor y un null explícito
/// borra un campo opcional. Nombre, apellido y correo no pueden borrarse. No admite campos desconocidos.
/// </summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PatchContactoRequest : IValidatableObject
{
    private readonly HashSet<string> providedFields = [];

    /// <summary>Nombre; si se envía, no puede ser null, vacío ni solo espacios.</summary>
    [MaxLength(100)]
    public string? Nombre { get; init { field = value; providedFields.Add(nameof(Nombre)); } }

    /// <summary>Apellido; si se envía, no puede ser null, vacío ni solo espacios.</summary>
    [MaxLength(100)]
    public string? Apellido { get; init { field = value; providedFields.Add(nameof(Apellido)); } }

    /// <summary>Correo; si se envía, debe tener formato de email y no puede ser null, vacío ni solo espacios.</summary>
    [MaxLength(150), EmailAddress]
    public string? Correo { get; init { field = value; providedFields.Add(nameof(Correo)); } }

    /// <summary>Documento; null elimina el valor guardado.</summary>
    [MaxLength(20)]
    public string? Documento { get; init { field = value; providedFields.Add(nameof(Documento)); } }

    /// <summary>Cargo; null elimina el valor guardado.</summary>
    [MaxLength(100)]
    public string? Cargo { get; init { field = value; providedFields.Add(nameof(Cargo)); } }

    /// <summary>Teléfono; null elimina el valor guardado.</summary>
    [MaxLength(50)]
    public string? Telefono { get; init { field = value; providedFields.Add(nameof(Telefono)); } }

    /// <summary>Estado de cliente existente; null elimina la asociación.</summary>
    public int? IdEstado { get; init { field = value; providedFields.Add(nameof(IdEstado)); } }

    /// <summary>Origen comercial existente; null elimina la asociación.</summary>
    public int? IdOrigen { get; init { field = value; providedFields.Add(nameof(IdOrigen)); } }

    /// <summary>Empresa existente; null elimina la asociación si el contacto no tiene oportunidades asociadas.</summary>
    public int? IdEmpresa { get; init { field = value; providedFields.Add(nameof(IdEmpresa)); } }

    /// <summary>Observaciones; null elimina el valor guardado.</summary>
    public string? Observaciones { get; init { field = value; providedFields.Add(nameof(Observaciones)); } }

    /// <summary>Indica si el campo fue enviado, incluso si su valor es null.</summary>
    public bool HasField(string propertyName) => providedFields.Contains(propertyName);

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        foreach (var field in new[] { nameof(Nombre), nameof(Apellido), nameof(Correo) })
        {
            var value = field switch
            {
                nameof(Nombre) => Nombre,
                nameof(Apellido) => Apellido,
                _ => Correo
            };

            if (HasField(field) && string.IsNullOrWhiteSpace(value))
            {
                yield return new ValidationResult(
                    $"{field} no puede ser nulo, vacío ni contener solo espacios.", [field]);
            }
        }
    }
}
