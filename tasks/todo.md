# Tareas verificables: segunda entrega

Plan del 08/10/2026, actualizado el 22/10/2026. **Planificación aprobada y cerrada; T01–T09 y CP01–CP03 integradas localmente en `segunda-entrega`. T09/CP03 integrada en `3ac9310`; los cambios documentales recientes se conservan en `2930e95`. T10–T12 y CP04 completos/verificados e integrados localmente en `segunda-entrega` / `20c5383`, con demo del usuario sin fallos; sin publicar. T13–T15/CP05 completas, verificadas por pruebas y validadas manualmente por el usuario; integradas localmente en `segunda-entrega` mediante fast-forward a `809a23a`; sin publicar. T16–T49 pendientes.** Evidencia y límites en [CP04](verificaciones/verificacion-cp04.md). Bootstrap explícito; se conserva la deuda previa. No pedir nuevamente aprobación del plan.

Los códigos B/F/API/UI/D/S se definen en el plan. Nombres de archivos nuevos y clases de tests son ubicaciones propuestas; concretarlos al implementar. Dependencias son tareas terminadas y verificadas, no solo commits escritos. Estimación M: una sesión, unos 3–5 archivos; S: 1–2. Si el inventario real excede el tamaño, dividir conservando trazabilidad antes de editar; las rutas generadas y wiring también cuentan.

Las tareas de API/persistencia son pasos internos de un incremento vertical; no integrar un contrato nuevo separado de sus consumidores. Cada checkpoint registra evidencia del agente. Solo los merges y la publicación necesitan el OK correspondiente; no hay confirmación humana obligatoria cada tres tareas.

## Índice

