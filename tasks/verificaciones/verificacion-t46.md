# Verificación T46: retiro del legado y coherencia de contratos

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Inventario y limpieza

- **Rutas HTTP:** `HttpContractTests` (descubrimiento MVC + OpenAPI) comprueba que solo existen las acciones de los controladores actuales y que las rutas de la primera entrega no están publicadas; el único `AllowAnonymous` son `GET /auth/csrf` y `POST /auth/login`, sin registro público. Las 70 operaciones se documentan en [api-implementada.md](../../docs/segunda-entrega/api-implementada.md) (nuevo), generado del OpenAPI real: ningún endpoint alternativo de modificación ni cuerpo con actor/autor.
- **EF/SQL:** se retiró la entidad `MotivoRechazo` (`DbSet`, mapeo `motivo_rechazo` y clase), mapeada a una tabla que el esquema objetivo no tiene y sin consumidores. No quedan tipos de líneas ni de log genérico de oportunidades (retirados en T28); `Actividad` reemplazó a `ActividadOportunidad` (T40). La búsqueda de `OportunidadItem`, `LogOportunidad`, `ActividadOportunidad` y rutas de la primera entrega en el código backend no arroja referencias.
- **Frontend:** se retiró el contrato anterior que seguía en `client.ts` (`legacyApi`, `getOpportunitiesByStage`, `getCustomerStates`, `getCommercialOrigins`, `getCompanies`, `getContacts`, `opportunityQueryKeys.pipeline` y los tipos asociados), el archivo `api/legacy-schema.d.ts` (1.689 líneas, copia histórica del esquema anterior) y el panel de inicio de la primera entrega (`features/home`: `HomePage`, su prueba y estilos), que no estaba publicado en `App` (la ruta `/inicio` real es `AccessHome`) y dependía de ese contrato. Esta última retirada incluye una prueba (`HomePage.test.tsx`, 1 caso) cuyo código ya no existe; el panel debería reescribirse sobre los contratos actuales si se quisiera recuperar. `test/LegacyApp.tsx` se conserva solo como arnés de pruebas con identidad ficticia (su `/inicio` ahora es un marcador) para las suites que lo usan; migrarlas al `App` real queda como deuda de pruebas.
- **Tipos:** `npm run api:types` contra la API local no produce cambios en `schema.d.ts` (comparado byte a byte antes y después), sin edición manual.

## Resultados

- Backend: build sin errores ni advertencias; **suite completa 171/171** (11 min 37 s) con el modelo sin `MotivoRechazo`.
- Frontend: **144/144** (18 archivos; 145 menos la prueba retirada); `tsc -b`, `npm run build` correctos; `npm run lint` solo con la advertencia previa.
- `git diff --check` limpio.

## Pendientes

- Migrar las suites que usan `LegacyApp` al `App` real (deuda de pruebas; no bloquea). Revisión independiente pendiente.
