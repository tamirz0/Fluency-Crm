# Verificación T30: alta de oportunidad en la UI

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `/oportunidades/nueva` (publicada en `App`) con `NewOpportunityPage`: título, embudo, relación comercial (empresa y contacto con búsqueda en servidor, contacto acotado a la empresa, autocompletado de empresa al elegir un contacto), etapa inicial opcional, valor, fecha estimada, origen, datos académicos y observaciones.
- Defaults visibles: etapa «<primera abierta> (por defecto)», precio de referencia del servicio como ayuda del valor (0 es válido), responsable «tu usuario» (selector solo para administrador/responsable comercial; el id propio no se envía). Servicio y estado no se piden: el servicio se muestra derivado del embudo.
- Embudo sin etapa abierta activa: mensaje explícito, botón deshabilitado y ninguna etapa inventada. Los errores de la API (p. ej. 409) se muestran sin perder lo escrito; el envío no se duplica.
- Alta contextual: botón «Nueva oportunidad» en las fichas de empresa y contacto (con permiso `GestionarOportunidad`), con `?idEmpresa`, `?idContacto` o `?idEmbudo`.
- Al guardar se abre `/oportunidades/:id`: ficha de solo lectura con el contrato nuevo (referencias etiquetadas, embudo/servicio/estado derivados, valor, fechas, datos académicos). Edición, historial, acciones y listado quedan para T31–T34.
- `schema.d.ts` regenerado con `npm run api:types` contra la API local (puerto 5169, perfil Development), sin edición manual: solo adiciones (289 líneas). La API se detuvo al terminar. Se retiran del cliente el alta, la lectura y el PATCH del contrato anterior (que enviaba `idUsuario`); `getService` es nuevo.
- Se retira el modo edición del formulario (dependía del contrato anterior); T34 lo reconstruye.

## Resultados

- `forms.test.tsx` **27/27** (13 casos de oportunidades): alta mínima con cuerpo exacto `{titulo, idEmbudo, idEmpresa}` y ficha; alta desde empresa/contacto; botón contextual con y sin permiso; filtro de contactos por empresa; opcionales (etapa, origen, valor 0, participantes, fecha, textos); calendario; fecha imposible; validaciones; embudo sin abierta; rechazo 409 sin doble envío; responsable de un superior; catálogos caídos.
- Frontend completo **115/115**, 14 archivos, 36,6 s. `npm run build` correcto; `npm run lint` solo con la advertencia previa de `providers.tsx:9`. `git diff --check` limpio.
- Cambios legítimos de tests existentes: `App.test.tsx` (la ficha `/oportunidades/:id` ya no está retirada; `/oportunidades` y `/embudo` siguen sin publicar) y `Consultations.test.tsx` (la ficha usa el contrato nuevo). Se eliminaron los tres casos de PATCH de oportunidad y el de «etapa inicial obligatoria» porque cubrían comportamiento retirado; T34 repone la edición con su propia cobertura.

## Pendiente

- **Recorrido local con API real** (alta mínima desde una empresa o contacto y rechazo de un embudo sin etapa abierta; comprobar el historial inicial en la base) a cargo del operador: requiere cuenta e infraestructura locales. Es también la comprobación de CP10. Mientras tanto T30 no se marca terminada.
- Los selectores de embudo y servicio consultan hasta 100 registros; no hay búsqueda por texto.
- Revisión independiente pendiente (solo revisión propia del diff). Auditorías y Gitleaks no ejecutados.
