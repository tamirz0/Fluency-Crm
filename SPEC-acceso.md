# Especificación: acceso

ID: `acceso`. Mapa aprobado: [CAPABILITIES.md](CAPABILITIES.md). Estado: especificación aprobada por el usuario el 08/10/2026; no implementada. Incluye [las convenciones comunes](docs/segunda-entrega/especificacion-tecnica.md) de stack, estructura, estilo, comandos, pruebas y límites; requisitos funcionales en [decisiones confirmadas](docs/segunda-entrega/decisiones-confirmadas.md).

## Objetivo y límites

Identificar al actor real y aplicar los tres perfiles, con un administrador inicial y sin registro público. Proteger todos los recursos comerciales y de configuración. El frontend no acredita identidad ni permisos por guardar un usuario local.

Persisten `Usuario`, `Rol`, `Permiso`, `UsuarioRol` y `PermisoRol`. Roles y permisos se inicializan con códigos estables; no hay CRUD de su definición. Conservar múltiples roles por usuario según el E-R: permisos efectivos son la unión y la condición de administrador/responsable comercial prevalece sobre las restricciones del vendedor. Un usuario operativo tiene al menos un rol de los tres existentes. No crear jerarquías editables ni permisos individuales.

## Sesión y seguridad

- Cookie protegida, absoluta de ocho horas, no persistente, sin renovación deslizante. El login usa BCrypt y verifica usuario activo. `UseAuthentication` precede a `UseAuthorization`; política de autenticación por defecto. Solo login y obtención inicial de antiforgery son anónimos entre los endpoints de negocio.
- `ValidatePrincipal` consulta usuario y roles actuales por request; usuario inexistente/inactivo pierde acceso con `401`. Los servicios obtienen un actor validado del contexto, nunca de `idUsuario`/`idAutor` recibido del cliente.
- Para invalidar cookies al cambiar contraseña sin tabla de sesiones, incluir una huella SHA-256 del hash BCrypt como claim dentro de la cookie cifrada y compararla con la huella actual al validar. No enviar esa huella ni el hash en ningún DTO. Roles se recalculan de la base, sin extender la expiración original.
- `POST /auth/logout` elimina la cookie. No se promete revocación remota de cada copia de una cookie robada: no hay lista de sesiones ni revocación por dispositivo. Desactivar usuario y cambiar contraseña invalidan su uso al siguiente request. Esta limitación no convierte la UI en control de acceso.
- `sessionStorage` deja de ser fuente de autenticación y no guarda credenciales/tokens. Restaurar la UI con `/auth/me`; `401` limpia usuario/caché y vuelve a login; `403` mantiene la sesión y presenta falta de permiso.
- La cookie se comparte entre pestañas del mismo navegador; no conservar la antigua promesa de un usuario distinto por pestaña. Probar roles con perfiles de navegador o sesiones independientes. Al recuperar foco, actualizar identidad/capacidades antes de operar.
- Antiforgery según contrato común, incluso en login/logout; emitir nuevo token después de cambiar identidad. El cliente no reenvía automáticamente una mutación fallida por sesión/CSRF.
- Limitar intentos de login con el rate limiter de ASP.NET Core (10 solicitudes por minuto y cliente, `429` con `Retry-After`); sin bloqueo permanente de cuentas. Detrás del proxy solo confiar en forwarded headers de proxies conocidos. Credenciales inválidas/usuario inactivo comparten mensaje genérico.

## Inicialización y administración

SQL inicial carga tres roles, permisos y sus asociaciones. Un modo de inicialización explícito de la API, separado del arranque normal, crea el administrador a partir de secretos de entorno. Comando objetivo después de implementarlo: `dotnet run --project backend/FluencyAPI -- --bootstrap-admin`; no existe hoy. Requiere esquema preparado; no crea bases ni escucha HTTP.

Variables objetivo: `BootstrapAdmin__Nombre`, `__Apellido`, `__Correo`, `__Username`, `__Password`. No escribir valores en scripts/fixtures de producto. Si no hay usuarios, crea exactamente uno con rol administrador en una transacción. Si ya está inicializado, no crea otro ni cambia contraseñas; si hay usuarios sin administrador, informar que requiere recuperación operativa, sin elevar a nadie automáticamente. Concurrencia del bootstrap: transacción Serializable y unicidad evitan duplicados.

