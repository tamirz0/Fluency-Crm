# Plan de primera entrega: Fluency CRM funcional e incremental

Actualizado: 20/09/2026. Objetivo de entrega: 24/09/2026.

## 1. Objetivo y decisiones

Priorizar un sistema funcional y comprensible que cumpla los requisitos de la primera entrega antes de incorporar automatización del esquema, despliegue o integración continua. La aceptación funcional se deriva de `Enunciado/Entregas-CRM.pdf`, sección **Primera entrega -- 24/9**. La evaluación prioriza el funcionamiento integral y el cumplimiento de la consigna; no impone una arquitectura tecnológica ni documentación adicional. Este plan reemplaza la secuencia anterior, que exigía completar migraciones, seeds y Docker antes del frontend.

La reorganización del backend ya está integrada en `master`. El trabajo de migraciones queda postergado en `feat/database-bootstrap`, sin integrarlo ni eliminarlo. El desarrollo continúa desde `master`, en ramas por hito.

### Tecnologías y alcance inicial

- Frontend: React + Vite + TypeScript.
- UI: Material UI.
- Datos remotos: TanStack Query.
- Formularios: React Hook Form + Zod.
- Navegación: React Router.
- Cliente API: `openapi-typescript` + `openapi-fetch`.
- Backend: ASP.NET Core 10 + EF Core como acceso a datos.
- Base: PostgreSQL. **Usar EF Core no obliga a adoptar migraciones ahora.**
- Rutas actuales: se conservan durante la primera entrega.
- Formularios: campos indispensables, sin selectores de estado ni origen comercial.
- Productos o servicios y etapas pueden estar precargados; no se requiere construir su gestión completa ni configurarlos desde la aplicación.
- Responsable de la oportunidad: usuario devuelto por el login.
- Embudo: cambio de etapa mediante selector o acción, sin drag-and-drop.
- Acceso: validación de credenciales mediante el login existente. No crea una sesión autenticada ni protege los endpoints; sesiones, autorización y roles efectivos quedan pendientes.

### Ejecución prevista

Frontend y API se ejecutan nativamente mediante `npm run dev` y `dotnet run`. La API se conecta alternativamente al PostgreSQL del contenedor local o a la base existente en Supabase, cambiando únicamente su configuración de conexión.

Supabase se utiliza como base de datos remota, sin publicar todavía la API ni el frontend. Las credenciales permanecen fuera del repositorio y nunca se exponen en el frontend.

No se requiere Compose integral para esta entrega. Se conserva el contenedor PostgreSQL existente; Docker no es obligatorio para ejecutar frontend o API nativamente. Las bases existentes no se consideran descartables.

## 2. Primer hito: backend suficiente para las pantallas

Antes de crear el frontend:

- Relacionar cada requisito de la entrega con sus endpoints y verificar solicitudes, respuestas y errores.
- Comprobar login; alta, modificación, listado y detalle de empresas y contactos; relaciones entre ambos; alta, modificación, detalle, listado por embudo y cambio de etapa de oportunidades.
- Agregar `GET /Servicios/ListadoServicios`, devolviendo servicios activos y sus datos necesarios para la selección, con contrato documentado en OpenAPI.
- Asegurar que exista al menos un usuario habilitado para la demostración. No se exige gestión completa de roles y permisos.
- Obtener etapas desde el embudo y asignar como responsable al usuario devuelto por el login. No agregar gestión de usuarios ni selectores de estado y origen.
- Corregir defectos que bloqueen esos flujos, incluyendo errores de validación que terminen en fallos internos. Evitar rediseños generales del dominio.
- Preparar un usuario válido mediante `Register`, sin depender del demo inválido del SQL ni implementar seeds automatizados.
- Confirmar conexión y compatibilidad del esquema existente en Supabase antes de avanzar con las pantallas. Si se detectan diferencias, identificarlas y resolver su impacto antes de continuar, sin recrear tablas ni aplicar migraciones automáticamente.

**Criterio de salida:** los contratos necesarios están disponibles y el recorrido principal funciona mediante peticiones HTTP en local; la conexión y compatibilidad inicial con Supabase están comprobadas.

## 3. Segundo hito: frontend por incrementos

Cada incremento se prueba en local antes de comenzar el siguiente:

