-- Bonus de academia: rol PROFESOR y permiso GestionarAcademia. Ejecutar después de
-- segunda-entrega-roles.sql (que no se modifica) y de segunda-entrega-bonus.sql, en una transacción
-- externa con el mismo protocolo (search_path único y fluency.target_database declarado).
-- Aditivo e idempotente: no borra ni reemplaza roles, permisos ni cuentas existentes.
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
