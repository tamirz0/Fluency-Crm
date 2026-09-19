using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class EmpresaService(FluencyLocalDbContext db) : IEmpresaService
{
    public async Task<EmpresaResponse> CreateAsync(CreateEmpresaRequest request, CancellationToken cancellationToken)
    {
        var empresa = new Empresa
        {
            RazonSocial = request.RazonSocial,
            Cuit = request.Cuit,
            Industria = request.Industria,
            Correo = request.Correo,
            Telefono = request.Telefono,
            Direccion = request.Direccion,
            IdEstado = request.IdEstado,
            IdOrigen = request.IdOrigen,
            Observaciones = request.Observaciones
        };

        db.Empresas.Add(empresa);
        await db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(empresa.Id, cancellationToken))!;
    }

    public async Task<EmpresaResponse?> GetByIdAsync(int idEmpresa, CancellationToken cancellationToken)
    {
        return await db.Empresas
            .AsNoTracking()
            .Where(e => e.Id == idEmpresa)
            .Select(e => new EmpresaResponse(
                e.Id,
                e.RazonSocial,
                e.Cuit,
                e.Industria,
                e.Correo,
                e.Telefono,
                e.Direccion,
                e.IdEstado,
                e.IdEstadoNavigation!.Descripcion,
                e.IdOrigen,
                e.IdOrigenNavigation!.Descripcion,
                e.Observaciones))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<EmpresaResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await db.Empresas
            .AsNoTracking()
            .OrderBy(e => e.RazonSocial)
            .Select(e => new EmpresaResponse(
                e.Id,
                e.RazonSocial,
                e.Cuit,
                e.Industria,
                e.Correo,
                e.Telefono,
                e.Direccion,
                e.IdEstado,
                e.IdEstadoNavigation!.Descripcion,
                e.IdOrigen,
                e.IdOrigenNavigation!.Descripcion,
                e.Observaciones))
            .ToListAsync(cancellationToken);
    }

    public async Task<UpdateEmpresaResult> UpdateAsync(
        int idEmpresa, UpdateEmpresaRequest request, CancellationToken cancellationToken)
    {
        var empresa = await db.Empresas.FirstOrDefaultAsync(e => e.Id == idEmpresa, cancellationToken);
        if (empresa is null)
        {
            return new UpdateEmpresaResult(UpdateEmpresaOutcome.NotFound, null);
        }

        empresa.RazonSocial = request.RazonSocial ?? empresa.RazonSocial;
        empresa.Cuit = request.Cuit ?? empresa.Cuit;
        empresa.Industria = request.Industria ?? empresa.Industria;
        empresa.Correo = request.Correo ?? empresa.Correo;
        empresa.Telefono = request.Telefono ?? empresa.Telefono;
        empresa.Direccion = request.Direccion ?? empresa.Direccion;
        empresa.IdEstado = request.IdEstado ?? empresa.IdEstado;
        empresa.IdOrigen = request.IdOrigen ?? empresa.IdOrigen;
        empresa.Observaciones = request.Observaciones ?? empresa.Observaciones;

        await db.SaveChangesAsync(cancellationToken);

        return new UpdateEmpresaResult(
            UpdateEmpresaOutcome.Success, (await GetByIdAsync(empresa.Id, cancellationToken))!);
    }
}
