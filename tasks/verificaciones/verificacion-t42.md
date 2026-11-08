# Verificación T42: registro de actividades desde las fichas

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `frontend/src/features/activities/ActivityForm.tsx`: `ActivityDialog` y `RegisterActivityButton` reutilizables. El editor recibe las asociaciones de la ficha (`idEmpresa`, `idContacto`, `idOportunidad`) y no pide repetirlas; solo envía los campos editables: tipo activo (catálogo `tipos-actividad`), cuándo ocurrió (fecha y hora, por defecto ahora, no futura), descripción obligatoria y resultado opcional (se omite si está vacío). Autor y fecha de registro no viajan.
- Montaje: ficha de oportunidad (con las asociaciones conservadas de la oportunidad y solo si `accionesPermitidas.gestionarActividades`, también si está cerrada, sin tocar su estado) y ficha de contacto (gestión compartida). La ficha de empresa se completa en T45, como indica la tarea.
- Validación visible antes de enviar; el rechazo del servidor (403/400) se muestra sin cerrar el editor ni perder lo escrito, con control de doble envío. Al guardar se invalida la caché `actividades` y la ficha confirma «Actividad registrada».
- `schema.d.ts` regenerado con `npm run api:types` contra la API local; la API se detuvo al terminar. `client.ts`: `createActivity`, `listActivities` y tipos.

## Resultados

- Frontend completo **135/135** (18 archivos); `tsc -b` y `npm run build` correctos; `npm run lint` solo con la advertencia previa (una advertencia nueva de pureza —fecha leída en el render— se corrigió validando al enviar).
- `ActivityForm.test.tsx` 3/3: alta desde una oportunidad cerrada con cuerpo exacto (asociaciones incluidas, texto recortado, instante de ayer), validaciones (tipo, descripción, fecha futura) con resultado vacío omitido, y rechazo 403 sin cerrar ni duplicar. `forms.test.tsx` comprueba que el botón de la ficha depende de la acción del servidor.

## Límites y pendientes

- Sin recorrido manual con API real (alta desde una oportunidad cerrada comprobando que su estado no cambia: la API lo cubre en `ActividadesTests`) ni revisión visual. La lectura de actividades en las fichas llega con T45. Revisión independiente, auditorías y Gitleaks pendientes.
