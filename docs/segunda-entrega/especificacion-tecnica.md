# Especificación técnica común de la segunda entrega

Fecha: 08/10/2026. **Estado: especificación aprobada explícitamente por el usuario; no implementada.** El [mapa de capacidades](../../CAPABILITIES.md), los [acuerdos de la entrevista](decisiones-confirmadas.md) y el [diseño funcional](diseño-segunda-entrega.md) son las fuentes confirmadas. La planificación posterior está en [tasks/plan.md](../../tasks/plan.md). La aprobación conserva la cuestión operativa de Azure descrita en §7; no autoriza despliegue ni reconstrucción de bases.

## 1. Objetivo, supuestos y alcance

Entregar el CRM académico completo con permisos efectivos, configuración comercial, clientes, oportunidades y actividades verificables en local. El éxito es poder demostrar los recorridos del diseño desde la UI y su protección en API/base, no acumular capas o maximizar cobertura.

Supuestos técnicos explícitos: se conserva la aplicación actual y su stack; no hay consumidores externos de la API que exijan compatibilidad permanente; frontend y backend se actualizan de forma coordinada. En local, el navegador consume `/api` bajo el mismo origen mediante Vite. Se prefiere ese acceso en Azure, pero la topología definitiva sigue pendiente (§7). El entorno existente de Azure y el contenedor local fueron informados por el usuario y no se inspeccionaron en esta fase.

No se agregan microservicios, CQRS, bus de eventos, repositorios genéricos, Identity completo, proveedor externo de identidad, refresh tokens, auditoría genérica, gestión académica, facturación, IA ni tareas futuras. No se necesita migrar datos comerciales de la primera entrega.

## 2. Stack, estructura y estilo

Base observada: .NET 10, EF Core 10.0.12, Npgsql EF 10.0.3, OpenAPI de ASP.NET Core y Scalar; BCrypt.Net-Next existente. Frontend React 19, TypeScript 5.9, Vite 8, MUI, TanStack Query, React Hook Form/Zod, `openapi-fetch` y `openapi-typescript`. Conservar versiones instaladas compatibles; no actualizar dependencias por iniciativa ajena al alcance. Usar lockfiles de cada proyecto.

| Lugar | Responsabilidad |
|---|---|
| `backend/FluencyAPI/Controllers` | Binding, HTTP, autorización de entrada y documentación OpenAPI. Mantener controladores. |
| `backend/Services/DTO`, `Interface`, `Implementations` | Contratos explícitos, reglas del circuito y resultados de operaciones. |
| `backend/Persistence/Models` | Entidades y DbContext/configuraciones EF. Sin credenciales de respaldo en código. |
| `backend/Persistence/SQL` | Esquema versionado y catálogos iniciales de segunda entrega. |
| `backend/FluencyAPI.Tests` (nuevo previsto) | Tests xUnit de API/reglas críticas e integración PostgreSQL. |
| `frontend/src/api` | Cliente centralizado, errores y tipos generados. |
| `frontend/src/app`, `auth`, `features` | Sesión, navegación y pantallas por capacidad; mantener componentes compartidos existentes. |

Conservar C# PascalCase, DTO `sealed record`, camelCase JSON y nombres de dominio en español. Un ejemplo real que debe orientar las consultas es `EstadoClienteService.GetAllAsync`:

```csharp
return await db.EstadoClientes
    .AsNoTracking()
    .OrderBy(e => e.Descripcion)
    .ThenBy(e => e.Id)
    .Select(e => new EstadoClienteResponse(e.Id, e.Descripcion))
    .ToListAsync(cancellationToken);
```

Adaptar proyección, filtros y paginación a cada contrato; no copiar indiscriminadamente el alcance del listado anterior. No devolver entidades EF ni hashes al frontend. Usar servicios concretos y `CancellationToken`; no reescribir el backend por estilo. En React, reutilizar TanStack Query y formularios; acciones no autorizadas no aparecen o se muestran de solo lectura, con protección efectiva también en servidor.

## 3. Contrato HTTP común

Las rutas de los documentos de módulo son **rutas de la API**, sin el prefijo de acceso del navegador. Ejemplo local: `GET /empresas` se consume como `/api/empresas`. Vite elimina `/api`, como ahora. Al preparar publicación, configurar una única correspondencia según §7: proxy, montaje de la API bajo `/api` al servir React desde ASP.NET Core, o URL de API separada. No duplicar controladores ni contratos para cada entorno.

