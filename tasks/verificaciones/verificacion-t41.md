# Verificación T41: registro y consulta de actividades por API

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `POST /actividades` (`idTipo`, `idEmpresa?`, `idContacto?`, `idOportunidad?`, `fechaHora`, `descripcion`, `resultado?`), `GET /actividades` y `GET /actividades/{id}`. Edición y baja de actividades llegan con T43.
- Alta: exige tipo activo, empresa o contacto (la oportunidad sola no alcanza), fecha del hecho (se rechaza una futura: son hechos ya realizados) y descripción no vacía; resultado opcional. El autor sale de la sesión y la fecha de registro la fija la base; autor, registro, baja o id enviados por el cliente se rechazan como propiedades desconocidas (400). Sin oportunidad, cualquier usuario activo gestiona y empresa/contacto deben estar activos (no se infiere ni se exige coincidencia entre ambos). Con oportunidad: solo su responsable vendedor o un superior (403, también si se invoca solo con el cliente), también si está cerrada —no se modifica ni se reabre—; empresa/contacto, si se envían, deben ser los que conserva la oportunidad (400 `VALIDATION_FAILED`), aunque luego hayan cambiado o dejado de estar activos; una oportunidad dada de baja no se elige.
- Consulta (lectura compartida): activas con al menos un contexto vigente (empresa, contacto u oportunidad); filtros `idEmpresa`, `idContacto`, `idOportunidad`, `idTipo`, `idUsuario`, `desde` (inclusivo), `hasta` (exclusivo) y `q` (sin tildes ni mayúsculas, sobre descripción y resultado), aplicados antes de contar y paginar; orden por la fecha del hecho descendente e ID. El detalle y la lista traen referencias etiquetadas y `accionesPermitidas` (`editar`, `darDeBaja`); una dada de baja o sin contexto vigente responde 404.
- Reutiliza `OportunidadOperationException` y su filtro de errores; servicio registrado en `Program.cs`.

## Resultados

- Build: 0 errores, 0 advertencias.
- `ActividadesTests` **3/3** (6 min 17 s) y `HttpContractTests` 19/19 en la ejecución previa (65 acciones; la corrección posterior no cambió rutas). Cubren: llamada de ayer cargada hoy con ambas fechas y el autor real, falsificaciones y datos inválidos sin escritura, cliente dado de baja; oportunidad propia, propia cerrada (estado e historial intactos), ajena (403), superior, sin oportunidad, clientes que no son los de la oportunidad, contacto dado de baja con la oportunidad vigente y oportunidad dada de baja; listado compartido, ocultamiento de actividades dadas de baja o sin contexto vigente, actividad que sigue visible desde otro contexto cuando se da de baja la oportunidad, filtros, búsqueda, fechas inclusivas/exclusivas y paginación.
- Un primer intento falló con 500: filtrar sobre una proyección con constructor anidado no se traducía a SQL. Se corrigió filtrando/ordenando sobre la entidad y proyectando al final (causa en producto, no en el test).
- No se repitió la suite backend completa (último cierre: CP13, 163/163).

## Límites y pendientes

- El editor de la UI y el historial combinado vienen en T42–T45. Revisión independiente, auditorías y recorrido manual pendientes.
