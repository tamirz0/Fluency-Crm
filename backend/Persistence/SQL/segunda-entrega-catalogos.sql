-- Ejecutar inmediatamente después de segunda-entrega-esquema.sql, dentro de la
-- MISMA transacción externa y con fluency.target_database/search_path explícitos.
-- Los estados fijos de oportunidad se insertan en el DDL para resolver sus índices.
-- Roles/permisos: T05. Administrador: T06. Sin cuentas ni negocio de demostración.
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
