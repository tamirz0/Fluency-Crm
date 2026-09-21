# Plan de primera entrega: Fluency CRM funcional e incremental

Actualizado: 21/09/2026. Objetivo de entrega: 24/09/2026.

## Estado confirmado para continuar en otro chat

El backend de este incremento está integrado en `master`, incluido el PR #6 (merge `6cb2e28`).
El usuario aprobó avanzar al frontend. No hay frontend implementado todavía.

| Área | Estado | Evidencia y límites |
|---|---|---|
| Login y usuario habilitado | Verificado en local | Register y login válido/inválido probados mediante HTTP; sin sesiones ni autorización efectiva |
| Empresas y contactos | Verificado en local | Altas, consultas, modificaciones, asociaciones y referencias inválidas |
| Servicios activos | Verificado en local y aprobado manualmente | GET y contrato OpenAPI contrastados con SQL |
| Estados, orígenes y etapas | Verificado en local | Tres GET, 3 estados, 3 orígenes y 4 etapas en el momento de la prueba; incluye etapas sin oportunidades |
| Oportunidades y embudo | Verificado mediante HTTP local y aprobado manualmente | Alta, detalle, listado por etapas, modificación y cambio de etapa |
| PATCH Empresa, Contacto y Oportunidad | Implementado y verificado en local | 38 solicitudes iniciales de Empresa y una verificación final de 105 solicitudes con GET posteriores; omisión/null, reglas de asociación, errores y ausencia de cambios parciales |
| PostgreSQL compartido en Supabase | Validación manual informada por el usuario | El usuario confirmó funcionamiento del circuito y de la relación empresa/contacto; no atribuir al agente una auditoría de esquema o pruebas remotas de los últimos PATCH |
| Frontend | Pendiente | Empezar por base y acceso; aprobar cada incremento antes de continuar |
| Persistencia integral desde UI y reinicios | Pendiente | Los GET posteriores a escrituras no sustituyen la demostración desde UI ni las pruebas de reinicio |

**Hito 1 aceptado para avanzar al frontend.** La evidencia detallada de contratos y pruebas está en
[`api-frontend.md`](api-frontend.md). Las notas históricas de esa guía describen el alcance de cada
verificación, no implican que deba repetirse todo el backend antes de empezar las pantallas.

### Instrucciones para el próximo chat

- Leer este plan, `api-frontend.md`, la sección Primera entrega del PDF y las instrucciones locales.
- Trabajar desde `master` integrado, en una nueva rama por incremento, preservando cambios del usuario.
  No integrar ni eliminar `feat/database-bootstrap`. No hacer commits o pushes sin autorización vigente.
- Desarrollar frontend en `frontend/`, manteniendo la API nativa y el contenedor `fluency-postgres`
  existente. Conexión local confirmada: `localhost:5433`; credenciales solo en configuración del backend.
  API con perfil HTTP en `http://localhost:5169`; el navegador consume `/api` mediante proxy Vite.
- Usar POST para altas/login; **PATCH para editar** empresas, contactos y oportunidades. Los POST de
  modificación quedan para comparación, no como contrato elegido para los nuevos formularios.
- No esperar PUT ni xUnit: están postergados y no bloquean este frontend. No implementarlos incidentalmente.
- Diseño elegido por el usuario: CRM sobrio, tema claro, Material UI, navegación lateral y formularios
  legibles. Conservar solo los datos del usuario en `sessionStorage` por pestaña, nunca la contraseña.
  Al salir, limpiar usuario y caché de datos; esto es estado local, no una sesión autenticada.
- Ofrecer todos los campos editables de empresas y contactos, incluidos estado y origen; incluir también
  estado y origen en oportunidades. Los campos obligatorios y borrables están definidos en la guía API.
- Usar el catálogo independiente de etapas para selectores y el embudo para listar/agrupar oportunidades.
  No fijar IDs ni obtener credenciales de base desde el frontend.
- Para crear oportunidades, asignar el responsable desde el login. Al editar una existente, conservar
  su responsable salvo una decisión explícita posterior; no reasignarlo silenciosamente al usuario actual.
- Las verificaciones del agente se realizan en PostgreSQL local. El usuario informó sus pruebas remotas
  y pidió no repetirlas automáticamente. No convertir esa evidencia en una prueba remota del frontend.

