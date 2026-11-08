# Verificación T03 y CP01

Fecha: 11/10/2026. Rama: `segunda-entrega-t03-pruebas-aisladas`, desde `segunda-entrega` / `d2448d4`. El árbol estaba limpio al retomar. T01/T02 ya estaban integradas; no se repitió su implementación ni se consultó el remoto. Evidencias anteriores: [T01](verificacion-t01.md), [T02](verificacion-t02.md).

## Decisiones y alcance

El usuario confirmó una base exclusiva `fluency_segunda_entrega_test` en `localhost:5433` y un esquema único por ejecución con una tabla de infraestructura. Aprobó limpiar únicamente esos objetos, conservar la base y dejar los restos de interrupciones para revisión. No se autorizaron barridos, cascadas ni reconstrucciones de bases existentes.

Se comprobó el contenedor local, publicado exclusivamente en `127.0.0.1:5433` hacia `5432/tcp`. La base no existía: se creó explícitamente y se verificaron identidad, propietario y cero tablas. Se guardó `ConnectionStrings:SegundaEntregaTestDB` en el almacén User Secrets de la API, conservando `ConnectionStrings:SegundaEntregaDB`. El usuario confirmó la importación de la nueva clave desde Windows Terminal; no se ejecutaron tests desde su terminal. Las ejecuciones registradas aquí corresponden a Codex, cuyo almacén está redirigido a LocalCache. No se imprimieron credenciales ni cadenas de conexión.

T03.a añade el proyecto xUnit/VSTest, validación de configuración, fixture y pruebas; la API solo expone `public partial class Program` y la solución incorpora el proyecto. T03.b documenta configuración, límites y CP01. Paquetes nuevos: `Microsoft.AspNetCore.Mvc.Testing` 10.0.11, `Microsoft.NET.Test.Sdk` 18.10.0, `xunit` 2.9.3 y `xunit.runner.visualstudio` 4.0.1. No se actualizaron paquetes existentes ni se añadieron proveedores InMemory, contenedores de tests o cobertura.

El fixture usa exclusivamente la clave de tests, valida host local único/puerto/base/credenciales antes de conectar y comprueba identidad, propietario y OID de la base antes de crear recursos. Fuerza search path propio y Options explícitos, neutralizando PGOPTIONS ambiental; desactiva logging de parámetros y detalles sensibles. Crea un esquema GUID y `probe` transaccionalmente. La limpieza asíncrona cierra el host y vuelve a comprobar destino, propietarios y OID antes de `DROP TABLE ... RESTRICT` y `DROP SCHEMA ... RESTRICT`, en transacción. No limpia recursos de otras ejecuciones.

El test positivo usa el pipeline HTTP real para consultar OpenAPI y la conexión Npgsql del DbContext registrado para persistir un UUID. Una segunda conexión confirma la lectura. Al finalizar, comprueba que desapareció su esquema. Esto prueba infraestructura HTTP y PostgreSQL, **no una mutación comercial por HTTP**. No se creó el esquema comercial de T04.

## Resultados

| Comprobación | Resultado | Duración |
|---|---|---|
| Creación explícita de base y configuración local | Base nueva, propietario verificado, cero tablas; secreto de desarrollo conservado. | 3,03 s |
| `dotnet restore backend/FluencyAPI.slnx --verbosity minimal` | Correcto; tres proyectos ya restaurados y proyecto de tests restaurado. | 6,89 s |
| `dotnet build backend/FluencyAPI.slnx --no-restore -m:1` | Correcto; cero errores y advertencias. | 14,93 s |
| Suite backend completa, comando abajo | 26/26 correctas; cero omitidas. Incluye compilación del último ajuste de tests. | 20,48 s; runner: 12 s |
| Segunda ejecución de `DatabaseIsolationTests`, comando abajo | 5/5 correctas; nuevo ciclo real de creación, persistencia y limpieza. | 14,90 s; runner: 12 s |
| Auditoría .NET con transitivas | Cuatro proyectos; cero vulnerabilidades reportadas. | 10,01 s |
| Arranque real con host remoto ficticio en Development | Rechazado antes de escuchar; valor ficticio ausente del diagnóstico. | 3,51 s |
| `npm run build`, desde frontend | Correcto; TypeScript y Vite. | Total sin instrumentar; Vite: 6,71 s |
| `npm run lint`, desde frontend | Correcto; solo advertencia previa `react/only-export-components` en providers.tsx:9. | 5,75 s de herramienta |
| Suite frontend completa, comando abajo | Ocho suites y 71/71 pruebas correctas. | 207,54 s; Vitest: 204,93 s |
| GET OpenAPI directo, HTML frontend y OpenAPI por proxy | Tres respuestas 200. | 0,65 s |
| Consultas finales de solo lectura | Tests: cero tablas y cero esquemas de fixture. Desarrollo: cero tablas y cero esquemas de fixture. Ambas identidades/propietarios correctos. | 0,56 s |
| Gitleaks: foto del árbol actual, incluidos nuevos | 163 archivos, cero hallazgos; foto fuera de node_modules y eliminada tras verificar su ruta propia. | 2,31 s |
| Gitleaks: índice de los siete archivos de código | Correcto, cero hallazgos antes del commit `c78dcc3`. | 0,54 s |
| Gitleaks: siete documentos completos por stdin | Correcto, cero hallazgos; incluye evidencia nueva. | 0,44 s |

