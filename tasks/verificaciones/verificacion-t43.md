# Verificación T43: editar y dar de baja actividades

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `PATCH /actividades/{id}`: campos `idTipo`, `idEmpresa`, `idContacto`, `idOportunidad`, `fechaHora`, `descripcion`, `resultado` (omitir conserva; null limpia el resultado y las asociaciones opcionales; la descripción, el tipo y la fecha no pueden quedar vacíos; no se acepta una fecha futura). Autor, fecha de registro y baja llegan como propiedades desconocidas y se rechazan (400). Sin campos: 400.
- Permisos: se relee la actividad vigente (404 si no existe o fue dada de baja) y se exige gestionar la oportunidad de **origen** (su responsable vendedor actual o un superior, 403); si se cambia o se quita la oportunidad, también la de **destino**, de modo que un vendedor no elude la regla quitando una oportunidad ajena ni incorporando una ajena. Sin oportunidad, gestión compartida. Una actividad que cambió de dueño pasa al nuevo responsable: el anterior recibe 403 y su lectura muestra `accionesPermitidas` en falso.
- Asociaciones: editar texto, resultado, fecha o tipo no revalida la pareja histórica empresa/contacto (aunque el contacto haya cambiado de empresa). Un cambio efectivo valida el nuevo contexto: con oportunidad, empresa/contacto deben ser los de la oportunidad (400); sin oportunidad, los nuevos deben estar activos; siempre empresa o contacto. Un tipo nuevo debe estar activo.
- `DELETE /actividades/{id}`: baja lógica con el mismo permiso de origen, sin restauración, marcador ni cascadas (no cambian la oportunidad, el cliente ni el historial de etapas); repetir responde 404. Una actividad compartida la da de baja cualquier usuario activo.
- UI: `ActivityDialog` ahora también edita (`activity`): precarga tipo, fecha, descripción y resultado, envía un PATCH diferencial (sin asociaciones ni autor) y no llama a la API si nada cambió; `RemoveRecordButton` admite `actividad` con su confirmación y muestra el rechazo del servidor. El montaje en las listas de actividades llega con T45. `schema.d.ts` regenerado con `npm run api:types`; la API local se detuvo al terminar.

## Resultados

- Build backend: 0 errores, 0 advertencias.
- **24/24** en 6 min 17 s: `EdicionActividadTests` 2/2 (autor y registro intactos, sin revalidar la pareja histórica, campos y datos inválidos, referencias, origen/destino/desvinculación, cambio de dueño, baja sin cascadas ni restauración), más `ActividadesTests` 3/3 y `HttpContractTests` 19/19 (67 acciones).
- Frontend completo **138/138** (18 archivos); `tsc -b` y `npm run build` correctos; `npm run lint` solo con la advertencia previa. `ActivityForm.test.tsx` 6/6 (tres nuevas: sin cambios, PATCH diferencial y baja con rechazo y reintento).

## Límites y pendientes

- No se repitió la suite backend completa (último cierre CP13, 163/163). Revisión independiente, auditorías y recorrido manual pendientes.
