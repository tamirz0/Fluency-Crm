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
        Nivel = s.IdNivelNavigation == null ? null : new CatalogoResponse { Id = s.IdNivelNavigation.Id, Descripcion = s.IdNivelNavigation.Descripcion, Activo = s.IdNivelNavigation.Activo },
        Modalidad = s.IdModalidadNavigation == null ? null : new CatalogoResponse { Id = s.IdModalidadNavigation.Id, Descripcion = s.IdModalidadNavigation.Descripcion, Activo = s.IdModalidadNavigation.Activo }
    });
    private async Task RequireAdminAsync(CancellationToken ct)
    {
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo && u.UsuarioRoles.Any(j => j.IdRolNavigation.Nombre == RolesYPermisos.Administrador
            && j.IdRolNavigation.PermisoRoles.Any(p => p.IdPermisoNavigation.Codigo == RolesYPermisos.AdministrarConfiguracion)), ct))
            throw new ServicioOperationException(403, "FORBIDDEN", "No tiene permiso para administrar servicios.");
    }
    public async Task<PageResponse<ServicioResponse>> ListAsync(string? q, string activo, int page, int pageSize, CancellationToken ct)
    {
        if (activo != "true") await RequireAdminAsync(ct);
        var query = Query();
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
        if (id is null && (request is null || !request.HasField(nameof(request.Nombre)) || !request.HasField(nameof(request.PrecioReferencia))))
            throw new ServicioOperationException(400, "VALIDATION_FAILED", "Nombre y precio son obligatorios.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await RequireAdminAsync(ct);
        var service = id is null ? new Servicio() : await db.Servicios.SingleOrDefaultAsync(s => s.Id == id, ct) ?? throw Missing();
        if (request is not null)
        {
            if (request.HasField(nameof(request.IdNivel)) && request.IdNivel is not null && (id is null || request.IdNivel != service.IdNivel)
                && !await db.NivelesIngles.AnyAsync(x => x.Id == request.IdNivel && x.Activo, ct))
                throw new ServicioOperationException(400, "REFERENCE_UNAVAILABLE", "El nivel no está disponible.");
            if (request.HasField(nameof(request.IdModalidad)) && request.IdModalidad is not null && (id is null || request.IdModalidad != service.IdModalidad)
                && !await db.Modalidades.AnyAsync(x => x.Id == request.IdModalidad && x.Activo, ct))
                throw new ServicioOperationException(400, "REFERENCE_UNAVAILABLE", "La modalidad no está disponible.");
            if (request.HasField(nameof(request.Nombre))) service.Nombre = request.Nombre!.Trim();
            if (request.HasField(nameof(request.Descripcion))) service.Descripcion = request.Descripcion?.Trim();
            if (request.HasField(nameof(request.PrecioReferencia))) service.PrecioReferencia = request.PrecioReferencia!.Value;
            if (request.HasField(nameof(request.DuracionHoras))) service.DuracionHoras = request.DuracionHoras;
            if (request.HasField(nameof(request.IdNivel))) service.IdNivel = request.IdNivel;
            if (request.HasField(nameof(request.IdModalidad))) service.IdModalidad = request.IdModalidad;
        }
        if (activo is not null) service.Activo = activo.Value;
        if (id is null) db.Servicios.Add(service);
        await db.SaveChangesAsync(ct);
        var result = await GetAsync(service.Id, ct);
        await transaction.CommitAsync(ct);
        return result;
    }
}
