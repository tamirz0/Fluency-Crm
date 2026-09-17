using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class OportunidadService(FluencyLocalDbContext db) : IOportunidadService
{
    public async Task<IReadOnlyList<EtapaConOportunidadesResponse>> GetOportunidadesPorEtapaAsync(
        CancellationToken cancellationToken)
    {
        return await db.EtapaComerciales
            .AsNoTracking()
            .OrderBy(e => e.Orden)
            .Select(e => new EtapaConOportunidadesResponse(
                e.Id,
                e.Nombre,
                e.Orden,
                e.Oportunidades
                    .Select(o => new OportunidadResumenResponse(
                        o.Id,
                        o.Titulo,
                        o.IdEmpresa,
                        o.IdContacto,
                        o.IdUsuario,
                        o.FechaEstimadaCierre))
                    .ToList()))
            .ToListAsync(cancellationToken);
    }

    public async Task<UpdateEtapaOportunidadResult> UpdateEtapaAsync(
        int idOportunidad,
        UpdateEtapaOportunidadRequest request,
        CancellationToken cancellationToken)
    {
        var oportunidad = await db.Oportunidades
            .FirstOrDefaultAsync(o => o.Id == idOportunidad, cancellationToken);

        if (oportunidad is null)
        {
            return new UpdateEtapaOportunidadResult(UpdateEtapaOportunidadOutcome.OportunidadNotFound, null);
        }

        var nuevaEtapaExiste = await db.EtapaComerciales
            .AnyAsync(e => e.Id == request.IdNuevaEtapa, cancellationToken);

        if (!nuevaEtapaExiste)
        {
            return new UpdateEtapaOportunidadResult(UpdateEtapaOportunidadOutcome.EtapaNotFound, null);
        }

        var idEtapaAnterior = oportunidad.IdEtapa;
        oportunidad.IdEtapa = request.IdNuevaEtapa;

        db.HistorialEtapas.Add(new HistorialEtapa
        {
            IdOportunidad = oportunidad.Id,
            IdEtapaAnterior = idEtapaAnterior,
            IdNuevaEtapa = request.IdNuevaEtapa,
            IdUsuario = request.IdUsuario,
            Observacion = request.Observacion
        });

        await db.SaveChangesAsync(cancellationToken);

        var response = new OportunidadResponse(
            oportunidad.Id,
            oportunidad.Titulo,
            oportunidad.IdUsuario,
            oportunidad.IdEmpresa,
            oportunidad.IdContacto,
            oportunidad.IdServicio,
            oportunidad.IdEtapa,
            oportunidad.FechaEstimadaCierre,
            oportunidad.FechaCierre,
            oportunidad.IdOrigen,
            oportunidad.IdEstado,
            oportunidad.Observaciones);

        return new UpdateEtapaOportunidadResult(UpdateEtapaOportunidadOutcome.Success, response);
    }

    public async Task<CreateOportunidadResult> CreateAsync(
        CreateOportunidadRequest request,
        CancellationToken cancellationToken)
    {
        var errors = new List<string>();

        if (request.IdEmpresa is null && request.IdContacto is null)
        {
            errors.Add("La oportunidad debe estar asociada a una empresa o a un contacto.");
        }

        if (!await db.Usuarios.AnyAsync(u => u.Id == request.IdUsuario, cancellationToken))
        {
            errors.Add($"No existe el usuario {request.IdUsuario}.");
        }

        if (!await db.EtapaComerciales.AnyAsync(e => e.Id == request.IdEtapa, cancellationToken))
        {
            errors.Add($"No existe la etapa comercial {request.IdEtapa}.");
        }

        if (request.IdEmpresa is int idEmpresa
            && !await db.Empresas.AnyAsync(e => e.Id == idEmpresa, cancellationToken))
        {
            errors.Add($"No existe la empresa {idEmpresa}.");
        }

        if (request.IdContacto is int idContacto
            && !await db.Contactos.AnyAsync(c => c.Id == idContacto, cancellationToken))
        {
            errors.Add($"No existe el contacto {idContacto}.");
        }

        if (request.IdServicio is int idServicio
            && !await db.Servicios.AnyAsync(s => s.Id == idServicio, cancellationToken))
        {
            errors.Add($"No existe el servicio {idServicio}.");
        }

        if (request.IdOrigen is int idOrigen
            && !await db.OrigenComerciales.AnyAsync(o => o.Id == idOrigen, cancellationToken))
        {
            errors.Add($"No existe el origen comercial {idOrigen}.");
        }

        if (request.IdEstado is int idEstado
            && !await db.EstadoClientes.AnyAsync(e => e.Id == idEstado, cancellationToken))
        {
            errors.Add($"No existe el estado {idEstado}.");
        }

        if (errors.Count > 0)
        {
            return new CreateOportunidadResult(CreateOportunidadOutcome.ValidationFailed, null, errors);
        }

        var oportunidad = new Oportunidad
        {
            Titulo = request.Titulo,
            IdUsuario = request.IdUsuario,
            IdEtapa = request.IdEtapa,
            IdEmpresa = request.IdEmpresa,
            IdContacto = request.IdContacto,
            IdServicio = request.IdServicio,
            FechaEstimadaCierre = request.FechaEstimadaCierre,
            IdOrigen = request.IdOrigen,
            IdEstado = request.IdEstado,
            Observaciones = request.Observaciones
        };

        db.Oportunidades.Add(oportunidad);
        await db.SaveChangesAsync(cancellationToken);

        var response = new OportunidadResponse(
            oportunidad.Id,
            oportunidad.Titulo,
            oportunidad.IdUsuario,
            oportunidad.IdEmpresa,
            oportunidad.IdContacto,
            oportunidad.IdServicio,
            oportunidad.IdEtapa,
            oportunidad.FechaEstimadaCierre,
            oportunidad.FechaCierre,
            oportunidad.IdOrigen,
            oportunidad.IdEstado,
            oportunidad.Observaciones);

        return new CreateOportunidadResult(CreateOportunidadOutcome.Success, response, []);
    }

    public async Task<OportunidadResponse?> GetByIdAsync(int idOportunidad, CancellationToken cancellationToken)
    {
        return await db.Oportunidades
            .AsNoTracking()
            .Where(o => o.Id == idOportunidad)
            .Select(o => new OportunidadResponse(
                o.Id,
                o.Titulo,
                o.IdUsuario,
                o.IdEmpresa,
                o.IdContacto,
                o.IdServicio,
                o.IdEtapa,
                o.FechaEstimadaCierre,
                o.FechaCierre,
                o.IdOrigen,
                o.IdEstado,
                o.Observaciones))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<UpdateOportunidadResult> UpdateAsync(
        int idOportunidad,
        UpdateOportunidadRequest request,
        CancellationToken cancellationToken)
    {
        var oportunidad = await db.Oportunidades
            .FirstOrDefaultAsync(o => o.Id == idOportunidad, cancellationToken);

        if (oportunidad is null)
        {
            return new UpdateOportunidadResult(UpdateOportunidadOutcome.NotFound, null, []);
        }

        var errors = new List<string>();

        if (request.IdUsuario is int idUsuario
            && !await db.Usuarios.AnyAsync(u => u.Id == idUsuario, cancellationToken))
        {
            errors.Add($"No existe el usuario {idUsuario}.");
        }

        if (request.IdEmpresa is int idEmpresa
            && !await db.Empresas.AnyAsync(e => e.Id == idEmpresa, cancellationToken))
        {
            errors.Add($"No existe la empresa {idEmpresa}.");
        }

        if (request.IdContacto is int idContacto
            && !await db.Contactos.AnyAsync(c => c.Id == idContacto, cancellationToken))
        {
            errors.Add($"No existe el contacto {idContacto}.");
        }

        if (request.IdServicio is int idServicio
            && !await db.Servicios.AnyAsync(s => s.Id == idServicio, cancellationToken))
        {
            errors.Add($"No existe el servicio {idServicio}.");
        }

        if (request.IdOrigen is int idOrigen
            && !await db.OrigenComerciales.AnyAsync(o => o.Id == idOrigen, cancellationToken))
        {
            errors.Add($"No existe el origen comercial {idOrigen}.");
        }

        if (request.IdEstado is int idEstado
            && !await db.EstadoClientes.AnyAsync(e => e.Id == idEstado, cancellationToken))
        {
            errors.Add($"No existe el estado {idEstado}.");
        }

        if (errors.Count > 0)
        {
            return new UpdateOportunidadResult(UpdateOportunidadOutcome.ValidationFailed, null, errors);
        }

        oportunidad.Titulo = request.Titulo ?? oportunidad.Titulo;
        oportunidad.IdUsuario = request.IdUsuario ?? oportunidad.IdUsuario;
        oportunidad.IdEmpresa = request.IdEmpresa ?? oportunidad.IdEmpresa;
        oportunidad.IdContacto = request.IdContacto ?? oportunidad.IdContacto;
        oportunidad.IdServicio = request.IdServicio ?? oportunidad.IdServicio;
        oportunidad.FechaEstimadaCierre = request.FechaEstimadaCierre ?? oportunidad.FechaEstimadaCierre;
        oportunidad.IdOrigen = request.IdOrigen ?? oportunidad.IdOrigen;
        oportunidad.IdEstado = request.IdEstado ?? oportunidad.IdEstado;
        oportunidad.Observaciones = request.Observaciones ?? oportunidad.Observaciones;

        await db.SaveChangesAsync(cancellationToken);

        var response = new OportunidadResponse(
            oportunidad.Id,
            oportunidad.Titulo,
            oportunidad.IdUsuario,
            oportunidad.IdEmpresa,
            oportunidad.IdContacto,
            oportunidad.IdServicio,
            oportunidad.IdEtapa,
            oportunidad.FechaEstimadaCierre,
            oportunidad.FechaCierre,
            oportunidad.IdOrigen,
            oportunidad.IdEstado,
            oportunidad.Observaciones);

        return new UpdateOportunidadResult(UpdateOportunidadOutcome.Success, response, []);
    }
}
