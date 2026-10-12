# Contexto de trabajo de la segunda entrega

Relevamiento: 07/10/2026. Base inspeccionada: rama `segunda-entrega`, commit `f9fde15`, más los cambios locales existentes. Este documento describe el punto de partida y las decisiones pendientes; no es un plan de implementación ni acredita funcionamiento integral en ejecución.

> **Actualización del 08/10/2026:** entrevista, especificación técnica y [plan](../../tasks/plan.md) aprobados. El usuario pidió cerrar la planificación; implementación aún no iniciada. Acuerdos en [decisiones-confirmadas.md](decisiones-confirmadas.md), SPEC en [CAPABILITIES.md](../../CAPABILITIES.md) y ejecución pendiente en [tasks/todo.md](../../tasks/todo.md). Los resultados de pruebas de este contexto son históricos; no se repitieron. Al planificar se comprobó por lectura que el cliente usa nuevamente `/api`; los tres fallos anteriores por URL no deben asumirse actuales sin medirlos.

## 1. Fuentes y autoridad

**Actualización de ejecución del 11/10/2026:** T01 y T02 están completadas e integradas en `segunda-entrega`; el usuario confirmó el push. T01 comenzó desde `ae4cc2e` en `segunda-entrega-t01-linea-base`. Su [evidencia](../../tasks/verificaciones/verificacion-t01.md) sustituye los resultados históricos de §7 como línea de base: builds correctos, lint con una advertencia previa, suite frontend 70/71 y auditorías completadas con deuda identificada. El cliente usa `/api` con proxy local; los tres fallos históricos de URL no se reprodujeron. La configuración local ajena de `appsettings.json` se preservó fuera de los commits del agente; después el usuario informó que retiró su información sensible.

T02 (`a3fa0c4`) eliminó la contraseña de respaldo del DbContext y habilitó User Secrets para `ConnectionStrings:SegundaEntregaDB`. Desarrollo apunta a `localhost:5433` / `fluency_segunda_entrega_dev`, creada vacía; build correcto, siete rechazos de configuración y conexión TCP de solo lectura verificados. Ver [evidencia de T02](../../tasks/verificaciones/verificacion-t02.md) y [guía local](entorno-local.md), incluida la diferencia comprobada entre el almacén de Codex en `LocalCache` y el de Windows Terminal, y la importación que confirmó el usuario.

T03 y CP01 se completaron en `segunda-entrega-t03-pruebas-aisladas` y ya están integradas en `segunda-entrega` / `333d946`, confirmado por el usuario y comprobado al iniciar T04: proyecto xUnit/WebApplicationFactory, base exclusiva `fluency_segunda_entrega_test` y secreto `ConnectionStrings:SegundaEntregaTestDB`. El usuario confirmó destino, limpieza propia e importación de la clave en Windows Terminal. Los tests crean un esquema GUID y probe por ejecución, verifican identidad/propiedad y limpian solo esos objetos con RESTRICT. Suite backend 26/26 y repetición aislada 5/5; frontend 71/71, builds/lint correctos con advertencia previa, auditoría .NET de cuatro proyectos sin hallazgos. B7 no se reprodujo, sin resolver su causa; B8 permanece pendiente. Evidencia y límites en [T03/CP01](../../tasks/verificaciones/verificacion-t03.md). Al cerrar T03 ambas bases terminaron vacías; todavía no se había creado el esquema comercial de T04 ni autenticación efectiva.

