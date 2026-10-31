using System.Data;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;

namespace Services.Implementations;

public sealed class EmbudoService(FluencyLocalDbContext db, ActorActual actor)
{
    internal static ConfiguracionOperationException Missing(string resource) => new(404, "NOT_FOUND", $"No existe {resource}.");
    internal static ConfiguracionOperationException Conflict(string message) => new(409, "BUSINESS_CONFLICT", message);
    internal async Task RequireAdminAsync(CancellationToken ct)
    {
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo && u.UsuarioRoles.Any(j => j.IdRolNavigation.Nombre == RolesYPermisos.Administrador
            && j.IdRolNavigation.PermisoRoles.Any(p => p.IdPermisoNavigation.Codigo == RolesYPermisos.AdministrarConfiguracion)), ct))
            throw new ConfiguracionOperationException(403, "FORBIDDEN", "No tiene permiso para administrar configuración.");
    }
    private IQueryable<EmbudoResponse> Query() => db.Embudos.AsNoTracking().Select(e => new EmbudoResponse
    {
        Id = e.Id, Nombre = e.Nombre, Descripcion = e.Descripcion, Activo = e.Activo,
        Servicio = new CatalogoResponse { Id = e.IdServicio, Descripcion = e.IdServicioNavigation.Nombre, Activo = e.IdServicioNavigation.Activo }
    });
    public async Task<PageResponse<EmbudoResponse>> ListAsync(string? q, string activo, int page, int pageSize, CancellationToken ct)
    {
        if (activo != "true") await RequireAdminAsync(ct);
        var query = Query();
        query = activo switch { "true" => query.Where(e => e.Activo), "false" => query.Where(e => !e.Activo), "todos" => query,
            _ => throw new ConfiguracionOperationException(400, "VALIDATION_FAILED", "Estado inválido; use true, false o todos.") };
        if (!string.IsNullOrWhiteSpace(q))
        {
            var search = q.Trim().ToLowerInvariant().Replace("á", "a").Replace("é", "e").Replace("í", "i").Replace("ó", "o").Replace("ú", "u").Replace("ü", "u").Replace("ñ", "n");
            query = query.Where(e => e.Nombre.ToLower().Replace("á", "a").Replace("é", "e").Replace("í", "i").Replace("ó", "o").Replace("ú", "u").Replace("ü", "u").Replace("ñ", "n").Contains(search));
        }
        var count = await query.CountAsync(ct);
        return new(await query.OrderBy(e => e.Nombre).ThenBy(e => e.Id).Skip((int)Math.Min((long)(page - 1) * pageSize, int.MaxValue)).Take(pageSize).ToListAsync(ct), page, pageSize, count);
    }
    public async Task<EmbudoResponse> GetAsync(int id, CancellationToken ct) => await Query().SingleOrDefaultAsync(e => e.Id == id, ct) ?? throw Missing("el embudo");
    public async Task<EmbudoResponse> WriteAsync(int? id, EmbudoRequest? request, bool? activo, CancellationToken ct)
    {
        if (id is null && (request is null || !request.HasField(nameof(request.Nombre)) || !request.HasField(nameof(request.IdServicio))))
            throw new ConfiguracionOperationException(400, "VALIDATION_FAILED", "Nombre y servicio son obligatorios.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await RequireAdminAsync(ct);
        var item = id is null ? new Embudo() : await db.Embudos.SingleOrDefaultAsync(e => e.Id == id, ct) ?? throw Missing("el embudo");
        if (request is not null)
        {
            if (request.HasField(nameof(request.IdServicio)) && (id is null || request.IdServicio != item.IdServicio))
            {
                // Include both ends of history, even when the opportunity has been given baja.
                var used = id is not null && await db.Database.SqlQuery<int>($"""
                    SELECT 1 AS "Value" FROM etapa_comercial e WHERE e.id_embudo={id}
                    AND (EXISTS (SELECT 1 FROM oportunidad o WHERE o.id_etapa=e.id)
                      OR EXISTS (SELECT 1 FROM historial_etapas h WHERE h.id_etapa_anterior=e.id OR h.id_nueva_etapa=e.id))
                    """).AnyAsync(ct);
                if (used) throw Conflict("Un embudo utilizado conserva su servicio.");
                if (!await db.Servicios.AnyAsync(s => s.Id == request.IdServicio && s.Activo, ct))
                    throw new ConfiguracionOperationException(400, "REFERENCE_UNAVAILABLE", "El servicio no está disponible.");
                item.IdServicio = request.IdServicio!.Value;
            }
            if (request.HasField(nameof(request.Nombre))) item.Nombre = request.Nombre!.Trim();
            if (request.HasField(nameof(request.Descripcion))) item.Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim();
        }
        if (activo == false && item.Activo && await db.Database.SqlQuery<int>($"""
            SELECT 1 AS "Value" FROM oportunidad o JOIN etapa_comercial e ON e.id=o.id_etapa
            JOIN estado_oportunidad s ON s.id=e.id_estado WHERE e.id_embudo={id} AND o.activo AND s.codigo='ABIERTA'
            """).AnyAsync(ct)) throw Conflict("El embudo tiene oportunidades abiertas y activas.");
        if (activo is not null) item.Activo = activo.Value;
        if (id is null)
        {
            var states = await db.EstadoOportunidades.Where(s => s.Codigo == "GANADA" || s.Codigo == "PERDIDA").ToDictionaryAsync(s => s.Codigo, s => s.Id, ct);
            item.Etapas.Add(new EtapaComercial { Nombre = "Ganada", IdEstado = states["GANADA"], Orden = 1 });
            item.Etapas.Add(new EtapaComercial { Nombre = "Perdida", IdEstado = states["PERDIDA"], Orden = 2 });
            db.Embudos.Add(item);
        }
        await db.SaveChangesAsync(ct);
        var result = await GetAsync(item.Id, ct);
        await transaction.CommitAsync(ct);
        return result;
    }
}
