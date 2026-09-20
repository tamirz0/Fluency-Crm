using Services.DTO;

namespace Services.Interface;

public interface IOrigenComercialService
{
    Task<IReadOnlyList<OrigenComercialResponse>> GetAllAsync(CancellationToken cancellationToken);
}