| Fuente | Para qué usarla |
|---|---|
| [Entregas CRM](../../Enunciado/Entregas-CRM.pdf), pp. 2–3 | Requisitos de la entrega final, prevista para el 12/11 según la consigna. Se evalúa funcionamiento integral; no exige arquitectura específica ni documentación adicional. |
| [Consigna general](../../Enunciado/Consigna_Trabajo_Practico.pdf), pp. 4–6 | Especialización real, alcance y responsabilidades de administrador, vendedor y responsable comercial. |
| [Definiciones generales](../../Enunciado/Definiciones-Generales.pdf), pp. 5–7 | Reglas generales, pantallas y orden de desarrollo indicado por la cátedra. |
| [Módulos principales](../../Enunciado/Modulos_Principales.pdf), pp. 1–7 | Datos de clientes, oportunidades, filtros, actividades e historiales. |
| [Diseño acordado](diseño-segunda-entrega.md) | Comportamiento objetivo. Leer el E-R junto con las reglas, excepciones y ejemplos; el diagrama aislado no basta. |
| Código, proyectos y configuración versionados | Evidencia del estado implementado. No convierten una regla antigua en requisito de la segunda entrega. |
| [Arquitectura del frontend](../primera-entrega/frontend-arquitectura-y-reglas.md) | Convenciones técnicas y visuales existentes, salvo reglas funcionales reemplazadas por el diseño acordado. |
| [Contratos de primera entrega](../primera-entrega/api-frontend.md), [modelo anterior](../primera-entrega/modelo-dominio.md), [primera entrega](../primera-entrega/entrega-1.md), [plan anterior](../primera-entrega/plan_primer_entrega.md) | Referencia histórica. Contrastar con el código y no reutilizar automáticamente sus pendientes o restricciones temporales. |
| [Alcance](../primera-entrega/alcance.md) | Resumen de funcionalidades incluidas y excluidas; completar su lectura con el diseño y la consigna. |

Los requisitos académicos y las simplificaciones del diseño se mantienen distinguibles. Si aparece una incompatibilidad nueva, documentarla y consultarla; no ampliar silenciosamente el producto. La limitación de auditoría y la exclusión del sitio web de empresa ya están declaradas en el diseño (§9.4 y §6.2).

**T04 (11/10/2026), integrada:** código `287c71b` y cierre `8ab52b9` incluidos en `segunda-entrega` / `a639f76`, con merge/push confirmado por el usuario; árbol limpio y referencia local `origin/segunda-entrega` coincidente al iniciar T05, sin nueva consulta de red. SQL objetivo y catálogos con fixture comercial aislado. Desarrollo tiene 20 tablas y catálogos, sin usuarios ni datos comerciales, instalados explícitamente después de verificar destino y pruebas. SchemaTests 20/20 y suite backend 46/46, build correcto, revisión independiente sin hallazgos requeridos; tests terminó sin tablas/esquemas propios. Evidencia y límites en [T04](../../tasks/verificaciones/verificacion-t04.md). No repetir la preparación de desarrollo ni borrarla automáticamente.

**T05 (11/10/2026), integrada:** identidad/roles completados desde `a639f76`, código `59a9b4d`/`5e38d60`, separación de clases `c69d887`. El 12/10 el usuario confirmó merge y Git verificó su inclusión en `segunda-entrega` / `c69d887`, con referencia local `origin/segunda-entrega` coincidente y árbol limpio, sin nueva consulta remota. Mapeos identidad alineados con SQL, roles fijos y cálculo de capacidades con unión/precedencia, sin nueva API de definiciones. Backend 58/58 (IdentityTests 12/12 y SchemaTests 20/20), cero omisiones, build sin errores/advertencias, auditoría .NET sin vulnerabilidades reportadas y mutación representativa detectada/restaurada. Desarrollo conserva 20 tablas con tres roles/siete permisos/dieciséis asociaciones, instalados explícitamente; cero usuarios y sin servicios/embudos/oportunidades de demostración. Tests terminó sin tablas ni esquemas de fixture. Vite en 5173 se preservó durante T05; no se inició la API. Evidencia y límites en [T05](../../tasks/verificaciones/verificacion-t05.md).

