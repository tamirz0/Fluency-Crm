using Services.DTO;

namespace Services.Interface;

public interface IEstadoClienteService
{
    Task<IReadOnlyList<EstadoClienteResponse>> GetAllAsync(CancellationToken cancellationToken);
}
