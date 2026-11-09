using System.ComponentModel.DataAnnotations;

namespace Services.DTO;

/// <summary>Error público de las operaciones académicas, sin detalles de persistencia.</summary>
public sealed class AcademiaOperationException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}

public sealed record OpcionResponse(int Id, string Descripcion);

public sealed record NivelesProfesorResponse(IReadOnlyList<OpcionResponse> Disponibles, IReadOnlyList<int> Seleccionados);

public sealed record NivelesProfesorRequest
{
    [Required, MaxLength(20)]
    public required int[] IdNiveles { get; init; }
}

public sealed record AlumnoResponse
{
    public required int Id { get; init; }
    public required int IdContacto { get; init; }
    public required string Nombre { get; init; }
    public required string Apellido { get; init; }
    public string? Documento { get; init; }
    public required string Correo { get; init; }
    public string? Telefono { get; init; }
    public required OpcionResponse Nivel { get; init; }
    public OpcionResponse? Curso { get; init; }
    public required DateTime FechaAlta { get; init; }
}

public sealed record CursoResponse
{
    public required int Id { get; init; }
    public required string Nombre { get; init; }
    public required OpcionResponse Nivel { get; init; }
    public required OpcionResponse Profesor { get; init; }
    public required int CantidadAlumnos { get; init; }
    public required int CantidadClases { get; init; }
}

public sealed record CursoDetalleResponse
{
    public required CursoResponse Curso { get; init; }
    public required IReadOnlyList<AlumnoResponse> Alumnos { get; init; }
}

public sealed record CreateCursoRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string Nombre { get; init; }
    [Range(1, int.MaxValue)]
    public required int IdNivel { get; init; }
    /// <summary>Solo lo usa el Administrador; un Profesor siempre crea cursos propios.</summary>
    [Range(1, int.MaxValue)]
    public int? IdProfesor { get; init; }
    [MaxLength(200)]
    public int[]? IdAlumnos { get; init; }
}

public sealed record AgregarAlumnosRequest
{
    [Required, MinLength(1), MaxLength(200)]
    public required int[] IdAlumnos { get; init; }
}

public sealed record ProfesorResponse
{
    public required int Id { get; init; }
    public required string Nombre { get; init; }
    public required string Apellido { get; init; }
    public required bool Activo { get; init; }
    public required IReadOnlyList<OpcionResponse> Niveles { get; init; }
    public required int CantidadCursos { get; init; }
    public required int CantidadClases { get; init; }
}

public sealed record ClaseResponse
{
    public required int Id { get; init; }
    public required string Titulo { get; init; }
    public required DateOnly Fecha { get; init; }
    public required TimeOnly HoraInicio { get; init; }
    public required TimeOnly HoraFin { get; init; }
    public required bool EsExamen { get; init; }
    public string? TemasExamen { get; init; }
    public required OpcionResponse Curso { get; init; }
    public required OpcionResponse Profesor { get; init; }
}

public sealed record ClaseAlumnoResponse
{
    public required int IdAlumno { get; init; }
    public required int IdContacto { get; init; }
    public required string Nombre { get; init; }
    public required string Apellido { get; init; }
    public string? Documento { get; init; }
    /// <summary>null = sin registrar.</summary>
    public bool? Presente { get; init; }
    public decimal? Nota { get; init; }
}

public sealed record ClaseDetalleResponse
{
    public required ClaseResponse Clase { get; init; }
    public required IReadOnlyList<ClaseAlumnoResponse> Alumnos { get; init; }
}

public sealed record CreateClaseRequest
{
    [Required, StringLength(150, MinimumLength = 1)]
    public required string Titulo { get; init; }
    [Range(1, int.MaxValue)]
    public required int IdCurso { get; init; }
    public required DateOnly Fecha { get; init; }
    public required TimeOnly HoraInicio { get; init; }
    public required TimeOnly HoraFin { get; init; }
    public bool EsExamen { get; init; }
    [MaxLength(2000)]
    public string? TemasExamen { get; init; }
}

public sealed record AsistenciaItem
{
    [Range(1, int.MaxValue)]
    public required int IdAlumno { get; init; }
    public required bool Presente { get; init; }
}

public sealed record GuardarAsistenciaRequest
{
    [Required, MinLength(1), MaxLength(200)]
    public required AsistenciaItem[] Items { get; init; }
}

public sealed record NotaItem
{
    [Range(1, int.MaxValue)]
    public required int IdAlumno { get; init; }
    /// <summary>De 0 a 10 con hasta dos decimales; null borra la nota.</summary>
    [Range(0, 10)]
    public decimal? Nota { get; init; }
}

public sealed record GuardarNotasRequest
{
    [Required, MinLength(1), MaxLength(200)]
    public required NotaItem[] Items { get; init; }
}

public sealed record AsistenciaClaseResponse
{
    public required int IdClase { get; init; }
    public required string Titulo { get; init; }
    public required DateOnly Fecha { get; init; }
    public required TimeOnly HoraInicio { get; init; }
    public required bool EsExamen { get; init; }
    /// <summary>null = sin registrar.</summary>
    public bool? Presente { get; init; }
    public decimal? Nota { get; init; }
}

/// <summary>Asistencia del alumno: presentes sobre las clases de su curso con fecha hasta hoy.</summary>
public sealed record AsistenciaAlumnoResponse
{
    public required int IdAlumno { get; init; }
    public required OpcionResponse Nivel { get; init; }
    public OpcionResponse? Curso { get; init; }
    public required int Presentes { get; init; }
    public required int Clases { get; init; }
    public required IReadOnlyList<AsistenciaClaseResponse> Items { get; init; }
}

/// <summary>Lo académico de un contacto para su ficha comercial: nulo si el contacto no es alumno.</summary>
public sealed record ContactoAcademicoResponse
{
    public AsistenciaAlumnoResponse? Alumno { get; init; }
}

public sealed record TallerResponse
{
    public required int Id { get; init; }
    public required string Titulo { get; init; }
    public required DateOnly Fecha { get; init; }
    public required TimeOnly HoraInicio { get; init; }
    public required TimeOnly HoraFin { get; init; }
    public required OpcionResponse Servicio { get; init; }
    public required int CantidadInscriptos { get; init; }
}

public sealed record PersonaTallerResponse
{
    public required int IdContacto { get; init; }
    public required string Nombre { get; init; }
    public required string Apellido { get; init; }
    public string? Documento { get; init; }
    /// <summary>true si además cursa un nivel de inglés (tiene registro de alumno).</summary>
    public required bool EsAlumno { get; init; }
}

public sealed record TallerDetalleResponse
{
    public required TallerResponse Taller { get; init; }
    public required IReadOnlyList<PersonaTallerResponse> Inscriptos { get; init; }
}

public sealed record CreateTallerRequest
{
    [Required, StringLength(150, MinimumLength = 1)]
    public required string Titulo { get; init; }
    [Range(1, int.MaxValue)]
    public required int IdServicio { get; init; }
    public required DateOnly Fecha { get; init; }
    public required TimeOnly HoraInicio { get; init; }
    public required TimeOnly HoraFin { get; init; }
}

public sealed record InscribirTallerRequest
{
    [Range(1, int.MaxValue)]
    public required int IdContacto { get; init; }
}
