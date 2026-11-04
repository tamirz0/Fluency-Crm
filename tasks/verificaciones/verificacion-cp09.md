# CP09 — Contactos (en curso)

Inicio: 03/11/2026. Base `segunda-entrega` / `648853e` (CP08 integrada localmente). Rama `segunda-entrega-clientes`. Sin merge ni push autorizados. Este archivo cubre **T25** y **T26**; T27 y el cierre de CP09 siguen pendientes.

## T25 — Alcance

Responsable único (Sol/Medium), solo backend. Reemplaza la API retirada de contactos por `GET/POST /contactos` y `GET/PATCH /contactos/{id}` con el patrón de empresas (T23): permisos abiertos a todo usuario activo, PATCH diferencial atómico, transacción Serializable, filtro de errores con `code`. Cambiar o quitar la empresa modifica solo la FK del contacto (se eliminó el rechazo por oportunidades). El historial de etapas del contacto no se migra: lo aporta el contrato de actividades (T44). Sin `DELETE` (T27). Revisión independiente agrupada al cierre de CP09.

## Entorno e incidentes

- Destino de tests: `localhost:5433/fluency_segunda_entrega_test`, clave `ConnectionStrings:SegundaEntregaTestDB` en User Secrets. Las guardas del fixture no se tocaron.
- Primeras ejecuciones de `ContactosTests` fallaron 3/3 por **configuración local, no por producto**: primero faltaba la clave de tests; luego estaba con puerto `5432` y un punto final en el nombre de la base. El operador las corrigió; el fixture las rechazó correctamente mientras tanto.
- Sin cambios de producto por esos fallos. Sin Supabase ni reconstrucción de bases.

## Resultados

- Build de la solución sin advertencias ni errores (compilación previa a las pruebas).
- `ContactosTests` **3/3**, 5 min 9 s: roles y defaults, PATCH diferencial atómico, referencias inactivas conservadas/no reseleccionables, cambio A→B y desvinculación sin tocar la oportunidad, filtros combinados antes del conteo, búsqueda por razón social y diacríticos, paginación con orden estable, 401/404/400.
- Regresión `HttpContractTests` + `ClientesModelTests` + `EmpresasTests` **23/23**, 3 min 48 s. `HttpContractTests` actualizado: 48 acciones, `ContactoController` habilitado e inventario OpenAPI con `/contactos` y `/contactos/{id}`.
- `git diff --check` sin hallazgos.

## No ejecutado (no aprobado)

- Suite backend completa: se reserva para el cierre de CP09 (plan §5).
- Frontend, regeneración de `schema.d.ts` y recorrido manual: corresponden a T26.
- Revisión independiente: agrupada en CP09.
- Conteo de esquemas `t03_*` residuales tras las pruebas: no comprobado en esta sesión (sin acceso a `psql`/Docker desde el shell del agente).
- Los tiempos de los tests (≈1–2 min por caso) son altos para una base local; no se investigó.

## Comandos reproducibles

Desde la raíz:

```powershell
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter "FullyQualifiedName~ContactosTests"
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-build --filter "FullyQualifiedName~HttpContractTests|FullyQualifiedName~ClientesModelTests|FullyQualifiedName~EmpresasTests"
git diff --check
```

## T26 — Pantallas de contactos

Rama `segunda-entrega-contactos-ui`, desde `segunda-entrega` / `0d137b8` (T25 integrada localmente por fast-forward con OK del usuario; sin publicar). Responsable único, solo frontend.

### Alcance

- `api/client.ts`: `listContacts`, `getContact`, `createContact` y `patchContact` pasan a `/contactos` con el cliente tipado y `getResponseData`; se retiran los tres consumidores y los tipos de la API antigua. `getContacts()` se conserva como adaptación (primeros 100) para Inicio y el formulario de oportunidades, que se migran en sus propias tareas.
- `schema.d.ts` regenerado con `npm run api:types` contra la API local (puerto 5169, Development), sin edición manual; la API se detuvo al terminar.
- Listado: búsqueda, estado, origen, empresa, responsable y paginación en servidor; columna Responsable. Selector de empresa nuevo (`ContactCompanySelect`) con búsqueda en servidor, porque el anterior solo cargaba 25 empresas.
- Formulario: sin bloqueo por oportunidades ni consulta al embudo; aviso informativo «Cambiar o quitar la empresa solo actualiza este contacto. Las oportunidades y actividades anteriores conservan sus relaciones.» en edición; selector de responsable; estado/origen con etiqueta histórica e «(inactivo)».
- Ficha: responsable, fecha de creación y estado/origen con disponibilidad. Se quitó el placeholder desde la caché del listado antiguo.
- `App.tsx` publica `/contactos`, `/contactos/nuevo`, `/contactos/:id` y `/contactos/:id/editar`; el enlace «Contactos» sale del bloque `commercial` del menú.

### Resultados

- Suite frontend completa **110/110**, 13 archivos, 31,5 s. Cubre: PATCH diferencial y `null`, cambio de empresa A→B enviando solo `idEmpresa: 8` sin consultar oportunidades, quitar empresa con `idEmpresa: null`, aviso de conservación, búsqueda/filtros/limpieza y página siguiente con parámetros al servidor, ficha con responsable inactivo, rutas habilitadas en `App` y consumidores de Inicio/Oportunidades con la nueva respuesta paginada.
- `npm run build` (tsc + Vite) correcto. `npm run lint`: solo la advertencia previa `react/only-export-components` en `providers.tsx:9`.
- `git diff --check` sin hallazgos.
- La integración A→B contra PostgreSQL real ya está probada por `ContactosTests` (T25); T26 prueba el contrato que envía la UI.

### Recorrido del operador

Aprobado por el usuario el 03/11/2026 en el entorno local (API en 5169, Vite, base de desarrollo con administrador inicial propio): alta de contactos, cambio de empresa A→B con aviso de relaciones conservadas y quitar empresa. La oportunidad asociada no es visible en el navegador hasta T28; esa conservación queda acreditada por `ContactosTests` (T25) contra PostgreSQL real.

### Entorno e incidentes

- Faltaba `frontend/node_modules`: se instaló con `npm ci --no-audit --no-fund` desde el lockfile (218 paquetes, 43 s); sin cambios en manifiestos.
- Primera edición de `client.ts` con Python convirtió los saltos de línea a CRLF y mostró el archivo entero como modificado; se normalizó a LF antes de continuar.
- Primera ejecución de los archivos afectados: 5 fallos esperados por el cambio de contrato (listado antiguo, búsqueda en cliente, ruta retirada); se adaptaron los tests, no las aserciones de negocio. Quedó un `waitFor` sin uso que el build detectó y se retiró.

### No ejecutado (no aprobado)

- Suite backend completa, revisión independiente y análisis de secretos (Gitleaks): se reservan para el cierre de CP09; T26 no agrega secretos ni dependencias.
- Inicio muestra el total de contactos sobre los primeros 100 (y empresas sobre 25, como en T24); su exactitud queda para la tarea que migre esa pantalla.

### Comandos reproducibles

Desde `frontend`, con la API local en 5169 solo para regenerar tipos:

```powershell
npm ci --no-audit --no-fund
npm run api:types
npx vitest run
npm run build
npm run lint
```
