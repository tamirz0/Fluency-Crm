-- Fluency CRM: creación del esquema actual (segunda entrega) y del usuario "admin".
-- Reemplaza al script de la primera entrega: ya no crea tablas anteriores ni usuarios de demostración.
-- Es la unión, en orden, de segunda-entrega-esquema.sql, segunda-entrega-catalogos.sql y
-- segunda-entrega-roles.sql, más el alta del administrador. Si cambia alguno de ellos, actualizar este archivo.
--
-- Uso (pgAdmin o psql), UNA sola vez sobre una base vacía:
--   1. Crear la base (por ejemplo FluencyLocalDB) y abrir este archivo conectado a ella.
--   2. Si la base se llama distinto, cambiar el nombre en la línea set_config de abajo.
--   3. Ejecutar completo. Si algo falla no queda nada a medias (una única transacción).
--      Con psql: psql -v ON_ERROR_STOP=1 -d <base> -f creacion-tablas.sql
-- No se puede repetir: rechaza el esquema si ya contiene objetos y no borra nada.

BEGIN;
SET LOCAL search_path = public;
SELECT set_config('fluency.target_database', 'postgres', true);

-- ===== 1. Esquema (segunda-entrega-esquema.sql) =====
DO $$
BEGIN
    IF current_setting('fluency.target_database', true) IS DISTINCT FROM current_database() THEN
        RAISE EXCEPTION 'Debe declarar expresamente la base destino verificada en fluency.target_database.';
    END IF;
    IF current_schema() IS NULL OR current_schema() IN ('information_schema')
       OR current_schema() LIKE 'pg\_%' ESCAPE '\'
       OR current_setting('search_path') <> quote_ident(current_schema()) THEN
        RAISE EXCEPTION 'Se requiere un único esquema destino explícito y disponible.';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relnamespace = current_schema()::regnamespace) THEN
        RAISE EXCEPTION 'El esquema destino contiene objetos previos; se conserva su contenido.';
    END IF;
END $$;

