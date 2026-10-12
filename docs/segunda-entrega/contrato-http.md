# Contrato HTTP implementado: T07

12/10/2026. Preparación del checkpoint CP03, todavía sin sesión ni recursos comerciales nuevos. No acredita acceso funcional; faltan T08–T09. Por indicación del usuario, no se agregó página informativa provisional.

## Convenciones comunes

- `ApiConventions` configura los controladores y `Program` utiliza el middleware estándar de excepciones y códigos de estado. Errores: `ProblemDetails`/`ValidationProblemDetails`, `code` estable y `traceId`, también cuando el controlador construye directamente un ProblemDetails. Los códigos específicos del negocio se conservan. Excepciones inesperadas: `500 INTERNAL_ERROR`, sin detalle interno en la respuesta, incluso en Development.
- Binding explícito mediante `[FromBody]`, `[FromQuery]` y `[FromRoute]`; deshabilitada la inferencia de fuentes. JSON rechaza propiedades desconocidas y duplicadas. Errores de deserialización no devuelven la excepción del formatter.
- Los futuros DTO PATCH pueden extender `Services.DTO.PatchRequest`: setters `init` registran los campos presentes en `ProvidedFields`; `HasField` distingue omisión de null y la validación base rechaza `{}`. Cada DTO valida sus campos obligatorios y llama a la validación base. Los opcionales admiten null para limpiar; omitir conserva. No hay binding a entidades ni JSON Patch genérico. Las transiciones, autores, fechas automáticas y estado derivado no forman parte de los DTO de edición ordinaria.
- `PageQuery`: `page` desde 1, default 1; `pageSize` entre 1 y 100, default 25. Valores inválidos: `400 VALIDATION_FAILED`. `PageResponse<T>`: `{ items, page, pageSize, totalCount }`. Filtrado, orden, conteo y consulta paginada real se implementan en cada módulo; estos contratos no descargan ni paginan datos por sí mismos.

## Corte de la primera entrega

Los ocho controladores anteriores están excluidos del descubrimiento MVC mediante un feature provider explícito, sin flag de configuración para reabrirlos. Sus 23 acciones no se mapean y devuelven 404; tampoco aparecen en OpenAPI. Los servicios/DTO anteriores se conservan hasta sustituir cada módulo.

| Controlador | Acciones anteriores excluidas (ruta relativa al prefijo del controlador) | Sustitución prevista |
|---|---|---|
| `/Login` | POST `Register`, `Login` | T08 `/auth/*`; administración de usuarios T11–T12, sin registro público |
| `/Empresa` | POST `AltaEmpresa`; GET `DatosEmpresa/{idEmpresa}`, `ListadoEmpresas`; PATCH y POST `ModificarEmpresa/{idEmpresa}` | Módulo clientes |
| `/Contacto` | POST `AltaContacto`; GET `DatosContacto/{idContacto}`, `ListadoContactos`, `HistorialEtapas/{idContacto}`; PATCH y POST `ModificarContacto/{idContacto}` | Clientes y posterior historial comercial |
| `/Oportunidades` | POST `AltaOportunidad`; GET `OportunidadesPorEtapa`, `DatosOportunidad/{idOportunidad}`; PATCH y POST `ModificarOportunidad/{idOportunidad}`; POST `UpdateEtapaOportunidad/{idOportunidad}` | Módulo oportunidades |
| `/Servicios` | GET `ListadoServicios` | Configuración comercial |
| `/EtapasComerciales` | GET `ListadoEtapasComerciales` | Configuración comercial |
| `/EstadosCliente` | GET `ListadoEstadosCliente` | Catálogos nuevos |
| `/OrigenesComerciales` | GET `ListadoOrigenesComerciales` | Catálogos nuevos |

Al sustituir un controlador, retirar o reescribir todas sus acciones obsoletas antes de quitar su entrada del bloqueo. No volver a publicar métodos antiguos junto al contrato nuevo. Un controlador nuevo se descubre normalmente; no necesita un sistema de flags.

Superficie real al cerrar T07: cero acciones MVC de negocio; `paths` de OpenAPI vacío. En Development se conservan `/openapi/v1.json` y Scalar (`/scalar/v1` y sus rutas auxiliares), solo documentación del contrato real. No se añadieron endpoints de demostración al producto. El prefijo `/api` pertenece al proxy Vite y se elimina antes de llegar a la API.

`frontend/src/App.tsx` no monta rutas mientras se completa acceso. No hay login anterior ni navegación comercial accesibles desde App; tampoco contenido informativo provisional. Se conserva el código de componentes y sus pruebas para adaptar los módulos en los incrementos previstos. El proveedor de sesión anterior aún existe; no acredita identidad de servidor ni monta una pantalla por sí mismo.

## Evidencia y fuentes

[Verificación T07](../../tasks/verificaciones/verificacion-t07.md). Las pruebas de binding/PATCH/paginación usan un controlador exclusivo del assembly de tests y mutaciones en memoria: verifican el contrato HTTP común, no recursos comerciales todavía inexistentes. Una fábrica separada inventaría la aplicación sin ese controlador.

Referencias de implementación: [ProblemDetails ASP.NET Core 10](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api?view=aspnetcore-10.0), [application feature providers](https://learn.microsoft.com/en-us/aspnet/core/mvc/advanced/app-parts?view=aspnetcore-10.0#feature-providers), [rechazo de propiedades JSON desconocidas](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/missing-members). Reglas funcionales: [especificación común §§3–4](especificacion-tecnica.md).
