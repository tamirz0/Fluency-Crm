# API implementada de la segunda entrega

Inventario generado el 05/11/2026 desde el OpenAPI real de la API local (`/openapi/v1.json`, perfil Development), sin edición manual de los tipos del frontend (`frontend/src/api/schema.d.ts`, regenerado con `npm run api:types`). Son **70 operaciones**. Rutas sin prefijo `/api`: el frontend usa `/api` como base. Todas requieren sesión de usuario activo salvo `GET /auth/csrf` y `POST /auth/login`; las mutaciones exigen el token antiforgery (`X-CSRF-TOKEN`). La identidad sale siempre de la sesión del servidor: ningún cuerpo acepta autor, actor, fecha de registro ni estado de baja (propiedades desconocidas: 400). No existe registro público ni rutas de modificación alternativas; las rutas de la primera entrega no están publicadas y la prueba `HttpContractTests` lo comprueba sobre el descubrimiento MVC y el OpenAPI.

Convenciones comunes (errores `ProblemDetails` con `code` estable, paginación `{ items, page, pageSize, totalCount }`, `PATCH` diferencial) en [contrato-http.md](contrato-http.md) y [especificacion-tecnica.md](especificacion-tecnica.md). Reglas por módulo en las SPEC (`SPEC-*.md`). Sin ejemplos con credenciales: las cuentas y contraseñas las decide el operador.

## Acceso y sesión

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/auth/csrf` | Obtiene un token CSRF para la identidad actual. | 200 |
| POST | `/auth/login` | Inicia una sesión no persistente con vencimiento absoluto de ocho horas. | 200, 400, 401, 429 |
| POST | `/auth/logout` | Cierra la sesión actual; requiere token CSRF de esa identidad. | 204, 400, 401 |
| GET | `/auth/me` | Consulta la identidad validada y el vencimiento original de la sesión. | 200, 401 |

## Usuarios y roles

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/roles` | - | 200, 400, 401, 403, 404, 409 |
| GET | `/usuarios` | - | 200, 400, 401, 403, 404, 409 |
| POST | `/usuarios` | - | 201, 400, 401, 403, 404, 409 |
| GET | `/usuarios/opciones` | - | 200, 400, 401, 403, 404, 409 |
| GET | `/usuarios/{id}` | - | 200, 400, 401, 403, 404, 409 |
| PATCH | `/usuarios/{id}` | - | 200, 400, 401, 403, 404, 409 |
| POST | `/usuarios/{id}/desactivar` | - | 200, 400, 401, 403, 404, 409 |
| PUT | `/usuarios/{id}/password` | - | 204, 400, 401, 403, 404, 409 |
| POST | `/usuarios/{id}/reactivar` | - | 200, 400, 401, 403, 404, 409 |

