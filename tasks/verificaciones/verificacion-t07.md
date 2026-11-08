# Verificación T07: contrato HTTP y corte de rutas anteriores

Fecha: 12/10/2026. Rama `segunda-entrega-t07-contrato-http`, desde `segunda-entrega` / `c363670`. Usuario autorizó integrar T07 si tests/revisión aprobaban y continuar con T08. Integrado localmente: código `8d1601d`, merge `10d8a0a`, después de la aprobación independiente. CP03 sigue pendiente de T08–T09; T07 es preparación y no se presenta como acceso funcional.

## Resultado

- Convenciones comunes ProblemDetails con code/traceId, binding explícito, JSON desconocido/duplicado rechazado, contratos PageQuery/PageResponse y base PATCH con presencia y rechazo de objeto vacío. Se reutiliza el patrón de setters init ya existente, sin converter ni JSON Patch.
- Ocho controladores anteriores/23 acciones excluidos del descubrimiento MVC, incluidas mutaciones alternativas y registro público. Inventario de descriptores real: cero acciones; OpenAPI `paths` vacío. [Inventario y procedimiento de sustitución](../../docs/segunda-entrega/contrato-http.md).
- App no monta rutas antiguas ni una página informativa, conforme a la aclaración del usuario. Las ocho pruebas existentes de acceso se conservan con un harness exclusivo de componentes anteriores; seis casos nuevos verifican que App no monta contenido ni consulta la API, incluso con usuario local guardado.

## Controles ejecutados

| Control | Resultado |
|---|---|
| `dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter FullyQualifiedName~HttpContractTests -m:1` | 19/19, cero fallos/omisiones; runner 1 s, comando 9,12 s. HTTP real mediante TestServer, sin conexión a base. |
| `dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~HttpContractTests\|FullyQualifiedName~DatabaseIsolationTests' -m:1` (el separador real dentro de las comillas es `|`, sin backslash) | 24/24, cero fallos/omisiones; runner 11 s. Incluye regresión del host real y esquema probe exclusivo local, limpiado por su fixture. |
| Mutación representativa | Se cambió temporalmente `ProvidedFields.Count == 0` por `== -1`. La prueba de `{}` falló al recibir 200 en lugar de 400; cinco casos restantes pasaron. Fuente restaurada en finally; verificación final 24/24 posterior a restaurar. |
| `npm run test:run -- src/App.test.tsx --maxWorkers=1 --no-file-parallelism` desde frontend | 14/14; 58,91 s. TEMP/TMP del proceso en `frontend/node_modules/.tmp/t07` según guía del sandbox. |
| `npm run build` desde frontend | TypeScript y Vite correctos; fase Vite 3,06 s. |
| `npm run lint -- src vite.config.ts` desde frontend | Sin errores; conserva warning previo `react/only-export-components` en `src/app/providers.tsx:9`. |
| `dotnet build backend/FluencyAPI.slnx --no-restore -m:1` | Build final en serie: cero errores/advertencias, MSBuild 1,75 s. Un intento anterior solapado con tests tuvo warning MSB3026 por DLL ocupada y reintentó con éxito. |
| `git diff --check` | Correcto; incluye revisión de archivos nuevos además del diff. |

Antes de la regresión PostgreSQL se revalidó el contenedor acordado: running, única publicación `127.0.0.1:5433` → `5432/tcp`. La fábrica de contratos usa un destino deliberadamente inutilizable y no necesita persistencia; la regresión existente utiliza exclusivamente `SegundaEntregaTestDB` y su esquema GUID, sin desarrollo ni producción.

## Incidencias resueltas y revisión

- Primer intento de tests dentro del sandbox: runner no pudo conectar con testhost en 90 s y anuló la ejecución. No se cuenta como RED funcional ni prueba aprobada. Ejecución fuera del sandbox autorizada, sin ampliar destino de las pruebas.
- Error de compilación inicial: opción del formatter colocada en MvcOptions en vez de JsonOptions; corregido sin supresiones.
- Primera ejecución efectiva: 18/19; ProblemDetails construido directamente en un controlador no recibía traceId. Se agregó un filtro de resultados que aplica la misma convención y conserva códigos de negocio; 19/19 posteriores.
- Revisión independiente GPT-6.1 Sol / High, según plan §6.1: sin hallazgos requeridos en código. Confirmó ocho controladores/23 acciones retiradas, errores/binding/PATCH/paginación coherentes y App vacía conforme a la aclaración. No ejecutó suites ni mutaciones; pidió distinguir pruebas del probe de recursos nuevos, distinción registrada arriba.

## Límites

No se ejecutaron suites completas backend/frontend, auditorías de dependencias ni ensayo en navegador: verificación focalizada al contrato y montaje real de App en jsdom, sin UI nueva. No hay dependencias nuevas. Deuda inicial de seguridad/lint conservada; no se modificaron controles ni bootstrap T06. Sin conexión Supabase/Azure, cuentas de desarrollo, despliegue, push ni cambios en main. PATCH/listados comerciales, cookies/CSRF y actor autenticado se acreditarán al implementar sus incrementos. Build final en serie completo; integración autorizada por el usuario condicionada a revisión final.
