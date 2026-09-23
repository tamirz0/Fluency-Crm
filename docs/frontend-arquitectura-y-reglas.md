# Frontend: arquitectura y reglas de implementación

Este documento resume cómo está construido el frontend de Fluency CRM y qué reglas deben conservarse al modificarlo. Su objetivo es permitir entender el flujo general sin tener que leer todos los archivos de `frontend/`.

Para el detalle exacto de endpoints y contratos consultar [`api-frontend.md`](./api-frontend.md). Ante una diferencia entre esta guía y el código o el documento OpenAPI generado, el contrato OpenAPI y el comportamiento vigente de la API son la fuente de verdad.

## 1. Stack y principios generales

- React 19, TypeScript y Vite.
- Material UI para componentes base, tema y accesibilidad.
- MUI X Date Pickers con Day.js para elegir o escribir fechas en los formularios.
- React Router para navegación.
- TanStack Query para datos remotos y caché.
- React Hook Form y Zod para formularios y validación.
- `openapi-fetch` y tipos generados con `openapi-typescript` para consumir la API.
- Vitest, React Testing Library, `user-event` y jsdom para pruebas.
- Oxlint para análisis estático.
- Source Sans 3 se incluye localmente mediante `@fontsource-variable/source-sans-3`.

Reglas generales:

- No duplicar tipos del backend manualmente. Los tipos públicos se derivan de `src/api/schema.d.ts`.
- No hacer llamadas HTTP directamente desde páginas o componentes. Toda operación pasa por `src/api/client.ts`.
- No incorporar URLs absolutas de la API en el código. El cliente utiliza siempre `baseUrl: "/api"`.
- No introducir tokens, roles ni headers de autorización mientras el backend no los requiera.
- No adelantar abstracciones genéricas para tablas, permisos o CRUD si sólo existe un caso de uso.
- Preservar la experiencia existente en pantallas pequeñas, pero no ampliar compatibilidad móvil como requisito implícito si no fue solicitada para la tarea.

## 2. Estructura y flujo de la aplicación

```text
src/
├── api/             cliente HTTP, tipos y claves de caché
├── app/             providers, shell, tema y protección de rutas
├── auth/            sesión y contexto de autenticación
├── features/
│   ├── companies/   listado, detalle y formulario de empresas
│   ├── contacts/    listado, detalle y formulario de contactos
│   ├── opportunities/ listado, detalle y formulario de oportunidades
│   ├── funnel/      embudo y cambio de etapa
│   ├── home/        inicio autenticado
│   ├── login/       acceso
│   └── shared/      piezas compartidas por las funcionalidades
└── test/            configuración global de Vitest
```

Flujo de datos:

```text
Página o formulario
        │
        ├── React Hook Form + Zod      validación y normalización
        ├── TanStack Query             carga, mutación y caché
        │       │
        │       └── src/api/client.ts  única capa HTTP
        │                │
        │                └── /api      proxy local hacia http://localhost:5169
        └── Material UI                presentación y estados accesibles
```

`main.tsx` configura, en este orden:

1. `QueryClientProvider`, `ThemeProvider` y `CssBaseline` mediante `AppProviders`.
2. `BrowserRouter`.
3. `AuthProvider`.
4. La aplicación y sus rutas.

Las páginas funcionales se cargan con `React.lazy` y `Suspense`. Vite separa React, Material UI, iconos, formularios y TanStack Query en chunks de vendor. No ocultar advertencias de tamaño aumentando arbitrariamente `chunkSizeWarningLimit`.

## 3. Rutas y navegación