## Catálogos y configuración

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/catalogos/{catalogo}` | - | 200, 400, 401, 403, 404, 409 |
| POST | `/catalogos/{catalogo}` | - | 201, 400, 401, 403, 404, 409 |
| GET | `/catalogos/{catalogo}/opciones` | - | 200, 400, 401, 403, 404, 409 |
| GET | `/catalogos/{catalogo}/{id}` | - | 200, 400, 401, 403, 404, 409 |
| PATCH | `/catalogos/{catalogo}/{id}` | - | 200, 400, 401, 403, 404, 409 |
| POST | `/catalogos/{catalogo}/{id}/desactivar` | - | 200, 400, 401, 403, 404, 409 |
| POST | `/catalogos/{catalogo}/{id}/reactivar` | - | 200, 400, 401, 403, 404, 409 |
| GET | `/estados-oportunidad` | - | 200, 400, 401, 403, 404, 409 |
| GET | `/servicios` | Lista paginada; operadores consultan activos, administrador puede filtrar inactivos/todos. | 200, 400, 401, 403, 404, 409 |
| POST | `/servicios` | Crea un servicio activo; precio requerido, cero válido. | 201, 400, 401, 403, 404, 409 |
| GET | `/servicios/{id}` | Consulta el servicio conservando referencias inactivas. | 200, 400, 401, 403, 404, 409 |
| PATCH | `/servicios/{id}` | Edita los campos enviados, sin modificar embudos ni oportunidades. | 200, 400, 401, 403, 404, 409 |
| POST | `/servicios/{id}/desactivar` | Desactiva el servicio conservando sus embudos. | 200, 400, 401, 403, 404, 409 |
| POST | `/servicios/{id}/reactivar` | Reactiva el servicio sin restaurar otros registros. | 200, 400, 401, 403, 404, 409 |

## Embudos y etapas

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/embudos` | Lista embudos; solo administrador consulta inactivos. | 200, 400, 401, 403, 404, 409 |
| POST | `/embudos` | Crea embudo y sus dos finales en una transacción. | 201, 400, 401, 403, 404, 409 |
| GET | `/embudos/{id}` | Consulta un embudo y sus referencias conservadas. | 200, 400, 401, 403, 404, 409 |
| PATCH | `/embudos/{id}` | Edita sin reinterpretar negociaciones históricas. | 200, 400, 401, 403, 404, 409 |
| POST | `/embudos/{id}/desactivar` | Desactiva si no tiene oportunidades abiertas y activas. | 200, 400, 401, 403, 404, 409 |
| GET | `/embudos/{id}/etapas` | Etapas del embudo, por orden; conserva referencias inactivas. | 200, 400, 401, 403, 404, 409 |
| POST | `/embudos/{id}/etapas` | Crea exclusivamente una etapa abierta. | 201, 400, 401, 403, 404, 409 |
| PUT | `/embudos/{id}/orden-etapas` | Reordena todas las activas en una transacción, sin cambiar activo. | 200, 400, 401, 403, 404, 409 |
| POST | `/embudos/{id}/reactivar` | Reactiva solo el embudo. | 200, 400, 401, 403, 404, 409 |
| GET | `/etapas/{id}` | Consulta una etapa aun si está inactiva. | 200, 400, 401, 403, 404, 409 |
| PATCH | `/etapas/{id}` | Edita textos y orden; solo una abierta sin uso puede cambiar de embudo. | 200, 400, 401, 403, 404, 409 |
| POST | `/etapas/{id}/desactivar` | Desactiva una abierta sin oportunidades vigentes situadas en ella. | 200, 400, 401, 403, 404, 409 |
| POST | `/etapas/{id}/reactivar` | Reactiva una abierta al final del orden activo. | 200, 400, 401, 403, 404, 409 |

## Empresas

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/empresas` | Lista empresas compartidas, con filtros previos al conteo y orden razón social/ID. | 200, 400, 401, 404, 409 |
| POST | `/empresas` | Crea una empresa compartida; defaults de responsable y estado desde el servidor. | 201, 400, 401, 404, 409 |
| GET | `/empresas/{id}` | Consulta una empresa vigente, con referencias históricas legibles. | 200, 400, 401, 404, 409 |
| PATCH | `/empresas/{id}` | Edita atómicamente campos enviados; omisión conserva y null limpia opcionales. | 200, 400, 401, 404, 409 |
| DELETE | `/empresas/{id}` | Baja definitiva (sin borrado físico ni restauración); bloqueada por contactos u oportunidades activos, con las causas en el 409. | 204, 400, 401, 404, 409 |
| GET | `/empresas/{id}/historial-comercial` | Actividades de la empresa (por su FK directa) y transiciones de sus oportunidades vigentes. Fecha descendente; `desde` inclusivo, `hasta` exclusivo. | 200, 400, 401, 404 |

## Contactos

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/contactos` | Lista contactos compartidos, con filtros previos al conteo y orden apellido/nombre/ID. | 200, 400, 401, 404, 409 |
| POST | `/contactos` | Crea un contacto compartido; defaults de responsable y estado desde el servidor. | 201, 400, 401, 404, 409 |
| GET | `/contactos/{id}` | Consulta un contacto vigente, con referencias históricas legibles. | 200, 400, 401, 404, 409 |
| PATCH | `/contactos/{id}` | Edita atómicamente campos enviados; omisión conserva y null limpia opcionales. Cambiar la empresa solo afecta al contacto. | 200, 400, 401, 404, 409 |
| DELETE | `/contactos/{id}` | Baja definitiva (sin borrado físico ni restauración); bloqueada por oportunidades activas, con la causa en el 409. | 204, 400, 401, 404, 409 |
| GET | `/contactos/{id}/historial-comercial` | Igual criterio por contacto: no incluye automáticamente lo de su empresa actual. | 200, 400, 401, 404 |

