using System.ComponentModel.DataAnnotations;
using System.Text;

namespace Services.DTO;

/// <summary>Credenciales de acceso; no admite campos de identidad o permisos elegidos por el cliente.</summary>
public sealed record LoginRequest : IValidatableObject
{
    [Required, MaxLength(50)]
    public required string Username { get; init; }

    [Required, MaxLength(72)]
    public required string Password { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Password is not null && Encoding.UTF8.GetByteCount(Password) > 72)
            yield return new ValidationResult("La contraseña supera el límite de 72 bytes UTF-8.", [nameof(Password)]);
    }
}

/// <summary>Identidad pública con roles/permisos actuales; nunca contiene hash ni huella.</summary>
public sealed record UsuarioResponse(int Id, string Nombre, string Apellido, string Correo,
    string Username, bool Activo, IReadOnlyList<string> Roles, IReadOnlyList<string> Permisos);

/// <summary>Identidad y vencimiento absoluto de la sesión actual.</summary>
public sealed record SesionResponse(UsuarioResponse Usuario, DateTimeOffset ExpiresAt);

/// <summary>Token de request antiforgery; el cliente lo conserva en memoria.</summary>
public sealed record CsrfResponse(string RequestToken);
