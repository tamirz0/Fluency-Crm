using Services.DTO;

namespace Services.Interface;

public interface IServicioService
{
    Task<IReadOnlyList<ServicioResponse>> GetAllAsync(CancellationToken cancellationToken);
}
