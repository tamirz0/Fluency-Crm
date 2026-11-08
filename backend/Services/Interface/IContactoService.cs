using Services.DTO;

namespace Services.Interface;

public interface IContactoService
{
    Task<PageResponse<ContactoResponse>> ListAsync(string? q, int? idEstado, int? idOrigen, int? idResponsable, int? idEmpresa, int page, int pageSize, CancellationToken ct);
    Task<ContactoResponse> GetAsync(int id, CancellationToken ct);
    Task<ContactoResponse> WriteAsync(int? id, ContactoRequest request, CancellationToken ct);
    Task DeleteAsync(int id, CancellationToken ct);
}
