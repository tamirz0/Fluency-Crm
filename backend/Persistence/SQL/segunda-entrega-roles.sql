-- Inicialización explícita T05: ejecutar después del esquema/catálogos de T04,
-- dentro de una transacción externa y con search_path único y destino verificado:
-- SELECT set_config('fluency.target_database', '<base destino verificada>', true);
-- No ejecutar al arrancar, repetir sobre datos existentes ni crear cuentas.
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
