using System.Data;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.DTO;

namespace Services.Implementations;

/// <summary>
/// Talleres de fecha única. Pueden anotarse alumnos y contactos en estado Cliente a quienes se les vendió el taller como
/// oportunidad ganada (no son alumnos: solo los servicios con nivel crean alumnos). Los gestionan Administrador y Profesor.
/// </summary>
public sealed class TallerService(FluencyLocalDbContext db, Acceso.ActorActual actor)
{
    private const int MaxRangeDays = 93;

    private static readonly Expression<Func<Taller, TallerResponse>> Projection = t => new TallerResponse
    {
        Id = t.Id, Titulo = t.Titulo, Fecha = t.Fecha, HoraInicio = t.HoraInicio, HoraFin = t.HoraFin,
        Servicio = new OpcionResponse(t.IdServicioNavigation.Id, t.IdServicioNavigation.Nombre), CantidadInscriptos = t.Inscripciones.Count,
    };

    private static AcademiaOperationException NotFound() => new(404, "NOT_FOUND", "No existe el taller.");

    /// <summary>Servicios de taller activos para elegir al crear un taller (el Profesor no accede al listado de servicios).</summary>
    public async Task<IReadOnlyList<OpcionResponse>> ServiciosAsync(CancellationToken ct)
        => await db.Servicios.AsNoTracking().Where(s => s.Activo && s.EsTaller).OrderBy(s => s.Nombre).ThenBy(s => s.Id)
            .Select(s => new OpcionResponse(s.Id, s.Nombre)).ToListAsync(ct);

    public async Task<IReadOnlyList<TallerResponse>> ListAsync(DateOnly desde, DateOnly hasta, CancellationToken ct)
    {
        if (hasta < desde || hasta.DayNumber - desde.DayNumber > MaxRangeDays)
            throw new AcademiaOperationException(400, "VALIDATION_FAILED", $"El rango de fechas debe ser válido y de hasta {MaxRangeDays} días.");
        return await db.Talleres.AsNoTracking().Where(t => t.Fecha >= desde && t.Fecha <= hasta)
            .OrderBy(t => t.Fecha).ThenBy(t => t.HoraInicio).ThenBy(t => t.Id).Select(Projection).ToListAsync(ct);
    }

    public async Task<TallerDetalleResponse> GetAsync(int id, CancellationToken ct)
    {
        var workshop = await db.Talleres.AsNoTracking().Where(t => t.Id == id).Select(Projection).SingleOrDefaultAsync(ct) ?? throw NotFound();
        var people = await db.TallerInscripciones.AsNoTracking().Where(i => i.IdTaller == id)
            .OrderBy(i => i.IdContactoNavigation.Apellido).ThenBy(i => i.IdContactoNavigation.Nombre).ThenBy(i => i.IdContacto)
            .Select(i => new PersonaTallerResponse
            {
                IdContacto = i.IdContacto, Nombre = i.IdContactoNavigation.Nombre, Apellido = i.IdContactoNavigation.Apellido,
                Documento = i.IdContactoNavigation.Documento, EsAlumno = db.Alumnos.Any(a => a.IdContacto == i.IdContacto && a.Activo),
            }).ToListAsync(ct);
        return new() { Taller = workshop, Inscriptos = people };
    }

    public async Task<TallerDetalleResponse> CreateAsync(CreateTallerRequest request, CancellationToken ct)
    {
        if (request.HoraFin <= request.HoraInicio) throw new AcademiaOperationException(400, "VALIDATION_FAILED", "La hora de fin debe ser posterior a la de inicio.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new AcademiaOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        if (!await db.Servicios.AnyAsync(s => s.Id == request.IdServicio && s.Activo && s.EsTaller, ct))
            throw new AcademiaOperationException(400, "REFERENCE_UNAVAILABLE", "El servicio de taller no está disponible.");
        var workshop = new Taller { IdServicio = request.IdServicio, Titulo = request.Titulo.Trim(), Fecha = request.Fecha, HoraInicio = request.HoraInicio, HoraFin = request.HoraFin };
        db.Talleres.Add(workshop);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await GetAsync(workshop.Id, ct);
    }

    /// <summary>Personas que se pueden anotar: alumnos y contactos Cliente con una oportunidad ganada de este taller, aún no anotados.</summary>
    private IQueryable<Contacto> EligibleContacts(int workshopId, int serviceId)
        => db.Contactos.Where(c => c.Activo
            && !db.TallerInscripciones.Any(i => i.IdTaller == workshopId && i.IdContacto == c.Id)
            && (db.Alumnos.Any(a => a.IdContacto == c.Id && a.Activo)
                || (c.IdEstadoNavigation != null && c.IdEstadoNavigation.Descripcion.ToLower() == "cliente"
                    && db.Oportunidades.Any(o => o.Activo && o.IdContacto == c.Id && o.IdEtapaNavigation.IdEstadoNavigation.Codigo == "GANADA"
                        && o.IdEtapaNavigation.IdEmbudoNavigation.IdServicio == serviceId))));

    public async Task<IReadOnlyList<PersonaTallerResponse>> CandidatesAsync(int id, CancellationToken ct)
    {
        var serviceId = await db.Talleres.Where(t => t.Id == id).Select(t => (int?)t.IdServicio).SingleOrDefaultAsync(ct) ?? throw NotFound();
        return await EligibleContacts(id, serviceId).AsNoTracking().OrderBy(c => c.Apellido).ThenBy(c => c.Nombre).ThenBy(c => c.Id)
            .Select(c => new PersonaTallerResponse
            {
                IdContacto = c.Id, Nombre = c.Nombre, Apellido = c.Apellido, Documento = c.Documento,
                EsAlumno = db.Alumnos.Any(a => a.IdContacto == c.Id && a.Activo),
            }).ToListAsync(ct);
    }

    public async Task<TallerDetalleResponse> EnrollAsync(int id, InscribirTallerRequest request, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new AcademiaOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        var serviceId = await db.Talleres.Where(t => t.Id == id).Select(t => (int?)t.IdServicio).SingleOrDefaultAsync(ct) ?? throw NotFound();
        if (await db.TallerInscripciones.AnyAsync(i => i.IdTaller == id && i.IdContacto == request.IdContacto, ct))
            throw new AcademiaOperationException(409, "BUSINESS_CONFLICT", "La persona ya está anotada en el taller.");
        if (!await EligibleContacts(id, serviceId).AnyAsync(c => c.Id == request.IdContacto, ct))
            throw new AcademiaOperationException(409, "BUSINESS_CONFLICT", "Solo pueden anotarse alumnos o clientes a quienes se les vendió este taller.");
        db.TallerInscripciones.Add(new TallerInscripcion { IdTaller = id, IdContacto = request.IdContacto });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await GetAsync(id, ct);
    }
}
