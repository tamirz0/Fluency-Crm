# Fluency - CRM

Proyecto universitario compuesto por una API en ASP.NET Core y una aplicación web en React + Vite.

## Requisitos

- Git.
- Node.js 20 o superior y npm.
- .NET SDK 10.0.
- PostgreSQL instalado y en ejecución.
- Visual Studio 2026 con la carga de trabajo **ASP.NET y desarrollo web** (opcional, si no se usa la CLI de .NET).

## Ejecutar el proyecto completo en local

### 1. Clonar el repositorio

```powershell
git clone https://github.com/tamirz0/Fluency-Crm.git
cd Fluency-Crm
```

### 2. Preparar PostgreSQL

Inicia el servicio de PostgreSQL y crea una base de datos llamada `FluencyLocalDB`. Luego ejecuta una vez el script [`backend/Persistence/SQL/creacion-tablas.sql`](backend/Persistence/SQL/creacion-tablas.sql) sobre esa base usando pgAdmin o `psql`. El script crea las tablas e inserta los datos iniciales.

### 3. Agregar las credenciales del backend

La API lee la conexión desde `ConnectionStrings:FluencyLocalDB`. Configúrala con **User Secrets** para no guardar credenciales en `appsettings.json` ni subirlas al repositorio:

```powershell
cd backend/FluencyAPI
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:FluencyLocalDB" "Host=localhost;Port=5432;Database=FluencyLocalDB;Username=postgres;Password=TU_CLAVE_LOCAL"
```

Reemplaza `Username` y `Password` con los datos de tu instalación de PostgreSQL. Cada integrante debe configurar sus propios User Secrets en su máquina.

> Si usas otra instancia o una base remota, ajusta `Host`, `Port`, `Database`, `Username` y `Password` en el comando anterior. No agregues la cadena con credenciales al repositorio.

### 4. Instalar las dependencias del frontend

Desde la raíz del repositorio:

```powershell
cd frontend
npm install
```

### 5. Ejecutar el backend

Abre una terminal en `backend/FluencyAPI` y ejecuta:

```powershell
dotnet run
```

También puedes abrir `backend/FluencyAPI.slnx` en Visual Studio, seleccionar `FluencyAPI` como proyecto de inicio y ejecutar el perfil `https` o `http`.

Con los perfiles actuales, la API queda disponible en:

- `https://localhost:7028`
- `http://localhost:5169`
- Documentación Scalar: `https://localhost:7028/scalar/v1` o `http://localhost:5169/scalar/v1`

### 6. Ejecutar el frontend

En otra terminal, desde `frontend`:

```powershell
npm run dev
```

Vite mostrará la URL local, normalmente `http://localhost:5173`. Mantén el backend ejecutándose al mismo tiempo: el frontend usa `/api` y Vite lo redirige mediante proxy a `http://localhost:5169`.

Para regenerar los tipos TypeScript desde el OpenAPI del backend:

```powershell
npm run api:types
```

Este comando requiere que la API esté ejecutándose en `http://localhost:5169`.

## Tests, lint y builds

### Frontend

Ejecuta estos comandos desde `frontend`:

```powershell
# Tests en modo interactivo
npm test

# Tests de una sola ejecución (CI)
npm run test:run

# Linter
npm run lint

# Build de producción (TypeScript + Vite)
npm run build

# Previsualizar el build generado
npm run preview
```

El build se genera en `frontend/dist`.

### Backend

Desde la raíz del repositorio:

```powershell
dotnet restore backend/FluencyAPI.slnx
dotnet build backend/FluencyAPI.slnx
```

Actualmente no hay un proyecto de tests automatizados .NET en el repositorio. Los tests disponibles están en `frontend/src` y se ejecutan con los comandos indicados arriba.

## Estructura principal

- `backend/FluencyAPI`: API ASP.NET Core, controladores y configuración de ejecución.
- `backend/Persistence`: modelos, `DbContext` y script SQL inicial.
- `backend/Services`: contratos y servicios de negocio.
- `frontend`: aplicación React, configuración de Vite, tests y build.
