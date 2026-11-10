-- Embudos base de la academia: "Clases de Inglés" (servicios de tipo Clases) y "Talleres" (tipo Talleres),
-- cada uno con sus etapas por defecto. Ejecutar después de segunda-entrega-esquema.sql y
-- segunda-entrega-catalogos.sql, en la misma transacción externa y con fluency.target_database/search_path
-- explícitos. Opcional: los tests del esquema no lo aplican. Los embudos y sus etapas se editan luego desde
-- la configuración comercial. Para una base ya instalada: agregar-tipos-servicio-embudos.sql.
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
