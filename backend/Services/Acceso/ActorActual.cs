using Services.DTO;

namespace Services.Acceso;

/// <summary>Actor del request, establecido después de validar la cookie contra la base.</summary>
public sealed class ActorActual
{
    private UsuarioResponse? usuario;
    public UsuarioResponse Usuario => usuario ?? throw new InvalidOperationException("No hay un actor validado en este request.");
    public int Id => Usuario.Id;
    public void Establecer(UsuarioResponse validatedUser) => usuario = validatedUser;
}
