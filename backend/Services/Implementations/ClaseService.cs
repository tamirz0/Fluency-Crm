using System.Data;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;

namespace Services.Implementations;

/// <summary>Clases de un curso, con asistencia y, si son exámenes, notas. El Profesor solo opera en sus cursos.</summary>
public sealed class ClaseService(FluencyLocalDbContext db, ActorActual actor)
{
    private const int MaxRangeDays = 93;

    private static readonly Expression<Func<Clase, ClaseResponse>> Projection = c => new ClaseResponse
    {
        Id = c.Id, Titulo = c.Titulo, Fecha = c.Fecha, HoraInicio = c.HoraInicio, HoraFin = c.HoraFin, EsExamen = c.EsExamen, TemasExamen = c.TemasExamen,
        Curso = new OpcionResponse(c.IdCursoNavigation.Id, c.IdCursoNavigation.Nombre),
        Profesor = new OpcionResponse(c.IdCursoNavigation.IdProfesorNavigation.Id, c.IdCursoNavigation.IdProfesorNavigation.Nombre + " " + c.IdCursoNavigation.IdProfesorNavigation.Apellido),
    };

    private bool IsAdmin => actor.Usuario.Roles.Contains(RolesYPermisos.Administrador);
    private static AcademiaOperationException NotFound() => new(404, "NOT_FOUND", "No existe la clase.");

    private IQueryable<Clase> Visible()
    {
        var classes = db.Clases.AsNoTracking().Where(c => c.IdCursoNavigation.Activo);
        if (IsAdmin) return classes;
        var me = actor.Id;
        return classes.Where(c => c.IdCursoNavigation.IdProfesor == me);
    }

    public async Task<IReadOnlyList<ClaseResponse>> ListAsync(DateOnly desde, DateOnly hasta, int? idCurso, int? idProfesor, CancellationToken ct)
    {
        if (hasta < desde || hasta.DayNumber - desde.DayNumber > MaxRangeDays)
            throw new AcademiaOperationException(400, "VALIDATION_FAILED", $"El rango de fechas debe ser válido y de hasta {MaxRangeDays} días.");
        var classes = Visible().Where(c => c.Fecha >= desde && c.Fecha <= hasta);
        if (idCurso is { } course) classes = classes.Where(c => c.IdCurso == course);
        if (idProfesor is { } teacher) classes = classes.Where(c => c.IdCursoNavigation.IdProfesor == teacher);
        return await classes.OrderBy(c => c.Fecha).ThenBy(c => c.HoraInicio).ThenBy(c => c.Id).Select(Projection).ToListAsync(ct);
    }

    public async Task<ClaseDetalleResponse> GetAsync(int id, CancellationToken ct)
    {
        var lesson = await Visible().Where(c => c.Id == id).Select(Projection).SingleOrDefaultAsync(ct) ?? throw NotFound();
        var students = await db.Alumnos.AsNoTracking().Where(a => a.IdCurso == lesson.Curso.Id && a.Activo)
            .OrderBy(a => a.IdContactoNavigation.Apellido).ThenBy(a => a.IdContactoNavigation.Nombre).ThenBy(a => a.Id)
            .Select(a => new ClaseAlumnoResponse
            {
                IdAlumno = a.Id, IdContacto = a.IdContacto, Nombre = a.IdContactoNavigation.Nombre, Apellido = a.IdContactoNavigation.Apellido,
                Documento = a.IdContactoNavigation.Documento,
                Presente = db.ClaseAlumnos.Where(r => r.IdClase == id && r.IdAlumno == a.Id).Select(r => r.Presente).FirstOrDefault(),
                Nota = db.ClaseAlumnos.Where(r => r.IdClase == id && r.IdAlumno == a.Id).Select(r => r.Nota).FirstOrDefault(),
            }).ToListAsync(ct);
        return new() { Clase = lesson, Alumnos = students };
    }