- Rutas orientadas a recursos en minúsculas; `GET` consulta, `POST` crea o ejecuta una transición, `PATCH` modifica campos explícitos, `DELETE` realiza baja lógica. Configuración usa acciones explícitas `desactivar`/`reactivar`.
- POST de recurso: `201`, `Location` y DTO. PATCH/transición: `200` con estado final. Baja: `204`. Consultas paginadas: `200`, incluso sin resultados. Operación que necesita un recurso inexistente: `404`.
- `400`: body, campos o referencias inválidas. `401`: sesión inválida/ausente/usuario desactivado. `403`: usuario válido sin permiso. `409`: restricción de negocio dependiente del estado, unicidad o conflicto concurrente. Errores no exponen SQL, secretos ni stack traces.
- `ProblemDetails` / `ValidationProblemDetails`, con `code` estable para decisiones del cliente y `traceId` para diagnóstico. Convenciones: `VALIDATION_FAILED`, `FORBIDDEN`, `REFERENCE_UNAVAILABLE`, `BUSINESS_CONFLICT`, `CONCURRENT_CHANGE`, `DUPLICATE_VALUE`. Mantener el parser frontend capaz de leer errores antiguos durante cada transición de módulo.
- PATCH usa DTO con presencia explícita de propiedades: omitido conserva; `null` limpia solo campos opcionales; valores obligatorios no aceptan `null`. Rechazar body vacío y propiedades no admitidas. No se adopta JSON Patch genérico ni binding directo a entidades.
- Ningún PATCH genérico permite cambiar `activo`, autor, fechas automáticas, historial, estado derivado o FKs derivadas. Transiciones y bajas tienen operaciones dedicadas.
- Desactivar o dar de baja repetidamente un ID que existe no produce efectos adicionales ni historial ficticio. Un ID que nunca existió sigue dando `404`. Los GET normales de datos comerciales dados de baja devuelven `404`, conservando las referencias necesarias en DTO de registros aún visibles.
- No conservar para siempre dos APIs completas. Al sustituir cada módulo se actualizan sus consumidores y tipos en el mismo incremento. Ninguna ruta antigua puede quedar abierta saltándose autenticación, permisos o reglas nuevas; retirar sus mutaciones obsoletas al migrar el módulo.

El formato de errores se apoya en [ProblemDetails de ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api?view=aspnetcore-10.0); códigos y política de compatibilidad son decisiones de este proyecto.

## 4. Listados, filtros y referencias

Parámetros comunes: `q` opcional, `page` (desde 1, default 1), `pageSize` (default 25, máximo 100). Valores fuera de rango: `400`. Respuesta: `{ items, page, pageSize, totalCount }`. Una página posterior al total devuelve `items: []`; no cambia de página silenciosamente.

Orden determinista por entidad, siempre con ID de desempate. Filtros en servidor antes de contar y paginar, combinados con AND; texto libre busca OR sobre los campos documentados. Texto sin distinguir mayúsculas; conservar normalización de búsqueda sin acentos en nombres/títulos mediante expresión normalizada parametrizada en PostgreSQL. No descargar todos los registros para simular paginación.

Opciones de selección usan los mismos recursos con `q` y paginación; incluyen solo registros disponibles para nuevas asociaciones. DTO de detalle devuelve ID, etiqueta y disponibilidad de la relación actual para conservar su lectura aunque ya no sea seleccionable. Catálogos pequeños pueden tener selector `GET /catalogos/{catalogo}/opciones`; no paginar un catálogo completo de tres estados fijos.

No usar filtros globales EF indiscriminados que borren referencias históricas por navegación. Aplicar `activo` al recurso principal y al tipo de operación; permitir proyectar etiquetas de referencias inactivas. El funnel personal no limita los GET de tabla/detalle del vendedor.

## 5. Modelo, SQL y consistencia

Implementar las entidades y cardinalidades del E-R acordado. IDs enteros generados por PostgreSQL; booleans `activo NOT NULL DEFAULT true`; fechas automáticas en servidor. Conservar relaciones N:M de usuario/rol/permiso, sin introducir un campo de rol excluyente.

Elección de preparación: SQL explícito versionado para una base nueva de segunda entrega, más mapeos EF coherentes, conservando el enfoque actual. No añadir migraciones de datos ni ejecutar `EnsureDeleted`, `EnsureCreated`, DDL destructivo o reconstrucciones durante el arranque normal. El script de esquema falla ante tablas existentes y requiere identificar expresamente la base destino. El operador decide luego el reemplazo de la base anterior. No mantener dos fuentes competidoras de generación automática SQL/EF migrations.

