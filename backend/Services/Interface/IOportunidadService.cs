using Services.DTO;

namespace Services.Interface;

public interface IOportunidadService
{
    Task<IReadOnlyList<EtapaConOportunidadesResponse>> GetOportunidadesPorEtapaAsync(
        CancellationToken cancellationToken);

    Task<UpdateEtapaOportunidadResult> UpdateEtapaAsync(
        int idOportunidad,
        UpdateEtapaOportunidadRequest request,
        CancellationToken cancellationToken);

    Task<CreateOportunidadResult> CreateAsync(
        CreateOportunidadRequest request,
        CancellationToken cancellationToken);

    Task<OportunidadResponse?> GetByIdAsync(int idOportunidad, CancellationToken cancellationToken);

    Task<UpdateOportunidadResult> UpdateAsync(
        int idOportunidad,
        UpdateOportunidadRequest request,
        CancellationToken cancellationToken);

    Task<UpdateOportunidadResult> PatchAsync(
        int idOportunidad,
        PatchOportunidadRequest request,
        CancellationToken cancellationToken);
}
