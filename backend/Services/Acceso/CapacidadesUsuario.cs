using System.Collections.Frozen;
using Persistence.Models;

namespace Services.Acceso;

// Calculates data from loaded server-side relationships. Authentication, ownership
// of a concrete resource and transactional business rules are checked by later tasks.
// Missing navigations confer no capabilities; this class never loads or trusts a form ID.
public sealed class CapacidadesUsuario
{
    public IReadOnlySet<string> Roles { get; }
    public IReadOnlySet<string> Permisos { get; }
    private bool EsSuperior => Roles.Contains(RolesYPermisos.Administrador)
        || Roles.Contains(RolesYPermisos.ResponsableComercial);

    public bool PuedeLeerComercial => Permisos.Contains(RolesYPermisos.ConsultarComercial);
    public bool PuedeGestionarPropias => Permisos.Contains(RolesYPermisos.GestionarOportunidad);
    public bool PuedeGestionarTodas => PuedeGestionarPropias && EsSuperior;
    public bool FunnelSoloPropio => PuedeLeerComercial && !EsSuperior;
    public bool PuedeReabrir => EsSuperior && Permisos.Contains(RolesYPermisos.ReabrirOportunidad);
    public bool PuedeAdministrarUsuarios => Roles.Contains(RolesYPermisos.Administrador)
        && Permisos.Contains(RolesYPermisos.AdministrarUsuarios);
    public bool PuedeAdministrarConfiguracion => Roles.Contains(RolesYPermisos.Administrador)
        && Permisos.Contains(RolesYPermisos.AdministrarConfiguracion);

    private CapacidadesUsuario(IEnumerable<Rol> roles)
    {
        var known = roles.ToArray();
        Roles = known.Select(role => role.Nombre).ToFrozenSet(StringComparer.Ordinal);
        Permisos = known.SelectMany(role => role.PermisoRoles)
            .Where(join => join.IdPermisoNavigation is not null)
            .Select(join => join.IdPermisoNavigation.Codigo).ToFrozenSet(StringComparer.Ordinal);
    }

    public static CapacidadesUsuario Calcular(Usuario usuario) => new(usuario.Activo
        ? usuario.UsuarioRoles.Select(join => join.IdRolNavigation).Where(role => role is not null
            && role.Nombre is RolesYPermisos.Administrador or RolesYPermisos.ResponsableComercial or RolesYPermisos.Vendedor)
        : []);
}
