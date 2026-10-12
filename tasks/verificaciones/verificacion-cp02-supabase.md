# CP02: conexión Supabase y perfil Production

Fecha: 12/10/2026. Rama `segunda-entrega-t06-admin-inicial`. CP02 remoto abierto; sin merge, push ni publicación.

## Evidencia proporcionada por el usuario

- Session pooler Supabase, puerto 5432, base `postgres`; esquema nuevo `fluency_crm`. El usuario confirmó ejecución de los SQL T04/T05 e inventario previo al bootstrap: 20 tablas, 3 roles, 7 permisos, 16 asociaciones y 0 usuarios.
- Bootstrap remoto: salida 4. Diagnóstico de solo lectura con la misma conexión: `NpgsqlException` con `AuthenticationException` interna, fallo en negociación TLS; causa exacta pendiente. No se acreditó creación ni reejecución remota.
- El usuario decidió usar este proyecto como base productiva y pidió un perfil persistente `Production`. No se redirigen las suites locales ni se reconstruye la base.

## Cambio y controles locales

- Perfil Production y selección explícita de `ConnectionStrings:SegundaEntregaProductionDB` en API/bootstrap. Las fuentes normales tienen prioridad; User Secrets es respaldo local de esa clave, sin fallback a desarrollo. `http`/`https` fijan Development, incluida la prioridad de DOTNET_ENVIRONMENT. Sin dependencias nuevas ni lógica comercial nueva.
- Se reutilizó el test de creación/reejecución existente para crear desde Production con una conexión de desarrollo deliberadamente incompleta; el destino sigue siendo el fixture exclusivo local. No se agregaron casos ni se retiraron comprobaciones.
- RED: `dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~BootstrapAdminTests.CommandCreatesOnlyOneActiveAdministratorAndReexecutionPreservesEverything' -m:1`: fallo esperado, salida 1 en lugar de 0 (runner 6 s), antes de adaptar la selección.
- GREEN: `dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~BootstrapAdminTests.CommandCreatesOnlyOneActiveAdministratorAndReexecutionPreservesEverything|FullyQualifiedName~BootstrapAdminTests.AspNetCoreDevelopmentAlonePreservesNormalEnvironmentAndLocalHostGuard' -m:1`: 3/3, cero omisiones, runner 34 s. Contenedor revalidado en ejecución, `127.0.0.1:5433`; el fixture valida identidad/aislamiento antes de escribir y limpia sus recursos.
- `dotnet build backend/FluencyAPI.slnx --no-restore -m:1`: cero errores/advertencias, MSBuild 1,66 s.
- Comprobación manual del perfil real con clave productiva explícita en blanco, clave local incompleta y entorno padre Staging: salida 1 y diagnóstico de falta de `SegundaEntregaProductionDB`, antes de abrir conexiones. Prueba que el perfil fija Production y no cae a desarrollo. Variables restauradas.
- Inventario local posterior de solo lectura: destino/identidad correctos, cero esquemas de fixture y cero tablas de usuario en `fluency_segunda_entrega_test`. Revisión del diff y `git diff --check` correctos; escaneo redactado de los cambios staged sin secretos detectados.

## Pendientes

Guardar la conexión productiva una sola vez desde Windows Terminal y resolver TLS. Comprobar bootstrap, reejecución sin cambios e inventario final 1 usuario / 1 asociación / 1 administrador activo. Registrar el resultado y obtener el OK de cierre de CP02. La carga de la conexión real desde el almacén del usuario aún no se probó; la suite completa no se repitió para esta configuración acotada. Login/autorización HTTP y despliegue siguen en tareas posteriores.
