using Services.DTO;
namespace Services.Interface;
public interface IServicioService
{
    Task<PageResponse<ServicioResponse>> ListAsync(string? q, string activo, int page, int pageSize, CancellationToken ct);
    Task<ServicioResponse> GetAsync(int id, CancellationToken ct);
    Task<ServicioResponse> WriteAsync(int? id, ServicioRequest? request, bool? activo, CancellationToken ct);
}
