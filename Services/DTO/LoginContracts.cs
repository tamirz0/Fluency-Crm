using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Payload para registrar un nuevo usuario.</summary>
public sealed record RegisterRequest
{
    [Required, MaxLength(100)]
    public required string Nombre { get; init; }

    [Required, MaxLength(100)]
    public required string Apellido { get; init; }

    [Required, MaxLength(150), EmailAddress]
    public required string Correo { get; init; }

    [Required, MaxLength(50)]
    public required string Username { get; init; }

    [Required, MinLength(6)]
    public required string Password { get; init; }
}

/// <summary>Payload para iniciar sesión.</summary>
public sealed record LoginRequest
{
    [Required]
    public required string Username { get; init; }

    [Required]
    public required string Password { get; init; }
}

/// <summary>Datos de un usuario (nunca incluye el hash de la contraseña).</summary>
public sealed record UsuarioResponse(
    int Id,
    string Nombre,
    string Apellido,
    string Correo,
    string Username,
    bool? Activo);

public enum RegisterOutcome
{
    Success,
    UsernameTaken
}

public sealed record RegisterResult(RegisterOutcome Outcome, UsuarioResponse? Usuario);

public enum LoginOutcome
{
    Success,
    InvalidCredentials
}

public sealed record LoginResult(LoginOutcome Outcome, UsuarioResponse? Usuario);
