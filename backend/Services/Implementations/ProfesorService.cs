using System.Data;
using Microsoft.EntityFrameworkCore;
using Persistence.Models;
using Services.Acceso;
using Services.DTO;

namespace Services.Implementations;

public sealed class ProfesorService(FluencyLocalDbContext db, ActorActual actor)
{
    private void RequireTeacher()
    {
        if (!actor.Usuario.Roles.Contains(RolesYPermisos.Profesor))
            throw new AcademiaOperationException(403, "FORBIDDEN", "Solo un profesor define sus niveles de inglés.");
    }

    private async Task<NivelesProfesorResponse> ReadAsync(int teacherId, CancellationToken ct)
    {
        var levels = await db.NivelesIngles.AsNoTracking().Where(n => n.Activo).OrderBy(n => n.Id)
            .Select(n => new OpcionResponse(n.Id, n.Descripcion)).ToListAsync(ct);
        var selected = await db.ProfesorNiveles.AsNoTracking().Where(p => p.IdUsuario == teacherId).OrderBy(p => p.IdNivel)
            .Select(p => p.IdNivel).ToListAsync(ct);
        return new(levels, selected);
    }

    /// <summary>Profesores (usuarios con rol PROFESOR) con sus niveles y la cantidad de cursos y clases a su cargo. Solo Administrador.</summary>
    public async Task<IReadOnlyList<ProfesorResponse>> ListAsync(bool incluirInactivos, CancellationToken ct)
    {
        var teachers = await db.Usuarios.AsNoTracking()
            .Where(u => (incluirInactivos || u.Activo) && u.UsuarioRoles.Any(j => j.IdRolNavigation.Nombre == RolesYPermisos.Profesor))
            .OrderBy(u => u.Apellido).ThenBy(u => u.Nombre).ThenBy(u => u.Id)
            .Select(u => new
            {
                u.Id, u.Nombre, u.Apellido, u.Activo,
                Cursos = db.Cursos.Count(c => c.IdProfesor == u.Id && c.Activo),
                Clases = db.Clases.Count(c => c.IdCursoNavigation.IdProfesor == u.Id && c.IdCursoNavigation.Activo),
            }).ToListAsync(ct);
        var levels = await db.ProfesorNiveles.AsNoTracking().OrderBy(p => p.IdNivel)
            .Join(db.NivelesIngles, p => p.IdNivel, n => n.Id, (p, n) => new { p.IdUsuario, Nivel = new OpcionResponse(n.Id, n.Descripcion) }).ToListAsync(ct);
        return teachers.Select(t => new ProfesorResponse
        {
            Id = t.Id, Nombre = t.Nombre, Apellido = t.Apellido, Activo = t.Activo, CantidadCursos = t.Cursos, CantidadClases = t.Clases,
            Niveles = levels.Where(l => l.IdUsuario == t.Id).Select(l => l.Nivel).ToList(),
        }).ToList();
    }

    public async Task<NivelesProfesorResponse> GetLevelsAsync(CancellationToken ct)
    {
        RequireTeacher();
        return await ReadAsync(actor.Id, ct);
    }

    /// <summary>Reemplaza los niveles del profesor autenticado. No permite quitar un nivel con cursos activos.</summary>
    public async Task<NivelesProfesorResponse> SetLevelsAsync(NivelesProfesorRequest request, CancellationToken ct)
    {
        RequireTeacher();
        return await SetLevelsCoreAsync(actor.Id, request, ct);
    }

    /// <summary>El administrador define los niveles de cualquier profesor (la ruta solo la abre la política de administración de profesores).</summary>
    public async Task<NivelesProfesorResponse> SetLevelsOfAsync(int teacherId, NivelesProfesorRequest request, CancellationToken ct)
    {
        if (!await db.Usuarios.AnyAsync(u => u.Id == teacherId && u.UsuarioRoles.Any(j => j.IdRolNavigation.Nombre == RolesYPermisos.Profesor), ct))
            throw new AcademiaOperationException(404, "NOT_FOUND", "No existe el profesor.");
        return await SetLevelsCoreAsync(teacherId, request, ct);
    }

    private async Task<NivelesProfesorResponse> SetLevelsCoreAsync(int teacherId, NivelesProfesorRequest request, CancellationToken ct)
    {
        var ids = request.IdNiveles.Distinct().ToArray();
        // Serializable: no puede cruzarse con el alta de un curso del mismo nivel que se está quitando.
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var valid = await db.NivelesIngles.Where(n => n.Activo && ids.Contains(n.Id)).Select(n => n.Id).ToListAsync(ct);
        if (valid.Count != ids.Length)
            throw new AcademiaOperationException(400, "REFERENCE_UNAVAILABLE", "Algún nivel de inglés no está disponible.");
        if (await db.Cursos.AnyAsync(c => c.IdProfesor == teacherId && c.Activo && !ids.Contains(c.IdNivel), ct))
            throw new AcademiaOperationException(409, "BUSINESS_CONFLICT", "No se puede quitar un nivel en el que el profesor tiene cursos.");
        var current = await db.ProfesorNiveles.Where(p => p.IdUsuario == teacherId).ToListAsync(ct);
        db.ProfesorNiveles.RemoveRange(current.Where(p => !ids.Contains(p.IdNivel)));
        db.ProfesorNiveles.AddRange(ids.Where(id => current.All(p => p.IdNivel != id)).Select(id => new ProfesorNivel { IdUsuario = teacherId, IdNivel = id }));
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await ReadAsync(teacherId, ct);
    }
}
