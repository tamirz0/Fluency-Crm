# Verificación T36: movimiento entre etapas abiertas

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `POST /oportunidades/{id}/mover` con `{ idEtapa, observacion? }` (política `GestionarOportunidad`). Responsable vendedor o superior (403); vigente (404); abierta (409). Destino: etapa abierta, activa y del mismo embudo; una final se rechaza con 400 `VALIDATION_FAILED` (ganar/perder tienen su cierre) y otro embudo, inexistente o inactiva con 400 `REFERENCE_UNAVAILABLE`. Mismo destino: devuelve el estado actual sin entrada de historial.
- Cada movimiento real cambia la etapa y agrega la entrada (anterior, nueva, autor de la sesión, observación recortada, fecha del servidor) en una transacción Serializable que relee propiedad y estado; una falla o carrera revierte todo y se informa como conflicto sin reintento. El cuerpo no puede falsificar autor ni fecha (propiedades desconocidas: 400).
- UI: «Cambiar etapa» en la ficha y en la tarjeta expandida del funnel, solo si `accionesPermitidas.mover`. El diálogo ofrece únicamente las demás etapas abiertas activas del embudo, observación opcional, muestra el rechazo del servidor sin cerrarse ni duplicar el envío, y al guardar invalida la caché `oportunidades` (ficha, tabla, funnel e historial). Se retiró del funnel anterior la transición con `idUsuario` arbitrario (ya había sido sustituida en T33).
- `schema.d.ts` regenerado con `npm run api:types` contra la API local; la API se detuvo al terminar.

## Resultados

- Build backend: 0 errores, 0 advertencias.
- `MovimientoTests` **2/2** y `HttpContractTests` 19/19 (58 acciones): **21/21** en 3 min 30 s. Cubren destinos válidos e inválidos (final, otro embudo, inactiva, inexistente), no-op, autor de la sesión incluso de un superior, ajena, cerrada, baja, historial leído por la API, cuatro rondas de movimientos simultáneos con historia coherente con la etapa final, y rollback del movimiento cuando falla la escritura del historial (restricción de prueba `NOT VALID`).
- Frontend completo **122/122**; `tsc -b` y `npm run build` correctos; `npm run lint` solo con la advertencia previa. Tres pruebas nuevas en `FunnelPage.test.tsx` (cambio con observación, rechazo 409 visible sin duplicar, sin botón sin permiso) y la de visibilidad de la ficha ampliada.

## Límites y pendientes

- **Finales:** el selector no ofrece ganar/perder; cuando T37 habilite el cierre, elegir una final debe abrir su formulario (sin pasar por `/mover`).
- Sin recorrido manual con API real ni revisión visual. Revisión independiente, auditorías npm y Gitleaks pendientes.
