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
- En los endpoints **POST** de "Modificar" (actualización parcial), **solo los campos enviados con un valor no nulo
  se actualizan**; si un campo se omite o se manda `null`, conserva su valor actual en la base de datos.
- En **PATCH de Empresa, Contacto y Oportunidad**, un campo omitido conserva su valor y un `null`
  explícito borra un campo opcional, sujeto a las reglas de negocio detalladas abajo. Los POST de
  actualización siguen disponibles para comparar compatibilidad. Todavía no hay PUT.
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

**`400 Bad Request`** si `idEstado` o `idOrigen` no existe. Devuelve
`{ "errors": ["No existe el estado -1."] }` y no crea la empresa.

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
**`400 Bad Request`** con `{ "errors": [...] }` si `idEstado` o `idOrigen` no existe.
Se validan todas las referencias enviadas antes de modificar campos: un rechazo conserva la empresa completa.

---

## PATCH de Empresa (incremento de actualización parcial)

### `PATCH /Empresa/ModificarEmpresa/{idEmpresa}`

Recibe un objeto JSON con **solo los campos a modificar**, usando `Content-Type: application/json`.
No utiliza una lista de operaciones JSON Patch. La ruta coincide con el POST, pero cambia el verbo y
la interpretación de `null`. El POST conserva íntegramente su comportamiento anterior.

| Campo | Valor admitido cuando se envía | ¿Se borra con `null`? |
|---|---|---|
| `razonSocial` | string no vacío ni solo espacios, máximo 150 | No; devuelve 400 |
| `cuit` | string, máximo 20 | Sí |
| `industria` | string, máximo 100 | Sí |
| `correo` | string con formato de email, máximo 150 | Sí |
| `telefono` | string, máximo 50 | Sí |
| `direccion` | string | Sí |
| `idEstado` | ID de estado cliente existente | Sí, desvincula |
| `idOrigen` | ID de origen comercial existente | Sí, desvincula |
| `observaciones` | string | Sí |

Todos pueden omitirse: lo omitido se conserva. `{}` devuelve la empresa sin cambios.
Los campos ajenos a esta lista (incluido `id`) se rechazan con 400. Enviar `null` como cuerpo completo,
un array o tipos incompatibles también devuelve 400. No se normalizan textos ni se usan strings vacíos
como señal de borrado: para borrar un opcional se envía `null` explícito.

```json
{
  "telefono": "1144445555",
  "correo": null,
  "idOrigen": null
}
```

Este ejemplo reemplaza el teléfono, borra el correo y desvincula el origen; conserva todos los demás
campos. La respuesta **`200 OK`** es la empresa completa, con el mismo formato de `DatosEmpresa`.
**`404 Not Found`** (texto plano) si no existe la empresa y el cuerpo es válido.

**`400 Bad Request`** por referencias inexistentes devuelve `{ "errors": ["No existe el estado -1."] }`.
Errores de formato, campos desconocidos, longitudes, email o razón social devuelven el
`ValidationProblemDetails` habitual de ASP.NET, con `errors` como diccionario por campo.
Las validaciones se realizan antes de guardar y un rechazo no aplica cambios parciales.

OpenAPI incluye la operación `PatchEmpresa` y el esquema `PatchEmpresaRequest`, separado del POST.
La razón social se representa como propiedad opcional y su restricción condicional de no aceptar null
está documentada y validada por el servidor.

**Verificación local:** compilación sin errores ni advertencias; 38 solicitudes de prueba contra
`fluency-postgres`, con empresa identificada por `qa-patch-0960462337` (ID 7). Se comprobaron omisión,
borrado de los ocho opcionales, actualización combinada, `{}`, errores 400/404, ausencia de cambios
parciales mediante GET y compatibilidad del POST. Se conservaron los datos de prueba y no se ejecutaron
pruebas remotas. La verificación posterior de Contacto y Oportunidad se registra al final de esta guía;
PUT sigue pendiente.

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

