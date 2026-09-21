using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class ContactoService(FluencyLocalDbContext db) : IContactoService
{
    public async Task<CreateContactoResult> CreateAsync(
        CreateContactoRequest request,
        CancellationToken cancellationToken)
    {
        var errors = await ValidateReferencesAsync(
            request.IdEstado, request.IdOrigen, request.IdEmpresa, cancellationToken);
        if (errors.Count > 0)
        {
            return new CreateContactoResult(CreateContactoOutcome.ValidationFailed, null, errors);
        }

        var contacto = new Contacto
        {
            Nombre = request.Nombre,
            Apellido = request.Apellido,
            Correo = request.Correo,
            Documento = request.Documento,
            Cargo = request.Cargo,
            Telefono = request.Telefono,
            IdEstado = request.IdEstado,
            IdOrigen = request.IdOrigen,
            IdEmpresa = request.IdEmpresa,
            Observaciones = request.Observaciones
        };

        db.Contactos.Add(contacto);
        await db.SaveChangesAsync(cancellationToken);

        return new CreateContactoResult(
            CreateContactoOutcome.Success,
            await GetByIdAsync(contacto.Id, cancellationToken),
            []);
    }

    public async Task<ContactoResponse?> GetByIdAsync(int idContacto, CancellationToken cancellationToken)
    {
        return await db.Contactos
            .AsNoTracking()
            .Where(c => c.Id == idContacto)
            .Select(c => new ContactoResponse(
                c.Id,
                c.Nombre,
                c.Apellido,
                c.Documento,
                c.Cargo,
                c.Correo,
                c.Telefono,
                c.IdEstado,
                c.IdEstadoNavigation!.Descripcion,
                c.IdOrigen,
                c.IdOrigenNavigation!.Descripcion,
                c.IdEmpresa,
                c.IdEmpresaNavigation!.RazonSocial,
                c.Observaciones))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ContactoResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await db.Contactos
            .AsNoTracking()
            .OrderBy(c => c.Apellido)
            .ThenBy(c => c.Nombre)
            .Select(c => new ContactoResponse(
                c.Id,
                c.Nombre,
                c.Apellido,
                c.Documento,
                c.Cargo,
                c.Correo,
                c.Telefono,
                c.IdEstado,
                c.IdEstadoNavigation!.Descripcion,
                c.IdOrigen,
                c.IdOrigenNavigation!.Descripcion,
                c.IdEmpresa,
                c.IdEmpresaNavigation!.RazonSocial,
                c.Observaciones))
            .ToListAsync(cancellationToken);
    }

    public async Task<UpdateContactoResult> UpdateAsync(
        int idContacto, UpdateContactoRequest request, CancellationToken cancellationToken)
    {
        var contacto = await db.Contactos.FirstOrDefaultAsync(c => c.Id == idContacto, cancellationToken);
        if (contacto is null)
        {
            return new UpdateContactoResult(UpdateContactoOutcome.NotFound, null, []);
        }

        var errors = await ValidateReferencesAsync(
            request.IdEstado, request.IdOrigen, request.IdEmpresa, cancellationToken);
        if (errors.Count > 0)
        {
            return new UpdateContactoResult(UpdateContactoOutcome.ValidationFailed, null, errors);
        }

        var idEmpresaFinal = request.IdEmpresa ?? contacto.IdEmpresa;
        if (!await PuedeCambiarEmpresaAsync(contacto.Id, contacto.IdEmpresa, idEmpresaFinal, cancellationToken))
        {
            return new UpdateContactoResult(UpdateContactoOutcome.ValidationFailed, null,
                ["No se puede cambiar la empresa de un contacto que tiene oportunidades asociadas."]);
        }

        contacto.Nombre = request.Nombre ?? contacto.Nombre;
        contacto.Apellido = request.Apellido ?? contacto.Apellido;
        contacto.Correo = request.Correo ?? contacto.Correo;
        contacto.Documento = request.Documento ?? contacto.Documento;
        contacto.Cargo = request.Cargo ?? contacto.Cargo;
        contacto.Telefono = request.Telefono ?? contacto.Telefono;
        contacto.IdEstado = request.IdEstado ?? contacto.IdEstado;
        contacto.IdOrigen = request.IdOrigen ?? contacto.IdOrigen;
        contacto.IdEmpresa = request.IdEmpresa ?? contacto.IdEmpresa;
        contacto.Observaciones = request.Observaciones ?? contacto.Observaciones;

        await db.SaveChangesAsync(cancellationToken);

        return new UpdateContactoResult(
            UpdateContactoOutcome.Success, (await GetByIdAsync(contacto.Id, cancellationToken))!, []);
    }

    public async Task<UpdateContactoResult> PatchAsync(
        int idContacto, PatchContactoRequest request, CancellationToken cancellationToken)
    {
        var contacto = await db.Contactos.FirstOrDefaultAsync(c => c.Id == idContacto, cancellationToken);
        if (contacto is null)
        {
            return new UpdateContactoResult(UpdateContactoOutcome.NotFound, null, []);
        }

        var errors = await ValidateReferencesAsync(
            request.IdEstado, request.IdOrigen, request.IdEmpresa, cancellationToken);
        if (errors.Count > 0)
        {
            return new UpdateContactoResult(UpdateContactoOutcome.ValidationFailed, null, errors);
        }

        var idEmpresaFinal = request.HasField(nameof(request.IdEmpresa)) ? request.IdEmpresa : contacto.IdEmpresa;
        if (!await PuedeCambiarEmpresaAsync(contacto.Id, contacto.IdEmpresa, idEmpresaFinal, cancellationToken))
        {
            return new UpdateContactoResult(UpdateContactoOutcome.ValidationFailed, null,
                ["No se puede cambiar la empresa de un contacto que tiene oportunidades asociadas."]);
        }

        if (request.HasField(nameof(request.Nombre))) contacto.Nombre = request.Nombre!;
        if (request.HasField(nameof(request.Apellido))) contacto.Apellido = request.Apellido!;
        if (request.HasField(nameof(request.Correo))) contacto.Correo = request.Correo!;
        if (request.HasField(nameof(request.Documento))) contacto.Documento = request.Documento;
        if (request.HasField(nameof(request.Cargo))) contacto.Cargo = request.Cargo;
        if (request.HasField(nameof(request.Telefono))) contacto.Telefono = request.Telefono;
        if (request.HasField(nameof(request.IdEstado))) contacto.IdEstado = request.IdEstado;
        if (request.HasField(nameof(request.IdOrigen))) contacto.IdOrigen = request.IdOrigen;
        if (request.HasField(nameof(request.IdEmpresa))) contacto.IdEmpresa = request.IdEmpresa;
        if (request.HasField(nameof(request.Observaciones))) contacto.Observaciones = request.Observaciones;

        await db.SaveChangesAsync(cancellationToken);

        return new UpdateContactoResult(
            UpdateContactoOutcome.Success, (await GetByIdAsync(contacto.Id, cancellationToken))!, []);
    }

    public async Task<IReadOnlyList<HistorialEtapaResponse>?> GetHistorialEtapasAsync(
        int idContacto, CancellationToken cancellationToken)
    {
        var existeContacto = await db.Contactos.AnyAsync(c => c.Id == idContacto, cancellationToken);
        if (!existeContacto)
        {
            return null;
        }

        return await db.HistorialEtapas
            .AsNoTracking()
            .Where(h => h.IdOportunidadNavigation!.IdContacto == idContacto)
            .OrderByDescending(h => h.Fecha)
            .Select(h => new HistorialEtapaResponse(
                h.Id,
                h.IdOportunidad,
                h.IdOportunidadNavigation!.Titulo,
                h.IdEtapaAnterior,
                h.IdEtapaAnteriorNavigation!.Nombre,
                h.IdNuevaEtapa,
                h.IdNuevaEtapaNavigation!.Nombre,
                h.Fecha,
                h.IdUsuario,
                h.IdUsuarioNavigation!.Nombre,
                h.IdUsuarioNavigation!.Apellido,
                h.Observacion))
            .ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<string>> ValidateReferencesAsync(
        int? idEstado,
        int? idOrigen,
        int? idEmpresa,
        CancellationToken cancellationToken)
    {
        var errors = new List<string>();

        if (idEstado is int estado
            && !await db.EstadoClientes.AnyAsync(e => e.Id == estado, cancellationToken))
        {
            errors.Add($"No existe el estado {estado}.");
        }

        if (idOrigen is int origen
            && !await db.OrigenComerciales.AnyAsync(o => o.Id == origen, cancellationToken))
        {
            errors.Add($"No existe el origen comercial {origen}.");
        }

        if (idEmpresa is int empresa
            && !await db.Empresas.AnyAsync(e => e.Id == empresa, cancellationToken))
        {
            errors.Add($"No existe la empresa {empresa}.");
        }

        return errors;
    }

    private async Task<bool> PuedeCambiarEmpresaAsync(
        int idContacto,
        int? idEmpresaOriginal,
        int? idEmpresaFinal,
        CancellationToken cancellationToken)
    {
        if (idEmpresaOriginal == idEmpresaFinal)
        {
            return true;
        }

        return !await db.Oportunidades.AnyAsync(o => o.IdContacto == idContacto, cancellationToken);
    }
}
