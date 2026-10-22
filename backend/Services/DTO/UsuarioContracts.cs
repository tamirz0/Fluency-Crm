using System.ComponentModel.DataAnnotations;
using System.Text;

namespace Services.DTO;

/// <summary>Filtros de cuentas y opciones activas; paginación validada en servidor.</summary>
public sealed record UsuarioQuery
{
    public string? Q { get; init; }
    public bool? Activo { get; init; }
    public string? Rol { get; init; }
    [Range(1, int.MaxValue)] public int Page { get; init; } = 1;
    [Range(1, 100)] public int PageSize { get; init; } = 25;
}
/// <summary>Rol preconfigurado; no admite edición.</summary>
public sealed record RolResponse(string Codigo, string Etiqueta);
/// <summary>Referencia mínima para asignaciones nuevas.</summary>
public sealed record UsuarioOpcionResponse(int Id, string Nombre, string Apellido, IReadOnlyList<string> Roles);
/// <summary>Alta administrativa; siempre inicia activa.</summary>
public sealed record CreateUsuarioRequest : IValidatableObject
{
    [Required, MaxLength(100)] public required string Nombre { get; init; }
    [Required, MaxLength(100)] public required string Apellido { get; init; }
    [Required, MaxLength(150), EmailAddress] public required string Correo { get; init; }
    [Required, MaxLength(50)] public required string Username { get; init; }
    [Required, MinLength(8), MaxLength(72)] public required string Password { get; init; }
    [Required, MinLength(1)] public required string[] Roles { get; init; }
    public IEnumerable<ValidationResult> Validate(ValidationContext context) => UsuarioValidation.Password(Password);
}
/// <summary>Perfil editable; omisión conserva y null se rechaza.</summary>
public sealed record PatchUsuarioRequest : PatchRequest
{
    private string? nombre, apellido, correo, username;
    private string[]? roles;
    [MaxLength(100)] public string? Nombre { get => nombre; init { nombre = value; ProvidedFields.Add(nameof(Nombre)); } }
    [MaxLength(100)] public string? Apellido { get => apellido; init { apellido = value; ProvidedFields.Add(nameof(Apellido)); } }
    [MaxLength(150), EmailAddress] public string? Correo { get => correo; init { correo = value; ProvidedFields.Add(nameof(Correo)); } }
    [MaxLength(50)] public string? Username { get => username; init { username = value; ProvidedFields.Add(nameof(Username)); } }
    public string[]? Roles { get => roles; init { roles = value; ProvidedFields.Add(nameof(Roles)); } }
    public override IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        foreach (var error in base.Validate(context)) yield return error;
        foreach (var (field, value) in new[] { (nameof(Nombre), Nombre), (nameof(Apellido), Apellido), (nameof(Correo), Correo), (nameof(Username), Username) })
            if (HasField(field) && string.IsNullOrWhiteSpace(value)) yield return new ValidationResult("El campo es obligatorio.", [field]);
        if (HasField(nameof(Roles)) && (Roles is null || Roles.Length == 0)) yield return new ValidationResult("Debe asignar al menos un rol.", [nameof(Roles)]);
    }
}
/// <summary>Reemplaza la contraseña sin modificar el perfil.</summary>
public sealed record UsuarioPasswordRequest : IValidatableObject
{
    [Required, MinLength(8), MaxLength(72)] public required string Password { get; init; }
    public IEnumerable<ValidationResult> Validate(ValidationContext context) => UsuarioValidation.Password(Password);
}
internal static class UsuarioValidation
{
    internal static IEnumerable<ValidationResult> Password(string? value)
    {
        if (value is not null && Encoding.UTF8.GetByteCount(value) > 72)
            yield return new ValidationResult("La contraseña supera 72 bytes UTF-8.", ["Password"]);
    }
}
/// <summary>Error de operación con código público estable, sin detalles de persistencia.</summary>
public sealed class UsuarioOperationException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
