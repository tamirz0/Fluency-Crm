using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.DTO;

namespace Services.Implementations;

/// <summary>
/// Historial comercial combinado de una empresa, un contacto o una oportunidad: actividades y transiciones de etapa unidas antes de
/// contar y paginar. Cada cliente usa sus FKs históricas directas (nunca la empresa actual del contacto) y una actividad aparece una
/// sola vez aunque coincida por dos relaciones. Orden: fecha descendente, tipo e ID de origen descendentes.
/// </summary>
public sealed class HistorialComercialService(FluencyLocalDbContext db)
{
    private enum Scope { Empresa, Contacto, Oportunidad }

    public Task<PageResponse<HistorialComercialItem>> ForCompanyAsync(int id, DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize, CancellationToken ct)
        => ReadAsync(Scope.Empresa, id, from, to, page, pageSize, ct);

    public Task<PageResponse<HistorialComercialItem>> ForContactAsync(int id, DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize, CancellationToken ct)
        => ReadAsync(Scope.Contacto, id, from, to, page, pageSize, ct);

    public Task<PageResponse<HistorialComercialItem>> ForOpportunityAsync(int id, DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize, CancellationToken ct)
        => ReadAsync(Scope.Oportunidad, id, from, to, page, pageSize, ct);

    private async Task<PageResponse<HistorialComercialItem>> ReadAsync(Scope scope, int id, DateTimeOffset? from, DateTimeOffset? to, int page, int pageSize, CancellationToken ct)
    {
        // El contexto debe estar vigente: una empresa, contacto u oportunidad dados de baja no se consulta (sin papelera ni recuperación).
        var exists = scope switch
        {
            Scope.Empresa => await db.Empresas.AnyAsync(e => e.Id == id && e.Activo, ct),
            Scope.Contacto => await db.Contactos.AnyAsync(c => c.Id == id && c.Activo, ct),
            _ => await db.Oportunidades.AnyAsync(o => o.Id == id && o.Activo, ct),
        };
        if (!exists) throw new OportunidadOperationException(404, "NOT_FOUND", "No existe el registro solicitado.");

        var activities = db.Actividades.AsNoTracking().Where(a => a.Activo);
        var transitions = db.HistorialEtapas.AsNoTracking().Where(h => h.IdOportunidadNavigation.Activo);
        switch (scope)
        {
            case Scope.Empresa:
                activities = activities.Where(a => a.IdEmpresa == id);
                transitions = transitions.Where(h => h.IdOportunidadNavigation.IdEmpresa == id);
                break;
            case Scope.Contacto:
                activities = activities.Where(a => a.IdContacto == id);
                transitions = transitions.Where(h => h.IdOportunidadNavigation.IdContacto == id);
                break;
            default:
                activities = activities.Where(a => a.IdOportunidad == id);
                transitions = transitions.Where(h => h.IdOportunidad == id);
                break;
        }
        if (from is { } start) { var instant = start.UtcDateTime; activities = activities.Where(a => a.FechaHora >= instant); transitions = transitions.Where(h => h.FechaHora >= instant); }
        if (to is { } end) { var instant = end.UtcDateTime; activities = activities.Where(a => a.FechaHora < instant); transitions = transitions.Where(h => h.FechaHora < instant); }

        var union = activities.Select(a => new Row
        {
            Tipo = "ACTIVIDAD", IdOrigen = a.Id, FechaHora = a.FechaHora, IdUsuario = a.IdUsuario, UsuarioNombre = a.IdUsuarioNavigation.Nombre + " " + a.IdUsuarioNavigation.Apellido,
            IdOportunidad = a.IdOportunidad, IdEmpresa = a.IdEmpresa, IdContacto = a.IdContacto, FechaRegistro = a.FechaRegistro,
            TipoActividad = a.IdTipoNavigation.Nombre, Descripcion = a.Descripcion, Resultado = a.Resultado, EtapaAnterior = null, EtapaNueva = null, Observacion = null,
        }).Concat(transitions.Select(h => new Row
        {
            Tipo = "TRANSICION", IdOrigen = h.Id, FechaHora = h.FechaHora, IdUsuario = h.IdUsuario, UsuarioNombre = h.IdUsuarioNavigation.Nombre + " " + h.IdUsuarioNavigation.Apellido,
            IdOportunidad = h.IdOportunidad, IdEmpresa = null, IdContacto = null, FechaRegistro = null,
            TipoActividad = null, Descripcion = null, Resultado = null,
            EtapaAnterior = h.IdEtapaAnteriorNavigation == null ? null : h.IdEtapaAnteriorNavigation.Nombre, EtapaNueva = h.IdNuevaEtapaNavigation.Nombre, Observacion = h.Observacion,
        }));

        var total = await union.CountAsync(ct);
        var rows = await union.OrderByDescending(r => r.FechaHora).ThenByDescending(r => r.Tipo).ThenByDescending(r => r.IdOrigen)
            .Skip((int)Math.Min((long)(page - 1) * pageSize, int.MaxValue)).Take(pageSize).ToListAsync(ct);

        // Los títulos visibles de las oportunidades de la página se resuelven aparte, con la misma regla de las demás vistas.
        var opportunityIds = rows.Where(r => r.IdOportunidad != null).Select(r => r.IdOportunidad!.Value).Distinct().ToList();
        var titles = await db.Oportunidades.AsNoTracking().Where(o => opportunityIds.Contains(o.Id))
            .Select(o => new
            {
                o.Id,
                Title = o.Titulo ?? (o.IdEmpresaNavigation != null
                    ? o.IdEmpresaNavigation.RazonSocial + (o.IdContactoNavigation != null ? " – " + o.IdContactoNavigation.Nombre + " " + o.IdContactoNavigation.Apellido : "")
                    : o.IdContactoNavigation!.Nombre + " " + o.IdContactoNavigation.Apellido),
            }).ToDictionaryAsync(o => o.Id, o => o.Title, ct);

        return new(rows.Select(r => new HistorialComercialItem
        {
            Tipo = r.Tipo, IdOrigen = r.IdOrigen, FechaHora = r.FechaHora, IdUsuario = r.IdUsuario, UsuarioNombre = r.UsuarioNombre,
            IdOportunidad = r.IdOportunidad, OportunidadTitulo = r.IdOportunidad is { } o && titles.TryGetValue(o, out var title) ? title : null,
            IdEmpresa = r.IdEmpresa, IdContacto = r.IdContacto, FechaRegistro = r.FechaRegistro, TipoActividad = r.TipoActividad, Descripcion = r.Descripcion,
            Resultado = r.Resultado, EtapaAnterior = r.EtapaAnterior, EtapaNueva = r.EtapaNueva, Observacion = r.Observacion,
        }).ToList(), page, pageSize, total);
    }

    // Forma común de las dos fuentes para unirlas en SQL (UNION ALL) antes de contar y paginar.
    private sealed class Row
    {
        public string Tipo { get; set; } = null!;
        public int IdOrigen { get; set; }
        public DateTime FechaHora { get; set; }
        public int IdUsuario { get; set; }
        public string UsuarioNombre { get; set; } = null!;
        public int? IdOportunidad { get; set; }
        public int? IdEmpresa { get; set; }
        public int? IdContacto { get; set; }
        public DateTime? FechaRegistro { get; set; }
        public string? TipoActividad { get; set; }
        public string? Descripcion { get; set; }
        public string? Resultado { get; set; }
        public string? EtapaAnterior { get; set; }
        public string? EtapaNueva { get; set; }
        public string? Observacion { get; set; }
    }
}
