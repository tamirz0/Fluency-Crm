using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class ServicioService(FluencyLocalDbContext db) : IServicioService
{
    public async Task<IReadOnlyList<ServicioResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await db.Servicios
            .AsNoTracking()
            .Where(s => s.Activo == true)
            .OrderBy(s => s.Nombre)
            .ThenBy(s => s.Id)
            .Select(s => new ServicioResponse(s.Id, s.Nombre, s.Descripcion, s.PrecioReferencia))
            .ToListAsync(cancellationToken);
    }
}
