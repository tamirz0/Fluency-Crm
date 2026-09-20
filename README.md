# Fluency - CRM

Proyecto universitario. Backend ASP.NET Core 10 con PostgreSQL.

## Requisitos

- .NET SDK 10.0 y PostgreSQL local, instalado o en Docker Desktop.
- Visual Studio con soporte para .NET 10 es opcional; también se puede usar la CLI.
- Para crear la base automáticamente, el usuario de PostgreSQL necesita `CREATEDB`. Como alternativa, crear previamente una base **vacía** de la que sea propietario.

Los comandos siguientes se ejecutan desde la raíz del repositorio.

## 1. Preparar PostgreSQL local

Usar una base nueva llamada `FluencyLocalDB_Migrations`. La base anterior `FluencyLocalDB` se conserva y el inicializador rechaza ese nombre.

- **PostgreSQL instalado:** iniciar el servicio; el puerto habitual es `5432`.
- **Contenedor existente del hito 1:** en Docker Desktop, iniciar `fluency-postgres`. Está publicado en `127.0.0.1:5433` y conserva los datos en `fluency-postgres-data`. La nueva base se crea en ese servidor, separada de la anterior. No ejecutar de nuevo el SQL ni eliminar el volumen.

## 2. Configurar credenciales locales

El proyecto ya tiene un `UserSecretsId` estable. No ejecutar `dotnet user-secrets init`; cada integrante configura sus valores, que permanecen fuera del repositorio.

```powershell
dotnet user-secrets set "ConnectionStrings:FluencyLocalDB" "Host=127.0.0.1;Port=5432;Database=FluencyLocalDB_Migrations;Username=postgres;Password=TU_CLAVE_LOCAL" --project backend/FluencyAPI
dotnet user-secrets set "Seed:DemoPassword" "TU_CLAVE_DEMO_LOCAL" --project backend/FluencyAPI
```

Con el contenedor del hito 1, cambiar `Port=5432` por `Port=5433` y usar su contraseña local. Los valores anteriores son marcadores: reemplazarlos por credenciales propias. Si antes se usaba otro identificador de User Secrets, volver a configurar los valores con estos comandos.

También se admiten variables de entorno, que tienen prioridad sobre User Secrets:

```powershell
$env:ConnectionStrings__FluencyLocalDB = "Host=127.0.0.1;Port=5433;Database=FluencyLocalDB_Migrations;Username=postgres;Password=TU_CLAVE_LOCAL"
$env:Seed__DemoPassword = "TU_CLAVE_DEMO_LOCAL"
```

No publicar credenciales ni guardarlas en `appsettings.json`. User Secrets se carga en el entorno `Development`; los perfiles de ejecución del proyecto ya lo seleccionan. Para ejecutar sin perfil, configurar el entorno o usar variables de entorno.

## 3. Inicializar explícitamente

```powershell
dotnet tool restore
dotnet run --project backend/FluencyAPI --launch-profile http -- --initialize-database
```

El comando crea la base si no existe, aplica las migraciones pendientes, carga los datos iniciales y termina sin abrir un servidor HTTP. Un error devuelve código de salida distinto de cero.

Protecciones del comando:

- Solo admite `localhost` o IP de loopback; rechaza conexiones remotas, listas de hosts, bases de sistema y `FluencyLocalDB`.
- Usa el esquema `public`; no admite `Search Path` ni `Options` personalizados.
- Rechaza bases con tablas u otros objetos sin el historial esperado de este proyecto. No convierte automáticamente bases creadas con SQL.
- Exige `Seed:DemoPassword` si falta el usuario `vendedor`, antes de aplicar migraciones.
- Repetirlo no duplica los datos iniciales ni reemplaza valores o contraseñas existentes. Los seeds son transaccionales; si fallan, las migraciones ya aplicadas pueden permanecer y se puede reintentar.

Se cargan 3 orígenes, 3 estados de cliente, 6 niveles, 3 modalidades, 2 servicios, 4 etapas y el usuario activo `vendedor`. Su contraseña se guarda con BCrypt. Los IDs se obtienen de la base, no se presuponen.

## 4. Ejecutar y probar la API

```powershell
dotnet run --project backend/FluencyAPI --launch-profile http
```

Abrir [Scalar](http://localhost:5169/scalar/v1). El documento OpenAPI está en [openapi/v1.json](http://localhost:5169/openapi/v1.json).

Probar `POST /Login/Login` con `username: vendedor` y la contraseña demo configurada. Las rutas y contratos están en [la guía de API](docs/api-frontend.md).

El arranque normal **no ejecuta migraciones ni seeds**. La conexión sigue siendo configurable y las operaciones de la API actúan sobre la base indicada. El login aún no crea sesión ni aplica autorización.

En Visual Studio, abrir `backend/FluencyAPI.slnx`, seleccionar `FluencyAPI` como proyecto de inicio y usar `http` o `https`. El perfil HTTPS escucha en `https://localhost:7028` y requiere el certificado local de desarrollo.

## Compilación y pruebas

```powershell
dotnet build backend/FluencyAPI.slnx
$env:FLUENCY_TEST_CONNECTION = "Host=127.0.0.1;Port=5433;Username=postgres;Password=TU_CLAVE_LOCAL"
dotnet test backend/FluencyAPI.slnx
```

Las pruebas de integración requieren PostgreSQL real y un usuario local con permiso `CREATEDB`. Crean bases con nombres aleatorios `fluency_bootstrap_test_*` y eliminan exclusivamente esas bases al finalizar. No usan la base de la aplicación. Si falta la configuración, fallan con un mensaje explícito.

## Migraciones y SQL legado

El esquema de las bases nuevas se versiona en `backend/Persistence/Migrations`. El comando local de `dotnet-ef` está fijado a la versión de EF Core del proyecto. Para generar una futura migración, configurar primero la conexión local y ejecutar:

```powershell
dotnet ef migrations add NombreDelCambio --project backend/Persistence --startup-project backend/FluencyAPI
```

Revisar el código generado antes de aplicar cambios. Para inicializar o actualizar localmente, utilizar `--initialize-database`; ejecutar `dotnet ef database update` directamente no pasa por las protecciones de ese comando ni carga sus seeds.

[creacion-tablas.sql](backend/Persistence/SQL/creacion-tablas.sql) queda como referencia **legada**. No ejecutarlo sobre las bases nuevas: incluye inserts no repetibles y una contraseña demo que no es un hash BCrypt válido.

La migración inicial conserva el modelo EF actual, no redefine el dominio. Frente al SQL legado, EF usa columnas identity, índices de claves foráneas y borrado en cascada en las cuatro relaciones de las tablas de unión de roles/permisos. Estas diferencias deben revisarse antes de adoptar migraciones sobre una base antigua.

**Supabase queda fuera de esta inicialización.** No ejecutar allí la migración inicial: ya tiene tablas. Su incorporación se planificará por separado, preservando datos y revisando el esquema existente. El comando solo comprueba que el destino sea local; no usar túneles o proxies locales hacia servidores remotos.
