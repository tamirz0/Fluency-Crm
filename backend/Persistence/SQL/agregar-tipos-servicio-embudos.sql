-- Fluency CRM: tipos de servicio, modalidades nuevas y embudos base en una base YA instalada.
--
-- Para pegar y ejecutar COMPLETO en la consola SQL (pgAdmin o psql). No hay que editar nada.
--   * Reemplaza servicio.es_taller por el tipo de servicio (Clases / Talleres / "Otros" solo si hace falta).
--   * Reemplaza embudo.id_servicio por la admisión por tipo y servicio (cada embudo conserva su servicio actual).
--   * Agrega oportunidad.id_servicio, copiado del servicio de su embudo.
--   * Agrega las modalidades por defecto que falten y, si NO hay embudos, los embudos base con sus etapas.
--   * Repetible: se puede ejecutar más de una vez; lo que ya existe se conserva.
--   * Una sola transacción: si algo falla no queda nada a medias.
--   * Para una base NUEVA no hace falta: creacion-tablas.sql ya incluye todo esto.
--
-- Antes de producción: hacer una copia de seguridad o confirmar el punto de restauración.
-- Después: desplegar el backend y el frontend nuevos (el backend anterior falla sin estas columnas).
-- Orden: si la base no tiene el bonus de academia, ejecutar antes agregar-bonus-academia.sql.

BEGIN;

DO $$
BEGIN
    IF to_regclass('servicio') IS NULL OR to_regclass('embudo') IS NULL OR to_regclass('oportunidad') IS NULL
       OR to_regclass('etapa_comercial') IS NULL OR to_regclass('modalidad') IS NULL
       OR to_regclass('estado_oportunidad') IS NULL THEN
        RAISE EXCEPTION 'Falta el esquema base de la segunda entrega: ejecutar este script sobre la base de Fluency.';
    END IF;
END $$;

-- Tipos de servicio. El código identifica los tipos base; los que agregue el administrador no lo llevan.
CREATE TABLE IF NOT EXISTS tipo_servicio (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion varchar(100) NOT NULL CHECK (btrim(descripcion) <> ''),
    codigo varchar(20) UNIQUE CHECK (codigo IS NULL OR btrim(codigo) <> ''),
    activo boolean NOT NULL DEFAULT true
);
INSERT INTO tipo_servicio (descripcion, codigo)
VALUES ('Clases', 'CLASES'), ('Talleres', 'TALLERES')
ON CONFLICT (codigo) DO NOTHING;

-- Tipo de cada servicio: es_taller -> Talleres; con nivel -> Clases; el resto -> "Otros" (solo si existen).
ALTER TABLE servicio ADD COLUMN IF NOT EXISTS id_tipo_servicio integer
    REFERENCES tipo_servicio(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema()
               AND table_name = 'servicio' AND column_name = 'es_taller') THEN
        EXECUTE 'UPDATE servicio SET id_tipo_servicio = (SELECT id FROM tipo_servicio WHERE codigo = ''TALLERES'')
                 WHERE id_tipo_servicio IS NULL AND es_taller';
    END IF;
    UPDATE servicio SET id_tipo_servicio = (SELECT id FROM tipo_servicio WHERE codigo = 'CLASES')
    WHERE id_tipo_servicio IS NULL AND id_nivel IS NOT NULL;
    IF EXISTS (SELECT 1 FROM servicio WHERE id_tipo_servicio IS NULL) THEN
        INSERT INTO tipo_servicio (descripcion)
        SELECT 'Otros' WHERE NOT EXISTS (SELECT 1 FROM tipo_servicio WHERE descripcion = 'Otros');
        UPDATE servicio SET id_tipo_servicio = (SELECT min(id) FROM tipo_servicio WHERE descripcion = 'Otros')
        WHERE id_tipo_servicio IS NULL;
    END IF;
END $$;
ALTER TABLE servicio ALTER COLUMN id_tipo_servicio SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_servicio_tipo ON servicio (id_tipo_servicio);

-- Admisión de servicios por embudo (tipos admitidos y selección puntual de servicios de un tipo).
CREATE TABLE IF NOT EXISTS embudo_tipo_servicio (
    id_embudo integer NOT NULL REFERENCES embudo(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_tipo_servicio integer NOT NULL REFERENCES tipo_servicio(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    PRIMARY KEY (id_embudo, id_tipo_servicio)
);
CREATE INDEX IF NOT EXISTS ix_embudo_tipo_servicio_tipo ON embudo_tipo_servicio (id_tipo_servicio);
CREATE TABLE IF NOT EXISTS embudo_servicio (
    id_embudo integer NOT NULL REFERENCES embudo(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    id_servicio integer NOT NULL REFERENCES servicio(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    PRIMARY KEY (id_embudo, id_servicio)
);
CREATE INDEX IF NOT EXISTS ix_embudo_servicio_servicio ON embudo_servicio (id_servicio);

-- Servicio de cada oportunidad: el del embudo de su etapa.
ALTER TABLE oportunidad ADD COLUMN IF NOT EXISTS id_servicio integer
    REFERENCES servicio(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema()
               AND table_name = 'embudo' AND column_name = 'id_servicio') THEN
        EXECUTE 'INSERT INTO embudo_servicio (id_embudo, id_servicio) SELECT id, id_servicio FROM embudo
                 ON CONFLICT DO NOTHING';
        EXECUTE 'INSERT INTO embudo_tipo_servicio (id_embudo, id_tipo_servicio)
                 SELECT e.id, s.id_tipo_servicio FROM embudo e JOIN servicio s ON s.id = e.id_servicio
                 ON CONFLICT DO NOTHING';
        EXECUTE 'UPDATE oportunidad o SET id_servicio = e.id_servicio
                 FROM etapa_comercial et JOIN embudo e ON e.id = et.id_embudo
                 WHERE et.id = o.id_etapa AND o.id_servicio IS NULL';
    END IF;
END $$;
ALTER TABLE oportunidad ALTER COLUMN id_servicio SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_oportunidad_servicio ON oportunidad (id_servicio);

-- Los reemplazos ya no se necesitan.
ALTER TABLE embudo DROP COLUMN IF EXISTS id_servicio;
ALTER TABLE servicio DROP COLUMN IF EXISTS es_taller;

-- Modalidades por defecto: se agregan las que falten (sin tocar ni desactivar las existentes).
INSERT INTO modalidad (descripcion)
SELECT v.descripcion
FROM (VALUES ('Grupal Presencial'), ('Grupal Online'), ('Grupal Híbrido'),
             ('Particular Online'), ('Particular Presencial')) AS v(descripcion)
WHERE NOT EXISTS (SELECT 1 FROM modalidad m WHERE lower(m.descripcion) = lower(v.descripcion));

-- Embudos base: solo si la academia todavía no tiene ninguno.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM embudo) AND NOT EXISTS (SELECT 1 FROM etapa_comercial) THEN
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
    END IF;
END $$;

COMMIT;

-- Verificación (solo lectura): tipos, servicios sin tipo, oportunidades sin servicio y embudos con admisión.
SELECT (SELECT count(*) FROM tipo_servicio) AS tipos,
       (SELECT count(*) FROM servicio WHERE id_tipo_servicio IS NULL) AS servicios_sin_tipo,
       (SELECT count(*) FROM oportunidad WHERE id_servicio IS NULL) AS oportunidades_sin_servicio,
       (SELECT count(*) FROM embudo e WHERE NOT EXISTS
            (SELECT 1 FROM embudo_tipo_servicio x WHERE x.id_embudo = e.id)) AS embudos_sin_tipos,
       (SELECT count(*) FROM modalidad) AS modalidades;
