# Especificación: clientes

ID: `clientes`; depende de acceso y configuración comercial. [Mapa](CAPABILITIES.md) y especificación aprobados por el usuario el 08/10/2026; no implementada. Incluye [convenciones comunes](docs/segunda-entrega/especificacion-tecnica.md). Fuentes: diseño §7–8 y decisiones confirmadas de lectura/modificación compartida.

## Objetivo y estructura

Todos los usuarios activos pueden consultar, crear, modificar y dar de baja empresas/contactos, sujetos a los bloqueos de negocio. El responsable no restringe acceso. Ampliar `features/companies`, `features/contacts`, controladores y servicios existentes; conservar formularios, estados de carga/error y PATCH diferencial.

## Datos y contratos

| Recurso | POST | PATCH |
|---|---|---|
| `/empresas` | `razonSocial`; opcionales `cuit`, `industria`, `correo`, `telefono`, `direccion`, `observaciones`, `idOrigen`; `idEstado` e `idResponsable` pueden omitirse para usar defaults. | Mismos campos; obligatorios persistidos no admiten null. |
| `/contactos` | `nombre`, `apellido`, `correo`; opcionales `documento`, `cargo`, `telefono`, `idEmpresa`, `observaciones`, `idOrigen`; defaults para estado/responsable. | Mismos campos; `idEmpresa:null` desvincula solo al contacto. |

Defaults: responsable actor autenticado, estado Potencial activo. Si el estado por defecto no está disponible, pedir seleccionar uno activo; no reactivar ni sustituir por un catálogo ficticio. Los responsables explícitos deben ser usuarios activos; no exigir que coincidan con responsables de oportunidades. Conservar responsable inactivo ya asignado al editar otro dato.

`GET /empresas`, `GET /contactos`: paginados, `q`, `idEstado`, `idOrigen`, `idResponsable`; contactos agrega `idEmpresa`. Orden por razón social o apellido/nombre, luego ID. Texto busca nombres/razón social, documento/CUIT, correo y teléfono; contactos también por razón social de empresa relacionada.

`GET /{recurso}/{id}` devuelve campos del E-R, fecha de creación, activo y referencias con etiquetas/disponibilidad. `POST` crea; `PATCH /{id}` modifica; `DELETE /{id}` realiza baja definitiva sin borrado físico. No hay reactivación de clientes ni listado de papelera. Detalle de cliente dado de baja: `404`; sus etiquetas siguen visibles donde corresponda en registros conservados.

Oportunidades relacionadas se consultan mediante `/oportunidades?idEmpresa=...` o `idContacto=...`. Historial comercial lo aporta el contrato de actividades; no duplicar lógica ni crear dependencia circular de servicios.

## Asociaciones y bajas

- Al cambiar la empresa de un contacto, modificar únicamente esa FK. Informar que oportunidades/actividades previas conservan relaciones, sin confirmación de propagación ni actualización masiva.
- La selección nueva de empresa/estado/origen/responsable exige disponibilidad. Mantener una referencia antigua al editar otro campo no equivale a seleccionarla de nuevo.
- Reglas que impliquen oportunidades se evalúan con consultas al DbContext, no llamando recursivamente al servicio de oportunidades.
- Baja empresa: bloqueada por contactos activos o cualquier oportunidad directamente asociada con activo=true. Baja contacto: bloqueada por cualquier oportunidad asociada con activo=true. Contar ganadas/perdidas activas; ignorar actividades como bloqueo.
- No vaciar referencias ni propagar bajas. Una operación bloqueada devuelve `409 BUSINESS_CONFLICT`, con causas/cantidades comprensibles y sin cambios parciales.
- Validar y escribir dentro de la política transaccional común para que un alta/asociación concurrente no deje un cliente dado de baja con nuevas relaciones.

## UI y verificación

Actualizar listados a búsqueda/filtros/paginación de servidor. Mantener tablas y presentación existentes; agregar responsable y acciones de baja. El selector de empresa del contacto deja de bloquearse por oportunidades anteriores. El mensaje de conservación de relaciones es informativo.

Criterios fundamentales:

1. Un vendedor modifica un cliente cuyo responsable es otro usuario; no modifica por ello las oportunidades de ese usuario.
2. Empresa A → B en un contacto conserva la empresa A de negociaciones/actividades existentes; quitar empresa tiene igual comportamiento local al contacto.
3. Baja de cliente con oportunidad ganada activa se rechaza; si solo tiene actividades se permite sin alterarlas.
4. Estado comercial Inactivo no equivale a baja lógica. Registros dados de baja no aparecen como nuevas opciones ni admiten restauración.
5. PATCH omitido conserva, null limpia un opcional y PATCH inválido no guarda parcialmente.
6. Búsqueda/filtros paginan sobre el mismo conjunto; fechas, relaciones y mensajes siguen legibles.

Pruebas de integración PostgreSQL para referencias/bloqueos; Vitest sobre cambio de empresa, PATCH y mensajes. Comandos, estilo y fronteras operativas según documento común. No hay nuevo requisito de importación, duplicados inteligentes ni gestión de cartera privada.
