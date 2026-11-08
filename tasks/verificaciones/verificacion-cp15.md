# Verificación CP15: módulo de actividades

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo` (T40–T45, sobre CP13). Sin merge ni push; el OK de integración queda a cargo del usuario.

## Alcance cubierto

T40 (modelo `Actividad` con fecha del hecho y de registro), T41 (alta y consulta), T42 (editor desde las fichas), T43 (edición y baja con permisos de origen y destino), T44 (historial comercial combinado) y T45 (historial en las fichas de empresa, contacto y oportunidad). Evidencia por tarea en `verificacion-t40.md` … `verificacion-t45.md`.

## Resultados (estado al commit de T45, `d16c7bb`)

- **Backend completo: 171/171** (9 min 45 s, sin omisiones). Build sin errores ni advertencias.
- **Frontend completo: 145/145** (19 archivos); `tsc -b` y `npm run build` correctos; `npm run lint` solo con la advertencia previa de `providers.tsx:9`.
- Circuito historial combinado → edición → baja → lectura desde otro contexto: `HistorialComercialTests` (unión antes de paginar, empates, FKs directas, cambio A→B, oportunidad dada de baja con la actividad visible desde el contacto, actividad dada de baja, `accionesPermitidas`), `EdicionActividadTests` (autor y registro intactos, origen/destino/desvinculación, cambio de dueño, baja sin cascadas) y `CommercialHistory.test.tsx` (lectura, edición y baja con recarga, paginación, vacío/error).
- Los recorridos ya habilitados (acceso, usuarios, catálogos, servicios, embudos/etapas, empresas, contactos y todo el módulo de oportunidades de CP13) siguen pasando en la misma ejecución completa.

## Cambios legítimos de pruebas

`HttpContractTests` (de 62 a 70 acciones, rutas de actividades e historial); la ficha de oportunidad sustituye la tabla «Historial de etapas» por el historial comercial (que incluye las transiciones), con las pruebas de `Consultations.test.tsx` y el mock de `forms.test.tsx` adaptados; no se eliminó ninguna comprobación sin sustituto.

## Pendientes y límites

- **Revisión independiente previa al merge: pendiente** (solo revisión propia de cada diff).
- **Validación autenticada del usuario pendiente:** recorrido manual de la historia compartida y revisión visual en el navegador.
- Auditorías npm/.NET y Gitleaks se cierran en T47; no se repitieron en este tramo.
