using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class EtapaComercialService(FluencyLocalDbContext db) : IEtapaComercialService
{
    public async Task<IReadOnlyList<EtapaComercialResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await db.EtapaComerciales
            .AsNoTracking()
            .OrderBy(e => e.Orden)
            .ThenBy(e => e.Id)
            .Select(e => new EtapaComercialResponse(e.Id, e.Nombre, e.Descripcion, e.Orden))
            .ToListAsync(cancellationToken);
    }
}
