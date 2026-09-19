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

    public virtual DbSet<Actividad> Actividades { get; set; }

    public virtual DbSet<ActividadOportunidad> ActividadOportunidades { get; set; }

    public virtual DbSet<Contacto> Contactos { get; set; }

    public virtual DbSet<Empresa> Empresas { get; set; }

    public virtual DbSet<EstadoCliente> EstadoClientes { get; set; }

    public virtual DbSet<EstadoOportunidad> EstadoOportunidades { get; set; }

    public virtual DbSet<EtapaComercial> EtapaComerciales { get; set; }

    public virtual DbSet<HistorialEtapa> HistorialEtapas { get; set; }

    public virtual DbSet<LogOportunidadCambio> LogOportunidadCambios { get; set; }

    public virtual DbSet<Modalidad> Modalidades { get; set; }

    public virtual DbSet<MotivoRechazo> MotivoRechazos { get; set; }

    public virtual DbSet<NivelIngles> NivelesIngles { get; set; }

    public virtual DbSet<Oportunidad> Oportunidades { get; set; }

    public virtual DbSet<OportunidadItem> OportunidadItems { get; set; }

    public virtual DbSet<OrigenComercial> OrigenComerciales { get; set; }

    public virtual DbSet<Permiso> Permisos { get; set; }

    public virtual DbSet<PermisoRol> PermisoRoles { get; set; }

    public virtual DbSet<Rol> Roles { get; set; }

    public virtual DbSet<Servicio> Servicios { get; set; }

    public virtual DbSet<Usuario> Usuarios { get; set; }

    public virtual DbSet<UsuarioRol> UsuarioRoles { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        // Falls back to a local connection string only when the app didn't already configure one
        // (e.g. via AddDbContext in Program.cs), so design-time tools like `dotnet ef` keep working
        // while the running app is free to supply its own connection string from configuration.
        if (!optionsBuilder.IsConfigured)
        {
            optionsBuilder.UseNpgsql("Host=localhost;Database=FluencyLocalDB;Username=postgres;Password=porotito");
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Actividad>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("actividad_pkey");

            entity.ToTable("actividad");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(100)
                .HasColumnName("descripcion");
        });

        modelBuilder.Entity<ActividadOportunidad>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("actividad_oportunidad_pkey");

            entity.ToTable("actividad_oportunidad");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Descripcion).HasColumnName("descripcion");
            entity.Property(e => e.FechaHora)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("fecha_hora");
            entity.Property(e => e.IdContacto).HasColumnName("id_contacto");
            entity.Property(e => e.IdEmpresa).HasColumnName("id_empresa");
            entity.Property(e => e.IdOportunidad).HasColumnName("id_oportunidad");
            entity.Property(e => e.IdTipoActividad).HasColumnName("id_tipo_actividad");
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario");
            entity.Property(e => e.Resultado)
                .HasMaxLength(200)
                .HasColumnName("resultado");

            entity.HasOne(d => d.IdContactoNavigation).WithMany(p => p.ActividadOportunidades)
                .HasForeignKey(d => d.IdContacto)
                .HasConstraintName("actividad_oportunidad_id_contacto_fkey");

            entity.HasOne(d => d.IdEmpresaNavigation).WithMany(p => p.ActividadOportunidades)
                .HasForeignKey(d => d.IdEmpresa)
                .HasConstraintName("actividad_oportunidad_id_empresa_fkey");

            entity.HasOne(d => d.IdOportunidadNavigation).WithMany(p => p.ActividadOportunidades)
                .HasForeignKey(d => d.IdOportunidad)
                .HasConstraintName("actividad_oportunidad_id_oportunidad_fkey");

            entity.HasOne(d => d.IdTipoActividadNavigation).WithMany(p => p.ActividadOportunidades)
                .HasForeignKey(d => d.IdTipoActividad)
                .HasConstraintName("actividad_oportunidad_id_tipo_actividad_fkey");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany(p => p.ActividadOportunidades)
                .HasForeignKey(d => d.IdUsuario)
                .HasConstraintName("actividad_oportunidad_id_usuario_fkey");
        });

        modelBuilder.Entity<Contacto>(entity =>
        {
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
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("contacto_id_empresa_fkey");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.Contactos)
                .HasForeignKey(d => d.IdEstado)
                .HasConstraintName("contacto_id_estado_fkey");

            entity.HasOne(d => d.IdOrigenNavigation).WithMany(p => p.Contactos)
                .HasForeignKey(d => d.IdOrigen)
                .HasConstraintName("contacto_id_origen_fkey");
        });

        modelBuilder.Entity<Empresa>(entity =>
        {
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
                .HasConstraintName("empresa_id_estado_fkey");

            entity.HasOne(d => d.IdOrigenNavigation).WithMany(p => p.Empresas)
                .HasForeignKey(d => d.IdOrigen)
                .HasConstraintName("empresa_id_origen_fkey");
        });

        modelBuilder.Entity<EstadoCliente>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("estado_cliente_pkey");

            entity.ToTable("estado_cliente");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(50)
                .HasColumnName("descripcion");
        });

        modelBuilder.Entity<EstadoOportunidad>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("estado_oportunidad_pkey");

            entity.ToTable("estado_oportunidad");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(50)
                .HasColumnName("descripcion");
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
        });

        modelBuilder.Entity<HistorialEtapa>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("historial_etapas_pkey");

            entity.ToTable("historial_etapas");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Fecha)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("fecha");
            entity.Property(e => e.IdEtapaAnterior).HasColumnName("id_etapa_anterior");
            entity.Property(e => e.IdNuevaEtapa).HasColumnName("id_nueva_etapa");
            entity.Property(e => e.IdOportunidad).HasColumnName("id_oportunidad");
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario");
            entity.Property(e => e.Observacion).HasColumnName("observacion");

            entity.HasOne(d => d.IdEtapaAnteriorNavigation).WithMany(p => p.HistorialEtapaIdEtapaAnteriorNavigations)
                .HasForeignKey(d => d.IdEtapaAnterior)
                .HasConstraintName("historial_etapas_id_etapa_anterior_fkey");

            entity.HasOne(d => d.IdNuevaEtapaNavigation).WithMany(p => p.HistorialEtapaIdNuevaEtapaNavigations)
                .HasForeignKey(d => d.IdNuevaEtapa)
                .HasConstraintName("historial_etapas_id_nueva_etapa_fkey");

            entity.HasOne(d => d.IdOportunidadNavigation).WithMany(p => p.HistorialEtapas)
                .HasForeignKey(d => d.IdOportunidad)
                .HasConstraintName("historial_etapas_id_oportunidad_fkey");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany(p => p.HistorialEtapas)
                .HasForeignKey(d => d.IdUsuario)
                .HasConstraintName("historial_etapas_id_usuario_fkey");
        });

        modelBuilder.Entity<LogOportunidadCambio>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("log_oportunidad_cambio_pkey");

            entity.ToTable("log_oportunidad_cambio");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Campo)
                .HasMaxLength(100)
                .HasColumnName("campo");
            entity.Property(e => e.FechaHora)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("fecha_hora");
            entity.Property(e => e.IdOportunidad).HasColumnName("id_oportunidad");
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario");
            entity.Property(e => e.ValorAnterior).HasColumnName("valor_anterior");
            entity.Property(e => e.ValorNuevo).HasColumnName("valor_nuevo");

            entity.HasOne(d => d.IdOportunidadNavigation).WithMany(p => p.LogOportunidadCambios)
                .HasForeignKey(d => d.IdOportunidad)
                .HasConstraintName("log_oportunidad_cambio_id_oportunidad_fkey");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany(p => p.LogOportunidadCambios)
                .HasForeignKey(d => d.IdUsuario)
                .HasConstraintName("log_oportunidad_cambio_id_usuario_fkey");
        });

        modelBuilder.Entity<Modalidad>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("modalidad_pkey");

            entity.ToTable("modalidad");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(50)
                .HasColumnName("descripcion");
        });

        modelBuilder.Entity<MotivoRechazo>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("motivo_rechazo_pkey");

            entity.ToTable("motivo_rechazo");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(200)
                .HasColumnName("descripcion");
        });

        modelBuilder.Entity<NivelIngles>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("nivel_ingles_pkey");

            entity.ToTable("nivel_ingles");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(20)
                .HasColumnName("descripcion");
        });

        modelBuilder.Entity<Oportunidad>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("oportunidad_pkey");

            entity.ToTable("oportunidad");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.FechaCierre)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("fecha_cierre");
            entity.Property(e => e.FechaEstimadaCierre).HasColumnName("fecha_estimada_cierre");
            entity.Property(e => e.IdContacto).HasColumnName("id_contacto");
            entity.Property(e => e.IdEmpresa).HasColumnName("id_empresa");
            entity.Property(e => e.IdEstado).HasColumnName("id_estado");
            entity.Property(e => e.IdEtapa).HasColumnName("id_etapa");
            entity.Property(e => e.IdOrigen).HasColumnName("id_origen");
            entity.Property(e => e.IdServicio).HasColumnName("id_servicio");
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario");
            entity.Property(e => e.Observaciones).HasColumnName("observaciones");
            entity.Property(e => e.Titulo)
                .HasMaxLength(150)
                .HasColumnName("titulo");

            entity.HasOne(d => d.IdContactoNavigation).WithMany(p => p.Oportunidades)
                .HasForeignKey(d => d.IdContacto)
                .HasConstraintName("oportunidad_id_contacto_fkey");

            entity.HasOne(d => d.IdEmpresaNavigation).WithMany(p => p.Oportunidades)
                .HasForeignKey(d => d.IdEmpresa)
                .HasConstraintName("oportunidad_id_empresa_fkey");

            entity.HasOne(d => d.IdEstadoNavigation).WithMany(p => p.Oportunidades)
                .HasForeignKey(d => d.IdEstado)
                .HasConstraintName("oportunidad_id_estado_fkey");

            entity.HasOne(d => d.IdEtapaNavigation).WithMany(p => p.Oportunidades)
                .HasForeignKey(d => d.IdEtapa)
                .HasConstraintName("oportunidad_id_etapa_fkey");

            entity.HasOne(d => d.IdOrigenNavigation).WithMany(p => p.Oportunidades)
                .HasForeignKey(d => d.IdOrigen)
                .HasConstraintName("oportunidad_id_origen_fkey");

            entity.HasOne(d => d.IdServicioNavigation).WithMany(p => p.Oportunidades)
                .HasForeignKey(d => d.IdServicio)
                .HasConstraintName("oportunidad_id_servicio_fkey");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany(p => p.Oportunidades)
                .HasForeignKey(d => d.IdUsuario)
                .HasConstraintName("oportunidad_id_usuario_fkey");
        });

        modelBuilder.Entity<OportunidadItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("oportunidad_item_pkey");

            entity.ToTable("oportunidad_item");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Cantidad)
                .HasDefaultValue(1)
                .HasColumnName("cantidad");
            entity.Property(e => e.Descuento)
                .HasPrecision(10, 2)
                .HasDefaultValue(0m)
                .HasColumnName("descuento");
            entity.Property(e => e.IdOportunidad).HasColumnName("id_oportunidad");
            entity.Property(e => e.IdServicio).HasColumnName("id_servicio");
            entity.Property(e => e.PrecioUnitario)
                .HasPrecision(10, 2)
                .HasColumnName("precio_unitario");

            entity.HasOne(d => d.IdOportunidadNavigation).WithMany(p => p.OportunidadItems)
                .HasForeignKey(d => d.IdOportunidad)
                .HasConstraintName("oportunidad_item_id_oportunidad_fkey");

            entity.HasOne(d => d.IdServicioNavigation).WithMany(p => p.OportunidadItems)
                .HasForeignKey(d => d.IdServicio)
                .HasConstraintName("oportunidad_item_id_servicio_fkey");
        });

        modelBuilder.Entity<OrigenComercial>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("origen_comercial_pkey");

            entity.ToTable("origen_comercial");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(100)
                .HasColumnName("descripcion");
        });

        modelBuilder.Entity<Permiso>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("permiso_pkey");

            entity.ToTable("permiso");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(200)
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
                .HasConstraintName("permiso_rol_id_permiso_fkey");

            entity.HasOne(d => d.IdRolNavigation).WithMany(p => p.PermisoRoles)
                .HasForeignKey(d => d.IdRol)
                .HasConstraintName("permiso_rol_id_rol_fkey");
        });

        modelBuilder.Entity<Rol>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("rol_pkey");

            entity.ToTable("rol");

            entity.HasIndex(e => e.Nombre, "rol_nombre_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Descripcion)
                .HasMaxLength(200)
                .HasColumnName("descripcion");
            entity.Property(e => e.Nombre)
                .HasMaxLength(50)
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
            entity.Property(e => e.Nombre)
                .HasMaxLength(150)
                .HasColumnName("nombre");
            entity.Property(e => e.PrecioReferencia)
                .HasPrecision(10, 2)
                .HasColumnName("precio_referencia");

            entity.HasOne(d => d.IdModalidadNavigation).WithMany(p => p.Servicios)
                .HasForeignKey(d => d.IdModalidad)
                .HasConstraintName("servicio_id_modalidad_fkey");

            entity.HasOne(d => d.IdNivelNavigation).WithMany(p => p.Servicios)
                .HasForeignKey(d => d.IdNivel)
                .HasConstraintName("servicio_id_nivel_fkey");
        });

        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("usuario_pkey");

            entity.ToTable("usuario");

            entity.HasIndex(e => e.Correo, "usuario_correo_key").IsUnique();

            entity.HasIndex(e => e.Username, "usuario_username_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Activo)
                .HasDefaultValue(true)
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
                .HasMaxLength(255)
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
                .HasConstraintName("usuario_rol_id_rol_fkey");

            entity.HasOne(d => d.IdUsuarioNavigation).WithMany(p => p.UsuarioRoles)
                .HasForeignKey(d => d.IdUsuario)
                .HasConstraintName("usuario_rol_id_usuario_fkey");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