- FKs con `RESTRICT`/`NO ACTION`, nunca cascadas de baja o borrado de datos comerciales. No borrar físicamente empresas, contactos, oportunidades, actividades ni transiciones desde la API.
- `CHECK` local para empresa-o-contacto, participantes positivos si se informan y códigos fijos. Estado, embudo y servicio de oportunidad se obtienen por joins, sin FKs duplicadas.
- Índice único parcial `(id_embudo, orden) WHERE activo`. Para finales: unicidad `(id_embudo, id_estado)` restringida a los IDs de los estados fijos GANADA/PERDIDA. Resolver esos IDs en el script a partir de códigos semilla estables; los IDs no se fijan en la UI. Un índice no puede consultar otra tabla en su predicado. La creación transaccional del embudo y la prohibición de eliminar sus finales aseguran que existan ambas, no solo “a lo sumo una”.
- FK del historial anterior nullable solo para alta; nueva etapa, oportunidad, autor y fecha obligatorios. API sin PATCH/DELETE de historial.
- Mutaciones que dependen de lecturas para validar responsables, asignaciones, finales o bloqueos de baja usan transacciones cortas `Serializable`, incluyendo validación y escritura. Todos los caminos que escriben las relaciones implicadas deben usar esta política, incluidos cambios de configuración/roles. `SaveChanges` e historial se confirman juntos.
- Rollback completo ante conflicto de serialización/deadlock; devolver `409 CONCURRENT_CHANGE` y pedir recargar/reintentar. No reintentar automáticamente una mutación para evitar repetir efectos. No mantener transacciones mientras el usuario completa un formulario ni usar un token de versión en oportunidad.
- Esto protege las invariantes durante cada request, no promete detectar todas las ediciones hechas sobre formularios viejos: para campos ordinarios, un PATCH posterior del mismo campo puede prevalecer. Los permisos y el estado se releen al guardar.