| Ruta | Acceso | Función |
|---|---|---|
| `/login` | Pública | Inicio de sesión |
| `/inicio` | Protegida | Inicio del espacio comercial |
| `/empresas` | Protegida | Listado de empresas |
| `/empresas/nueva` | Protegida | Alta de empresa |
| `/empresas/:idEmpresa` | Protegida | Detalle de empresa |
| `/empresas/:idEmpresa/editar` | Protegida | Edición de empresa |
| `/contactos` | Protegida | Listado de contactos |
| `/contactos/nuevo` | Protegida | Alta de contacto |
| `/contactos/:idContacto` | Protegida | Detalle de contacto |
| `/contactos/:idContacto/editar` | Protegida | Edición de contacto |
| `/oportunidades` | Protegida | Listado de oportunidades |
| `/oportunidades/nueva` | Protegida | Alta de oportunidad |
| `/oportunidades/:idOportunidad` | Protegida | Detalle de oportunidad |
| `/oportunidades/:idOportunidad/editar` | Protegida | Edición de oportunidad |
| `/embudo` | Protegida | Oportunidades agrupadas por etapa |

- `ProtectedRoute` redirige a `/login` y conserva el destino solicitado.
- Después de iniciar sesión se vuelve al destino protegido o a `/inicio`.
- Un usuario autenticado que abre `/login` se redirige a `/inicio`.
- Una ruta desconocida redirige a `/inicio`; la protección decide luego si debe ir a login.
- Los parámetros de entidad deben validarse con `parsePositiveId`. Un ID inválido no dispara una consulta.
- Un `404` muestra un estado de registro inexistente. Otros errores de carga muestran una acción de reintento.
- La navegación lateral usa iconos y resalta de forma consistente la sección activa, también cuando se abre una ficha o formulario de esa entidad.

## 4. Autenticación y sesión

El login usa exclusivamente `POST /Login/Login`.

- La sesión guarda únicamente el `UsuarioResponse` en `sessionStorage`.
- Clave estable: `fluency.auth.user.v1`.
- No guardar contraseña, credenciales completas ni datos de sesión en `localStorage`.
- La sesión pertenece a la pestaña. Una pestaña nueva no comparte el usuario autenticado.
- Al restaurar la sesión se valida mínimamente su estructura; un valor corrupto se elimina.
- `AuthContext` expone `user`, `isAuthenticated`, `login()` y `logout()`.
- `logout()` elimina la sesión, limpia por completo la caché de TanStack Query y redirige a `/login`.
- El usuario se normaliza con `trim` antes del login; la contraseña nunca se transforma.
- Mientras se envía el formulario se bloquean campos y botón. Una referencia interna evita envíos duplicados dentro del mismo render.
- Un `401` conserva el usuario, limpia la contraseña y muestra `Usuario o contraseña incorrectos.`.
- Un fallo de conexión muestra un mensaje accionable para comprobar que la API esté ejecutándose.

## 5. API, tipos y manejo de errores

### Cliente y tipos

- Existe un único cliente `openapi-fetch` en `src/api/client.ts`.
- El cliente usa `/api`; durante desarrollo Vite elimina ese prefijo y reenvía la petición a `http://localhost:5169`.
- En producción, el servidor que publique el frontend debe resolver o redirigir `/api` hacia el backend.
- `src/api/schema.d.ts` se genera desde `http://localhost:5169/openapi/v1.json` y nunca se edita manualmente.
- Si el backend cambia su contrato, ejecutar `npm run api:types`, revisar el diff generado y corregir los consumidores antes de continuar.

### Errores

`ApiRequestError` conserva el mensaje normalizado y el código HTTP cuando existe. La capa de API admite:

- Texto plano.
- `{ errors: string[] }`.
- `ValidationProblemDetails` con `errors` por campo.
- `detail` o `title`.
- Fallos de red sin respuesta HTTP.

Los componentes no deben volver a interpretar cuerpos de error. Deben mostrar el mensaje entregado por la capa compartida o una variante de producto específica, como el `401` del login.

### Claves de caché

- Empresas: `['empresas']` y `['empresas', id]`.
- Contactos: `['contactos']` y `['contactos', id]`.
- Embudo: `['oportunidades', 'por-etapa']`.
- Oportunidad: `['oportunidades', id]`.
- Catálogos: siempre bajo `['catalogos', ...]`.

El `QueryClient` tiene reintentos automáticos deshabilitados. Los reintentos deben ser visibles y controlados por el usuario.

Después de una mutación:

- Actualizar el detalle devuelto por la API con `setQueryData`.
- Invalidar los listados o relaciones afectadas.
- Empresa invalida empresas, contactos y oportunidades.
- Contacto invalida contactos y oportunidades.
- Oportunidad invalida el embudo/listado de oportunidades.
- Cambiar una etapa actualiza el detalle e invalida el embudo.

## 6. Formularios y actualizaciones

Todos los formularios siguen las mismas reglas:

- React Hook Form controla estado y envío; Zod define las validaciones del cliente.
- Las restricciones de longitud y obligatoriedad deben reflejar el contrato OpenAPI.
- El backend continúa siendo la validación definitiva de reglas de negocio.
- Durante una mutación se bloquea el envío y se muestra `Guardando…`.
- Un error de API conserva los valores ingresados y deja el formulario utilizable.
- Después de guardar se navega al detalle y se muestra una confirmación.

### Altas

- Los textos obligatorios se envían con `trim`.
- Los opcionales vacíos se omiten del body.
- Los IDs de selectores se convierten a número antes de enviar.
- No enviar claves opcionales con `undefined`, string vacío o `null` durante un alta, salvo que el contrato lo requiera expresamente.

### Ediciones

- Usar PATCH diferencial: enviar solamente campos cuyo valor efectivo cambió.
- Un opcional previamente informado que se limpia se envía como `null`.
- Espacios, string vacío y `null` se comparan de forma normalizada.
- Nunca enviar un PATCH `{}`.
- `Guardar cambios` permanece deshabilitado si el formulario coincide con su estado inicial.
- La defensa debe existir tanto en la interfaz como en el manejador de envío.
- No incluir identificadores o propiedades de sólo lectura en el PATCH.

### Catálogos

- Los IDs nunca se fijan en código; se cargan desde la API.
- Un catálogo opcional puede fallar sin impedir guardar otros campos.
- Un catálogo indispensable para crear el registro bloquea el envío y ofrece `Reintentar`.
- Una respuesta vacía no equivale a un error de conexión y debe tener un mensaje propio cuando sea relevante.

### Fechas y valores ausentes

- La fecha estimada de cierre de una oportunidad se puede escribir en formato `DD/MM/AAAA` o elegir en el calendario de MUI X. El control usa `LocalizationProvider` con Day.js y textos en español.
- El formulario valida la fecha antes de guardar; el body conserva el formato ISO `yyyy-mm-dd`. Una fecha ausente permanece vacía en el editor.
- `-` es **sólo la representación visual** de un dato ausente o no presentable. Nunca se envía a la API como sustituto de `null` o de un campo omitido: las reglas de POST y PATCH anteriores siguen vigentes.

## 7. Reglas por entidad

### Empresa

- `razonSocial` es obligatoria.
- Estado y origen son opcionales y se obtienen de catálogos.
- Una modificación puede afectar datos mostrados por contactos y oportunidades; por eso se invalidan esas cachés.

### Contacto

- Nombre, apellido y correo son obligatorios.
- La empresa es opcional.
- Si el contacto tiene oportunidades asociadas, su empresa no puede cambiarse desde el formulario.
- Mientras se verifica esa relación, o si la verificación falla, el selector de empresa queda bloqueado.
- La pantalla debe explicar el motivo y permitir reintentar la verificación.

### Oportunidad

- Título, responsable y etapa inicial son obligatorios durante el alta.
- Debe existir al menos una empresa o un contacto.
- Si se selecciona una empresa, el selector de contactos muestra sólo contactos de esa empresa.
- Cambiar de empresa limpia un contacto que ya no sea compatible e informa lo ocurrido.
- En el alta, el responsable es el usuario autenticado.
- En edición, responsable y etapa son de sólo lectura y no se incluyen en el PATCH.
- La etapa se modifica exclusivamente desde el embudo.
- El alta exige una etapa inicial y, además, al menos una empresa o un contacto. La validación aparece en el formulario antes de enviar la petición.
- El catálogo de servicios muestra servicios activos. Si el servicio actual dejó de estar disponible, debe seguir apareciendo como `No disponible` para poder conservarlo o quitarlo.

### Embudo

