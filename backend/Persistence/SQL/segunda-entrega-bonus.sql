-- Bonus de academia: ejecutar DESPUÉS de segunda-entrega-esquema.sql y segunda-entrega-catalogos.sql
-- (en una base nueva o ya instalada) y ANTES o DESPUÉS de segunda-entrega-bonus-roles.sql, en UNA
-- transacción externa (NpgsqlTransaction o psql -1 con ON_ERROR_STOP), con el mismo protocolo que el
-- esquema base:
-- SET LOCAL search_path = public; -- o el esquema GUID exclusivo del fixture
-- SELECT set_config('fluency.target_database', '<base destino verificada>', true);
-- Aditivo: no modifica ni borra datos existentes y se rechaza si ya fue aplicado. No ejecutar desde el
-- arranque de la API. En producción lo aplica el operador, con copia de seguridad previa.

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

-- Un servicio de taller es de fecha única y no crea alumnos al ganarse.
ALTER TABLE servicio ADD COLUMN es_taller boolean NOT NULL DEFAULT false;

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

-- Alumno = contacto cuya oportunidad ganada era un servicio con nivel. Sus datos personales viven en
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