CREATE TABLE usuario (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL CHECK (btrim(nombre) <> ''),
    apellido varchar(100) NOT NULL CHECK (btrim(apellido) <> ''),
    correo varchar(150) NOT NULL CHECK (btrim(correo) <> ''),
    username varchar(50) NOT NULL CHECK (btrim(username) <> ''),
    password_hash varchar(150) NOT NULL CHECK (btrim(password_hash) <> ''),
    activo boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_usuario_username ON usuario (lower(btrim(username)));
CREATE UNIQUE INDEX ux_usuario_correo ON usuario (lower(btrim(correo)));

CREATE TABLE rol (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL UNIQUE CHECK (btrim(nombre) <> ''),
    descripcion text
);
CREATE TABLE permiso (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo varchar(100) NOT NULL UNIQUE CHECK (btrim(codigo) <> ''),
    descripcion text
);
CREATE TABLE usuario_rol (
    id_usuario integer NOT NULL REFERENCES usuario(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_rol integer NOT NULL REFERENCES rol(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    PRIMARY KEY (id_usuario, id_rol)
);
CREATE INDEX ix_usuario_rol_rol ON usuario_rol (id_rol);
CREATE TABLE permiso_rol (
    id_rol integer NOT NULL REFERENCES rol(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_permiso integer NOT NULL REFERENCES permiso(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    PRIMARY KEY (id_rol, id_permiso)
);
CREATE INDEX ix_permiso_rol_permiso ON permiso_rol (id_permiso);

CREATE TABLE estado_cliente (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion varchar(100) NOT NULL CHECK (btrim(descripcion) <> ''),
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE origen_comercial (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion varchar(100) NOT NULL CHECK (btrim(descripcion) <> ''),
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE empresa (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    razon_social varchar(150) NOT NULL CHECK (btrim(razon_social) <> ''),
    cuit varchar(20),
    industria varchar(100),
    correo varchar(150),
    telefono varchar(50),
    direccion text,
    id_estado integer NOT NULL REFERENCES estado_cliente(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_origen integer REFERENCES origen_comercial(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_responsable integer NOT NULL REFERENCES usuario(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    fecha_creacion timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observaciones text,
    activo boolean NOT NULL DEFAULT true
);
CREATE INDEX ix_empresa_estado ON empresa (id_estado);
CREATE INDEX ix_empresa_origen ON empresa (id_origen);
CREATE INDEX ix_empresa_responsable ON empresa (id_responsable);
CREATE TABLE contacto (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL CHECK (btrim(nombre) <> ''),
    apellido varchar(100) NOT NULL CHECK (btrim(apellido) <> ''),
    documento varchar(20),
    cargo varchar(100),
    correo varchar(150) NOT NULL CHECK (btrim(correo) <> ''),
    telefono varchar(50),
    id_empresa integer REFERENCES empresa(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_estado integer NOT NULL REFERENCES estado_cliente(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_origen integer REFERENCES origen_comercial(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_responsable integer NOT NULL REFERENCES usuario(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    fecha_creacion timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observaciones text,
    activo boolean NOT NULL DEFAULT true
);
CREATE INDEX ix_contacto_empresa ON contacto (id_empresa);
CREATE INDEX ix_contacto_estado ON contacto (id_estado);
CREATE INDEX ix_contacto_origen ON contacto (id_origen);
CREATE INDEX ix_contacto_responsable ON contacto (id_responsable);

CREATE TABLE nivel_ingles (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion varchar(100) NOT NULL CHECK (btrim(descripcion) <> ''),
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE modalidad (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion varchar(100) NOT NULL CHECK (btrim(descripcion) <> ''),
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE servicio (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(150) NOT NULL CHECK (btrim(nombre) <> ''),
    descripcion text,
    precio_referencia numeric(12,2) NOT NULL CHECK (precio_referencia >= 0 AND precio_referencia <> 'NaN'::numeric),
    duracion_horas integer,
    id_nivel integer REFERENCES nivel_ingles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_modalidad integer REFERENCES modalidad(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    activo boolean NOT NULL DEFAULT true
);
CREATE INDEX ix_servicio_nivel ON servicio (id_nivel);
CREATE INDEX ix_servicio_modalidad ON servicio (id_modalidad);
CREATE TABLE embudo (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL CHECK (btrim(nombre) <> ''),
    descripcion text,
    id_servicio integer NOT NULL REFERENCES servicio(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    activo boolean NOT NULL DEFAULT true
);
CREATE INDEX ix_embudo_servicio ON embudo (id_servicio);
CREATE TABLE estado_oportunidad (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo varchar(100) NOT NULL UNIQUE CHECK (codigo IN ('ABIERTA', 'GANADA', 'PERDIDA')),
    descripcion varchar(100) NOT NULL CHECK (btrim(descripcion) <> '')
);
CREATE TABLE etapa_comercial (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_embudo integer NOT NULL REFERENCES embudo(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_estado integer NOT NULL REFERENCES estado_oportunidad(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    nombre varchar(100) NOT NULL CHECK (btrim(nombre) <> ''),
    descripcion text,
    orden integer NOT NULL,
    activo boolean NOT NULL DEFAULT true
);
CREATE INDEX ix_etapa_comercial_estado ON etapa_comercial (id_estado);
CREATE UNIQUE INDEX ux_etapa_embudo_orden_activo ON etapa_comercial (id_embudo, orden) WHERE activo;

-- Los códigos son la identidad semántica; no se fija un ID de catálogo en UI.
-- El predicado solo consulta columnas de etapa_comercial, nunca otra tabla.
INSERT INTO estado_oportunidad (codigo, descripcion)
VALUES ('ABIERTA', 'Abierta'), ('GANADA', 'Ganada'), ('PERDIDA', 'Perdida');
DO $$
DECLARE
    ganada integer;
    perdida integer;
BEGIN
    SELECT id INTO STRICT ganada FROM estado_oportunidad WHERE codigo = 'GANADA';
    SELECT id INTO STRICT perdida FROM estado_oportunidad WHERE codigo = 'PERDIDA';
    EXECUTE format('CREATE UNIQUE INDEX ux_etapa_embudo_final ON etapa_comercial (id_embudo, id_estado) WHERE id_estado IN (%s, %s)', ganada, perdida);
END $$;

CREATE TABLE motivo_perdida (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion varchar(100) NOT NULL CHECK (btrim(descripcion) <> ''),
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE oportunidad (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo varchar(100) CHECK (titulo IS NULL OR btrim(titulo) <> ''),
    id_responsable integer NOT NULL REFERENCES usuario(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_empresa integer REFERENCES empresa(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_contacto integer REFERENCES contacto(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_etapa integer NOT NULL REFERENCES etapa_comercial(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_origen integer REFERENCES origen_comercial(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    valor numeric(12,2) NOT NULL CHECK (valor >= 0 AND valor <> 'NaN'::numeric),
    fecha_creacion timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_estimada_cierre date,
    fecha_cierre timestamptz,
    id_motivo_perdida integer REFERENCES motivo_perdida(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    objetivo_aprendizaje text,
    cantidad_participantes integer CHECK (cantidad_participantes > 0),
    disponibilidad_horaria text,
    observaciones text,
    activo boolean NOT NULL DEFAULT true,
    CONSTRAINT ck_oportunidad_cliente CHECK (id_empresa IS NOT NULL OR id_contacto IS NOT NULL)
);
CREATE INDEX ix_oportunidad_responsable ON oportunidad (id_responsable);
CREATE INDEX ix_oportunidad_empresa ON oportunidad (id_empresa);
CREATE INDEX ix_oportunidad_contacto ON oportunidad (id_contacto);
CREATE INDEX ix_oportunidad_etapa ON oportunidad (id_etapa);
CREATE INDEX ix_oportunidad_origen ON oportunidad (id_origen);
CREATE INDEX ix_oportunidad_motivo ON oportunidad (id_motivo_perdida);
CREATE TABLE historial_etapas (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_oportunidad integer NOT NULL REFERENCES oportunidad(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_etapa_anterior integer REFERENCES etapa_comercial(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_nueva_etapa integer NOT NULL REFERENCES etapa_comercial(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    fecha_hora timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario integer NOT NULL REFERENCES usuario(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    observacion text
);
CREATE INDEX ix_historial_oportunidad_fecha ON historial_etapas (id_oportunidad, fecha_hora, id);
CREATE INDEX ix_historial_etapa_anterior ON historial_etapas (id_etapa_anterior);
CREATE INDEX ix_historial_nueva_etapa ON historial_etapas (id_nueva_etapa);
CREATE INDEX ix_historial_usuario ON historial_etapas (id_usuario);

CREATE TABLE tipo_actividad (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL UNIQUE CHECK (btrim(nombre) <> ''),
    activo boolean NOT NULL DEFAULT true
);
CREATE TABLE actividad (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_tipo integer NOT NULL REFERENCES tipo_actividad(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_usuario integer NOT NULL REFERENCES usuario(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_empresa integer REFERENCES empresa(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_contacto integer REFERENCES contacto(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_oportunidad integer REFERENCES oportunidad(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    fecha_hora timestamptz NOT NULL,
    fecha_registro timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descripcion text NOT NULL CHECK (btrim(descripcion) <> ''),
    resultado text,
    activo boolean NOT NULL DEFAULT true,
    CONSTRAINT ck_actividad_cliente CHECK (id_empresa IS NOT NULL OR id_contacto IS NOT NULL)
);
CREATE INDEX ix_actividad_tipo ON actividad (id_tipo);
CREATE INDEX ix_actividad_usuario ON actividad (id_usuario);
CREATE INDEX ix_actividad_empresa_fecha ON actividad (id_empresa, fecha_hora, id);
CREATE INDEX ix_actividad_contacto_fecha ON actividad (id_contacto, fecha_hora, id);
CREATE INDEX ix_actividad_oportunidad_fecha ON actividad (id_oportunidad, fecha_hora, id);

-- Las reglas entre tablas (finales permanentes, exactamente dos finales por alta
-- de embudo, cierre/reapertura e historial atómico, disponibilidad y permisos)
-- se implementan en los servicios de sus tareas, no mediante triggers/DDL al iniciar.

-- ===== 2. Catálogos (segunda-entrega-catalogos.sql) =====
DO $$
BEGIN
    IF current_setting('fluency.target_database', true) IS DISTINCT FROM current_database()
       OR current_schema() IS NULL
       OR current_setting('search_path') <> quote_ident(current_schema()) THEN
        RAISE EXCEPTION 'Debe declarar expresamente la base y el esquema destino verificados.';
    END IF;
    IF EXISTS (SELECT 1 FROM estado_cliente)
       OR EXISTS (SELECT 1 FROM origen_comercial)
       OR EXISTS (SELECT 1 FROM nivel_ingles)
       OR EXISTS (SELECT 1 FROM modalidad)
       OR EXISTS (SELECT 1 FROM motivo_perdida)
       OR EXISTS (SELECT 1 FROM tipo_actividad) THEN
        RAISE EXCEPTION 'Los catálogos contienen datos previos; se conserva su contenido.';
    END IF;
END $$;

INSERT INTO estado_cliente (descripcion)
VALUES ('Potencial'), ('Cliente'), ('Inactivo'), ('No contactar');
INSERT INTO origen_comercial (descripcion)
VALUES ('Sitio Web'), ('Instagram'), ('Recomendación');
INSERT INTO nivel_ingles (descripcion)
VALUES ('A1'), ('A2'), ('B1'), ('B2'), ('C1'), ('C2');
INSERT INTO modalidad (descripcion)
VALUES ('Grupal Online'), ('Individual 1-to-1'), ('In-Company');
INSERT INTO motivo_perdida (descripcion)
VALUES ('Presupuesto'), ('Horarios incompatibles'), ('Sin respuesta'), ('Otro');
INSERT INTO tipo_actividad (nombre)
VALUES ('Llamada'), ('Correo electrónico'), ('Mensaje'), ('Reunión presencial'),
       ('Reunión virtual'), ('Demostración'), ('Envío de propuesta'), ('Nota interna'), ('Otro');

-- ===== 3. Roles y permisos (segunda-entrega-roles.sql) =====
DO $$
BEGIN
    IF current_setting('fluency.target_database', true) IS DISTINCT FROM current_database()
       OR current_schema() IS NULL OR current_schema() = 'information_schema'
       OR current_schema() LIKE 'pg\_%' ESCAPE '\'
       OR current_setting('search_path') <> quote_ident(current_schema()) THEN
        RAISE EXCEPTION 'Debe declarar expresamente la base y el esquema destino verificados.';
    END IF;
    IF to_regclass('usuario') IS NULL OR to_regclass('rol') IS NULL
       OR to_regclass('permiso') IS NULL OR to_regclass('usuario_rol') IS NULL
       OR to_regclass('permiso_rol') IS NULL THEN
        RAISE EXCEPTION 'Falta preparar el esquema de identidad de T04.';
    END IF;
END $$;

-- Serializa inicializaciones explícitas concurrentes antes de validar/escribir.
LOCK TABLE usuario, rol, permiso, usuario_rol, permiso_rol IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM usuario) OR EXISTS (SELECT 1 FROM rol)
       OR EXISTS (SELECT 1 FROM permiso) OR EXISTS (SELECT 1 FROM usuario_rol)
       OR EXISTS (SELECT 1 FROM permiso_rol) THEN
        RAISE EXCEPTION 'La identidad contiene datos previos; se conserva su contenido sin correcciones automáticas.';
    END IF;
END $$;

-- nombre guarda el código estable del rol; descripcion es su etiqueta legible.
INSERT INTO rol (nombre, descripcion) VALUES
    ('ADMINISTRADOR', 'Administrador'),
    ('RESPONSABLE_COMERCIAL', 'Responsable comercial'),
    ('VENDEDOR', 'Vendedor');
INSERT INTO permiso (codigo, descripcion) VALUES
    ('ConsultarComercial', 'Consultar clientes, oportunidades, actividades e historiales'),
    ('GestionarClientes', 'Crear, modificar y dar de baja empresas y contactos'),
    ('GestionarOportunidad', 'Gestionar oportunidades dentro del alcance del rol'),
    ('GestionarActividad', 'Gestionar actividades dentro del alcance de su contexto comercial'),
    ('ReabrirOportunidad', 'Reabrir oportunidades cerradas con justificación'),
    ('AdministrarUsuarios', 'Administrar cuentas y sus roles asignados'),
    ('AdministrarConfiguracion', 'Administrar configuración comercial');

-- Lectura/clientes compartidos. Oportunidades y actividades mantienen el alcance
-- propio del vendedor; un rol superior prevalece en la unión de roles.
INSERT INTO permiso_rol (id_rol, id_permiso)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE p.codigo IN ('ConsultarComercial', 'GestionarClientes', 'GestionarOportunidad', 'GestionarActividad')
   OR (p.codigo = 'ReabrirOportunidad' AND r.nombre IN ('ADMINISTRADOR', 'RESPONSABLE_COMERCIAL'))
   OR (r.nombre = 'ADMINISTRADOR' AND p.codigo IN ('AdministrarUsuarios', 'AdministrarConfiguracion'));

-- ===== 4. Usuario administrador inicial =====
-- Usuario "admin" con el hash BCrypt (costo 12) acordado; la contraseña en claro no
-- se guarda en el repositorio. Nombre, apellido y correo son datos de arranque que
-- puede editar el propio administrador desde la pantalla de usuarios.
INSERT INTO usuario (nombre, apellido, correo, username, password_hash)
VALUES ('Administrador', 'Sistema', 'admin@fluency.local', 'admin',
        '$2a$12$RfsCK6PyFNsUTQ5LeUhSpu.fuRHelIHDoTVvJgtOyQ8.h2EPBjoam');
INSERT INTO usuario_rol (id_usuario, id_rol)
SELECT u.id, r.id FROM usuario u CROSS JOIN rol r
WHERE u.username = 'admin' AND r.nombre = 'ADMINISTRADOR';

COMMIT;
