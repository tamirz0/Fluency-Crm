# Verificación T34: edición de datos de una oportunidad abierta

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `PATCH /oportunidades/{id}` (política `GestionarOportunidad`): acepta solo `titulo`, `idEmpresa`, `idContacto`, `idOrigen`, `valor`, `fechaEstimadaCierre`, `objetivoAprendizaje`, `cantidadParticipantes`, `disponibilidadHoraria` y `observaciones`; omitir conserva, null limpia solo los opcionales (valor no admite null, 0 es válido, máximo dos decimales; participantes positivos; título hasta 100). Responsable, etapa, cierre, activo y derivados llegan como propiedades desconocidas y se rechazan con 400.
- En una transacción Serializable se relee la oportunidad: debe estar vigente (404), el actor debe ser su responsable vendedor o un superior (403) y debe estar abierta (409: una cerrada se edita tras reabrirla). No agrega entradas al historial de etapas.
- Compatibilidad empresa-contacto y disponibilidad solo se validan cuando una asociación cambia efectivamente; editar título/valor u otros campos conserva las referencias históricas aunque el contacto haya cambiado de empresa, esté dado de baja o la pareja ya no sea compatible. Debe quedar al menos empresa o contacto. Origen nuevo debe estar activo.
- UI: `/oportunidades/:id/editar` (`EditOpportunityPage`, en `OpportunityFormPage.tsx`) con envío diferencial (solo viaja lo que cambió; sin cambios no se llama a la API y se vuelve a la ficha), valor obligatorio, responsable/embudo/etapa como solo lectura, rechazos del servidor visibles sin perder lo escrito y sin doble envío. La ficha muestra «Editar» solo si `accionesPermitidas.editar`; si no corresponde, la ruta explica que no se puede editar (la autorización real sigue siendo la del servidor).
- `schema.d.ts` regenerado con `npm run api:types` contra la API local (puerto 5169, Development) y la API se detuvo al terminar; sin edición manual.

## Resultados

- Build backend: 0 errores, 0 advertencias.
- `EdicionOportunidadTests` **2/2** (dueño/ajena/superior/cerrada/baja/inexistente, campos y valores inválidos sin cambios, sin historial ficticio; asociaciones históricas A→B, disponibilidad, compatibilidad y cliente obligatorio) y `HttpContractTests` 19/19 (56 acciones): **21/21** en 3 min 32 s.
- Frontend completo **117/117**, 15 archivos; `tsc -b` y `npm run build` correctos; `npm run lint` solo con la advertencia previa de `providers.tsx:9`. Cuatro pruebas nuevas en `forms.test.tsx`: PATCH diferencial, sin cambios/valor obligatorio, rechazo 409 visible sin doble envío y visibilidad del botón/ruta según el servidor.

## Límites y pendientes

- Los validadores de valor, fecha y participantes del formulario de alta se extrajeron a constantes compartidas con la edición (sin cambio de comportamiento).
- Carrera real de edición contra reasignación/cierre: se cubre por la relectura Serializable, pero la prueba de carrera dedicada llega con T35 (reasignación). Sin recorrido manual con API real ni revisión visual.
- Revisión independiente, auditorías npm y Gitleaks pendientes.
