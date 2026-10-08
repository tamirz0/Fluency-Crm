# Especificación: oportunidades

ID: `oportunidades`; depende de acceso, configuración comercial y clientes. [Mapa](CAPABILITIES.md) y especificación aprobados por el usuario el 08/10/2026; no implementada. Incluye [convenciones comunes](docs/segunda-entrega/especificacion-tecnica.md). Fuentes: diseño §3–8, §11, §14 y decisiones confirmadas de roles.

## Objetivo y modelo

Gestionar negociaciones ligeras con tabla general, funnel personal para vendedores, cierre/reapertura e historial de etapas. Continuar `features/opportunities` y `features/funnel`, controladores y servicios existentes.

Persistir únicamente relaciones y campos del E-R objetivo: responsable, empresa/contacto, etapa, origen, valor, fechas, motivo de pérdida, objetivo de aprendizaje, participantes, disponibilidad, observaciones y activo. Eliminar del modelo objetivo las líneas de oportunidad, FK directa de servicio/estado y log genérico; no migrar datos anteriores. Derivar embudo, servicio y estado de la etapa. Historial de etapas pertenece a este módulo y es inmutable.

## Entradas y respuestas

Alta `CreateOportunidadRequest`: `titulo`, `idEmbudo`, al menos `idEmpresa` o `idContacto`; opcionales `idEtapa`, `idResponsable`, `idOrigen`, `valor`, `fechaEstimadaCierre`, `objetivoAprendizaje`, `cantidadParticipantes`, `disponibilidadHoraria`, `observaciones`.

- `idEmbudo` solo expresa contexto de la operación y nunca se persiste como FK de oportunidad. Si hay etapa explícita, debe ser abierta/activa y pertenecer al embudo activo; si se omite, tomar primera abierta activa por orden.
- Responsable omitido: actor autenticado. Un vendedor crea a su nombre; puede reasignar después. Administrador/responsable comercial pueden seleccionar otro usuario activo. Conservar el caso por defecto de un superior que crea una oportunidad propia.
- Valor omitido: copiar precio del servicio. Null explícito no significa cero; importe numérico informado, incluido cero, prevalece. Origen y campos de academia opcionales no bloquean alta.
- Fecha de creación y autor del historial: servidor. Alta y entrada inicial (etapa anterior null) en la misma transacción.

PATCH permite `titulo`, `idEmpresa`, `idContacto`, `idOrigen`, `valor`, `fechaEstimadaCierre`, `objetivoAprendizaje`, `cantidadParticipantes`, `disponibilidadHoraria`, `observaciones`. Responsable, etapa, cierre y baja usan comandos específicos. Valor no puede limpiarse a null; debe quedar al menos empresa o contacto.

Response: campos persistidos, referencias etiquetadas, `idEmbudo`/nombre, servicio y estado derivados, más `accionesPermitidas` (`editar`, `reasignar`, `mover`, `cerrar`, `reabrir`, `darDeBaja`, `gestionarActividades`). La API vuelve a comprobar cada permiso y regla al ejecutar; los flags no constituyen autorización.

## Endpoints

Rutas API sin `/api`; todas requieren usuario activo. Lectura compartida. Mutación comercial: dueño vendedor o superior; reapertura solo superiores.

| Método y ruta | Body / resultado |
|---|---|
| `GET /oportunidades` | Paginación común; `q`, `idResponsable`, `idEmpresa`, `idContacto`, `idEmbudo`, `idEtapa`, `estado`, `idOrigen`. Todas las vigentes, no solo las del vendedor. |
| `GET /oportunidades/{id}` | Detalle completo, también de oportunidades ajenas. |
| `POST /oportunidades` | Alta y response, `201`. |
| `PATCH /oportunidades/{id}` | Cambios de datos de una abierta activa, response `200`. |
| `POST /oportunidades/{id}/reasignar` | `{ idResponsable }`; response con permisos recalculados. Vendedor solo puede enviar destino activo con rol vendedor y debe ser dueño al iniciar la operación. Superiores pueden elegir usuario activo. |
| `POST /oportunidades/{id}/mover` | `{ idEtapa, observacion? }`; destino abierto activo del mismo embudo. |
| `POST /oportunidades/{id}/ganar` | `{ fechaCierre, valor, observacion? }`; servidor resuelve única final ganada. |
| `POST /oportunidades/{id}/perder` | `{ fechaCierre, idMotivoPerdida, observacion? }`; final perdida; conserva valor vigente. |
| `POST /oportunidades/{id}/reabrir` | `{ idEtapa, justificacion }`; abierta activa del mismo embudo; no exige responsable/servicio activo. |
| `DELETE /oportunidades/{id}` | Baja lógica definitiva, incluso cerrada; `204`, sin reapertura ni transición. |
| `GET /oportunidades/{id}/historial-etapas` | Paginado por fecha/hora e ID ascendentes; etapa anterior/nueva, autor y observación. |
| `GET /embudos/{id}/funnel` | Etapas activas ordenadas, etiquetas y oportunidades activas agrupadas. Vendedor sin rol superior: filtrar por responsable autenticado. Superiores: todas, filtro opcional `idResponsable`. |

