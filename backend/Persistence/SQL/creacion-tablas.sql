-- Fluency CRM: creación del esquema actual (segunda entrega) y del usuario "admin".
-- Reemplaza al script de la primera entrega: ya no crea tablas anteriores ni usuarios de demostración.
-- Es la unión, en orden, de segunda-entrega-esquema.sql, segunda-entrega-catalogos.sql,
-- segunda-entrega-roles.sql, segunda-entrega-bonus.sql, segunda-entrega-bonus-roles.sql (bonus de academia:
-- alumnos, cursos, clases, talleres y rol Profesor) y segunda-entrega-embudos-base.sql (embudos "Clases de Inglés"
-- y "Talleres" con sus etapas), más el alta del administrador. Si cambia alguno de ellos,
-- actualizar este archivo (una prueba compara su contenido).
-- Para una base ya instalada que solo necesita el bonus: agregar-bonus-academia.sql; para sumar tipos de
-- servicio, modalidades y embudos base: agregar-tipos-servicio-embudos.sql.
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
CREATE TABLE tipo_servicio (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion varchar(100) NOT NULL CHECK (btrim(descripcion) <> ''),
    codigo varchar(20) UNIQUE CHECK (codigo IS NULL OR btrim(codigo) <> ''),
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
    id_tipo_servicio integer NOT NULL REFERENCES tipo_servicio(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    activo boolean NOT NULL DEFAULT true
);
CREATE INDEX ix_servicio_nivel ON servicio (id_nivel);
CREATE INDEX ix_servicio_modalidad ON servicio (id_modalidad);
CREATE INDEX ix_servicio_tipo ON servicio (id_tipo_servicio);
CREATE TABLE embudo (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL CHECK (btrim(nombre) <> ''),
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);
-- Admisión de servicios: tipos admitidos y, opcionalmente, una selección puntual de servicios de un tipo.
CREATE TABLE embudo_tipo_servicio (
    id_embudo integer NOT NULL REFERENCES embudo(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_tipo_servicio integer NOT NULL REFERENCES tipo_servicio(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    PRIMARY KEY (id_embudo, id_tipo_servicio)
);
CREATE INDEX ix_embudo_tipo_servicio_tipo ON embudo_tipo_servicio (id_tipo_servicio);
CREATE TABLE embudo_servicio (
    id_embudo integer NOT NULL REFERENCES embudo(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_servicio integer NOT NULL REFERENCES servicio(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    PRIMARY KEY (id_embudo, id_servicio)
);
CREATE INDEX ix_embudo_servicio_servicio ON embudo_servicio (id_servicio);
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
    id_servicio integer NOT NULL REFERENCES servicio(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
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
CREATE INDEX ix_oportunidad_servicio ON oportunidad (id_servicio);
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
       OR EXISTS (SELECT 1 FROM tipo_servicio)
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
VALUES ('Grupal Presencial'), ('Grupal Online'), ('Grupal Híbrido'), ('Particular Online'), ('Particular Presencial');
-- Los códigos identifican los tipos base (reglas de nivel, alumno y talleres); los tipos que agregue el
-- administrador no llevan código.
INSERT INTO tipo_servicio (descripcion, codigo)
VALUES ('Clases', 'CLASES'), ('Talleres', 'TALLERES');
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

-- ===== 4. Bonus de academia: esquema (segunda-entrega-bonus.sql) =====
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
    IF to_regclass('usuario') IS NULL OR to_regclass('contacto') IS NULL
       OR to_regclass('servicio') IS NULL OR to_regclass('nivel_ingles') IS NULL THEN
        RAISE EXCEPTION 'Falta el esquema de la segunda entrega.';
    END IF;
    IF to_regclass('alumno') IS NOT NULL OR to_regclass('curso') IS NOT NULL THEN
        RAISE EXCEPTION 'El esquema del bonus ya fue aplicado; se conserva su contenido.';
    END IF;
END $$;

-- Niveles de inglés con los que trabaja cada profesor (usuario con rol PROFESOR).
CREATE TABLE profesor_nivel (
    id_usuario integer NOT NULL REFERENCES usuario(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_nivel integer NOT NULL REFERENCES nivel_ingles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    PRIMARY KEY (id_usuario, id_nivel)
);
CREATE INDEX ix_profesor_nivel_nivel ON profesor_nivel (id_nivel);

CREATE TABLE curso (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL CHECK (btrim(nombre) <> ''),
    id_nivel integer NOT NULL REFERENCES nivel_ingles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_profesor integer NOT NULL REFERENCES usuario(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    fecha_creacion timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo boolean NOT NULL DEFAULT true
);
CREATE INDEX ix_curso_nivel ON curso (id_nivel);
CREATE INDEX ix_curso_profesor ON curso (id_profesor);

-- Alumno = contacto cuya oportunidad ganada era un servicio de tipo Clases. Sus datos personales viven en
-- contacto; un contacto es alumno una sola vez y pertenece a lo sumo a un curso.
CREATE TABLE alumno (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_contacto integer NOT NULL UNIQUE REFERENCES contacto(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_nivel integer NOT NULL REFERENCES nivel_ingles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_curso integer REFERENCES curso(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    fecha_alta timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo boolean NOT NULL DEFAULT true
);
CREATE INDEX ix_alumno_nivel ON alumno (id_nivel);
CREATE INDEX ix_alumno_curso ON alumno (id_curso);

CREATE TABLE clase (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_curso integer NOT NULL REFERENCES curso(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    titulo varchar(150) NOT NULL CHECK (btrim(titulo) <> ''),
    fecha date NOT NULL,
    hora_inicio time NOT NULL,
    hora_fin time NOT NULL,
    es_examen boolean NOT NULL DEFAULT false,
    temas_examen text,
    fecha_creacion timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_clase_horario CHECK (hora_fin > hora_inicio),
    CONSTRAINT ck_clase_temas CHECK (es_examen OR temas_examen IS NULL)
);
CREATE INDEX ix_clase_curso_fecha ON clase (id_curso, fecha);
CREATE INDEX ix_clase_fecha ON clase (fecha);

-- presente NULL = sin registrar; la nota solo se carga en exámenes (regla del servicio).
CREATE TABLE clase_alumno (
    id_clase integer NOT NULL REFERENCES clase(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_alumno integer NOT NULL REFERENCES alumno(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    presente boolean,
    nota numeric(4,2) CHECK (nota >= 0 AND nota <= 10),
    PRIMARY KEY (id_clase, id_alumno)
);
CREATE INDEX ix_clase_alumno_alumno ON clase_alumno (id_alumno);

CREATE TABLE taller (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_servicio integer NOT NULL REFERENCES servicio(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    titulo varchar(150) NOT NULL CHECK (btrim(titulo) <> ''),
    fecha date NOT NULL,
    hora_inicio time NOT NULL,
    hora_fin time NOT NULL,
    fecha_creacion timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_taller_horario CHECK (hora_fin > hora_inicio)
);
CREATE INDEX ix_taller_servicio ON taller (id_servicio);
CREATE INDEX ix_taller_fecha ON taller (fecha);

CREATE TABLE taller_inscripcion (
    id_taller integer NOT NULL REFERENCES taller(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_contacto integer NOT NULL REFERENCES contacto(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    PRIMARY KEY (id_taller, id_contacto)
);
CREATE INDEX ix_taller_inscripcion_contacto ON taller_inscripcion (id_contacto);

-- ===== 5. Bonus de academia: rol Profesor (segunda-entrega-bonus-roles.sql) =====
DO $$
BEGIN
    IF current_setting('fluency.target_database', true) IS DISTINCT FROM current_database()
       OR current_schema() IS NULL OR current_schema() = 'information_schema'
       OR current_schema() LIKE 'pg\_%' ESCAPE '\'
       OR current_setting('search_path') <> quote_ident(current_schema()) THEN
        RAISE EXCEPTION 'Debe declarar expresamente la base y el esquema destino verificados.';
    END IF;
    IF to_regclass('rol') IS NULL OR to_regclass('permiso') IS NULL OR to_regclass('permiso_rol') IS NULL
       OR to_regclass('alumno') IS NULL THEN
        RAISE EXCEPTION 'Faltan el esquema de identidad o el esquema del bonus.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rol WHERE nombre = 'ADMINISTRADOR') THEN
        RAISE EXCEPTION 'Ejecutar primero segunda-entrega-roles.sql.';
    END IF;
END $$;

INSERT INTO rol (nombre, descripcion) VALUES ('PROFESOR', 'Profesor') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO permiso (codigo, descripcion)
VALUES ('GestionarAcademia', 'Gestionar alumnos, cursos, clases y talleres dentro del alcance del rol')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO permiso_rol (id_rol, id_permiso)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE p.codigo = 'GestionarAcademia' AND r.nombre IN ('ADMINISTRADOR', 'PROFESOR')
ON CONFLICT DO NOTHING;

-- ===== 6. Embudos base (segunda-entrega-embudos-base.sql) =====
DO $$
BEGIN
    IF current_setting('fluency.target_database', true) IS DISTINCT FROM current_database()
       OR current_schema() IS NULL
       OR current_setting('search_path') <> quote_ident(current_schema()) THEN
        RAISE EXCEPTION 'Debe declarar expresamente la base y el esquema destino verificados.';
    END IF;
    IF to_regclass('embudo_tipo_servicio') IS NULL OR to_regclass('tipo_servicio') IS NULL THEN
        RAISE EXCEPTION 'Falta el esquema de la segunda entrega.';
    END IF;
    IF (SELECT count(*) FROM tipo_servicio WHERE codigo IN ('CLASES', 'TALLERES')) <> 2 THEN
        RAISE EXCEPTION 'Faltan los tipos de servicio base; ejecutar antes segunda-entrega-catalogos.sql.';
    END IF;
    IF EXISTS (SELECT 1 FROM embudo) OR EXISTS (SELECT 1 FROM etapa_comercial) THEN
        RAISE EXCEPTION 'Los embudos contienen datos previos; se conserva su contenido.';
    END IF;
END $$;

INSERT INTO embudo (nombre, descripcion)
VALUES ('Clases de Inglés', 'Oportunidades de servicios de tipo Clases.'),
       ('Talleres', 'Oportunidades de servicios de tipo Talleres.');
INSERT INTO embudo_tipo_servicio (id_embudo, id_tipo_servicio)
SELECT e.id, t.id FROM embudo e JOIN tipo_servicio t
  ON (e.nombre = 'Clases de Inglés' AND t.codigo = 'CLASES') OR (e.nombre = 'Talleres' AND t.codigo = 'TALLERES');
INSERT INTO etapa_comercial (id_embudo, id_estado, nombre, orden)
SELECT e.id, s.id, x.nombre, x.orden
FROM embudo e
CROSS JOIN (VALUES ('Consulta recibida', 'ABIERTA', 1), ('Necesidad relevada', 'ABIERTA', 2),
                   ('Nivel de inglés evaluado', 'ABIERTA', 3), ('Presupuesto enviado', 'ABIERTA', 4),
                   ('Ganada', 'GANADA', 5), ('Perdida', 'PERDIDA', 6)) AS x(nombre, codigo, orden)
JOIN estado_oportunidad s ON s.codigo = x.codigo;

-- ===== 7. Usuario administrador inicial =====
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
