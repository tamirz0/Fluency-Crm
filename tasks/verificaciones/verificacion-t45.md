# Verificación T45: historial comercial en las tres fichas

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `CommercialHistory` (`features/activities/CommercialHistory.tsx`), componente único montado en las fichas de empresa, contacto y oportunidad. Consulta una sola proyección paginada del servidor (`/empresas|contactos|oportunidades/{id}/historial-comercial`, 10 por página con paginador): cada actividad muestra tipo, cuándo ocurrió, quién y cuándo la registró, descripción y resultado; cada transición, «Cambio de etapa: A → B» (la primera, «Alta de la oportunidad → …»), autor, fecha y observación. Fuera de la oportunidad se enlaza la oportunidad de cada entrada.
- Acciones por actividad según lo que devuelve el servidor (`accionesPermitidas`, ahora incluido en las entradas ACTIVIDAD del historial: sin oportunidad, gestión compartida; con oportunidad, su responsable vendedor actual o un superior). La lectura ajena no se oculta. «Editar» carga la actividad vigente (`GET /actividades/{id}`) y abre el editor de T43; «Dar de baja» usa la confirmación existente. Tras guardar, editar o dar de baja se invalidan las cachés y el historial se recarga; las bajas desaparecen sin tarjeta ni reubicación (el historial de una empresa usa sus FKs directas).
- La ficha de oportunidad sustituye la tabla «Historial de etapas» de T32 por este historial (las transiciones forman parte de él). La ficha de empresa suma el botón «Registrar actividad» (completa el montaje de T42). Estados vacío, error con reintento y carga; `schema.d.ts` regenerado con `npm run api:types` (la API local se detuvo al terminar).

## Resultados

- Frontend completo **145/145** (19 archivos); `tsc -b` y `npm run build` correctos; `npm run lint` solo con la advertencia previa. `CommercialHistory.test.tsx` 7/7: proyección y orden, enlaces según contexto, acciones solo donde se permite, edición con PATCH diferencial y recarga, baja con confirmación y recarga, paginación contra el servidor, vacío y error con reintento. Ajustes legítimos de `Consultations.test.tsx` (ficha de contacto y de oportunidad) y del mock de `forms.test.tsx` por el nuevo historial.
- Backend: `HistorialComercialTests` 1/1 (4 min 32 s) con la nueva comprobación de `accionesPermitidas` (oportunidad ajena sin acciones; propia y compartida con acciones; transiciones sin acciones). Build sin errores ni advertencias.

## Límites y pendientes

- Recorrido manual de la historia compartida y revisión visual a cargo del usuario. Revisión independiente, auditorías y Gitleaks pendientes. El cierre del módulo está en CP15.
