using Services.DTO;

namespace Services.Interface;

public interface ILoginService
{
    Task<RegisterResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);

    Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
}
