# Entorno local de la segunda entrega

Acuerdos con el usuario y ejecución inicial: 11/10/2026, T02. Evidencia en [verificacion-t02.md](../../tasks/verificaciones/verificacion-t02.md).

## Destinos y separación

| Uso | Destino/configuración |
|---|---|
| Desarrollo de segunda entrega | PostgreSQL local, `localhost:5433`, base `fluency_segunda_entrega_dev`; clave `ConnectionStrings:SegundaEntregaDB` en User Secrets. |
| Primera entrega | Base anterior conservada. La nueva API no consulta la clave antigua `ConnectionStrings:FluencyLocalDB` ni la usa como respaldo. El usuario informó que retiró la información sensible de `appsettings.json` después de T02. |
| Pruebas automatizadas | PostgreSQL local, `localhost:5433`, base exclusiva `fluency_segunda_entrega_test`; clave `ConnectionStrings:SegundaEntregaTestDB` en el mismo almacén User Secrets de la API. No reutilizar desarrollo ni heredar su conexión. |
| Producción / Supabase | Perfil local `Production`, clave separada `ConnectionStrings:SegundaEntregaProductionDB` en User Secrets. En hosting: `ConnectionStrings__SegundaEntregaProductionDB`. Azure y su publicación siguen pendientes; no se probaron. |

Contenedor informado y comprobado: `968c3a20d1e55ae43fa73f0c27ff3fcc08f38c00a22ae27105c8b227cd14a964`. El 11/10/2026 estaba en ejecución y publicaba `127.0.0.1:5433` hacia `5432/tcp`; al iniciar T04 se volvió a comprobar y PostgreSQL informó versión 17.11. Comprobar nuevamente si cambia el entorno:

```powershell
docker inspect --format '{{.State.Status}} {{json .NetworkSettings.Ports}}' 968c3a20d1e55ae43fa73f0c27ff3fcc08f38c00a22ae27105c8b227cd14a964
```

La base de desarrollo se creó explícitamente en T02 después de comprobar que no existía. Pertenece al usuario de conexión y tenía cero tablas al iniciar T04; T04 aplicó explícitamente las 20 tablas y catálogos, sin usuarios ni datos comerciales de demostración. En T03 el usuario eligió `fluency_segunda_entrega_test`, creada también tras comprobar su ausencia y propietario; se guardó su conexión bajo una clave exclusiva, conservando el secreto de desarrollo. Ambas usan las credenciales locales proporcionadas por el usuario; no se copian aquí. No se borró, migró ni alteró la base anterior. El esquema comercial se preparó explícitamente en T04: arrancar la API no crea tablas, datos ni usuarios.

## Perfil Production para Supabase

Acuerdo del 12/10/2026: el usuario destina el proyecto Supabase preparado durante CP02 a la base productiva del trabajo práctico. La conexión se guarda una vez, separada de desarrollo y tests. `Production` fija ambos selectores de entorno; `http`/`https` fijan Development. La aplicación y el bootstrap seleccionan `SegundaEntregaProductionDB` en Production, sin fallback a la conexión local. Las fuentes normales de configuración tienen prioridad; si la clave no existe, se consulta únicamente esa clave en User Secrets para la ejecución local. En hosting se proporciona la variable de entorno, sin depender del almacén local.

Desde una terminal nueva de PowerShell 7, en la raíz, guardar una cadena Npgsql completa con los parámetros del Session pooler y `Search Path=fluency_crm`:

```powershell
$valor = Read-Host 'Conexión Npgsql de producción completa' -MaskInput
@{'ConnectionStrings:SegundaEntregaProductionDB' = $valor} |
    ConvertTo-Json -Compress | dotnet user-secrets set --project backend/FluencyAPI
Remove-Variable valor
```

La entrada oculta evita escribir el secreto literal en el historial. Usar el almacén de Windows Terminal descrito abajo, sin compartir su contenido. Conservar `SegundaEntregaDB` y `SegundaEntregaTestDB`. Una variable `ConnectionStrings__SegundaEntregaProductionDB` del proceso prevalece sobre el valor guardado.

