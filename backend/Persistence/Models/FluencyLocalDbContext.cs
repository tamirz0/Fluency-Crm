using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Persistence.Models;

public partial class FluencyLocalDbContext : DbContext
{
    public FluencyLocalDbContext()
    {
    }

    public FluencyLocalDbContext(DbContextOptions<FluencyLocalDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<TipoActividad> TiposActividad { get; set; }

    public virtual DbSet<MotivoPerdida> MotivosPerdida { get; set; }

    public virtual DbSet<Actividad> Actividades { get; set; }

    public virtual DbSet<Contacto> Contactos { get; set; }

    public virtual DbSet<Empresa> Empresas { get; set; }

    public virtual DbSet<EstadoCliente> EstadoClientes { get; set; }

    public virtual DbSet<EstadoOportunidad> EstadoOportunidades { get; set; }

    public virtual DbSet<EtapaComercial> EtapaComerciales { get; set; }

    public virtual DbSet<HistorialEtapa> HistorialEtapas { get; set; }

    public virtual DbSet<Modalidad> Modalidades { get; set; }


    public virtual DbSet<NivelIngles> NivelesIngles { get; set; }

    public virtual DbSet<Oportunidad> Oportunidades { get; set; }

    public virtual DbSet<OrigenComercial> OrigenComerciales { get; set; }

    public virtual DbSet<Permiso> Permisos { get; set; }

    public virtual DbSet<PermisoRol> PermisoRoles { get; set; }

    public virtual DbSet<Rol> Roles { get; set; }

    public virtual DbSet<Servicio> Servicios { get; set; }

    public virtual DbSet<TipoServicio> TiposServicio { get; set; }

    public virtual DbSet<Embudo> Embudos { get; set; }

    public virtual DbSet<Usuario> Usuarios { get; set; }

    public virtual DbSet<UsuarioRol> UsuarioRoles { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TipoActividad>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("tipo_actividad_pkey");

            entity.ToTable("tipo_actividad");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .HasColumnName("nombre");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasSentinel(true).HasColumnName("activo");
        });