- [x] [T01 — Actualizar la línea de base y los comandos de control](#t01)
- [x] [T02 — Aislar la configuración de base local](#t02)
- [x] [T03 — Preparar pruebas HTTP con PostgreSQL aislado](#t03)
- [x] [T04 — Escribir el esquema objetivo de segunda entrega](#t04)
- [x] [T05 — Mapear la identidad y los tres roles fijos](#t05)
- [x] [T06 — Crear el administrador mediante inicialización explícita](#t06)
- [x] [T07 — Preparar contrato HTTP y corte de rutas anteriores](#t07)
- [x] [T08 — Autenticar por cookie y validar el actor en servidor](#t08)
- [x] [T09 — Adaptar el transporte frontend a la sesión real](#t09)
- [x] [T10 — Restaurar y cerrar sesión desde la interfaz](#t10)
- [x] [T11 — Administrar cuentas desde API](#t11)
- [x] [T12 — Gestionar usuarios desde la pantalla administrativa](#t12)
- [x] [T13 — Alinear los catálogos con el modelo objetivo](#t13)
- [x] [T14 — Exponer administración y opciones de catálogos](#t14)
- [x] [T15 — Editar catálogos desde configuración](#t15)
- [ ] [T16 — Mapear servicios, embudos y etapas](#t16)
- [ ] [T17 — Gestionar servicios mediante API](#t17)
- [ ] [T18 — Gestionar servicios desde UI](#t18)
- [ ] [T19 — Gestionar embudos y sus finales automáticas](#t19)
- [ ] [T20 — Gestionar y reordenar etapas](#t20)
- [ ] [T21 — Configurar embudos y etapas desde UI](#t21)
- [ ] [T22 — Alinear persistencia de empresas y contactos](#t22)
- [ ] [T23 — Adaptar empresas a los contratos y reglas nuevos](#t23)
- [ ] [T24 — Actualizar pantallas de empresas](#t24)
- [ ] [T25 — Adaptar contactos conservando relaciones históricas](#t25)
- [ ] [T26 — Actualizar pantallas de contactos](#t26)
- [ ] [T27 — Completar bajas definitivas de clientes](#t27)
- [ ] [T28 — Adaptar el modelo e historial de oportunidades](#t28)
- [ ] [T29 — Crear oportunidades con defaults e historial atómico](#t29)
- [ ] [T30 — Simplificar el alta de oportunidad en UI](#t30)
- [ ] [T31 — Consultar oportunidades e historial de etapas](#t31)
- [ ] [T32 — Mostrar tabla y ficha de oportunidades compartidas](#t32)
- [ ] [T33 — Mostrar funnel según el rol](#t33)
- [ ] [T34 — Editar datos de una oportunidad abierta](#t34)
- [ ] [T35 — Reasignar una oportunidad y retirar permiso anterior](#t35)
- [ ] [T36 — Mover entre etapas abiertas con historial](#t36)
- [ ] [T37 — Cerrar oportunidades como ganadas o perdidas](#t37)
- [ ] [T38 — Reabrir una oportunidad conservando su cierre](#t38)
- [ ] [T39 — Dar de baja oportunidades sin cascadas](#t39)
- [ ] [T40 — Mapear actividades realizadas](#t40)
- [ ] [T41 — Registrar y consultar actividades por API](#t41)
- [ ] [T42 — Registrar actividades desde fichas](#t42)
- [ ] [T43 — Editar y dar de baja actividades con permisos de origen y destino](#t43)
- [ ] [T44 — Proyectar el historial comercial combinado](#t44)
- [ ] [T45 — Mostrar historial comercial en las tres fichas](#t45)
- [ ] [T46 — Comprobar retiro del legado y coherencia de contratos](#t46)
- [ ] [T47 — Cerrar la verificación de seguridad acordada](#t47)
- [ ] [T48 — Ensayar la entrega completa en local](#t48)
- [ ] [T49 — Preparar la publicación académica sin ejecutarla](#t49)

## Detalle

<a id="t01"></a>

### T01 — Actualizar la línea de base y los comandos de control

**Resultado:** Actualizar la línea de base y los comandos de control, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** ninguna. **Tamaño previsto:** M; 3 ubicaciones principales previstas.

**Archivos probables:** `CONSTRAINTS.md`; `frontend/package.json`; `docs/segunda-entrega/contexto-segunda-entrega.md`.

**Aceptación:**

- [x] Registrar resultados actuales de build, lint y suite existente, separando cada fallo previo de uno nuevo; no reutilizar el resultado histórico de la URL remota.
- [x] Acotar lint a código propio y dejar invocaciones reproducibles de pruebas y auditorías, sin suprimir reglas ni pruebas.
- [x] Inventariar dependencias y secretos con resultados redactados; si la herramienta o la red impiden un control, identificarlo como pendiente.

**Verificación:** B + F + suite frontend completa + S + D. Medir duración; la medición inicial es un checkpoint y puede superar 90 s.

**Evidencia (11/10/2026):** [comandos, resultados, duraciones, inventario y limitaciones](verificaciones/verificacion-t01.md). Builds correctos; lint normalizado con una advertencia previa; frontend 70/71 y reproducción aislada del fallo de carga diferida, ambos antes de editar. Auditorías completadas: npm raíz y .NET sin vulnerabilidades reportadas; frontend un alto preexistente en `source-map-js@1.2.1`. Gitleaks + revisión estática: credencial de configuración local ajena y fallback de DbContext, sin valores publicados ni secretos añadidos al cambio. Docker/API/Vite iniciados y tres GET locales correctos, sin mutaciones ni pruebas de persistencia. T01 completa la medición y los comandos, no corrige la deuda registrada B7/B8 ni las tareas T02+. Integración realizada posteriormente por el usuario; commit `9b60868` incluido en `segunda-entrega`. El push fue confirmado por el usuario.

<a id="t02"></a>

### T02 — Aislar la configuración de base local

**Resultado:** Aislar la configuración de base local, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T01. **Tamaño previsto:** M; 3 ubicaciones principales previstas.

**Archivos probables:** `backend/Persistence/Models/FluencyLocalDbContext.cs`; `backend/FluencyAPI/Program.cs`; `docs/segunda-entrega/entorno-local.md (nuevo)`.

**Subdivisión al iniciar (11/10/2026):** la elección conjunta de User Secrets agrega `FluencyAPI.csproj`; junto con guía, evidencia y seguimiento, el total supera cinco archivos. Se conserva T02 como tarea padre y se ejecuta secuencialmente:

- [x] **T02.a — Configuración explícita:** habilitar User Secrets; quitar respaldo del DbContext; validar la nueva clave `ConnectionStrings:SegundaEntregaDB` y destino local en Development. Áreas: csproj, Program.cs y DbContext; build y diagnóstico sin configuración.
- [x] **T02.b — Entorno local y evidencia:** identificar/crear la base vacía acordada `fluency_segunda_entrega_dev`, configurar el secreto fuera de Git, comprobar destino/ausencia de cambios de esquema y documentar operación en `docs/segunda-entrega/entorno-local.md` y `tasks/verificaciones/verificacion-t02.md`. Actualizar seguimiento solo con evidencia real.

Decisiones del usuario: User Secrets de .NET y base nueva `fluency_segunda_entrega_dev` en el PostgreSQL local existente, usando sus credenciales. Durante T02 se preservaron `appsettings.json` y la base anterior; posteriormente el usuario retiró la información sensible del archivo. No ejecutar esquema hasta T04. Base de pruebas y fixture corresponden a T03.

**Aceptación:**

- [x] Eliminar la conexión con contraseña de respaldo del código; configuración ausente produce diagnóstico sin secretos.
- [x] Identificar host/puerto locales del contenedor autorizado y una base de desarrollo separada; no modificar la conexión local ajena ni recrear la primera entrega.
- [x] Documentar variables y destinos con valores de ejemplo inocuos; distinguir desarrollo de pruebas y prohibir fallback a Azure.

**Verificación:** B + D; arranque local sin configuración falla de forma clara; revisión redactada del destino. Si falta información de acceso, pedir solo ese dato.

**Evidencia (11/10/2026):** [comandos, resultados, duraciones y límites](verificaciones/verificacion-t02.md). Build sin errores/advertencias; siete rechazos de configuración comprobados antes de escuchar y sin revelar valores ficticios. API y proxy OpenAPI 200. Conexión TCP con User Secrets confirma `localhost:5433` y base acordada sin tablas; propietario verificado. Contraseña de respaldo eliminada; configuración local ajena preservada fuera del cambio. Revisión independiente sin bloqueantes y árbol escaneado sin secretos nuevos al cerrar el agente. Después se diagnosticó la redirección del almacén de Codex a `LocalCache`; el usuario confirmó su importación al perfil normal de Windows y el retiro de información sensible de appsettings, sin repetir controles de conexión/auditoría tras esa intervención. Commit `a3fa0c4` integrado en `segunda-entrega`; merge y push confirmados por el usuario. T03 prepara el fixture y T04 el esquema; no se desplegó la aplicación.

<a id="t03"></a>

### T03 — Preparar pruebas HTTP con PostgreSQL aislado

**Resultado:** Preparar pruebas HTTP con PostgreSQL aislado, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T02. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj (nuevo)`; `backend/FluencyAPI.Tests/LocalApiFactory.cs (nuevo)`; `backend/FluencyAPI.Tests/DatabaseIsolationTests.cs (nuevo)`; `backend/FluencyAPI.slnx`; `backend/FluencyAPI/Program.cs`.

**Subdivisión antes de implementar (11/10/2026):** el inventario incluye también guía y evidencia, por lo que se divide en T03.a (proyecto, fixture, pruebas y wiring) y T03.b (configuración local, guía, evidencia y CP01). Las comprobaciones de destino y ciclo de vida podrán separarse dentro del proyecto de tests para mantener archivos legibles.

**Decisiones del usuario:** base exclusiva `fluency_segunda_entrega_test` en `localhost:5433`; esquema único y una tabla de infraestructura por ejecución. Limpieza limitada a esos objetos, sin cascadas ni eliminación de la base; tras una interrupción los restos requieren revisión, sin barridos automáticos. Desarrollo permanece vacío hasta T04. Configuración exclusiva de tests mediante User Secrets, clave `ConnectionStrings:SegundaEntregaTestDB`, sin respaldo en la conexión de desarrollo.

**Aceptación:**

- [x] Crear proyecto xUnit/WebApplicationFactory compatible y base de tests identificada, separada de desarrollo; la conexión nunca hereda Azure ni la conexión habitual.
- [x] El fixture comprueba host, base y propiedad antes de preparar/limpiar sus datos; sin configuración falla explícitamente, sin skip ni InMemory.
- [x] Demostrar una escritura/lectura real y limpieza limitada al recurso creado por tests; documentar el mecanismo de aislamiento para ejecuciones repetidas.

**Verificación:** B + API(DatabaseIsolationTests) + D; un destino no permitido se rechaza antes de escribir.

**Evidencia T03 (11/10/2026):** [verificacion-t03.md](verificaciones/verificacion-t03.md). Código en `c78dcc3`; 26/26 tests backend sin omisiones y segunda ejecución aislada 5/5; build sin errores/advertencias, auditoría .NET de cuatro proyectos sin hallazgos, revisión independiente sin bloqueantes. Base nueva y propietario verificados, clave exclusiva configurada e importación Windows Terminal confirmada por el usuario. Limpieza propia comprobada y desarrollo vacío. Sin esquema comercial ni cambios de contrato. Integración posterior confirmada por el usuario y comprobada en `segunda-entrega` / `333d946`.

### CP01 — Entorno local

- [x] Comprobar línea de base actual, rechazo de conexión no local y fixture aislado. No avanzar a SQL contra una base de destino desconocida.
- [x] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

**Evidencia CP01:** [verificacion-t03.md](verificaciones/verificacion-t03.md). Arranque remoto rechazado antes de escuchar; OpenAPI/HTML/proxy locales 200. Frontend build/lint correctos, advertencia previa conservada; suite 71/71 (207,54 s). B7 no se reprodujo, sin corregir su causa; B8 sigue pendiente, sin nueva auditoría npm. Desarrollo y tests terminaron sin tablas ni esquemas de fixture. Inicio y documentación HTTP habilitados; login y operaciones comerciales del modelo nuevo siguen pendientes de sus tareas.

<a id="t04"></a>

### T04 — Escribir el esquema objetivo de segunda entrega

**Resultado:** Escribir el esquema objetivo de segunda entrega, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T03. **Tamaño previsto:** M; 3 ubicaciones principales previstas.

**Archivos probables:** `backend/Persistence/SQL/segunda-entrega-esquema.sql (nuevo)`; `backend/Persistence/SQL/segunda-entrega-catalogos.sql (nuevo)`; `backend/FluencyAPI.Tests/SchemaTests.cs (nuevo)`.

**Subdivisión al iniciar (11/10/2026):** T01–T03/CP01 ya están integradas en `segunda-entrega` / `333d946`, comprobado antes de comenzar, con árbol limpio. El esquema comercial requiere ampliar la preparación/limpieza del fixture, además de guía y evidencia; se conserva T04 como padre:

- [x] **T04.a — SQL y pruebas:** DDL completo y catálogos acordados; preparación transaccional en esquema propio de tests; limpieza explícita de sus objetos verificados con RESTRICT; pruebas PostgreSQL de inicialización, rechazo de reejecución y restricciones fundamentales. No modificar todavía los mapeos EF comerciales ni implementar T05/T06.
- [x] **T04.b — Preparación local y cierre:** aplicación explícita en desarrollo vacío después de verificar destino y SQL, guía reproducible, actualización del estado de integración, evidencia y revisión independiente. No borrar bases, barrer restos ni aplicar sobre la primera entrega; merge/publicación pendientes del OK específico.

T04.b se realiza en dos grupos documentales acotados: guía/evidencia/seguimiento, y actualización del estado de integración en AGENTS, CAPABILITIES, contexto y CONSTRAINTS. Esta actualización no cambia el plan ni el nivel de calidad.

**Aceptación:**

- [x] DDL versionado expresa el E-R acordado, tipos monetarios/fechas, FKs restrictivas, checks e índices parciales; no crea líneas, log genérico ni FKs derivables en oportunidad.
- [x] Inicializar catálogos fijos y configurables acordados sin usuarios de demo, servicios ni embudos; no duplicar fuente con EF migrations.
- [x] Aplicación explícita sobre base nueva; rechazar tablas preexistentes sin borrar datos y comprobar restricciones representativas en PostgreSQL.

**Verificación:** API(SchemaTests) + D: esquema desde cero en base de tests, rechazo de reejecución destructiva, cero usuarios y restricciones efectivas. No aplicar sobre la base anterior.

**Evidencia (11/10/2026):** [verificacion-t04.md](verificaciones/verificacion-t04.md). Código `287c71b`; SchemaTests 20/20 y suite backend completa 46/46, cero omitidas; build sin errores/advertencias. Mutación representativa detectada y SQL restaurado exactamente. Revisión independiente sin hallazgos requeridos; escaneo de código sin secretos detectados. Desarrollo preparado explícitamente: 20 tablas, catálogos y cero usuarios/roles/permisos/servicios/embudos; tests sin tablas ni esquemas de fixture. No se probaron recorridos comerciales HTTP nuevos ni se repitió frontend/auditorías de dependencias. Incremento pendiente del OK de integración; T05 sigue después, CP02 aún pendiente.

**Integración posterior de T04 (11/10/2026):** el usuario confirmó merge/push; código y cierre incluidos en `segunda-entrega` / `a639f76`, junto con el pendiente Supabase de CP02. Comprobación local al iniciar T05, sin repetir controles de T04 ni consultar nuevamente el remoto.

<a id="t05"></a>

### T05 — Mapear la identidad y los tres roles fijos

**Resultado:** Mapear la identidad y los tres roles fijos, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T04. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/Persistence/Models/Usuario.cs`; `backend/Persistence/Models/Rol.cs`; `backend/Persistence/Models/Permiso.cs`; `backend/Persistence/Models/FluencyLocalDbContext.cs`; `backend/Persistence/SQL/segunda-entrega-roles.sql (nuevo)`.

**Subdivisión al iniciar (11/10/2026):** el inventario real, incluidas pruebas y documentación, excede cinco archivos. Un único implementador conserva los archivos compartidos y ejecuta secuencialmente; el orquestador coordina revisión y cierre:

- [x] **T05.a — Mapeo de identidad:** `Usuario.cs`, `Permiso.cs`, bloques de identidad de `FluencyLocalDbContext.cs` y `IdentityTests.cs` nuevo; persistencia PostgreSQL real, activo obligatorio y unicidad normalizada. `Rol` y las uniones conservan su forma N:M, sin edición física innecesaria. RED de metadata ejecutado antes de implementar; GREEN 3/3 y commit local `59a9b4d`.
- [x] **T05.b — Roles y permisos fijos:** SQL explícito `segunda-entrega-roles.sql`, códigos/capacidades simples en `Services/Acceso/CodigosAcceso.cs` y ampliación de `IdentityTests.cs`; tres roles, unión y precedencia superior, cero cuentas automáticas. Fixture comercial de T04 conservado; cada prueba aplica las semillas explícitamente. RED previo a SQL/helper, GREEN 11/11 y caso adicional de guardas de rol 1/1; revisión estática sin hallazgos requeridos.
- [x] **T05.c — Operación, revisión y evidencia:** guía local, evidencia/seguimiento y continuidad (dos grupos de hasta cuatro documentos); preparación explícita de roles en desarrollo después de revisión, consulta sin hashes, controles finales y revisión independiente. No incluye bootstrap de T06, sesión HTTP ni conexión Supabase.
- [x] **T05.d — Separación solicitada por el usuario:** reemplazado `CodigosAcceso.cs` por `RolesYPermisos.cs` (constantes) y `CapacidadesUsuario.cs` (cálculo), actualizando solo referencias en IdentityTests; cuatro rutas de código y dos documentos de seguimiento/evidencia. Valores, reglas y asserts conservados; build sin errores/advertencias, suite backend 58/58 sin omisiones (134,98 s) y revisión independiente de equivalencia sin hallazgos. Base de tests sin tablas de usuario ni esquemas fixture al terminar. No cambia SQL ni la preparación de desarrollo. Evidencia: `tasks/verificaciones/verificacion-t05.md`.

**Aceptación:**

- [x] Conservar N:M usuario/rol/permiso, códigos estables y unión de permisos; administrador/responsable comercial prevalecen sobre restricciones de vendedor.
- [x] Usuario activo y unicidad normalizada de username/correo coinciden con SQL; no existe UI ni API para editar definiciones de roles.
- [x] Mapear y sembrar tres roles con permisos acordados; no crear cuentas adicionales ni inferir identidad de formularios.

**Verificación:** B + API(SchemaTests e IdentityTests) para semillas, mapeos y unicidad; consulta local de roles/permisos sin imprimir hashes + D.

**Evidencia (11/10/2026):** [verificacion-t05.md](verificaciones/verificacion-t05.md), código `59a9b4d`/`5e38d60`. Backend completo 58/58, incluidos IdentityTests 12/12 y SchemaTests 20/20, cero omitidas; build sin errores/advertencias, mutación detectada/restaurada, auditoría .NET de cuatro proyectos sin vulnerabilidades reportadas. Revisión independiente sin hallazgos requeridos, sugerencia de cobertura de guardas de rol atendida. Desarrollo: 20 tablas, tres roles/siete permisos/dieciséis asociaciones y cero usuarios/datos comerciales; tests sin tablas ni esquemas propios. No se repitió frontend/auditorías npm ni se habilitó sesión/autorización HTTP; deuda previa conservada. Incremento pendiente del OK de integración. Sigue T06, bootstrap de administrador; CP02 y su revisión Supabase aún pendientes.

<a id="t06"></a>

**Integración posterior de T05 (12/10/2026):** el usuario confirmó merge; los cuatro commits, incluido el refactor `c69d887`, están en `segunda-entrega`, con referencia local `origin/segunda-entrega` coincidente. Árbol limpio al comenzar T06, sin nueva consulta remota. No se repiten controles de T05 por esta integración.

### T06 — Crear el administrador mediante inicialización explícita

**Resultado:** Crear el administrador mediante inicialización explícita, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T05. **Tamaño previsto:** M; 3 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI/BootstrapAdmin.cs (nuevo)`; `backend/FluencyAPI/Program.cs`; `backend/FluencyAPI.Tests/BootstrapAdminTests.cs (nuevo)`.

**Ejecución seleccionada (12/10/2026):** T05 integrada por el usuario; comprobación local en `segunda-entrega` / `c69d887`, árbol limpio y referencia local `origin/segunda-entrega` coincidente, sin nueva consulta remota. Rama T06: `segunda-entrega-t06-admin-inicial`. Subdivisión rutinaria para conservar incrementos revisables, sin cambiar el plan aprobado:

- [x] **T06.a — Comando y pruebas:** los tres archivos de código previstos, commit `4fdf3c1`; entrada explícita, validación y BCrypt, transacción, reejecución/concurrencia y 24 pruebas de proceso sobre fixture local aislado. Un solo implementador; sin escrituras en desarrollo ni conexión remota.
- [x] **T06.b — Operación y evidencia:** guía local, esta lista y `tasks/verificaciones/verificacion-t06.md`; controles completos de persistencia inicial y revisión independiente. Backend 82/82, build correcto, mutación detectada/restaurada y limpieza verificada.
- [x] **T06.c — Continuidad:** `AGENTS.md`, `CAPABILITIES.md` y contexto actualizados con estado comprobado, límites y siguiente tarea. Supabase queda para el paso posterior con el usuario; merge/publicación conservan su OK específico.

**Aceptación:**

- [x] Implementar --bootstrap-admin con variables de entorno de la SPEC, BCrypt y validación; no iniciar HTTP ni crear/reconstruir esquema.
- [x] Base sin usuarios queda con un único administrador; segunda ejecución no crea otro ni cambia credenciales.
- [x] Dos ejecuciones concurrentes no duplican; usuarios existentes sin administrador requieren recuperación explícita, sin elevar a nadie automáticamente.

**Verificación:** B + API(BootstrapAdminTests) + D; ejecutar bootstrap dos veces sobre fixture aislado y comprobar cantidad/roles.

**Evidencia T06 (12/10/2026):** [verificacion-t06.md](verificaciones/verificacion-t06.md), código `4fdf3c1`. BootstrapAdminTests 24/24; suite backend completa 82/82 (250,12 s), cero fallos/omisiones; build sin errores/advertencias y mutación representativa detectada con restauración exacta. Revisión independiente sin hallazgos pendientes; problema de carga de entorno y defecto del harness resueltos antes del verde. Auditoría .NET sin vulnerabilidades reportadas, código escaneado sin secretos detectados. Perfil local y guía verificados; desarrollo conserva cero usuarios y tests terminó sin tablas/esquemas/conexiones propios. No se repitió frontend/auditorías npm ni se habilitó sesión HTTP. El usuario indicó conservar el bootstrap si funciona: no se agregó otro mecanismo SQL. Integrada localmente en `segunda-entrega` mediante `c363670`, con OK del usuario. Ensayo funcional Supabase realizado por el usuario y CP02 cerrado; ver evidencia CP02.

### CP02 — Inicialización

- [x] Esquema/roles/bootstrap reproducibles y sin datos comerciales automáticos; controles completos de persistencia inicial: backend 82/82, incluidos SchemaTests 20/20, IdentityTests 12/12 y BootstrapAdminTests 24/24. Ver evidencia T06.
- [x] Resultados y límites registrados sin rebajar constraints; controles previos de backend siguen verdes. CP02 cerrado con revisión funcional Supabase confirmada por el usuario; TLS efectivo no verificado y no se acredita sesión/recorrido comercial HTTP.
- [x] **Revisión Supabase solicitada por el usuario:** SQL T04/T05 preparados en fluency_crm; conexión, creación del administrador (1 usuario / 1 asociación / 1 administrador activo) y reejecución sin cambios confirmadas por el usuario. Eligió esa base como productiva y el perfil Production, con clave separada de desarrollo/tests. Modo TLS efectivo no verificado, registrado como límite para publicación; no se redirigieron suites ni se reconstruyó la base. CP02 cerrado e integrado localmente en `segunda-entrega` mediante `c363670`, con OK del usuario el 12/10/2026. Ver [evidencia CP02](verificaciones/verificacion-cp02-supabase.md).

**Actualización de esta revisión, 12/10/2026:** el usuario preparó Supabase y confirmó inventario previo 20/3/7/16/0 (tablas/roles/permisos/asociaciones/usuarios). El bootstrap falló en TLS; luego eligió esa base como productiva y pidió el perfil persistente `Production`. Perfil implementado, tres casos existentes 3/3 y build correcto; el usuario confirmó conexión funcional, capturas con 1 usuario / 1 asociación / 1 administrador activo y reejecución sin cambios. No aplicó configuración TLS adicional; el modo efectivo no se verificó. Comprobaciones funcionales completas; el usuario confirmó funcionamiento y autorizó el cierre de CP02 y la integración el 12/10/2026. Estado y comandos en [verificacion-cp02-supabase.md](verificaciones/verificacion-cp02-supabase.md); suites exclusivamente locales.

<a id="t07"></a>

### T07 — Preparar contrato HTTP y corte de rutas anteriores

**Resultado:** Preparar contrato HTTP y corte de rutas anteriores, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T03, T06. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI/Program.cs`; `backend/FluencyAPI/ApiConventions.cs (nuevo)`; `backend/Services/DTO/HttpContracts.cs (nuevo)`; `backend/FluencyAPI.Tests/HttpContractTests.cs (nuevo)`; `frontend/src/App.tsx`.

**Subpasos concretados (12/10/2026):**

- [x] **T07.a — Contrato y corte HTTP:** Program, ApiConventions, HttpContracts y HttpContractTests (cuatro archivos). Pruebas de binding/errores y ausencia de rutas anteriores; sin persistencia ni cambios del bootstrap.
- [x] **T07.b — Corte frontend:** App y su test (dos archivos). Conservar pruebas de componentes anteriores fuera de la navegación real. Por indicación del usuario, no agregar página informativa: el incremento es preparatorio hasta completar CP03.
- [x] **T07.c — Inventario y cierre:** documentar superficie real y rutas pendientes, evidencia/seguimiento y revisión independiente. CP03 sigue pendiente de T08–T09; no presentar T07 como acceso funcional.

**Aceptación:**

- [x] Errores ProblemDetails con code/traceId, códigos HTTP y binding explícito; PATCH omisión/null, rechazo de campos desconocidos y paginación 1/25/100 coherentes.
- [x] Inventariar rutas anteriores y mantener fuera del mapeo/navegación las incompatibles con el esquema nuevo; no dejar mutaciones alternativas ni respuestas ficticias.
- [x] Habilitar capacidades al completar su incremento; mantener contratos OpenAPI reales y documentar qué rutas quedan por sustituir.

**Verificación:** B + F + API(HttpContractTests) + D; requests inválidos no escriben ni exponen excepciones; inventario de rutas de la aplicación realmente mapeadas.

**Evidencia (12/10/2026):** [verificacion-t07.md](verificaciones/verificacion-t07.md). HttpContractTests 19/19; con regresión del host/aislamiento 24/24, cero omisiones; App 14/14; builds correctos, lint solo advertencia previa. Mutación representativa detectada/restaurada. Revisión independiente de código sin hallazgos requeridos; [inventario](../docs/segunda-entrega/contrato-http.md) de ocho controladores/23 acciones excluidas. Sin sesión real ni recursos comerciales nuevos. Usuario autorizó merge condicionado a tests/revisión y continuar T08; no habilitar rutas ni agregar pantalla provisional mientras CP03 está incompleto.

<a id="t08"></a>

### T08 — Autenticar por cookie y validar el actor en servidor

**Resultado:** Autenticar por cookie y validar el actor en servidor, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T06, T07. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI/Controllers/LoginController.cs`; `backend/FluencyAPI/Authentication/SessionValidation.cs (nuevo)`; `backend/Services/Implementations/LoginService.cs`; `backend/Services/DTO/LoginContracts.cs`; `backend/FluencyAPI.Tests/AuthTests.cs (nuevo)`.

**Subpasos concretados (12/10/2026):**

- [x] **T08.a — Identidad consultada en servidor:** LoginContracts, LoginService, ILoginService y tipos SesionUsuario/ActorActual (cinco archivos); retirar registro público y separar respuesta pública de huella interna.
- [x] **T08.b — Sesión HTTP:** LoginController, SessionValidation, AuthenticationSetup, Program y ApiConventions (cinco archivos). Cookie/CSRF, políticas, validación por request y límite de login; sin configurar proxies desconocidos.
- [x] **T08.c — Pruebas:** AuthTests/AuthApiFactory nuevos, adaptación del inventario HttpContractTests y exposición interna de la conexión del fixture comercial (cuatro archivos). PostgreSQL local con fixture comercial existente, reloj controlado y HTTP real.
- [x] **T08.d — Cierre:** evidencia, contrato HTTP y continuidad. Revisión independiente y auditorías de dependencias/secretos. El usuario autorizó integrar T08 si tests y reviewer aprueban, y continuar T09; sin publicar ni cambiar hosting.

**Aceptación:**

- [x] Implementar csrf/login/me/logout, autenticación por defecto y cookie de 8 h absolutas no persistente; antiforgery incluso login/logout y eliminación del registro público.
- [x] Validar usuario/roles actuales por request y huella del hash; 401 para sesión ausente/inactiva/expirada/manipulada, 403 para permiso insuficiente; no exponer secretos.
- [x] Rate limit de login 10/min con 429/Retry-After, errores genéricos y actor del contexto; solo confiar en proxies explícitos. Wiring de Program y DTO/servicio se integra en este incremento.

**Verificación:** B + API(AuthTests) + D + S por autenticación; probar HTTP real, CSRF inválido sin escritura y expiración con reloj controlado, sin esperar ocho horas.

**Evidencia (12/10/2026):** [verificacion-t08.md](verificaciones/verificacion-t08.md). HTTP/identidad 44/44, cero omisiones; build sin errores/advertencias, mutación detectada/restaurada. Auditorías npm/.NET y Gitleaks completas, solo B8 previo. Revisión independiente sin hallazgos requeridos; integrada localmente en `942e23d` tras el OK condicionado del usuario. Por su última indicación, detenerse aquí; T09 pendiente. CP03 pendiente de transporte frontend, sin login UI todavía.

<a id="t09"></a>

### T09 — Adaptar el transporte frontend a la sesión real

**Resultado:** Adaptar el transporte frontend a la sesión real, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T08. **Tamaño previsto:** M; 4 ubicaciones principales previstas.

**Archivos probables:** `frontend/src/api/client.ts`; `frontend/src/api/schema.d.ts (generado)`; `frontend/src/api/client.test.ts (nuevo)`; `frontend/vite.config.ts`.

**Subpasos concretados (12/10/2026):**

- [x] **T09.a — Transporte y tipos:** client, schema generado, copia histórica legacy-schema y client.test (cuatro archivos). Cookie/CSRF/errores, sin reabrir rutas ni cambiar hosting.
- [x] **T09.b — Regresión de componentes:** arnés LegacyApp exclusivo de tests y cuatro imports comerciales (cinco archivos); conservar todos los asserts tras el corte T07. Preparar el import del formulario para corregir B7 sin ampliar timeouts.
- [x] **T09.c — Integración de pruebas:** setup Request real y mocks de App.test (dos archivos). Regresión completa y ensayo local del cliente.
- [x] **T09.d — Evidencia y cierre:** revisión independiente, documentación y validación técnica CP03. El usuario pide detenerse sin merge y validar el checkpoint antes del OK.

**Aceptación:**

- [x] Usar la cookie en /api local y obtener/renovar X-CSRF-TOKEN tras cambios de identidad; tipos regenerados desde API local.
- [x] Distinguir 401 de 403, leer ProblemDetails y no reenviar automáticamente mutaciones fallidas por sesión o CSRF.
- [x] No almacenar credenciales/tokens de autenticación en sessionStorage ni cambiar aún el hosting de Azure.

**Verificación:** F + UI(src/api/client.test.ts) + D; inspección local de cookie/header y respuesta de /auth/me.

**Evidencia (12/10/2026; validación de usuario 21/10/2026):** [verificacion-t09.md](verificaciones/verificacion-t09.md). Backend 114/114 y frontend 86/86 completos, cero omisiones; builds correctos, solo warning previo de lint. Ensayo real de cliente/cookie antiforgery/header en navegador local. El usuario completó login/sesión/logout y el test del cliente frontend 9/9; CSRF vencido rechazado y token renovado aceptado. Revisión final aprobada. CP03 aprobada por el usuario y T09 integrada en `3ac9310`; comprobado al retomar el 21/10/2026, con autorización de continuidad a T10–T12. Se conserva esta evidencia sin repetir controles por cambios documentales.

### CP03 — Acceso HTTP

**Estado:** verificación técnica, reviewer y validación del usuario aprobados; integrada en `segunda-entrega` / `3ac9310`. Git limpio en `2930e95` al retomar, con documentación reciente preservada. El usuario autorizó continuar T10–T12 en rama derivada, sin integrar CP04.

- [x] Cookie, CSRF y actor real comprobados por HTTP; rutas incompatibles no operativas. Este checkpoint todavía no acredita login desde UI.
- [x] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t10"></a>

### T10 — Restaurar y cerrar sesión desde la interfaz

**Modalidad (21/10/2026):** responsable único; revisión independiente obligatoria de sesión antes de integrar. Puede agruparse en CP04 si T10–T12 se integran juntas.

**Resultado:** Restaurar y cerrar sesión desde la interfaz, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T09. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `frontend/src/auth/AuthContext.tsx`; `frontend/src/auth/session.ts`; `frontend/src/app/ProtectedRoute.tsx`; `frontend/src/features/login/LoginPage.tsx`; `frontend/src/App.test.tsx`.

**Aceptación:**

- [x] Login y recarga consultan identidad del servidor; 401 limpia caché/usuario y vuelve a login; 403 conserva sesión y explica el rechazo.
- [x] Logout limpia la cookie mediante API y el estado visible; al recuperar foco se actualizan identidad/capacidades.
- [x] La navegación no confía en un usuario guardado localmente; probar roles con perfiles separados, dado que la cookie es compartida entre pestañas.

**Verificación:** F + UI(src/App.test.tsx) + D; recorrido manual local entrar, recargar, expirar y salir.

**Evidencia (21/10/2026):** [CP04](verificaciones/verificacion-cp04.md). Backend completo 116/116 y frontend completo 90/90, cero omisiones; builds correctos y warning previo de lint. Revisión independiente sin bloqueantes pendientes; demo del usuario completa, sin fallos. CP04 integrada localmente en `segunda-entrega` / `20c5383`; sin publicar.

<a id="t11"></a>

### T11 — Administrar cuentas desde API

**Modalidad (21/10/2026):** responsable único; revisión independiente obligatoria de permisos, contraseñas y desactivación antes de integrar. Puede agruparse en CP04 si T10–T12 se integran juntas.

**Resultado:** Administrar cuentas desde API, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T08. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI/Controllers/UsuariosController.cs (nuevo)`; `backend/Services/Implementations/UsuarioService.cs (nuevo)`; `backend/Services/DTO/UsuarioContracts.cs (nuevo)`; `backend/FluencyAPI.Tests/UsuariosTests.cs (nuevo)`; `backend/FluencyAPI/Program.cs`.

**Aceptación:**

- [x] Administrador consulta roles/cuentas, crea/edita perfil y roles, reemplaza contraseña y desactiva/reactiva; no hay borrado físico ni registro público.
- [x] Username/correo únicos normalizados, contraseña 8 caracteres–72 bytes, al menos un rol; listados paginados y opciones mínimas activas accesibles a todos.
- [x] Cambios de rol/password/activo se reflejan al siguiente request sin renovar expiración; desactivar no exige reasignar ni altera relaciones.

**Verificación:** B + API(UsuariosTests) + API(AuthTests) afectados + D; vendedor/responsable reciben 403 en administración, y opciones no filtran hashes ni datos innecesarios.

**Evidencia (21/10/2026):** [CP04](verificaciones/verificacion-cp04.md). Backend completo 116/116 y frontend completo 90/90, cero omisiones; builds correctos y warning previo de lint. Revisión independiente sin bloqueantes pendientes; demo del usuario completa, sin fallos. CP04 integrada localmente en `segunda-entrega` / `20c5383`; sin publicar.

<a id="t12"></a>

### T12 — Gestionar usuarios desde la pantalla administrativa

**Modalidad (21/10/2026):** responsable único; revisión agrupada en CP04. Si aparecen cambios sensibles adicionales, ajustar la revisión antes de integrarlos.

**Resultado:** Gestionar usuarios desde la pantalla administrativa, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T10, T11. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `frontend/src/features/settings/UsersPage.tsx (nuevo)`; `frontend/src/features/settings/UsersPage.test.tsx (nuevo)`; `frontend/src/api/client.ts`; `frontend/src/app/AuthenticatedShell.tsx`; `frontend/src/App.tsx`.

**Aceptación:**

- [x] Administrador puede listar, crear y editar usuarios/roles, cambiar contraseña y desactivar/reactivar; no aparece editor de permisos ni registro público.
- [x] Roles insuficientes no ofrecen administración; errores de duplicado/validación y expiración se muestran sin doble envío.
- [x] Se regeneran contratos; selector de responsables consume opciones activas y conserva etiquetas de referencias anteriores cuando corresponda.

**Verificación:** F + UI(src/features/settings/UsersPage.test.tsx) + D; demo local administrador crea vendedor y responsable comercial. Checkpoint de acceso completo.

**Evidencia (21/10/2026):** [CP04](verificaciones/verificacion-cp04.md). Backend completo 116/116 y frontend completo 90/90, cero omisiones; builds correctos y warning previo de lint. Revisión independiente sin bloqueantes pendientes; demo del usuario completa, sin fallos. CP04 integrada localmente en `segunda-entrega` / `20c5383`; sin publicar.

### CP04 — Módulo acceso

**Estado:** completo, verificado e integrado localmente en `segunda-entrega` / `20c5383` el 21/10/2026; demo confirmada por el usuario. Sin publicar. Se conserva la deuda previa explicitada en [evidencia](verificaciones/verificacion-cp04.md); no iniciar T13 sin indicación.

**Modalidad (21/10/2026):** cierre del primer bloque con el flujo de plan §6.1. Revisar independientemente T10/T11 si aún no se hizo, T12 y la integración entre piezas. Reutilizar revisiones válidas y revisar cambios posteriores y efectos relacionados, sin repetir toda la auditoría. Conservar los controles siguientes. Evaluar con el usuario consumo observado, retrabajo y utilidad de la revisión, sin infraestructura nueva ni porcentaje de ahorro exigido. Esta clasificación no autoriza iniciar T10 ni integrar CP03.

- [x] B + F, suites pertinentes completas, S y recorrido local login→crear roles de usuario→cambiar rol/password→logout. Presentar incremento para revisión antes del merge.
- [x] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t13"></a>

### T13 — Alinear los catálogos con el modelo objetivo

**Resultado:** Alinear los catálogos con el modelo objetivo, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T04, T12. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Subdivisión CP05 antes de implementar:** T13.a alinea activos y estados fijos; T13.b reemplaza la categoría antigua por TipoActividad, agrega MotivoPerdida y verifica semillas/referencia inactiva. Un único responsable; SQL instalado conservado. Riesgo CP05: autorización administrativa; revisión independiente agrupada obligatoria de cierre (GPT-6.1 Sol / High), más revisión propia por paso.

**Archivos probables:** `backend/Persistence/Models/EstadoCliente.cs`; `backend/Persistence/Models/OrigenComercial.cs`; `backend/Persistence/Models/TipoActividad.cs (nuevo)`; `backend/Persistence/Models/MotivoPerdida.cs (nuevo)`; `backend/Persistence/Models/FluencyLocalDbContext.cs`.

**Aceptación:**

- [x] Mapear activos de catálogos y reemplazar el concepto antiguo de Actividad-categoría por TipoActividad; mapear motivo de pérdida.
- [x] Niveles/modalidades y estados de oportunidad se ajustan al SQL objetivo; estados ABIERTA/GANADA/PERDIDA permanecen fijos.
- [x] Etiquetas de referencias inactivas siguen consultables; no aplicar filtros globales que oculten historia. Si ajustes de catálogos auxiliares exceden cinco archivos, separar T13.a/T13.b.

**Verificación:** B + API(SchemaTests) + D; lectura EF de semillas y referencia inactiva con etiqueta.

**Evidencia CP05 (22/10/2026):** [verificacion-cp05.md](verificaciones/verificacion-cp05.md). Semillas/mapeos EF y SchemaTests 21/21; referencia inactiva con etiqueta conservada.

<a id="t14"></a>

### T14 — Exponer administración y opciones de catálogos

**Resultado:** Exponer administración y opciones de catálogos, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T07, T13. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Subdivisión CP05:** T14.a contratos/servicio/controlador y wiring; T14.b pruebas HTTP y ajuste del inventario cerrado de rutas. La lista administrativa es paginada según SPEC; opciones y estados fijos no requieren paginación.

**Archivos probables:** `backend/FluencyAPI/Controllers/CatalogosController.cs (nuevo)`; `backend/Services/Implementations/CatalogoService.cs (nuevo)`; `backend/Services/DTO/CatalogoContracts.cs (nuevo)`; `backend/FluencyAPI.Tests/CatalogosTests.cs (nuevo)`; `backend/FluencyAPI/Program.cs`.

**Aceptación:**

- [x] Lista cerrada de catálogos configurables con GET/POST/PATCH/desactivar/reactivar; no construir SQL con nombres arbitrarios de la ruta.
- [x] Solo administrador modifica; operadores leen opciones activas. Estados de oportunidad solo lectura, catálogo pequeño sin paginación artificial.
- [x] CRUD conserva referencias y distingue omisión/null/duplicados según SPEC; desactivar/reactivar no produce cascadas.

**Verificación:** B + API(CatalogosTests) + D; verificar matriz 401/403/permitido y rechazo de nombre de catálogo no permitido.

**Evidencia CP05 (22/10/2026):** [verificacion-cp05.md](verificaciones/verificacion-cp05.md). API focalizada 2/2; backend completo 119/119, incluyendo vendedor y responsable comercial, estados fijos y lista cerrada.

<a id="t15"></a>

### T15 — Editar catálogos desde configuración

**Resultado:** Editar catálogos desde configuración, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T14. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Subdivisión CP05:** T15.a tipos generados/cliente/navegación; T15.b listado/editor y pruebas de recorrido. Reutiliza estilo, sesión y transporte de CP04 sin rehacerlos.

**Archivos probables:** `frontend/src/features/settings/CatalogsPage.tsx (nuevo)`; `frontend/src/features/settings/CatalogsPage.test.tsx (nuevo)`; `frontend/src/api/client.ts`; `frontend/src/App.tsx`; `frontend/src/app/AuthenticatedShell.tsx`.

**Aceptación:**

- [x] Pantalla administrativa permite los cambios admitidos con estados activo/inactivo y búsqueda/paginación donde corresponde.
- [x] Opciones operativas excluyen inactivos y detalle conserva sus etiquetas; estados fijos no muestran acciones de escritura.
- [x] Errores/carga/vacío y acciones pendientes son visibles; conservar teclado, foco y diseño existente.

**Verificación:** F + UI(src/features/settings/CatalogsPage.test.tsx) + D; crear/desactivar/reactivar un origen de prueba local.

**Evidencia CP05 (22/10/2026):** [verificacion-cp05.md](verificaciones/verificacion-cp05.md). UI focalizada 4/4; frontend completo 94/94. Tipos/build/lint correctos, solo warning previo.

### CP05 — Catálogos

- [x] Administrador configura y otros roles solo consultan; etiquetas inactivas conservadas.
- [x] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

**Evidencia de cierre:** [verificacion-cp05.md](verificaciones/verificacion-cp05.md). Backend 119/119 y frontend 94/94, cero omisiones; builds correctos y revisión independiente sin defectos requeridos. Recorrido local validado por el usuario; integrada localmente en `segunda-entrega` mediante fast-forward a `809a23a`, sin publicar.

<a id="t16"></a>

### T16 — Mapear servicios, embudos y etapas

**Resultado:** Mapear servicios, embudos y etapas, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T13. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/Persistence/Models/Servicio.cs`; `backend/Persistence/Models/Embudo.cs (nuevo)`; `backend/Persistence/Models/EtapaComercial.cs`; `backend/Persistence/Models/EstadoOportunidad.cs`; `backend/Persistence/Models/FluencyLocalDbContext.cs`.

**Aceptación:**

- [ ] Etapa contiene id, id_embudo, id_estado, nombre, descripcion, orden y activo; embudo pertenece a un servicio y estado se deriva desde etapa.
- [ ] Mapeo y restricciones coinciden con SQL: precio decimal, orden activo único por embudo y finales únicas.
- [ ] Lecturas para bloqueos usan el esquema objetivo, incluyendo oportunidades/historial de fixtures; no requieren que la pantalla de oportunidades ya exista.

**Verificación:** B + API(SchemaTests) + D; materializar relaciones y demostrar duplicados activos rechazados e inactivos permitidos.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t17"></a>

### T17 — Gestionar servicios mediante API

**Resultado:** Gestionar servicios mediante API, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T14, T16. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI/Controllers/ServiciosController.cs`; `backend/Services/Implementations/ServicioService.cs`; `backend/Services/DTO/ServicioContracts.cs`; `backend/Services/Interface/IServicioService.cs`; `backend/FluencyAPI.Tests/ServiciosTests.cs (nuevo)`.

**Aceptación:**

- [ ] Rutas REST de servicios con precio requerido no negativo, cero válido y nivel/modalidad/duración opcionales según SPEC.
- [ ] Administrador crea/edita/desactiva/reactiva; opciones operativas solo activas y referencias históricas siguen legibles.
- [ ] Desactivar servicio no modifica embudos y solo impide elegirlo para otros nuevos; consultas/paginación/error coherentes.

**Verificación:** B + API(ServiciosTests) + D; probar servicio inactivo con embudo activo y persistencia de precio decimal.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t18"></a>

### T18 — Gestionar servicios desde UI

**Resultado:** Gestionar servicios desde UI, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T15, T17. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `frontend/src/features/services/ServicesPage.tsx (nuevo)`; `frontend/src/features/services/ServicesPage.test.tsx (nuevo)`; `frontend/src/api/client.ts`; `frontend/src/App.tsx`; `frontend/src/api/schema.d.ts (generado)`.

**Aceptación:**

- [ ] Listado/editor y acciones administrativas usan los contratos nuevos y permiten precio cero.
- [ ] Filtros/paginación se resuelven en servidor; referencias inactivas existentes no se pierden al editar otro campo.
- [ ] Retirar consumidores de rutas antiguas de servicios en el mismo incremento y mostrar errores reales sin éxito ficticio.

**Verificación:** F + UI(src/features/services/ServicesPage.test.tsx) + D; crear y editar servicio local sin multiplicaciones ni redondeos silenciosos.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

### CP06 — Servicios

- [ ] Crear/editar/desactivar servicio desde UI y comprobar persistencia, precio cero y referencias.
- [ ] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t19"></a>

### T19 — Gestionar embudos y sus finales automáticas

**Resultado:** Gestionar embudos y sus finales automáticas, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T16, T17. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI/Controllers/EmbudosController.cs (nuevo)`; `backend/Services/Implementations/EmbudoService.cs (nuevo)`; `backend/Services/DTO/EmbudoContracts.cs (nuevo)`; `backend/FluencyAPI.Tests/EmbudosTests.cs (nuevo)`; `backend/FluencyAPI/Program.cs`.

**Aceptación:**

- [ ] Crear embudo produce exactamente Ganada/Perdida en la misma transacción, órdenes iniciales 1/2 y ninguna abierta; una falla revierte todo.
- [ ] Un embudo utilizado conserva servicio; desactivar bloquea solo por oportunidades abiertas y activas, sin cascadas.
- [ ] Reactivar/configurar no restaura datos comerciales; permisos de configuración solo administrador y consultas de bloqueo coordinadas con escrituras.

**Verificación:** B + API(EmbudosTests) + D; fixtures de abiertas, cerradas y dadas de baja, y restricción de finales únicas en PostgreSQL.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t20"></a>

### T20 — Gestionar y reordenar etapas

**Resultado:** Gestionar y reordenar etapas, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T19. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI/Controllers/EtapasComercialesController.cs`; `backend/Services/Implementations/EtapaComercialService.cs`; `backend/Services/DTO/EtapaComercialContracts.cs`; `backend/Services/Interface/IEtapaComercialService.cs`; `backend/FluencyAPI.Tests/EtapasTests.cs (nuevo)`.

**Aceptación:**

- [ ] Alta manual solo ABIERTA; finales editan textos/orden pero nunca embudo/estado/activo; una abierta usada no cambia de embudo.
- [ ] Orden entre activas único, admite huecos; PUT reordena todas las activas atómicamente; reactivación al máximo activo + 1.
- [ ] Baja abierta bloquea por oportunidades abiertas/activas, considera historia para inmutabilidad y devuelve 409 sin escritura parcial ante colisión/carrera.

**Verificación:** B + API(EtapasTests) + D; probar intercambio de posiciones, duplicación concurrente, reactivación y prohibiciones de finales.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t21"></a>

### T21 — Configurar embudos y etapas desde UI

**Resultado:** Configurar embudos y etapas desde UI, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T18, T19, T20. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `frontend/src/features/settings/FunnelsPage.tsx (nuevo)`; `frontend/src/features/settings/StageEditor.tsx (nuevo)`; `frontend/src/features/settings/FunnelsPage.test.tsx (nuevo)`; `frontend/src/api/client.ts`; `frontend/src/App.tsx`.

**Aceptación:**

- [ ] Administrador crea embudo y edita/ordena etapas según permisos; no ofrece baja de finales ni selección de su estado.
- [ ] Embudo sin abiertas puede guardarse; explica por qué no permite altas de oportunidad, sin inventar etapas ni asistente obligatorio.
- [ ] Los conflictos de orden/baja se muestran y se recargan datos sin reintentar mutaciones automáticamente; retirar API antigua de etapas del recorrido.

**Verificación:** F + UI(src/features/settings/FunnelsPage.test.tsx) + D; recorrido local servicio → embudo → etapa abierta. Checkpoint de configuración completo.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

### CP07 — Módulo configuración

- [ ] B + F, suites completas pertinentes, seguridad según cambios y recorrido servicio→embudo→etapas→orden→bajas. Finales y bloqueos probados en PostgreSQL. Revisar incremento antes del merge.
- [ ] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t22"></a>

### T22 — Alinear persistencia de empresas y contactos

**Resultado:** Alinear persistencia de empresas y contactos, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T04, T21. **Tamaño previsto:** M; 4 ubicaciones principales previstas.

**Archivos probables:** `backend/Persistence/Models/Empresa.cs`; `backend/Persistence/Models/Contacto.cs`; `backend/Persistence/Models/FluencyLocalDbContext.cs`; `backend/FluencyAPI.Tests/ClientesModelTests.cs (nuevo)`.

**Aceptación:**

- [ ] Persistir responsable, estado, fecha de creación y activo con relaciones del E-R; no hacer privado un cliente por responsable.
- [ ] Conservar FKs históricas y evitar bajas en cascada; estado comercial Inactivo no es activo=false.
- [ ] Preparar consulta de bloqueos sobre esquema objetivo con parámetros y fixtures de oportunidades, aun antes de su UI; no crear dependencia circular entre servicios.

**Verificación:** B + API(ClientesModelTests) + D; asociaciones históricas y restricciones reales de PostgreSQL.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t23"></a>

### T23 — Adaptar empresas a los contratos y reglas nuevos

**Resultado:** Adaptar empresas a los contratos y reglas nuevos, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T22. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI/Controllers/EmpresaController.cs`; `backend/Services/Implementations/EmpresaService.cs`; `backend/Services/DTO/EmpresaContracts.cs`; `backend/Services/Interface/IEmpresaService.cs`; `backend/FluencyAPI.Tests/EmpresasTests.cs (nuevo)`.

**Aceptación:**

- [ ] Todos los usuarios activos crean/editan/leen empresas ajenas; defaults responsable=actor y estado=Potencial activo, con selección explícita si falta ese default.
- [ ] GET paginado aplica q/estado/origen/responsable antes de contar; orden estable por razón social/ID y búsqueda normalizada.
- [ ] POST/PATCH no admiten autor/activo ocultos ni campos inválidos; omisión conserva, null limpia opcional, referencias inactivas previas no bloquean edición ordinaria.

**Verificación:** B + API(EmpresasTests) + D; caso vendedor edita cliente ajeno, PATCH atómico y dos páginas con filtros.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t24"></a>

### T24 — Actualizar pantallas de empresas

**Resultado:** Actualizar pantallas de empresas, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T23. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `frontend/src/features/companies/CompaniesPage.tsx`; `frontend/src/features/companies/CompanyFormPage.tsx`; `frontend/src/features/companies/CompanyDetailPage.tsx`; `frontend/src/features/companies/Companies.test.tsx`; `frontend/src/api/client.ts`.

**Aceptación:**

- [ ] Listado usa paginación/filtros de servidor y formulario respeta defaults, responsable compartido y PATCH diferencial.
- [ ] Ficha muestra fechas y etiquetas históricas; carga/error/vacío y conflictos visibles; accesibilidad existente conservada.
- [ ] Actualizar consumidores y tipos; retirar endpoints antiguos de empresas sustituidos en este incremento, sin modificar tests solo para esconder fallos.

**Verificación:** F + UI(src/features/companies/Companies.test.tsx) + D; alta/edición/listado local con dos usuarios.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

### CP08 — Empresas

- [ ] Usuario de cualquier rol crea/edita empresa con responsable diferente; lista/ficha/paginación consistentes.
- [ ] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t25"></a>

### T25 — Adaptar contactos conservando relaciones históricas

**Resultado:** Adaptar contactos conservando relaciones históricas, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T22, T24. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI/Controllers/ContactoController.cs`; `backend/Services/Implementations/ContactoService.cs`; `backend/Services/DTO/ContactoContracts.cs`; `backend/Services/Interface/IContactoService.cs`; `backend/FluencyAPI.Tests/ContactosTests.cs (nuevo)`.

**Aceptación:**

- [ ] Todos gestionan contactos; defaults/validación y filtros incluyen empresa; búsqueda también por razón social y orden apellido/nombre/ID.
- [ ] Cambiar/quitar empresa modifica solo el contacto, aun si tiene oportunidades; no propaga a oportunidades/actividades previas.
- [ ] Nuevas referencias deben estar disponibles; editar otro campo conserva las antiguas; nulos/omitidos y conflictos no producen guardados parciales.

**Verificación:** B + API(ContactosTests) + D; fixture A→B y desvinculación conserva asociaciones previas.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t26"></a>

### T26 — Actualizar pantallas de contactos

**Resultado:** Actualizar pantallas de contactos, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T25. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `frontend/src/features/contacts/ContactsPage.tsx`; `frontend/src/features/contacts/ContactFormPage.tsx`; `frontend/src/features/contacts/ContactDetailPage.tsx`; `frontend/src/features/forms.test.tsx`; `frontend/src/api/client.ts`.

**Aceptación:**

- [ ] Lista filtra/pagina en servidor; formulario permite cambiar empresa sin bloquear por negociaciones existentes.
- [ ] Aviso informa que las relaciones previas se conservan, sin preguntar si se propagan ni actualizar registros relacionados.
- [ ] Detalle muestra responsable/fechas y referencias vigentes o históricas; retirar los consumidores antiguos y regenerar tipos.

**Verificación:** F + UI(src/features/forms.test.tsx) + D; cambio A→B local y lectura del registro relacionado intacto.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t27"></a>

### T27 — Completar bajas definitivas de clientes

**Resultado:** Completar bajas definitivas de clientes, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T23, T25, T26. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/Services/Implementations/EmpresaService.cs`; `backend/Services/Implementations/ContactoService.cs`; `backend/FluencyAPI.Tests/BajasClientesTests.cs (nuevo)`; `frontend/src/features/companies/CompanyDetailPage.tsx`; `frontend/src/features/contacts/ContactDetailPage.tsx`.

**Aceptación:**

- [ ] Empresa bloqueada por contactos activos o cualquier oportunidad activa; contacto por cualquier oportunidad activa, incluso ganada/perdida. Actividades no bloquean.
- [ ] DELETE hace baja lógica definitiva, no hay restauración/cascadas; GET principal devuelve 404 y referencias en otros registros conservan etiquetas.
- [ ] Acciones UI muestran causas/cantidades de 409; validar y escribir coordinadamente con asociaciones concurrentes. Completar bindings/tipos del DELETE junto con su consumidor.

**Verificación:** B + F + API(BajasClientesTests) + D; baja frente a asociación concurrente con fixture PostgreSQL. Recorrido manual de bloqueo y baja válida. Checkpoint de clientes completo.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

### CP09 — Módulo clientes

- [ ] B + F, suites pertinentes completas y recorrido empresa/contacto/cambio de asociación/baja. Fixtures prueban bloqueos aunque la UI de oportunidades aún no esté terminada. Revisar antes del merge.
- [ ] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t28"></a>

### T28 — Adaptar el modelo e historial de oportunidades

**Resultado:** Adaptar el modelo e historial de oportunidades, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T16, T27. **Tamaño previsto:** M; 4 ubicaciones principales previstas.

**Archivos probables:** `backend/Persistence/Models/Oportunidad.cs`; `backend/Persistence/Models/HistorialEtapa.cs`; `backend/Persistence/Models/FluencyLocalDbContext.cs`; `backend/FluencyAPI.Tests/OportunidadesModelTests.cs (nuevo)`.

**Aceptación:**

- [ ] Modelo objetivo tiene valor total, campos académicos opcionales, fechas, responsable, motivo y activo; deriva embudo/servicio/estado desde etapa.
- [ ] Historial inmutable admite etapa anterior null para alta, exige autor/nueva etapa/instante; no audita cada edición.
- [ ] Retirar dependencias de líneas/log/FKs derivadas en los consumidores al hacer el corte de este módulo; dividir limpieza de navegaciones en pasos si supera el tamaño previsto, sin dejar EF apuntando a tablas antiguas.

**Verificación:** B + API(OportunidadesModelTests) + D; lectura de estado derivado, índices/FKs y decimales/fechas en PostgreSQL.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t29"></a>

### T29 — Crear oportunidades con defaults e historial atómico

**Resultado:** Crear oportunidades con defaults e historial atómico, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T28, T08. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI/Controllers/OportunidadesController.cs`; `backend/Services/Implementations/OportunidadService.cs`; `backend/Services/DTO/OportunidadContracts.cs`; `backend/Services/Interface/IOportunidadService.cs`; `backend/FluencyAPI.Tests/AltaOportunidadTests.cs (nuevo)`.

**Aceptación:**

- [ ] Alta exige empresa o contacto y compatibilidad cuando ambos se envían; embudo/etapa abierta activos. Sin etapa explícita usa la primera abierta activa.
- [ ] Vendedor crea propia; superiores pueden asignar activo. Valor omitido copia precio, cero prevalece y participantes no multiplican; servicio inactivo no bloquea su embudo activo.
- [ ] Insertar oportunidad e historial inicial juntos con actor de sesión; fallos no dejan escrituras parciales y body no puede falsificar autor/estado.

**Verificación:** B + API(AltaOportunidadTests) + D; defaults, ausencia de abierta, cero y rollback con PostgreSQL.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t30"></a>

### T30 — Simplificar el alta de oportunidad en UI

**Resultado:** Simplificar el alta de oportunidad en UI, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T29. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `frontend/src/features/opportunities/OpportunityFormPage.tsx`; `frontend/src/features/opportunities/opportunityData.ts`; `frontend/src/features/forms.test.tsx`; `frontend/src/api/client.ts`; `frontend/src/api/schema.d.ts (generado)`.

**Aceptación:**

- [ ] Alta contextual desde empresa/contacto/embudo evita repetir selecciones y muestra defaults; origen y datos académicos siguen opcionales.
- [ ] Formulario no pide servicio/estado derivados ni inventa una etapa si faltan abiertas; límites y errores coherentes con API.
- [ ] Guardar una sola vez actualiza datos visibles y abre la ficha; retirar request de actor arbitrario y contrato de alta anterior.

**Verificación:** F + UI(src/features/forms.test.tsx) + D; recorrido local alta mínima y rechazo comprensible de embudo sin abierta.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

### CP10 — Alta de oportunidades

- [ ] Crear oportunidad desde cliente con defaults y comprobar historial inicial; no basta el formulario con mocks.
- [ ] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t31"></a>

### T31 — Consultar oportunidades e historial de etapas

**Resultado:** Consultar oportunidades e historial de etapas, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T29. **Tamaño previsto:** M; 4 ubicaciones principales previstas.

**Archivos probables:** `backend/Services/Implementations/OportunidadService.cs`; `backend/Services/DTO/OportunidadContracts.cs`; `backend/FluencyAPI/Controllers/OportunidadesController.cs`; `backend/FluencyAPI.Tests/ConsultaOportunidadesTests.cs (nuevo)`.

**Aceptación:**

- [ ] Tabla/detalle permiten lectura de todas las oportunidades vigentes; filtros por cliente/responsable/embudo/etapa/estado/origen y búsqueda antes de paginar.
- [ ] DTO deriva relaciones y accionesPermitidas; historial paginado fecha/ID ascendentes, sin endpoints de edición.
- [ ] Query de funnel por embudo devuelve columnas activas vacías/finales; fuerza dueño autenticado para vendedor y admite filtro de responsable para superiores, sin filtrar la tabla global.

**Verificación:** B + API(ConsultaOportunidadesTests) + D; vendedor fuerza ID de otro en funnel y no amplía su cartera, pero sí consulta su detalle en tabla.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t32"></a>

### T32 — Mostrar tabla y ficha de oportunidades compartidas

**Resultado:** Mostrar tabla y ficha de oportunidades compartidas, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T30, T31. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `frontend/src/features/opportunities/OpportunitiesPage.tsx`; `frontend/src/features/opportunities/OpportunityDetailPage.tsx`; `frontend/src/features/consultations/Consultations.test.tsx`; `frontend/src/api/client.ts`; `frontend/src/api/schema.d.ts (generado)`.

**Aceptación:**

- [ ] Tabla lista todas las vigentes con filtros/paginación; ficha ajena se puede leer completa e incluye historial de etapas.
- [ ] Acciones se muestran según permisos del servidor; no se confunde ocultar botones con autorización.
- [ ] Referencias inactivas siguen legibles; búsqueda y caché incluyen filtros/página y no mezclan resultados.

**Verificación:** F + UI(src/features/consultations/Consultations.test.tsx) + D; vendedor consulta detalle ajeno sin editar.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t33"></a>

### T33 — Mostrar funnel según el rol

**Resultado:** Mostrar funnel según el rol, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T31, T32. **Tamaño previsto:** M; 4 ubicaciones principales previstas.

**Archivos probables:** `frontend/src/features/funnel/FunnelPage.tsx`; `frontend/src/features/funnel/FunnelPage.test.tsx (nuevo)`; `frontend/src/features/opportunities/opportunityData.ts`; `frontend/src/api/client.ts`.

**Aceptación:**

- [ ] Selector de embudo separa procesos; vendedor solo ve propias y no puede sustituir su responsable; superiores ven todas con filtro opcional.
- [ ] Mantener columnas vacías, finales y cerradas vigentes; embudo inactivo explica su situación.
- [ ] Conservar tarjetas resumidas/expansión y selector de transición; no agregar drag-and-drop ni paginación por columna obligatorios.

**Verificación:** F + UI(src/features/funnel/FunnelPage.test.tsx) + D; dos vendedores, mismo embudo, tabla global y funnels distintos.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

### CP11 — Visibilidad comercial

- [ ] Con dos vendedores, tabla y detalles compartidos y funnel propio. HTTP forzado no amplía la cartera del funnel.
- [ ] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t34"></a>

### T34 — Editar datos de una oportunidad abierta

**Resultado:** Editar datos de una oportunidad abierta, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T32, T33. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/Services/Implementations/OportunidadService.cs`; `backend/Services/DTO/OportunidadContracts.cs`; `backend/FluencyAPI.Tests/EdicionOportunidadTests.cs (nuevo)`; `frontend/src/features/opportunities/OpportunityFormPage.tsx`; `frontend/src/features/forms.test.tsx`.

**Aceptación:**

- [ ] PATCH admite solo los campos acordados de abierta activa y valida dueño/superior; no cambia responsable, etapa, cierre, activo ni derivados.
- [ ] Editar título/valor conserva asociaciones históricas tras cambio de empresa del contacto; validar compatibilidad solo al cambiar asociaciones.
- [ ] Valor no acepta null, participantes positivos si presentes y fechas correctas; rechazo de cerrada/ajena atómico y visible en UI.

**Verificación:** B + F + API(EdicionOportunidadTests) + UI(src/features/forms.test.tsx) + D; editar propia versus ajena y cambio histórico A→B.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t35"></a>

### T35 — Reasignar una oportunidad y retirar permiso anterior

**Resultado:** Reasignar una oportunidad y retirar permiso anterior, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T34, T11. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/Services/Implementations/OportunidadService.cs`; `backend/FluencyAPI/Controllers/OportunidadesController.cs`; `backend/FluencyAPI.Tests/ReasignacionTests.cs (nuevo)`; `frontend/src/features/opportunities/OpportunityDetailPage.tsx`; `frontend/src/api/client.ts`.

**Aceptación:**

- [ ] Dueño vendedor reasigna una abierta a vendedor activo; superiores pueden elegir usuario activo; una cerrada requiere reapertura.
- [ ] Releer propiedad al escribir y devolver permisos recalculados; anterior dueño conserva lectura y recibe 403 en siguiente mutación.
- [ ] UI actualiza ficha/tabla/funnel/caché sin crear una transición ficticia ni cambiar responsables de clientes.

**Verificación:** B + F + API(ReasignacionTests) + D; dos sesiones locales y carrera representativa reasignación versus edición.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t36"></a>

### T36 — Mover entre etapas abiertas con historial

**Resultado:** Mover entre etapas abiertas con historial, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T35. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/Services/Implementations/OportunidadService.cs`; `backend/FluencyAPI/Controllers/OportunidadesController.cs`; `backend/FluencyAPI.Tests/MovimientoTests.cs (nuevo)`; `frontend/src/features/funnel/FunnelPage.tsx`; `frontend/src/api/client.ts`.

**Aceptación:**

- [ ] Solo destino abierto activo del mismo embudo; mismo destino es no-op sin duplicar historia; /mover rechaza finales.
- [ ] Permiso actual, cambio e historial en una transacción; falla/carrera revierte y devuelve conflicto sin reintento automático.
- [ ] Selector actualiza ficha/funnel/historial; selección final se deriva al flujo de cierre cuando T37 lo habilite, sin bypass.

**Verificación:** B + F + API(MovimientoTests) + D; destino ajeno/inactivo, no-op y rollback.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

### CP12 — Gestión de abiertas

- [ ] Edición histórica, reasignación y movimiento atómicos; dueño anterior conserva lectura y pierde modificación.
- [ ] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t37"></a>

### T37 — Cerrar oportunidades como ganadas o perdidas

**Resultado:** Cerrar oportunidades como ganadas o perdidas, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T36. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/Services/Implementations/OportunidadService.cs`; `backend/FluencyAPI/Controllers/OportunidadesController.cs`; `backend/FluencyAPI.Tests/CierreTests.cs (nuevo)`; `frontend/src/features/opportunities/CloseOpportunityDialog.tsx (nuevo)`; `frontend/src/api/client.ts`.

**Aceptación:**

- [ ] Ganar exige fecha/valor y perder fecha/motivo activo; API resuelve final única y guarda transición/historial atómicamente.
- [ ] Repetir cierre da 409 sin duplicación; /mover y PATCH no eluden campos de cierre; cerrada no admite edición ordinaria.
- [ ] Formulario de cierre se usa desde ficha/funnel/selector final; respeta permisos, estados pendientes y recarga de datos. Integrar consumidores en subpaso si excede cinco archivos.

**Verificación:** B + F + API(CierreTests) + UI(src/features/opportunities/CloseOpportunityDialog.test.tsx, nuevo) + D; comprobar que valor cero se acepta y pérdida sin motivo se rechaza. Contar el test y el montaje del diálogo al subdividir el incremento.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t38"></a>

### T38 — Reabrir una oportunidad conservando su cierre

**Resultado:** Reabrir una oportunidad conservando su cierre, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T37. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/Services/Implementations/OportunidadService.cs`; `backend/FluencyAPI/Controllers/OportunidadesController.cs`; `backend/FluencyAPI.Tests/ReaperturaTests.cs (nuevo)`; `frontend/src/features/opportunities/ReopenOpportunityDialog.tsx (nuevo)`; `frontend/src/api/client.ts`.

**Aceptación:**

- [ ] Solo administrador/responsable comercial reabre cerrada activa; vendedor dueño recibe 403. Exige embudo activo, destino abierto activo y justificación.
- [ ] Historial conserva en texto resultado/fecha/valor/motivo anteriores y justificación; limpia cierre/motivo actuales y mantiene valor, todo atómico.
- [ ] Responsable o servicio inactivos no obligan a reasignar ni bloquean reapertura; UI explica límites y ofrece destinos válidos.

**Verificación:** B + F + API(ReaperturaTests) + D; cerrar→reabrir→corregir→cerrar con evidencia del primer cierre.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t39"></a>

### T39 — Dar de baja oportunidades sin cascadas

**Resultado:** Dar de baja oportunidades sin cascadas, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T38. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/Services/Implementations/OportunidadService.cs`; `backend/FluencyAPI/Controllers/OportunidadesController.cs`; `backend/FluencyAPI.Tests/BajaOportunidadTests.cs (nuevo)`; `frontend/src/features/opportunities/OpportunityDetailPage.tsx`; `frontend/src/api/client.ts`.

**Aceptación:**

- [ ] Dueño/superior da de baja abierta o cerrada sin reapertura; repetir no cambia nada y no agrega historia ficticia.
- [ ] No restaura ni borra físicamente; oculta recurso principal y conserva historia/actividades. Listas/funnel se invalidan correctamente.
- [ ] Reevaluar bloqueos de clientes/embudos tras baja y verificar carrera con una mutación; comprobar con altas reales las reglas antes cubiertas con fixtures.

**Verificación:** B + F + API(BajaOportunidadTests) + suites Clientes/Embudos afectadas + D; checkpoint completo de oportunidades y regresión de bloqueos.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

### CP13 — Módulo oportunidades

- [ ] B + F, suites completas pertinentes y circuito alta→reasignación→movimiento→cierre→reapertura→baja. Repetir bloqueos de clientes/configuración usando operaciones reales. Revisar antes del merge.
- [ ] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t40"></a>

### T40 — Mapear actividades realizadas

**Resultado:** Mapear actividades realizadas, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T39. **Tamaño previsto:** M; 4 ubicaciones principales previstas.

**Archivos probables:** `backend/Persistence/Models/Actividad.cs`; `backend/Persistence/Models/TipoActividad.cs`; `backend/Persistence/Models/FluencyLocalDbContext.cs`; `backend/FluencyAPI.Tests/ActividadesModelTests.cs (nuevo)`.

**Aceptación:**

- [ ] Actividad es un hecho, TipoActividad su catálogo; relaciones directas opcionales a empresa/contacto/oportunidad y al menos empresa o contacto.
- [ ] Instante del hecho y de registro separados; creador real e inmutable, descripción obligatoria y resultado opcional.
- [ ] Mapeo sin agenda, auditoría adicional ni cascadas; retirar relación antigua ActividadOportunidad al adaptar sus navegaciones en pasos pequeños.

**Verificación:** B + API(ActividadesModelTests) + D; lectura/escritura UTC y conservación de las dos fechas.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t41"></a>

### T41 — Registrar y consultar actividades por API

**Resultado:** Registrar y consultar actividades por API, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T40. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI/Controllers/ActividadesController.cs (nuevo)`; `backend/Services/Implementations/ActividadService.cs (nuevo)`; `backend/Services/DTO/ActividadContracts.cs (nuevo)`; `backend/FluencyAPI.Tests/ActividadesTests.cs (nuevo)`; `backend/FluencyAPI/Program.cs`.

**Aceptación:**

- [ ] POST rechaza autor/fechaRegistro del cliente; conserva fecha del hecho y exige contexto válido. Desde oportunidad respeta asociaciones históricas.
- [ ] Sin oportunidad todos gestionan; con oportunidad solo dueño vigente/superiores, incluso al invocar desde cliente; permitir actividad posterior al cierre sin reabrir.
- [ ] GET de vigentes aplica filtros/paginación/fechas y etiquetas; no permite elegir nuevas referencias dadas de baja ni filtra como secreto una actividad ajena visible.

**Verificación:** B + API(ActividadesTests) + D; llamada de ayer registrada hoy, oportunidad propia cerrada y tentativa ajena denegada.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t42"></a>

### T42 — Registrar actividades desde fichas

**Resultado:** Registrar actividades desde fichas, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T41. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `frontend/src/features/activities/ActivityForm.tsx (nuevo)`; `frontend/src/features/activities/ActivityForm.test.tsx (nuevo)`; `frontend/src/api/client.ts`; `frontend/src/features/opportunities/OpportunityDetailPage.tsx`; `frontend/src/features/contacts/ContactDetailPage.tsx`.

**Aceptación:**

- [ ] Editor contextual carga asociaciones sin pedir repetirlas y solo envía campos editables; tipos activos, fecha del hecho y resultado opcional.
- [ ] Acciones respetan permisos actuales; errores de API y doble envío controlados, sin ocultar actividades ajenas de lectura.
- [ ] Reutilizar editor en empresa/contacto/oportunidad, completando el montaje de empresa en T45; refrescar datos pertinentes después de guardar.

**Verificación:** F + UI(src/features/activities/ActivityForm.test.tsx) + D; alta local desde oportunidad cerrada sin modificar su estado.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

### CP14 — Registro de actividades

- [ ] Crear interacción de ayer, leer fechas/actor y demostrar permiso al operar desde una ficha de cliente.
- [ ] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t43"></a>

### T43 — Editar y dar de baja actividades con permisos de origen y destino

**Resultado:** Editar y dar de baja actividades con permisos de origen y destino, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T42. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/Services/Implementations/ActividadService.cs`; `backend/FluencyAPI/Controllers/ActividadesController.cs`; `backend/FluencyAPI.Tests/EdicionActividadTests.cs (nuevo)`; `frontend/src/features/activities/ActivityForm.tsx`; `frontend/src/features/activities/ActivityForm.test.tsx`.

**Aceptación:**

- [ ] PATCH/DELETE verifican dueño actual de oportunidad o superiores; relink/desvinculación valida tanto origen como destino, sin eludir permiso.
- [ ] Editar texto/resultado/fecha no revalida empresa actual del contacto contra historia ni altera autor/fechaRegistro.
- [ ] Baja lógica sin restauración ni marcador; una relación comercial dada de baja no causa cascada y solo desaparece la actividad al darla de baja a ella.

**Verificación:** B + F + API(EdicionActividadTests) + UI(src/features/activities/ActivityForm.test.tsx) + D; cambio de dueño, quitar oportunidad ajena y texto histórico.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t44"></a>

### T44 — Proyectar el historial comercial combinado

**Resultado:** Proyectar el historial comercial combinado, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T41, T43. **Tamaño previsto:** M; 4 ubicaciones principales previstas.

**Archivos probables:** `backend/Services/Implementations/HistorialComercialService.cs (nuevo)`; `backend/Services/DTO/HistorialComercialContracts.cs (nuevo)`; `backend/FluencyAPI/Controllers/HistorialComercialController.cs (nuevo)`; `backend/FluencyAPI.Tests/HistorialComercialTests.cs (nuevo)`.

**Aceptación:**

- [ ] Unir actividades y transiciones antes de contar/paginar; orden fecha descendente, tipo e ID como desempate, fechas desde inclusiva/hasta exclusiva.
- [ ] Clientes usan FKs históricas directas, sin importar lo de la empresa actual ni duplicar actividades que coinciden por dos relaciones.
- [ ] Bajas respetan contextos vigentes: actividad puede seguir en contacto tras baja de oportunidad; todos los contextos dados de baja no originan papelera ni recuperación.

**Verificación:** B + API(HistorialComercialTests) + D; páginas intercaladas con empates, cambio A→B y oportunidad dada de baja.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t45"></a>

### T45 — Mostrar historial comercial en las tres fichas

**Resultado:** Mostrar historial comercial en las tres fichas, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T44, T42. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `frontend/src/features/activities/CommercialHistory.tsx (nuevo)`; `frontend/src/features/activities/CommercialHistory.test.tsx (nuevo)`; `frontend/src/features/companies/CompanyDetailPage.tsx`; `frontend/src/features/contacts/ContactDetailPage.tsx`; `frontend/src/features/opportunities/OpportunityDetailPage.tsx`.

**Aceptación:**

- [ ] Componente compartido representa actividad/transición, autor y ambas fechas donde corresponda; carga páginas de una única proyección.
- [ ] Las tres fichas permiten registrar/editar/bajar según capacidades sin duplicar lógica; fichas ajenas siguen mostrando su información.
- [ ] Mensajes vacío/error, foco y actualización posterior a mutaciones funcionan; no tarjetas de actividad eliminada ni historia reubicada por empresa actual.

**Verificación:** F + UI(src/features/activities/CommercialHistory.test.tsx) + D; recorrido manual de historia compartida. Checkpoint completo de actividades.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

### CP15 — Módulo actividades

- [ ] B + F, suites pertinentes completas y circuito historial combinado→edición→baja→lectura desde otro contexto. Revisar antes del merge.
- [ ] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t46"></a>

### T46 — Comprobar retiro del legado y coherencia de contratos

**Resultado:** Comprobar retiro del legado y coherencia de contratos, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T45. **Tamaño previsto:** M; 5 ubicaciones principales previstas.

**Archivos probables:** `backend/FluencyAPI/Controllers (solo rutas residuales detectadas)`; `backend/Persistence/Models (solo referencias obsoletas detectadas)`; `frontend/src/api/client.ts`; `frontend/src/api/schema.d.ts (generado)`; `docs/segunda-entrega/api-implementada.md (nuevo)`.

**Aceptación:**

- [ ] Inventario final no contiene endpoints alternativos de modificación, registro público, IDs de actor confiados ni tipos ligados a líneas/log genérico.
- [ ] EF/SQL/OpenAPI/clientes coinciden y código obsoleto se elimina; si el inventario revela varias limpiezas, dividir por módulo antes de modificar, máximo unas cinco rutas de archivo por subtarea.
- [ ] Actualizar documentación de contratos implementados y ejemplos sin secretos; pruebas de endpoints retirados demuestran que no mutan por caminos viejos.

**Verificación:** B + F + búsqueda de referencias antiguas + prueba HTTP negativa de rutas retiradas + D; regeneración local de tipos sin cambios manuales.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t47"></a>

### T47 — Cerrar la verificación de seguridad acordada

**Resultado:** Cerrar la verificación de seguridad acordada, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T46, T01. **Tamaño previsto:** M; 3 ubicaciones principales previstas.

**Archivos probables:** `CONSTRAINTS.md`; `docs/segunda-entrega/verificacion-seguridad.md (nuevo)`; `scripts/check-security.ps1 (nuevo si aporta repetibilidad)`.

**Aceptación:**

- [ ] Ejecutar auditorías npm/.NET y escaneo de secretos con redacción sobre dependencias, nuevos y cambios; comparar identidad/severidad contra T01.
- [ ] Ningún hallazgo nuevo alto/crítico ni secreto nuevo queda sin resolver; los previos se registran sin empeorar, sin audit fix indiscriminado.
- [ ] Comprobar que no quedan fallback de credenciales ni excepciones nuevas a controles; si se requiere corregir código, crear tarea acotada y repetir solo checks afectados antes de cerrar.

**Verificación:** S + D; capturar resultados/fechas/severidades sin valores sensibles. Fallo de red/scanner no equivale a informe limpio.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

<a id="t48"></a>

### T48 — Ensayar la entrega completa en local

**Resultado:** Ensayar la entrega completa en local, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T47. **Tamaño previsto:** S; 2 ubicaciones principales previstas.

**Archivos probables:** `docs/segunda-entrega/verificacion-final-local.md (nuevo)`; `tasks/todo.md`.

**Aceptación:**

- [ ] Ejecutar suites pertinentes completas, builds/lint y recorrido con perfiles separados: admin configura/crea usuarios, vendedor gestiona clientes y propia, responsable supervisa/reabre.
- [ ] Demostrar tabla global/funnel propio, reasignación, cierre/reapertura, historia, bajas y persistencia tras reinicio; no usar Azure ni usuarios automáticos de demo del producto.
- [ ] Registrar evidencia y deuda por caso; ningún fundamental sin verificar se marca completo. Defectos descubiertos generan tareas pequeñas y nueva verificación afectada, no excepciones tácitas.

**Verificación:** B + F + suite backend completa + suite frontend completa + D; ensayo manual local con datos ficticios y evidencia por rol. Sin repetir S si no hubo cambios desde T47.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

### CP16 — Aceptación local

- [ ] Recorridos fundamentales, compilación, pruebas y seguridad documentados. No declarar entrega integral si un control fundamental sigue pendiente.
- [ ] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

<a id="t49"></a>

### T49 — Preparar la publicación académica sin ejecutarla

**Resultado:** Preparar la publicación académica sin ejecutarla, conforme a la SPEC del módulo y al alcance descrito abajo.

**Dependencias:** T48. **Tamaño previsto:** M; 3 ubicaciones principales previstas.

**Archivos probables:** `docs/segunda-entrega/publicacion-azure.md (nuevo)`; `docs/segunda-entrega/entorno-local.md`; `tasks/todo.md`.

**Aceptación:**

- [ ] Documentar configuración requerida, esquema nuevo, bootstrap, HTTPS, claves Data Protection, URL del frontend/API, copias/rollback y cuenta de acceso del profesor sin credenciales en Git.
- [ ] Resolver con datos disponibles la topología propuesta: misma URL vía configuración existente o React servido por ASP.NET Core; si se conservan orígenes distintos, explicitar CORS/credenciales y limitación de cookies entre sitios.
- [ ] Identificar qué depende aún del dueño de Azure, base destino y autorización; preparar validación equivalente local. No desplegar, probar Azure, borrar bases ni integrar a main como parte de esta tarea.

**Verificación:** D + revisión de guía contra artefactos realmente implementados y SPEC §7. Si faltan datos de hosting, el procedimiento queda pendiente, no se afirma listo para desplegar.

**Evidencia:** pendiente — al ejecutar registrar comandos exactos, resultados, duración y limitaciones; no marcar finalizada con comprobaciones pendientes.

### CP17 — Preparación de publicación

- [ ] Guía revisada, pendientes operativos explícitos; publicación y cualquier cambio de base/hosting requieren decisión posterior. Main sigue fuera de alcance.
- [ ] Registrar resultados, fallos nuevos/previos y pendientes sin rebajar constraints; comprobar que los recorridos ya habilitados siguen funcionando.

## Registro de cambios del plan

- 08/10/2026: plan inicial posterior a la aprobación de SPEC. Solo documentación; no ejecución, instalación de herramientas, inspección de Docker ni cambios en Azure.
- 08/10/2026: aprobación explícita del plan y cierre de planificación. Metodología de agentes registrada en plan §6.1. Ninguna tarea de implementación ni checkpoint se marca completo por esta aprobación.