La tabla ordena por creación descendente e ID descendente; búsqueda sobre título, empresa, nombre/apellido de contacto. `estado` acepta solo ABIERTA/GANADA/PERDIDA. Filtros incompatibles producen conjunto vacío, no una combinación de entidades ajenas.

Funnel: seleccionar embudo para no mezclar procesos; conservar columnas activas vacías y finales. Se puede consultar un embudo inactivo y explicar su situación. No se exige paginación por columna ni drag-and-drop: la paginación académica se cubre en los listados. La vista de funnel consulta tarjetas resumidas para ese embudo, no detalles/historias completos. Las cerradas vigentes aparecen en sus finales. La UI no ofrece a un vendedor un filtro para sustituir su cartera en el funnel; sí puede consultar todos desde la tabla.

## Transiciones y asociaciones

- Los comandos ganar/perder son también cambios de etapa. Desde el selector de etapa, elegir final abre el formulario de cierre y llama al comando correspondiente; `/mover` rechaza finales para no saltar sus datos obligatorios.
- Mismo destino abierto actual: no-op, devolver estado actual sin entrada nueva. Repetir un cierre sobre cerrada devuelve `409`; no crea otro historial ni modifica datos.
- Cambiar resultado de cerrada o corregir título, importe, cliente o responsable exige primero reapertura. La baja directa y actividades posteriores al cierre son excepciones expresas.
- Reabrir verifica rol superior, oportunidad activa cerrada, embudo activo, destino abierto activo y justificación no vacía. Capturar cierre anterior, agregar texto legible con resultado/fecha/valor/motivo y justificación, limpiar fecha/motivo actuales y mantener valor. Todo atómico.
- Compatibilidad empresa-contacto se valida al alta y cuando cambia efectivamente alguna de esas asociaciones. No rechazar PATCH de título/valor porque el contacto cambió luego de empresa. Conservar IDs anteriores cuando sus campos están omitidos.
- Nuevas referencias deben estar disponibles; editar otro campo conserva referencias históricas desactivadas. No exigir que el servicio de un embudo existente esté activo.
- El actor autenticado firma el historial aunque responsable sea otro. No registrar bajas, reasignaciones o ediciones ordinarias como movimientos ficticios ni agregar auditoría de campos.
- Revalidar permiso contra responsable actual dentro de la transacción. Si un vendedor reasigna a otro, su siguiente mutación se rechaza; tras la respuesta la UI conserva lectura y retira edición.
- API estándar oculta oportunidad dada de baja como recurso principal, pero sus actividades pueden seguir visibles desde clientes vigentes según diseño. El historial persistido no se borra.

## UI y pruebas fundamentales

Alta contextual desde cliente/embudo, defaults visibles y campos adicionales opcionales. Tabla compartida con filtros y acceso a fichas; funnel personal para vendedor. Conservar UI de expansión y cambio por selector; mostrar solo acciones habilitadas sin eliminar datos ajenos de lectura.

Criterios de aceptación:

1. Crear con datos mínimos asigna etapa/responsable/valor y registra alta; sin abierta disponible informa el bloqueo sin guardar nada.
2. Vendedor ve oportunidad ajena en tabla/detalle/historial y no en su funnel; POST/PATCH/DELETE ajeno recibe `403`, aunque fuerce la llamada o cambie IDs.
3. Reasignación válida transfiere edición; el vendedor anterior conserva consulta. Reasignar una cerrada requiere reapertura.
4. Ganada exige valor/fecha; perdida fecha/motivo activo. Cerrada no se edita directamente. Vendedor dueño tampoco puede reabrir.
5. Reapertura mantiene cierre anterior en texto, limpia campos de cierre actuales y no altera el valor ni fuerza reasignar un responsable inactivo.
6. Cambio de etapa e historia se confirman juntos o ninguno; selección actual no duplica. Carrera de cierre/reasignación/baja no permite saltar el estado o permiso vigente.
7. Baja de cerrada funciona sin reapertura ni historial ficticio; no hay restauración ni cascada de actividades.
8. Precio posterior y participantes no recalculan valor de la oportunidad. Edición ordinaria conserva asociaciones históricas.

Verificar reglas y carreras representativas con PostgreSQL y API real de tests; Vitest para defaults, acciones, body y caché. No intentar probar todas las intercalaciones posibles. Comandos/límites: documento común. No hay nuevas preguntas funcionales abiertas.