**`400 Bad Request`** si `idEstado`, `idOrigen` o `idEmpresa` no existe. Devuelve
`{ "errors": ["No existe la empresa -1."] }` y no crea el contacto.

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
**`400 Bad Request`** con `{ "errors": [...] }` si `idEstado`, `idOrigen` o `idEmpresa` no existe.
Se validan todas las referencias enviadas antes de modificar campos: un rechazo conserva el contacto completo.

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

## Catálogos de lectura

Estos endpoints no reciben body ni parámetros y no requieren autenticación. Devuelven **`200 OK`**
con todos los registros del catálogo, o `[]` si está vacío. No hay filtro de actividad: estas entidades
no tienen ese campo. Los IDs se consultan en cada destino; no deben fijarse en el frontend.

| Endpoint | Campos de cada elemento | Orden |
|---|---|---|
| `GET /EstadosCliente/ListadoEstadosCliente` | `id` (entero), `descripcion` (string) | Descripción e ID |
| `GET /OrigenesComerciales/ListadoOrigenesComerciales` | `id` (entero), `descripcion` (string) | Descripción e ID |
| `GET /EtapasComerciales/ListadoEtapasComerciales` | `id` (entero), `nombre` (string), `descripcion` (string o null), `orden` (entero) | Orden e ID |

Ejemplos ilustrativos para estado, origen y etapa, respectivamente:

```json
[{ "id": 1, "descripcion": "Potencial" }]
```

```json
[{ "id": 1, "descripcion": "Sitio Web" }]
```

```json
[{ "id": 1, "nombre": "Consulta Recibida", "descripcion": null, "orden": 1 }]
```

Usar estados y orígenes en los selectores de empresas, contactos y oportunidades. Para seleccionar
una etapa, usar el nuevo catálogo: incluye etapas sin oportunidades y nunca incluye las oportunidades
como parte de la respuesta. El endpoint del embudo sigue disponible con su contrato actual.
No se incorporan altas, modificaciones ni bajas de catálogos.

Los esquemas OpenAPI son `EstadoClienteResponse`, `OrigenComercialResponse` y `EtapaComercialResponse`.
Las operaciones se llaman como el último segmento de cada ruta. Hay ejemplos ejecutables en
[`FluencyAPI.http`](../backend/FluencyAPI/FluencyAPI.http).

**Verificación local:** los tres GET devolvieron 200 contra `fluency-postgres`: 3 estados, 3 orígenes
y 4 etapas. Se contrastaron campos, valores, cantidad y orden con SQL de solo lectura. Las 4 etapas
incluyeron las 2 sin oportunidades; la respuesta no contiene colecciones de oportunidades. Se verificaron
los tres contratos en OpenAPI y la nulabilidad de la descripción de etapa. No había catálogos vacíos
ni etapas con descripción nula: esos casos quedan pendientes de prueba con datos adecuados, sin alterar
registros existentes. No se repitieron pruebas remotas.

---

## Servicios

### `GET /Servicios/ListadoServicios`

Devuelve los servicios activos disponibles para seleccionar al crear o modificar una oportunidad.
No recibe body ni parámetros y no requiere autenticación.

**Respuesta `200 OK`**: array ordenado por `nombre` y luego por `id`. Solo incluye registros cuyo
`activo` sea `true`; excluye `false` y `null`. Si no hay servicios activos, devuelve `[]`.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | number (entero) | Identificador que se envía como `idServicio` en la oportunidad |
| `nombre` | string | Nombre para mostrar en el selector |
| `descripcion` | string o null | Descripción opcional del servicio |
| `precioReferencia` | number | Precio de referencia del catálogo |

Ejemplo ilustrativo (los IDs y valores dependen de la base conectada):

```json
[
  {
    "id": 1,
    "nombre": "Inglés General B1",
    "descripcion": null,
    "precioReferencia": 50000
  }
]
```

