using Services.DTO;

namespace Services.Interface;

public interface IEtapaComercialService
{
    Task<IReadOnlyList<EtapaComercialResponse>> GetAllAsync(CancellationToken cancellationToken);
}