Para producción se recomienda `SSL Mode=VerifyFull`. Si la CA no está reconocida por el sistema, descargar el certificado raíz del panel de Supabase y guardar `Root Certificate=<ruta absoluta al certificado>` en la misma cadena; es configuración única. `SSL Mode=Require` exige cifrado pero no verifica la identidad del servidor: fue presentado como alternativa para el ensayo con datos ficticios, no como una validación TLS equivalente ni como un resultado ya comprobado. Referencias: [Supabase y certificado raíz](https://supabase.com/docs/guides/database/psql), [TLS en Npgsql](https://www.npgsql.org/doc/security.html).

```powershell
dotnet run --project backend/FluencyAPI --launch-profile Production
# Después de preparar los cinco campos BootstrapAdmin__... de T06:
dotnet run --project backend/FluencyAPI --launch-profile Production -- --bootstrap-admin
```

El bootstrap conserva la entrada por variables de entorno únicamente; no persistir su contraseña en User Secrets. El arranque normal no crea cuentas ni tablas. La API local escucha en localhost y no habilita OpenAPI en Production; el perfil no publica la API ni acredita autenticación/recorridos pendientes. Los ensayos manuales sobre esta base conservan sus datos; las suites y su limpieza siguen siendo exclusivamente locales. Estado y controles en [CP02/Supabase](../../tasks/verificaciones/verificacion-cp02-supabase.md).

## Secretos de desarrollo

Se eligió User Secrets de .NET. El `UserSecretsId` versionado en `FluencyAPI.csproj` es un identificador público del almacén, no una credencial. ASP.NET Core lo carga automáticamente en `Development`. Los valores se guardan fuera del repositorio, en el perfil del usuario, **sin cifrar**; no es un almacén para producción. Referencia: [Secret Manager de ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-10.0).

La conexión fue guardada desde Codex y el usuario confirmó posteriormente su importación al almacén normal de Windows; ver la diferencia de rutas más abajo. Para configurar otra máquina, desde su terminal habitual y desde la raíz del repositorio, después de identificar el PostgreSQL y crear expresamente una base nueva separada:

```powershell
$ErrorActionPreference = 'Stop'
$taskConnection = [System.Data.Common.DbConnectionStringBuilder]::new()
$taskConnection['Host'] = 'localhost'
$taskConnection['Port'] = 5433
$taskConnection['Database'] = 'fluency_segunda_entrega_dev'
$taskConnection['Username'] = Read-Host 'Usuario de PostgreSQL local'
$taskPassword = Read-Host 'Contraseña de PostgreSQL local' -AsSecureString
try {
    $taskConnection['Password'] = [System.Net.NetworkCredential]::new('', $taskPassword).Password
    @{'ConnectionStrings:SegundaEntregaDB' = $taskConnection.get_ConnectionString()} |
        ConvertTo-Json -Compress |
        dotnet user-secrets set --project backend/FluencyAPI
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo guardar la conexión local.' }
} finally {
    [void]$taskConnection.Remove('Password')
    $taskPassword.Dispose()
}
```

La contraseña se solicita sin eco y el JSON se transmite por stdin; no poner la cadena literal en comandos, documentación o argumentos de procesos. El dato existe en memoria y en el archivo local sin cifrar. `dotnet user-secrets list --project backend/FluencyAPI` permite inspeccionar los valores localmente, pero no compartir su salida ni el JSON en capturas/logs. No agregar archivos de secretos a Git. Durante T02 se preservó el cambio ajeno de `appsettings.json` fuera del commit del agente; después el usuario confirmó que retiró la información sensible.

Variables de entorno tienen mayor precedencia que User Secrets. Una variable `ConnectionStrings__SegundaEntregaDB` antigua puede sobrescribir el secreto: comprobar su presencia sin imprimir el valor y quitarla del proceso si se desea usar User Secrets. La clave vieja `FluencyLocalDB` no sustituye a la nueva, aunque exista en archivos o variables.

### Almacenes distintos en Codex y Windows Terminal

El 11/10/2026, el listado desde Codex devolvía la clave mientras Windows Terminal informaba `No secrets configured for this application`, incluso con el mismo identificador. La identidad y las rutas nominales coincidían, pero consultar la ruta física del archivo abierto mediante `GetFinalPathNameByHandle` comprobó esta redirección:

- Ruta nominal de Windows: `%APPDATA%\Microsoft\UserSecrets\<UserSecretsId>\secrets.json`.
- Ruta física observada para los procesos de esta instalación de Codex: `%LOCALAPPDATA%\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Roaming\Microsoft\UserSecrets\<UserSecretsId>\secrets.json`.

Es una observación de esta instalación, no una ruta universal ni un cambio en el código de .NET. Verificar solo la ruta nominal, el usuario o el resultado de un listado desde el agente no demuestra que la terminal externa vea el mismo almacén. Comprobar desde la terminal que realmente vaya a ejecutar la API o los tests.

El usuario confirmó que resolvió el problema ejecutando la siguiente importación **desde Windows Terminal**, fuera de Codex. Se documenta para reproducir ese caso concreto si vuelve a ocurrir; no es necesario repetirla en cada arranque:

```powershell
$ErrorActionPreference = 'Stop'
$taskId = '17a17c20-9f44-4609-9431-4d0c456082d0'
$taskSource = "$env:LOCALAPPDATA\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Roaming\Microsoft\UserSecrets\$taskId\secrets.json"
Get-Content -LiteralPath $taskSource -Raw | dotnet user-secrets set --id $taskId
if ($LASTEXITCODE -ne 0) { throw 'No se pudo importar el almacén local.' }
```

El JSON pasa por stdin sin imprimirse; `set` incorpora las claves y reemplaza los valores de las claves coincidentes. No copiarlo al repositorio. La importación fue confirmada por el usuario; no se repitió una conexión TCP desde su terminal externa. El comando de listado muestra también la contraseña: limitarlo a inspección privada. La ausencia de estos comandos en el historial puede deberse al filtro de datos sensibles de PSReadLine, independientemente de la redirección del almacén.

## Inicio y diagnósticos

Desde raíz:

```powershell
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet run --no-build --no-restore --project backend/FluencyAPI --launch-profile http
```

Desde `frontend`:

```powershell
npm run dev -- --host 127.0.0.1 --strictPort
```

API: `http://localhost:5169`. Frontend: `http://127.0.0.1:5173`. Vite conserva el proxy `/api` hacia la API local.

Los perfiles `http` y `https` de `backend/FluencyAPI/Properties/launchSettings.json` definen `ASPNETCORE_ENVIRONMENT=Development`. `dotnet run --launch-profile http` aplica ese perfil; `launchSettings.json` es configuración de arranque local, no configuración de despliegue. Con `WebApplication.CreateBuilder`, `DOTNET_ENVIRONMENT` tiene prioridad si también está definido. Sin ninguna de esas variables ni otra selección explícita del entorno, el valor predeterminado es `Production`; Debug/Release no lo determina. El log de inicio permite corroborar `Hosting environment: Development`, que habilita la carga automática de User Secrets. Referencia: [entornos de ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/environments?view=aspnetcore-10.0).

La API valida la configuración antes de registrar el DbContext y escuchar:

- Clave ausente o en blanco: indica que falta `ConnectionStrings:SegundaEntregaDB`.
- Formato inválido: diagnóstico genérico, sin valores ni excepción interna del parser.
- `Host` o `Database` vacíos: exige destino explícito; no infiere una base por el usuario.
- En `Development`, permite exactamente `localhost`, `127.0.0.1` o `::1`; rechaza hosts remotos, múltiples y rutas de socket. No intenta conectarse al destino rechazado.

La validación de arranque no abre conexiones ni certifica que PostgreSQL esté disponible. T02 verificó por separado el acceso TCP, la identidad de la base y su ausencia de tablas. Production exige configuración válida/expresa, pero no tiene la restricción de host local; no interpretar esto como autorización para probar Azure. T03 añadirá sus propios controles de aislamiento antes de preparar datos.

Inicio y OpenAPI se comprobaron en T03 con la base vacía. T04 prepara esquema/catálogos, **todavía no los recorridos comerciales ni el login contra el modelo nuevo**; los mapeos, roles y administrador se adaptan en las tareas siguientes. No apuntar a la primera entrega para disimular esa transición. No usar `EnsureCreated`, `EnsureDeleted`, restauraciones ni scripts destructivos al arrancar.

## Pruebas HTTP y PostgreSQL: T03

El proyecto `backend/FluencyAPI.Tests` usa xUnit/VSTest y `WebApplicationFactory` sobre .NET 10. No requiere arrancar la API en el puerto 5169: aloja su pipeline HTTP dentro del proceso de tests y usa PostgreSQL real. La prueba de infraestructura consulta OpenAPI y escribe/lee una tabla `probe` mediante la conexión del DbContext registrado; una segunda conexión comprueba la persistencia. No acredita todavía operaciones comerciales por HTTP ni crea el esquema de T04.

Los tests leen únicamente `ConnectionStrings:SegundaEntregaTestDB` del almacén User Secrets de **FluencyAPI**, seguido de variables de entorno. La alternativa por entorno es `ConnectionStrings__SegundaEntregaTestDB`; prevalece sobre el secreto. La conexión de desarrollo, la clave antigua y appsettings no sirven de respaldo. Sin la clave de tests, fallan explícitamente; no hay skips ni proveedor InMemory.

En esta instalación se guardó la clave en el almacén visible para Codex y el usuario confirmó su importación desde Windows Terminal. Para reproducir **solo la importación de tests**, sin reemplazar la conexión de desarrollo:

```powershell
$ErrorActionPreference = 'Stop'
$taskId = '17a17c20-9f44-4609-9431-4d0c456082d0'
$taskSource = "$env:LOCALAPPDATA\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Roaming\Microsoft\UserSecrets\$taskId\secrets.json"
$taskSecrets = Get-Content -LiteralPath $taskSource -Raw | ConvertFrom-Json
$taskValue = $taskSecrets.'ConnectionStrings:SegundaEntregaTestDB'
if ([string]::IsNullOrWhiteSpace($taskValue)) { throw 'No se encontró la clave de tests.' }
try {
    @{'ConnectionStrings:SegundaEntregaTestDB' = $taskValue} |
        ConvertTo-Json -Compress |
        dotnet user-secrets set --project backend/FluencyAPI
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo importar la clave de tests.' }
} finally {
    Remove-Variable taskSecrets, taskValue
}
```

En otra máquina, configurar la conexión con el procedimiento de entrada segura de la sección de desarrollo, sustituyendo **tanto** `Database` por `fluency_segunda_entrega_test` como la clave por `ConnectionStrings:SegundaEntregaTestDB`, después de crear e identificar expresamente esa base. No copiar credenciales al repositorio.

Desde raíz, con Docker disponible y el secreto configurado:

```powershell
dotnet restore backend/FluencyAPI.slnx
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-build --no-restore --filter 'FullyQualifiedName~DatabaseIsolationTests'
```

Antes de conectar, el fixture exige un host local único (`localhost`, `127.0.0.1` o `::1`), puerto 5433, base exacta `fluency_segunda_entrega_test` y credenciales explícitas. Rechaza `Options` externos; fuerza su propio search path, sin `public`, y desactiva parámetros/detalles sensibles en logs, pooling y enlistado en transacciones ambientales. Tras conectar comprueba la base, su OID, propietario e identidad de sesión antes de crear recursos. El puerto interno de PostgreSQL dockerizado puede ser 5432: la validación 5433 corresponde al endpoint cliente.

Cada instancia crea un esquema `t03_<GUID>` y su tabla `probe`, en una transacción. El host de pruebas se configura explícitamente como Development y recibe la conexión ya validada antes de que `Program` la lea; no modifica variables globales de entorno ni añade rutas de prueba al producto. Este orden usa [`ConfigureHostConfiguration` de WebApplicationFactory](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0#customize-the-webapplicationfactory-with-test-configurations), ya que `ConfigureAppConfiguration` llega después de `Build`.

Al usar `await using` y finalizar la instancia, cierra el host, vuelve a comprobar destino, propietario y OID de sus recursos, y elimina exclusivamente `probe` y su esquema con `RESTRICT`, en transacción. Un objeto o dependencia inesperados impiden la limpieza y se informa el esquema para revisarlo. **Una interrupción puede dejar restos; la siguiente ejecución no los borra.** No hay barridos por prefijo, `DROP DATABASE`, `CASCADE`, `EnsureCreated` ni `EnsureDeleted`. `search_path` separa nombres, no limita los permisos del rol: se conserva el usuario local elegido y no se crearon roles nuevos. La preparación/limpieza del esquema comercial de tests está concretada en T04, en la sección siguiente. Referencias: [esquemas PostgreSQL](https://www.postgresql.org/docs/current/ddl-schemas.html), [parámetros Npgsql](https://www.npgsql.org/doc/connection-string-parameters.html).

## Preparación explícita del esquema comercial: T04

Los archivos `backend/Persistence/SQL/segunda-entrega-esquema.sql` y `segunda-entrega-catalogos.sql` son la fuente del esquema nuevo. Git registra su evolución; no hay migraciones EF en paralelo. Se aplican en ese orden y en **una única transacción externa**, con destino declarado en `fluency.target_database` y `search_path` explícito. No contienen `BEGIN`/`COMMIT` propios ni borran objetos previos. El DDL rechaza un esquema ocupado; los catálogos iniciales no son un mecanismo para actualizar una instalación existente.

El procedimiento siguiente está limitado a la base de desarrollo nueva acordada, dentro del contenedor local identificado. Usa `psql` por el socket de ese contenedor; el acceso TCP con la clave exclusiva se prueba por separado en la suite de tests. No configura secretos ni usa la base anterior. Ejecutarlo desde la raíz **solo para la primera preparación**, después de revisar SQL y resultados de tests. Si falla, la conexión se cierra sin confirmar la transacción; no reintentar borrando tablas.

```powershell
$ErrorActionPreference = 'Stop'
$taskContainer = '968c3a20d1e55ae43fa73f0c27ff3fcc08f38c00a22ae27105c8b227cd14a964'
$taskState = docker inspect --format '{{.State.Status}}' $taskContainer
if ($LASTEXITCODE -ne 0 -or $taskState -ne 'running') {
    throw 'El contenedor local identificado no está disponible.'
}
$taskPorts = docker inspect --format '{{json .NetworkSettings.Ports}}' $taskContainer |
    ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or @($taskPorts.'5432/tcp').Count -ne 1 -or
    $taskPorts.'5432/tcp'[0].HostIp -ne '127.0.0.1' -or
    $taskPorts.'5432/tcp'[0].HostPort -ne '5433') {
    throw 'La publicación del PostgreSQL local no coincide con el destino acordado.'
}
$taskPreamble = @'
BEGIN;
SET LOCAL search_path = public;
SET LOCAL fluency.target_database = 'fluency_segunda_entrega_dev';
DO $$
BEGIN
    IF current_database() <> 'fluency_segunda_entrega_dev'
       OR current_user <> session_user
       OR current_user <> (SELECT pg_get_userbyid(datdba)
                           FROM pg_database WHERE datname = current_database()) THEN
        RAISE EXCEPTION 'Destino o propietario de desarrollo inesperado';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
               WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
                 AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
                 AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')) THEN
        RAISE EXCEPTION 'Desarrollo no está vacío; no se reconstruye automáticamente';
    END IF;
END $$;
'@
$taskSql = $taskPreamble + "`n" +
    (Get-Content -LiteralPath 'backend/Persistence/SQL/segunda-entrega-esquema.sql' -Raw) +
    "`n" + (Get-Content -LiteralPath 'backend/Persistence/SQL/segunda-entrega-catalogos.sql' -Raw) +
    "`nCOMMIT;"
$taskOutput = $taskSql | docker exec -e PGOPTIONS= -i $taskContainer sh -c `
    'exec psql -X -w -h /var/run/postgresql -p 5432 -U "$POSTGRES_USER" -d fluency_segunda_entrega_dev -v ON_ERROR_STOP=1'
if ($LASTEXITCODE -ne 0) {
    throw 'Preparación rechazada; revisar destino y restricciones sin borrar datos.'
}
'Esquema y catálogos preparados en desarrollo.'
```

No hay script de limpieza de desarrollo: después de confirmar la instalación se conservan sus datos. Una reinstalación o recuperación requiere una decisión explícita; revertir un commit no revierte la base.

### Esquema comercial en tests

`CommercialSchemaFixture` reutiliza la validación de conexión exclusiva de T03. Cada ejecución prepara un esquema GUID propio, el DDL, los catálogos y una tabla `probe` en una transacción. Las pruebas usan el SQL versionado copiado al output, sin generar otro esquema mediante EF. Los datos ficticios pertenecen a los tests y no a las semillas del producto.

La limpieza compara identidad/propietario de la base y los OID/propietarios de los recursos creados. Elimina únicamente las tablas de su manifiesto en orden de dependencias y el esquema propio, todo en una transacción y con `RESTRICT`. Una tabla sustituida, una tabla adicional, una dependencia externa o un objeto residual del esquema impide confirmar la limpieza. Los índices/constraints y secuencias dependientes de las tablas propias se eliminan con ellas por las reglas de PostgreSQL; el manifiesto no es un inventario universal de objetos. No se recorren ni eliminan esquemas de otras ejecuciones; los restos de interrupciones se revisan manualmente.

```powershell
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~SchemaTests'
```

T04 prepara persistencia, sin habilitar recorridos comerciales nuevos. T05 alinea los mapeos de identidad y prepara roles/permisos; el administrador inicial corresponde a T06 y la sesión efectiva a tareas posteriores. Fuentes de operación: [transacciones y errores de psql](https://www.postgresql.org/docs/17/app-psql.html), [dependencias y RESTRICT](https://www.postgresql.org/docs/17/ddl-depend.html).

## Preparación explícita de roles y permisos: T05

`backend/Persistence/SQL/segunda-entrega-roles.sql` se ejecuta después del esquema y catálogos de T04, **antes** del bootstrap de T06, en una transacción externa con destino/esquema explícitos. En una primera instalación pueden aplicarse los tres archivos en ese orden dentro de una misma transacción. Si T04 ya está instalado, ejecutar únicamente la semilla de roles; no repetir la creación de tablas.

Los nombres estables de rol son `ADMINISTRADOR`, `RESPONSABLE_COMERCIAL` y `VENDEDOR`; `descripcion` contiene su etiqueta. No se añade una columna ni migración de rol. Permisos: `ConsultarComercial`, `GestionarClientes`, `GestionarOportunidad`, `GestionarActividad` para los tres perfiles; `ReabrirOportunidad` también para administrador/responsable; `AdministrarUsuarios` y `AdministrarConfiguracion` solo para administrador. Resultado esperado: tres roles, siete permisos y dieciséis asociaciones, sin usuarios. El alcance propio/total respeta los roles y su precedencia; los permisos no anulan las reglas del circuito.

La semilla verifica las cinco tablas de identidad del esquema destino y rechaza datos existentes en ellas. Las bloquea durante la transacción para evitar una inicialización simultánea. No contiene borrados ni upserts para corregir definiciones ajenas; una segunda ejecución se rechaza y conserva lo instalado. Crear usuarios y administrar sus roles asignados son tareas posteriores; no hay CRUD para redefinir roles/permisos.

Procedimiento para el desarrollo local ya preparado en T04, desde la raíz y después de revisar SQL/pruebas:

```powershell
$ErrorActionPreference = 'Stop'
$taskContainer = '968c3a20d1e55ae43fa73f0c27ff3fcc08f38c00a22ae27105c8b227cd14a964'
$taskState = docker inspect --format '{{.State.Status}}' $taskContainer
if ($LASTEXITCODE -ne 0 -or $taskState -ne 'running') {
    throw 'El contenedor local identificado no está disponible.'
}
$taskPorts = docker inspect --format '{{json .NetworkSettings.Ports}}' $taskContainer |
    ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or @($taskPorts.'5432/tcp').Count -ne 1 -or
    $taskPorts.'5432/tcp'[0].HostIp -ne '127.0.0.1' -or
    $taskPorts.'5432/tcp'[0].HostPort -ne '5433') {
    throw 'La publicación del PostgreSQL local no coincide con el destino acordado.'
}
$taskPreamble = @'
BEGIN;
SET LOCAL search_path = public;
SET LOCAL fluency.target_database = 'fluency_segunda_entrega_dev';
DO $$
BEGIN
    IF current_database() <> 'fluency_segunda_entrega_dev'
       OR current_user <> session_user
       OR current_user <> (SELECT pg_get_userbyid(datdba)
                           FROM pg_database WHERE datname = current_database()) THEN
        RAISE EXCEPTION 'Destino o propietario de desarrollo inesperado';
    END IF;
END $$;
'@
$taskSql = $taskPreamble + "`n" +
    (Get-Content -LiteralPath 'backend/Persistence/SQL/segunda-entrega-roles.sql' -Raw) +
    "`nCOMMIT;"
$taskOutput = $taskSql | docker exec -e PGOPTIONS= -i $taskContainer sh -c `
    'exec psql -X -w -h /var/run/postgresql -p 5432 -U "$POSTGRES_USER" -d fluency_segunda_entrega_dev -v ON_ERROR_STOP=1'
if ($LASTEXITCODE -ne 0) {
    throw 'Preparación de roles rechazada; revisar destino y restricciones sin borrar datos.'
}
'Roles y permisos preparados en desarrollo; sin cuentas creadas.'
```

Procedimiento ejecutado una vez al cerrar T05 (11/10/2026), después de revisión estática, suite backend 58/58 y build correcto, con SQL guardado en `5e38d60`. Consulta final: 20 tablas, tres roles/siete permisos/dieciséis asociaciones, cero usuarios/roles asignados y cero servicios/embudos/oportunidades. La base de tests quedó sin tablas ni esquemas propios. No volver a ejecutarlo sobre esta instalación; ver [evidencia](../../tasks/verificaciones/verificacion-t05.md). No se ejecuta al arrancar la API. El rollback del código no retira semillas ya confirmadas ni borra datos. La revisión Supabase permanece para el final de CP02; este bloque se limita al Docker local y no sirve como procedimiento remoto.

## Administrador inicial explícito: T06

Después de instalar esquema, catálogos y roles, el modo `--bootstrap-admin` crea una única cuenta activa con rol `ADMINISTRADOR` si no existe ningún usuario. No escucha HTTP ni crea/reconstruye tablas. El arranque normal no ejecuta este modo. Una instalación con administrador activo no cambia cuentas ni contraseñas al repetirlo; usuarios existentes sin administrador activo requieren recuperación operativa del dueño del entorno, sin elevación automática.

La reejecución sobre una instalación con administrador activo no exige volver a proporcionar sus datos. Códigos de salida: `0` creado/ya inicializado; `1` argumentos, configuración o entrada inválidos; `2` recuperación operativa necesaria; `3` conflicto concurrente revertido; `4` conexión, esquema, roles u operación no disponibles. Los mensajes son diagnósticos sin valores sensibles.

La conexión usa `ConnectionStrings:SegundaEntregaDB`, con las mismas comprobaciones de destino del arranque. Para este procedimiento local, verificar primero el contenedor, la base `fluency_segunda_entrega_dev` y su propietario como en T04/T05. `--launch-profile http` selecciona `Development` y carga User Secrets; la bandera de bootstrap termina el proceso antes de escuchar. Conservar la protección que rechaza hosts remotos en Development. La revisión Supabase tiene un paso posterior propio: no adaptar esta receta cambiando silenciosamente el secreto.

Los cinco campos se leen exclusivamente de variables del proceso: `BootstrapAdmin__Nombre`, `BootstrapAdmin__Apellido`, `BootstrapAdmin__Correo`, `BootstrapAdmin__Username`, `BootstrapAdmin__Password`. No se aceptan credenciales por argumentos, JSON ni claves BootstrapAdmin de User Secrets. Nombre/apellido hasta 100 caracteres, correo hasta 150 y válido, username hasta 50; textos obligatorios sin blancos después de trim. La contraseña se conserva exactamente: mínimo ocho caracteres y máximo 72 bytes UTF-8; BCrypt con costo 12. No escribir valores ni hashes en archivos versionados o salidas.

Desde una terminal local privada en la raíz, después del build y de verificar el destino:

```powershell
$ErrorActionPreference = 'Stop'
$taskPreviousBootstrap = @{}
$taskBootstrapPassword = $null
try {
    foreach ($taskField in @('Nombre', 'Apellido', 'Correo', 'Username', 'Password')) {
        $taskKey = 'BootstrapAdmin__' + $taskField
        $taskPreviousBootstrap[$taskKey] = [Environment]::GetEnvironmentVariable($taskKey, 'Process')
        if ($taskField -eq 'Password') {
            $taskBootstrapPassword = Read-Host 'Contraseña del administrador inicial' -AsSecureString
            [Environment]::SetEnvironmentVariable($taskKey,
                [System.Net.NetworkCredential]::new('', $taskBootstrapPassword).Password, 'Process')
        } else {
            [Environment]::SetEnvironmentVariable($taskKey, (Read-Host $taskField), 'Process')
        }
    }
    dotnet run --no-build --no-restore --project backend/FluencyAPI --launch-profile http -- --bootstrap-admin
    if ($LASTEXITCODE -ne 0) { throw 'Bootstrap rechazado; revisar el diagnóstico sin compartir secretos.' }
} finally {
    foreach ($taskKey in $taskPreviousBootstrap.Keys) {
        if ($null -eq $taskPreviousBootstrap[$taskKey]) {
            Remove-Item -LiteralPath ('Env:' + $taskKey) -ErrorAction SilentlyContinue
        } else {
            [Environment]::SetEnvironmentVariable($taskKey, $taskPreviousBootstrap[$taskKey], 'Process')
        }
    }
    if ($null -ne $taskBootstrapPassword) { $taskBootstrapPassword.Dispose() }
}
```

La contraseña está temporalmente en memoria y en el entorno del proceso hijo; no se almacena en el historial como literal. No compartir volcados de entorno. El bloque restaura variables preexistentes al terminar. Revertir Git no elimina la cuenta ya confirmada.

La creación se confirma en una transacción Serializable. Ante conflicto concurrente se revierte completamente y se informa que hay que revisar/repetir explícitamente; no hay reintentos automáticos. Esto conserva el contrato aprobado y el tratamiento de [conflictos de PostgreSQL](https://www.postgresql.org/docs/17/transaction-iso.html). La preparación SQL sigue siendo explícita y separada.

Verificaciones y estado de la ejecución de T06 en [verificacion-t06.md](../../tasks/verificaciones/verificacion-t06.md). La receta permite que el operador elija sus credenciales; los tests emplean cuentas ficticias exclusivamente en esquemas locales aislados y no crean la cuenta de desarrollo.