Para el frontend de la primera entrega, cargar este listado y enviar el `id` seleccionado como
`idServicio` en `AltaOportunidad` o `ModificarOportunidad`. No asumir IDs iguales entre local y
Supabase. Si el listado está vacío, informar que no hay servicios disponibles. Un error de conexión
o una respuesta fallida debe mostrarse como error, no como catálogo vacío.

Este endpoint no modifica el contrato de oportunidades: `idServicio` sigue siendo opcional en la API
y su validación actual comprueba existencia, no actividad. En una modificación, omitirlo o enviar
`null` conserva el servicio anterior. Un servicio previamente asociado que deje de estar activo no
aparece en este selector; el detalle de la oportunidad sigue proporcionando `idServicio` y
`servicioNombre` para mostrar el valor guardado.

Contrato OpenAPI: operación `ListadoServicios`, respuesta `ServicioResponse[]`, disponible en
`/openapi/v1.json` en desarrollo. Hay una petición de ejemplo en
[`FluencyAPI.http`](../backend/FluencyAPI/FluencyAPI.http).

**Verificación local — 20/09/2026:** API ejecutada contra el contenedor existente `fluency-postgres`
en `127.0.0.1:5433`, con credenciales únicamente en el entorno del proceso. La llamada devolvió
`200 OK`, `application/json` y dos servicios. Se comparó la respuesta completa con una consulta SQL
de solo lectura (`activo IS TRUE`, orden por `nombre, id`): coincidieron campos, valores y orden.
También se verificó la operación en OpenAPI. No se modificaron datos ni esquema.

La base contenía dos servicios activos, ninguno inactivo y ninguno con actividad nula: la exclusión
de esos casos y la respuesta vacía quedan pendientes de prueba con datos adecuados; el filtro está
implementado en la consulta. Esta verificación no cubre Supabase ni cierra el hito 1 completo.

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

Si se envían empresa y contacto, el contacto debe pertenecer a esa empresa (`Contacto.idEmpresa`
debe coincidir con `idEmpresa`). Un contacto sin empresa tampoco es válido para una oportunidad con
empresa. Sin empresa, puede seleccionarse cualquier contacto existente; también se permite una
oportunidad con empresa y sin contacto.

Si la combinación es inválida, devuelve **`400 Bad Request`**, sin guardar la oportunidad:

```json
{ "errors": ["El contacto seleccionado no pertenece a la empresa de la oportunidad."] }
```

Para el selector del frontend, usar `GET /Contacto/ListadoContactos` y filtrar por `idEmpresa` cuando
haya empresa seleccionada. Sin empresa, mostrar todos los contactos. La API valida la relación aunque
el cliente no aplique el filtro.

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

La relación empresa/contacto se valida sobre los valores finales: los enviados más los conservados.
Cambiar solo la empresa o solo el contacto devuelve **400** si la combinación resultante es inválida,
sin guardar ningún campo del request. Puede enviarse una nueva empresa y su contacto en la misma
petición. Enviar `null` no desvincula ninguno de los dos: conserva su valor anterior.
Una oportunidad previamente inconsistente debe corregirse con una pareja válida para poder modificarla.

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
| `idUsuario` | number | no — debe existir si se envía; se guarda en el historial para saber quién hizo el cambio |
| `observacion` | string | no |

```json
{ "idNuevaEtapa": 2, "idUsuario": 1, "observacion": "Aprobó el examen de nivelación" }
```

**`200 OK`** con la oportunidad ya actualizada (mismo shape que el detalle). **`404 Not Found`** si no existe
la oportunidad. **`400 Bad Request`** (texto plano) si `idNuevaEtapa` o el `idUsuario` enviado no existe.
Se conserva el formato de error de esta ruta: por ejemplo, `No existe el usuario -1.`.
La validación ocurre antes de cambiar la etapa o agregar historial; un rechazo no guarda ninguno de esos cambios.
Omitir `idUsuario` o enviarlo como `null` sigue permitido.

## Verificación local de referencias — 20/09/2026

