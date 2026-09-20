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
                        o.IdEmpresaNavigation!.RazonSocial,
                        o.IdContacto,
                        o.IdContactoNavigation!.Nombre,
                        o.IdContactoNavigation!.Apellido,
                        o.IdUsuario,
                        o.IdUsuarioNavigation!.Nombre,
                        o.IdUsuarioNavigation!.Apellido,
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

        if (request.IdUsuario is int idUsuario
            && !await db.Usuarios.AnyAsync(u => u.Id == idUsuario, cancellationToken))
        {
            return new UpdateEtapaOportunidadResult(UpdateEtapaOportunidadOutcome.UsuarioNotFound, null);
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

        return new UpdateEtapaOportunidadResult(
            UpdateEtapaOportunidadOutcome.Success, await GetByIdAsync(oportunidad.Id, cancellationToken));
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

        if (!await ContactoPerteneceAEmpresaAsync(request.IdEmpresa, request.IdContacto, cancellationToken))
        {
            return new CreateOportunidadResult(CreateOportunidadOutcome.ValidationFailed, null,
                ["El contacto seleccionado no pertenece a la empresa de la oportunidad."]);
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

        return new CreateOportunidadResult(
            CreateOportunidadOutcome.Success, await GetByIdAsync(oportunidad.Id, cancellationToken), []);
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
                o.IdUsuarioNavigation!.Nombre,
                o.IdUsuarioNavigation!.Apellido,
                o.IdEmpresa,
                o.IdEmpresaNavigation!.RazonSocial,
                o.IdContacto,
                o.IdContactoNavigation!.Nombre,
                o.IdContactoNavigation!.Apellido,
                o.IdServicio,
                o.IdServicioNavigation!.Nombre,
                o.IdEtapa,
                o.IdEtapaNavigation!.Nombre,
                o.FechaEstimadaCierre,
                o.FechaCierre,
                o.IdOrigen,
                o.IdOrigenNavigation!.Descripcion,
                o.IdEstado,
                o.IdEstadoNavigation!.Descripcion,
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

        var idEmpresaFinal = request.IdEmpresa ?? oportunidad.IdEmpresa;
        var idContactoFinal = request.IdContacto ?? oportunidad.IdContacto;
        if (!await ContactoPerteneceAEmpresaAsync(idEmpresaFinal, idContactoFinal, cancellationToken))
        {
            return new UpdateOportunidadResult(UpdateOportunidadOutcome.ValidationFailed, null,
                ["El contacto seleccionado no pertenece a la empresa de la oportunidad."]);
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

        return new UpdateOportunidadResult(
            UpdateOportunidadOutcome.Success, await GetByIdAsync(oportunidad.Id, cancellationToken), []);
    }
    private async Task<bool> ContactoPerteneceAEmpresaAsync(
        int? idEmpresa, int? idContacto, CancellationToken cancellationToken)
    {
        if (idEmpresa is null || idContacto is null)
        {
            return true;
        }

        return await db.Contactos.AnyAsync(
            c => c.Id == idContacto && c.IdEmpresa == idEmpresa, cancellationToken);
    }
}
