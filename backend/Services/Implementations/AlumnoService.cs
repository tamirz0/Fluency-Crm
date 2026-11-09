using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;

namespace Services.Implementations;

/// <summary>Alumnos: contactos que ganaron un servicio con nivel. El Profesor solo ve los de sus niveles; el Administrador, todos.</summary>
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

    public async Task<AlumnoResponse> GetAsync(int id, CancellationToken ct)
        => await Visible().Where(a => a.Id == id).Select(Projection).SingleOrDefaultAsync(ct)
            ?? throw new AcademiaOperationException(404, "NOT_FOUND", "No existe el alumno.");
}
