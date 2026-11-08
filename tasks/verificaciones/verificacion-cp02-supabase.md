# CP02: conexión Supabase y perfil Production

Fecha: 12/10/2026. Rama `segunda-entrega-t06-admin-inicial`. CP02 cerrado con el OK del usuario del 12/10/2026; integración local a `segunda-entrega` realizada mediante `c363670`, sin conflictos. Sin push ni publicación.

## Evidencia proporcionada por el usuario

- Session pooler Supabase, puerto 5432, base `postgres`; esquema nuevo `fluency_crm`. El usuario confirmó ejecución de los SQL T04/T05 e inventario previo al bootstrap: 20 tablas, 3 roles, 7 permisos, 16 asociaciones y 0 usuarios.
- Intento inicial del bootstrap remoto: salida 4. Diagnóstico de solo lectura con la misma conexión: `NpgsqlException` con `AuthenticationException` interna, fallo en negociación TLS. La causa exacta de ese intento no se determinó.
- El usuario decidió usar este proyecto como base productiva y pidió un perfil persistente `Production`. No se redirigen las suites locales ni se reconstruye la base.
- Resultado final: el usuario confirmó que funciona la conexión a Supabase y aportó capturas con 1 usuario, 1 asociación y 1 administrador activo. Confirmó además la reejecución con el mensaje «Administrador ya inicializado; no se modificaron cuentas ni credenciales». Evidencia manual del usuario, sin repetir conexiones desde Codex ni copiar datos de la cuenta, hashes o capturas sensibles al repositorio.
- El usuario indicó que no aplicó configuración TLS adicional. No se verificó el modo efectivo, el cifrado ni la validación del certificado; no atribuir el resultado a Require, VerifyFull o un certificado configurado. El perfil no impone TLS. Npgsql usa Prefer si SSL Mode se omite; una conexión exitosa por sí sola no acredita cifrado. La recomendación de configuración TLS productiva permanece en la guía.

## Cambio y controles locales

- Perfil Production y selección explícita de `ConnectionStrings:SegundaEntregaProductionDB` en API/bootstrap. Las fuentes normales tienen prioridad; User Secrets es respaldo local de esa clave, sin fallback a desarrollo. `http`/`https` fijan Development, incluida la prioridad de DOTNET_ENVIRONMENT. Sin dependencias nuevas ni lógica comercial nueva.
- Se reutilizó el test de creación/reejecución existente para crear desde Production con una conexión de desarrollo deliberadamente incompleta; el destino sigue siendo el fixture exclusivo local. No se agregaron casos ni se retiraron comprobaciones.
- RED: `dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~BootstrapAdminTests.CommandCreatesOnlyOneActiveAdministratorAndReexecutionPreservesEverything' -m:1`: fallo esperado, salida 1 en lugar de 0 (runner 6 s), antes de adaptar la selección.
- GREEN: `dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~BootstrapAdminTests.CommandCreatesOnlyOneActiveAdministratorAndReexecutionPreservesEverything|FullyQualifiedName~BootstrapAdminTests.AspNetCoreDevelopmentAlonePreservesNormalEnvironmentAndLocalHostGuard' -m:1`: 3/3, cero omisiones, runner 34 s. Contenedor revalidado en ejecución, `127.0.0.1:5433`; el fixture valida identidad/aislamiento antes de escribir y limpia sus recursos.
- `dotnet build backend/FluencyAPI.slnx --no-restore -m:1`: cero errores/advertencias, MSBuild 1,66 s.
- Comprobación manual del perfil real con clave productiva explícita en blanco, clave local incompleta y entorno padre Staging: salida 1 y diagnóstico de falta de `SegundaEntregaProductionDB`, antes de abrir conexiones. Prueba que el perfil fija Production y no cae a desarrollo. Variables restauradas.
- Inventario local posterior de solo lectura: destino/identidad correctos, cero esquemas de fixture y cero tablas de usuario en `fluency_segunda_entrega_test`. Revisión del diff y `git diff --check` correctos; escaneo redactado de los cambios staged sin secretos detectados.
- Revisión independiente final del cambio de perfil `17a9831..c0a3e41`: sin hallazgos bloqueantes; confirmó selección de clave productiva, prioridad del entorno, fixtures locales y límite TLS declarado. El orquestador contrastó el diff y la evidencia antes de integrar.

## Pendientes

El usuario confirmó el funcionamiento y autorizó la integración el 12/10/2026; CP02 queda cerrado con ese OK. La configuración TLS efectiva no fue verificada y debe revisarse al preparar publicación; la conexión funcional no acredita seguridad de despliegue. La suite completa no se repitió para esta configuración acotada. Login/autorización HTTP y despliegue siguen en tareas posteriores. No se requieren más comprobaciones de creación/reejecución para esta revisión.
