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

    private IQueryable<OportunidadResponse> Query() => db.Oportunidades.AsNoTracking().Where(o => o.Activo).Select(o => new OportunidadResponse
    {
        Id = o.Id, Titulo = o.Titulo,
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
        => WithActions(await Query().SingleOrDefaultAsync(o => o.Id == id, ct) ?? throw new OportunidadOperationException(404, "NOT_FOUND", "No existe la oportunidad."));

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
            Titulo = request.Titulo!.Trim(), IdResponsable = responsible, IdEmpresa = request.IdEmpresa, IdContacto = request.IdContacto,
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

    private static string? Text(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
