using System.Linq.Expressions;
using Persistence.Models;

namespace Services.Implementations;

/// <summary>
/// Regla única de admisión de servicios por embudo. Un servicio entra si su tipo está admitido y, cuando el embudo
/// seleccionó servicios puntuales de ese tipo, si es uno de ellos; sin selección entran todos los del tipo (también los futuros).
/// </summary>
internal static class EmbudoAdmision
{
    /// <summary>Embudos que admiten un servicio (por consulta).</summary>
    public static Expression<Func<Embudo, bool>> Admite(int idServicio, int idTipo) => e =>
        e.TiposServicio.Any(t => t.Id == idTipo)
        && (!e.Servicios.Any(s => s.IdTipoServicio == idTipo) || e.Servicios.Any(s => s.Id == idServicio));

    /// <summary>La misma regla sobre una admisión propuesta que todavía no se guardó.</summary>
    public static bool Admite(IReadOnlySet<int> tipos, IReadOnlyCollection<(int Id, int Tipo)> seleccion, int idServicio, int idTipo)
        => tipos.Contains(idTipo) && (!seleccion.Any(s => s.Tipo == idTipo) || seleccion.Any(s => s.Id == idServicio));
}
