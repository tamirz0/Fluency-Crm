using System.Data;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;
using Services.Interface;

namespace Services.Implementations;

public sealed class OportunidadService(FluencyLocalDbContext db, ActorActual actor) : IOportunidadService
{
    private static OportunidadOperationException Invalid(string message, string code = "REFERENCE_UNAVAILABLE") => new(400, code, message);
    private bool EsSuperior => actor.Usuario.Roles.Contains(RolesYPermisos.Administrador) || actor.Usuario.Roles.Contains(RolesYPermisos.ResponsableComercial);

    private IQueryable<OportunidadResponse> Query(IQueryable<Oportunidad>? source = null) => (source ?? db.Oportunidades.AsNoTracking()).Where(o => o.Activo).Select(o => new OportunidadResponse
    {
        Id = o.Id, Titulo = o.Titulo,
        TituloVisible = o.Titulo ?? (o.IdEmpresaNavigation != null
            ? o.IdEmpresaNavigation.RazonSocial + (o.IdContactoNavigation != null ? " – " + o.IdContactoNavigation.Nombre + " " + o.IdContactoNavigation.Apellido : "")
            : o.IdContactoNavigation!.Nombre + " " + o.IdContactoNavigation.Apellido),
        IdResponsable = o.IdResponsable, ResponsableNombre = o.IdResponsableNavigation.Nombre + " " + o.IdResponsableNavigation.Apellido,
        ResponsableActivo = o.IdResponsableNavigation.Activo,
        IdEmpresa = o.IdEmpresa, EmpresaRazonSocial = o.IdEmpresaNavigation == null ? null : o.IdEmpresaNavigation.RazonSocial,
        IdContacto = o.IdContacto, ContactoNombre = o.IdContactoNavigation == null ? null : o.IdContactoNavigation.Nombre + " " + o.IdContactoNavigation.Apellido,
        IdEtapa = o.IdEtapa, EtapaNombre = o.IdEtapaNavigation.Nombre, EtapaActiva = o.IdEtapaNavigation.Activo,
        Estado = o.IdEtapaNavigation.IdEstadoNavigation.Codigo,
        IdEmbudo = o.IdEtapaNavigation.IdEmbudo, EmbudoNombre = o.IdEtapaNavigation.IdEmbudoNavigation.Nombre, EmbudoActivo = o.IdEtapaNavigation.IdEmbudoNavigation.Activo,
        IdServicio = o.IdEtapaNavigation.IdEmbudoNavigation.IdServicio, ServicioNombre = o.IdEtapaNavigation.IdEmbudoNavigation.IdServicioNavigation.Nombre,
        ServicioActivo = o.IdEtapaNavigation.IdEmbudoNavigation.IdServicioNavigation.Activo,
        IdOrigen = o.IdOrigen, OrigenDescripcion = o.IdOrigenNavigation == null ? null : o.IdOrigenNavigation.Descripcion,
        OrigenActivo = o.IdOrigenNavigation == null ? null : o.IdOrigenNavigation.Activo,
        Valor = o.Valor, FechaCreacion = o.FechaCreacion, FechaEstimadaCierre = o.FechaEstimadaCierre, FechaCierre = o.FechaCierre,
        IdMotivoPerdida = o.IdMotivoPerdida, MotivoPerdidaDescripcion = o.IdMotivoPerdidaNavigation == null ? null : o.IdMotivoPerdidaNavigation.Descripcion,
        ObjetivoAprendizaje = o.ObjetivoAprendizaje, CantidadParticipantes = o.CantidadParticipantes,
        DisponibilidadHoraria = o.DisponibilidadHoraria, Observaciones = o.Observaciones, Activo = o.Activo
    });

    public async Task<OportunidadResponse> GetAsync(int id, CancellationToken ct)
        => WithActions(await Query().SingleOrDefaultAsync(o => o.Id == id, ct) ?? throw NotFound());

    private static OportunidadOperationException NotFound() => new(404, "NOT_FOUND", "No existe la oportunidad.");

