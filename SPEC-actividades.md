# Especificación: actividades

ID: `actividades`; depende de acceso, configuración comercial, clientes y oportunidades. [Mapa](CAPABILITIES.md) y especificación aprobados por el usuario el 08/10/2026; no implementada. Incluye [convenciones comunes](docs/segunda-entrega/especificacion-tecnica.md). Fuente funcional: diseño §9 y acuerdos de lectura compartida/gestión por responsable de oportunidad.

## Objetivo y estructura

Registrar interacciones ya realizadas y presentar su historia cronológica junto con las transiciones existentes. Catálogo `TipoActividad` pertenece a configuración; hecho `Actividad` pertenece a este módulo. El modelo anterior donde Actividad nombraba el catálogo se reemplaza por el E-R acordado.

Controladores/servicios de actividades y consultas de historial en proyectos actuales; `frontend/src/features/activities` contiene editor y presentación reutilizable dentro de fichas de empresa, contacto y oportunidad. No crear agenda, tareas, notificaciones, tabla genérica de eventos ni auditoría adicional.

## Datos y permisos

Actividad: `idTipo`, `idEmpresa?`, `idContacto?`, `idOportunidad?`, `fechaHora`, `descripcion`, `resultado?`, autor y fecha de registro automáticos, `activo=true`. Debe tener empresa o contacto; oportunidad por sí sola no alcanza. Descripción y fecha de ocurrencia obligatorias; resultado puede completarse posteriormente. La UI desde una oportunidad envía sus asociaciones contextuales sin exigir repetir selecciones.

La fecha de registro y el usuario creador no se editan; modificar la actividad no los reemplaza por el editor. No introducir autor/fecha de modificación o baja no exigidos por el diseño. El actor de cada request se autentica igualmente para autorizarlo.

- Todos consultan actividades e historiales visibles, incluso de oportunidades ajenas.
- Con oportunidad: solo su vendedor responsable vigente o superiores puede agregar, editar o dar de baja actividades; el autor original de la actividad no obtiene un permiso permanente si cambia el responsable.
- Sin oportunidad: todos los usuarios activos pueden gestionar la actividad de clientes, coherente con la gestión compartida de empresas/contactos.
- Cambiar/quitar `idOportunidad` exige primero permiso sobre la actividad original y después sobre el destino. No permitir que un vendedor eluda la regla quitando la oportunidad ajena o incorporando una ajena después.
- Registrar una actividad posterior al cierre no edita ni reabre la oportunidad; se permite al responsable/superiores. Bajas de clientes u oportunidad no cambian automáticamente `activo` de la actividad.

## Contratos

| Método y ruta API | Body / resultado |
|---|---|
| `GET /actividades` | Paginado con `idEmpresa`, `idContacto`, `idOportunidad`, `idTipo`, `idUsuario`, `desde`, `hasta`, `q`. Solo actividades activas con al menos un contexto comercial vigente desde el cual sean consultables. |
| `GET /actividades/{id}` | Detalle con referencias etiquetadas y `accionesPermitidas`; una actividad dada de baja devuelve `404`. |
| `POST /actividades` | Campos de entrada anteriores; autor/fechaRegistro ignorar no es suficiente: rechazarlos como propiedades no permitidas. `201`. |
| `PATCH /actividades/{id}` | Campos editables del hecho y sus asociaciones; omisión/null según contrato común. `200`. |
| `DELETE /actividades/{id}` | `activo=false`, `204`. Sin restauración, marcador de eliminación ni transición de oportunidad. |
| `GET /empresas/{id}/historial-comercial` | Página de actividades directamente asociadas a esa empresa y transiciones de sus oportunidades directamente asociadas vigentes. |
| `GET /contactos/{id}/historial-comercial` | Igual criterio por contacto. No incluir automáticamente todo lo de su empresa actual. |
| `GET /oportunidades/{id}/historial-comercial` | Actividades asociadas y transiciones de esa oportunidad vigente. |

Historial es una proyección de lectura, no tabla nueva. Cada item: `tipo` (ACTIVIDAD o TRANSICION), `idOrigen`, `fechaHora`, autor, referencias y contenido del tipo. ACTIVIDAD incluye fechaRegistro, tipo/descripcion/resultado; TRANSICION incluye anterior/nueva/observación. `tipo` discrimina el DTO, no agrega una columna de tipo de evento a HistorialEtapas.

Unir antes de paginar, ordenar por `fechaHora` descendente, tipo e ID de origen descendentes como desempate. Contar el mismo conjunto filtrado. No concatenar dos páginas independientes ni duplicar una actividad porque coincida a la vez por empresa y contacto. Fechas `desde/hasta` son instantes ISO; inicio inclusivo, fin exclusivo. Orden de actividades usa fecha del hecho, no fecha de carga.

## Coherencia y conservación

- Si se informa oportunidad, la empresa/contacto enviados deben corresponder a sus asociaciones conservadas. Permitir usar una o ambas referencias presentes en esa oportunidad, pero no una empresa/contacto diferente.
- Para actividades sin oportunidad, validar existencia y disponibilidad de las referencias explícitas, sin inferir o cambiar automáticamente la empresa a partir del contacto. No agregar un bloqueo de coincidencia permanente que el diseño no exige.
- Al editar texto/resultado/fecha no revalidar la relación histórica contra la empresa actual del contacto. Si cambia efectivamente una asociación, validar su nuevo contexto y permiso.
- No seleccionar clientes u oportunidades dados de baja para nuevas relaciones. Si una oportunidad vigente conserva referencias a clientes dados de baja, registrar la actividad desde esa oportunidad puede conservar ese contexto histórico; no reinterpretarlo como una selección nueva de otro cliente.
- Actividad dada de baja desaparece de todas las vistas. Actividad activa con una asociación dada de baja sigue consultable desde otro contexto vigente. Si todos sus contextos quedaron dados de baja, conservar en base sin inventar una vista de recuperación.
- Transiciones de oportunidad dada de baja se conservan almacenadas pero no se usan para reintroducir esa oportunidad en la operación habitual. Sus actividades activas pueden seguir apareciendo en otros clientes vigentes relacionados, como exige el diseño.
- Las consultas de historia de un cliente usan FKs históricas directas; un cambio de empresa del contacto no mueve el historial de una empresa a otra. Los nombres corregidos sí pueden reflejarse porque no se guardan snapshots de identidad.

## Aceptación y pruebas

1. Registrar una llamada de ayer cargada hoy conserva ambas fechas, usuario real y posición cronológica por el hecho.
2. Vendedor consulta todo historial, pero no crea/edita/elimina actividad de una oportunidad ajena; tampoco lo elude desde la ficha del cliente o cambiando relaciones.
3. Actividad sobre oportunidad propia cerrada se permite sin reapertura ni modificación de la oportunidad.
4. Cambiar empresa actual de contacto conserva contexto previo; PATCH de descripción no exige actualizar sus asociaciones históricas.
5. Dar de baja oportunidad no da de baja actividades: una actividad también asociada a contacto vigente sigue visible allí. Dar de baja esa actividad la oculta sin tarjeta de eliminación.
6. Historial combinado ordena/pagina sin duplicados y representa alta, movimientos, cierres y reaperturas desde los registros existentes.

Tests API/PostgreSQL para permisos, fechas, asociaciones y baja; Vitest para editor contextual, lectura y estados vacío/error. No construir tests de auditoría completa: está fuera de alcance. Comandos, estilo y límites comunes aplican a este módulo.