El administrador crea/modifica usuarios, asigna roles y desactiva/reactiva. La baja no exige reasignar cartera. No introducir borrado físico ni un bloqueo por asignaciones existentes. La recuperación del acceso administrativo se atiende como operación del dueño del entorno, no mediante registro público o contraseña maestra.

## Contratos

Rutas API sin `/api`:

| Método y ruta | Entrada / respuesta | Permiso |
|---|---|---|
| `GET /auth/csrf` | `{ requestToken }`, cookie antiforgery; `Cache-Control: no-store`. | Anónimo/autenticado |
| `POST /auth/login` | `{ username, password }`; cookie y `{ usuario, expiresAt }`. | Anónimo, antiforgery |
| `GET /auth/me` | `{ usuario, expiresAt }`; usuario contiene `roles` y `permisos` efectivos. | Autenticado |
| `POST /auth/logout` | Sin payload de identidad; `204`. | Autenticado, antiforgery |
| `GET /roles` | Tres roles preconfigurados y etiquetas. | Administrador |
| `GET /usuarios` | Paginado, `q`, `activo`, `rol`; datos administrativos sin hash. | Administrador |
| `GET /usuarios/opciones` | Paginado `q`, `rol`, activos; solo `id`, nombre/apellido y roles para asignaciones. | Todos |
| `POST /usuarios` | Nombre, apellido, correo, username, password, `roles: string[]`; activo inicial true. | Administrador |
| `GET /usuarios/{id}` / `PATCH /usuarios/{id}` | Perfil; PATCH nombre/apellido/correo/username/roles. | Administrador |
| `PUT /usuarios/{id}/password` | `{ password }`; reemplaza hash, `204`. | Administrador |
| `POST /usuarios/{id}/desactivar` / `reactivar` | Sin reasignar relaciones; `200` usuario. | Administrador |

Eliminar el registro público anterior. DTO `UsuarioResponse`: id, nombre, apellido, correo, username, activo, roles y permisos; nada de hash/huella/secretos. Username/correo duplicados: `409 DUPLICATE_VALUE`.

## Políticas compartidas

- Todos los usuarios activos leen clientes, oportunidades y sus historiales. Todos gestionan empresas/contactos.
- `AdministrarUsuarios` y `AdministrarConfiguracion`: administrador. Los demás solo leen opciones necesarias para operar.
- `GestionarOportunidad`: administrador, responsable comercial o vendedor cuyo ID coincide con responsable actual. Consulta de propiedad y escritura se coordinan en la transacción del módulo.
- `ReabrirOportunidad`: administrador/responsable comercial, nunca vendedor por ser dueño.
- `GestionarActividad`: si está vinculada a una oportunidad, aplicar su dueño/superiores; si solo se vincula a clientes, aplicar gestión compartida de clientes. Al editar asociaciones comprobar origen y destino para impedir eludir el permiso desvinculando una oportunidad ajena.
- Capacidades en DTO son ayudas de UI; el servidor vuelve a validar en cada request.

## Aceptación y pruebas fundamentales

1. Base nueva inicia con roles/permisos y solo un administrador; una segunda inicialización no cambia cuentas ni credenciales.
2. Login correcto crea cookie; incorrecto, expirado, modificado o usuario inactivo no autoriza. No existe alta pública operativa.
3. Requests sin identidad dan `401`; identidad válida sin permiso da `403`; mutación sin token CSRF válido falla sin escritura.
4. Un vendedor consulta una oportunidad ajena pero no la modifica ni falsifica actor por request. Reasignar retira el permiso del vendedor previo en el próximo intento.
5. Cambio de rol/contraseña o desactivación se reflejan en el siguiente request; logout limpia cookie y caché de la UI.

Implementar estos casos en `backend/FluencyAPI.Tests` por HTTP y verificar redirección/errores de la UI con Vitest. Comandos y tiempos: especificación común y CONSTRAINTS. Abusar de un ID ajeno debe ser un test, no solo ocultar botones.

## Pendientes

Antes de publicar, comprobar la topología del Azure existente y la compatibilidad de cookies según la sección 7 del contrato común. Mismo origen `/api` es la opción preferida; servir React desde ASP.NET Core es una alternativa propuesta si no resulta práctico mantener los alojamientos separados. No se ha seleccionado ni autorizado un cambio de hosting. No hay que elegir un proveedor externo de identidad ni diseñar recuperación por correo para esta entrega.
