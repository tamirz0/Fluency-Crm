# Especificación: configuración comercial

ID: `configuracion-comercial`; depende de `acceso`. [Mapa](CAPABILITIES.md) y especificación aprobados por el usuario el 08/10/2026; no implementada. Incluye [convenciones comunes](docs/segunda-entrega/especificacion-tecnica.md). Fuente funcional: diseño §4–5 y §8.

## Objetivo, estructura y límites

Administrar servicios, embudos, etapas y catálogos para que el circuito sea configurable, conservando referencias. UI en `features/settings` y `features/services`; controladores/servicios específicos en proyectos actuales. Solo administrador escribe configuración. Responsable comercial/vendedor consultan las opciones necesarias para gestionar negocio; supervisar el funnel no autoriza configurar sus etapas.

Catálogos: estados de cliente, orígenes comerciales, niveles de inglés, modalidades, motivos de pérdida y tipos de actividad. Estados de oportunidad ABIERTA/GANADA/PERDIDA son fijos y de solo lectura. Usuarios/roles pertenecen a acceso.

## Datos y contratos

Todos los DTO incluyen ID, campos del recurso y `activo` cuando corresponde; referencias incluyen ID y etiqueta. Listado normal de selección solo activos; administración puede consultar `activo=true|false|todos`.

| Recurso API | Campos de alta / campos editables | Particularidades |
|---|---|---|
| `/servicios` | `nombre`, `descripcion?`, `precioReferencia`, `duracionHoras?`, `idNivel?`, `idModalidad?` | Precio requerido, cero válido. Nivel/modalidad opcionales; conservar referencias previas inactivas. |
| `/embudos` | `nombre`, `descripcion?`, `idServicio` | Alta genera exactamente dos finales. Cambio de servicio solo si nunca fue utilizado por oportunidades. |
| `/embudos/{id}/etapas` | `nombre`, `descripcion?`, `orden` | Alta solo crea etapa ABIERTA; embudo de ruta, estado establecido por servidor. |
| `/etapas/{id}` | PATCH `nombre`, `descripcion?`, `orden`; `idEmbudo` solo en abierta nunca utilizada | No permite cambiar estado. Si fue usada por oportunidad o historial, no cambia de embudo. |
| `/catalogos/{catalogo}` | `descripcion` o `nombre` según E-R | Nombres permitidos por lista cerrada; no construir nombres SQL desde la ruta. |
| `/estados-oportunidad` | GET de tres códigos y descripciones | Sin POST/PATCH/baja. |

Para servicios, embudos y cada catálogo configurable: `GET` paginado de colección, `GET /{id}`, `POST`, `PATCH /{id}`, `POST /{id}/desactivar`, `POST /{id}/reactivar`. Para etapas: `GET /embudos/{id}/etapas`, `POST` en esa colección, `GET/PATCH /etapas/{id}`, acciones desactivar/reactivar sobre etapa. Sin DELETE físico. Alta activa por defecto.

La creación de etapa abierta exige orden; conflictos activos dan `409`. Reordenar se hace con `PUT /embudos/{id}/orden-etapas`, body `{ etapas: [{ id, orden }] }` que incluye todas las etapas activas exactamente una vez. Rechazar IDs ajenos, duplicados y colisión de orden; permite huecos. Operación atómica, con posiciones temporales únicas o actualización equivalente que respete el índice inmediato. No alterar `activo` para simular reordenación.

## Reglas persistentes

- Crear embudo, ganada y perdida en una misma transacción; inicialmente finales en orden 1 y 2, nombres Ganada/Perdida. No inventar etapa abierta. La UI permite ordenarlas después; el alta de oportunidad busca la primera abierta, no el menor orden absoluto.
- Las finales pueden cambiar textos y orden, nunca estado/embudo ni desactivarse. No existe endpoint público para crear otras finales.
- Consultar uso histórico incluye oportunidades dadas de baja e historial, no solo oportunidades abiertas. Embudo usado conserva servicio; etapa usada conserva embudo y estado.
- Desactivar servicio solo impide elegirlo en nuevos embudos; los embudos existentes activos siguen operativos, incluso para altas/reaperturas.
- Desactivar embudo/etapa abierta se bloquea por oportunidades **abiertas y activas**. Las cerradas vigentes y abiertas dadas de baja no bloquean. No modificar etapas al desactivar su embudo.
- Reactivar abierta toma `max(orden activo del embudo)+1`. No reservar orden anterior, renumerar otras ni exigir consecutividad.
- Configuraciones referenciadas permanecen legibles al desactivarse. No restaurar datos comerciales al reactivar configuración.
- Unicidad y operaciones simultáneas siguen los índices y transacciones de la especificación común. Las consultas de bloqueo y la creación/movimiento de oportunidades deben participar de la misma política de aislamiento.

## Inicialización

Estados de cliente iniciales: Potencial, Cliente, Inactivo y No contactar. Tipos de actividad: llamada, correo electrónico, mensaje, reunión presencial, reunión virtual, demostración, envío de propuesta, nota interna y otro tipo configurable. Conservar niveles/modalidades útiles existentes y definir semillas sin datos personales reales. No crear automáticamente servicios/embudos de demostración para simular que están configurados; fixtures de tests separados del producto.

## UI y aceptación

Pantallas de administración con listados, editor y acciones desactivar/reactivar; etiquetas claras para referencias inactivas. Finales no ofrecen baja ni selector de estado. Embudo sin abiertas se guarda y explica por qué todavía no permite altas de oportunidades; no agrega un asistente obligatorio.

Casos fundamentales: (1) crear embudo produce dos finales y ninguna abierta; (2) prohibir segunda final y su baja; (3) rechazar órdenes activos repetidos y admitir repetidos inactivos; (4) reactivación al final; (5) bloqueos por abiertas/activas y no por cerradas o dadas de baja; (6) servicio inactivo no detiene su embudo activo; (7) usuarios no administradores reciben `403` en mutaciones aunque conozcan la ruta.

Pruebas PostgreSQL para índices, reordenación atómica y carreras de baja/alta; Vitest para permisos y mensajes del editor. Sin snapshots grandes ni barrido exhaustivo de combinaciones de catálogos. Comandos, estilo y límites: documento común. No hay preguntas funcionales abiertas para este módulo.
