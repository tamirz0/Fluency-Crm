# Guía de la API para el equipo de frontend

> Referencia de todos los endpoints implementados hasta el momento: qué mandar en el cuerpo de cada request,
> qué devuelve cada uno y qué códigos de estado esperar. Los ejemplos de JSON usan `camelCase`, que es como
> ASP.NET Core serializa los DTOs por defecto (aunque en el código C# las propiedades estén en PascalCase).

## Notas generales

- Ningún endpoint requiere autenticación todavía: no hay token de sesión ni JWT. `POST /Login/Login`
  simplemente valida usuario/contraseña y devuelve los datos del usuario; no hay que mandar ningún header de
  autorización en el resto de los endpoints.
- Todos los endpoints que reciben body esperan `Content-Type: application/json`.
- Los campos marcados como "opcional" pueden omitirse del JSON o mandarse como `null`.
- En los endpoints de "Modificar" (actualización parcial), **solo los campos enviados con un valor no nulo
  se actualizan**; si un campo se omite o se manda `null`, conserva su valor actual en la base de datos.
- Los ids (`idEmpresa`, `idContacto`, `idUsuario`, etc.) son siempre `number` (enteros).
- **Todas las respuestas que incluyen un id de otra tabla también incluyen, al lado, el dato legible de esa
  tabla** — por ejemplo `idEstado: 1` viene acompañado de `estadoDescripcion: "Potencial"`, `idEmpresa: 3` de
  `empresaRazonSocial: "Acme S.A."`, etc. Así el frontend no necesita otra consulta solo para mostrar un
  nombre. Si el id es `null` (el campo es opcional y no se cargó), su campo `*Descripcion`/`*Nombre`/
  `*Apellido`/`*RazonSocial` acompañante también viene `null`.

---

## Login

### `POST /Login/Register`

Registra un nuevo usuario, hasheando la contraseña antes de guardarla.

**Body:**

| Campo | Tipo | Obligatorio | Validaciones |
|---|---|---|---|
| `nombre` | string | sí | máx. 100 caracteres |
| `apellido` | string | sí | máx. 100 caracteres |
| `correo` | string | sí | máx. 150 caracteres, formato de email |
| `username` | string | sí | máx. 50 caracteres, debe ser único |
| `password` | string | sí | mínimo 6 caracteres |

```json
{
  "nombre": "Ana",
  "apellido": "Gomez",
  "correo": "ana.gomez@example.com",
  "username": "ana.gomez",
  "password": "supersecreta"
}
```

**Respuesta `201 Created`:**

```json
{
  "id": 5,
  "nombre": "Ana",
  "apellido": "Gomez",
  "correo": "ana.gomez@example.com",
  "username": "ana.gomez",
  "activo": true
}
```

**`409 Conflict`**: ya existe un usuario con ese `username` (el body de la respuesta es un texto plano con el
mensaje, no JSON).

### `POST /Login/Login`

**Body:**

| Campo | Tipo | Obligatorio |
|---|---|---|
| `username` | string | sí |
| `password` | string | sí |

```json
{ "username": "ana.gomez", "password": "supersecreta" }
```

**Respuesta `200 OK`**: mismo formato que el de `Register` (nunca incluye la contraseña ni su hash).

**`401 Unauthorized`**: usuario inexistente o contraseña incorrecta (mismo mensaje para ambos casos, por
seguridad). Body en texto plano.

---

## Empresa

### `POST /Empresa/AltaEmpresa`

| Campo | Tipo | Obligatorio | Validaciones |
|---|---|---|---|
| `razonSocial` | string | sí | máx. 150 caracteres |
| `cuit` | string | no | máx. 20 caracteres |
| `industria` | string | no | máx. 100 caracteres |
| `correo` | string | no | máx. 150 caracteres, formato de email |
| `telefono` | string | no | máx. 50 caracteres |
| `direccion` | string | no | — |
| `idEstado` | number | no | id de un `Estado_Cliente` existente |
| `idOrigen` | number | no | id de un `Origen_Comercial` existente |
| `observaciones` | string | no | — |

**Respuesta `201 Created`** (mismo shape para todos los endpoints de empresa):

```json
{
  "id": 1,
  "razonSocial": "Acme S.A.",
  "cuit": "30-12345678-9",
  "industria": null,
  "correo": "contacto@acme.com",
  "telefono": null,
  "direccion": null,
  "idEstado": 2,
  "estadoDescripcion": "Cliente",
  "idOrigen": 1,
  "origenDescripcion": "Sitio Web",
  "observaciones": null
}
```

### `GET /Empresa/DatosEmpresa/{idEmpresa}`

Devuelve una empresa por id. `200 OK` con el mismo shape de arriba, o `404 Not Found` (texto plano) si no
existe.

### `GET /Empresa/ListadoEmpresas`

Devuelve **todas** las empresas, ordenadas por `razonSocial`. `200 OK` con un array del mismo shape (array
vacío `[]` si no hay ninguna).

### `POST /Empresa/ModificarEmpresa/{idEmpresa}`

Actualización parcial — mandá solo los campos que querés cambiar. Mismos campos y validaciones que
`AltaEmpresa`, todos opcionales.

```json
{ "telefono": "1144445555", "industria": "Software" }
```

**`200 OK`** con la empresa ya actualizada (shape completo). **`404 Not Found`** si no existe la empresa.

---

## Contacto

### `POST /Contacto/AltaContacto`

| Campo | Tipo | Obligatorio | Validaciones |
|---|---|---|---|
| `nombre` | string | sí | máx. 100 caracteres |
| `apellido` | string | sí | máx. 100 caracteres |
| `correo` | string | sí | máx. 150 caracteres, formato de email |
| `documento` | string | no | máx. 20 caracteres |
| `cargo` | string | no | máx. 100 caracteres |
| `telefono` | string | no | máx. 50 caracteres |
| `idEstado` | number | no | id de un `Estado_Cliente` existente |
| `idOrigen` | number | no | id de un `Origen_Comercial` existente |
| `idEmpresa` | number | no | id de una `Empresa` existente — así se relaciona el contacto con una empresa |
| `observaciones` | string | no | — |

**Respuesta `201 Created`** (mismo shape para todos los endpoints de contacto):

```json
{
  "id": 1,
  "nombre": "Ana",
  "apellido": "Gomez",
  "documento": null,
  "cargo": null,
  "correo": "ana.gomez@example.com",
  "telefono": "1122334455",
  "idEstado": null,
  "estadoDescripcion": null,
  "idOrigen": null,
  "origenDescripcion": null,
  "idEmpresa": 1,
  "empresaRazonSocial": "Acme S.A.",
  "observaciones": null
}
```

### `GET /Contacto/DatosContacto/{idContacto}`

`200 OK` con el shape de arriba, o `404 Not Found` (texto plano).

### `GET /Contacto/ListadoContactos`

Devuelve **todos** los contactos, ordenados por `apellido` y luego `nombre`. `200 OK` con un array del mismo
shape.

### `POST /Contacto/ModificarContacto/{idContacto}`

Actualización parcial, mismos campos que `AltaContacto`, todos opcionales.

```json
{ "telefono": "1155667788" }
```

**`200 OK`** con el contacto actualizado. **`404 Not Found`** si no existe.

### `GET /Contacto/HistorialEtapas/{idContacto}`

Devuelve el historial de cambios de etapa de todas las oportunidades del contacto (ordenado del más reciente
al más antiguo).

**`200 OK`:**

```json
[
  {
    "id": 3,
    "idOportunidad": 1,
    "oportunidadTitulo": "Curso B1 para Acme S.A.",
    "idEtapaAnterior": 1,
    "etapaAnteriorNombre": "Consulta Recibida",
    "idNuevaEtapa": 2,
    "etapaNuevaNombre": "Examen de Nivelación",
    "fecha": "2025-09-17T20:49:32",
    "idUsuario": 2,
    "usuarioNombre": "Vendedor",
    "usuarioApellido": "Demo",
    "observacion": "Aprobó examen"
  }
]
```

**`404 Not Found`** si el contacto no existe.

---

## Oportunidades

### `POST /Oportunidades/AltaOportunidad`

| Campo | Tipo | Obligatorio | Validaciones |
|---|---|---|---|
| `titulo` | string | sí | máx. 150 caracteres |
| `idUsuario` | number | sí | debe existir (responsable de la oportunidad) |
| `idEtapa` | number | sí | debe existir (`Etapa_Comercial`) |
| `idEmpresa` | number | no* | debe existir si se manda |
| `idContacto` | number | no* | debe existir si se manda |
| `idServicio` | number | no | debe existir si se manda |
| `fechaEstimadaCierre` | string (fecha `YYYY-MM-DD`) | no | — |
| `idOrigen` | number | no | debe existir si se manda |
| `idEstado` | number | no | debe existir si se manda |
| `observaciones` | string | no | — |

\* **Regla de negocio: hay que mandar `idEmpresa` y/o `idContacto` — al menos uno de los dos es
obligatorio**, aunque cada uno individualmente sea opcional.

```json
{
  "titulo": "Curso B1 para Acme S.A.",
  "idUsuario": 1,
  "idEtapa": 1,
  "idEmpresa": 1,
  "idServicio": 1,
  "idOrigen": 1
}
```

**Respuesta `201 Created`** (mismo shape para alta, detalle y modificación):

```json
{
  "id": 1,
  "titulo": "Curso B1 para Acme S.A.",
  "idUsuario": 1,
  "usuarioNombre": "Vendedor",
  "usuarioApellido": "Demo",
  "idEmpresa": 1,
  "empresaRazonSocial": "Acme S.A.",
  "idContacto": null,
  "contactoNombre": null,
  "contactoApellido": null,
  "idServicio": 1,
  "servicioNombre": "Inglés General B1",
  "idEtapa": 1,
  "etapaNombre": "Consulta Recibida",
  "fechaEstimadaCierre": null,
  "fechaCierre": null,
  "idOrigen": 1,
  "origenDescripcion": "Sitio Web",
  "idEstado": null,
  "estadoDescripcion": null,
  "observaciones": null
}
```

**`400 Bad Request`** si falla alguna validación — el body trae la lista de errores:

```json
{ "errors": ["No existe el usuario 99.", "La oportunidad debe estar asociada a una empresa o a un contacto."] }
```

### `GET /Oportunidades/DatosOportunidad/{idOportunidad}`

Devuelve una oportunidad por id. `200 OK` con el shape de arriba, o `404 Not Found` (texto plano).

### `GET /Oportunidades/OportunidadesPorEtapa`

La vista de embudo comercial: todas las oportunidades agrupadas por etapa, ordenadas por el `orden` de cada
etapa.

**`200 OK`:**

```json
[
  {
    "idEtapa": 1,
    "nombre": "Consulta Recibida",
    "orden": 1,
    "oportunidades": [
      {
        "id": 1,
        "titulo": "Curso B1 para Acme S.A.",
        "idEmpresa": 1,
        "empresaRazonSocial": "Acme S.A.",
        "idContacto": null,
        "contactoNombre": null,
        "contactoApellido": null,
        "idUsuario": 1,
        "usuarioNombre": "Vendedor",
        "usuarioApellido": "Demo",
        "fechaEstimadaCierre": null
      }
    ]
  }
]
```

Nota: esta es también la manera de obtener el "listado" general de oportunidades — no hay un endpoint
separado de listado plano, porque agrupado por etapa ya cubre ese caso de uso.

### `POST /Oportunidades/ModificarOportunidad/{idOportunidad}`

Actualización parcial de una oportunidad — **no** cambia la etapa comercial (para eso está el endpoint de
abajo). Mismos campos que `AltaOportunidad` salvo `idEtapa`, todos opcionales, con las mismas validaciones de
existencia si se envían.

```json
{ "observaciones": "Cliente pidió una cotización actualizada" }
```

**`200 OK`** con la oportunidad actualizada. **`404 Not Found`** si no existe. **`400 Bad Request`** con
`{ "errors": [...] }` si algún id referenciado no existe.

### `POST /Oportunidades/UpdateEtapaOportunidad/{idOportunidad}`

Mueve la oportunidad a una nueva etapa comercial y deja el cambio asentado en el historial
(`Contacto/HistorialEtapas`).

| Campo | Tipo | Obligatorio |
|---|---|---|
| `idNuevaEtapa` | number | sí — debe existir |
| `idUsuario` | number | no — se guarda en el historial para saber quién hizo el cambio |
| `observacion` | string | no |

```json
{ "idNuevaEtapa": 2, "idUsuario": 1, "observacion": "Aprobó el examen de nivelación" }
```

**`200 OK`** con la oportunidad ya actualizada (mismo shape que el detalle). **`404 Not Found`** si no existe
la oportunidad. **`400 Bad Request`** (texto plano) si `idNuevaEtapa` no existe.
