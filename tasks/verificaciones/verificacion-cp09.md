# CP09 — Contactos (en curso)

Inicio: 03/11/2026. Base `segunda-entrega` / `648853e` (CP08 integrada localmente). Rama `segunda-entrega-clientes`. Sin merge ni push autorizados. Este archivo cubre **T25**, **T26** y **T27**; la integración de T27 y del cierre de CP09 espera el OK del usuario.

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

## T27 — Bajas definitivas de clientes

Rama `segunda-entrega-bajas-clientes`, desde `segunda-entrega` / `0725237` (T26 integrada localmente con OK del usuario; sin publicar). Responsable único, backend y frontend.

### Alcance

- `DELETE /empresas/{id}` y `DELETE /contactos/{id}`: baja lógica (`activo = false`) en transacción Serializable, sin borrado físico, cascadas ni restauración; 204 si procede, 404 si no existe o ya fue dada de baja, 401 sin sesión, 409 `BUSINESS_CONFLICT` si está bloqueada.
- Bloqueos: empresa por contactos activos u oportunidades activas asociadas directamente; contacto por cualquier oportunidad activa (también ganada o perdida). Las actividades no bloquean. El 409 informa causas y cantidades («…porque tiene 3 contactos activos y 2 oportunidades activas.»).
- Las oportunidades se cuentan con SQL parametrizado vía `DbContext`, en la misma transacción: el modelo EF de oportunidades es el heredado y no tiene `activo` hasta T28. Sin llamar al servicio de oportunidades.
- Defecto de producto corregido: los filtros de errores de empresas y contactos solo desenvolvían un nivel de excepción, así que un `40001` (conflicto de serialización) llegaba como `InvalidOperationException` → `DbUpdateException` → `PostgresException` y respondía 500 en lugar de 409 `CONCURRENT_CHANGE`. Ahora toman `GetBaseException()`. Afectaba también a altas/ediciones concurrentes de T23/T25. Servicios, usuarios, embudos y catálogos conservan el patrón anterior (fuera de alcance).
- UI: botón «Dar de baja» en las fichas, con diálogo de confirmación (baja definitiva, sin restauración), mensaje del 409 dentro del diálogo y aviso «Empresa dada de baja» / «Contacto dado de baja» en el listado. `schema.d.ts` regenerado desde la API local (5169), sin edición manual; la API se detuvo al terminar.

### Resultados

- `BajasClientesTests` **2/2**: bloqueos por contacto y oportunidad, también ganada y perdida; actividad sin bloqueo; 204 y 404 posteriores (GET, DELETE, PATCH, listado); referencias y etiquetas conservadas (oportunidad, actividad y contacto siguen apuntando a la empresa dada de baja); empresa dada de baja no seleccionable; conteo plural; anónimo 401. Y seis rondas de baja contra alta concurrente de un contacto: nunca queda una empresa inactiva con contactos activos ni se aceptan ambas operaciones.
- Backend completo **138/138**, cero omitidas, 6 min 38 s.
- Frontend completo **114/114**, 14 archivos, 33,7 s (4 casos nuevos en `bajas.test.tsx`: baja correcta y bloqueo 409 para empresa y contacto). `npm run build` correcto; lint solo con la advertencia previa de `providers.tsx:9`.
- `git diff --check` sin hallazgos.

### Entorno e incidentes

- Primer intento de `BajasClientesTests` 0/2. (1) Los conteos «3 contactos y 27 oportunidades» eran **del fixture**: `SchemaTests.SeedContextAsync` hace `CROSS JOIN usuario` y, con los usuarios de `AuthApiFactory`, multiplica filas (81 oportunidades). Se reemplazó por un fixture mínimo propio. (2) La carrera devolvía 500: defecto de producto descrito arriba, evidenciado con el log del servidor (`40001` envuelto). No se debilitó ninguna aserción.
- Hallazgo de T25 sin corregir: `ContactosTests.ChangingOrRemovingTheCompany…` usa ese mismo seed multiplicado y comprueba la oportunidad con `SELECT … FROM oportunidad` sin filtro (primera fila). Pasa y el producto no toca oportunidades, pero la aserción es más débil de lo que parece; queda propuesto endurecerlo con un fixture propio.

### No ejecutado (no aprobado)

- Análisis de secretos con Gitleaks: no ejecutado; CP09 no agrega secretos ni dependencias.
- Limpieza comprobada de esquemas `t03_*` en la base de tests: no verificada (sin `psql` en el shell del agente).

### Comandos reproducibles

```powershell
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter "FullyQualifiedName~BajasClientesTests"
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore
cd frontend; npm run api:types   # con la API local en 5169
npx vitest run; npm run build; npm run lint
```

## Recorrido manual de T27

Recorrido de bloqueo y de baja válida aprobado por el usuario el 03/11/2026 en el entorno local.

## Revisión independiente de CP09

`/code-review` nivel medium sobre `648853e..HEAD` (T25, T26, T27), 03/11/2026. Es la revisión de la herramienta, no el modelo GPT-6.1 Sol/Medium del plan §6.1. Diez hallazgos, contrastados uno por uno con el código:

**Obligaciones para T28 (válidas, sin consumidor hoy: `OportunidadesController` sigue retirado):**
- `OportunidadService` valida contacto y empresa solo por existencia (`AnyAsync(c => c.Id == …)`), sin `Activo`. Al reactivar oportunidades debe exigir empresa y contacto activos y escribir en transacción Serializable, para que `DeleteAsync` de clientes cierre la carrera también con altas de oportunidades.
- `OportunidadService.ContactoPerteneceAEmpresaAsync` rechaza oportunidades cuyo contacto ya no pertenece a la empresa. Contradice la regla de T25 (cambiar o quitar la empresa del contacto no toca oportunidades); debe retirarse en el corte de oportunidades.

**Limitación conocida (ya documentada):** `getContacts()` trae los primeros 100 contactos para Inicio y el formulario de oportunidades, ambos hoy sin ruta. Se resuelve cuando se migren.

**Descartados:**
- `IdEstado!.Value` con valores nulos: `contacto.id_estado` es `NOT NULL` en el esquema.
- Falta de reintento o `RollbackAsync` en Serializable: el 409 `CONCURRENT_CHANGE` sin reintentos automáticos es el contrato acordado, y `DisposeAsync` revierte la transacción.
- `SingleOrDefaultAsync` con dos estados «Potencial»: `CatalogoService` rechaza etiquetas duplicadas (409 `DUPLICATE_VALUE`, sin distinguir mayúsculas).
- Búsqueda con `translate`/`lower` y escaneo: mismo patrón ya revisado en empresas (T23), con volúmenes del proyecto.
- Caché tras la baja: al volver atrás la ficha refresca y muestra «No encontramos…», que es el comportamiento esperado.
- `page` muy grande: devuelve vacío; mismo comportamiento que empresas.

**Mejora opcional, no aplicada:** debounce en el buscador de `ContactCompanySelect` (una petición por tecla; igual que `CompanyResponsibleSelect`).
