using System.Data;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;

namespace Services.Implementations;

/// <summary>
/// Alumnos: contactos que ganaron un servicio con nivel o que el Administrador dio de alta desde los contactos Cliente.
/// El Profesor solo ve los de sus niveles; el Administrador, todos. Nivel y curso se editan dentro del alcance de cada uno.
/// </summary>
public sealed class AlumnoService(FluencyLocalDbContext db, ActorActual actor)
{
    internal static readonly Expression<Func<Alumno, AlumnoResponse>> Projection = a => new AlumnoResponse
    {
        Id = a.Id, IdContacto = a.IdContacto, Nombre = a.IdContactoNavigation.Nombre, Apellido = a.IdContactoNavigation.Apellido,
        Documento = a.IdContactoNavigation.Documento, Correo = a.IdContactoNavigation.Correo, Telefono = a.IdContactoNavigation.Telefono,
        Nivel = new OpcionResponse(a.IdNivelNavigation.Id, a.IdNivelNavigation.Descripcion),
        Curso = a.IdCursoNavigation == null ? null : new OpcionResponse(a.IdCursoNavigation.Id, a.IdCursoNavigation.Nombre),
        FechaAlta = a.FechaAlta,
    };

    private bool IsAdmin => actor.Usuario.Roles.Contains(RolesYPermisos.Administrador);

    /// <summary>Alumnos visibles para el actor. Se filtra siempre en servidor, nunca por parámetros del cliente.</summary>
    internal IQueryable<Alumno> Visible()
    {
        var students = db.Alumnos.AsNoTracking().Where(a => a.Activo && a.IdContactoNavigation.Activo);
        if (IsAdmin) return students;
        var me = actor.Id;
        return students.Where(a => db.ProfesorNiveles.Any(p => p.IdUsuario == me && p.IdNivel == a.IdNivel));
    }

