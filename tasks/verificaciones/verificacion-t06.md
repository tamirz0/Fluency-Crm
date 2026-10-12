# Verificación T06 / CP02: administrador inicial

Fecha: 12/10/2026. Rama `segunda-entrega-t06-admin-inicial`, desde `segunda-entrega` / `c69d887`. El usuario confirmó integración de T05 y autorizó continuar; Git comprobó que sus cuatro commits, incluida la separación de clases, están integrados. Árbol inicial limpio y referencia local `origin/segunda-entrega` coincidente, sin nueva consulta remota. Plan aprobado conservado.

## Fuentes y alcance

[T06 y CP02](../todo.md#t06), [plan §6.1](../plan.md), [SPEC acceso](../../SPEC-acceso.md), [especificación común §5–6](../../docs/segunda-entrega/especificacion-tecnica.md), [decisiones confirmadas](../../docs/segunda-entrega/decisiones-confirmadas.md), [diseño §10](../../docs/segunda-entrega/diseño-segunda-entrega.md), AGENTS/CONSTRAINTS/CAPABILITIES y [guía local](../../docs/segunda-entrega/entorno-local.md). Referencia académica consultada con pypdf: `Consigna_Trabajo_Practico.pdf` pp. 4–6 (administrador y roles) y `Definiciones-Generales.pdf` pp. 5–7 (contraseñas seguras, permisos en backend y orden de desarrollo).

Un implementador y un revisor independiente GPT-6.1 Sol, High; el orquestador coordina documentación y controles finales. Código guardado en `4fdf3c1`: `BootstrapAdmin.cs`, entrada mínima en Program y `BootstrapAdminTests.cs`. T06 no implementa sesión HTTP ni administración de usuarios; corresponde a las tareas siguientes. Sin SQL/migraciones nuevas, paquetes ni cambios frontend.

La frontera sensible es operador → variables del proceso → cuenta persistida. Se exige validación previa, BCrypt costo 12 y transacción Serializable; los diagnósticos no deben incluir credenciales, hashes, conexión, PII ni excepciones internas. No elevar usuarios existentes ni modificar contraseñas en una reejecución. Los conflictos concurrentes revierten la operación sin reintento automático, conforme al contrato común y a la [documentación de PostgreSQL 17](https://www.postgresql.org/docs/17/transaction-iso.html).

## Estado inicial comprobado

- Contenedor acordado activo, publicación exclusiva `127.0.0.1:5433` hacia `5432/tcp`.
- Desarrollo: identidad/propietario correctos; 20 tablas, tres roles, siete permisos y dieciséis asociaciones, cero usuarios/servicios/embudos/oportunidades.
- Tests: identidad/propietario correctos, cero tablas de usuario en el inventario inicial. Cada fixture verifica además su conexión y crea un esquema GUID propio, sin reutilizar desarrollo.
- Los dos procesos dotnet preexistentes fueron identificados como MSBuild, sin API/testhost; sin listener en 5169/5173. Procesos Node y compiladores preservados. No se imprimieron argumentos sensibles ni se detuvieron procesos ajenos.

## Controles

| Control | Resultado | Duración |
|---|---|---|
| Auditoría .NET, directas/transitivas, cuatro proyectos | Cero paquetes con vulnerabilidades y cero errores de consulta; sin cambios de dependencias. | 9,55 s |
| RED real elevado, comando todavía inexistente | 1/1 falló como se esperaba: el proceso no terminaba en modo bootstrap. Harness detuvo solamente su hijo; cero omisiones. | Runner: 21 s; invocación total no cronometrada. |
| GREEN focalizado de rechazo sin variables | 1/1 correcto después de corregir el harness; mismo comando y caso que RED. | Runner: 9 s; invocación total no cronometrada. |
| BootstrapAdminTests completo | 24/24 correctas, cero fallos/omisiones. Procesos CLI reales, límites, fuentes de credenciales, recuperación y dos carreras forzadas con candidatos iguales/distintos. | Invocación: 249,13 s |
| Mutación representativa | Invertir la condición de existencia de usuarios hace fallar el caso de creación/reejecución: esperaba 0, obtuvo 2. Fuente restaurada byte por byte antes del build final. | Invocación: 12,79 s |
| Build final después de restaurar | Cero errores/advertencias. | Invocación: 1,99 s |
| Comando de la guía con perfil http y User Secrets, sin datos BootstrapAdmin | Carga configuración local y rechaza la falta de Nombre con exit 1, sin HTTP ni escrituras. Destino validado previamente de forma redactada. | Invocación: 4,50 s |
| Suite backend completa | 82/82 correctas, cero fallos/omisiones. TRX contrastado: BootstrapAdminTests 24/24, IdentityTests 12/12, SchemaTests 20/20 y los 26 casos previos restantes. | Invocación: 250,12 s |
| Revisión independiente final | Sin hallazgos pendientes. Contraste de código/diff/documentos, TRX de 82 casos y mutación, JSON de auditoría y límites; no repitió controles ni conexiones. | Solo lectura |
| Escaneo de secretos | Gitleaks sin hallazgos en índice de código, contenido completo de seis documentos y rango `c69d887..4fdf3c1` de historial. Diff check correcto. Índices documentales se escanean antes de cada commit. | Scanner: 179 ms código, 153 ms documentos, 279 ms historial de código |

Auditoría ejecutada desde raíz, guardando el JSON en temporales ignorados e inspeccionando proyectos, problemas y vulnerabilidades:

```powershell
dotnet list backend/FluencyAPI.slnx package --vulnerable --include-transitive --no-restore --format json
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~BootstrapAdminTests.CommandRejectsMissingEnvironmentWithoutStartingHttp' -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~BootstrapAdminTests' -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~BootstrapAdminTests.CommandCreatesOnlyOneActiveAdministratorAndReexecutionPreservesEverything' -m:1 --logger 'trx;LogFileName=t06-mutation.trx' --results-directory node_modules/.tmp/t06-controls
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-build --no-restore --logger 'trx;LogFileName=t06-backend.trx' --results-directory node_modules/.tmp/t06-controls
dotnet run --no-build --no-restore --project backend/FluencyAPI --launch-profile http -- --bootstrap-admin
```

La última invocación es un control de solo lectura en desarrollo, con las cinco variables BootstrapAdmin ausentes y sin `DOTNET_ENVIRONMENT`, para comprobar el perfil documentado que fija `ASPNETCORE_ENVIRONMENT=Development`; no creó una cuenta. Los datos de producto los elige el operador mediante la guía. Los demás controles de persistencia usan exclusivamente la clave de tests y sus esquemas GUID. Los reportes TRX/JSON quedan en `node_modules/.tmp/t06-controls/`, ignorado por Git. No se redujeron casos, aislamiento ni timeouts para cumplir los 90 s orientativos.

## Hallazgos y correcciones

- La primera invocación sandbox fue anulada porque vstest no conectó con testhost en 90 s: no acredita RED ni un fallo funcional. Se repitió elevada, como los controles válidos de T03–T05, sin cambiar el timeout.
- La primera corrida GREEN se interrumpió tras cinco fallos de setup (56,39 s de runner): Npgsql oculta Password en la ConnectionString después de abrirla. El harness ahora recarga exclusivamente la configuración de tests validada y conserva SearchPath/Options del fixture abierto. No se relajaron las guardas ni se imprimieron valores. Después de la corrida corregida el inventario confirmó cero tablas, cero esquemas propios y cero conexiones de tests; no hizo falta barrer restos.
- La revisión del orquestador detectó que un builder genérico no respetaba el entorno ASPNETCORE del perfil local. Se usa `WebApplication.CreateBuilder` sin Build/Run y se agregó el caso de solo ASPNETCORE con rechazo previo de host remoto ficticio. El test de argumentos se fortaleció para omitir únicamente Password del entorno. Ambas correcciones están en el código revisado y las 24 pruebas verdes.
- Dos comprobaciones auxiliares del orquestador en PowerShell necesitaron ajustes: invocar `set_ConnectionString` del parser en vez de crear una clave homónima y retirar `Env:` en vez de dejar una variable vacía. El diagnóstico se mantuvo redactado y el control del perfil finalmente pasó. La guía retira expresamente variables que originalmente no existían; su bloque se analizó con el parser de PowerShell, sin errores de sintaxis.
- El usuario planteó simplificar a SQL y después indicó conservar el bootstrap si ya funciona. Se mantuvo la implementación verificada, sin un segundo mecanismo ni cambios al alcance aprobado.

## Límites y continuidad

T06 y los controles locales de CP02 completados, pendientes del OK de integración. Inventario final de solo lectura: ambas bases conservan identidad/propietario esperados; tests sin tablas de usuario, esquemas `t03_*` ni conexiones `FluencyAPI.Tests`; desarrollo conserva 20 tablas, tres roles/siete permisos/dieciséis asociaciones y cero usuarios/servicios/embudos/oportunidades. No se crea una cuenta de desarrollo con credenciales elegidas por el agente: el operador dispone del procedimiento explícito de la guía. Desarrollo no tiene limpieza automática. Los fixtures limpiaron únicamente sus recursos; no se borraron bases, no se usaron cascadas ni se barrieron restos.

El árbol estaba limpio al iniciar. Durante el trabajo apareció `.agents/skills/ponytail/` como carpeta ajena sin seguimiento: no se inspeccionó ni se incorporó a commits de T06. Los seis documentos de operación/seguimiento/continuidad se guardan en los dos grupos T06.b/T06.c aprobados en la subdivisión rutinaria. No se repite la suite tras cambios exclusivamente documentales.

La prueba solicitada en Supabase se mantiene como paso posterior con el usuario, al terminar T06/controles locales de CP02. No se conectó a la nube ni se redirigió ninguna suite; `SegundaEntregaTestDB` permanece exclusivamente local. La protección contra host remoto en Development se conserva. El ensayo remoto deberá definir explícitamente destino, aislamiento, TLS y entorno antes de preparar datos. No se realizaron merges, push ni publicaciones. T07 sigue después de la integración aprobada; la autenticación/autorización HTTP efectiva aún no se acredita. B7/B8 conservan el estado documentado; frontend/auditorías npm no se repiten por este cambio de inicialización.
