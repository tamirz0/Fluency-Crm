using System.Data;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;

namespace Services.Implementations;

public sealed class CatalogoService(FluencyLocalDbContext db, ActorActual actor)
{
    private static CatalogoOperationException Missing() => new(404, "NOT_FOUND", "No existe el catálogo o la opción.");

    private IQueryable<CatalogoResponse> Query(string catalogo) => catalogo switch
    {
        "estados-cliente" => db.EstadoClientes.AsNoTracking().Select(x => new CatalogoResponse { Id = x.Id, Descripcion = x.Descripcion, Nombre = null, Activo = x.Activo }),
        "origenes-comerciales" => db.OrigenComerciales.AsNoTracking().Select(x => new CatalogoResponse { Id = x.Id, Descripcion = x.Descripcion, Nombre = null, Activo = x.Activo }),
        "niveles-ingles" => db.NivelesIngles.AsNoTracking().Select(x => new CatalogoResponse { Id = x.Id, Descripcion = x.Descripcion, Nombre = null, Activo = x.Activo }),
        "modalidades" => db.Modalidades.AsNoTracking().Select(x => new CatalogoResponse { Id = x.Id, Descripcion = x.Descripcion, Nombre = null, Activo = x.Activo }),
        "motivos-perdida" => db.MotivosPerdida.AsNoTracking().Select(x => new CatalogoResponse { Id = x.Id, Descripcion = x.Descripcion, Nombre = null, Activo = x.Activo }),
        "tipos-actividad" => db.TiposActividad.AsNoTracking().Select(x => new CatalogoResponse { Id = x.Id, Nombre = x.Nombre, Descripcion = null, Activo = x.Activo }),
        _ => throw Missing()
    };

    private static string Normalize(string value) => value.Trim().ToLowerInvariant()
        .Replace("á", "a").Replace("é", "e").Replace("í", "i").Replace("ó", "o").Replace("ú", "u").Replace("ü", "u").Replace("ñ", "n");

    private IQueryable<CatalogoResponse> Filter(string catalogo, string? q, string activo)
    {
        var query = Query(catalogo);
        query = activo switch
        {
            "true" => query.Where(x => x.Activo), "false" => query.Where(x => !x.Activo), "todos" => query,
            _ => throw new CatalogoOperationException(400, "VALIDATION_FAILED", "Estado inválido; use true, false o todos.")
        };
        if (!string.IsNullOrWhiteSpace(q))
        {
            var search = Normalize(q);
            query = query.Where(x => (x.Descripcion ?? x.Nombre!).ToLower()
                .Replace("á", "a").Replace("é", "e").Replace("í", "i").Replace("ó", "o").Replace("ú", "u").Replace("ü", "u").Replace("ñ", "n").Contains(search));
        }
        return query.OrderBy(x => x.Descripcion ?? x.Nombre).ThenBy(x => x.Id);
    }

    public async Task<PageResponse<CatalogoResponse>> ListAsync(string catalogo, string? q, string activo, int page, int pageSize, CancellationToken ct)
    {
        var query = Filter(catalogo, q, activo);
        var count = await query.CountAsync(ct);
        var items = await query.Skip((int)Math.Min((long)(page - 1) * pageSize, int.MaxValue)).Take(pageSize).ToListAsync(ct);
        return new(items, page, pageSize, count);
    }
    public async Task<IReadOnlyList<CatalogoResponse>> OptionsAsync(string catalogo, string? q, CancellationToken ct)
        => await Filter(catalogo, q, "true").ToListAsync(ct);
    public async Task<CatalogoResponse> GetAsync(string catalogo, int id, CancellationToken ct)
        => await Query(catalogo).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw Missing();
    public async Task<IReadOnlyList<EstadoOportunidadResponse>> StatesAsync(CancellationToken ct)
        => await db.EstadoOportunidades.AsNoTracking().OrderBy(x => x.Codigo)
            .Select(x => new EstadoOportunidadResponse(x.Id, x.Codigo, x.Descripcion)).ToListAsync(ct);

    public async Task<CatalogoResponse> WriteAsync(string catalogo, int? id, CatalogoRequest? request, bool? activo, CancellationToken ct)
    {
        object entity = catalogo switch
        {
            "estados-cliente" => new EstadoCliente(), "origenes-comerciales" => new OrigenComercial(),
            "niveles-ingles" => new NivelIngles(), "modalidades" => new Modalidad(),
            "motivos-perdida" => new MotivoPerdida(), "tipos-actividad" => new TipoActividad(), _ => throw Missing()
        };
        var field = catalogo == "tipos-actividad" ? nameof(TipoActividad.Nombre) : nameof(EstadoCliente.Descripcion);
        if (request is not null && (!request.HasField(field) || request.HasField(field == "Nombre" ? "Descripcion" : "Nombre")))
            throw new CatalogoOperationException(400, "VALIDATION_FAILED", $"Solo se admite {field.ToLowerInvariant()} en este catálogo.");

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo && u.UsuarioRoles.Any(j => j.IdRolNavigation.Nombre == RolesYPermisos.Administrador
            && j.IdRolNavigation.PermisoRoles.Any(p => p.IdPermisoNavigation.Codigo == RolesYPermisos.AdministrarConfiguracion)), ct))
            throw new CatalogoOperationException(403, "FORBIDDEN", "No tiene permiso para administrar catálogos.");
        if (id is not null) entity = await db.FindAsync(entity.GetType(), [id.Value], ct) ?? throw Missing();
        else db.Add(entity);
        var entry = db.Entry(entity);
        if (request is not null)
        {
            var label = (field == "Nombre" ? request.Nombre! : request.Descripcion!).Trim();
            var normalized = label.ToLowerInvariant();
            if (await Query(catalogo).AnyAsync(x => x.Id != (id ?? 0) && (x.Descripcion ?? x.Nombre!).Trim().ToLower() == normalized, ct))
                throw new CatalogoOperationException(409, "DUPLICATE_VALUE", "Ya existe una opción con esa etiqueta.");
            entry.Property(field).CurrentValue = label;
        }
        if (activo is not null) entry.Property("Activo").CurrentValue = activo.Value;
        await db.SaveChangesAsync(ct);
        var result = await GetAsync(catalogo, (int)entry.Property("Id").CurrentValue!, ct);
        await transaction.CommitAsync(ct);
        return result;
    }
}