**T06 / controles locales de CP02 (12/10/2026), pendiente de integración:** comando `--bootstrap-admin` implementado en `segunda-entrega-t06-admin-inicial`, código `4fdf3c1`. Crea un único administrador activo con BCrypt desde variables de entorno, sin HTTP ni DDL; reejecución sin cambios, recuperación explícita si hay usuarios sin administrador activo y concurrencia con rollback completo. BootstrapAdminTests 24/24 y backend completo 82/82, cero omisiones, build sin errores/advertencias, auditoría .NET sin vulnerabilidades reportadas, mutación detectada/restaurada y revisión independiente sin hallazgos pendientes. Desarrollo conserva el inventario T05, todavía sin cuenta: el operador elige sus datos mediante la guía; tests terminó sin tablas, esquemas ni conexiones propios. Evidencia y límites en [T06](../../tasks/verificaciones/verificacion-t06.md). El usuario indicó conservar el bootstrap si ya funciona; no se añadió otra vía SQL. Sigue el ensayo de conexión a una base de prueba nueva en Supabase con el usuario, pendiente en [CP02](../../tasks/todo.md#cp02--inicialización), y después T07 tras integrar. No se conectó a la nube ni se redirigieron suites locales durante T06. El ensayo posterior debe conservar la protección de Development y definir destino/aislamiento/TLS/entorno explícitos. Sesión y autorización HTTP efectiva aún pendientes; no probar rutas comerciales antiguas como si ya cumplieran la segunda entrega.

**Actualización posterior de CP02, 12/10/2026:** el usuario preparó Supabase y confirmó inventario previo al bootstrap: 20 tablas, 3 roles, 7 permisos, 16 asociaciones y 0 usuarios en `fluency_crm`. El intento desde su terminal falló en TLS; creación y reejecución remotas siguen pendientes. Después decidió destinar esa base a producción y usar un perfil persistente `Production`, con clave propia `SegundaEntregaProductionDB` y suites exclusivamente locales. Guía en [entorno-local.md](entorno-local.md#perfil-production-para-supabase), controles y límites en [evidencia CP02](../../tasks/verificaciones/verificacion-cp02-supabase.md). El cierre de CP02 y la integración conservan sus OK respectivos.

## 2. Estado comprobado en el repositorio

### Stack y estructura

- `backend/FluencyAPI`: ASP.NET Core 10, controladores, registro de dependencias, OpenAPI y Scalar en desarrollo.
- `backend/Services`: interfaces, DTO y servicios de negocio; usa EF Core 10 y BCrypt.
- `backend/Persistence`: modelos EF, `FluencyLocalDbContext` y SQL inicial para PostgreSQL. No se encontraron migraciones EF versionadas en esta revisión.
- `frontend`: React 19, TypeScript, Vite, MUI, React Router, TanStack Query, React Hook Form, Zod, Day.js y cliente generado desde OpenAPI.
- Tests frontend con Vitest, Testing Library y jsdom; lint con Oxlint. Hay ocho archivos de tests. No se encontró proyecto de tests .NET ni configuración CI versionada.
- Hay lockfiles separados en raíz y frontend. El `package.json` raíz contiene la CLI de Supabase; los comandos de la aplicación web se ejecutan desde `frontend`.
- No se encontraron `AGENTS.md` ni `CONSTRAINTS.md` previos en el repositorio.

### Capacidades y brechas

| Área | Evidencia actual | Diferencia con el objetivo |
|---|---|---|
| Acceso | `LoginService` verifica contraseña con BCrypt; el frontend guarda `UsuarioResponse` en `sessionStorage`. | No se emite una sesión autenticada por el servidor. No se encontró `AddAuthentication`, `UseAuthentication` ni `[Authorize]`. El login no verifica `Activo`. Roles y permisos existen como modelos, sin autorización efectiva. |
| Clientes | API y pantallas de alta, listado, detalle y edición; formularios usan PATCH diferencial. | Falta gestión completa de responsables y bajas del nuevo diseño. El servicio y formulario de contacto todavía bloquean cambiar su empresa si tiene oportunidades. |
| Servicios y configuración | Endpoints de lectura de servicios, estados de cliente, orígenes y etapas. | Falta administración completa, disponibilidad y reactivación. No hay entidad `Embudo` en el modelo actual. |
| Oportunidades | Alta, detalle, modificación, tablero y cambio de etapa implementados. | `Oportunidad` almacena `IdServicio` e `IdEstado`; este último referencia `EstadoCliente`. Faltan el modelo derivado por etapa/embudo, valor, motivos de pérdida y datos opcionales de contratación acordados. |
| Etapas e historial | `UpdateEtapaAsync` modifica etapa y agrega historial en un mismo `SaveChangesAsync`; existe consulta de historial por contacto. | No hay etapas por embudo ni finales con semántica de ganada/perdida. El alta no crea historial inicial. El autor del movimiento proviene del request, no de una identidad autenticada. |
| Actividades | Modelos `Actividad` y `ActividadOportunidad` del esquema anterior. | No se encontraron controladores/servicios ni pantallas de gestión. Falta separar catálogo y hecho, fechas de ocurrencia/registro e historial comercial integrado. |
| Cierre y reapertura | El modelo contiene `FechaCierre` y una tabla separada de motivos de rechazo. | No existe el circuito completo acordado de ganar, perder, justificar y autorizar reapertura. |
| Consultas | Búsqueda textual en memoria en empresas, contactos y oportunidades; el listado de oportunidades aplana el tablero. | No se encontraron paginación ni filtros completos por responsable, etapa, estado y origen exigidos por la consigna. |
| Presentación | Pantallas y componentes existentes con tema oscuro, Source Sans 3, estados de carga/error y búsquedas. | Conservar convenciones útiles; no tomar las pantallas actuales como definición del nuevo circuito. |

Evidencias principales: `backend/FluencyAPI/Program.cs`, `backend/Services/Implementations/`, `backend/Persistence/Models/`, `frontend/src/App.tsx`, `frontend/src/auth/`, `frontend/src/features/` y `frontend/src/api/`.

No se consultó ninguna base de datos ni se hicieron escrituras mediante la API durante este relevamiento. La existencia del código no demuestra por sí sola persistencia o permisos en ejecución.

## 3. Diferencias documentales y del entorno

| Diferencia | Cómo interpretarla |
|---|---|
| El plan de primera entrega dice que el frontend está pendiente y propone tema claro. | Es histórico: el frontend ya existe y su guía posterior define tema oscuro. |
| La guía frontend bloquea cambiar la empresa de un contacto con oportunidades. | El diseño nuevo §7.2–7.3 reemplaza esa regla: permitir el cambio con aviso, conservando asociaciones anteriores. |
| Los contratos anteriores permiten seleccionar servicio/estado en oportunidad. | Describen la API actual. El objetivo deriva ambos de etapa y embudo. |
| El plan anterior excluía permisos, bajas y configuraciones. | Era un límite de la primera entrega, no de la entrega final. |
| El plan anterior decía que las bases no eran descartables. | El diseño §1.1 permite reconstruir datos de prueba y no requiere migrarlos; esto no autoriza una reconstrucción automática de cualquier base. |
| README y guía frontend describen `/api` con proxy local. | El cambio local preexistente en `frontend/src/api/client.ts` apunta a una API remota. No iniciar verificaciones con datos asumiendo que apuntan a localhost. |
| Hay cambios locales en `backend/FluencyAPI/appsettings.json` y `frontend/src/api/client.ts`. | Preservarlos. No son cambios de este relevamiento ni una nueva decisión de arquitectura. |
| `FluencyLocalDbContext.OnConfiguring` contiene una conexión de respaldo con contraseña literal. | Hallazgo de seguridad preexistente; no copiar su valor en documentación o mensajes. Corregir su gestión en la etapa de implementación. No se verificó si esa credencial es válida. |

### Información aportada por el usuario después del relevamiento

- **PostgreSQL local:** disponible mediante Docker para utilizarlo en localhost cuando haga falta. Container ID: `968c3a20d1e55ae43fa73f0c27ff3fcc08f38c00a22ae27105c8b227cd14a964`. Es información del usuario, no una comprobación de ejecución. No se inspeccionaron estado, puertos, base ni credenciales; no fijar el puerto a partir de menciones históricas.
- **Autonomía:** el agente tiene autorización persistente para crear ramas y commits dentro del trabajo encomendado sobre `segunda-entrega` y sus ramas derivadas. No necesita pedir permiso por cada operación de ese tipo.
- **Integración:** las ramas de incremento parten de `segunda-entrega` y sus PR apuntan a `segunda-entrega`. Una vez que el cambio funcione y tenga verificaciones pertinentes, presentar el resultado y pedir el OK antes del merge, que podrá ejecutar el usuario o el agente autorizado.
- **Nombres:** usar `segunda-entrega-<descripcion>`, por ejemplo `segunda-entrega-refactor-api-rest`. La forma propuesta `segunda-entrega/<descripcion>` entra en conflicto con la referencia de la rama existente `segunda-entrega`; no renombrar la rama base para habilitar ese prefijo.
- **Main:** el usuario informó protección en GitHub que exige PR. No fue verificada. No trabajar ni integrar allí hasta que lo indique; si parece oportuno por el avance, proponer la integración y esperar su OK.

Esta aclaración del 07/10/2026 reemplaza la prohibición previa de crear ramas/commits sin autorización individual. Se documentó sin ejecutar pruebas, inspeccionar Docker, consultar GitHub ni operar sobre ramas.

## 4. Restricciones funcionales cerradas

Este índice remite al diseño, que conserva el detalle normativo:

- Modelo: oportunidad → etapa → embudo → servicio; estado derivado de la etapa. Un único `valor` total, sin multiplicarlo por participantes (§3, §6).
- Cada embudo tiene exactamente una ganada y una perdida permanentes. Las abiertas son configurables; se admite guardar un embudo sin abiertas, pero no crear oportunidades en él (§5).
- Alta rápida con contexto, creador como responsable y primera etapa abierta activa por defecto; origen y datos adicionales son opcionales (§6).
- No cambiar de embudo una oportunidad; conservar alta y cambios efectivos en historial. Movimiento e historial constituyen una sola operación funcional (§6, §9).
- Corregir una cerrada exige reapertura autorizada y justificada; conservar el cierre anterior en observación. No agregar auditoría completa, versiones ni copias JSON (§6, §9.4).
- `activo` no significa abierta. Bajas de datos comerciales definitivas sin borrado físico; configuración recuperable, con las excepciones de etapas finales y estados fijos (§4, §8).
- Sin cascadas ni reasignaciones automáticas. Bloqueos de bajas de clientes distintos de los de embudos/etapas (§7–8).
- Desactivar un servicio no inutiliza sus embudos activos. Un usuario desactivado pierde acceso pero puede conservar asignaciones (§5, §10).
- Cambiar la empresa actual de un contacto conserva oportunidades y actividades anteriores (§7).
- Actividades son hechos ocurridos; no tareas futuras. Autor de actividades y transiciones obtenido del usuario autenticado y permisos validados en backend (§9–10).
- Especialización limitada a servicios, niveles, modalidades y datos de contratación. Se excluyen gestión académica integral, cobros, agenda, integraciones, estadísticas e IA en este incremento (§13).

## 5. Decisiones pendientes para la etapa siguiente

Estas decisiones concretan el diseño; no habilitan a reabrir sus reglas funcionales. La matriz funcional de roles, lectura y modificación, el administrador inicial, la ausencia de registro público y el uso local/Azure quedaron resueltos en la entrevista; resta concretar sus mecanismos técnicos en la especificación.

La [especificación técnica común](especificacion-tecnica.md) y los módulos del [mapa aprobado](../../CAPABILITIES.md) definen esos mecanismos y fueron aprobados. La siguiente tabla conserva el inventario original de decisiones; no es una lista actual de preguntas abiertas ni evidencia de implementación. Consultar las SPEC y el plan para el estado vigente.

| Tema | Decisión necesaria y límites |
|---|---|
| Autenticación | Elegir mecanismo de sesión, expiración, cierre y tratamiento de usuarios desactivados. JWT y duraciones de propuestas anteriores no están aprobados. |
| Autorización | Concretar matriz de acciones y alcance de registros por rol, asignaciones y permiso de reapertura a partir de los perfiles académicos. La necesidad de autorización ya está cerrada. |
| Esquema y preparación de datos | Elegir SQL/migraciones y mecanismo reproducible de inicialización; determinar entorno y base exactos. No hace falta migrar datos de prueba existentes. |
| Integridad y operaciones simultáneas | Materializar unicidad de finales/órdenes activos y atomicidad de movimientos, altas e historial. Elegir cómo evitar conflictos sin introducir el token de versión descartado en el E-R. |
| Contratos HTTP | Definir DTO, operaciones de cierre/reapertura/baja, validación y errores; decidir convivencia o sustitución de rutas antiguas y regeneración de OpenAPI. |
| Consultas | Definir contrato de búsqueda, filtros, orden estable y paginación, incluyendo historiales y referencias inactivas según permisos. |
| Representación de datos | Concretar precisión decimal, longitudes, nulabilidad, fechas y zona horaria sin convertir campos opcionales en requisitos de alta. |
| Configuración de entornos | Resolver URL de API local/remota, CORS, secretos y entorno de demostración. No dar por adoptada una infraestructura por un cambio local. |
| Verificación | Acordar pruebas fundamentales, controles de seguridad y cómo ejecutarlos; el runner .NET y los datos aislados todavía no están definidos. |

La consigna de Definiciones Generales §Orden obligatorio de desarrollo ubica usuarios/roles/permisos antes de clientes, servicios, oportunidades y actividades. Registrar esta condición para la futura planificación, sin producir aquí tareas ni cronograma. La IA es opcional en la consigna general y Entregas CRM y está excluida del diseño actual, aunque aparezca en la lista general de casos de uso.

## 6. Convenciones que se conservan

- Mantener la separación controladores → servicios → persistencia, evitando introducir otra arquitectura por preferencia del agente.
- Cliente HTTP centralizado en `frontend/src/api/client.ts`; tipos públicos generados desde OpenAPI, sin edición manual de `schema.d.ts`.
- TanStack Query para datos remotos e invalidación; React Hook Form + Zod para formularios. Las validaciones del cliente no sustituyen las del servidor.
- Conservar PATCH diferencial, distinción omisión/null, bloqueo de envíos duplicados y conservación del formulario ante errores cuando resulten compatibles con los nuevos contratos.
- No fijar IDs de catálogos. Mantener referencias históricas legibles aunque no estén disponibles para nuevas selecciones.
- Mantener etiquetas accesibles, teclado, foco, carga/vacío/error/reintento y la identidad visual existente.
- Preservar cambios ajenos y trabajar con la autonomía y el flujo de integración registrados en `AGENTS.md`: ramas y commits autorizados, merge hacia `segunda-entrega` con OK previo, `main` reservada para una decisión explícita posterior. No registrar secretos ni reproducirlos en salidas.

## 7. Verificación inicial

Herramientas locales: Node `24.21.0`, npm `11.19.0`, SDK .NET `10.0.401`. Dependencias ya instaladas; no se instalaron paquetes.

| Comando / inspección | Resultado del relevamiento |
|---|---|
| `npm run build` desde `frontend` | Correcto: TypeScript y Vite completados. No demuestra TypeScript estricto: `strict` no está habilitado en `tsconfig.app.json`. |
| `npm run lint` desde `frontend` | Falló recorriendo también `node_modules` en este entorno. No usar ese resultado para atribuir errores al código propio. |
| `npm run lint -- src vite.config.ts` desde `frontend` | Correcto, con una advertencia preexistente `react/only-export-components` en `src/app/providers.tsx:9`. Alcance explícito; no se desactivaron reglas ni se modificó el script. |
| `dotnet build backend/FluencyAPI.slnx --no-restore` | Primer intento falló sin diagnóstico útil. |
| `dotnet build backend/FluencyAPI.slnx --no-restore -m:1 -v:normal` | Correcto, cero errores y advertencias. El log intermedio mostró timeout al conectar con el servidor de compilación por named pipe y posterior compilación satisfactoria. |
| `npm run test:run` desde `frontend` | Primera ejecución: siete suites fallaron al cargar temporales del sandbox (`ENOENT`); una suite y dos pruebas pasaron. No constituye una línea de base funcional de las siete suites restantes. |
| Repetición de tests con temporales locales y un worker | Ocho suites, 71 pruebas: 68 correctas y tres fallidas en `Companies.test.tsx`. Las tres esperan `/api/...` y reciben la URL remota del cambio local preexistente. Duración total: 177,51 segundos. |
| Cobertura | Sin proveedor ni configuración de cobertura encontrados. No hay porcentaje medido ni objetivo porcentual aprobado. |
| Seguridad automática | No se encontraron `gitleaks` ni `osv-scanner` en PATH. `npm audit --json --ignore-scripts` falló por DNS (`ENOTFOUND registry.npmjs.org`); no hay inventario válido de vulnerabilidades. |
| Tests .NET / navegador / base | No hay proyecto .NET de tests; no se verificaron navegador, API viva ni base en este relevamiento. |
| `git diff --check` inicial | Correcto. |

Invocación que permitió completar los tests en este sandbox, desde `frontend` (modifica únicamente variables de ese proceso y temporales ignorados):

```powershell
$taskTemp = Join-Path (Get-Location) 'node_modules\.tmp\context-baseline'
New-Item -ItemType Directory -Force -Path $taskTemp | Out-Null
$env:TEMP = $taskTemp
$env:TMP = $taskTemp
npm run test:run -- --maxWorkers=1 --no-file-parallelism
```

El detalle final de los controles acordados y su estado de activación se mantiene en [CONSTRAINTS.md](../../CONSTRAINTS.md). Una limitación de entorno no cuenta como prueba aprobada ni autoriza a bajar el nivel de exigencia. Se acordaron pruebas fundamentales sin porcentaje de cobertura obligatorio, seguridad de dependencias/secretos, bloqueo de problemas nuevos y presupuesto aproximado de 90 segundos por tarea, reservando checks lentos al cierre de módulos.

## 8. Continuidad

La siguiente sesión debe leer `AGENTS.md`, `CONSTRAINTS.md`, este contexto, las SPEC, [el plan aprobado](../../tasks/plan.md), [el seguimiento](../../tasks/todo.md), [la guía local](entorno-local.md) y las evidencias de T01–T05; comprobar después el estado real de Git y procesos. Mantener separados acuerdos, propuestas y comprobaciones realizadas. El usuario aprobó la especificación y el plan el 08/10/2026; no repetir esa aprobación. T01–T04 y CP01 están integradas, comprobado en `a639f76`; T05 está completada en su rama con autorización del usuario y la metodología del plan §6.1, pendiente del OK de integración; sigue T06 tras integrar. Base y limpieza de infraestructura acordadas; no heredar desarrollo/Azure ni extender ese permiso a reconstrucciones o borrados amplios. Desarrollo tiene el esquema/catálogos de T04 y roles/permisos de T05 aplicados explícitamente, sin usuarios ni datos comerciales; tests finalizó vacío. La preparación comercial y limpieza propia de tests están documentadas en T04/T05, sin limpieza automática de desarrollo. La revisión Supabase queda para el final de CP02/T06 cuando el usuario disponga de su base de prueba, manteniendo las suites automatizadas locales.

No trasladar credenciales entre chats. Los secretos están fuera de Git; comprobar su disponibilidad desde el entorno que vaya a arrancar la API o los tests, considerando la redirección de `LocalCache` observada en Codex. B7/B8 de T01 siguen pendientes y no equivalen a fallos nuevos. Los merges/publicaciones siguen requiriendo su OK. Azure mantiene pendiente la topología de publicación; cookies elegidas no equivalen a proxy obligatorio ni a despliegue comprobado.
