# Evidencia de T01: línea de base y controles

Fecha: 11/10/2026. Base: `segunda-entrega` / `ae4cc2e`; rama de trabajo `segunda-entrega-t01-linea-base`. Alcance: [T01](../../tasks/todo.md#t01), sin cambios de negocio, esquema ni dependencias. Único cambio preexistente: `backend/FluencyAPI/appsettings.json`, preservado y excluido del commit; su SHA-256 se comparó antes/después y coincide. No se imprimieron valores sensibles.

Herramientas comprobadas: Node 24.21.0, npm 11.19.0, SDK .NET 10.0.401. No se instalaron paquetes de la aplicación. Gitleaks 8.30.1 se descargó del [release oficial](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) a `node_modules/.tmp/t01-tools` (ignorado), verificando el ZIP Windows x64 contra el checksum publicado: SHA-256 `D29144DEFF3A68AA93CED33DDDF84B7FDC26070ADD4AA0F4513094C8332AFC4E`.

## Resultados actuales

Los tiempos son de cada invocación PowerShell, no de la sesión completa; los controles independientes se ejecutaron en paralelo. La suite termina aunque supere los 90 segundos orientativos.

| Control | Resultado | Tiempo |
|---|---|---|
| Backend: `dotnet build backend/FluencyAPI.slnx --no-restore -m:1` | Exit 0; cero errores y advertencias. | 15,52 s |
| Frontend: `npm run build` | Exit 0; TypeScript/Vite correctos. No demuestra `strict: true`. | 22,90 s |
| Lint inicial: `npm run lint -- src vite.config.ts` | Exit 0; advertencia previa `react/only-export-components`, `src/app/providers.tsx:9`. | 3,17 s |
| Lint normalizado: `npm run lint` | Exit 0; mismo alcance y advertencia, tras cambiar el script a `oxlint src vite.config.ts`. | 1,51 s |
| Suite frontend completa, comando abajo | Exit 1; 7 suites correctas y 1 fallida; 70 pruebas correctas y 1 fallida de 71. | 234,42 s (Vitest: 228,38 s) |
| Reproducción aislada del fallo, comando abajo | Exit 1; mismo fallo; 1 caso ejecutado y 24 excluidos por el filtro CLI, sin modificar ni saltar tests en el código. | 29,95 s |
| npm raíz, auditoría con red | Exit 0; 15 dependencias según metadatos npm; cero vulnerabilidades reportadas. | 1,79 s |
| npm frontend, auditoría con red | Exit 1 por 1 alto; 261 dependencias según npm; cero críticos, moderados y bajos. | 3,51 s |
| .NET, auditoría con red | Exit 0; tres proyectos, sin vulnerabilidades reportadas. | 9,04 s |
| Gitleaks, archivos de trabajo | Exit 1; 155 rutas inventariadas, 785.799 bytes escaneados; un hallazgo en configuración local preexistente. | 2,46 s |
| Gitleaks, historial con `--all --no-textconv --no-ext-diff` | Exit 0; 38 commits, 5.974.619 bytes; sin hallazgos del scanner. | 2,41 s |
| Gitleaks, staged inicial | Exit 0; índice vacío, cero bytes. No sustituye la revisión previa al commit. | 0,90 s |
| Higiene: `git diff --check` | Correcta; revisar también archivos nuevos y staged al preparar commit. | No medido |

**Fallo frontend previo a los cambios:** `src/features/forms.test.tsx:128`, «filtra contactos por empresa y crea una oportunidad con responsable y etapa». `findByRole('heading', { name: 'Nueva oportunidad' })` vence mientras está visible «Cargando sección…». La reproducción aislada falla en el mismo punto. `App.tsx:19` carga esa pantalla con `React.lazy`; el resultado es compatible con carga diferida lenta, pero no prueba la causa definitiva. No se cambiaron tests, timeouts, aislamiento ni componentes. Las otras pruebas de ese formulario completaron en la suite general. Los tres fallos históricos por URL de empresas no se reprodujeron: el cliente usa `/api`. Este registro es una línea de base con deuda, no una suite verde.

**Dependencias:** cada lockfile npm es una instalación independiente; raíz contiene Supabase CLI y frontend contiene la aplicación. `npm explain source-map-js` identifica `source-map-js@1.2.1` como dependencia de desarrollo por Vite → PostCSS y jsdom → css-tree. La auditoría reporta [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), alto, denegación de servicio al procesar determinados source maps, rango `>=1.0.0 <1.2.2`, con corrección disponible. Se inventarió antes de editar y no se cambiaron declaraciones de dependencias ni lockfiles; el único cambio de `package.json` es el script lint. No se concluye que sea explotable desde el CRM publicado. La corrección queda pendiente del trabajo de seguridad, como máximo antes del cierre T47, sin aceptar nuevos hallazgos por analogía.

Inventario .NET obtenido con `dotnet list backend/FluencyAPI.slnx package --include-transitive --no-restore --format json`: API, 4 directas/26 transitivas; Persistence, 2/33; Services, 3/13 (las transitivas se cuentan por proyecto, no son totales únicos). Directas: OpenAPI 10.0.11, EF Design/Core/Relational 10.0.12, Npgsql EF 10.0.3, Scalar 2.17.3, BCrypt.Net-Next 4.2.0. La consulta de vulnerabilidades incluyó transitivas.

**Secretos:** Gitleaks encontró `generic-api-key` en `backend/FluencyAPI/appsettings.json:10`, ya modificado por el usuario al iniciar. La revisión estática confirma además la contraseña literal de respaldo en `backend/Persistence/Models/FluencyLocalDbContext.cs:67`, que el scanner no detectó. No se copiaron valores a este informe. La configuración local se conserva fuera del commit; el respaldo se resolverá en T02. El barrido estático también revisó candidatos en DTO, login y README, distinguiendo nombres de campos/ejemplos de credenciales. Se comprobaron exclusiones: no hay protección general para `.env`/claves en raíz; frontend ignora `*.local`, pero no todo `.env`. No se añadieron supresiones ni reglas para ocultar hallazgos. Un scanner sin hallazgos no acredita ausencia de secretos; no se validó la vigencia de credenciales ni se rotaron o reescribieron historiales.

## Comandos reproducibles

Desde raíz, con dependencias ya restauradas:

```powershell
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet list backend/FluencyAPI.slnx package --include-transitive --no-restore --format json
dotnet list backend/FluencyAPI.slnx package --vulnerable --include-transitive --no-restore --format json
npm audit --audit-level=high --json --ignore-scripts --fetch-retries=0 --fetch-timeout=30000
git diff --check
```

Desde `frontend`:

```powershell
npm run build
npm run lint
$taskTemp = Join-Path (Get-Location) 'node_modules/.tmp/t01-baseline'
New-Item -ItemType Directory -Force -Path $taskTemp | Out-Null
$env:TEMP = $taskTemp
$env:TMP = $taskTemp
npm run test:run -- --maxWorkers=1 --no-file-parallelism
# Diagnóstico focalizado; no reemplaza la suite completa:
npm run test:run -- src/features/forms.test.tsx -t 'filtra contactos por empresa' --maxWorkers=1 --no-file-parallelism
npm audit --audit-level=high --json --ignore-scripts --fetch-retries=0 --fetch-timeout=30000
npm explain source-map-js
```

TEMP/TMP se modifican solo en ese proceso; usar una consola dedicada o restaurar sus valores al terminar. No se usa `--no-isolate`, `audit fix`, exclusión de dependencias dev, supresión de asserts ni nuevos umbrales.

Para secretos, desde raíz, con el binario verificado disponible (o la misma versión en PATH):

```powershell
$ErrorActionPreference = 'Stop'
$taskGitleaks = Join-Path (Get-Location) 'node_modules/.tmp/t01-tools/gitleaks-8.30.1/gitleaks.exe'
& $taskGitleaks git . --log-opts='--all --no-textconv --no-ext-diff' --redact=100 --no-banner --no-color
& $taskGitleaks git . --pre-commit --staged --redact=100 --no-banner --no-color
# Foto del árbol actual: versionados + nuevos no ignorados, sin dependencias/builds.
$taskSnapshot = Join-Path ([System.IO.Path]::GetTempPath()) ('fluency-t01-secrets-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $taskSnapshot | Out-Null
git ls-files --cached --others --exclude-standard | Sort-Object -Unique | ForEach-Object {
    if (Test-Path -LiteralPath $_ -PathType Leaf) {
        $taskDestination = Join-Path $taskSnapshot $_
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $taskDestination) | Out-Null
        Copy-Item -LiteralPath $_ -Destination $taskDestination
    }
}
& $taskGitleaks dir $taskSnapshot --redact=100 --no-banner --no-color
# Retener el exit code del scanner antes de limpiar la foto que acabamos de crear.
$taskScanExit = $LASTEXITCODE
$taskResolved = [System.IO.Path]::GetFullPath($taskSnapshot)
$taskTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
if (-not $taskResolved.StartsWith($taskTempRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
    (Split-Path -Leaf $taskResolved) -notmatch '^fluency-t01-secrets-[0-9a-f]{32}$') {
    throw 'Refusing cleanup outside owned temporary snapshot'
}
Remove-Item -LiteralPath $taskResolved -Recurse -Force
Write-Output "Gitleaks worktree exit: $taskScanExit"
```

La foto temporal debe quedar **fuera de `node_modules`**: las reglas predeterminadas omiten esa ruta. No seguir enlaces ni incluir archivos ignorados con secretos de otras herramientas. Revisar también estáticamente cadenas de conexión con salida limitada a ubicación/tipo; no imprimir líneas sensibles. Los informes JSON utilizados se guardaron con `--redact=100` en `node_modules/.tmp/t01-controls`, ignorado, y no se agregan al commit. La foto temporal válida se eliminó después del análisis.

La repetición sobre el árbol con los cambios de T01 y el documento nuevo incluyó 156 rutas y 800.925 bytes; mantuvo exactamente el hallazgo de `appsettings.json:10`, sin hallazgos adicionales. También se eliminó la primera foto ignorada inválida; no quedan copias de la configuración en esas fotos.

## Entorno y comprobación local adicional

El usuario autorizó arrancar el contenedor informado y los servidores. Se verificó PostgreSQL en ejecución, publicado únicamente en `127.0.0.1:5433` hacia `5432/tcp`; la cadena local de `appsettings.json` corresponde a ese destino. No se inspeccionó ni modificó su contenido de datos. No se usó Azure.

Backend iniciado con `dotnet run --no-build --no-restore --project backend/FluencyAPI --launch-profile http`, imponiendo en ese proceso `ConnectionStrings__FluencyLocalDB` desde la configuración local verificada, sin imprimirla. Frontend con `npm run dev -- --host 127.0.0.1 --strictPort`. Ambos quedaron en ejecución al preparar la entrega.

Comprobación GET con `Invoke-WebRequest -NoProxy -TimeoutSec 15 -MaximumRedirection 0`: `http://127.0.0.1:5169/openapi/v1.json`, `http://127.0.0.1:5173/` y `http://127.0.0.1:5173/api/openapi/v1.json` devolvieron `200` (0,63 s en conjunto). Esto comprueba inicio HTTP/HTML y proxy, no login, persistencia ni recorridos de negocio. No se enviaron mutaciones a la API. Las pruebas HTTP/PostgreSQL aisladas pertenecen a T03.

## Limitaciones resueltas y continuidad

- Las primeras consultas de auditoría fallaron por DNS en sandbox (`ENOTFOUND` npm y host desconocido NuGet). Se repitieron con red habilitada, obteniendo los resultados de la tabla; los intentos fallidos no se cuentan como aprobados.
- La revisión automática rechazó inicialmente la consulta npm raíz por posible divulgación de dependencias privadas. Se verificó el lockfile: todas las referencias resueltas son públicas de `registry.npmjs.org`, sin links ni referencias privadas/locales. El reintento con esa evidencia fue autorizado y completó. No hay aprobación pendiente por ese rechazo.
- Crear la rama, acceder al socket Docker y consultar HTTP local requirieron salir del sandbox. Los servidores iniciados dentro del sandbox escuchaban, pero las consultas externas vencían; se detuvieron y reiniciaron fuera del aislamiento. Los GET posteriores sí completaron.
- El primer escaneo de archivos tomó una foto bajo `node_modules` y analizó cero bytes: resultado inválido, sustituido por la foto temporal de 155 rutas. El primer escaneo de historial falló parcialmente por `astextplain`/MSYS aunque devolvió exit 0: se descartó y repitió sin textconv ni diff externo. No se presenta ninguno de esos intentos como un análisis válido.

T01 no introduce fallos de tests ni secretos: registra deuda previa medida, normaliza lint y deja los controles reproducibles. Siguen pendientes B7 (prueba de carga), B8 (dependencia alta), el manejo de secretos de T02 y el acceso/pruebas backend de tareas posteriores. No se necesita otra aprobación del plan; la integración de esta rama requiere el OK específico del usuario. Siguiente tarea prevista: T02, configuración local segura.

Revisión independiente con GPT-6.1 Sol/High: sin bloqueantes; se contrastaron alcance, requisitos y los inventarios locales, sin repetir tests ni consultas de red. Se corrigió una observación documental menor: distinguir controles manuales ya ejecutados de automatización futura. Revisión propia de diff y `git diff --cached --check` correctas. Gitleaks sobre el índice con los cinco archivos propios escaneó 18.887 bytes sin hallazgos antes de estos últimos ajustes documentales; se repite al fijar el commit. La deuda registrada no queda resuelta ni aceptada como excepción por la revisión.
