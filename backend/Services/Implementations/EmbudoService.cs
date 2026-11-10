using System.Data;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;

namespace Services.Implementations;

public sealed class EmbudoService(FluencyLocalDbContext db, ActorActual actor)
{
    // Etapas abiertas con las que nace todo embudo (Ganada y Perdida van después); luego se editan, reordenan o desactivan.
    private static readonly string[] EtapasIniciales = ["Consulta recibida", "Necesidad relevada", "Nivel de inglés evaluado", "Presupuesto enviado"];
    internal static ConfiguracionOperationException Missing(string resource) => new(404, "NOT_FOUND", $"No existe {resource}.");
    internal static ConfiguracionOperationException Conflict(string message) => new(409, "BUSINESS_CONFLICT", message);
    internal async Task RequireAdminAsync(CancellationToken ct)
    {
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo && u.UsuarioRoles.Any(j => j.IdRolNavigation.Nombre == RolesYPermisos.Administrador
            && j.IdRolNavigation.PermisoRoles.Any(p => p.IdPermisoNavigation.Codigo == RolesYPermisos.AdministrarConfiguracion)), ct))
            throw new ConfiguracionOperationException(403, "FORBIDDEN", "No tiene permiso para administrar configuración.");
    }
    private IQueryable<EmbudoResponse> Query(IQueryable<Embudo>? source = null) => (source ?? db.Embudos.AsNoTracking()).Select(e => new EmbudoResponse
    {
        Id = e.Id, Nombre = e.Nombre, Descripcion = e.Descripcion, Activo = e.Activo,
        Tipos = e.TiposServicio.OrderBy(t => t.Descripcion).ThenBy(t => t.Id).Select(t => new EmbudoTipoResponse
        {
            Tipo = new TipoServicioResponse { Id = t.Id, Descripcion = t.Descripcion, Activo = t.Activo, NivelObligatorio = t.Codigo == TipoServicio.CodigoClases },
            Servicios = e.Servicios.Where(s => s.IdTipoServicio == t.Id).OrderBy(s => s.Nombre).ThenBy(s => s.Id)
                .Select(s => new CatalogoResponse { Id = s.Id, Descripcion = s.Nombre, Activo = s.Activo }).ToList()
        }).ToList()
    });
    /// <summary>Embudos paginados; con idServicio solo los que admiten ese servicio.</summary>
    public async Task<PageResponse<EmbudoResponse>> ListAsync(string? q, string activo, int? idServicio, int page, int pageSize, CancellationToken ct)
    {
        if (activo != "true") await RequireAdminAsync(ct);
        var source = db.Embudos.AsNoTracking();
        if (idServicio is { } serviceId)
        {
            var typeId = await db.Servicios.Where(s => s.Id == serviceId).Select(s => (int?)s.IdTipoServicio).SingleOrDefaultAsync(ct);
            source = typeId is { } type ? source.Where(EmbudoAdmision.Admite(serviceId, type)) : source.Where(e => false);
        }
        var query = Query(source);
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
    /// <summary>
    /// Reemplaza la admisión del embudo (tipos y selección puntual de servicios). Solo se aceptan tipos y servicios activos, o los que
    /// ya estaban admitidos, y no puede dejar sin admisión a un servicio que ya tiene oportunidades en el embudo.
    /// </summary>
    private async Task ApplyAdmissionAsync(Embudo item, int? id, List<EmbudoTipoRequest> requested, CancellationToken ct)
    {
        var typeIds = requested.Select(t => t.IdTipoServicio).ToList();
        var serviceIds = requested.SelectMany(t => t.IdServicios ?? []).Distinct().ToList();
        var types = await db.TiposServicio.Where(t => typeIds.Contains(t.Id)).ToListAsync(ct);
        var services = await db.Servicios.Where(s => serviceIds.Contains(s.Id)).ToListAsync(ct);
        if (types.Count != typeIds.Count || services.Count != serviceIds.Count
            || types.Any(t => !t.Activo && item.TiposServicio.All(x => x.Id != t.Id))
            || services.Any(s => !s.Activo && item.Servicios.All(x => x.Id != s.Id)))
            throw new ConfiguracionOperationException(400, "REFERENCE_UNAVAILABLE", "Un tipo de servicio o un servicio no está disponible.");
        var selection = new List<(int Id, int Tipo)>();
        foreach (var type in requested)
            foreach (var serviceId in (type.IdServicios ?? []).Distinct())
            {
                if (services.Single(s => s.Id == serviceId).IdTipoServicio != type.IdTipoServicio)
                    throw new ConfiguracionOperationException(400, "VALIDATION_FAILED", "Un servicio seleccionado no pertenece a su tipo.");
                selection.Add((serviceId, type.IdTipoServicio));
            }
        if (id is not null)
        {
            var typeSet = typeIds.ToHashSet();
            var used = await db.Oportunidades.Where(o => o.IdEtapaNavigation.IdEmbudo == id)
                .Select(o => new { o.IdServicio, Tipo = o.IdServicioNavigation.IdTipoServicio }).Distinct().ToListAsync(ct);
            if (used.Any(u => !EmbudoAdmision.Admite(typeSet, selection, u.IdServicio, u.Tipo)))
                throw Conflict("El embudo tiene oportunidades de servicios que dejarían de ser admitidos.");
        }
        foreach (var gone in item.TiposServicio.Where(t => !typeIds.Contains(t.Id)).ToList()) item.TiposServicio.Remove(gone);
        foreach (var type in types.Where(t => item.TiposServicio.All(x => x.Id != t.Id))) item.TiposServicio.Add(type);
        var wanted = selection.Select(s => s.Id).ToHashSet();
        foreach (var gone in item.Servicios.Where(s => !wanted.Contains(s.Id)).ToList()) item.Servicios.Remove(gone);
        foreach (var service in services.Where(s => item.Servicios.All(x => x.Id != s.Id))) item.Servicios.Add(service);
    }
    public async Task<EmbudoResponse> WriteAsync(int? id, EmbudoRequest? request, bool? activo, CancellationToken ct)
    {
        if (id is null && (request is null || !request.HasField(nameof(request.Nombre)) || !request.HasField(nameof(request.Tipos))))
            throw new ConfiguracionOperationException(400, "VALIDATION_FAILED", "Nombre y al menos un tipo de servicio son obligatorios.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await RequireAdminAsync(ct);
        var item = id is null ? new Embudo()
            : await db.Embudos.Include(e => e.TiposServicio).Include(e => e.Servicios).SingleOrDefaultAsync(e => e.Id == id, ct) ?? throw Missing("el embudo");
        if (request is not null)
        {
            if (request.HasField(nameof(request.Tipos))) await ApplyAdmissionAsync(item, id, request.Tipos!, ct);
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
            var states = await db.EstadoOportunidades.ToDictionaryAsync(s => s.Codigo, s => s.Id, ct);
            for (var i = 0; i < EtapasIniciales.Length; i++)
                item.Etapas.Add(new EtapaComercial { Nombre = EtapasIniciales[i], IdEstado = states["ABIERTA"], Orden = i + 1 });
            item.Etapas.Add(new EtapaComercial { Nombre = "Ganada", IdEstado = states["GANADA"], Orden = EtapasIniciales.Length + 1 });
            item.Etapas.Add(new EtapaComercial { Nombre = "Perdida", IdEstado = states["PERDIDA"], Orden = EtapasIniciales.Length + 2 });
            db.Embudos.Add(item);
        }
        await db.SaveChangesAsync(ct);
        var result = await GetAsync(item.Id, ct);
        await transaction.CommitAsync(ct);
        return result;
    }
}
