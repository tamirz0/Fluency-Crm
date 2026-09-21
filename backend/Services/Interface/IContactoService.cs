using Services.DTO;

namespace Services.Interface;

public interface IContactoService
{
    Task<CreateContactoResult> CreateAsync(CreateContactoRequest request, CancellationToken cancellationToken);

    Task<ContactoResponse?> GetByIdAsync(int idContacto, CancellationToken cancellationToken);

    Task<IReadOnlyList<ContactoResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<UpdateContactoResult> UpdateAsync(
        int idContacto, UpdateContactoRequest request, CancellationToken cancellationToken);

    Task<UpdateContactoResult> PatchAsync(
        int idContacto, PatchContactoRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<HistorialEtapaResponse>?> GetHistorialEtapasAsync(
        int idContacto, CancellationToken cancellationToken);
}
