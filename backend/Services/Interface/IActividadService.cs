using Services.DTO;

namespace Services.Interface;

public interface IActividadService
{
    Task<PageResponse<ActividadResponse>> ListAsync(ActividadFilters filters, int page, int pageSize, CancellationToken ct);
    Task<ActividadResponse> GetAsync(int id, CancellationToken ct);
    Task<ActividadResponse> CreateAsync(CreateActividadRequest request, CancellationToken ct);
}