    /// <summary>Todas las vigentes (lectura compartida); los filtros se aplican antes de contar y paginar. Orden: creación e ID descendentes.</summary>
    public async Task<PageResponse<OportunidadResponse>> ListAsync(OportunidadFilters filters, int page, int pageSize, CancellationToken ct)
    {
        var source = db.Oportunidades.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(filters.Q))
        {
            const string accents = "áàäâãåéèëêíìïîóòöôõúùüûñç";
            const string plain =   "aaaaaaeeeeiiiiooooouuuunc";
            var search = filters.Q.Trim().ToLowerInvariant();
            for (var i = 0; i < accents.Length; i++) search = search.Replace(accents[i], plain[i]);
            source = db.Oportunidades.FromSqlInterpolated($"""
                SELECT o.* FROM oportunidad o
                LEFT JOIN empresa e ON e.id = o.id_empresa
                LEFT JOIN contacto c ON c.id = o.id_contacto
                WHERE strpos(translate(lower(concat_ws(' ', o.titulo, e.razon_social, c.nombre, c.apellido)), {accents}, {plain}), {search}) > 0
                """).AsNoTracking();
        }
        var query = Query(source);
        if (filters.IdResponsable is not null) query = query.Where(o => o.IdResponsable == filters.IdResponsable);
        if (filters.IdEmpresa is not null) query = query.Where(o => o.IdEmpresa == filters.IdEmpresa);
        if (filters.IdContacto is not null) query = query.Where(o => o.IdContacto == filters.IdContacto);
        if (filters.IdEmbudo is not null) query = query.Where(o => o.IdEmbudo == filters.IdEmbudo);
        if (filters.IdEtapa is not null) query = query.Where(o => o.IdEtapa == filters.IdEtapa);
        if (filters.Estado is not null) query = query.Where(o => o.Estado == filters.Estado);
        if (filters.IdOrigen is not null) query = query.Where(o => o.IdOrigen == filters.IdOrigen);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(o => o.FechaCreacion).ThenByDescending(o => o.Id)
            .Skip((int)Math.Min((long)(page - 1) * pageSize, int.MaxValue)).Take(pageSize).ToListAsync(ct);
        return new(items.Select(WithActions).ToList(), page, pageSize, total);
    }

    /// <summary>Entradas inmutables de la oportunidad vigente, por fecha e ID ascendentes.</summary>
    public async Task<PageResponse<HistorialEtapaResponse>> HistorialAsync(int id, int page, int pageSize, CancellationToken ct)
    {
        if (!await db.Oportunidades.AnyAsync(o => o.Id == id && o.Activo, ct)) throw NotFound();
        var query = db.HistorialEtapas.AsNoTracking().Where(h => h.IdOportunidad == id);
        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(h => h.FechaHora).ThenBy(h => h.Id)
            .Skip((int)Math.Min((long)(page - 1) * pageSize, int.MaxValue)).Take(pageSize)
            .Select(h => new HistorialEtapaResponse(h.Id, h.IdEtapaAnterior, h.IdEtapaAnteriorNavigation == null ? null : h.IdEtapaAnteriorNavigation.Nombre,
                h.IdNuevaEtapa, h.IdNuevaEtapaNavigation.Nombre, h.FechaHora, h.IdUsuario,
                h.IdUsuarioNavigation.Nombre + " " + h.IdUsuarioNavigation.Apellido, h.Observacion)).ToListAsync(ct);
        return new(items, page, pageSize, total);
    }

    /// <summary>
    /// Columnas activas del embudo (también vacías y finales) con sus oportunidades vigentes. Un vendedor sin rol superior
    /// ve siempre su propia cartera: el parámetro de responsable solo rige para superiores.
    /// </summary>
    public async Task<FunnelResponse> FunnelAsync(int idEmbudo, int? idResponsable, CancellationToken ct)
    {
        var funnel = await db.Embudos.AsNoTracking().Where(b => b.Id == idEmbudo)
            .Select(b => new { b.Id, b.Nombre, b.Activo, b.IdServicio, ServicioNombre = b.IdServicioNavigation.Nombre, ServicioActivo = b.IdServicioNavigation.Activo })
            .SingleOrDefaultAsync(ct) ?? throw new OportunidadOperationException(404, "NOT_FOUND", "No existe el embudo.");
        var owner = EsSuperior ? idResponsable : actor.Id;
        var stages = await db.EtapaComerciales.AsNoTracking().Where(e => e.IdEmbudo == idEmbudo && e.Activo)
            .OrderBy(e => e.Orden).ThenBy(e => e.Id).Select(e => new { e.Id, e.Nombre, e.Orden, Estado = e.IdEstadoNavigation.Codigo }).ToListAsync(ct);
        var query = Query().Where(o => o.IdEmbudo == idEmbudo);
        if (owner is not null) query = query.Where(o => o.IdResponsable == owner);
        var cards = (await query.OrderByDescending(o => o.FechaCreacion).ThenByDescending(o => o.Id).ToListAsync(ct)).Select(WithActions).ToLookup(o => o.IdEtapa);
        return new(funnel.Id, funnel.Nombre, funnel.Activo, funnel.IdServicio, funnel.ServicioNombre, funnel.ServicioActivo,
            stages.Select(e => new FunnelEtapa(e.Id, e.Nombre, e.Orden, e.Estado, cards[e.Id].ToList())).ToList());
    }

    // Dueño vendedor o superior; la reapertura es solo de superiores. Baja y actividades sobreviven al cierre.
    private OportunidadResponse WithActions(OportunidadResponse item)
    {
        var manages = actor.Usuario.Permisos.Contains(RolesYPermisos.GestionarOportunidad) && (EsSuperior || item.IdResponsable == actor.Id);
        var open = item.Estado == "ABIERTA";
        var reopen = manages && !open && EsSuperior && actor.Usuario.Permisos.Contains(RolesYPermisos.ReabrirOportunidad);
        return item with { AccionesPermitidas = new(manages && open, manages && open, manages && open, manages && open, reopen, manages, manages) };
    }

    public async Task<OportunidadResponse> CreateAsync(CreateOportunidadRequest request, CancellationToken ct)
    {
        if (!actor.Usuario.Permisos.Contains(RolesYPermisos.GestionarOportunidad))
            throw new OportunidadOperationException(403, "FORBIDDEN", "No tiene permiso para gestionar oportunidades.");
        var responsible = request.IdResponsable ?? actor.Id;
        if (responsible != actor.Id && !EsSuperior)
            throw new OportunidadOperationException(403, "FORBIDDEN", "Solo puede crear oportunidades a su nombre.");

        // Serializable: una baja concurrente de la empresa o el contacto no puede convivir con esta alta.
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new OportunidadOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        if (!await db.Usuarios.AnyAsync(u => u.Id == responsible && u.Activo, ct)) throw Invalid("El responsable no está disponible.");

        // El servicio inactivo no bloquea: solo importa que el embudo esté activo.
        var funnel = await db.Embudos.AsNoTracking().Where(b => b.Id == request.IdEmbudo && b.Activo)
            .Select(b => new { b.Id, Price = b.IdServicioNavigation.PrecioReferencia }).SingleOrDefaultAsync(ct)
            ?? throw Invalid("El embudo no está disponible.");
        var openStages = db.EtapaComerciales.Where(e => e.IdEmbudo == funnel.Id && e.Activo && e.IdEstadoNavigation.Codigo == "ABIERTA");
        int? stageId;
        if (request.IdEtapa is { } requested)
            stageId = await openStages.Where(e => e.Id == requested).Select(e => (int?)e.Id).SingleOrDefaultAsync(ct)
                ?? throw Invalid("La etapa debe estar abierta y activa en el embudo indicado.");
        else
            stageId = await openStages.OrderBy(e => e.Orden).ThenBy(e => e.Id).Select(e => (int?)e.Id).FirstOrDefaultAsync(ct)
                ?? throw new OportunidadOperationException(409, "BUSINESS_CONFLICT", "El embudo no tiene una etapa abierta activa. Configure una antes de crear oportunidades.");

        if (request.IdEmpresa is { } company && !await db.Empresas.AnyAsync(e => e.Id == company && e.Activo, ct)) throw Invalid("La empresa no está disponible.");
        if (request.IdContacto is { } contact)
        {
            var found = await db.Contactos.AsNoTracking().Where(c => c.Id == contact && c.Activo).Select(c => new { c.IdEmpresa }).SingleOrDefaultAsync(ct)
                ?? throw Invalid("El contacto no está disponible.");
            if (request.IdEmpresa is not null && found.IdEmpresa != request.IdEmpresa)
                throw Invalid("El contacto no pertenece a la empresa indicada.", "VALIDATION_FAILED");
        }
        if (request.IdOrigen is { } origin && !await db.OrigenComerciales.AnyAsync(o => o.Id == origin && o.Activo, ct)) throw Invalid("El origen no está disponible.");

        var item = new Oportunidad
        {
            Titulo = Text(request.Titulo), IdResponsable = responsible, IdEmpresa = request.IdEmpresa, IdContacto = request.IdContacto,
            IdEtapa = stageId.Value, IdOrigen = request.IdOrigen, Valor = request.Valor ?? funnel.Price,
            FechaEstimadaCierre = request.FechaEstimadaCierre, ObjetivoAprendizaje = Text(request.ObjetivoAprendizaje),
            CantidadParticipantes = request.CantidadParticipantes, DisponibilidadHoraria = Text(request.DisponibilidadHoraria),
            Observaciones = Text(request.Observaciones),
            HistorialEtapas = { new HistorialEtapa { IdNuevaEtapa = stageId.Value, IdUsuario = actor.Id } }
        };
        db.Oportunidades.Add(item);
        await db.SaveChangesAsync(ct);
        var result = await GetAsync(item.Id, ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    /// <summary>
    /// Edita solo los campos enviados de una oportunidad abierta, si el actor es el dueño vendedor o un superior.
    /// La propiedad y el estado se releen dentro de la transacción; la compatibilidad empresa-contacto solo se valida
    /// cuando una de esas asociaciones cambia efectivamente (editar otro campo conserva referencias históricas).
    /// </summary>
    public async Task<OportunidadResponse> PatchAsync(int id, PatchOportunidadRequest request, CancellationToken ct)
    {
        if (!actor.Usuario.Permisos.Contains(RolesYPermisos.GestionarOportunidad))
            throw new OportunidadOperationException(403, "FORBIDDEN", "No tiene permiso para gestionar oportunidades.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new OportunidadOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        var item = await db.Oportunidades.SingleOrDefaultAsync(o => o.Id == id && o.Activo, ct) ?? throw NotFound();
        if (!EsSuperior && item.IdResponsable != actor.Id)
            throw new OportunidadOperationException(403, "FORBIDDEN", "Solo el responsable o un superior puede editar esta oportunidad.");
        var state = await db.EtapaComerciales.Where(e => e.Id == item.IdEtapa).Select(e => e.IdEstadoNavigation.Codigo).SingleAsync(ct);
        if (state != "ABIERTA")
            throw new OportunidadOperationException(409, "BUSINESS_CONFLICT", "Una oportunidad cerrada no se edita directamente: reábrala primero.");

        var company = request.HasField(nameof(request.IdEmpresa)) ? request.IdEmpresa : item.IdEmpresa;
        var contact = request.HasField(nameof(request.IdContacto)) ? request.IdContacto : item.IdContacto;
        if (company is null && contact is null) throw Invalid("Indique una empresa o un contacto.", "VALIDATION_FAILED");
        if (company != item.IdEmpresa || contact != item.IdContacto)
        {
            if (company != item.IdEmpresa && company is { } newCompany && !await db.Empresas.AnyAsync(e => e.Id == newCompany && e.Activo, ct))
                throw Invalid("La empresa no está disponible.");
            if (contact is { } contactId)
            {
                var found = await db.Contactos.AsNoTracking().Where(x => x.Id == contactId && (x.Activo || contactId == item.IdContacto))
                    .Select(x => new { x.IdEmpresa }).SingleOrDefaultAsync(ct) ?? throw Invalid("El contacto no está disponible.");
                if (company is not null && found.IdEmpresa != company) throw Invalid("El contacto no pertenece a la empresa indicada.", "VALIDATION_FAILED");
            }
        }
        if (request.HasField(nameof(request.IdOrigen)) && request.IdOrigen is { } origin && origin != item.IdOrigen
            && !await db.OrigenComerciales.AnyAsync(o => o.Id == origin && o.Activo, ct)) throw Invalid("El origen no está disponible.");

        item.IdEmpresa = company; item.IdContacto = contact;
        if (request.HasField(nameof(request.Titulo))) item.Titulo = Text(request.Titulo);
        if (request.HasField(nameof(request.IdOrigen))) item.IdOrigen = request.IdOrigen;
        if (request.HasField(nameof(request.Valor))) item.Valor = request.Valor!.Value;
        if (request.HasField(nameof(request.FechaEstimadaCierre))) item.FechaEstimadaCierre = request.FechaEstimadaCierre;
        if (request.HasField(nameof(request.ObjetivoAprendizaje))) item.ObjetivoAprendizaje = Text(request.ObjetivoAprendizaje);
        if (request.HasField(nameof(request.CantidadParticipantes))) item.CantidadParticipantes = request.CantidadParticipantes;
        if (request.HasField(nameof(request.DisponibilidadHoraria))) item.DisponibilidadHoraria = Text(request.DisponibilidadHoraria);
        if (request.HasField(nameof(request.Observaciones))) item.Observaciones = Text(request.Observaciones);
        await db.SaveChangesAsync(ct);
        var result = await GetAsync(id, ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    /// <summary>
    /// Cambia el responsable de una oportunidad abierta. El dueño vendedor solo puede pasarla a otro vendedor activo; un superior
    /// elige cualquier usuario activo. La propiedad se relee dentro de la transacción, así el responsable anterior pierde la edición
    /// de inmediato y conserva la lectura. No registra un movimiento de etapa ni toca los responsables de los clientes.
    /// </summary>
    public async Task<OportunidadResponse> ReasignarAsync(int id, ReasignarOportunidadRequest request, CancellationToken ct)
    {
        if (!actor.Usuario.Permisos.Contains(RolesYPermisos.GestionarOportunidad))
            throw new OportunidadOperationException(403, "FORBIDDEN", "No tiene permiso para gestionar oportunidades.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new OportunidadOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        var item = await db.Oportunidades.SingleOrDefaultAsync(o => o.Id == id && o.Activo, ct) ?? throw NotFound();
        if (!EsSuperior && item.IdResponsable != actor.Id)
            throw new OportunidadOperationException(403, "FORBIDDEN", "Solo el responsable o un superior puede reasignar esta oportunidad.");
        var state = await db.EtapaComerciales.Where(e => e.Id == item.IdEtapa).Select(e => e.IdEstadoNavigation.Codigo).SingleAsync(ct);
        if (state != "ABIERTA")
            throw new OportunidadOperationException(409, "BUSINESS_CONFLICT", "Una oportunidad cerrada no se reasigna: reábrala primero.");
        if (request.IdResponsable != item.IdResponsable)
        {
            var target = db.Usuarios.Where(u => u.Id == request.IdResponsable && u.Activo);
            if (!EsSuperior) target = target.Where(u => u.UsuarioRoles.Any(j => j.IdRolNavigation.Nombre == RolesYPermisos.Vendedor));
            if (!await target.AnyAsync(ct))
                throw Invalid(EsSuperior ? "El responsable no está disponible." : "Solo podés reasignarla a un vendedor activo.");
            item.IdResponsable = request.IdResponsable;
            await db.SaveChangesAsync(ct);
        }
        var result = await GetAsync(id, ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    /// <summary>
    /// Mueve una oportunidad abierta a otra etapa abierta y activa de su mismo embudo y registra la entrada de historial, todo en una
    /// transacción Serializable que relee propiedad y estado. El mismo destino no hace nada; las finales usan ganar/perder.
    /// </summary>
    public async Task<OportunidadResponse> MoverAsync(int id, MoverOportunidadRequest request, CancellationToken ct)
    {
        if (!actor.Usuario.Permisos.Contains(RolesYPermisos.GestionarOportunidad))
            throw new OportunidadOperationException(403, "FORBIDDEN", "No tiene permiso para gestionar oportunidades.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new OportunidadOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        var item = await db.Oportunidades.SingleOrDefaultAsync(o => o.Id == id && o.Activo, ct) ?? throw NotFound();
        if (!EsSuperior && item.IdResponsable != actor.Id)
            throw new OportunidadOperationException(403, "FORBIDDEN", "Solo el responsable o un superior puede mover esta oportunidad.");
        var current = await db.EtapaComerciales.Where(e => e.Id == item.IdEtapa)
            .Select(e => new { e.IdEmbudo, Estado = e.IdEstadoNavigation.Codigo }).SingleAsync(ct);
        if (current.Estado != "ABIERTA")
            throw new OportunidadOperationException(409, "BUSINESS_CONFLICT", "Una oportunidad cerrada no se mueve: reábrala primero.");
        var target = await db.EtapaComerciales.AsNoTracking().Where(e => e.Id == request.IdEtapa)
            .Select(e => new { e.IdEmbudo, e.Activo, Estado = e.IdEstadoNavigation.Codigo }).SingleOrDefaultAsync(ct);
        if (target is null || target.IdEmbudo != current.IdEmbudo)
            throw Invalid("La etapa debe pertenecer al embudo de la oportunidad.");
        if (target.Estado != "ABIERTA")
            throw Invalid("Para cerrar la oportunidad use ganar o perder: este movimiento solo admite etapas abiertas.", "VALIDATION_FAILED");
        if (request.IdEtapa != item.IdEtapa)
        {
            if (!target.Activo) throw Invalid("La etapa no está disponible.");
            var previous = item.IdEtapa;
            item.IdEtapa = request.IdEtapa;
            db.HistorialEtapas.Add(new HistorialEtapa { IdOportunidad = id, IdEtapaAnterior = previous, IdNuevaEtapa = request.IdEtapa, IdUsuario = actor.Id, Observacion = Text(request.Observacion) });
            await db.SaveChangesAsync(ct);
        }
        var result = await GetAsync(id, ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    public Task<OportunidadResponse> GanarAsync(int id, GanarOportunidadRequest request, CancellationToken ct)
        => CloseAsync(id, "GANADA", request.FechaCierre, request.Valor, null, request.Observacion, ct);

    public Task<OportunidadResponse> PerderAsync(int id, PerderOportunidadRequest request, CancellationToken ct)
        => CloseAsync(id, "PERDIDA", request.FechaCierre, null, request.IdMotivoPerdida, request.Observacion, ct);

    /// <summary>
    /// Cierra una oportunidad abierta en la única etapa final del resultado pedido de su embudo: guarda fecha de cierre, valor final
    /// (ganada) o motivo activo (perdida) y la entrada de historial en una transacción Serializable que relee propiedad y estado.
    /// Repetir el cierre sobre una cerrada es un conflicto: no duplica historial ni modifica datos.
    /// </summary>
    private async Task<OportunidadResponse> CloseAsync(int id, string result, DateOnly closeDate, decimal? finalValue, int? reason, string? note, CancellationToken ct)
    {
        if (!actor.Usuario.Permisos.Contains(RolesYPermisos.GestionarOportunidad))
            throw new OportunidadOperationException(403, "FORBIDDEN", "No tiene permiso para gestionar oportunidades.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new OportunidadOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        var item = await db.Oportunidades.SingleOrDefaultAsync(o => o.Id == id && o.Activo, ct) ?? throw NotFound();
        if (!EsSuperior && item.IdResponsable != actor.Id)
            throw new OportunidadOperationException(403, "FORBIDDEN", "Solo el responsable o un superior puede cerrar esta oportunidad.");
        var current = await db.EtapaComerciales.Where(e => e.Id == item.IdEtapa).Select(e => new { e.IdEmbudo, Estado = e.IdEstadoNavigation.Codigo }).SingleAsync(ct);
        if (current.Estado != "ABIERTA")
            throw new OportunidadOperationException(409, "BUSINESS_CONFLICT", "La oportunidad ya está cerrada. Para cambiar su resultado, reábrala primero.");
        var finalStage = await db.EtapaComerciales.Where(e => e.IdEmbudo == current.IdEmbudo && e.Activo && e.IdEstadoNavigation.Codigo == result)
            .Select(e => (int?)e.Id).SingleOrDefaultAsync(ct)
            ?? throw new OportunidadOperationException(409, "BUSINESS_CONFLICT", "El embudo no tiene la etapa final correspondiente.");
        if (reason is { } motive && !await db.MotivosPerdida.AnyAsync(m => m.Id == motive && m.Activo, ct)) throw Invalid("El motivo de pérdida no está disponible.");

        var previous = item.IdEtapa;
        item.IdEtapa = finalStage;
        item.FechaCierre = closeDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        if (finalValue is { } value) item.Valor = value;
        if (reason is { } lostBecause) item.IdMotivoPerdida = lostBecause;
        db.HistorialEtapas.Add(new HistorialEtapa { IdOportunidad = id, IdEtapaAnterior = previous, IdNuevaEtapa = finalStage, IdUsuario = actor.Id, Observacion = Text(note) });
        await db.SaveChangesAsync(ct);
        var response = await GetAsync(id, ct);
        await transaction.CommitAsync(ct);
        return response;
    }

    private static string? Text(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
