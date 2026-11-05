using Services.DTO;

namespace Services.Interface;

public interface IOportunidadService
{
    Task<PageResponse<OportunidadResponse>> ListAsync(OportunidadFilters filters, int page, int pageSize, CancellationToken ct);
    Task<PageResponse<HistorialEtapaResponse>> HistorialAsync(int id, int page, int pageSize, CancellationToken ct);
    Task<FunnelResponse> FunnelAsync(int idEmbudo, int? idResponsable, CancellationToken ct);
    Task<OportunidadResponse> GetAsync(int id, CancellationToken ct);
    Task<OportunidadResponse> CreateAsync(CreateOportunidadRequest request, CancellationToken ct);
}
