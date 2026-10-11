# Verificación T05: identidad y roles fijos

Fecha: 11/10/2026. Rama `segunda-entrega-t05-identidad-roles`, desde `segunda-entrega` / `a639f76`. T04 y su cierre documental están integrados; el usuario confirmó merge/push. `HEAD` y la referencia local `origin/segunda-entrega` coincidían, sin consultar nuevamente el remoto. Árbol inicial limpio, incluido el pendiente Supabase de CP02 ya versionado por el usuario. Inicio de T05 autorizado explícitamente; no se reabrió el plan aprobado.

## Alcance y fuentes

[T05 y subdivisión](../todo.md#t05), [plan §6.1](../plan.md), [SPEC acceso](../../SPEC-acceso.md), [convenciones comunes §5–6](../../docs/segunda-entrega/especificacion-tecnica.md), [decisiones §2–3](../../docs/segunda-entrega/decisiones-confirmadas.md), E-R/§10/ejemplos del [diseño](../../docs/segunda-entrega/diseño-segunda-entrega.md), AGENTS/CONSTRAINTS/CAPABILITIES y guía local/evidencia T04. Consulta académica con pypdf: `Consigna_Trabajo_Practico.pdf` pp. 4–6, alcance/roles. Se conservan las precisiones de lectura compartida y precedencia multirrol aprobadas posteriormente.

Un único implementador mantiene continuidad con T04; revisión independiente separada, ambos GPT-6.1 Sol, High. El orquestador coordina documentación, base de desarrollo y controles finales. T05 no incluye bootstrap/administrador (T06), sesión/antiforgery/HTTP (T07–T12), mapeos comerciales pendientes ni cambios en frontend. SQL explícito continúa siendo la fuente de instalación; sin EF migrations ni DDL de arranque.

## Estado inicial comprobado

- Contenedor acordado activo, publicación exclusiva `127.0.0.1:5433` hacia `5432/tcp`.
- Base de desarrollo `fluency_segunda_entrega_dev`: propietario/identidad verificados, 20 tablas en `public`, cero usuarios/roles/permisos.
- Base de pruebas `fluency_segunda_entrega_test`: propietario/identidad verificados, cero tablas de usuario y cero esquemas `t03_*`.
- Vite en 5173, PID 11256, preservado. API sin escuchar en 5169; procesos dotnet existentes son compiladores, sin testhost activo. Comprobación con elevación de lectura porque el sandbox no mostraba procesos/puertos.
- No se imprimieron argumentos de procesos, credenciales, conexiones ni hashes. No se detuvo ningún proceso ni se inició la API.

## Controles ejecutados y pendientes

| Control | Resultado | Duración |
|---|---|---|
| Auditoría .NET, cuatro proyectos, directas y transitivas | Cero vulnerabilidades reportadas, sin errores de consulta. JSON guardado localmente. Sin cambios de paquetes/lockfiles. | 9,14 s |
| T05.a RED metadata antes de implementar | Un fallo esperado: `Usuario.Activo` era `bool?`, incompatible con SQL obligatorio. Cero omisiones. | TRX: 1,93 s |
| T05.a GREEN IdentityTests | 3/3, cero omisiones; activo por defecto, false explícito/cambios sin reactivación, N:M y unicidad normalizada real en PostgreSQL. | TRX: 14,99 s |
| T05.b RED semilla antes de implementar | Un fallo esperado por ausencia de `segunda-entrega-roles.sql`; fixture limpiado. | TRX: 7,40 s |
| T05.b GREEN IdentityTests | 11/11, cero omisiones; incluye T05.a, matriz y precedencia multirrol con datos persistidos, rechazos de inicialización y reejecución. | TRX: 64,60 s |
| Caso adicional sugerido por revisión | 1/1; vendedor con permisos superiores asociados indebidamente sigue sin administración/reapertura/alcance total. Código de capacidades sin cambios. | TRX: 0,79 s |
| Mutación representativa del control activo | Invertir `usuario.Activo` provoca el fallo esperado de la prueba de capacidades de inactivos. Archivo restaurado byte por byte; compilación final posterior con fuente correcta. | Invocación: 3,92 s |
| Build backend final | Cero errores y advertencias, después de restaurar la mutación. | Invocación: 2,14 s |
| Suite backend completa final | 58/58, cero omitidas; IdentityTests 12/12 y SchemaTests 20/20, contrastados con TRX. | Invocación: 134,17 s; TRX: 133,30 s |
| Revisión independiente | Código sin hallazgos requeridos/críticos. Sugerencia de cobertura del vendedor atendida y verificada. Contraste de TRX/JSON correcto; un párrafo de continuidad desactualizado corregido antes del cierre. | — |
| Preparación explícita de roles en desarrollo | Procedimiento exacto de la guía ejecutado una vez, SQL del commit `5e38d60`, sin usuarios ni borrados. | 0,59 s |
| Consulta final de desarrollo/tests | Desarrollo: 20 tablas, 3 roles/7 permisos/16 asociaciones, 0 usuarios/roles asignados/servicios/embudos/oportunidades. Tests: 0 tablas de usuario y 0 esquemas propios. Identidad/propietarios verificados. | Invocación: 0,90 s |
| Escaneo redactado | Código staged T05.a/T05.b, documentos completos y dos commits nuevos sin secretos detectados; diff y whitespace correctos. Escaneo staged documental al guardar el cierre. | Scanner: 196/186 ms (código), 141 ms (docs), 232 ms (dos commits) |

Comando de auditoría ejecutado desde la raíz:

```powershell
dotnet list backend/FluencyAPI.slnx package --vulnerable --include-transitive --no-restore --format json
```

Comandos T05.a (RED antes de tocar los modelos; GREEN después, compilación incluida):

```powershell
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~IdentityTests.IdentityMetadataMatchesSqlAndDoesNotInventSimpleNormalizedIndexes' --logger 'trx;LogFileName=t05a-red.trx' --results-directory node_modules/.tmp/t05-controls
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~IdentityTests' --logger 'trx;LogFileName=t05a-green.trx' --results-directory node_modules/.tmp/t05-controls
```

T05.b y controles del orquestador (todos desde la raíz; la mutación se restaura antes del build y de la suite):

```powershell
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~IdentityTests.SeedsExactlyThreeFixedProfilesWithTheirPermissionMatrixAndNoUsers' --logger 'trx;LogFileName=t05b-red.trx' --results-directory node_modules/.tmp/t05-controls
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~IdentityTests' --logger 'trx;LogFileName=t05b-green.trx' --results-directory node_modules/.tmp/t05-controls
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~IdentityTests.SellerDoesNotBecomeSuperiorWhenHigherPermissionsAreAttached' --logger 'trx;LogFileName=t05b-role-guard.trx' --results-directory node_modules/.tmp/t05-controls
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~IdentityTests.InactiveUnknownOrUnassignedUsersHaveNoCapabilities' --logger 'trx;LogFileName=t05-mutation.trx' --results-directory node_modules/.tmp/t05-controls
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-build --no-restore --logger 'trx;LogFileName=t05-backend.trx' --results-directory node_modules/.tmp/t05-controls
```

T05.a guardado en `59a9b4d`: cuatro archivos, 136 inserciones/13 eliminaciones. Escaneo staged Gitleaks 8.30.1 con `--redact=100`: sin secretos detectados (196 ms); `git diff --cached --check` correcto. Mapeos alineados con el SQL existente, sin modificar DDL ni generar otro: IDs identity always, `Activo` bool obligatorio con default/sentinel true, código de permiso único y descripciones text opcionales, cuatro FKs N:M Restrict. Los índices `lower(btrim(...))` siguen definidos exclusivamente en SQL; EF deja de describir índices simples distintos. Fuentes técnicas: [default booleano y sentinel de EF Core](https://learn.microsoft.com/en-us/ef/core/what-is-new/ef-core-8.0/whatsnew#database-defaults-for-booleans) y [generación de valores Npgsql](https://www.npgsql.org/efcore/modeling/generated-properties.html).

T05.b incorpora tres ubicaciones: SQL explícito de roles, códigos/capacidades simples y ampliación de IdentityTests. Tres roles, siete permisos y dieciséis asociaciones, sin cuentas. `rol.nombre` guarda el código estable y `descripcion` la etiqueta, según el modelo existente, sin nuevo DDL. La semilla requiere las cinco tablas de identidad vacías, destino/esquema expreso y una transacción externa; las bloquea con `SHARE ROW EXCLUSIVE` antes de comprobar/escribir. Rechaza datos previos/re-ejecución y no hace correcciones mediante upsert. El cálculo de capacidades usa relaciones cargadas por el servidor, unión sin duplicados e inmutabilidad; inactivo/sin rol reconocido/sin navegaciones no obtiene capacidades. Administrar/reabrir exigen el rol correspondiente además del permiso. No autentica ni comprueba propiedad de un recurso concreto: eso se integra en las tareas posteriores con actor validado y reglas transaccionales.

T05.b guardado en `5e38d60`: tres archivos, 295 inserciones. Escaneo staged sin secretos detectados (186 ms); diff de código revisado, sin supresiones, cambios de paquetes, fixture ni rutas HTTP. La guía local tiene diez bloques PowerShell, todos analizados sin errores sintácticos; los bloques históricos no se vuelven a ejecutar. Pasaron 65 destinos de enlaces locales en los siete documentos de cierre. Escaneo de contenido documental completo y de los dos commits nuevos sin secretos detectados; esto no repite ni declara limpio el historial anterior conocido.

La revisión independiente contrastó requisitos/diff/tests, TRX y JSON de auditoría. La sugerencia opcional de un vendedor con permisos superiores asociados se resolvió con una prueba focalizada adicional. Detectó además un párrafo antiguo en §8 del contexto que todavía situaba T04 pendiente/siguiente T05; se corrigió a T04 integrada, T05 pendiente de integración/siguiente T06 y preparación de roles ya aplicada, conservando los resultados históricos. No hubo correcciones productivas requeridas ni se debilitó ningún control. Comandos de escaneo ejecutados con Gitleaks 8.30.1:

```powershell
& 'node_modules/.tmp/t01-tools/gitleaks-8.30.1/gitleaks.exe' git . --pre-commit --staged --redact=100 --no-banner --no-color
& 'node_modules/.tmp/t01-tools/gitleaks-8.30.1/gitleaks.exe' git . --log-opts='a639f76..HEAD' --redact=100 --no-banner --no-color
```

El contenido de los siete documentos completos también se pasó por stdin al scanner con redacción. El rango de historial indicado se ejecutó cuando HEAD era `5e38d60` (dos commits de código). El índice documental se vuelve a escanear al guardarlo, incluyendo esta evidencia.

## Preparación local explícita

Después de revisión estática y controles finales se ejecutó exactamente el bloque de la [guía T05](../../docs/segunda-entrega/entorno-local.md#preparación-explícita-de-roles-y-permisos-t05), extraído de su sección y analizado como PowerShell, una sola vez. La fuente SQL ya estaba guardada en `5e38d60`. El procedimiento revalidó contenedor/publicación, base/propietario y destino expreso; aplicó únicamente `segunda-entrega-roles.sql` en una transacción. No se repitieron esquema/catálogos T04 ni se crearon cuentas. La comprobación previa redactada del secreto de desarrollo confirmó host local, puerto 5433, base exacta, credenciales presentes y ausencia de override de entorno; valores nunca impresos.

Inventario final de solo lectura, sin seleccionar hashes ni credenciales:

```sql
SELECT count(*) AS tablas_producto FROM pg_tables WHERE schemaname='public';
SELECT r.nombre, r.descripcion, count(pr.id_permiso) AS permisos
FROM public.rol r LEFT JOIN public.permiso_rol pr ON pr.id_rol=r.id
GROUP BY r.id ORDER BY r.nombre;
SELECT (SELECT count(*) FROM public.usuario) AS usuarios,
       (SELECT count(*) FROM public.rol) AS roles,
       (SELECT count(*) FROM public.permiso) AS permisos,
       (SELECT count(*) FROM public.permiso_rol) AS asociaciones,
       (SELECT count(*) FROM public.usuario_rol) AS roles_usuario;
SELECT (SELECT count(*) FROM public.servicio) AS servicios,
       (SELECT count(*) FROM public.embudo) AS embudos,
       (SELECT count(*) FROM public.oportunidad) AS oportunidades;
```

Resultado: administrador 7 permisos, responsable comercial 5, vendedor 4; total 3/7/16, usuarios/asignaciones/negocio 0. Ambas bases mantuvieron identidad y propietario esperados. Tests terminó sin tablas de usuario ni esquemas `t03_*`; la limpieza continúa limitada a los recursos propios de cada fixture, sin cascadas, borrados de bases ni barridos de restos. No repetir la semilla de desarrollo: debe rechazar la instalación ya preparada. Revertir Git no revierte los datos confirmados.

Reportes de esta ejecución: `node_modules/.tmp/t05-controls/` (ignorados por Git). Se inspeccionó el JSON de auditoría: cuatro proyectos sin paquetes vulnerables ni errores; el primer resumen auxiliar de PowerShell contó dos valores nulos como paquetes y se corrigió al filtrar nulos, sin repetir ni alterar la consulta.

## Límites y continuidad

Las pruebas automatizadas siguen exclusivamente en PostgreSQL local con la clave de tests y limpieza propia de T03/T04. El control completo superó el presupuesto aproximado de 90 s y se completó sin reducir casos/aislamiento ni alterar timeouts. No se repitió la suite después del resultado correcto porque solo cambió documentación y la aplicación explícita de semillas en la base de desarrollo separada.

La revisión de la base de prueba Supabase se mantiene para el final de CP02/T06 cuando el usuario la haya creado; no se ha conectado ni redirigido ninguna clave a la nube. Azure y la primera entrega permanecen fuera de estas pruebas. B7/B8 conservan su estado previo; no se repiten frontend/auditorías npm por este cambio de persistencia. La API aún conserva deuda de acceso/contratos antiguos que se resolverá en T07–T12; T05 no acredita protección HTTP, administrador inicial ni mapeos comerciales nuevos. Sigue T06 después del OK de integración. Merge/push/publicación nuevos no se realizaron. Incremento completado, pendiente del OK de integración.
