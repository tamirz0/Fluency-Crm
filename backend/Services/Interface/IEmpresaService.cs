using Services.DTO;

namespace Services.Interface;

public interface IEmpresaService
{
    Task<CreateEmpresaResult> CreateAsync(CreateEmpresaRequest request, CancellationToken cancellationToken);

    Task<EmpresaResponse?> GetByIdAsync(int idEmpresa, CancellationToken cancellationToken);

    Task<IReadOnlyList<EmpresaResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<UpdateEmpresaResult> UpdateAsync(
        int idEmpresa, UpdateEmpresaRequest request, CancellationToken cancellationToken);

    Task<UpdateEmpresaResult> PatchAsync(
        int idEmpresa, PatchEmpresaRequest request, CancellationToken cancellationToken);
}
