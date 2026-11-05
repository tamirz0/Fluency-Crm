using Services.DTO;

namespace Services.Interface;

public interface IOportunidadService
{
    Task<OportunidadResponse> GetAsync(int id, CancellationToken ct);
    Task<OportunidadResponse> CreateAsync(CreateOportunidadRequest request, CancellationToken ct);
}
