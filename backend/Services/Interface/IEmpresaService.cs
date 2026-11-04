using Services.DTO;

namespace Services.Interface;

public interface IEmpresaService
{
    Task<PageResponse<EmpresaResponse>> ListAsync(string? q, int? idEstado, int? idOrigen, int? idResponsable, int page, int pageSize, CancellationToken ct);
    Task<EmpresaResponse> GetAsync(int id, CancellationToken ct);
    Task<EmpresaResponse> WriteAsync(int? id, EmpresaRequest request, CancellationToken ct);
    Task DeleteAsync(int id, CancellationToken ct);
}
