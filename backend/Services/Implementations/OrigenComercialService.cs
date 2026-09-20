using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class OrigenComercialService(FluencyLocalDbContext db) : IOrigenComercialService
{
    public async Task<IReadOnlyList<OrigenComercialResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await db.OrigenComerciales
            .AsNoTracking()
            .OrderBy(e => e.Descripcion)
            .ThenBy(e => e.Id)
            .Select(e => new OrigenComercialResponse(e.Id, e.Descripcion))
            .ToListAsync(cancellationToken);
    }
}