No se incorporan gestión de usuarios/catálogos, bajas, permisos, historial como pantalla, cierre completo,
drag-and-drop, infraestructura, despliegue ni IA. El objetivo siguiente es únicamente el incremento
**base y acceso**, luego empresas/contactos, oportunidades y embudo.

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
- Formularios: todos los campos descriptivos de empresas y contactos. Se incluyen selectores de estado cliente y origen comercial en empresas, contactos y oportunidades, según la ampliación de alcance acordada.
- Productos o servicios y etapas pueden estar precargados; no se requiere construir su gestión completa ni configurarlos desde la aplicación.
- Responsable de la oportunidad: usuario devuelto por el login.
- Embudo: cambio de etapa mediante selector o acción, sin drag-and-drop.
- Catálogos de solo lectura: estados de cliente, orígenes comerciales y etapas comerciales. No se incluye su gestión.
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
- Consultar estados mediante `GET /EstadosCliente/ListadoEstadosCliente`, orígenes mediante `GET /OrigenesComerciales/ListadoOrigenesComerciales` y etapas mediante `GET /EtapasComerciales/ListadoEtapasComerciales`. Los listados incluyen todos los registros; el de etapas no incluye oportunidades. Asignar como responsable al usuario devuelto por el login. No agregar gestión de usuarios ni de catálogos.
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

Las pantallas incluyen estados de carga, listas vacías, confirmación de guardado y errores comprensibles.
En edición usar PATCH: enviar solo campos modificados; omitir conserva y null explícito borra un opcional
si cumple las reglas de negocio. Los POST antiguos siguen interpretando null como conservar.

Ya se agregaron PATCH con borrado explícito de opcionales: omitir conserva,
enviar null borra si el campo es opcional. Los POST de modificación se conservan para comparar
compatibilidad antes de introducir PUT como reemplazo total. Los POST de alta, login y registro se conservan.
La empresa de un contacto no puede cambiar mientras tenga oportunidades asociadas; esta regla sustituye
la propagación automática considerada anteriormente. Reenviar la misma empresa está permitido.
Toda oportunidad debe conservar al menos empresa o contacto; si tiene ambos, el contacto debe pertenecer
a esa empresa. Se valida la combinación final, incluidos campos omitidos y borrados explícitos.

**Criterio de salida:** todas las funcionalidades requeridas pueden operarse desde el frontend contra la base local, sin depender de peticiones manuales para el recorrido habitual.

## 4. Tercer hito: verificación integral y persistencia

Desarrollar y verificar cada incremento en local. El plan original contemplaba ambos destinos:

- PostgreSQL del contenedor local.
- PostgreSQL existente en Supabase, manteniendo frontend y API en la PC.

**Ajuste acordado con el usuario:** no repetir automáticamente la verificación remota; el usuario informó
que comprobó el backend contra la base compartida. La ejecución pendiente del agente para este hito es
el recorrido integral desde el frontend contra PostgreSQL local, incluidos los reinicios. Una futura
demostración remota de la UI se registrará por separado si el usuario la realiza o la solicita.

### Lista de aceptación local (reutilizable si se solicita una prueba remota)

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

**Criterio de salida vigente:** la demostración de seis pasos y los demás casos aplicables pasan desde
la interfaz contra la base local, con persistencia comprobada; están documentados los comandos de
ejecución, la selección de conexión y las limitaciones conocidas. Separar pruebas locales ejecutadas,
validación remota informada por el usuario y verificaciones pendientes; no afirmar una prueba remota
de UI que no se realizó. La aceptación funcional sigue los requisitos de la primera entrega del PDF.

## 5. Trabajo posterior y límites

Postergar hasta completar el flujo funcional:

- EF Core Migrations y adopción controlada sobre Supabase, comprendiendo su funcionamiento y preservando los datos existentes.
- Seeds e inicialización automatizada.
- Dockerización de API y frontend, Compose integral y Nginx.
- CI/CD y automatización del despliegue.
- Refactorizaciones estructurales y alineación completa del dominio.
- Sesiones, autorización y permisos efectivos.
- Sustitución de los POST antiguos de modificación por PUT de reemplazo total.
- Traslado de comprobaciones de integración a xUnit; el usuario lo pospuso para una fase posterior.

Estas mejoras no son condiciones previas para comenzar el frontend ni para demostrar la primera entrega. Su implementación se planificará por separado cuando el flujo funcional esté validado y el equipo comprenda su operación.

Mantener las credenciales fuera del repositorio y corregir defectos funcionales necesarios sí forma parte del trabajo actual. No introducir cambios de esquema o infraestructura no acordados para resolver incidentalmente un bloqueo.

Continúan fuera de la primera entrega la gestión completa de roles y permisos, actividades, historial comercial como funcionalidad de UI, configuración de etapas, cierre completo de oportunidades e inteligencia artificial. Las capacidades existentes que no se muestran en la UI, como el registro de cambios de etapa, se conservan.
