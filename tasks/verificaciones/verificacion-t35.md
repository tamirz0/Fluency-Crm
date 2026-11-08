# Verificación T35: reasignación de oportunidades

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `POST /oportunidades/{id}/reasignar` con `{ idResponsable }` (política `GestionarOportunidad`). Solo el responsable vendedor o un superior (403); la oportunidad debe estar vigente (404) y abierta (409: una cerrada exige reapertura). El vendedor solo puede elegir un vendedor activo; administrador y responsable comercial, cualquier usuario activo (400 `REFERENCE_UNAVAILABLE` en caso contrario). Mismo destino: sin cambios. Propiedades desconocidas: 400.
- La propiedad se relee dentro de una transacción Serializable. Responde con `accionesPermitidas` recalculadas para quien reasigna: el responsable anterior conserva la lectura y recibe 403 en la siguiente mutación (edición o reasignación). No se crea entrada de historial ni se tocan los responsables de empresas/contactos.
- UI: botón «Reasignar» en la ficha solo con `accionesPermitidas.reasignar`; diálogo con selector de responsables (el vendedor solo ve vendedores mediante `rol=VENDEDOR`; un superior ve todos), envía solo `idResponsable`, muestra el rechazo del servidor sin cerrarse, evita doble envío, actualiza ficha y caché (`oportunidades` queda invalidada: tabla y funnel) y, al terminar, retira «Editar» y «Reasignar». `CompanyResponsibleSelect` admite un rol opcional.
- `schema.d.ts` regenerado con `npm run api:types` contra la API local; la API se detuvo al terminar.

## Resultados

- Build backend: 0 errores, 0 advertencias.
- `ReasignacionTests` **2/2** y `HttpContractTests` 19/19 (57 acciones): **21/21** en 3 min 52 s. El primero usa dos sesiones de vendedor más una cuenta solo-gerente y otra desactivada: destinos inválidos, cuerpo inválido, reasignación válida con permisos recalculados, lectura conservada y 403 del anterior, no-op, ajena, cerrada, baja e inexistente, y elección libre de un superior. El segundo ejecuta cinco rondas de edición contra reasignación simultáneas: nunca un error de servidor y, si la reasignación se confirma, el anterior ya no escribe.
- Frontend completo **119/119**; `tsc -b` y `npm run build` correctos; `npm run lint` solo con la advertencia previa. Dos pruebas nuevas en `forms.test.tsx` (reasignación de un vendedor con retiro de la edición y rechazo 403 de un superior) y la de visibilidad ampliada.

## Límites y pendientes

- La carrera es representativa, no exhaustiva (cinco rondas). Sin recorrido manual con API real ni revisión visual.
- Revisión independiente, auditorías npm y Gitleaks pendientes.
