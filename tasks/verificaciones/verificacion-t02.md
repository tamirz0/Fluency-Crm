# Evidencia de T02: configuración local segura

Fecha: 11/10/2026. Base `segunda-entrega` / `01e96ec`; rama `segunda-entrega-t02-configuracion-local`. Alcance y subdivisión en [todo.md](../todo.md#t02). Guía operativa en [entorno-local.md](../../docs/segunda-entrega/entorno-local.md).

## Decisiones y cambios

El usuario eligió User Secrets de .NET y una base nueva vacía `fluency_segunda_entrega_dev` en el mismo contenedor local, usando las credenciales proporcionadas. No se reabrieron decisiones funcionales ni se cambió infraestructura.

- `FluencyAPI.csproj`: `UserSecretsId`, inicializado mediante `dotnet user-secrets init --project backend/FluencyAPI`. No es secreto ni dependencia nueva.
- `Program.cs`: clave exclusiva `SegundaEntregaDB`, rechazo temprano de ausencia/blancos/formato inválido, `Host`/`Database` obligatorios y host local único en Development. Diagnósticos sin valores ni inner exception del parser. Sin validación por conexión en el arranque.
- `FluencyLocalDbContext.cs`: eliminado `OnConfiguring` con contraseña de respaldo; constructores y mapeos conservados.
- Base creada explícitamente, después de consultar el catálogo y comprobar que no existía. Propietario coincide con el usuario utilizado; cero tablas de aplicación. Ninguna operación de borrado/reconstrucción ni escritura de datos comerciales.
- `ConnectionStrings:SegundaEntregaDB` guardada en User Secrets mediante JSON por stdin. La contraseña no se incluyó en argumentos, mensajes o archivos versionados. `appsettings.json` quedó idéntico al inicio (comparación SHA-256), fuera del cambio.

Se usó un implementador GPT-6.1 Sol/High para Program/DbContext; el orquestador coordinó la configuración del perfil, Docker, documentación y comprobaciones. Las escrituras sobre archivos y bases estuvieron separadas.

## Comprobaciones

| Control | Resultado | Duración |
|---|---|---|
| `dotnet build backend/FluencyAPI.slnx --no-restore -m:1` final | Exit 0, cero errores y advertencias. | 4,38 s |
| Siete procesos con configuraciones negativas | 7/7: exit no cero, diagnóstico esperado, sin escuchar ni imprimir el valor ficticio. | 18,00 s |
| Arranque Development con User Secrets, sin variable que sobrescriba la clave nueva | API escucha en `http://localhost:5169`. | No cronometrado |
| GET OpenAPI directo y por proxy Vite | `http://127.0.0.1:5169/openapi/v1.json` y `http://127.0.0.1:5173/api/openapi/v1.json`: 200. | 0,55 s juntos |
| Conexión TCP Npgsql leyendo User Secrets | Host local/puerto 5433/base acordada comprobados antes de abrir; SELECT confirmó identidad y cero tablas. Cero escrituras. | 2,35 s |
| Catálogo Docker/psql y base nueva | Inicialmente inexistente; creación explícita, propietario correcto y cero tablas; base anterior distinta y sin modificar. | No cronometrado |
| Gitleaks del árbol actual, 158 archivos | Exit 1 únicamente por `appsettings.json:10` preexistente; cero secretos nuevos. Sin supresiones. | 2,32 s |
| Gitleaks del índice (`git . --pre-commit --staged --redact=100`) | Exit 0, sin hallazgos; seis archivos previstos y configuración ajena fuera del índice, comprobada por SHA-256. | 0,61 s |
| Gitleaks del historial (`git . --log-opts='--all --no-textconv --no-ext-diff' --redact=100`) | Exit 0, sin hallazgos detectados. No certifica ausencia: el fallback histórico conocido por revisión estática no fue detectado por esas reglas. | 2,31 s |
| `git diff --check` y `git diff --cached --check` | Sin errores de whitespace; alcance propio revisado sin imprimir el bloque sensible eliminado. | No cronometrado |
| Revisión independiente GPT-6.1 Sol/High | Sin hallazgos bloqueantes ni cambios requeridos. Revisión estática de los seis archivos y evidencia conservada; no repitió procesos ni conexiones. | No cronometrado |

El build inicial también pasó (29,07 s); se repitió tras añadir la exigencia de `Host`/`Database`, no para acumular resultados sobre código idéntico. No se ejecutaron suites frontend ni auditorías de dependencias: no hubo cambios de UI, paquetes o lockfiles. El runner de tests .NET pertenece a T03; estos son controles de procesos reales y persistencia de solo lectura, no una suite automatizada HTTP. La deuda B7/B8 de T01 permanece registrada.

Casos negativos:

| Caso | Entorno | Entrada ficticia / resultado esperado |
|---|---|---|
| Ausencia real | Testing | Clave nueva ausente y User Secrets no cargado; «Falta configurar». La clave antigua sigue en appsettings y no se usa como respaldo. |
| Blancos | Development | Variable nueva con espacios, sobrescribiendo User Secrets; «Falta configurar». |
| Malformada | Development | Puerto no numérico con contraseña ficticia; «no es válida», sin el valor ni la excepción interna del parser. |
| Sin host | Production | Database presente, Host ausente; exige `Host y Database`. |
| Sin base | Development | Host local presente, Database ausente; exige `Host y Database`. |
| Remota | Development | `example.invalid`; exige host local único antes de escuchar. |
| Varios hosts | Development | `localhost,example.invalid`; mismo rechazo, sin intentar resolución/conexión. |

Para repetir las comprobaciones desde raíz con backend ya compilado, el siguiente verificador no toca User Secrets ni bases. Cada proceso hijo recibe solo un valor ficticio y tiene ventana oculta; se mata exclusivamente ese proceso si no rechaza la configuración a tiempo:

```powershell
$ErrorActionPreference = 'Stop'
[System.Text.Encoding]::RegisterProvider([System.Text.CodePagesEncodingProvider]::Instance)
$taskRoot = (Resolve-Path 'backend/FluencyAPI').Path
$taskDll = Join-Path $taskRoot 'bin/Debug/net10.0/FluencyAPI.dll'
$taskMarker = 'T02_' + 'DIAGNOSTIC_SENTINEL'
$taskCases = @(
    @('Testing', $null, 'Falta configurar'),
    @('Development', '   ', 'Falta configurar'),
    @('Development', "Host=localhost;Port=invalid;Password=$taskMarker", 'no es válida'),
    @('Production', "Database=unused;Password=$taskMarker", 'Host y Database'),
    @('Development', "Host=localhost;Password=$taskMarker", 'Host y Database'),
    @('Development', "Host=example.invalid;Database=unused;Password=$taskMarker", 'único host local'),
    @('Development', "Host=localhost,example.invalid;Database=unused;Password=$taskMarker", 'único host local')
)
foreach ($taskCase in $taskCases) {
    $taskStart = [System.Diagnostics.ProcessStartInfo]::new()
    $taskStart.FileName = (Get-Command dotnet).Source
    $taskStart.ArgumentList.Add($taskDll)
    $taskStart.WorkingDirectory = $taskRoot
    $taskStart.UseShellExecute = $false
    $taskStart.CreateNoWindow = $true
    $taskStart.RedirectStandardOutput = $true
    $taskStart.RedirectStandardError = $true
    $taskStart.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $taskStart.StandardErrorEncoding = [System.Text.Encoding]::GetEncoding(850)
    $taskStart.Environment['DOTNET_ENVIRONMENT'] = $taskCase[0]
    $taskStart.Environment['ASPNETCORE_ENVIRONMENT'] = $taskCase[0]
    $taskStart.Environment['ASPNETCORE_URLS'] = 'http://127.0.0.1:5182'
    [void]$taskStart.Environment.Remove('ConnectionStrings__SegundaEntregaDB')
    [void]$taskStart.Environment.Remove('ConnectionStrings:SegundaEntregaDB')
    if ($null -ne $taskCase[1]) { $taskStart.Environment['ConnectionStrings__SegundaEntregaDB'] = $taskCase[1] }
    $taskProcess = [System.Diagnostics.Process]::Start($taskStart)
    $taskStdout = $taskProcess.StandardOutput.ReadToEndAsync()
    $taskStderr = $taskProcess.StandardError.ReadToEndAsync()
    if (-not $taskProcess.WaitForExit(15000)) {
        $taskProcess.Kill($true)
        throw 'La configuración inválida no fue rechazada a tiempo.'
    }
    $taskOutput = $taskStdout.GetAwaiter().GetResult() + $taskStderr.GetAwaiter().GetResult()
    $taskPassed = $taskProcess.ExitCode -ne 0 -and $taskOutput.Contains($taskCase[2]) -and
        -not $taskOutput.Contains('Now listening') -and -not $taskOutput.Contains($taskMarker)
    $taskProcess.Dispose()
    if (-not $taskPassed) { throw 'Falló un control de configuración; revisar localmente sin imprimir valores.' }
}
'7/7 controles de configuración correctos'
```

La codificación 850 corresponde al stderr de errores no capturados de .NET en este Windows. En otra plataforma se debe usar la codificación del proceso; no recortar los diagnósticos esperados para ocultar diferencias. En el primer intento el decoder UTF-8 reemplazó tildes y tres comparaciones fallaron pese al rechazo correcto; se verificó la codificación y se repitieron los siete casos conservando las comprobaciones. No se cambiaron pruebas de aplicación ni timeouts de Vitest.

El acceso TCP se comprobó desde PowerShell 7.6/.NET 10 con `Npgsql.dll` del build y `Microsoft.Extensions.Logging.Abstractions.dll` del runtime ASP.NET instalado, leyendo la clave del archivo User Secrets del perfil sin imprimirlo. Un intento inicial buscó Logging.Abstractions en la salida del build y se detuvo antes de conectar; se corrigió esa ruta. Consulta ejecutada, solo lectura:

```sql
SELECT current_database() = 'fluency_segunda_entrega_dev',
       (SELECT count(*) FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema'));
```

El resultado fue `true, 0`. Antes de abrir se exigieron host local, puerto 5433 y nombre exacto de la base. Se cerraron lector, comando y conexión. Las operaciones Docker usaron `PGPASSWORD` por entorno y restauraron su valor al terminar; no se imprimieron usuario, contraseña ni cadena completa. Los logs/resultados de los procesos ficticios quedan en `node_modules/.tmp/t02-controls`, ignorado.

La creación se ejecutó mediante `docker exec -i --env PGPASSWORD` y `psql --no-password`, con usuario leído en memoria de la configuración proporcionada. SQL enviado por stdin al catálogo local, después de comprobar el destino:

```sql
SELECT format('CREATE DATABASE %I', 'fluency_segunda_entrega_dev')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fluency_segunda_entrega_dev');
\gexec
```

El escaneo de secretos usa Gitleaks 8.30.1 y el procedimiento de foto temporal fuera de `node_modules` documentado en [T01](verificacion-t01.md). Se inspeccionan solo regla/ruta/línea de informes redactados. El primer análisis marcó, además de la configuración local preexistente, cinco apariciones del marcador ficticio de las pruebas en este documento. Se construye ahora ese mismo marcador por segmentos y se interpola, conservando exactamente las entradas y comprobaciones ejecutadas, sin excepciones ni reglas debilitadas.

## Cierre y pendientes

Revisión independiente, escaneos del árbol/índice/historial y comprobación del alcance completados. Se retiró únicamente el BOM agregado por `dotnet user-secrets init` al csproj, conservando el identificador; no cambia el contenido compilado. El índice final se volvió a preparar y escanear antes de guardar el commit `a3fa0c4`. El agente no hizo merge ni push; el usuario confirmó después la integración y el push a `segunda-entrega`. La base permanece vacía hasta T04 y el fixture/base de pruebas corresponden a T03. Al cerrar la implementación se dejaron backend/frontend en ejecución; comprobar nuevamente sus procesos al retomar. No se verificaron recorridos de negocio sobre la base vacía.

### Incidencia posterior y cierre confirmado por el usuario, 11/10/2026

El usuario informó que `dotnet user-secrets list --project .\backend\FluencyAPI\` y el listado por identificador no encontraban secretos en Windows Terminal. Las comprobaciones iniciales del agente sí veían el archivo y la clave, pero no distinguían la redirección de archivos de la aplicación. La consulta de solo lectura a `GetFinalPathNameByHandle` mostró que el archivo solicitado bajo AppData/Roaming se abría físicamente en `OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Roaming`. La identidad y las rutas nominales iguales no acreditaban un almacén compartido.

El usuario confirmó que importó correctamente el JSON al almacén normal de Windows desde su terminal, retiró la información sensible de `appsettings.json` y mergeó/pusheó T02 a `segunda-entrega`. El procedimiento sin imprimir valores está en [la guía local](../../docs/segunda-entrega/entorno-local.md#almacenes-distintos-en-codex-y-windows-terminal). No se repitió el acceso TCP desde la terminal del usuario ni se reauditaron sus modificaciones: los resultados de build, escáner y conexiones anteriores corresponden al cierre del agente, no a una nueva validación posterior a la importación.

Al iniciar esta actualización documental se comprobó un árbol limpio, rama `segunda-entrega` y `HEAD`/referencia local `origin/segunda-entrega` en `a3fa0c4`. No se consultó nuevamente el servidor remoto. La actualización deja los documentos sin stage ni commit por pedido del usuario. Próxima tarea: T03, con decisión conjunta de destino de pruebas y estrategia de limpieza antes de escrituras; luego CP01.
