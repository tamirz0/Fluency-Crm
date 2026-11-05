using System.Data;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class ContactoService(FluencyLocalDbContext db, ActorActual actor) : IContactoService
{
    private static ContactoOperationException Missing() => new(404, "NOT_FOUND", "No existe el contacto.");
    private static ContactoOperationException Unavailable(string reference)
        => new(400, "REFERENCE_UNAVAILABLE", $"{reference} no está disponible.");

    private IQueryable<ContactoResponse> Query(IQueryable<Contacto>? source = null) => (source ?? db.Contactos).AsNoTracking().Where(c => c.Activo).Select(c => new ContactoResponse
    {
        Id = c.Id, Nombre = c.Nombre, Apellido = c.Apellido, Documento = c.Documento, Cargo = c.Cargo, Correo = c.Correo,
        Telefono = c.Telefono, Observaciones = c.Observaciones,
        IdEstado = c.IdEstado!.Value, EstadoDescripcion = c.IdEstadoNavigation!.Descripcion, EstadoActivo = c.IdEstadoNavigation.Activo,
        IdOrigen = c.IdOrigen, OrigenDescripcion = c.IdOrigenNavigation == null ? null : c.IdOrigenNavigation.Descripcion,
        OrigenActivo = c.IdOrigenNavigation == null ? null : c.IdOrigenNavigation.Activo,
        IdEmpresa = c.IdEmpresa, EmpresaRazonSocial = c.IdEmpresaNavigation == null ? null : c.IdEmpresaNavigation.RazonSocial,
        IdResponsable = c.IdResponsable, ResponsableNombre = c.IdResponsableNavigation.Nombre + " " + c.IdResponsableNavigation.Apellido,
        ResponsableActivo = c.IdResponsableNavigation.Activo, FechaCreacion = c.FechaCreacion, Activo = c.Activo
    });

    public async Task<PageResponse<ContactoResponse>> ListAsync(string? q, int? idEstado, int? idOrigen, int? idResponsable, int? idEmpresa, int page, int pageSize, CancellationToken ct)
    {
        var source = db.Contactos.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
        {
            const string accents = "áàäâãåéèëêíìïîóòöôõúùüûñç";
            const string plain =   "aaaaaaeeeeiiiiooooouuuunc";
            var search = q.Trim().ToLowerInvariant();
            for (var i = 0; i < accents.Length; i++) search = search.Replace(accents[i], plain[i]);
            source = db.Contactos.FromSqlInterpolated($"""
                SELECT c.* FROM contacto c LEFT JOIN empresa e ON e.id = c.id_empresa
                WHERE strpos(translate(lower(c.nombre || ' ' || c.apellido), {accents}, {plain}), {search}) > 0
                   OR strpos(translate(lower(c.apellido || ' ' || c.nombre), {accents}, {plain}), {search}) > 0
                   OR strpos(translate(lower(c.documento), {accents}, {plain}), {search}) > 0
                   OR strpos(translate(lower(c.correo), {accents}, {plain}), {search}) > 0
                   OR strpos(translate(lower(c.telefono), {accents}, {plain}), {search}) > 0
                   OR strpos(translate(lower(e.razon_social), {accents}, {plain}), {search}) > 0
                """).AsNoTracking();
        }
        var query = Query(source);
        if (idEstado is not null) query = query.Where(c => c.IdEstado == idEstado);
        if (idOrigen is not null) query = query.Where(c => c.IdOrigen == idOrigen);
        if (idResponsable is not null) query = query.Where(c => c.IdResponsable == idResponsable);
        if (idEmpresa is not null) query = query.Where(c => c.IdEmpresa == idEmpresa);
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(c => c.Apellido).ThenBy(c => c.Nombre).ThenBy(c => c.Id)
            .Skip((int)Math.Min((long)(page - 1) * pageSize, int.MaxValue)).Take(pageSize).ToListAsync(ct);
        return new(items, page, pageSize, total);
    }

    public async Task<ContactoResponse> GetAsync(int id, CancellationToken ct)
        => await Query().SingleOrDefaultAsync(c => c.Id == id, ct) ?? throw Missing();

    public async Task<ContactoResponse> WriteAsync(int? id, ContactoRequest request, CancellationToken ct)
    {
        if (id is null && !(request.HasField(nameof(request.Nombre)) && request.HasField(nameof(request.Apellido)) && request.HasField(nameof(request.Correo))))
            throw new ContactoOperationException(400, "VALIDATION_FAILED", "Nombre, apellido y correo son obligatorios.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new ContactoOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        var contact = id is null ? new Contacto() : await db.Contactos.SingleOrDefaultAsync(c => c.Id == id && c.Activo, ct) ?? throw Missing();
        var state = request.HasField(nameof(request.IdEstado)) ? request.IdEstado : id is null
            ? await db.EstadoClientes.Where(e => e.Activo && e.Descripcion.ToLower() == "potencial").Select(e => (int?)e.Id).SingleOrDefaultAsync(ct)
            : contact.IdEstado;
        if (state is null) throw new ContactoOperationException(400, "REFERENCE_UNAVAILABLE", "El estado Potencial no está disponible. Seleccione un estado activo.");
        var responsible = request.HasField(nameof(request.IdResponsable)) ? request.IdResponsable!.Value : id is null ? actor.Id : contact.IdResponsable;
        if ((id is null || state != contact.IdEstado) && !await db.EstadoClientes.AnyAsync(e => e.Id == state && e.Activo, ct))
            throw Unavailable("El estado");
        if ((id is null || responsible != contact.IdResponsable) && !await db.Usuarios.AnyAsync(u => u.Id == responsible && u.Activo, ct))
            throw Unavailable("El responsable");
        if (request.HasField(nameof(request.IdOrigen)) && request.IdOrigen is not null && (id is null || request.IdOrigen != contact.IdOrigen)
            && !await db.OrigenComerciales.AnyAsync(o => o.Id == request.IdOrigen && o.Activo, ct))
            throw Unavailable("El origen");
        // Cambiar o quitar la empresa solo modifica este contacto: sus oportunidades y actividades conservan la suya.
        if (request.HasField(nameof(request.IdEmpresa)) && request.IdEmpresa is not null && (id is null || request.IdEmpresa != contact.IdEmpresa)
            && !await db.Empresas.AnyAsync(e => e.Id == request.IdEmpresa && e.Activo, ct))
            throw Unavailable("La empresa");
        contact.IdEstado = state; contact.IdResponsable = responsible;
        if (request.HasField(nameof(request.Nombre))) contact.Nombre = request.Nombre!.Trim();
        if (request.HasField(nameof(request.Apellido))) contact.Apellido = request.Apellido!.Trim();
        if (request.HasField(nameof(request.Correo))) contact.Correo = request.Correo!.Trim();
        if (request.HasField(nameof(request.Documento))) contact.Documento = Text(request.Documento);
        if (request.HasField(nameof(request.Cargo))) contact.Cargo = Text(request.Cargo);
        if (request.HasField(nameof(request.Telefono))) contact.Telefono = Text(request.Telefono);
        if (request.HasField(nameof(request.Observaciones))) contact.Observaciones = Text(request.Observaciones);
        if (request.HasField(nameof(request.IdOrigen))) contact.IdOrigen = request.IdOrigen;
        if (request.HasField(nameof(request.IdEmpresa))) contact.IdEmpresa = request.IdEmpresa;
        if (id is null) db.Contactos.Add(contact);
        await db.SaveChangesAsync(ct);
        var result = await GetAsync(contact.Id, ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    public async Task DeleteAsync(int id, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new ContactoOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        var contact = await db.Contactos.SingleOrDefaultAsync(c => c.Id == id && c.Activo, ct) ?? throw Missing();
        // Cualquier oportunidad activa bloquea, incluso ganada o perdida; las actividades no.
        var opportunities = await db.Oportunidades.CountAsync(o => o.IdContacto == id && o.Activo, ct);
        if (opportunities > 0)
            throw new ContactoOperationException(409, "BUSINESS_CONFLICT", $"No se puede dar de baja el contacto porque tiene {(opportunities == 1 ? "1 oportunidad activa" : $"{opportunities} oportunidades activas")}.");
        contact.Activo = false;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private static string? Text(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
