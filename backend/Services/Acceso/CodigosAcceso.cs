using System.Collections.Frozen;
using Persistence.Models;

namespace Services.Acceso;

public static class CodigosAcceso
{
    public const string Administrador = "ADMINISTRADOR";
    public const string ResponsableComercial = "RESPONSABLE_COMERCIAL";
    public const string Vendedor = "VENDEDOR";

    public const string ConsultarComercial = "ConsultarComercial";
    public const string GestionarClientes = "GestionarClientes";
    public const string GestionarOportunidad = "GestionarOportunidad";
    public const string GestionarActividad = "GestionarActividad";
    public const string ReabrirOportunidad = "ReabrirOportunidad";
    public const string AdministrarUsuarios = "AdministrarUsuarios";
    public const string AdministrarConfiguracion = "AdministrarConfiguracion";
}

// Calculates data from loaded server-side relationships. Authentication, ownership
// of a concrete resource and transactional business rules are checked by later tasks.
// Missing navigations confer no capabilities; this class never loads or trusts a form ID.
public sealed class CapacidadesUsuario
{
    public IReadOnlySet<string> Roles { get; }
    public IReadOnlySet<string> Permisos { get; }
    private bool EsSuperior => Roles.Contains(CodigosAcceso.Administrador)
        || Roles.Contains(CodigosAcceso.ResponsableComercial);

    public bool PuedeLeerComercial => Permisos.Contains(CodigosAcceso.ConsultarComercial);
    public bool PuedeGestionarPropias => Permisos.Contains(CodigosAcceso.GestionarOportunidad);
    public bool PuedeGestionarTodas => PuedeGestionarPropias && EsSuperior;
    public bool FunnelSoloPropio => PuedeLeerComercial && !EsSuperior;
    public bool PuedeReabrir => EsSuperior && Permisos.Contains(CodigosAcceso.ReabrirOportunidad);
    public bool PuedeAdministrarUsuarios => Roles.Contains(CodigosAcceso.Administrador)
        && Permisos.Contains(CodigosAcceso.AdministrarUsuarios);
    public bool PuedeAdministrarConfiguracion => Roles.Contains(CodigosAcceso.Administrador)
        && Permisos.Contains(CodigosAcceso.AdministrarConfiguracion);

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
            && role.Nombre is CodigosAcceso.Administrador or CodigosAcceso.ResponsableComercial or CodigosAcceso.Vendedor)
        : []);
}