    public async Task<PageResponse<AlumnoResponse>> ListAsync(string? q, int? idNivel, int? idCurso, bool? sinCurso, int page, int pageSize, CancellationToken ct)
    {
        var students = Visible();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var like = $"%{q.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_")}%";
            students = students.Where(a => EF.Functions.ILike(a.IdContactoNavigation.Nombre + " " + a.IdContactoNavigation.Apellido, like)
                || EF.Functions.ILike(a.IdContactoNavigation.Apellido + " " + a.IdContactoNavigation.Nombre, like)
                || (a.IdContactoNavigation.Documento != null && EF.Functions.ILike(a.IdContactoNavigation.Documento, like))
                || EF.Functions.ILike(a.IdContactoNavigation.Correo, like));
        }
        if (idNivel is { } level) students = students.Where(a => a.IdNivel == level);
        if (idCurso is { } course) students = students.Where(a => a.IdCurso == course);
        if (sinCurso == true) students = students.Where(a => a.IdCurso == null);
        var total = await students.CountAsync(ct);
        var items = await students.OrderBy(a => a.IdContactoNavigation.Apellido).ThenBy(a => a.IdContactoNavigation.Nombre).ThenBy(a => a.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).Select(Projection).ToListAsync(ct);
        return new(items, page, pageSize, total);
    }

    /// <summary>Asistencia sin restricción de alcance: el llamador ya comprobó que el actor puede ver al alumno o al contacto.</summary>
    internal async Task<AsistenciaAlumnoResponse?> AsistenciaPorContactoAsync(Expression<Func<Alumno, bool>> student, CancellationToken ct)
    {
        var found = await db.Alumnos.AsNoTracking().Where(a => a.Activo).Where(student)
            .Select(a => new { a.Id, a.IdCurso, Nivel = new OpcionResponse(a.IdNivelNavigation.Id, a.IdNivelNavigation.Descripcion),
                Curso = a.IdCursoNavigation == null ? null : new OpcionResponse(a.IdCursoNavigation.Id, a.IdCursoNavigation.Nombre) }).SingleOrDefaultAsync(ct);
        if (found is null) return null;
        // Fecha de negocio de Argentina (UTC-3 fijo, igual que el inicio).
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
        var id = found.Id;
        var items = found.IdCurso is not { } course ? [] : await db.Clases.AsNoTracking().Where(c => c.IdCurso == course && c.Fecha <= today)
            .OrderByDescending(c => c.Fecha).ThenByDescending(c => c.HoraInicio).ThenByDescending(c => c.Id)
            .Select(c => new AsistenciaClaseResponse
            {
                IdClase = c.Id, Titulo = c.Titulo, Fecha = c.Fecha, HoraInicio = c.HoraInicio, EsExamen = c.EsExamen,
                Presente = c.Asistencias.Where(r => r.IdAlumno == id).Select(r => r.Presente).FirstOrDefault(),
                Nota = c.Asistencias.Where(r => r.IdAlumno == id).Select(r => r.Nota).FirstOrDefault(),
            }).ToListAsync(ct);
        return new() { IdAlumno = found.Id, Nivel = found.Nivel, Curso = found.Curso, Presentes = items.Count(i => i.Presente == true), Clases = items.Count, Items = items };
    }

    public async Task<AsistenciaAlumnoResponse> AsistenciaAsync(int id, CancellationToken ct)
    {
        if (!await Visible().AnyAsync(a => a.Id == id, ct)) throw new AcademiaOperationException(404, "NOT_FOUND", "No existe el alumno.");
        return await AsistenciaPorContactoAsync(a => a.Id == id, ct) ?? throw new AcademiaOperationException(404, "NOT_FOUND", "No existe el alumno.");
    }

    /// <summary>Para la ficha comercial de un contacto: cualquier rol con acceso al contacto ve su asistencia si es alumno.</summary>
    public async Task<ContactoAcademicoResponse> AcademicoDeContactoAsync(int idContacto, CancellationToken ct)
    {
        if (!await db.Contactos.AnyAsync(c => c.Id == idContacto && c.Activo, ct)) throw new AcademiaOperationException(404, "NOT_FOUND", "No existe el contacto.");
        return new() { Alumno = await AsistenciaPorContactoAsync(a => a.IdContacto == idContacto, ct) };
    }

    private static AcademiaOperationException Conflict(string message) => new(409, "BUSINESS_CONFLICT", message);
    private static AcademiaOperationException Unavailable(string message) => new(400, "REFERENCE_UNAVAILABLE", message);

    private async Task CheckActorAsync(CancellationToken ct)
    {
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new AcademiaOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
    }

    /// <summary>Contactos vigentes en estado Cliente que todavía no son alumnos. Solo el Administrador, que es quien da de alta.</summary>
    public async Task<PageResponse<AlumnoCandidatoResponse>> CandidatesAsync(string? q, int page, int pageSize, CancellationToken ct)
    {
        if (!IsAdmin) throw new AcademiaOperationException(403, "FORBIDDEN", "Solo el Administrador puede dar de alta alumnos.");
        var contacts = db.Contactos.AsNoTracking().Where(c => c.Activo && c.IdEstadoNavigation.Descripcion.ToLower() == "cliente" && !db.Alumnos.Any(a => a.IdContacto == c.Id));
        if (!string.IsNullOrWhiteSpace(q))
        {
            var like = $"%{q.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_")}%";
            contacts = contacts.Where(c => EF.Functions.ILike(c.Nombre + " " + c.Apellido, like) || EF.Functions.ILike(c.Apellido + " " + c.Nombre, like)
                || (c.Documento != null && EF.Functions.ILike(c.Documento, like)) || EF.Functions.ILike(c.Correo, like));
        }
        var total = await contacts.CountAsync(ct);
        var items = await contacts.OrderBy(c => c.Apellido).ThenBy(c => c.Nombre).ThenBy(c => c.Id).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new AlumnoCandidatoResponse { Id = c.Id, Nombre = c.Nombre, Apellido = c.Apellido, Documento = c.Documento, Correo = c.Correo }).ToListAsync(ct);
        return new(items, page, pageSize, total);
    }

    /// <summary>Alta manual de un alumno a partir de un contacto Cliente, con nivel y, opcionalmente, un curso de ese nivel.</summary>
    public async Task<AlumnoResponse> CreateAsync(CreateAlumnoRequest request, CancellationToken ct)
    {
        if (!IsAdmin) throw new AcademiaOperationException(403, "FORBIDDEN", "Solo el Administrador puede dar de alta alumnos.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await CheckActorAsync(ct);
        var contact = await db.Contactos.Where(c => c.Id == request.IdContacto && c.Activo)
            .Select(c => new { c.Id, Client = c.IdEstadoNavigation.Descripcion.ToLower() == "cliente" }).SingleOrDefaultAsync(ct)
            ?? throw Unavailable("El contacto no está disponible.");
        if (!contact.Client) throw Conflict("Solo los contactos en estado Cliente pueden ser alumnos.");
        if (await db.Alumnos.AnyAsync(a => a.IdContacto == contact.Id, ct)) throw Conflict("El contacto ya es alumno.");
        if (!await db.NivelesIngles.AnyAsync(n => n.Id == request.IdNivel && n.Activo, ct)) throw Unavailable("El nivel de inglés no está disponible.");
        var student = new Alumno { IdContacto = contact.Id, IdNivel = request.IdNivel };
        if (request.IdCurso is { } course) student.IdCurso = await CourseForAsync(course, request.IdNivel, ct);
        db.Alumnos.Add(student);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await GetAsync(student.Id, ct);
    }

    /// <summary>Cambia el nivel. Si el curso actual es de otro nivel, el alumno queda sin curso para poder ascenderlo a uno nuevo.</summary>
    public async Task<AlumnoResponse> ChangeLevelAsync(int id, CambiarNivelAlumnoRequest request, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await CheckActorAsync(ct);
        var student = await TrackedAsync(id, ct);
        if (!await db.NivelesIngles.AnyAsync(n => n.Id == request.IdNivel && n.Activo, ct)) throw Unavailable("El nivel de inglés no está disponible.");
        if (!IsAdmin && !await db.ProfesorNiveles.AnyAsync(p => p.IdUsuario == actor.Id && p.IdNivel == request.IdNivel, ct))
            throw Conflict("No trabaja con ese nivel de inglés.");
        if (student.IdNivel != request.IdNivel)
        {
            student.IdNivel = request.IdNivel;
            if (student.IdCurso is { } current && !await db.Cursos.AnyAsync(c => c.Id == current && c.IdNivel == request.IdNivel, ct)) student.IdCurso = null;
            await db.SaveChangesAsync(ct);
        }
        await transaction.CommitAsync(ct);
        return await GetAsync(id, ct);
    }

    /// <summary>Asigna, cambia o quita el curso (idCurso nulo). El curso debe ser visible para el actor y del nivel del alumno.</summary>
    public async Task<AlumnoResponse> ChangeCourseAsync(int id, CambiarCursoAlumnoRequest request, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await CheckActorAsync(ct);
        var student = await TrackedAsync(id, ct);
        student.IdCurso = request.IdCurso is { } course ? await CourseForAsync(course, student.IdNivel, ct) : null;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await GetAsync(id, ct);
    }

    private async Task<Alumno> TrackedAsync(int id, CancellationToken ct)
    {
        var visible = await Visible().Where(a => a.Id == id).Select(a => (int?)a.Id).SingleOrDefaultAsync(ct)
            ?? throw new AcademiaOperationException(404, "NOT_FOUND", "No existe el alumno.");
        return await db.Alumnos.SingleAsync(a => a.Id == visible, ct);
    }

    private async Task<int> CourseForAsync(int courseId, int levelId, CancellationToken ct)
    {
        var me = actor.Id;
        var course = await db.Cursos.Where(c => c.Id == courseId && c.Activo && (IsAdmin || c.IdProfesor == me)).Select(c => new { c.Id, c.IdNivel }).SingleOrDefaultAsync(ct)
            ?? throw Unavailable("El curso no está disponible.");
        if (course.IdNivel != levelId) throw Conflict("El curso debe ser del mismo nivel que el alumno.");
        return course.Id;
    }

    public async Task<AlumnoResponse> GetAsync(int id, CancellationToken ct)
        => await Visible().Where(a => a.Id == id).Select(Projection).SingleOrDefaultAsync(ct)
            ?? throw new AcademiaOperationException(404, "NOT_FOUND", "No existe el alumno.");
}