    public async Task<ClaseDetalleResponse> CreateAsync(CreateClaseRequest request, CancellationToken ct)
    {
        if (request.HoraFin <= request.HoraInicio) throw new AcademiaOperationException(400, "VALIDATION_FAILED", "La hora de fin debe ser posterior a la de inicio.");
        var topics = string.IsNullOrWhiteSpace(request.TemasExamen) ? null : request.TemasExamen.Trim();
        if (!request.EsExamen && topics is not null) throw new AcademiaOperationException(400, "VALIDATION_FAILED", "Solo un examen tiene temas.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new AcademiaOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        var me = actor.Id;
        var admin = IsAdmin;
        if (!await db.Cursos.AnyAsync(c => c.Id == request.IdCurso && c.Activo && (admin || c.IdProfesor == me), ct))
            throw new AcademiaOperationException(400, "REFERENCE_UNAVAILABLE", "El curso no está disponible.");
        await EnsureNoOverlapAsync(request.IdCurso, request.Fecha, request.HoraInicio, request.HoraFin, null, ct);
        var lesson = new Clase { IdCurso = request.IdCurso, Titulo = request.Titulo.Trim(), Fecha = request.Fecha, HoraInicio = request.HoraInicio, HoraFin = request.HoraFin, EsExamen = request.EsExamen, TemasExamen = topics };
        db.Clases.Add(lesson);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await GetAsync(lesson.Id, ct);
    }

    /// <summary>Un curso no puede tener dos clases que se pisen en el mismo día; cursos distintos, aunque compartan nivel, sí pueden coincidir.</summary>
    private async Task EnsureNoOverlapAsync(int courseId, DateOnly day, TimeOnly start, TimeOnly end, int? exceptId, CancellationToken ct)
    {
        if (await db.Clases.AnyAsync(c => c.IdCurso == courseId && c.Fecha == day && c.HoraInicio < end && c.HoraFin > start && c.Id != exceptId, ct))
            throw new AcademiaOperationException(409, "BUSINESS_CONFLICT", "El curso ya tiene una clase en ese horario.");
    }

    /// <summary>Edita título, fecha, horario y tipo de una clase. Un examen con notas cargadas no puede dejar de serlo.</summary>
    public async Task<ClaseDetalleResponse> UpdateAsync(int id, UpdateClaseRequest request, CancellationToken ct)
    {
        if (request.HoraFin <= request.HoraInicio) throw new AcademiaOperationException(400, "VALIDATION_FAILED", "La hora de fin debe ser posterior a la de inicio.");
        var topics = string.IsNullOrWhiteSpace(request.TemasExamen) ? null : request.TemasExamen.Trim();
        if (!request.EsExamen && topics is not null) throw new AcademiaOperationException(400, "VALIDATION_FAILED", "Solo un examen tiene temas.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var lesson = await LoadForWriteAsync(id, ct);
        if (!request.EsExamen && lesson.EsExamen && await db.ClaseAlumnos.AnyAsync(r => r.IdClase == id && r.Nota != null, ct))
            throw new AcademiaOperationException(409, "BUSINESS_CONFLICT", "La clase ya tiene notas cargadas: no puede dejar de ser un examen.");
        await EnsureNoOverlapAsync(lesson.IdCurso, request.Fecha, request.HoraInicio, request.HoraFin, id, ct);
        lesson.Titulo = request.Titulo.Trim(); lesson.Fecha = request.Fecha; lesson.HoraInicio = request.HoraInicio; lesson.HoraFin = request.HoraFin;
        lesson.EsExamen = request.EsExamen; lesson.TemasExamen = topics;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await GetAsync(id, ct);
    }

    private async Task<Clase> LoadForWriteAsync(int id, CancellationToken ct)
    {
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new AcademiaOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        var visible = await Visible().Where(c => c.Id == id).Select(c => (int?)c.Id).SingleOrDefaultAsync(ct) ?? throw NotFound();
        return await db.Clases.SingleAsync(c => c.Id == visible, ct);
    }

    private async Task<Dictionary<int, ClaseAlumno>> RowsAsync(Clase lesson, IEnumerable<int> studentIds, CancellationToken ct)
    {
        var ids = studentIds.Distinct().ToArray();
        var valid = await db.Alumnos.Where(a => ids.Contains(a.Id) && a.IdCurso == lesson.IdCurso && a.Activo).Select(a => a.Id).ToListAsync(ct);
        if (valid.Count != ids.Length) throw new AcademiaOperationException(400, "REFERENCE_UNAVAILABLE", "Algún alumno no pertenece al curso de la clase.");
        var rows = await db.ClaseAlumnos.Where(r => r.IdClase == lesson.Id && ids.Contains(r.IdAlumno)).ToDictionaryAsync(r => r.IdAlumno, ct);
        foreach (var student in ids.Where(i => !rows.ContainsKey(i)))
        {
            var row = new ClaseAlumno { IdClase = lesson.Id, IdAlumno = student };
            db.ClaseAlumnos.Add(row);
            rows[student] = row;
        }
        return rows;
    }

    /// <summary>Marca presente o ausente (upsert) a alumnos del curso de la clase.</summary>
    public async Task<ClaseDetalleResponse> SaveAttendanceAsync(int id, GuardarAsistenciaRequest request, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var lesson = await LoadForWriteAsync(id, ct);
        var rows = await RowsAsync(lesson, request.Items.Select(i => i.IdAlumno), ct);
        foreach (var item in request.Items) rows[item.IdAlumno].Presente = item.Presente;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await GetAsync(id, ct);
    }

    /// <summary>Carga notas (0 a 10, hasta dos decimales) en un examen; null borra la nota.</summary>
    public async Task<ClaseDetalleResponse> SaveGradesAsync(int id, GuardarNotasRequest request, CancellationToken ct)
    {
        if (request.Items.Any(i => i.Nota is { } n && (n < 0 || n > 10 || decimal.Round(n, 2) != n)))
            throw new AcademiaOperationException(400, "VALIDATION_FAILED", "La nota va de 0 a 10, con hasta dos decimales.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var lesson = await LoadForWriteAsync(id, ct);
        if (!lesson.EsExamen) throw new AcademiaOperationException(409, "BUSINESS_CONFLICT", "Solo un examen admite notas.");
        var rows = await RowsAsync(lesson, request.Items.Select(i => i.IdAlumno), ct);
        foreach (var item in request.Items) rows[item.IdAlumno].Nota = item.Nota;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await GetAsync(id, ct);
    }
}
