using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class LoginService(FluencyLocalDbContext db) : ILoginService
{
    // Unknown usernames still perform a BCrypt verification to avoid the obvious fast rejection path.
    private static readonly string DummyHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"), 12);

    public async Task<SesionUsuario?> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var username = request.Username.Trim().ToLowerInvariant();
        var user = await Users().SingleOrDefaultAsync(u => u.Username.Trim().ToLower() == username, cancellationToken);
        bool valid;
        try { valid = BCrypt.Net.BCrypt.Verify(request.Password, user?.PasswordHash ?? DummyHash); }
        catch (BCrypt.Net.SaltParseException) { valid = false; }
        return valid && user is not null ? ToSession(user) : null;
    }

    public async Task<SesionUsuario?> GetSessionAsync(int id, CancellationToken cancellationToken)
    {
        var user = await Users().SingleOrDefaultAsync(u => u.Id == id, cancellationToken);
        return user is null ? null : ToSession(user);
    }

    private IQueryable<Usuario> Users() => db.Usuarios.AsNoTracking()
        .Include(user => user.UsuarioRoles).ThenInclude(join => join.IdRolNavigation)
        .ThenInclude(role => role.PermisoRoles).ThenInclude(join => join.IdPermisoNavigation);

    private static SesionUsuario? ToSession(Usuario user)
    {
        var capabilities = CapacidadesUsuario.Calcular(user);
        if (!user.Activo || capabilities.Roles.Count == 0) return null;
        var response = new UsuarioResponse(user.Id, user.Nombre, user.Apellido, user.Correo, user.Username,
            user.Activo, capabilities.Roles.Order().ToArray(), capabilities.Permisos.Order().ToArray());
        return new SesionUsuario(response, Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(user.PasswordHash))));
    }
}
