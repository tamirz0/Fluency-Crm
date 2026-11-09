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

    public async Task<AlumnoResponse> GetAsync(int id, CancellationToken ct)
        => await Visible().Where(a => a.Id == id).Select(Projection).SingleOrDefaultAsync(ct)
            ?? throw new AcademiaOperationException(404, "NOT_FOUND", "No existe el alumno.");
}