        modelBuilder.Entity<MotivoPerdida>(entity =>
        {
            entity.ToTable("motivo_perdida");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Descripcion).HasMaxLength(100).HasColumnName("descripcion");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasSentinel(true).HasColumnName("activo");
        });

        modelBuilder.Entity<Actividad>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("actividad_pkey");

            entity.ToTable("actividad");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.IdTipo).HasColumnName("id_tipo");
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario");
            entity.Property(e => e.IdEmpresa).HasColumnName("id_empresa");
            entity.Property(e => e.IdContacto).HasColumnName("id_contacto");
            entity.Property(e => e.IdOportunidad).HasColumnName("id_oportunidad");
            entity.Property(e => e.FechaHora).HasColumnName("fecha_hora");
            entity.Property(e => e.FechaRegistro).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("fecha_registro");
            entity.Property(e => e.Descripcion).HasColumnName("descripcion");
            entity.Property(e => e.Resultado).HasColumnName("resultado");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasSentinel(true).HasColumnName("activo");

            entity.HasOne(d => d.IdTipoNavigation).WithMany(p => p.Actividades)
                .HasForeignKey(d => d.IdTipo)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("actividad_id_tipo_fkey");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany(p => p.Actividades)
                .HasForeignKey(d => d.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("actividad_id_usuario_fkey");

            entity.HasOne(d => d.IdEmpresaNavigation).WithMany(p => p.Actividades)
                .HasForeignKey(d => d.IdEmpresa)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("actividad_id_empresa_fkey");

            entity.HasOne(d => d.IdContactoNavigation).WithMany(p => p.Actividades)
                .HasForeignKey(d => d.IdContacto)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("actividad_id_contacto_fkey");

            entity.HasOne(d => d.IdOportunidadNavigation).WithMany(p => p.Actividades)
                .HasForeignKey(d => d.IdOportunidad)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("actividad_id_oportunidad_fkey");
        });

        modelBuilder.Entity<Contacto>(entity =>
        {
            entity.Property(e => e.IdEstado).IsRequired();
            entity.Property(e => e.IdResponsable).HasColumnName("id_responsable");
            entity.Property(e => e.FechaCreacion).HasColumnName("fecha_creacion").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Activo).HasColumnName("activo").HasDefaultValue(true).HasSentinel(true);
            entity.HasOne(e => e.IdResponsableNavigation).WithMany().HasForeignKey(e => e.IdResponsable).OnDelete(DeleteBehavior.Restrict);
            entity.HasKey(e => e.Id).HasName("contacto_pkey");

            entity.ToTable("contacto");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Apellido)
                .HasMaxLength(100)
                .HasColumnName("apellido");
            entity.Property(e => e.Cargo)
                .HasMaxLength(100)
                .HasColumnName("cargo");
            entity.Property(e => e.Correo)
                .HasMaxLength(150)
                .HasColumnName("correo");
            entity.Property(e => e.Documento)
                .HasMaxLength(20)
                .HasColumnName("documento");
            entity.Property(e => e.IdEmpresa).HasColumnName("id_empresa");
            entity.Property(e => e.IdEstado).HasColumnName("id_estado");
            entity.Property(e => e.IdOrigen).HasColumnName("id_origen");
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .HasColumnName("nombre");
            entity.Property(e => e.Observaciones).HasColumnName("observaciones");
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .HasColumnName("telefono");

            entity.HasOne(d => d.IdEmpresaNavigation).WithMany(p => p.Contactos)
                .HasForeignKey(d => d.IdEmpresa)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("contacto_id_empresa_fkey");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.Contactos)
                .HasForeignKey(d => d.IdEstado)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("contacto_id_estado_fkey");

            entity.HasOne(d => d.IdOrigenNavigation).WithMany(p => p.Contactos)
                .HasForeignKey(d => d.IdOrigen)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("contacto_id_origen_fkey");
        });

        modelBuilder.Entity<Empresa>(entity =>
        {
            entity.Property(e => e.IdEstado).IsRequired();
            entity.Property(e => e.IdResponsable).HasColumnName("id_responsable");
            entity.Property(e => e.FechaCreacion).HasColumnName("fecha_creacion").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Activo).HasColumnName("activo").HasDefaultValue(true).HasSentinel(true);
            entity.HasOne(e => e.IdResponsableNavigation).WithMany().HasForeignKey(e => e.IdResponsable).OnDelete(DeleteBehavior.Restrict);
            entity.HasKey(e => e.Id).HasName("empresa_pkey");

            entity.ToTable("empresa");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Correo)
                .HasMaxLength(150)
                .HasColumnName("correo");
            entity.Property(e => e.Cuit)
                .HasMaxLength(20)
                .HasColumnName("cuit");
            entity.Property(e => e.Direccion).HasColumnName("direccion");
            entity.Property(e => e.IdEstado).HasColumnName("id_estado");
            entity.Property(e => e.IdOrigen).HasColumnName("id_origen");
            entity.Property(e => e.Industria)
                .HasMaxLength(100)
                .HasColumnName("industria");
            entity.Property(e => e.Observaciones).HasColumnName("observaciones");
            entity.Property(e => e.RazonSocial)
                .HasMaxLength(150)
                .HasColumnName("razon_social");
            entity.Property(e => e.Telefono)
                .HasMaxLength(50)
                .HasColumnName("telefono");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.Empresas)
                .HasForeignKey(d => d.IdEstado)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("empresa_id_estado_fkey");

            entity.HasOne(d => d.IdOrigenNavigation).WithMany(p => p.Empresas)
                .HasForeignKey(d => d.IdOrigen)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("empresa_id_origen_fkey");
        });

        modelBuilder.Entity<EstadoCliente>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("estado_cliente_pkey");

            entity.ToTable("estado_cliente");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(100)
                .HasColumnName("descripcion");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasSentinel(true).HasColumnName("activo");

        });

        modelBuilder.Entity<EstadoOportunidad>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("estado_oportunidad_pkey");

            entity.ToTable("estado_oportunidad");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(100)
                .HasColumnName("descripcion");
            entity.Property(e => e.Codigo).HasMaxLength(100).HasColumnName("codigo");

        });

        modelBuilder.Entity<Embudo>(entity =>
        {
            entity.ToTable("embudo");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Nombre).HasMaxLength(100).HasColumnName("nombre");
            entity.Property(e => e.Descripcion).HasColumnName("descripcion");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasColumnName("activo");
            entity.HasMany(e => e.TiposServicio).WithMany()
                .UsingEntity<Dictionary<string, object>>("embudo_tipo_servicio",
                    r => r.HasOne<TipoServicio>().WithMany().HasForeignKey("id_tipo_servicio").OnDelete(DeleteBehavior.Restrict),
                    l => l.HasOne<Embudo>().WithMany().HasForeignKey("id_embudo").OnDelete(DeleteBehavior.Restrict),
                    j => j.HasKey("id_embudo", "id_tipo_servicio"));
            entity.HasMany(e => e.Servicios).WithMany()
                .UsingEntity<Dictionary<string, object>>("embudo_servicio",
                    r => r.HasOne<Servicio>().WithMany().HasForeignKey("id_servicio").OnDelete(DeleteBehavior.Restrict),
                    l => l.HasOne<Embudo>().WithMany().HasForeignKey("id_embudo").OnDelete(DeleteBehavior.Restrict),
                    j => j.HasKey("id_embudo", "id_servicio"));
        });

        modelBuilder.Entity<TipoServicio>(entity =>
        {
            entity.ToTable("tipo_servicio");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Descripcion).HasMaxLength(100).HasColumnName("descripcion");
            entity.Property(e => e.Codigo).HasMaxLength(20).HasColumnName("codigo");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasSentinel(true).HasColumnName("activo");
        });

        modelBuilder.Entity<EtapaComercial>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("etapa_comercial_pkey");

            entity.ToTable("etapa_comercial");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Descripcion).HasColumnName("descripcion");
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .HasColumnName("nombre");
            entity.Property(e => e.Orden).HasColumnName("orden");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasColumnName("activo");
            entity.Property(e => e.IdEmbudo).HasColumnName("id_embudo");
            entity.Property(e => e.IdEstado).HasColumnName("id_estado");
            entity.HasOne(e => e.IdEmbudoNavigation).WithMany(e => e.Etapas)
                .HasForeignKey(e => e.IdEmbudo).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.IdEstadoNavigation).WithMany(e => e.Etapas)
                .HasForeignKey(e => e.IdEstado).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.IdEmbudo, e.Orden }).IsUnique().HasFilter("activo")
                .HasDatabaseName("ux_etapa_embudo_orden_activo");
            // The final-state partial index is defined by semantic codes in the versioned SQL.
        });

        modelBuilder.Entity<HistorialEtapa>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("historial_etapas_pkey");

            entity.ToTable("historial_etapas");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.FechaHora).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("fecha_hora");
            entity.Property(e => e.IdEtapaAnterior).HasColumnName("id_etapa_anterior");
            entity.Property(e => e.IdNuevaEtapa).HasColumnName("id_nueva_etapa");
            entity.Property(e => e.IdOportunidad).HasColumnName("id_oportunidad");
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario");
            entity.Property(e => e.Observacion).HasColumnName("observacion");

            entity.HasOne(d => d.IdEtapaAnteriorNavigation).WithMany(p => p.HistorialEtapaIdEtapaAnteriorNavigations)
                .HasForeignKey(d => d.IdEtapaAnterior)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("historial_etapas_id_etapa_anterior_fkey");

            entity.HasOne(d => d.IdNuevaEtapaNavigation).WithMany(p => p.HistorialEtapaIdNuevaEtapaNavigations)
                .HasForeignKey(d => d.IdNuevaEtapa)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("historial_etapas_id_nueva_etapa_fkey");

            entity.HasOne(d => d.IdOportunidadNavigation).WithMany(p => p.HistorialEtapas)
                .HasForeignKey(d => d.IdOportunidad)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("historial_etapas_id_oportunidad_fkey");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany(p => p.HistorialEtapas)
                .HasForeignKey(d => d.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("historial_etapas_id_usuario_fkey");
        });

        modelBuilder.Entity<Modalidad>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("modalidad_pkey");

            entity.ToTable("modalidad");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(100)
                .HasColumnName("descripcion");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasSentinel(true).HasColumnName("activo");

        });

        modelBuilder.Entity<NivelIngles>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("nivel_ingles_pkey");

            entity.ToTable("nivel_ingles");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(100)
                .HasColumnName("descripcion");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasSentinel(true).HasColumnName("activo");

        });

        modelBuilder.Entity<Oportunidad>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("oportunidad_pkey");

            entity.ToTable("oportunidad");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Titulo).HasMaxLength(100).HasColumnName("titulo");
            entity.Property(e => e.IdResponsable).HasColumnName("id_responsable");
            entity.Property(e => e.IdEmpresa).HasColumnName("id_empresa");
            entity.Property(e => e.IdContacto).HasColumnName("id_contacto");
            entity.Property(e => e.IdEtapa).HasColumnName("id_etapa");
            entity.Property(e => e.IdServicio).HasColumnName("id_servicio");
            entity.HasOne(d => d.IdServicioNavigation).WithMany().HasForeignKey(d => d.IdServicio).OnDelete(DeleteBehavior.Restrict);
            entity.Property(e => e.IdOrigen).HasColumnName("id_origen");
            entity.Property(e => e.Valor).HasPrecision(12, 2).HasColumnName("valor");
            entity.Property(e => e.FechaCreacion).HasDefaultValueSql("CURRENT_TIMESTAMP").HasColumnName("fecha_creacion");
            entity.Property(e => e.FechaEstimadaCierre).HasColumnName("fecha_estimada_cierre");
            entity.Property(e => e.FechaCierre).HasColumnName("fecha_cierre");
            entity.Property(e => e.IdMotivoPerdida).HasColumnName("id_motivo_perdida");
            entity.Property(e => e.ObjetivoAprendizaje).HasColumnName("objetivo_aprendizaje");
            entity.Property(e => e.CantidadParticipantes).HasColumnName("cantidad_participantes");
            entity.Property(e => e.DisponibilidadHoraria).HasColumnName("disponibilidad_horaria");
            entity.Property(e => e.Observaciones).HasColumnName("observaciones");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasSentinel(true).HasColumnName("activo");

            entity.HasOne(d => d.IdResponsableNavigation).WithMany(p => p.Oportunidades)
                .HasForeignKey(d => d.IdResponsable)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("oportunidad_id_responsable_fkey");

            entity.HasOne(d => d.IdEmpresaNavigation).WithMany(p => p.Oportunidades)
                .HasForeignKey(d => d.IdEmpresa)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("oportunidad_id_empresa_fkey");

            entity.HasOne(d => d.IdContactoNavigation).WithMany(p => p.Oportunidades)
                .HasForeignKey(d => d.IdContacto)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("oportunidad_id_contacto_fkey");

            entity.HasOne(d => d.IdEtapaNavigation).WithMany(p => p.Oportunidades)
                .HasForeignKey(d => d.IdEtapa)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("oportunidad_id_etapa_fkey");

            entity.HasOne(d => d.IdOrigenNavigation).WithMany(p => p.Oportunidades)
                .HasForeignKey(d => d.IdOrigen)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("oportunidad_id_origen_fkey");

            entity.HasOne(d => d.IdMotivoPerdidaNavigation).WithMany()
                .HasForeignKey(d => d.IdMotivoPerdida)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("oportunidad_id_motivo_perdida_fkey");

            entity.HasIndex(e => e.IdResponsable, "ix_oportunidad_responsable");
            entity.HasIndex(e => e.IdEmpresa, "ix_oportunidad_empresa");
            entity.HasIndex(e => e.IdContacto, "ix_oportunidad_contacto");
            entity.HasIndex(e => e.IdEtapa, "ix_oportunidad_etapa");
            entity.HasIndex(e => e.IdOrigen, "ix_oportunidad_origen");
            entity.HasIndex(e => e.IdMotivoPerdida, "ix_oportunidad_motivo");
            // ck_oportunidad_cliente y los CHECK de valor/participantes viven solo en el SQL versionado.
        });

        modelBuilder.Entity<OrigenComercial>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("origen_comercial_pkey");

            entity.ToTable("origen_comercial");

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(100)
                .HasColumnName("descripcion");
            entity.Property(e => e.Activo).HasDefaultValue(true).HasSentinel(true).HasColumnName("activo");

        });

        modelBuilder.Entity<Permiso>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("permiso_pkey");

            entity.ToTable("permiso");

            entity.HasIndex(e => e.Codigo, "permiso_codigo_key").IsUnique();

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Codigo)
                .HasMaxLength(100)
                .HasColumnName("codigo");
            entity.Property(e => e.Descripcion)
                .HasColumnType("text")
                .HasColumnName("descripcion");
        });

        modelBuilder.Entity<PermisoRol>(entity =>
        {
            entity.HasKey(e => new { e.IdRol, e.IdPermiso }).HasName("permiso_rol_pkey");

            entity.ToTable("permiso_rol");

            entity.Property(e => e.IdRol).HasColumnName("id_rol");
            entity.Property(e => e.IdPermiso).HasColumnName("id_permiso");

            entity.HasOne(d => d.IdPermisoNavigation).WithMany(p => p.PermisoRoles)
                .HasForeignKey(d => d.IdPermiso)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("permiso_rol_id_permiso_fkey");

            entity.HasOne(d => d.IdRolNavigation).WithMany(p => p.PermisoRoles)
                .HasForeignKey(d => d.IdRol)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("permiso_rol_id_rol_fkey");
        });

        modelBuilder.Entity<Rol>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("rol_pkey");

            entity.ToTable("rol");

            entity.HasIndex(e => e.Nombre, "rol_nombre_key").IsUnique();

            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasColumnType("text")
                .HasColumnName("descripcion");
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .HasColumnName("nombre");
        });

        modelBuilder.Entity<Servicio>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("servicio_pkey");

            entity.ToTable("servicio");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activo)
                .HasDefaultValue(true)
                .HasColumnName("activo");
            entity.Property(e => e.Descripcion).HasColumnName("descripcion");
            entity.Property(e => e.DuracionHoras).HasColumnName("duracion_horas");
            entity.Property(e => e.IdModalidad).HasColumnName("id_modalidad");
            entity.Property(e => e.IdNivel).HasColumnName("id_nivel");
            entity.Property(e => e.IdTipoServicio).HasColumnName("id_tipo_servicio");
            entity.Property(e => e.Nombre)
                .HasMaxLength(150)
                .HasColumnName("nombre");
            entity.Property(e => e.PrecioReferencia)
                .HasPrecision(12, 2)
                .HasColumnName("precio_referencia");

            entity.HasOne(d => d.IdModalidadNavigation).WithMany(p => p.Servicios)
                .HasForeignKey(d => d.IdModalidad)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("servicio_id_modalidad_fkey");

            entity.HasOne(d => d.IdNivelNavigation).WithMany(p => p.Servicios)
                .HasForeignKey(d => d.IdNivel)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("servicio_id_nivel_fkey");

            entity.HasOne(d => d.IdTipoServicioNavigation).WithMany(p => p.Servicios)
                .HasForeignKey(d => d.IdTipoServicio)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("usuario_pkey");

            entity.ToTable("usuario");

            // The expression indexes lower(btrim(...)) are defined only by the SQL.
            entity.Property(e => e.Id).UseIdentityAlwaysColumn().HasColumnName("id");
            entity.Property(e => e.Activo)
                .HasDefaultValue(true)
                .HasSentinel(true)
                .HasColumnName("activo");
            entity.Property(e => e.Apellido)
                .HasMaxLength(100)
                .HasColumnName("apellido");
            entity.Property(e => e.Correo)
                .HasMaxLength(150)
                .HasColumnName("correo");
            entity.Property(e => e.Nombre)
                .HasMaxLength(100)
                .HasColumnName("nombre");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(150)
                .HasColumnName("password_hash");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .HasColumnName("username");
        });

        modelBuilder.Entity<UsuarioRol>(entity =>
        {
            entity.HasKey(e => new { e.IdUsuario, e.IdRol }).HasName("usuario_rol_pkey");

            entity.ToTable("usuario_rol");

            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario");
            entity.Property(e => e.IdRol).HasColumnName("id_rol");

            entity.HasOne(d => d.IdRolNavigation).WithMany(p => p.UsuarioRoles)
                .HasForeignKey(d => d.IdRol)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("usuario_rol_id_rol_fkey");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany(p => p.UsuarioRoles)
                .HasForeignKey(d => d.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("usuario_rol_id_usuario_fkey");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
