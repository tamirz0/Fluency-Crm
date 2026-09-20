using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class EstadoClienteService(FluencyLocalDbContext db) : IEstadoClienteService
{
    public async Task<IReadOnlyList<EstadoClienteResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await db.EstadoClientes
            .AsNoTracking()
            .OrderBy(e => e.Descripcion)
            .ThenBy(e => e.Id)
            .Select(e => new EstadoClienteResponse(e.Id, e.Descripcion))
            .ToListAsync(cancellationToken);
    }
}