Contra `fluency-postgres`, se ejecutaron 30 solicitudes POST con estados esperados y consultas GET
de comprobación: registro/login válido e inválido, altas válidas y rechazadas de empresas/contactos,
modificaciones rechazadas por cada referencia inexistente, recursos inexistentes (404), actualizaciones
válidas y conservación de valores enviados como `null`. En oportunidades se probó servicio inexistente
en el alta, referencias inválidas en la modificación y cambios de etapa con usuario/etapa inválidos,
usuario válido y usuario omitido/nulo.

Se compararon los recursos antes y después de los rechazos y el historial de cambios de etapa:
no hubo altas ni modificaciones parciales en los casos ejecutados. Una lectura SQL confirmó la empresa,
el contacto relacionado, la oportunidad y los dos registros de historial de cambios válidos.
Los errores 400 de las cinco operaciones modificadas figuran en OpenAPI.

Los registros nuevos de prueba se identifican con el prefijo `qa-ref-`; se conservaron sin borrar datos
existentes. No se modificó el esquema. Estas pruebas no cubren eliminaciones concurrentes de referencias,
reinicios, interfaz ni Supabase; no constituyen el cierre integral del hito 1.

### Relación empresa/contacto de oportunidades

Se verificaron 23 solicitudes POST y consultas GET contra PostgreSQL local, usando nuevos registros
`qa-rel-*`: preparación de empresas/contactos/usuario, alta con pareja válida, rechazo de contacto de
otra empresa y contacto sin empresa, alta solo con empresa o solo con contacto, modificaciones parciales
incompatibles, cambio conjunto válido y conservación de valores nulos. Los rechazos no crearon
oportunidades ni modificaron los datos existentes de los registros de prueba. Compilación sin errores
ni advertencias. Esta nueva regla no fue probada por el agente contra Supabase.

La validación de pareja se aplica al crear o modificar oportunidades y no repara registros históricos.
La edición de contactos incorpora ahora el bloqueo descrito en la siguiente sección.

## PATCH de Contacto y Oportunidad

### Contrato común

- `PATCH /Contacto/ModificarContacto/{idContacto}` — operación OpenAPI `PatchContacto`, DTO `PatchContactoRequest`.
- `PATCH /Oportunidades/ModificarOportunidad/{idOportunidad}` — operación `PatchOportunidad`, DTO `PatchOportunidadRequest`.

Enviar `Content-Type: application/json` con un objeto que contenga únicamente los campos a modificar.
No es una lista de operaciones JSON Patch. Campo omitido conserva, `null` explícito borra si está
permitido. `{}` conserva el recurso si su estado cumple las reglas. La respuesta **200** contiene el
detalle completo actualizado. **404** indica recurso inexistente con cuerpo válido.

Los errores de negocio y referencias devuelven **400** con `{ "errors": ["mensaje"] }`.
Los errores de formato, campos desconocidos o validación de propiedades devuelven **400** con
`ValidationProblemDetails` y `errors` como diccionario. Un rechazo no guarda ningún cambio del request.
No se permite modificar `id` ni campos que no figuren en los contratos siguientes.

### Contacto

| Campo | Restricción cuando se envía | ¿Admite null? |
|---|---|---|
| `nombre`, `apellido` | No vacíos ni solo espacios; máximo 100 caracteres | No |
| `correo` | Email válido, no vacío; máximo 150 | No |
| `documento` | Máximo 20 | Sí |
| `cargo` | Máximo 100 | Sí |
| `telefono` | Máximo 50 | Sí |
| `idEstado`, `idOrigen` | Referencia existente si no es null | Sí |
| `idEmpresa` | Empresa existente y regla de asociación indicada abajo | Condicional |
| `observaciones` | Texto | Sí |