- Las etapas se muestran según su propiedad `orden`, con una paleta discreta compartida por dashboard, grilla y embudo. El nombre visible acompaña siempre al color.
- Contraer una etapa reduce el ancho de la columna y conserva visibles el nombre y el contador.
- El listado general de oportunidades se obtiene aplanando la respuesta agrupada del embudo.
- Una oportunidad no puede moverse a su etapa actual.
- El cambio de etapa usa al usuario autenticado y admite una observación opcional normalizada con `trim`.
- Si falla la mutación, el diálogo permanece abierto, conserva la selección y muestra el error.
- Si no puede cargarse el catálogo de etapas, el embudo continúa visible pero la acción de cambio queda deshabilitada.
- Las etapas empiezan desplegadas y cada tarjeta empieza compacta. Los dos niveles se pueden contraer o expandir de forma independiente mediante controles con `aria-expanded`.
- La tarjeta compacta muestra título, Empresa y Contacto en filas con etiqueta y valor separados; los nombres largos pueden ocupar varias líneas y los vínculos ausentes se muestran como `-`. Al expandirla muestra Cierre estimado, Responsable y la acción de cambiar etapa.
- El resumen del embudo no incluye Servicio en el contrato actual; ese dato sólo se presenta donde se consulta el detalle completo.

## 8. Presentación y accesibilidad

La identidad visual es exclusivamente oscura y utiliza:

- Noche `#0B1118` como fondo, tinta `#101C28` para navegación y pizarra `#162631` para superficies.
- Borde `#344A55`, niebla `#E7EFF1` como texto principal y verde agua `#62BDB5` para acciones, selección y foco.
- Source Sans 3 como familia tipográfica.
- Las cabeceras y los datos de las grillas se centran. Las cabeceras usan un fondo y borde inferior discretos para distinguirlas de los registros. Los nombres principales de Empresa, Contacto y Oportunidad usan un poco más de peso y contraste, más un subrayado tenue en su enlace.
- Los íconos del dashboard conservan un tono propio por entidad. Las etapas comerciales usan una paleta discreta compartida por dashboard, grilla y embudo, siempre junto con su nombre.

No existe selector ni variante clara. Los valores de solo lectura, incluidos Responsable y Etapa actual en la edición de oportunidades, se presentan como información semántica, nunca como inputs.

Las fechas informadas se muestran como `dd/mm/yyyy`; un valor ausente o no presentable se muestra como `-`. La frontera con la API convierte estrictamente entre ese formato y el ISO `yyyy-mm-dd`, sin aplicar conversiones horarias. Los selectores opcionales muestran `-` como opción vacía, sin convertir ese carácter en un valor de negocio.

Inicio reutiliza las consultas y claves de caché de empresas, contactos y oportunidades por etapa. Cada tarjeta del pulso comercial integra el **total de registros** y su desglose: oportunidades por etapa y empresas/contactos por estado. Los valores ausentes o vacíos se agrupan como `-`, incluidas las etapas que devuelve la API sin nombre; el conteo de `-` forma parte del total y cada desglose suma exactamente el total de su entidad. Esta categoría es sólo de presentación: no modifica los valores `null` enviados o recibidos por la API.

Los listados de las tres entidades usan `ListSearch` y `matchesSearch` para filtrar en memoria los campos visibles, ignorando mayúsculas y acentos. La búsqueda muestra resultados sobre el total y permite limpiar el filtro cuando no hay coincidencias. No existe un endpoint de búsqueda ni paginación para esos listados.

Las tres grillas omiten la columna Acción. En escritorio, un clic sobre la fila abre la ficha; el nombre o título sigue siendo un enlace accesible por teclado. Los enlaces de relación, correo y teléfono detienen la navegación de la fila para conservar su destino propio. Empresas ubica Estado en la segunda columna; la grilla de contactos también ubica Estado en la segunda columna. Ambas grillas se ordenan alfabéticamente por estado con el mismo criterio, y los estados ausentes o vacíos quedan al final conservando entre sí el orden recibido. Empresas y contactos separan Correo y Teléfono en columnas independientes; ambos campos siguen incluidos en la búsqueda. Oportunidades separa Empresa y Contacto en columnas independientes, busca ambos vínculos y usa el encabezado «Cierre estimado»; vínculos faltantes muestran `-`. Una etapa ausente también muestra `-` como texto normal, sin chip; las etapas informadas usan chips con la paleta compartida. Los nombres de etapa siempre acompañan el color.

