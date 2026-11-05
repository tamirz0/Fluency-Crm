# Verificación T38: reapertura de oportunidades cerradas

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `POST /oportunidades/{id}/reabrir` con `{ idEtapa, justificacion }`, política `ReabrirOportunidad`: solo administrador y responsable comercial (el vendedor dueño recibe 403). La oportunidad debe estar vigente (404) y cerrada (409 si ya está abierta); el embudo debe estar activo (409) y el destino ser una etapa abierta, activa y del mismo embudo (400 `REFERENCE_UNAVAILABLE`); la justificación no puede estar vacía (400).
- En una transacción Serializable: se mueve a la etapa elegida, se limpian fecha de cierre y motivo actuales, se mantiene el valor y se agrega la entrada de historial (anterior = la final, autor = el superior de la sesión) con el cierre anterior como texto legible —«Reapertura. Cierre anterior: ganada|perdida el dd/MM/aaaa, valor 0,00[, motivo: …]. Justificación: …»— de modo que el primer cierre no se pierde al cerrar y reabrir otra vez. Un responsable o servicio inactivos no bloquean ni obligan a reasignar.
- UI: botón «Reabrir» en la ficha solo con `accionesPermitidas.reabrir`; `ReopenOpportunityDialog` lista únicamente etapas abiertas activas del embudo, exige justificación, explica que el cierre queda en el historial y que no hace falta cambiar responsable ni servicio, avisa y bloquea si el embudo está inactivo, muestra el rechazo del servidor sin cerrarse ni duplicar el envío y recarga ficha, tabla, funnel e historial.
- `schema.d.ts` regenerado con `npm run api:types` contra la API local; la API se detuvo al terminar.

## Resultados

- Build backend: 0 errores, 0 advertencias.
- `ReaperturaTests` **2/2** y `HttpContractTests` 19/19 (61 acciones): **21/21** en 3 min 52 s. El primero recorre ganar → reabrir (superior) → corregir valor → perder → reabrir con el texto de ambos cierres conservado en la historia, vendedor y anónimo rechazados, solicitudes inválidas y destinos inválidos sin cambios, abierta/baja/inexistente, embudo inactivo, y reapertura con responsable y servicio inactivos. El segundo repite tres rondas de reaperturas simultáneas (un 200, un 409, una sola entrada) y comprueba que una falla al escribir la historia deja la oportunidad cerrada.
- Frontend completo **130/130** (17 archivos); `tsc -b` y `npm run build` correctos; `npm run lint` solo con la advertencia previa. `ReopenOpportunityDialog.test.tsx` 3/3.

## Límites y pendientes

- El texto del cierre anterior se genera en español con importe sin separador de miles; el historial de la ficha lo muestra tal cual en «Observación».
- Sin recorrido manual con API real ni revisión visual. Revisión independiente, auditorías npm y Gitleaks pendientes.
