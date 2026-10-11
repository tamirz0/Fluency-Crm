# Entorno local de la segunda entrega

Acuerdos con el usuario y ejecución inicial: 11/10/2026, T02. Evidencia en [verificacion-t02.md](../../tasks/verificaciones/verificacion-t02.md).

## Destinos y separación

| Uso | Destino/configuración |
|---|---|
| Desarrollo de segunda entrega | PostgreSQL local, `localhost:5433`, base `fluency_segunda_entrega_dev`; clave `ConnectionStrings:SegundaEntregaDB` en User Secrets. |
| Primera entrega | Base anterior conservada. La nueva API no consulta la clave antigua `ConnectionStrings:FluencyLocalDB` ni la usa como respaldo. El usuario informó que retiró la información sensible de `appsettings.json` después de T02. |
| Pruebas automatizadas | PostgreSQL local, `localhost:5433`, base exclusiva `fluency_segunda_entrega_test`; clave `ConnectionStrings:SegundaEntregaTestDB` en el mismo almacén User Secrets de la API. No reutilizar desarrollo ni heredar su conexión. |
| Producción | Configuración explícita `ConnectionStrings__SegundaEntregaDB` en el hosting, sin User Secrets. Azure y su publicación siguen pendientes; no se probaron. |

Contenedor informado y comprobado: `968c3a20d1e55ae43fa73f0c27ff3fcc08f38c00a22ae27105c8b227cd14a964`. El 11/10/2026 estaba en ejecución y publicaba `127.0.0.1:5433` hacia `5432/tcp`. Comprobar nuevamente si cambia el entorno:

```powershell
docker inspect --format '{{.State.Status}} {{json .NetworkSettings.Ports}}' 968c3a20d1e55ae43fa73f0c27ff3fcc08f38c00a22ae27105c8b227cd14a964
```

La base de desarrollo se creó explícitamente en T02 después de comprobar que no existía. Pertenece al usuario de conexión y tiene cero tablas de aplicación. En T03 el usuario eligió `fluency_segunda_entrega_test`, creada también tras comprobar su ausencia y propietario; se guardó su conexión bajo una clave exclusiva, conservando el secreto de desarrollo. Ambas usan las credenciales locales proporcionadas por el usuario; no se copian aquí. No se borró, migró ni alteró la base anterior. El esquema comercial se prepara en T04: arrancar la API no crea tablas, datos ni usuarios.

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

Con la base vacía funcionan el inicio y OpenAPI, **todavía no los recorridos comerciales ni el login contra el modelo nuevo**. No apuntar a la primera entrega para disimular esa transición. No usar `EnsureCreated`, `EnsureDeleted`, restauraciones ni scripts destructivos al arrancar. La creación del esquema y los recorridos siguientes se habilitan en las tareas correspondientes.

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

Al usar `await using` y finalizar la instancia, cierra el host, vuelve a comprobar destino, propietario y OID de sus recursos, y elimina exclusivamente `probe` y su esquema con `RESTRICT`, en transacción. Un objeto o dependencia inesperados impiden la limpieza y se informa el esquema para revisarlo. **Una interrupción puede dejar restos; la siguiente ejecución no los borra.** No hay barridos por prefijo, `DROP DATABASE`, `CASCADE`, `EnsureCreated` ni `EnsureDeleted`. `search_path` separa nombres, no limita los permisos del rol: se conserva el usuario local elegido y no se crearon roles nuevos. La futura preparación/limpieza del esquema comercial debe concretarse en T04. Referencias: [esquemas PostgreSQL](https://www.postgresql.org/docs/current/ddl-schemas.html), [parámetros Npgsql](https://www.npgsql.org/doc/connection-string-parameters.html).
