using System.Data;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;
using Services.Interface;
namespace Services.Implementations;

public sealed class ServicioService(FluencyLocalDbContext db, ActorActual actor) : IServicioService
{
    private static ServicioOperationException Missing() => new(404, "NOT_FOUND", "No existe el servicio.");
    private IQueryable<ServicioResponse> Query() => db.Servicios.AsNoTracking().Select(s => new ServicioResponse
    {
        Id = s.Id, Nombre = s.Nombre, Descripcion = s.Descripcion, PrecioReferencia = s.PrecioReferencia,
        DuracionHoras = s.DuracionHoras, Activo = s.Activo,
        Tipo = new TipoServicioResponse { Id = s.IdTipoServicio, Descripcion = s.IdTipoServicioNavigation.Descripcion, Activo = s.IdTipoServicioNavigation.Activo,
            NivelObligatorio = s.IdTipoServicioNavigation.Codigo == TipoServicio.CodigoClases },
        Nivel = s.IdNivelNavigation == null ? null : new CatalogoResponse { Id = s.IdNivelNavigation.Id, Descripcion = s.IdNivelNavigation.Descripcion, Activo = s.IdNivelNavigation.Activo },
        Modalidad = s.IdModalidadNavigation == null ? null : new CatalogoResponse { Id = s.IdModalidadNavigation.Id, Descripcion = s.IdModalidadNavigation.Descripcion, Activo = s.IdModalidadNavigation.Activo }
    });
    private async Task RequireAdminAsync(CancellationToken ct)
    {
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo && u.UsuarioRoles.Any(j => j.IdRolNavigation.Nombre == RolesYPermisos.Administrador
            && j.IdRolNavigation.PermisoRoles.Any(p => p.IdPermisoNavigation.Codigo == RolesYPermisos.AdministrarConfiguracion)), ct))
            throw new ServicioOperationException(403, "FORBIDDEN", "No tiene permiso para administrar servicios.");
    }
    /// <summary>Todos los tipos (también inactivos, para conservar referencias) con su regla de nivel.</summary>
    public async Task<IReadOnlyList<TipoServicioResponse>> TiposAsync(CancellationToken ct)
        => await db.TiposServicio.AsNoTracking().OrderBy(t => t.Descripcion).ThenBy(t => t.Id).Select(t => new TipoServicioResponse
        { Id = t.Id, Descripcion = t.Descripcion, Activo = t.Activo, NivelObligatorio = t.Codigo == TipoServicio.CodigoClases }).ToListAsync(ct);
    public async Task<PageResponse<ServicioResponse>> ListAsync(string? q, string activo, int? idTipoServicio, int page, int pageSize, CancellationToken ct)
    {
        if (activo != "true") await RequireAdminAsync(ct);
        var query = Query();
        if (idTipoServicio is { } typeId) query = query.Where(s => s.Tipo.Id == typeId);
        query = activo switch
        {
            "true" => query.Where(s => s.Activo), "false" => query.Where(s => !s.Activo), "todos" => query,
            _ => throw new ServicioOperationException(400, "VALIDATION_FAILED", "Estado inválido; use true, false o todos.")
        };
        if (!string.IsNullOrWhiteSpace(q))
        {
            var search = q.Trim().ToLowerInvariant().Replace("á", "a").Replace("é", "e").Replace("í", "i").Replace("ó", "o").Replace("ú", "u").Replace("ü", "u").Replace("ñ", "n");
            query = query.Where(s => s.Nombre.ToLower().Replace("á", "a").Replace("é", "e").Replace("í", "i").Replace("ó", "o").Replace("ú", "u").Replace("ü", "u").Replace("ñ", "n").Contains(search));
        }
        var count = await query.CountAsync(ct);
        var items = await query.OrderBy(s => s.Nombre).ThenBy(s => s.Id)
            .Skip((int)Math.Min((long)(page - 1) * pageSize, int.MaxValue)).Take(pageSize).ToListAsync(ct);
        return new(items, page, pageSize, count);
    }
    public async Task<ServicioResponse> GetAsync(int id, CancellationToken ct)
        => await Query().SingleOrDefaultAsync(s => s.Id == id, ct) ?? throw Missing();
    public async Task<ServicioResponse> WriteAsync(int? id, ServicioRequest? request, bool? activo, CancellationToken ct)
    {
        if (id is null && (request is null || !request.HasField(nameof(request.Nombre)) || !request.HasField(nameof(request.PrecioReferencia))
            || !request.HasField(nameof(request.IdTipoServicio)) || !request.HasField(nameof(request.IdModalidad))))
            throw new ServicioOperationException(400, "VALIDATION_FAILED", "Nombre, precio, tipo de servicio y modalidad son obligatorios.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await RequireAdminAsync(ct);
        var service = id is null ? new Servicio() : await db.Servicios.SingleOrDefaultAsync(s => s.Id == id, ct) ?? throw Missing();
        if (request is not null)
        {
            if (request.HasField(nameof(request.IdTipoServicio)) && (id is null || request.IdTipoServicio != service.IdTipoServicio))
            {
                if (!await db.TiposServicio.AnyAsync(t => t.Id == request.IdTipoServicio && t.Activo, ct))
                    throw new ServicioOperationException(400, "REFERENCE_UNAVAILABLE", "El tipo de servicio no está disponible.");
                // El tipo decide en qué embudos entra y qué módulos lo usan: un servicio ya utilizado lo conserva.
                if (id is not null && (await db.Oportunidades.AnyAsync(o => o.IdServicio == id, ct) || await db.Talleres.AnyAsync(t => t.IdServicio == id, ct)
                    || await db.Embudos.AnyAsync(e => e.Servicios.Any(s => s.Id == id), ct)))
                    throw new ServicioOperationException(409, "BUSINESS_CONFLICT", "Un servicio utilizado conserva su tipo.");
            }
            if (request.HasField(nameof(request.IdNivel)) && request.IdNivel is not null && (id is null || request.IdNivel != service.IdNivel)
                && !await db.NivelesIngles.AnyAsync(x => x.Id == request.IdNivel && x.Activo, ct))
                throw new ServicioOperationException(400, "REFERENCE_UNAVAILABLE", "El nivel no está disponible.");
            if (request.HasField(nameof(request.IdModalidad)) && request.IdModalidad is not null && (id is null || request.IdModalidad != service.IdModalidad)
                && !await db.Modalidades.AnyAsync(x => x.Id == request.IdModalidad && x.Activo, ct))
                throw new ServicioOperationException(400, "REFERENCE_UNAVAILABLE", "La modalidad no está disponible.");
            if (request.HasField(nameof(request.Nombre))) service.Nombre = request.Nombre!.Trim();
            if (request.HasField(nameof(request.Descripcion))) service.Descripcion = string.IsNullOrWhiteSpace(request.Descripcion) ? null : request.Descripcion.Trim();
            if (request.HasField(nameof(request.PrecioReferencia))) service.PrecioReferencia = request.PrecioReferencia!.Value;
            if (request.HasField(nameof(request.DuracionHoras))) service.DuracionHoras = request.DuracionHoras;
            if (request.HasField(nameof(request.IdNivel))) service.IdNivel = request.IdNivel;
            if (request.HasField(nameof(request.IdModalidad))) service.IdModalidad = request.IdModalidad;
            if (request.HasField(nameof(request.IdTipoServicio))) service.IdTipoServicio = request.IdTipoServicio!.Value;
            // Reglas del estado final: toda modalidad es obligatoria y las clases exigen nivel.
            if (service.IdModalidad is null)
                throw new ServicioOperationException(400, "VALIDATION_FAILED", "La modalidad es obligatoria.");
            if (service.IdNivel is null && await db.TiposServicio.AnyAsync(t => t.Id == service.IdTipoServicio && t.Codigo == TipoServicio.CodigoClases, ct))
                throw new ServicioOperationException(400, "VALIDATION_FAILED", "Los servicios de tipo Clases requieren un nivel de inglés.");
        }
        if (activo is not null) service.Activo = activo.Value;
        if (id is null) db.Servicios.Add(service);
        await db.SaveChangesAsync(ct);
        var result = await GetAsync(service.Id, ct);
        await transaction.CommitAsync(ct);
        return result;
    }
}