La suite frontend supera el presupuesto operativo aproximado de 90 segundos; se completó, sin cortar pruebas ni cambiar timeouts/aislamiento para obtener un resultado verde. B7 no se reprodujo esta vez; no se modificó su prueba ni se resolvió su causa. B8 sigue pendiente: no se cambiaron dependencias frontend ni se repitió npm audit. La auditoría .NET sí incluye las dependencias nuevas de T03.

## Comandos reproducibles

Desde raíz, con la base exclusiva identificada y User Secrets configurado según [la guía local](../../docs/segunda-entrega/entorno-local.md#pruebas-http-y-postgresql-t03):

```powershell
dotnet restore backend/FluencyAPI.slnx --verbosity minimal
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --logger 'trx;LogFileName=t03.trx' --results-directory node_modules/.tmp/t03-controls
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-build --no-restore --filter 'FullyQualifiedName~DatabaseIsolationTests' --logger 'trx;LogFileName=t03-repeat.trx' --results-directory node_modules/.tmp/t03-controls
dotnet list backend/FluencyAPI.slnx package --vulnerable --include-transitive --no-restore --format json
git diff --check
```

La suite tiene 21 casos de configuración/identidad y cinco de aislamiento (un ciclo real y cuatro rechazos de OID/propietarios sustituidos). Los negativos puros no abren conexiones, incluidos host remoto/múltiple/socket, puerto o base incorrectos, falta de credenciales, Options externos y ausencia de clave de tests pese a tener desarrollo configurado. No se conectó a Azure ni a destinos ficticios.

Desde `frontend`:

```powershell
npm run build
npm run lint
$taskTemp = Join-Path (Get-Location) 'node_modules/.tmp/t03-controls'
New-Item -ItemType Directory -Force -Path $taskTemp | Out-Null
$env:TEMP = $taskTemp
$env:TMP = $taskTemp
npm run test:run -- --maxWorkers=1 --no-file-parallelism
```

El log de frontend queda en `frontend/node_modules/.tmp/t03-controls/frontend-tests.log`. Los informes TRX están en `node_modules/.tmp/t03-controls`. Todo queda ignorado; no se agregó a Git.

La comprobación de rechazo de arranque ejecutó un proceso propio `dotnet backend/FluencyAPI/bin/Debug/net10.0/FluencyAPI.dll`, con directorio de trabajo de la API, entorno Development y la clave de desarrollo sustituida **solo en ese proceso** por host `example.invalid`, base/usuario ficticios y un marcador de contraseña construido en memoria. Exigió salida no exitosa, diagnóstico `host local`, ausencia de `Now listening` y ausencia del marcador. Se redirigió la salida sin imprimirla y se dispuso el proceso; no se envió SQL a ese destino. El caso permanente de rechazo remoto también forma parte de `TestDatabaseSettingsTests`.

La API local se inició con `dotnet run --no-build --no-restore --project backend/FluencyAPI --launch-profile http`, comprobando antes la conexión de desarrollo en memoria y retirando overrides de conexión del proceso. El log confirmó Development y puerto 5169. El frontend preexistente en 5173 se conservó. Con `Invoke-WebRequest -NoProxy -TimeoutSec 15 -MaximumRedirection 0`, los GET a `http://127.0.0.1:5169/openapi/v1.json`, `http://127.0.0.1:5173/` y `http://127.0.0.1:5173/api/openapi/v1.json` respondieron 200. No se regeneraron tipos: no cambió el contrato.

Las consultas finales usaron psql dentro del contenedor identificado, con credenciales en memoria/entorno restaurado al terminar, sin exponer valores. Comprobaron para las dos bases acordadas `current_database()`, propietario, número de tablas de aplicación y número de esquemas con prefijo `t03_`; fueron consultas de inventario, no barridos de borrado. La base anterior no se modificó.

## Revisión y límites de CP01

Revisión independiente de código con GPT-6.1 Sol/High: sin bloqueantes; no repitió pruebas ni conexiones. El implementador también usó Sol/High por tratarse de aislamiento SQL y limpieza. La revisión cubrió destino, configuración temprana de WebApplicationFactory, identidad, transacciones y limpieza propia; el orquestador ejecutó los controles registrados.

Los recorridos habilitados de inicio/OpenAPI/proxy y la suite existente se comprobaron. Login y operaciones comerciales sobre el modelo nuevo todavía no están habilitados con desarrollo vacío; corresponden a las tareas siguientes. Los tests usan Development explícito para consultar el OpenAPI existente, sin añadir modos o endpoints de prueba a producción. Search path separa nombres, pero no es una barrera de permisos del rol local. La preparación y limpieza del futuro esquema comercial deberá concretarse en T04.

`git diff --check` y revisión de nuevos/alcance correctos. Se validaron 53 destinos de enlaces locales y la sintaxis de 12 snippets PowerShell sin ejecutarlos. La revisión independiente final de documentación también terminó sin bloqueantes.

Gitleaks 8.30.1 verificado en T01 analizó una foto de 163 archivos de trabajo, incluidos nuevos, fuera de node_modules, sin hallazgos; se eliminó únicamente esa foto tras validar su ruta temporal propia. También pasó el índice de los siete archivos de código antes de guardar `c78dcc3` y los siete documentos completos por stdin al cerrar. Esto no acredita un historial sin secretos: el antecedente de B4 sigue en el historial y el scanner no lo detectó en T02. El índice documental final se vuelve a comprobar como condición del commit.

T03 y CP01 verificadas; código guardado en `c78dcc3`. Backend y frontend quedan activos en 5169/5173; comprobar sus procesos en la próxima sesión. No se ha hecho merge ni push. La integración requiere el OK específico del usuario; T04 no se inició.
