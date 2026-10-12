using Services.DTO;

namespace Services.Acceso;

// Internal service result, never an HTTP response. Fingerprint is stored only inside the protected cookie.
public sealed record SesionUsuario(UsuarioResponse Usuario, string PasswordFingerprint);
