using System.Data;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class ActividadService(FluencyLocalDbContext db, ActorActual actor) : IActividadService
{
    private static OportunidadOperationException Invalid(string message, string code = "REFERENCE_UNAVAILABLE") => new(400, code, message);
    private bool EsSuperior => actor.Usuario.Roles.Contains(RolesYPermisos.Administrador) || actor.Usuario.Roles.Contains(RolesYPermisos.ResponsableComercial);

    private sealed record Row(ActividadResponse Item, int? OpportunityOwner);

    // Vigente: activa y consultable desde al menos un contexto comercial vigente (empresa, contacto u oportunidad).
    private static IQueryable<Actividad> Vigentes(IQueryable<Actividad> source) => source
        .Where(a => a.Activo && ((a.IdEmpresaNavigation != null && a.IdEmpresaNavigation.Activo)
            || (a.IdContactoNavigation != null && a.IdContactoNavigation.Activo)
            || (a.IdOportunidadNavigation != null && a.IdOportunidadNavigation.Activo)));

    // La proyección va al final: los filtros y el orden se aplican sobre la entidad.
    private static IQueryable<Row> Project(IQueryable<Actividad> source) => source
        .Select(a => new Row(new ActividadResponse
        {
            Id = a.Id, IdTipo = a.IdTipo, TipoNombre = a.IdTipoNavigation.Nombre, TipoActivo = a.IdTipoNavigation.Activo,
            IdUsuario = a.IdUsuario, UsuarioNombre = a.IdUsuarioNavigation.Nombre + " " + a.IdUsuarioNavigation.Apellido,
            IdEmpresa = a.IdEmpresa, EmpresaRazonSocial = a.IdEmpresaNavigation == null ? null : a.IdEmpresaNavigation.RazonSocial,
            IdContacto = a.IdContacto, ContactoNombre = a.IdContactoNavigation == null ? null : a.IdContactoNavigation.Nombre + " " + a.IdContactoNavigation.Apellido,
            IdOportunidad = a.IdOportunidad,
            OportunidadTitulo = a.IdOportunidadNavigation == null ? null : a.IdOportunidadNavigation.Titulo ?? (a.IdOportunidadNavigation.IdEmpresaNavigation != null
                ? a.IdOportunidadNavigation.IdEmpresaNavigation.RazonSocial + (a.IdOportunidadNavigation.IdContactoNavigation != null
                    ? " – " + a.IdOportunidadNavigation.IdContactoNavigation.Nombre + " " + a.IdOportunidadNavigation.IdContactoNavigation.Apellido : "")
                : a.IdOportunidadNavigation.IdContactoNavigation!.Nombre + " " + a.IdOportunidadNavigation.IdContactoNavigation.Apellido),
            FechaHora = a.FechaHora, FechaRegistro = a.FechaRegistro, Descripcion = a.Descripcion, Resultado = a.Resultado, Activo = a.Activo,
        }, a.IdOportunidadNavigation == null ? null : a.IdOportunidadNavigation.IdResponsable));

    // Sin oportunidad la gestión es compartida; con oportunidad, solo su responsable vendedor vigente o un superior.
    private ActividadResponse WithActions(Row row)
    {
        var manages = row.OpportunityOwner is null || (actor.Usuario.Permisos.Contains(RolesYPermisos.GestionarOportunidad) && (EsSuperior || row.OpportunityOwner == actor.Id));
        return row.Item with { AccionesPermitidas = new(manages, manages) };
    }

    /// <summary>Actividades vigentes (lectura compartida). Filtros y búsqueda antes de contar; orden por la fecha del hecho, no la de carga.</summary>
    public async Task<PageResponse<ActividadResponse>> ListAsync(ActividadFilters filters, int page, int pageSize, CancellationToken ct)
    {
        var source = db.Actividades.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(filters.Q))
        {
            const string accents = "áàäâãåéèëêíìïîóòöôõúùüûñç";
            const string plain =   "aaaaaaeeeeiiiiooooouuuunc";
            var search = filters.Q.Trim().ToLowerInvariant();
            for (var i = 0; i < accents.Length; i++) search = search.Replace(accents[i], plain[i]);
            source = db.Actividades.FromSqlInterpolated($"""
                SELECT * FROM actividad
                WHERE strpos(translate(lower(concat_ws(' ', descripcion, resultado)), {accents}, {plain}), {search}) > 0
                """).AsNoTracking();
        }
        var query = Vigentes(source);
        if (filters.IdEmpresa is not null) query = query.Where(a => a.IdEmpresa == filters.IdEmpresa);
        if (filters.IdContacto is not null) query = query.Where(a => a.IdContacto == filters.IdContacto);
        if (filters.IdOportunidad is not null) query = query.Where(a => a.IdOportunidad == filters.IdOportunidad);
        if (filters.IdTipo is not null) query = query.Where(a => a.IdTipo == filters.IdTipo);
        if (filters.IdUsuario is not null) query = query.Where(a => a.IdUsuario == filters.IdUsuario);
        if (filters.Desde is { } from) query = query.Where(a => a.FechaHora >= from.UtcDateTime);
        if (filters.Hasta is { } to) query = query.Where(a => a.FechaHora < to.UtcDateTime);
        var total = await query.CountAsync(ct);
        var rows = await Project(query.OrderByDescending(a => a.FechaHora).ThenByDescending(a => a.Id)
            .Skip((int)Math.Min((long)(page - 1) * pageSize, int.MaxValue)).Take(pageSize)).ToListAsync(ct);
        return new(rows.Select(WithActions).ToList(), page, pageSize, total);
    }

    public async Task<ActividadResponse> GetAsync(int id, CancellationToken ct)
        => WithActions(await Project(Vigentes(db.Actividades.AsNoTracking()).Where(a => a.Id == id)).SingleOrDefaultAsync(ct) ?? throw new OportunidadOperationException(404, "NOT_FOUND", "No existe la actividad."));

    /// <summary>
    /// Registra una actividad ya realizada. Sin oportunidad la gestión es compartida; con oportunidad exige a su responsable vendedor o a un
    /// superior, también si está cerrada (no la modifica ni la reabre), y la empresa/contacto deben ser los que conserva la oportunidad.
    /// </summary>
    public async Task<ActividadResponse> CreateAsync(CreateActividadRequest request, CancellationToken ct)
    {
        var occurred = request.FechaHora!.Value.UtcDateTime;
        if (occurred > DateTime.UtcNow.AddMinutes(5))
            throw Invalid("La actividad ya debe haber ocurrido: la fecha no puede ser futura.", "VALIDATION_FAILED");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new OportunidadOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        if (!await db.TiposActividad.AnyAsync(t => t.Id == request.IdTipo && t.Activo, ct)) throw Invalid("El tipo de actividad no está disponible.");

        if (request.IdOportunidad is { } opportunityId)
        {
            var opportunity = await db.Oportunidades.AsNoTracking().Where(o => o.Id == opportunityId && o.Activo)
                .Select(o => new { o.IdResponsable, o.IdEmpresa, o.IdContacto }).SingleOrDefaultAsync(ct) ?? throw Invalid("La oportunidad no está disponible.");
            if (!actor.Usuario.Permisos.Contains(RolesYPermisos.GestionarOportunidad) || (!EsSuperior && opportunity.IdResponsable != actor.Id))
                throw new OportunidadOperationException(403, "FORBIDDEN", "Solo el responsable o un superior puede registrar actividades de esta oportunidad.");
            // Se conserva el contexto histórico de la oportunidad, aunque sus clientes hayan cambiado o estén dados de baja después.
            if ((request.IdEmpresa is not null && request.IdEmpresa != opportunity.IdEmpresa) || (request.IdContacto is not null && request.IdContacto != opportunity.IdContacto))
                throw Invalid("La empresa y el contacto deben ser los de la oportunidad.", "VALIDATION_FAILED");
        }
        else
        {
            if (request.IdEmpresa is { } company && !await db.Empresas.AnyAsync(e => e.Id == company && e.Activo, ct)) throw Invalid("La empresa no está disponible.");
            if (request.IdContacto is { } contact && !await db.Contactos.AnyAsync(c => c.Id == contact && c.Activo, ct)) throw Invalid("El contacto no está disponible.");
        }

        var item = new Actividad
        {
            IdTipo = request.IdTipo, IdUsuario = actor.Id, IdEmpresa = request.IdEmpresa, IdContacto = request.IdContacto, IdOportunidad = request.IdOportunidad,
            FechaHora = occurred, Descripcion = request.Descripcion!.Trim(), Resultado = string.IsNullOrWhiteSpace(request.Resultado) ? null : request.Resultado.Trim(),
        };
        db.Actividades.Add(item);
        await db.SaveChangesAsync(ct);
        var result = await GetAsync(item.Id, ct);
        await transaction.CommitAsync(ct);
        return result;
    }
}
