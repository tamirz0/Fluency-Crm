using Services.DTO;

namespace Services.Interface;

public interface IEtapaComercialService
{
    Task<IReadOnlyList<EtapaComercialResponse>> ListAsync(int idEmbudo, string activo, CancellationToken ct);
    Task<EtapaComercialResponse> GetAsync(int id, CancellationToken ct);
    Task<EtapaComercialResponse> WriteAsync(int? id, int? idEmbudo, EtapaComercialRequest? request, bool? activo, CancellationToken ct);
    Task<IReadOnlyList<EtapaComercialResponse>> ReorderAsync(int idEmbudo, OrdenEtapasRequest request, CancellationToken ct);
}