Mantener una interfaz sobria y operativa:

- Texto alineado a la izquierda y líneas de lectura breves.
- Sin gradientes, sombras decorativas, mayúsculas espaciadas ni colecciones de tarjetas idénticas sin función. Las superficies, estados y foco deben conservar contraste suficiente en oscuro; `Inactivo` tiene un tono explícito.
- Estados de carga mediante skeleton o indicador con `role="status"`.
- Estados vacíos que expliquen qué aparecerá o qué acción puede realizarse.
- Errores con causa comprensible y una acción concreta cuando sea posible.
- Valores faltantes representados como `-` en fichas, grillas, tarjetas y campos compartidos; distinguirlos de mensajes de estado como `Sin oportunidades` o `No disponible`.
- Navegación por teclado, etiquetas accesibles, contraste suficiente y foco visible.
- Respetar `prefers-reduced-motion`.
- Los botones principales mantienen una altura mínima de 44 px.

Antes de crear un nuevo componente compartido, comprobar que representa el mismo comportamiento en más de una funcionalidad. Compartir presentación y reglas estables; mantener dentro de cada feature la lógica específica del negocio.

## 9. Pruebas y criterio de cierre

Las pruebas se organizan por comportamiento, no por detalles internos. Deben cubrir como mínimo:

- Acceso, sesión, rutas protegidas y logout.
- Carga, vacío, error, reintento y 404 de listados y detalles.
- Validaciones visibles de formularios.
- Bodies exactos de POST y PATCH.
- Omisión de opcionales vacíos en altas.
- Envío de `null` al limpiar opcionales en edición.
- Ausencia de PATCH sin cambios y bloqueo de envíos duplicados.
- Invalidaciones de caché que cambien datos visibles.
- Reglas de relación entre empresa, contacto y oportunidad.
- Servicio inactivo y cambio de etapa.
- Fecha estimada escrita, elegida en calendario, inválida y convertida a ISO.
- Búsqueda en los tres listados, incluido el caso sin coincidencias, y apertura de fichas desde las filas.
- Expansión de tarjetas y etapas del embudo, con Contacto en la vista compacta.
- Totales y desgloses del inicio, incluidos estados ausentes.
- Desglose de oportunidades que incluye etapas ausentes y suma exactamente el total de registros.
- Vínculos de Empresa y Contacto en oportunidades, búsqueda por ambos campos y presentación de relaciones ausentes.
- Colapso de etapas que conserva nombre y contador; la tarjeta expandida mantiene Cierre estimado y el cambio de etapa.
- IDs de ruta inválidos sin llamadas a la API.

No usar snapshots grandes como sustituto de pruebas de interacción. Consultar por rol, nombre accesible y texto visible siempre que sea posible.

Antes de considerar terminada una modificación ejecutar:

```bash
npm run test:run
npm run lint
npm run build
git diff --check
```

Si cambió el contrato de la API, ejecutar primero:

```bash
npm run api:types
```

Además de la suite automática, validar manualmente contra la API local los recorridos modificados. Las pruebas que creen o editen datos reales deben usar información identificable como prueba y acordar previamente cómo se limpiará.

## 10. Flujo local de trabajo

Con la API disponible en `http://localhost:5169`:

```bash
cd frontend
npm install
npm run dev
```

Vite publica normalmente el frontend en `http://localhost:5173` y resuelve las llamadas `/api` mediante su proxy.

Al trabajar en el repositorio:

1. Revisar `git status` antes de modificar archivos.
2. Preservar cambios ajenos, especialmente configuración local del backend.
3. No editar `schema.d.ts` a mano.
4. Implementar y probar un recorrido vertical completo.
5. Revisar el diff y ejecutar todas las verificaciones.
6. No crear ramas, commits ni hacer push salvo que se solicite expresamente.
