using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "actividad",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    descripcion = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("actividad_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "estado_cliente",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    descripcion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("estado_cliente_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "estado_oportunidad",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    descripcion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("estado_oportunidad_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "etapa_comercial",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("etapa_comercial_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "modalidad",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    descripcion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("modalidad_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "motivo_rechazo",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    descripcion = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("motivo_rechazo_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "nivel_ingles",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    descripcion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("nivel_ingles_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "origen_comercial",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    descripcion = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("origen_comercial_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "permiso",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    descripcion = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("permiso_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "rol",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    descripcion = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("rol_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "usuario",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    apellido = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    correo = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("usuario_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "servicio",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    precio_referencia = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    duracion_horas = table.Column<int>(type: "integer", nullable: true),
                    id_nivel = table.Column<int>(type: "integer", nullable: true),
                    id_modalidad = table.Column<int>(type: "integer", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: true, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("servicio_pkey", x => x.id);
                    table.ForeignKey(
                        name: "servicio_id_modalidad_fkey",
                        column: x => x.id_modalidad,
                        principalTable: "modalidad",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "servicio_id_nivel_fkey",
                        column: x => x.id_nivel,
                        principalTable: "nivel_ingles",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "empresa",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    razon_social = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    cuit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    industria = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    correo = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    telefono = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    direccion = table.Column<string>(type: "text", nullable: true),
                    id_estado = table.Column<int>(type: "integer", nullable: true),
                    id_origen = table.Column<int>(type: "integer", nullable: true),
                    observaciones = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("empresa_pkey", x => x.id);
                    table.ForeignKey(
                        name: "empresa_id_estado_fkey",
                        column: x => x.id_estado,
                        principalTable: "estado_cliente",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "empresa_id_origen_fkey",
                        column: x => x.id_origen,
                        principalTable: "origen_comercial",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "permiso_rol",
                columns: table => new
                {
                    id_rol = table.Column<int>(type: "integer", nullable: false),
                    id_permiso = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("permiso_rol_pkey", x => new { x.id_rol, x.id_permiso });
                    table.ForeignKey(
                        name: "permiso_rol_id_permiso_fkey",
                        column: x => x.id_permiso,
                        principalTable: "permiso",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "permiso_rol_id_rol_fkey",
                        column: x => x.id_rol,
                        principalTable: "rol",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "usuario_rol",
                columns: table => new
                {
                    id_usuario = table.Column<int>(type: "integer", nullable: false),
                    id_rol = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("usuario_rol_pkey", x => new { x.id_usuario, x.id_rol });
                    table.ForeignKey(
                        name: "usuario_rol_id_rol_fkey",
                        column: x => x.id_rol,
                        principalTable: "rol",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "usuario_rol_id_usuario_fkey",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "contacto",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    apellido = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    documento = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    cargo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    correo = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    telefono = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    id_estado = table.Column<int>(type: "integer", nullable: true),
                    id_origen = table.Column<int>(type: "integer", nullable: true),
                    id_empresa = table.Column<int>(type: "integer", nullable: true),
                    observaciones = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("contacto_pkey", x => x.id);
                    table.ForeignKey(
                        name: "contacto_id_empresa_fkey",
                        column: x => x.id_empresa,
                        principalTable: "empresa",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "contacto_id_estado_fkey",
                        column: x => x.id_estado,
                        principalTable: "estado_cliente",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "contacto_id_origen_fkey",
                        column: x => x.id_origen,
                        principalTable: "origen_comercial",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "oportunidad",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    titulo = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    id_usuario = table.Column<int>(type: "integer", nullable: true),
                    id_empresa = table.Column<int>(type: "integer", nullable: true),
                    id_contacto = table.Column<int>(type: "integer", nullable: true),
                    id_servicio = table.Column<int>(type: "integer", nullable: true),
                    id_etapa = table.Column<int>(type: "integer", nullable: true),
                    fecha_estimada_cierre = table.Column<DateOnly>(type: "date", nullable: true),
                    fecha_cierre = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    id_origen = table.Column<int>(type: "integer", nullable: true),
                    id_estado = table.Column<int>(type: "integer", nullable: true),
                    observaciones = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("oportunidad_pkey", x => x.id);
                    table.ForeignKey(
                        name: "oportunidad_id_contacto_fkey",
                        column: x => x.id_contacto,
                        principalTable: "contacto",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "oportunidad_id_empresa_fkey",
                        column: x => x.id_empresa,
                        principalTable: "empresa",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "oportunidad_id_estado_fkey",
                        column: x => x.id_estado,
                        principalTable: "estado_cliente",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "oportunidad_id_etapa_fkey",
                        column: x => x.id_etapa,
                        principalTable: "etapa_comercial",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "oportunidad_id_origen_fkey",
                        column: x => x.id_origen,
                        principalTable: "origen_comercial",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "oportunidad_id_servicio_fkey",
                        column: x => x.id_servicio,
                        principalTable: "servicio",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "oportunidad_id_usuario_fkey",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "actividad_oportunidad",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_tipo_actividad = table.Column<int>(type: "integer", nullable: true),
                    id_usuario = table.Column<int>(type: "integer", nullable: true),
                    id_empresa = table.Column<int>(type: "integer", nullable: true),
                    id_contacto = table.Column<int>(type: "integer", nullable: true),
                    id_oportunidad = table.Column<int>(type: "integer", nullable: true),
                    fecha_hora = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    resultado = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("actividad_oportunidad_pkey", x => x.id);
                    table.ForeignKey(
                        name: "actividad_oportunidad_id_contacto_fkey",
                        column: x => x.id_contacto,
                        principalTable: "contacto",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "actividad_oportunidad_id_empresa_fkey",
                        column: x => x.id_empresa,
                        principalTable: "empresa",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "actividad_oportunidad_id_oportunidad_fkey",
                        column: x => x.id_oportunidad,
                        principalTable: "oportunidad",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "actividad_oportunidad_id_tipo_actividad_fkey",
                        column: x => x.id_tipo_actividad,
                        principalTable: "actividad",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "actividad_oportunidad_id_usuario_fkey",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "historial_etapas",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_oportunidad = table.Column<int>(type: "integer", nullable: true),
                    id_etapa_anterior = table.Column<int>(type: "integer", nullable: true),
                    id_nueva_etapa = table.Column<int>(type: "integer", nullable: true),
                    fecha = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    id_usuario = table.Column<int>(type: "integer", nullable: true),
                    observacion = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("historial_etapas_pkey", x => x.id);
                    table.ForeignKey(
                        name: "historial_etapas_id_etapa_anterior_fkey",
                        column: x => x.id_etapa_anterior,
                        principalTable: "etapa_comercial",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "historial_etapas_id_nueva_etapa_fkey",
                        column: x => x.id_nueva_etapa,
                        principalTable: "etapa_comercial",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "historial_etapas_id_oportunidad_fkey",
                        column: x => x.id_oportunidad,
                        principalTable: "oportunidad",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "historial_etapas_id_usuario_fkey",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "log_oportunidad_cambio",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_oportunidad = table.Column<int>(type: "integer", nullable: true),
                    id_usuario = table.Column<int>(type: "integer", nullable: true),
                    campo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    valor_anterior = table.Column<string>(type: "text", nullable: true),
                    valor_nuevo = table.Column<string>(type: "text", nullable: true),
                    fecha_hora = table.Column<DateTime>(type: "timestamp without time zone", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("log_oportunidad_cambio_pkey", x => x.id);
                    table.ForeignKey(
                        name: "log_oportunidad_cambio_id_oportunidad_fkey",
                        column: x => x.id_oportunidad,
                        principalTable: "oportunidad",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "log_oportunidad_cambio_id_usuario_fkey",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "oportunidad_item",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_oportunidad = table.Column<int>(type: "integer", nullable: true),
                    id_servicio = table.Column<int>(type: "integer", nullable: true),
                    cantidad = table.Column<int>(type: "integer", nullable: true, defaultValue: 1),
                    precio_unitario = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    descuento = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true, defaultValue: 0m)
                },
                constraints: table =>
                {
                    table.PrimaryKey("oportunidad_item_pkey", x => x.id);
                    table.ForeignKey(
                        name: "oportunidad_item_id_oportunidad_fkey",
                        column: x => x.id_oportunidad,
                        principalTable: "oportunidad",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "oportunidad_item_id_servicio_fkey",
                        column: x => x.id_servicio,
                        principalTable: "servicio",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_actividad_oportunidad_id_contacto",
                table: "actividad_oportunidad",
                column: "id_contacto");

            migrationBuilder.CreateIndex(
                name: "IX_actividad_oportunidad_id_empresa",
                table: "actividad_oportunidad",
                column: "id_empresa");

            migrationBuilder.CreateIndex(
                name: "IX_actividad_oportunidad_id_oportunidad",
                table: "actividad_oportunidad",
                column: "id_oportunidad");

            migrationBuilder.CreateIndex(
                name: "IX_actividad_oportunidad_id_tipo_actividad",
                table: "actividad_oportunidad",
                column: "id_tipo_actividad");

            migrationBuilder.CreateIndex(
                name: "IX_actividad_oportunidad_id_usuario",
                table: "actividad_oportunidad",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_contacto_id_empresa",
                table: "contacto",
                column: "id_empresa");

            migrationBuilder.CreateIndex(
                name: "IX_contacto_id_estado",
                table: "contacto",
                column: "id_estado");

            migrationBuilder.CreateIndex(
                name: "IX_contacto_id_origen",
                table: "contacto",
                column: "id_origen");

            migrationBuilder.CreateIndex(
                name: "IX_empresa_id_estado",
                table: "empresa",
                column: "id_estado");

            migrationBuilder.CreateIndex(
                name: "IX_empresa_id_origen",
                table: "empresa",
                column: "id_origen");

            migrationBuilder.CreateIndex(
                name: "IX_historial_etapas_id_etapa_anterior",
                table: "historial_etapas",
                column: "id_etapa_anterior");

            migrationBuilder.CreateIndex(
                name: "IX_historial_etapas_id_nueva_etapa",
                table: "historial_etapas",
                column: "id_nueva_etapa");

            migrationBuilder.CreateIndex(
                name: "IX_historial_etapas_id_oportunidad",
                table: "historial_etapas",
                column: "id_oportunidad");

            migrationBuilder.CreateIndex(
                name: "IX_historial_etapas_id_usuario",
                table: "historial_etapas",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_log_oportunidad_cambio_id_oportunidad",
                table: "log_oportunidad_cambio",
                column: "id_oportunidad");

            migrationBuilder.CreateIndex(
                name: "IX_log_oportunidad_cambio_id_usuario",
                table: "log_oportunidad_cambio",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_oportunidad_id_contacto",
                table: "oportunidad",
                column: "id_contacto");

            migrationBuilder.CreateIndex(
                name: "IX_oportunidad_id_empresa",
                table: "oportunidad",
                column: "id_empresa");

            migrationBuilder.CreateIndex(
                name: "IX_oportunidad_id_estado",
                table: "oportunidad",
                column: "id_estado");

            migrationBuilder.CreateIndex(
                name: "IX_oportunidad_id_etapa",
                table: "oportunidad",
                column: "id_etapa");

            migrationBuilder.CreateIndex(
                name: "IX_oportunidad_id_origen",
                table: "oportunidad",
                column: "id_origen");

            migrationBuilder.CreateIndex(
                name: "IX_oportunidad_id_servicio",
                table: "oportunidad",
                column: "id_servicio");

            migrationBuilder.CreateIndex(
                name: "IX_oportunidad_id_usuario",
                table: "oportunidad",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_oportunidad_item_id_oportunidad",
                table: "oportunidad_item",
                column: "id_oportunidad");

            migrationBuilder.CreateIndex(
                name: "IX_oportunidad_item_id_servicio",
                table: "oportunidad_item",
                column: "id_servicio");

            migrationBuilder.CreateIndex(
                name: "IX_permiso_rol_id_permiso",
                table: "permiso_rol",
                column: "id_permiso");

            migrationBuilder.CreateIndex(
                name: "rol_nombre_key",
                table: "rol",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_servicio_id_modalidad",
                table: "servicio",
                column: "id_modalidad");

            migrationBuilder.CreateIndex(
                name: "IX_servicio_id_nivel",
                table: "servicio",
                column: "id_nivel");

            migrationBuilder.CreateIndex(
                name: "usuario_correo_key",
                table: "usuario",
                column: "correo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "usuario_username_key",
                table: "usuario",
                column: "username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_usuario_rol_id_rol",
                table: "usuario_rol",
                column: "id_rol");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "actividad_oportunidad");

            migrationBuilder.DropTable(
                name: "estado_oportunidad");

            migrationBuilder.DropTable(
                name: "historial_etapas");

            migrationBuilder.DropTable(
                name: "log_oportunidad_cambio");

            migrationBuilder.DropTable(
                name: "motivo_rechazo");

            migrationBuilder.DropTable(
                name: "oportunidad_item");

            migrationBuilder.DropTable(
                name: "permiso_rol");

            migrationBuilder.DropTable(
                name: "usuario_rol");

            migrationBuilder.DropTable(
                name: "actividad");

            migrationBuilder.DropTable(
                name: "oportunidad");

            migrationBuilder.DropTable(
                name: "permiso");

            migrationBuilder.DropTable(
                name: "rol");

            migrationBuilder.DropTable(
                name: "contacto");

            migrationBuilder.DropTable(
                name: "etapa_comercial");

            migrationBuilder.DropTable(
                name: "servicio");

            migrationBuilder.DropTable(
                name: "usuario");

            migrationBuilder.DropTable(
                name: "empresa");

            migrationBuilder.DropTable(
                name: "modalidad");

            migrationBuilder.DropTable(
                name: "nivel_ingles");

            migrationBuilder.DropTable(
                name: "estado_cliente");

            migrationBuilder.DropTable(
                name: "origen_comercial");
        }
    }
}
