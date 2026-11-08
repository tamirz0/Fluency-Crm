# Verificación T37: cierre como ganada o perdida

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `POST /oportunidades/{id}/ganar` (`fechaCierre`, `valor`, `observacion?`) y `POST /oportunidades/{id}/perder` (`fechaCierre`, `idMotivoPerdida`, `observacion?`), política `GestionarOportunidad`. Ganar exige fecha y valor (cero es válido, 0–9.999.999.999,99 con dos decimales) y reemplaza el valor; perder exige fecha y un motivo activo y conserva el valor vigente. El servidor resuelve la única etapa final activa del resultado en el embudo de la oportunidad.
- Responsable vendedor o superior (403); vigente (404); abierta (409). Repetir el cierre o cambiar el resultado de una cerrada responde 409 sin tocar datos ni historial; `/mover` y PATCH ya rechazan las cerradas. La fecha se guarda como medianoche UTC del día informado.
- Cambio de etapa, fecha, valor/motivo y la entrada de historial (anterior, final, autor de la sesión, observación) en una transacción Serializable que relee propiedad y estado; propiedades desconocidas se rechazan (400).
- UI: `CloseOpportunityDialog` (resultado, fecha por defecto hoy, valor final precargado y obligatorio para ganar, motivo de pérdida activo para perder, observación) con validación visible, error del servidor sin cerrar el diálogo, sin doble envío y recarga de ficha/tabla/funnel. Botón «Cerrar» en la ficha (`accionesPermitidas.cerrar`). El selector «Cambiar etapa» ahora lista también las finales; elegir una no mueve nada: deriva a «Continuar al cierre» con el resultado preseleccionado, tanto en la ficha como en el funnel.
- `schema.d.ts` regenerado con `npm run api:types` contra la API local; la API se detuvo al terminar.

## Resultados

- Build backend: 0 errores, 0 advertencias.
- `CierreTests` **2/2** y `HttpContractTests` 19/19 (60 acciones): **21/21** en 3 min 43 s. Cubren datos inválidos (fecha/valor/motivo ausentes, negativo, decimales, motivo inactivo o inexistente), ganar con valor cero, perder conservando valor, repetición/cambio de resultado/mover/PATCH sobre cerrada (409), ajena (403), baja e inexistente (404), final en el funnel, tres rondas de ganar contra perder simultáneos (exactamente un 200 y un 409, dos entradas de historial, motivo solo si ganó la pérdida) y rollback completo cuando falla la escritura del historial.
- Frontend completo **127/127** (16 archivos); `tsc -b` y `npm run build` correctos; `npm run lint` solo con la advertencia previa. `CloseOpportunityDialog.test.tsx` 4/4 (ganar con cero, perder exige motivo y no envía valor, validaciones, rechazo 409) y un caso nuevo en `FunnelPage.test.tsx` (final → formulario de cierre sin llamar a `/mover`).

## Límites y pendientes

- La fecha de cierre no se limita (futura o anterior a la creación): el plan no lo pide. Sin recorrido manual con API real ni revisión visual.
- Revisión independiente, auditorías npm y Gitleaks pendientes.
