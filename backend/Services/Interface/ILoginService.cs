using Services.Acceso;
using Services.DTO;

namespace Services.Interface;

public interface ILoginService
{
    Task<SesionUsuario?> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<SesionUsuario?> GetSessionAsync(int id, CancellationToken cancellationToken);
}
