# Entorno local de la segunda entrega

Acuerdos con el usuario y ejecución inicial: 11/10/2026, T02. Evidencia en [verificacion-t02.md](../../tasks/verificaciones/verificacion-t02.md).

## Destinos y separación

| Uso | Destino/configuración |
|---|---|
| Desarrollo de segunda entrega | PostgreSQL local, `localhost:5433`, base `fluency_segunda_entrega_dev`; clave `ConnectionStrings:SegundaEntregaDB` en User Secrets. |
| Primera entrega | Configuración local anterior `ConnectionStrings:FluencyLocalDB`, preservada en `appsettings.json`. La nueva API no consulta esa clave ni la usa como respaldo. |
| Pruebas automatizadas | Pendiente de T03: base y fixture separados. No reutilizar la base de desarrollo ni heredar su conexión. |
| Producción | Configuración explícita `ConnectionStrings__SegundaEntregaDB` en el hosting, sin User Secrets. Azure y su publicación siguen pendientes; no se probaron. |

Contenedor informado y comprobado: `968c3a20d1e55ae43fa73f0c27ff3fcc08f38c00a22ae27105c8b227cd14a964`. El 11/10/2026 estaba en ejecución y publicaba `127.0.0.1:5433` hacia `5432/tcp`. Comprobar nuevamente si cambia el entorno:

```powershell
docker inspect --format '{{.State.Status}} {{json .NetworkSettings.Ports}}' 968c3a20d1e55ae43fa73f0c27ff3fcc08f38c00a22ae27105c8b227cd14a964
```

La base nueva se creó explícitamente después de comprobar que no existía. Pertenece al usuario de conexión y tiene cero tablas de aplicación. Usa las credenciales locales proporcionadas por el usuario; no se copian aquí. No se borró, migró ni alteró la base anterior. El esquema se prepara en T04: arrancar la API no crea tablas, datos ni usuarios.

## Secretos de desarrollo

Se eligió User Secrets de .NET. El `UserSecretsId` versionado en `FluencyAPI.csproj` es un identificador público del almacén, no una credencial. ASP.NET Core lo carga automáticamente en `Development`. Los valores se guardan fuera del repositorio, en el perfil del usuario, **sin cifrar**; no es un almacén para producción. Referencia: [Secret Manager de ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-10.0).

La conexión de esta máquina ya fue guardada. Para configurar otra máquina, desde la raíz, después de identificar el PostgreSQL y crear expresamente una base nueva separada:

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

La contraseña se solicita sin eco y el JSON se transmite por stdin; no poner la cadena literal en comandos, documentación o argumentos de procesos. El dato existe en memoria y en el archivo local sin cifrar. No ejecutar `dotnet user-secrets list` ni imprimir el JSON en capturas/logs compartidos. No agregar archivos de secretos a Git. El `appsettings.json` modificado por el usuario se preservó y quedó fuera de los commits de T02.

Variables de entorno tienen mayor precedencia que User Secrets. Una variable `ConnectionStrings__SegundaEntregaDB` antigua puede sobrescribir el secreto: comprobar su presencia sin imprimir el valor y quitarla del proceso si se desea usar User Secrets. La clave vieja `FluencyLocalDB` no sustituye a la nueva, aunque exista en archivos o variables.

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

La API valida la configuración antes de registrar el DbContext y escuchar:

- Clave ausente o en blanco: indica que falta `ConnectionStrings:SegundaEntregaDB`.
- Formato inválido: diagnóstico genérico, sin valores ni excepción interna del parser.
- `Host` o `Database` vacíos: exige destino explícito; no infiere una base por el usuario.
- En `Development`, permite exactamente `localhost`, `127.0.0.1` o `::1`; rechaza hosts remotos, múltiples y rutas de socket. No intenta conectarse al destino rechazado.

La validación de arranque no abre conexiones ni certifica que PostgreSQL esté disponible. T02 verificó por separado el acceso TCP, la identidad de la base y su ausencia de tablas. Production exige configuración válida/expresa, pero no tiene la restricción de host local; no interpretar esto como autorización para probar Azure. T03 añadirá sus propios controles de aislamiento antes de preparar datos.

Con la base vacía funcionan el inicio y OpenAPI, **todavía no los recorridos comerciales ni el login contra el modelo nuevo**. No apuntar a la primera entrega para disimular esa transición. No usar `EnsureCreated`, `EnsureDeleted`, restauraciones ni scripts destructivos al arrancar. La creación del esquema y los recorridos siguientes se habilitan en las tareas correspondientes.