1. **Base y acceso:** proyecto React, cliente OpenAPI, proxy Vite `/api`, navegación, login y cierre de sesión del estado local. El proxy elimina `/api` al reenviar a las rutas actuales.
2. **Empresas y contactos:** listados, detalles, creación, edición y vinculación del contacto con una empresa.
3. **Oportunidades:** creación, edición, detalle y listado; asociación con empresa o contacto, selección de servicio y responsable igual al usuario ingresado. El listado puede obtenerse a partir de la respuesta del embudo.
4. **Embudo:** agrupación por etapa y cambio mediante selector o acción, con actualización de los datos mostrados.

Las pantallas incluyen estados de carga, listas vacías, confirmación de guardado y errores comprensibles. Se respeta la actualización parcial actual: no se ofrece eliminar un valor enviando `null` si el backend interpreta eso como conservarlo.

**Criterio de salida:** todas las funcionalidades requeridas pueden operarse desde el frontend contra la base local, sin depender de peticiones manuales para el recorrido habitual.

## 4. Tercer hito: verificación integral y persistencia

Tras comprobar al inicio la conexión y compatibilidad de Supabase, desarrollar cada incremento en local y repetir el flujo completo en ambos destinos antes de cerrar la entrega:

- PostgreSQL del contenedor local.
- PostgreSQL existente en Supabase, manteniendo frontend y API en la PC.

### Lista de aceptación para ambos destinos

- Completar la demostración requerida por el enunciado desde la interfaz, en este orden: (1) iniciar sesión, (2) registrar una empresa y un contacto y relacionarlos, (3) crear una oportunidad relacionada con la empresa o el contacto, con responsable y producto/servicio, (4) visualizarla en el embudo agrupada por etapa, (5) cambiarla de etapa y (6) comprobar que la información permanece guardada.
- Confirmar que hay al menos un usuario habilitado y que el inicio de sesión funciona; comprobar también el rechazo de credenciales inválidas.
- Crear, consultar y modificar empresas y contactos, incluyendo listados y detalles.
- Relacionar un contacto con una empresa y comprobar la relación guardada.
- Crear y modificar una oportunidad con responsable y servicio.
- Consultarla en listado, detalle y embudo.
- Cambiarla de etapa desde la interfaz, comprobar la actualización del embudo y verificar que la nueva etapa persiste en la base de datos después de recargar la página y reiniciar la API.
- Recargar el navegador y reiniciar la API para confirmar persistencia.
- En local, comprobar además la persistencia tras reiniciar el contenedor sin eliminar su volumen.
- Comprobar que operaciones rechazadas no dejan cambios parciales.

Usar datos de prueba identificables en Supabase, sin borrar registros existentes ni recrear el esquema. No ejecutar el SQL inicial sobre una base ya preparada. No asumir que los IDs de usuarios, servicios o etapas coinciden entre ambos destinos.

**Criterio de salida:** la demostración de seis pasos y los demás casos aplicables pasan desde la interfaz en ambas bases, con persistencia comprobada; están documentados los comandos de ejecución local, la selección del destino de conexión y las limitaciones conocidas. Registrar los resultados de cada destino por separado; una prueba local no sustituye la comprobación en Supabase. La verificación final juzga el funcionamiento integral contra los requisitos de la primera entrega del enunciado y no condiciona la aceptación a funcionalidades de la entrega final, documentación adicional o una arquitectura específica.

## 5. Trabajo posterior y límites

Postergar hasta completar el flujo funcional:

- EF Core Migrations y adopción controlada sobre Supabase, comprendiendo su funcionamiento y preservando los datos existentes.
- Seeds e inicialización automatizada.
- Dockerización de API y frontend, Compose integral y Nginx.
- CI/CD y automatización del despliegue.
- Refactorizaciones estructurales y alineación completa del dominio.
- Sesiones, autorización y permisos efectivos.

Estas mejoras no son condiciones previas para comenzar el frontend ni para demostrar la primera entrega. Su implementación se planificará por separado cuando el flujo funcional esté validado y el equipo comprenda su operación.

Mantener las credenciales fuera del repositorio y corregir defectos funcionales necesarios sí forma parte del trabajo actual. No introducir cambios de esquema o infraestructura no acordados para resolver incidentalmente un bloqueo.

Continúan fuera de la primera entrega la gestión completa de roles y permisos, actividades, historial comercial como funcionalidad de UI, configuración de etapas, cierre completo de oportunidades e inteligencia artificial. Las capacidades existentes que no se muestran en la UI, como el registro de cambios de etapa, se conservan.
