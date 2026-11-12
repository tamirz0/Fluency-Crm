using System.Data;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;

namespace Services.Implementations;

/// <summary>Cursos por nivel a cargo de un profesor. Al curso solo se suman alumnos de su nivel que no tengan otro curso.</summary>
public sealed class CursoService(FluencyLocalDbContext db, ActorActual actor)
{
    private static readonly Expression<Func<Curso, CursoResponse>> Projection = c => new CursoResponse
    {
        Id = c.Id, Nombre = c.Nombre, Nivel = new OpcionResponse(c.IdNivelNavigation.Id, c.IdNivelNavigation.Descripcion),
        Profesor = new OpcionResponse(c.IdProfesorNavigation.Id, c.IdProfesorNavigation.Nombre + " " + c.IdProfesorNavigation.Apellido),
        CantidadAlumnos = c.Alumnos.Count(a => a.Activo), CantidadClases = c.Clases.Count,
    };

    private bool IsAdmin => actor.Usuario.Roles.Contains(RolesYPermisos.Administrador);
    private static AcademiaOperationException NotFound() => new(404, "NOT_FOUND", "No existe el curso.");

    /// <summary>Cursos visibles: el Administrador ve todos; el Profesor, solo los propios.</summary>
    internal IQueryable<Curso> Visible()
    {
        var courses = db.Cursos.AsNoTracking().Where(c => c.Activo);
        if (IsAdmin) return courses;
        var me = actor.Id;
        return courses.Where(c => c.IdProfesor == me);
    }

    public async Task<PageResponse<CursoResponse>> ListAsync(int? idProfesor, int? idNivel, int page, int pageSize, CancellationToken ct)
    {
        var courses = Visible();
        if (idProfesor is { } teacher) courses = courses.Where(c => c.IdProfesor == teacher);
        if (idNivel is { } level) courses = courses.Where(c => c.IdNivel == level);
        var total = await courses.CountAsync(ct);
        var items = await courses.OrderBy(c => c.Nombre).ThenBy(c => c.Id).Skip((page - 1) * pageSize).Take(pageSize).Select(Projection).ToListAsync(ct);
        return new(items, page, pageSize, total);
    }

    public async Task<CursoDetalleResponse> GetAsync(int id, CancellationToken ct)
    {
        var course = await Visible().Where(c => c.Id == id).Select(Projection).SingleOrDefaultAsync(ct) ?? throw NotFound();
        var students = await db.Alumnos.AsNoTracking().Where(a => a.IdCurso == id && a.Activo)
            .OrderBy(a => a.IdContactoNavigation.Apellido).ThenBy(a => a.IdContactoNavigation.Nombre).ThenBy(a => a.Id)
            .Select(AlumnoService.Projection).ToListAsync(ct);
        return new() { Curso = course, Alumnos = students };
    }

    public async Task<CursoDetalleResponse> CreateAsync(CreateCursoRequest request, CancellationToken ct)
    {
        int teacherId;
        if (IsAdmin)
            teacherId = request.IdProfesor ?? throw new AcademiaOperationException(400, "VALIDATION_FAILED", "Elija el profesor del curso.");
        else
        {
            if (request.IdProfesor is { } other && other != actor.Id) throw new AcademiaOperationException(403, "FORBIDDEN", "Solo puede crear cursos propios.");
            teacherId = actor.Id;
        }
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new AcademiaOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        if (!await db.Usuarios.AnyAsync(u => u.Id == teacherId && u.Activo && u.UsuarioRoles.Any(j => j.IdRolNavigation.Nombre == RolesYPermisos.Profesor), ct))
            throw new AcademiaOperationException(400, "REFERENCE_UNAVAILABLE", "El profesor no está disponible.");
        if (!await db.NivelesIngles.AnyAsync(n => n.Id == request.IdNivel && n.Activo, ct))
            throw new AcademiaOperationException(400, "REFERENCE_UNAVAILABLE", "El nivel de inglés no está disponible.");
        if (!await db.ProfesorNiveles.AnyAsync(p => p.IdUsuario == teacherId && p.IdNivel == request.IdNivel, ct))
            throw new AcademiaOperationException(409, "BUSINESS_CONFLICT", "El profesor no trabaja con ese nivel de inglés.");
        var course = new Curso { Nombre = request.Nombre.Trim(), IdNivel = request.IdNivel, IdProfesor = teacherId };
        db.Cursos.Add(course);
        await db.SaveChangesAsync(ct);
        if (request.IdAlumnos is { Length: > 0 } ids) await AddStudentsCoreAsync(course, ids, ct);
        await transaction.CommitAsync(ct);
        return await GetAsync(course.Id, ct);
    }

    /// <summary>Baja del curso: deja de verse, sus alumnos quedan sin curso (siguen siendo alumnos) y sus clases dejan de listarse.</summary>
    public async Task DeleteAsync(int id, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new AcademiaOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        var visibleId = await Visible().Where(c => c.Id == id).Select(c => (int?)c.Id).SingleOrDefaultAsync(ct) ?? throw NotFound();
        var course = await db.Cursos.SingleAsync(c => c.Id == visibleId, ct);
        course.Activo = false;
        foreach (var student in await db.Alumnos.Where(a => a.IdCurso == id).ToListAsync(ct)) student.IdCurso = null;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    public async Task<CursoDetalleResponse> AddStudentsAsync(int id, AgregarAlumnosRequest request, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        if (!await db.Usuarios.AnyAsync(u => u.Id == actor.Id && u.Activo, ct))
            throw new AcademiaOperationException(401, "UNAUTHENTICATED", "La sesión ya no está disponible.");
        var visibleId = await Visible().Where(c => c.Id == id).Select(c => (int?)c.Id).SingleOrDefaultAsync(ct) ?? throw NotFound();
        var course = await db.Cursos.SingleAsync(c => c.Id == visibleId, ct);
        await AddStudentsCoreAsync(course, request.IdAlumnos, ct);
        await transaction.CommitAsync(ct);
        return await GetAsync(id, ct);
    }

    private async Task AddStudentsCoreAsync(Curso course, int[] requested, CancellationToken ct)
    {
        var ids = requested.Distinct().ToArray();
        var students = await db.Alumnos.Where(a => ids.Contains(a.Id) && a.Activo && a.IdContactoNavigation.Activo).ToListAsync(ct);
        if (students.Count != ids.Length) throw new AcademiaOperationException(400, "REFERENCE_UNAVAILABLE", "Algún alumno no está disponible.");
        if (students.Any(a => a.IdNivel != course.IdNivel))
            throw new AcademiaOperationException(409, "BUSINESS_CONFLICT", "Solo se pueden sumar alumnos del mismo nivel que el curso.");
        if (students.Any(a => a.IdCurso is not null))
            throw new AcademiaOperationException(409, "BUSINESS_CONFLICT", "Algún alumno ya pertenece a un curso.");
        foreach (var student in students) student.IdCurso = course.Id;
        await db.SaveChangesAsync(ct);
    }
}
