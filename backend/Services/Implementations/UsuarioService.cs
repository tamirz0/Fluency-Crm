using System.Data;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;

namespace Services.Implementations;

public sealed class UsuarioService(FluencyLocalDbContext db, ActorActual actor)
{
    private static readonly string[] KnownRoles = [RolesYPermisos.Administrador, RolesYPermisos.ResponsableComercial, RolesYPermisos.Vendedor];
    private static readonly System.Linq.Expressions.Expression<Func<Usuario, UsuarioResponse>> Response = u => new UsuarioResponse(
        u.Id, u.Nombre, u.Apellido, u.Correo, u.Username, u.Activo,
        u.UsuarioRoles.Select(j => j.IdRolNavigation.Nombre).OrderBy(n => n).ToArray(),
        u.UsuarioRoles.SelectMany(j => j.IdRolNavigation.PermisoRoles).Select(j => j.IdPermisoNavigation.Codigo).Distinct().OrderBy(n => n).ToArray());
    public async Task<IReadOnlyList<RolResponse>> RolesAsync(CancellationToken ct) => await db.Roles.AsNoTracking().OrderBy(r => r.Nombre)
        .Select(r => new RolResponse(r.Nombre, r.Descripcion ?? r.Nombre)).ToListAsync(ct);
    private IQueryable<Usuario> Filter(UsuarioQuery query, bool options)
    {
        var users = db.Usuarios.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            const string accents = "áàäâãåéèëêíìïîóòöôõúùüûñç";
            const string plain =   "aaaaaaeeeeiiiiooooouuuunc";
            var q = query.Q.Trim().ToLowerInvariant();
            for (var i = 0; i < accents.Length; i++) q = q.Replace(accents[i], plain[i]);
            users = db.Usuarios.FromSqlInterpolated($"""
                SELECT * FROM usuario
                WHERE strpos(translate(lower(nombre || ' ' || apellido), {accents}, {plain}), {q}) > 0
                   OR strpos(lower(username), {q}) > 0
                   OR ({!options} AND strpos(lower(correo), {q}) > 0)
                """).AsNoTracking();
        }
        if (options) users = users.Where(u => u.Activo);
        else if (query.Activo is { } active) users = users.Where(u => u.Activo == active);
        if (!string.IsNullOrWhiteSpace(query.Rol))
        {
            if (!KnownRoles.Contains(query.Rol)) throw new UsuarioOperationException(400, "VALIDATION_FAILED", "El rol no es válido.");
            users = users.Where(u => u.UsuarioRoles.Any(j => j.IdRolNavigation.Nombre == query.Rol));
        }
        return users;
    }
    public async Task<PageResponse<UsuarioResponse>> ListAsync(UsuarioQuery query, CancellationToken ct)
    {
        var users = Filter(query, false);
        var total = await users.CountAsync(ct);
        var items = await users.OrderBy(u => u.Apellido).ThenBy(u => u.Nombre).ThenBy(u => u.Id)
            .Skip(Skip(query)).Take(query.PageSize).Select(Response).ToListAsync(ct);
        return new(items, query.Page, query.PageSize, total);
    }
    public async Task<PageResponse<UsuarioOpcionResponse>> OptionsAsync(UsuarioQuery query, CancellationToken ct)
    {
        var users = Filter(query, true);
        var total = await users.CountAsync(ct);
        var items = await users.OrderBy(u => u.Apellido).ThenBy(u => u.Nombre).ThenBy(u => u.Id).Skip(Skip(query)).Take(query.PageSize)
            .Select(u => new UsuarioOpcionResponse(u.Id, u.Nombre, u.Apellido, u.UsuarioRoles.Select(j => j.IdRolNavigation.Nombre).OrderBy(n => n).ToArray())).ToListAsync(ct);
        return new(items, query.Page, query.PageSize, total);
    }
    private static int Skip(UsuarioQuery query) => (int)Math.Min((long)(query.Page - 1) * query.PageSize, int.MaxValue);
    public async Task<UsuarioResponse> GetAsync(int id, CancellationToken ct) => await db.Usuarios.AsNoTracking().Where(u => u.Id == id).Select(Response).SingleOrDefaultAsync(ct)
        ?? throw new UsuarioOperationException(404, "NOT_FOUND", "No existe el usuario.");
    private async Task CheckActorAsync(CancellationToken ct)
    {
        // Relee el permiso dentro de la misma transacción que la escritura.
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo && u.UsuarioRoles.Any(j => j.IdRolNavigation.Nombre == RolesYPermisos.Administrador
            && j.IdRolNavigation.PermisoRoles.Any(p => p.IdPermisoNavigation.Codigo == RolesYPermisos.AdministrarUsuarios)), ct))
            throw new UsuarioOperationException(403, "FORBIDDEN", "No tiene permiso para administrar usuarios.");
    }
    private async Task SetRolesAsync(Usuario user, string[] roles, CancellationToken ct)
    {
        if (roles.Length == 0 || roles.Any(r => !KnownRoles.Contains(r))) throw new UsuarioOperationException(400, "VALIDATION_FAILED", "Debe asignar al menos un rol válido.");
        var selected = await db.Roles.Where(r => roles.Contains(r.Nombre)).ToListAsync(ct);
        if (selected.Count != roles.Distinct().Count()) throw new UsuarioOperationException(400, "REFERENCE_UNAVAILABLE", "El rol no está disponible.");
        var selectedIds = selected.Select(r => r.Id).ToHashSet();
        foreach (var join in user.UsuarioRoles.Where(j => !selectedIds.Contains(j.IdRol)).ToArray()) db.Remove(join);
        foreach (var role in selected.Where(r => !user.UsuarioRoles.Any(j => j.IdRol == r.Id))) user.UsuarioRoles.Add(new UsuarioRol { IdRol = role.Id });
    }
    public async Task<UsuarioResponse> CreateAsync(CreateUsuarioRequest request, CancellationToken ct)
    {
        var hash = BCrypt.Net.BCrypt.HashPassword(request.Password, 12);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await CheckActorAsync(ct);
        var user = new Usuario { Nombre = request.Nombre.Trim(), Apellido = request.Apellido.Trim(), Correo = request.Correo.Trim(), Username = request.Username.Trim(), PasswordHash = hash };
        await SetRolesAsync(user, request.Roles, ct);
        db.Usuarios.Add(user); await db.SaveChangesAsync(ct);
        var result = await GetAsync(user.Id, ct);
        await transaction.CommitAsync(ct); return result;
    }
    public async Task<UsuarioResponse> UpdateAsync(int id, PatchUsuarioRequest? patch, bool? active, string? password, CancellationToken ct)
    {
        var hash = password is null ? null : BCrypt.Net.BCrypt.HashPassword(password, 12);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await CheckActorAsync(ct);
        var user = await db.Usuarios.Include(u => u.UsuarioRoles).SingleOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new UsuarioOperationException(404, "NOT_FOUND", "No existe el usuario.");
        if (patch is not null)
        {
            if (patch.HasField(nameof(patch.Nombre))) user.Nombre = patch.Nombre!.Trim();
            if (patch.HasField(nameof(patch.Apellido))) user.Apellido = patch.Apellido!.Trim();
            if (patch.HasField(nameof(patch.Correo))) user.Correo = patch.Correo!.Trim();
            if (patch.HasField(nameof(patch.Username))) user.Username = patch.Username!.Trim();
            if (patch.HasField(nameof(patch.Roles))) await SetRolesAsync(user, patch.Roles!, ct);
        }
        if (active is not null) user.Activo = active.Value;
        if (hash is not null) user.PasswordHash = hash;
        await db.SaveChangesAsync(ct);
        var result = await GetAsync(id, ct);
        await transaction.CommitAsync(ct); return result;
    }
}
