-- Fluency CRM: agregar el bonus de academia (alumnos, cursos, clases, talleres y rol Profesor)
-- a una base YA instalada con el esquema de la segunda entrega.
--
-- Para pegar y ejecutar COMPLETO en la consola SQL (Supabase, pgAdmin o psql). No hay que editar nada.
--   * Aditivo: no borra ni modifica datos existentes.
--   * Repetible: se puede ejecutar más de una vez; lo que ya existe se conserva.
--   * Una sola transacción: si algo falla no queda nada a medias.
--   * Para una base NUEVA no hace falta: creacion-tablas.sql ya incluye todo esto.
--
-- Antes de producción: hacer una copia de seguridad o confirmar el punto de restauración.
-- Después: desplegar el backend y el frontend nuevos (el backend sin estas tablas falla).
-- Equivale a segunda-entrega-bonus.sql + segunda-entrega-bonus-roles.sql, sin sus guardas de destino.

BEGIN;

DO $$
BEGIN
    IF to_regclass('usuario') IS NULL OR to_regclass('contacto') IS NULL OR to_regclass('servicio') IS NULL
       OR to_regclass('nivel_ingles') IS NULL OR to_regclass('rol') IS NULL OR to_regclass('permiso') IS NULL
       OR to_regclass('permiso_rol') IS NULL THEN
        RAISE EXCEPTION 'Falta el esquema base de la segunda entrega: ejecutar este script sobre la base de Fluency.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM rol WHERE nombre = 'ADMINISTRADOR') THEN
        RAISE EXCEPTION 'Faltan los roles base: este script se ejecuta después de la instalación inicial.';
    END IF;
END $$;

-- Un servicio de taller es de fecha única y no crea alumnos al ganarse.
ALTER TABLE servicio ADD COLUMN IF NOT EXISTS es_taller boolean NOT NULL DEFAULT false;

-- Niveles de inglés con los que trabaja cada profesor (usuario con rol PROFESOR).
CREATE TABLE IF NOT EXISTS profesor_nivel (
    id_usuario integer NOT NULL REFERENCES usuario(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_nivel integer NOT NULL REFERENCES nivel_ingles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    PRIMARY KEY (id_usuario, id_nivel)
);
CREATE INDEX IF NOT EXISTS ix_profesor_nivel_nivel ON profesor_nivel (id_nivel);

CREATE TABLE IF NOT EXISTS curso (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(100) NOT NULL CHECK (btrim(nombre) <> ''),
    id_nivel integer NOT NULL REFERENCES nivel_ingles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_profesor integer NOT NULL REFERENCES usuario(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    fecha_creacion timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS ix_curso_nivel ON curso (id_nivel);
CREATE INDEX IF NOT EXISTS ix_curso_profesor ON curso (id_profesor);

-- Alumno = contacto cuya oportunidad ganada era un servicio con nivel. Sus datos personales viven en
-- contacto; un contacto es alumno una sola vez y pertenece a lo sumo a un curso.
CREATE TABLE IF NOT EXISTS alumno (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_contacto integer NOT NULL UNIQUE REFERENCES contacto(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_nivel integer NOT NULL REFERENCES nivel_ingles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_curso integer REFERENCES curso(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    fecha_alta timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS ix_alumno_nivel ON alumno (id_nivel);
CREATE INDEX IF NOT EXISTS ix_alumno_curso ON alumno (id_curso);

CREATE TABLE IF NOT EXISTS clase (
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
CREATE INDEX IF NOT EXISTS ix_clase_curso_fecha ON clase (id_curso, fecha);
CREATE INDEX IF NOT EXISTS ix_clase_fecha ON clase (fecha);

-- presente NULL = sin registrar; la nota solo se carga en exámenes (regla del servicio).
CREATE TABLE IF NOT EXISTS clase_alumno (
    id_clase integer NOT NULL REFERENCES clase(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_alumno integer NOT NULL REFERENCES alumno(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    presente boolean,
    nota numeric(4,2) CHECK (nota >= 0 AND nota <= 10),
    PRIMARY KEY (id_clase, id_alumno)
);
CREATE INDEX IF NOT EXISTS ix_clase_alumno_alumno ON clase_alumno (id_alumno);

CREATE TABLE IF NOT EXISTS taller (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_servicio integer NOT NULL REFERENCES servicio(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    titulo varchar(150) NOT NULL CHECK (btrim(titulo) <> ''),
    fecha date NOT NULL,
    hora_inicio time NOT NULL,
    hora_fin time NOT NULL,
    fecha_creacion timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_taller_horario CHECK (hora_fin > hora_inicio)
);
CREATE INDEX IF NOT EXISTS ix_taller_servicio ON taller (id_servicio);
CREATE INDEX IF NOT EXISTS ix_taller_fecha ON taller (fecha);

CREATE TABLE IF NOT EXISTS taller_inscripcion (
    id_taller integer NOT NULL REFERENCES taller(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_contacto integer NOT NULL REFERENCES contacto(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    PRIMARY KEY (id_taller, id_contacto)
);
CREATE INDEX IF NOT EXISTS ix_taller_inscripcion_contacto ON taller_inscripcion (id_contacto);

-- Rol PROFESOR y permiso GestionarAcademia (Profesor y Administrador).
INSERT INTO rol (nombre, descripcion) VALUES ('PROFESOR', 'Profesor') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO permiso (codigo, descripcion)
VALUES ('GestionarAcademia', 'Gestionar alumnos, cursos, clases y talleres dentro del alcance del rol')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO permiso_rol (id_rol, id_permiso)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p
WHERE p.codigo = 'GestionarAcademia' AND r.nombre IN ('ADMINISTRADOR', 'PROFESOR')
ON CONFLICT DO NOTHING;

COMMIT;

-- Verificación: debe devolver 7 tablas nuevas, la columna es_taller y el rol PROFESOR con su permiso.
SELECT
    (SELECT count(*) FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('profesor_nivel', 'curso', 'alumno', 'clase', 'clase_alumno', 'taller', 'taller_inscripcion')) AS tablas_nuevas,
    (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'servicio' AND column_name = 'es_taller') AS columna_es_taller,
    (SELECT count(*) FROM rol WHERE nombre = 'PROFESOR') AS rol_profesor,
    (SELECT count(*) FROM permiso_rol pr JOIN rol r ON r.id = pr.id_rol JOIN permiso p ON p.id = pr.id_permiso
      WHERE p.codigo = 'GestionarAcademia' AND r.nombre IN ('ADMINISTRADOR', 'PROFESOR')) AS permisos_academia;
