# Fluency - CRM
Proyecto universitario.

## Ejecutar el backend en local

### Requisitos

- .NET SDK 10.0.
- Visual Studio 2026 con la carga de trabajo **ASP.NET y desarrollo web**, o la CLI de .NET.
- PostgreSQL instalado y en ejecución.

### 1. Iniciar PostgreSQL y preparar la base

Inicia el servicio de PostgreSQL (en Windows, desde **Servicios** o el instalador de PostgreSQL) y conéctate con pgAdmin o `psql`. Crea una base llamada `FluencyLocalDB` y ejecuta una vez el script [`backend/Persistence/SQL/creacion-tablas.sql`](backend/Persistence/SQL/creacion-tablas.sql) sobre esa base. El script crea las tablas e inserta datos iniciales.

### 2. Configurar la conexión local

La API obtiene la conexión de `ConnectionStrings:FluencyLocalDB`. Guarda las credenciales localmente con **User Secrets** (no las agregues a `appsettings.json` ni las subas al repositorio). Desde una terminal, ejecuta:

```powershell
cd backend/FluencyAPI
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:FluencyLocalDB" "Host=localhost;Port=5432;Database=FluencyLocalDB;Username=postgres;Password=TU_CLAVE_LOCAL"
```
> Para usar la cadena de conexión de la DB en supabase ver nuestro Discord. NO agregar al repo.

Reemplaza `Username` y `Password` por el usuario y la contraseña de tu instalación de PostgreSQL. User Secrets es local a cada máquina; cada integrante configura sus propios valores.

### 3. Ejecutar la API

**Desde Visual Studio:** abre `backend/FluencyAPI.slnx`, configura `FluencyAPI` como proyecto de inicio y ejecuta el perfil `https` o `http`.

**Desde la terminal:** estando en `backend/FluencyAPI`, ejecuta:

```powershell
dotnet run
```

En el perfil `https`, la API escucha en `https://localhost:7028` y `http://localhost:5169`. En desarrollo se abre Scalar en [`https://localhost:7028/scalar/v1`](https://localhost:7028/scalar/v1) (o `http://localhost:5169/scalar/v1` con el perfil HTTP).