## Oportunidades

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/embudos/{id}/funnel` | Funnel de un embudo (activo o no): columnas activas, también vacías y finales. El vendedor siempre recibe su propia cartera; administrador y responsable comercial ven todas y pueden filtrar por responsable. | 200, 400, 401, 403, 404, 409 |
| GET | `/oportunidades` | Lista todas las oportunidades vigentes (lectura compartida), con filtros previos al conteo; creación e ID descendentes. | 200, 400, 401, 403, 404, 409 |
| POST | `/oportunidades` | Crea una oportunidad con su historial inicial en una sola transacción. Sin etapa usa la primera abierta activa del embudo; sin valor copia el precio del servicio; sin responsable usa al actor. El vendedor solo crea a su nombre. | 201, 400, 401, 403, 404, 409 |
| GET | `/oportunidades/{id}` | Consulta una oportunidad vigente, también ajena (lectura compartida). | 200, 400, 401, 403, 404, 409 |
| PATCH | `/oportunidades/{id}` | Edita atómicamente los campos enviados de una oportunidad abierta. Solo el responsable vendedor o un superior; una cerrada exige reapertura. Responsable, etapa, cierre y baja usan comandos específicos. | 200, 400, 401, 403, 404, 409 |
| DELETE | `/oportunidades/{id}` | Baja lógica definitiva (abierta o cerrada, sin reapertura): oculta el recurso, conserva historial y actividades y no se restaura. Solo el responsable vendedor o un superior. | 204, 400, 401, 403, 404, 409 |
| POST | `/oportunidades/{id}/ganar` | Cierra una oportunidad abierta como ganada: exige fecha y valor final (cero es válido) y la mueve a la etapa final ganada del embudo. Repetir el cierre responde 409. | 200, 400, 401, 403, 404, 409 |
| GET | `/oportunidades/{id}/historial-comercial` | Actividades asociadas y transiciones de la oportunidad vigente. | 200, 400, 401, 404 |
| GET | `/oportunidades/{id}/historial-etapas` | Historial de etapas de una oportunidad vigente, paginado por fecha e ID ascendentes. Solo lectura. | 200, 400, 401, 403, 404, 409 |
| POST | `/oportunidades/{id}/mover` | Mueve una oportunidad abierta a otra etapa abierta y activa de su embudo, con su entrada de historial (autor: la sesión). Mismo destino: sin cambios ni historial. Las etapas finales se alcanzan con ganar/perder. | 200, 400, 401, 403, 404, 409 |
| POST | `/oportunidades/{id}/perder` | Cierra una oportunidad abierta como perdida: exige fecha y un motivo de pérdida activo; conserva el valor vigente. | 200, 400, 401, 403, 404, 409 |
| POST | `/oportunidades/{id}/reabrir` | Reabre una cerrada en una etapa abierta activa de su embudo (solo administrador y responsable comercial). Conserva en el historial, como texto, el cierre anterior y la justificación; limpia fecha y motivo de cierre y mantiene el valor. | 200, 400, 401, 403, 404, 409 |
| POST | `/oportunidades/{id}/reasignar` | Reasigna una oportunidad abierta. El responsable vendedor solo puede elegir otro vendedor activo; un superior, cualquier usuario activo. Devuelve las acciones recalculadas: quien la pierde conserva la lectura y recibe 403 en su siguiente mutación. | 200, 400, 401, 403, 404, 409 |

## Actividades

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/actividades` | Lista las actividades vigentes (lectura compartida) con filtros previos al conteo, ordenadas por la fecha del hecho descendente. `desde` es inclusivo y `hasta` exclusivo. | 200, 400, 401, 403, 404, 409 |
| POST | `/actividades` | Registra una actividad ya realizada. El autor y la fecha de registro los fija el servidor. Sin oportunidad cualquier usuario activo gestiona; con oportunidad, solo su responsable vendedor o un superior (también si está cerrada). | 201, 400, 401, 403, 404, 409 |
| GET | `/actividades/{id}` | Consulta una actividad vigente, también ajena. Una dada de baja responde 404. | 200, 400, 401, 403, 404, 409 |
| PATCH | `/actividades/{id}` | Edita los campos enviados. Exige gestionar la oportunidad de origen y, si se cambia o quita, también la de destino; el autor y la fecha de registro no cambian. | 200, 400, 401, 403, 404, 409 |
| DELETE | `/actividades/{id}` | Baja lógica sin restauración ni cascadas (204). Repetirla responde 404. | 204, 400, 401, 403, 404, 409 |
