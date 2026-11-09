namespace Persistence.Models;

// Modelo académico del bonus. Mapeo contra segunda-entrega-bonus.sql en FluencyLocalDbContext.Academia.cs.

public partial class ProfesorNivel
{
    public int IdUsuario { get; set; }
    public int IdNivel { get; set; }
}

public partial class Curso
{
    public int Id { get; set; }
    public string Nombre { get; set; } = null!;
    public int IdNivel { get; set; }
    public int IdProfesor { get; set; }
    public DateTime FechaCreacion { get; set; }
    public bool Activo { get; set; } = true;
    public virtual NivelIngles IdNivelNavigation { get; set; } = null!;
    public virtual Usuario IdProfesorNavigation { get; set; } = null!;
    public virtual ICollection<Alumno> Alumnos { get; set; } = new List<Alumno>();
    public virtual ICollection<Clase> Clases { get; set; } = new List<Clase>();
}

public partial class Alumno
{
    public int Id { get; set; }
    public int IdContacto { get; set; }
    public int IdNivel { get; set; }
    public int? IdCurso { get; set; }
    public DateTime FechaAlta { get; set; }
    public bool Activo { get; set; } = true;
    public virtual Contacto IdContactoNavigation { get; set; } = null!;
    public virtual NivelIngles IdNivelNavigation { get; set; } = null!;
    public virtual Curso? IdCursoNavigation { get; set; }
}

public partial class Clase
{
    public int Id { get; set; }
    public int IdCurso { get; set; }
    public string Titulo { get; set; } = null!;
    public DateOnly Fecha { get; set; }
    public TimeOnly HoraInicio { get; set; }
    public TimeOnly HoraFin { get; set; }
    public bool EsExamen { get; set; }
    public string? TemasExamen { get; set; }
    public DateTime FechaCreacion { get; set; }
    public virtual Curso IdCursoNavigation { get; set; } = null!;
    public virtual ICollection<ClaseAlumno> Asistencias { get; set; } = new List<ClaseAlumno>();
}

public partial class ClaseAlumno
{
    public int IdClase { get; set; }
    public int IdAlumno { get; set; }
    public bool? Presente { get; set; }
    public decimal? Nota { get; set; }
    public virtual Clase IdClaseNavigation { get; set; } = null!;
    public virtual Alumno IdAlumnoNavigation { get; set; } = null!;
}

public partial class Taller
{
    public int Id { get; set; }
    public int IdServicio { get; set; }
    public string Titulo { get; set; } = null!;
    public DateOnly Fecha { get; set; }
    public TimeOnly HoraInicio { get; set; }
    public TimeOnly HoraFin { get; set; }
    public DateTime FechaCreacion { get; set; }
    public virtual Servicio IdServicioNavigation { get; set; } = null!;
    public virtual ICollection<TallerInscripcion> Inscripciones { get; set; } = new List<TallerInscripcion>();
}

public partial class TallerInscripcion
{
    public int IdTaller { get; set; }
    public int IdContacto { get; set; }
    public virtual Taller IdTallerNavigation { get; set; } = null!;
    public virtual Contacto IdContactoNavigation { get; set; } = null!;
}
