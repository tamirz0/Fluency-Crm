using Microsoft.EntityFrameworkCore;

namespace Persistence.Models;

public partial class FluencyLocalDbContext
{
    public virtual DbSet<ProfesorNivel> ProfesorNiveles { get; set; }
    public virtual DbSet<Curso> Cursos { get; set; }
    public virtual DbSet<Alumno> Alumnos { get; set; }
    public virtual DbSet<Clase> Clases { get; set; }
    public virtual DbSet<ClaseAlumno> ClaseAlumnos { get; set; }
    public virtual DbSet<Taller> Talleres { get; set; }
    public virtual DbSet<TallerInscripcion> TallerInscripciones { get; set; }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProfesorNivel>(entity =>
        {
            entity.HasKey(e => new { e.IdUsuario, e.IdNivel }).HasName("profesor_nivel_pkey");
            entity.ToTable("profesor_nivel");
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario");
            entity.Property(e => e.IdNivel).HasColumnName("id_nivel");
            entity.HasOne<Usuario>().WithMany().HasForeignKey(e => e.IdUsuario).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<NivelIngles>().WithMany().HasForeignKey(e => e.IdNivel).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Curso>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("curso_pkey");
            entity.ToTable("curso");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Nombre).HasMaxLength(100).HasColumnName("nombre");
            entity.Property(e => e.IdNivel).HasColumnName("id_nivel");
            entity.Property(e => e.IdProfesor).HasColumnName("id_profesor");
            entity.Property(e => e.FechaCreacion).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("fecha_creacion");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasColumnName("activo");
            entity.HasOne(d => d.IdNivelNavigation).WithMany().HasForeignKey(d => d.IdNivel).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(d => d.IdProfesorNavigation).WithMany().HasForeignKey(d => d.IdProfesor).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Alumno>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("alumno_pkey");
            entity.ToTable("alumno");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IdContacto).HasColumnName("id_contacto");
            entity.Property(e => e.IdNivel).HasColumnName("id_nivel");
            entity.Property(e => e.IdCurso).HasColumnName("id_curso");
            entity.Property(e => e.FechaAlta).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("fecha_alta");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasColumnName("activo");
            entity.HasIndex(e => e.IdContacto).IsUnique();
            entity.HasOne(d => d.IdContactoNavigation).WithMany().HasForeignKey(d => d.IdContacto).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(d => d.IdNivelNavigation).WithMany().HasForeignKey(d => d.IdNivel).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(d => d.IdCursoNavigation).WithMany(p => p.Alumnos).HasForeignKey(d => d.IdCurso).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Clase>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("clase_pkey");
            entity.ToTable("clase");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IdCurso).HasColumnName("id_curso");
            entity.Property(e => e.Titulo).HasMaxLength(150).HasColumnName("titulo");
            entity.Property(e => e.Fecha).HasColumnName("fecha");
            entity.Property(e => e.HoraInicio).HasColumnName("hora_inicio");
            entity.Property(e => e.HoraFin).HasColumnName("hora_fin");
            entity.Property(e => e.EsExamen).HasDefaultValue(false).HasColumnName("es_examen");
            entity.Property(e => e.TemasExamen).HasColumnName("temas_examen");
            entity.Property(e => e.FechaCreacion).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("fecha_creacion");
            entity.HasOne(d => d.IdCursoNavigation).WithMany(p => p.Clases).HasForeignKey(d => d.IdCurso).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ClaseAlumno>(entity =>
        {
            entity.HasKey(e => new { e.IdClase, e.IdAlumno }).HasName("clase_alumno_pkey");
            entity.ToTable("clase_alumno");
            entity.Property(e => e.IdClase).HasColumnName("id_clase");
            entity.Property(e => e.IdAlumno).HasColumnName("id_alumno");
            entity.Property(e => e.Presente).HasColumnName("presente");
            entity.Property(e => e.Nota).HasPrecision(4, 2).HasColumnName("nota");
            entity.HasOne(d => d.IdClaseNavigation).WithMany(p => p.Asistencias).HasForeignKey(d => d.IdClase).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(d => d.IdAlumnoNavigation).WithMany().HasForeignKey(d => d.IdAlumno).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Taller>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("taller_pkey");
            entity.ToTable("taller");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IdServicio).HasColumnName("id_servicio");
            entity.Property(e => e.Titulo).HasMaxLength(150).HasColumnName("titulo");
            entity.Property(e => e.Fecha).HasColumnName("fecha");
            entity.Property(e => e.HoraInicio).HasColumnName("hora_inicio");
            entity.Property(e => e.HoraFin).HasColumnName("hora_fin");
            entity.Property(e => e.FechaCreacion).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("fecha_creacion");
            entity.HasOne(d => d.IdServicioNavigation).WithMany().HasForeignKey(d => d.IdServicio).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TallerInscripcion>(entity =>
        {
            entity.HasKey(e => new { e.IdTaller, e.IdContacto }).HasName("taller_inscripcion_pkey");
            entity.ToTable("taller_inscripcion");
            entity.Property(e => e.IdTaller).HasColumnName("id_taller");
            entity.Property(e => e.IdContacto).HasColumnName("id_contacto");
            entity.HasOne(d => d.IdTallerNavigation).WithMany(p => p.Inscripciones).HasForeignKey(d => d.IdTaller).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(d => d.IdContactoNavigation).WithMany().HasForeignKey(d => d.IdContacto).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