**La empresa de un contacto no puede cambiar mientras tenga cualquier oportunidad asociada**, incluso
si esa oportunidad no tiene empresa. Se rechazan reemplazar la empresa, borrarla y asignar una empresa
a un contacto que antes no tenía una. Reenviar la misma empresa, omitirla o modificar otros campos
está permitido. Sin oportunidades asociadas, puede asignarse, reemplazarse o borrarse mediante PATCH.
No se propagan cambios automáticamente a oportunidades.

Mensaje de rechazo:

```json
{ "errors": ["No se puede cambiar la empresa de un contacto que tiene oportunidades asociadas."] }
```

El POST de Contacto que se conserva en esta rama ya incluye ese bloqueo; mantiene su semántica histórica
de `null` como conservar. No se volvió a modificar ese método durante el cierre de este incremento.

### Oportunidad

| Campo | Restricción cuando se envía | ¿Admite null? |
|---|---|---|
| `titulo` | No vacío ni solo espacios; máximo 150 | No |
| `idUsuario` | Responsable existente | No |
| `idEmpresa`, `idContacto` | Referencias existentes y combinación final válida | Condicional |
| `idServicio`, `idOrigen`, `idEstado` | Referencias existentes | Sí |
| `fechaEstimadaCierre` | Fecha `YYYY-MM-DD` | Sí |
| `observaciones` | Texto | Sí |

Una oportunidad conserva **0..1 empresa y 0..1 contacto, con al menos uno de los dos**:

- Solo empresa: válido.
- Solo contacto: válido, independientemente de la empresa del contacto.
- Empresa y contacto: válido únicamente si `contacto.idEmpresa` coincide con la empresa seleccionada.
- Ninguno: inválido.

Estas reglas se comprueban sobre el estado final, combinando valores enviados, omitidos y borrados.
Puede cambiarse la pareja en una única petición o borrar una asociación si permanece la otra.
Si ambos quedan presentes y son incompatibles, no se guarda ningún campo.

```json
{ "idEmpresa": null, "observaciones": "Se continúa con el contacto" }
```

Ese ejemplo solo es válido si la oportunidad conserva un contacto. `idEtapa` no pertenece a este PATCH:
se cambia mediante `UpdateEtapaOportunidad`. `fechaCierre` está fuera del contrato actual. El PATCH
genérico no agrega historial de etapas. Los POST de actualización permanecen disponibles y sin cambios
durante este cierre; no se implementó PUT.

### Reglas para el futuro frontend

Enviar únicamente campos modificados y usar null deliberadamente para borrar opcionales. Filtrar
contactos por empresa cuando se seleccione una empresa y validar la pareja final antes de guardar.
Sin empresa, permitir cualquier contacto. No ofrecer dejar la oportunidad sin ambas asociaciones.
Bloquear el selector de empresa de un contacto con oportunidades asociadas; el listado del embudo
permite detectar esas asociaciones por `idContacto`. El servidor sigue siendo la validación definitiva
si los datos cambian mientras el formulario está abierto. Mostrar los errores sin perder el formulario.

### Validación final local — 21/09/2026

`dotnet build backend/FluencyAPI.slnx --no-restore`: 0 errores y 0 advertencias.
Se ejecutaron **105 solicitudes** mediante PowerShell contra la API local conectada a `fluency-postgres`,
además de GET de comprobación. Pasaron: null/omisión, opcionales, obligatorios, longitudes, formato,
referencias, campos desconocidos, 404, parejas válidas/inválidas, bloqueo de empresa de contactos
asociados, reasignación al quedar sin oportunidades, compatibilidad de POST y regresión de PATCH Empresa.
Se compararon recursos antes/después de cada rechazo: sin cambios parciales. OpenAPI conserva PATCH y
POST con sus contratos separados. El PATCH genérico no agregó historial de etapas.

Datos identificables conservados: `qa-patch-rel-c2ddbd75ab`, contactos 12–14 y oportunidad principal 11.
No se modificaron esquema ni registros ajenos a las pruebas. No se repitieron pruebas remotas ni se
probaron carreras entre solicitudes concurrentes. xUnit queda para la siguiente fase.
