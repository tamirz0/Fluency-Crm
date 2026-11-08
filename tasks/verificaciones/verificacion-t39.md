# Verificación T39: baja lógica de oportunidades

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `DELETE /oportunidades/{id}` (204), política `GestionarOportunidad`: responsable vendedor o superior (403); abierta o cerrada, sin reapertura ni transición. Marca `activo=false` en una transacción Serializable que relee la propiedad. No restaura ni borra físicamente, no toca el historial de etapas (sin entradas nuevas) ni los clientes. Repetir la baja no cambia nada y responde 404, como cualquier operación sobre una oportunidad que ya no se publica (ficha, historial, PATCH y movimiento también dan 404).
- UI: botón «Dar de baja» en la ficha con `accionesPermitidas.darDeBaja`, reutilizando `RemoveRecordButton` (confirmación, causas del rechazo del servidor sin cerrar el diálogo). Al terminar se retira la ficha de la caché, se invalida `oportunidades` (tabla y funnel) y se vuelve al listado con el aviso «Oportunidad dada de baja».
- `schema.d.ts` regenerado con `npm run api:types` contra la API local; la API se detuvo al terminar.

## Resultados

- Build backend: 0 errores, 0 advertencias.
- **31/31** en 5 min 46 s: `BajaOportunidadTests` 3/3, `HttpContractTests` 19/19 (62 acciones), más las suites afectadas `BajasClientesTests`, `EmbudosTests` y `EtapasTests`. Cubren abierta y cerrada sin reabrir, ajena (403), anónimo (401), repetición sin cambios, filas e historial conservados (cuatro filas, tres inactivas, mismo conteo de historial), listado/funnel sin las dadas de baja, el recorrido con altas reales de los bloqueos (empresa, contacto, embudo y etapa se bloquean con oportunidades vigentes —abiertas o cerradas— y se liberan al darlas de baja, cada una solo cuando corresponde) y cuatro rondas de baja contra edición simultáneas.
- Frontend completo **132/132** (17 archivos); `tsc -b` y `npm run build` correctos; `npm run lint` solo con la advertencia previa. `bajas.test.tsx` ahora cubre también la baja de oportunidades (confirmación, aviso en el listado y causas del 409).

## Límites y pendientes

- «Las actividades se conservan» queda sin verificación propia: las actividades aún no existen (T40+). La baja no tiene cascadas por construcción (solo cambia `activo`).
- Sin recorrido manual con API real ni revisión visual. Revisión independiente, auditorías npm y Gitleaks pendientes. La suite backend completa y el circuito alta→…→baja corresponden a CP13.
