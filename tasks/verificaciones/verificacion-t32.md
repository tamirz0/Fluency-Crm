# Verificación T32: tabla y ficha de oportunidades compartidas

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `/oportunidades` publicada en `App` y en el menú lateral: listado con el contrato nuevo (`GET /oportunidades`) de todas las oportunidades vigentes. Búsqueda (botón «Buscar»), filtros de estado, embudo, origen y responsable, y paginación del servidor; «Limpiar filtros» vuelve a la primera página. Se muestran título visible, embudo, etapa y estado, empresa y contacto enlazados, responsable, valor y cierre estimado; responsable y embudo inactivos se rotulan «(inactivo)».
- La ficha `/oportunidades/:id` suma el «Historial de etapas» (`GET /oportunidades/{id}/historial-etapas`), paginado, de solo lectura; la entrada inicial se rotula «Alta de la oportunidad».
- `schema.d.ts` regenerado con `npm run api:types` contra la API local (puerto 5169, Development), sin edición manual. `client.ts`: `listOpportunities`, `getOpportunityHistory`, tipos y claves de caché que incluyen filtros y página (no se mezclan resultados).
- El menú muestra «Oportunidades» siempre; «Embudo» sigue condicionado hasta T33.

## Resultados

- Frontend completo **113/113**, 14 archivos. `npm run build` correcto; `npm run lint` solo con la advertencia previa de `providers.tsx:9`.
- Pruebas retiradas por cambio legítimo de contrato: tres de `ListSearch.test.tsx` (búsqueda en el cliente sobre la respuesta por etapas), dos de `Consultations.test.tsx` (listado y vacío del contrato anterior) y el caso de ruta retirada `/oportunidades` de `App.test.tsx`. Reemplazadas por cuatro pruebas de `Consultations.test.tsx`: listado, envío de búsqueda/filtros/página al servidor y limpieza, vacío/reintento, y ficha con historial y 404.

## Límites y pendientes

- **Aceptación 2 (acciones según permisos del servidor) queda pendiente por diseño:** aún no existen comandos de edición, reasignación, movimiento, cierre ni baja; las banderas `accionesPermitidas` ya llegan en cada elemento y T34–T39 las consumen. La ficha no muestra ningún botón de mutación (verificado en la prueba).
- Filtro por etapa y por cliente disponibles en la API pero sin control en esta pantalla. Sin recorrido manual con API real ni revisión visual (a cargo del usuario).
- Revisión independiente pendiente. Auditorías npm y Gitleaks no ejecutados.