[EF Core documenta la atomicidad de SaveChanges y transacciones explícitas](https://learn.microsoft.com/en-us/ef/core/saving/transactions). El aislamiento es una elección del proyecto apoyada por [las alternativas de concurrencia de EF Core](https://learn.microsoft.com/en-us/ef/core/saving/concurrency); probarlo con PostgreSQL real. La unicidad parcial se fundamenta en [PostgreSQL](https://www.postgresql.org/docs/current/indexes-partial.html).

## 6. Representación y validación

- Importes: `numeric(12,2)` / `decimal`; JSON number sin cálculos monetarios autoritativos en JavaScript. Admitir cero; no redondear silenciosamente más de dos decimales ni admitir valores negativos. Mismo tipo para precio y valor; no agregar moneda o conversiones.
- Instantes: `timestamptz` en PostgreSQL, UTC en persistencia y `DateTimeOffset` normalizado a UTC en contratos. Fecha estimada: `date` / `DateOnly` / `yyyy-MM-dd`, sin conversión horaria. Mostrar instantes en `America/Argentina/Buenos_Aires`. [Npgsql distingue timestamps UTC y fechas sin hora](https://www.npgsql.org/doc/types/datetime.html).
- Longitudes propuestas: nombre/apellido/título/embudo/etapa/catálogo 100; razón social, servicio y correo 150; username 50; documento/CUIT 20; cargo/industria 100; teléfono 50. Conservar `text` para dirección, descripciones, observaciones, objetivo y disponibilidad; limitar el tamaño total de requests sin truncar texto silenciosamente.
- Empresa: razón social obligatoria. Contacto: nombre, apellido y correo obligatorios, conservando el contrato actual. Estado de cliente y responsable obligatorios en persistencia según E-R; alta omite ambos si usa defaults Potencial y creador. Origen opcional. No imponer unicidad de correo, documento o CUIT de clientes no acordada.
- Usuarios: nombre/apellido/username/correo obligatorios, username y correo únicos con comparación normalizada sin distinguir mayúsculas; contraseña no se recorta ni normaliza. Conservar BCrypt y sus límites: mínimo 8 caracteres y máximo 72 bytes UTF-8, costo 12. No guardar contraseña sin hash.
- Textos obligatorios con `trim` no pueden quedar vacíos; opcionales vacíos se normalizan a ausencia. DTO y frontend deben compartir los límites publicados en OpenAPI.

## 7. Entornos y autenticación

Cookie de ASP.NET Core protegida con Data Protection, ocho horas de duración absoluta, `SlidingExpiration=false`, `IsPersistent=false`, `HttpOnly`, `SameSite=Lax`, `Path=/`, sin `Domain`. HTTPS y `Secure` obligatorios en Azure. Desarrollo puede usar el proxy HTTP de localhost con cookie no Secure solo en `Development`; no extender esa excepción a interfaces públicas.

Preferencia: navegador → mismo origen `/api` → API. Aclaración conversada antes de aprobar la especificación: el despliegue anterior usa URLs diferentes y CORS con el origen del frontend autorizado; esto no demuestra aún compatibilidad de cookies. No es obligatorio instalar un proxy. Si se mantienen orígenes diferentes, hacen falta origen explícito y credenciales habilitadas en backend, `credentials: 'include'` en frontend y política de cookies compatible con los sitios reales. `SameSite=Lax` no sirve para fetch entre sitios diferentes; `SameSite=None; Secure` tampoco evita el bloqueo de cookies de terceros. No adoptar esa variante sin verificarla. Como alternativa propuesta, ASP.NET Core puede servir el frontend compilado y la API bajo una misma URL. La elección de hosting y cualquier cambio de infraestructura se revisan antes de publicar, sin cambiar ahora la autenticación elegida.

Data Protection conserva sus claves en el almacenamiento persistente del hosting y un nombre de aplicación estable; no copiar claves entre entornos ni agregarlas a Git. No se agrega base de sesiones, Redis, JWT ni refresh tokens.

Los endpoints de mutación, incluido login/logout, requieren antiforgery del framework mediante header `X-CSRF-TOKEN`. La API proporciona el token de request; la SPA lo conserva en memoria y lo renueva tras login/logout. No usar `GET` para mutaciones. CORS, si corresponde, autoriza solo orígenes explícitos y los métodos/headers necesarios; no combina comodín de origen con credenciales. [CORS y cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS#requests_with_credentials); [publicación de React desde ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/client-side/spa/intro?view=aspnetcore-10.0#published-single-page-apps).

Estas decisiones usan [autenticación por cookie sin Identity](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/cookie?view=aspnetcore-10.0) y [antiforgery de ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0). El detalle de validación de usuarios/roles y contratos está en [SPEC-acceso](../../SPEC-acceso.md).

## 8. Verificación, comandos y límites

Comandos existentes, desde `frontend`: `npm run test:run`, `npm run lint -- src vite.config.ts`, `npm run build`, `npm run dev`. Regeneración: `npm run api:types` con API local disponible. Desde raíz: `dotnet build backend/FluencyAPI.slnx --no-restore -m:1` después de restaurar dependencias; `git diff --check`. Para API local: `dotnet run --project backend/FluencyAPI --launch-profile http`.

Previsto al implementar, todavía inexistente: proyecto `backend/FluencyAPI.Tests` con xUnit, SDK de tests y `Microsoft.AspNetCore.Mvc.Testing` compatible con .NET 10. Comando objetivo: `dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore`; no presentarlo como check disponible hoy. [WebApplicationFactory permite pruebas de integración de la API](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0).

Tests de permisos reales por HTTP (cookie/antiforgery), circuitos y persistencia con PostgreSQL local en base de tests separada. Verificar nombre/host y propiedad de la base antes de limpieza; sin conexión Azure ni fallback a la conexión de desarrollo. Una configuración ausente falla: no omitir pruebas ni sustituir PostgreSQL por InMemory para validar índices/transacciones. Datos ficticios aislados; los tests pueden tener varias cuentas, la instalación del producto solo un administrador.

Mantener Vitest/Testing Library para formularios y presentación. Tests focalizados por tarea; suite pertinente completa y recorrido manual local por módulo. Sin porcentaje obligatorio de cobertura, nuevas suites de rendimiento ni tests de presentación interna. Aplican los 90 segundos aproximados y controles de seguridad de [CONSTRAINTS.md](../../CONSTRAINTS.md).

**Siempre:** preservar diseño, validar input y permiso en servidor, documentar fallos previos/nuevos, mantener OpenAPI y consumidores coherentes, probar comportamiento fundamental antes de declarar implementación lista.

**Consultar:** cambios de negocio/alcance, reconstrucción de una base existente, publicación o cambio importante del entorno Azure y OK para merge a `segunda-entrega`. Los paquetes mínimos de tests y detalles rutinarios se concretan autónomamente dentro del alcance, sin convertir ejemplos de skills en aprobaciones adicionales.

**Nunca:** secretos en Git/logs, pruebas contra Azure, cambios directos en main, tests silenciados para pasar, sesión confiada al ID del formulario, ampliación de auditoría descartada o arranque que borre bases.

## 9. Aceptación y cuestiones operativas pendientes

La especificación se acepta cuando cada módulo tiene contratos y casos verificables sin contradecir el diseño/entrevista; la implementación se acepta posteriormente cuando esos casos funcionan en local y se revisa el resultado antes del merge.

No hay una nueva pregunta funcional bloqueante. Antes de ejecutar o publicar se deben comprobar puertos/base del contenedor, topología y claves Data Protection del hosting existente y destino exacto del esquema nuevo. Son condiciones operativas, no autorizaciones para probar o desplegar ahora. Ocho horas, cookie, SQL explícito y contratos REST forman parte de la especificación aprobada.

La especificación y [el plan](../../tasks/plan.md) fueron aprobados expresamente el 08/10/2026; la planificación quedó cerrada por pedido del usuario. [Las tareas](../../tasks/todo.md) permanecen pendientes para la siguiente sesión de implementación, sin necesidad de repetir la aprobación del plan. No se instalaron dependencias ni se cambió código funcional durante la planificación.
