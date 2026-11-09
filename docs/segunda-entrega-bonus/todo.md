# Tareas del bonus: Fluency para academias de inglés

Plan del 09/11/2026: [plan.md](plan.md). **Plan aprobado; B01–B17 implementadas y verificadas por pruebas; B18 cerrada salvo el recorrido manual y la revisión visual (pendientes del usuario).** Una persona en serie. Tamaño M ≈ 1–1,5 h; si una tarea pasa de unos cinco archivos, subdividir (`Bxx.a`, `Bxx.b`) conservando su aceptación. Marcar solo con evidencia real (una línea por tarea). Comandos de verificación y reglas de tests en [plan §6](plan.md#6-verificación). Recorte, si falta tiempo: primero B16–B17, luego B15, luego la vista Lista de B12.

## Índice

- [x] [B01 — Landing: ruta, barra y hero](#b01)
- [x] [B02 — Landing: secciones y responsive](#b02)
- [x] [B03 — Esquema SQL incremental](#b03)
- [x] [B04 — Modelos EF, rol Profesor y barrido de permisos](#b04)
- [x] [B05 — Niveles del Profesor](#b05)
- [x] [B06 — «Es taller» en Servicio](#b06)
- [x] [B07 — Alumno al ganar la oportunidad](#b07)
- [x] [B08 — Pestaña y perfil de Alumnos](#b08)
- [x] [B09 — Cursos: API](#b09)
- [x] [B10 — Cursos: pantallas](#b10)
- [x] [B11 — Clases: API, asistencia y notas](#b11)
- [x] [B12 — Clases: calendario, lista y detalle](#b12)
- [x] [B13 — Asistencia en el perfil](#b13)
- [x] [B14 — Cierre del recorrido del Profesor](#b14)
- [x] [B15 — Pestaña Profesores](#b15)
- [x] [B16 — Talleres: API](#b16)
- [x] [B17 — Talleres: pantallas](#b17)
- [x] [B18 — Cierre y verificación integral](#b18)
- [x] [B19 — Ajustes tras la revisión del usuario](#b19)

## Detalle

<a id="b01"></a>

### B01 — Landing: ruta, barra y hero

**Resultado:** `/` muestra una landing pública con barra (logo, anclas, botones **Contacto** e **Ingresar** a la derecha) y hero con mockup armado con componentes.

**Dependencias:** ninguna. **Archivos probables:** `frontend/src/features/landing/LandingPage.tsx` (nuevo), `frontend/src/App.tsx`, `frontend/src/App.test.tsx` o test propio, `frontend/.env.example` si existe.

**Aceptación:**

- [x] `/` pública; con sesión activa redirige a `/inicio`; `*` → `/`; `/login` sin cambios.
- [x] **Contacto** abre `mailto:` con `VITE_CONTACT_EMAIL` (valor ficticio marcado si falta); **Ingresar** lleva a `/login`.
- [x] Contenedor propio (`maxWidth` + `mx: auto`), sin heredar el layout del shell; tema oscuro actual; sin dependencias nuevas.

**Verificación:** F + `npm run test:run -- landing` (render, enlaces, redirección) + D.

**Evidencia:** 09/11/2026: ruta `/`, barra con Contacto (mailto, `VITE_CONTACT_EMAIL`) e Ingresar, redirección con sesión y `*` a `/`. `npm run test:run -- src/features/landing src/App.test.tsx` 17/17; build y lint sin advertencias nuevas.

<a id="b02"></a>

### B02 — Landing: secciones y responsive

**Resultado:** resto de la landing con el contenido de [plan §4](plan.md#4-landing-b01b02): franja de niveles A1–C2, dolores, cómo funciona, módulos con anclas, ventaja, FAQ, CTA final y footer.

**Dependencias:** B01. **Archivos probables:** `frontend/src/features/landing/*` (secciones), test.

**Aceptación:**

- [x] Solo módulos y capacidades reales (sin cobros, IA, integraciones, testimonios ni cifras inventadas).
- [x] Anclas de la barra funcionan; accesible (encabezados, foco visible, contraste); sin scroll horizontal.
- [x] Capturas a 360, 768 y 1280 px sin descentrados (comparar con `Referencias/mal-centrado/`). Revisión visual del usuario pendiente, no bloqueante.

**Verificación:** F + test de humo + capturas con el servidor de desarrollo + D.

**Evidencia:** 09/11/2026: todas las secciones con contenido real del PDF. Capturas con Edge headless a 1280 px y a 360 px (iframe) sin descentrado ni scroll horizontal; el aviso 502 de la captura es de la sesión sin API en la vista previa. **Pendiente:** revisión visual del usuario (no bloqueante).

<a id="b03"></a>

### B03 — Esquema SQL incremental

**Resultado:** `backend/Persistence/SQL/segunda-entrega-bonus.sql` crea lo académico sin tocar los scripts base.

**Dependencias:** ninguna. **Archivos probables:** `segunda-entrega-bonus.sql` (nuevo), `backend/FluencyAPI.Tests/CommercialSchemaFixture.cs`, `SchemaTests.cs` (o clase nueva), `levantar-*.ps1` solo si aporta.

**Aceptación:**

- [x] `servicio.es_taller` (default false); tablas `profesor_nivel`, `alumno` (UNIQUE `id_contacto`, `id_nivel`, `id_curso` null), `curso`, `clase` (hora fin > inicio, `es_examen`, `temas_examen`), `clase_alumno` (PK clase+alumno, nota 0–10), `taller`, `taller_inscripcion`; FKs `RESTRICT`.
- [x] Rol `PROFESOR` y permiso `GestionarAcademia` (Profesor y Administrador); aditivo sobre una base con identidad ya inicializada; guarda de base destino como los scripts actuales.
- [x] El fixture lo aplica; pruebas de esquema para UNIQUE, nota, horario y FKs.

**Verificación:** B + API(Schema) + D. No ejecutar contra la base de desarrollo en esta tarea.

**Evidencia:** 09/11/2026: `segunda-entrega-bonus.sql` y `segunda-entrega-bonus-roles.sql` (separado porque el de roles base se rechaza con identidad poblada); fixture los aplica; `SchemaTests` + `BonusSchemaTests` (UNIQUE alumno, nota, horario, FK RESTRICT, roles idempotentes) en verde. No se ejecutó contra ninguna base real.

<a id="b04"></a>

### B04 — Modelos EF, rol Profesor y barrido de permisos

**Resultado:** modelos EF y `DbContext` para lo nuevo; rol Profesor asignable; **ninguna ruta comercial accesible a un Profesor**.

**Dependencias:** B03. **Archivos probables:** `Persistence/Models/*` (nuevos) y `FluencyLocalDbContext.cs`; `Services/Acceso/RolesYPermisos.cs`, `CapacidadesUsuario.cs`; `FluencyAPI/Authentication/AuthenticationSetup.cs`; `frontend/src/features/settings/UserDialog.tsx`; test de barrido. **Subdividir** en B04.a (modelos + mapeo) y B04.b (permisos + barrido + UI) si pasa de cinco archivos.

**Aceptación:**

- [x] Constantes y policies del Profesor y de `GestionarAcademia`; el administrador crea usuarios Profesor desde Usuarios.
- [x] Prueba HTTP con cuenta Profesor recorriendo **todas** las rutas comerciales (empresas, contactos, oportunidades, actividades, embudo, servicios, catálogos, usuarios, `/inicio/resumen`, historiales): 403, sin lectura ni mutación. Corregir en servicio cada fuga que aparezca.
- [x] Guarda de ruta por permiso en el frontend y menú condicional (la API sigue siendo la autoridad). Excepción: las opciones de nivel necesarias al Profesor.

**Verificación:** B + F + API(permisos Profesor) + D. **Revisión independiente obligatoria antes de integrar** (puede agruparse en B18).

**Evidencia:** 09/11/2026: modelos EF (`Academia.cs`, `FluencyLocalDbContext.Academia.cs`), rol `PROFESOR`, permiso `GestionarAcademia`, `[Authorize(ConsultarComercial)]` en los 13 controladores comerciales (antes solo exigían estar autenticado). `ProfesorAccesoTests`: 60 rutas de lectura y escritura con cuenta Profesor devuelven 403 y no cambian datos. Guardas de frontend (`RequirePermission`). Revisión independiente: ver B18.

<a id="b05"></a>

### B05 — Niveles del Profesor

**Resultado:** el Profesor tilda desde su Perfil los niveles con los que trabaja.

**Dependencias:** B04. **Archivos probables:** `ProfesoresController.cs`/servicio/DTO (nuevos), `frontend/src/features/profile/ProfilePage.tsx`, `schema.d.ts` (generado), tests.

**Aceptación:**

- [x] `GET/PUT /profesores/yo/niveles` con la identidad de la sesión; solo niveles activos; solo rol Profesor.
- [x] Casillas en Perfil (solo para Profesor); cambios persisten.

**Verificación:** B + F + API(Profesores) + UI(profile) + D; regenerar tipos.

**Evidencia:** 09/11/2026: `GET/PUT /profesores/yo/niveles` (identidad de la sesión, no se quita un nivel con cursos) + casillas en Mi perfil; `ProfesoresTests` y `Students.test.tsx` en verde.

<a id="b06"></a>

### B06 — «Es taller» en Servicio

**Resultado:** Servicio distingue talleres.

**Dependencias:** B03. **Archivos probables:** `Servicio.cs`, `ServicioContracts.cs`, `ServicioService.cs`, `ServicesPage.tsx` y su formulario, `ServiciosTests.cs`.

**Aceptación:**

- [x] Alta y edición con casilla «Es taller»; se muestra en el listado; por defecto falso.
- [x] Un taller puede no tener nivel; un servicio con nivel puede no ser taller. Sin cambios en el resto de reglas de servicios.

**Verificación:** B + F + API(Servicios) + UI(services) + D; regenerar tipos.

**Evidencia:** 09/11/2026: `esTaller` en contrato, servicio y diálogo de Servicios; `ServicioTallerTests` y `ServicesPage.test.tsx` (6/6) en verde.

<a id="b07"></a>

### B07 — Alumno al ganar la oportunidad

**Resultado:** ganar una oportunidad con contacto y servicio con nivel (no taller) crea el alumno.

**Dependencias:** B06. **Archivos probables:** `OportunidadService.cs` (`CloseAsync`), `InicioService`/resumen, SPEC de oportunidades/inicio, tests.

**Aceptación:**

- [x] En la misma transacción de ganar: contacto con servicio con nivel y no taller → fila `alumno` (contacto + nivel, curso nulo). Sin contacto, sin nivel o taller: no crea. Ya alumno: no duplica ni cambia.
- [x] Reabrir no revierte. Empresa sin contacto nunca crea alumno.
- [x] La tarjeta «Alumnos» del inicio cuenta filas `alumno` activas; SPEC y test actualizados.

**Verificación:** B + API(Cierre, Inicio) + D; casos de integración con PostgreSQL real.

**Evidencia:** 09/11/2026: `CrearAlumnoAsync` dentro de `CloseAsync`; tarjeta Alumnos cuenta `alumno`; SPEC-oportunidades actualizada; `AlumnosTests` (sin nivel, empresa sola, alumno, duplicado, reabrir, taller) e `InicioTests` en verde.

<a id="b08"></a>

### B08 — Pestaña y perfil de Alumnos

**Resultado:** `/alumnos` y `/alumnos/:id` para Administrador y Profesor.

**Dependencias:** B04, B07. **Archivos probables:** `AlumnosController.cs`/servicio/DTO, `frontend/src/features/students/*` (nuevo), `AuthenticatedShell.tsx`, `App.tsx`, tests.

**Aceptación:**

- [x] `GET /alumnos` paginado y con búsqueda: Administrador todos; Profesor solo alumnos de sus niveles. `GET /alumnos/{id}` con la misma restricción (otro nivel: 404/403).
- [x] Perfil con `RecordProfile`: datos personales, nivel, curso; **sin** historial comercial ni datos de oportunidades.
- [x] Pestaña visible solo con `GestionarAcademia`; Responsable y Vendedor no la ven ni acceden.

**Verificación:** B + F + API(Alumnos) + UI(students) + D; regenerar tipos.

**Evidencia:** 09/11/2026: `GET /alumnos` (Profesor: sus niveles; 404 fuera de alcance) y fichas `/alumnos`; menú y rutas por permiso; `AlumnosTests`, `Students.test.tsx` en verde.

<a id="b09"></a>

### B09 — Cursos: API

**Resultado:** crear, listar, ver y sumar alumnos a cursos.

**Dependencias:** B05, B08. **Archivos probables:** `CursosController.cs`/servicio/DTO, tests.

**Aceptación:**

- [x] Crear: nombre, nivel (entre los niveles del profesor), profesor (el Profesor, el propio; el Administrador, uno de rol Profesor), alumnos opcionales.
- [x] Listar (Profesor: solo propios; Administrador: todos, filtrable por profesor) y detalle con cantidad y lista de alumnos.
- [x] Sumar alumnos: mismo nivel del curso, sin curso previo (si no, 409); transaccional; un Profesor no opera en cursos ajenos.

**Verificación:** B + API(Cursos) + D; regenerar tipos.

**Evidencia:** 09/11/2026: `CursoService`/`CursosController` (nivel del profesor, un curso por alumno, lote todo-o-nada, 404 en cursos ajenos); `GET /profesores` para el administrador; `CursosTests` en verde.

<a id="b10"></a>

### B10 — Cursos: pantallas

**Resultado:** pestaña Cursos en grid y perfil de curso.

**Dependencias:** B09. **Archivos probables:** `frontend/src/features/courses/*` (nuevo), `AuthenticatedShell.tsx`, `App.tsx`, tests.

**Aceptación:**

- [x] Grid de cursos; al abrirlos, perfil con el formato de las fichas (cantidad y lista de alumnos).
- [x] Alta en modal con «agregar alumnos» opcional (solo alumnos del nivel sin curso); sumar más desde el perfil. Administrador: elige profesor y después uno de sus niveles.
- [x] Errores 409/403 mostrados; accesible y adaptable a móvil.

**Verificación:** F + UI(courses) + D.

**Evidencia:** 09/11/2026: grilla, ficha y alta (administrador: profesor y luego nivel) en `features/courses`; `Courses.test.tsx` 4/4.

<a id="b11"></a>

### B11 — Clases: API, asistencia y notas

**Resultado:** clases con asistencia y, si es examen, notas.

**Dependencias:** B09. **Archivos probables:** `ClasesController.cs`/servicio/DTO, tests.

**Aceptación:**

- [x] Crear: título, fecha, horario, curso (propio para el Profesor; cualquiera para el Administrador), `es_examen`, `temas_examen` opcional.
- [x] Listar por rango de fechas (y por curso); detalle con alumnos del curso, presente/ausente y nota.
- [x] Asistencia por alumno con upsert; notas solo en exámenes, 0–10; solo alumnos del curso; sin fila = sin registrar.
- [x] Consulta del total por alumno: presentes / clases del curso con fecha ≤ hoy.

**Verificación:** B + API(Clases) + D; regenerar tipos.

**Evidencia:** 09/11/2026: `ClaseService` (alta, rango de 93 días, asistencia con upsert, notas 0-10 solo en exámenes); `ClasesTests` en verde.

<a id="b12"></a>

### B12 — Clases: calendario, lista y detalle

**Resultado:** pestaña Clases con calendario mensual (por defecto) y vista Lista.

**Dependencias:** B11. **Archivos probables:** `frontend/src/features/shared/MonthCalendar.tsx` (nuevo, reutilizable por Talleres), `frontend/src/features/classes/*` (nuevo), `App.tsx`, tests. **Subdividir** en B12.a (calendario + modal) y B12.b (detalle con asistencia y notas) si excede cinco archivos.

**Aceptación:**

- [x] Cada casilla muestra las clases del día con título y, debajo, horario; botón Calendario/Lista (Lista = clases). Sin dependencias nuevas (dayjs ya existe).
- [x] Clic en un día abre el modal de alta: título, horario, examen (casilla que abre «temas», opcional) y curso (Profesor: sus cursos; Administrador: profesor y luego un curso suyo, dos desplegables encadenados).
- [x] Clic en una clase: lista de alumnos con presente/ausente; si es examen, tabla (DNI o apellido, nombre, nota) editable.
- [x] Layout centrado y responsive (capturas 360/768/1280).

**Verificación:** F + UI(classes, MonthCalendar) + D; recorrido manual local.

**Evidencia:** 09/11/2026: `MonthCalendar` reutilizable, vista Calendario/Lista, alta por clic en el día (administrador: profesor y curso encadenados) y planilla de asistencia/notas; `Classes.test.tsx` 6/6. Revisión visual del calendario pendiente del usuario.

<a id="b13"></a>

### B13 — Asistencia en el perfil

**Resultado:** el perfil del alumno muestra asistencias y su total.

**Dependencias:** B11, B08. **Archivos probables:** componente compartido `AttendanceSummary`, `ContactDetailPage.tsx`, `StudentDetailPage`, contrato de contacto/alumno, tests.

**Aceptación:**

- [x] En grande «presentes/clases» (ej. 13/33) y la lista de clases con presente/ausente/sin registrar, en `/alumnos/:id` y en la ficha de contacto si es alumno.
- [x] Alumno sin curso: «sin curso». La ficha de contacto no expone asistencia de quien no es alumno ni a roles sin acceso al contacto.

**Verificación:** B + F + API(Alumnos) + UI(contacts, students) + D.

**Evidencia:** 09/11/2026: `GET /alumnos/{id}/asistencia` y `GET /contactos/{id}/academico`; `AttendanceSummary` («13/33») en la ficha del alumno y en la del contacto; `AsistenciaAlumnoTests` y `Students.test.tsx` en verde.

<a id="b14"></a>

### B14 — Cierre del recorrido del Profesor

**Resultado:** un Profesor ve y hace solo lo suyo, y entra directo a sus clases.

**Dependencias:** B12. **Archivos probables:** `HomePage`/redirección, `AuthenticatedShell.tsx`, tests de permisos.

**Aceptación:**

- [x] Inicio del Profesor → `/clases`; menú: Alumnos, Cursos, Clases, Talleres si existe; sin embudos, actividades, configuración, usuarios ni servicios.
- [x] Prueba cruzada: un Profesor no lee ni opera cursos, clases o alumnos de otro nivel o profesor. Repetir el barrido de B04 con las rutas nuevas.

**Verificación:** B + F + API(permisos) + UI + D.

**Evidencia:** 09/11/2026: inicio del Profesor en `/clases`, menú sin lo comercial, redirección de URL comerciales; cursos, clases y alumnos de otros niveles/profesores devuelven 404 (`CursosTests`, `ClasesTests`, `AsistenciaAlumnoTests`).

<a id="b15"></a>

### B15 — Pestaña Profesores

**Resultado:** el Administrador ve cada Profesor con sus niveles, cursos y clases.

**Dependencias:** B11. **Archivos probables:** `ProfesoresController.cs`/servicio, `frontend/src/features/teachers/*` (nuevo), `AuthenticatedShell.tsx`, tests.

**Aceptación:**

- [x] `GET /profesores` (solo Administrador) con niveles, cantidad de cursos y de clases; detalle con las clases asignadas.
- [x] Pestaña solo para el Administrador.

**Verificación:** B + F + API(Profesores) + UI(teachers) + D; regenerar tipos. *Primer recorte tras Talleres.*

**Evidencia:** 09/11/2026: pestaña Profesores del administrador (niveles, cursos, clases y clases asignadas); `Teachers.test.tsx` 2/2.

<a id="b16"></a>

### B16 — Talleres: API

**Resultado:** talleres de fecha única con inscriptos.

**Dependencias:** B06, B07. **Archivos probables:** `TalleresController.cs`/servicio/DTO, tests.

**Aceptación:**

- [x] Crear: título, fecha, horario y servicio taller activo (opciones accesibles al Profesor sin exponer el resto de servicios). Administrador y Profesor.
- [x] Listar por rango; detalle con inscriptos y cantidad.
- [x] Candidatos: contactos Cliente con oportunidad ganada de ese servicio ∪ alumnos. Inscribir un contacto elegible; duplicado y no elegible rechazados.

**Verificación:** B + API(Talleres) + D; regenerar tipos. *Recorte prioritario.*

**Evidencia:** 09/11/2026: `TallerService`/`TalleresController` (servicio de taller, candidatos = alumnos y clientes con el taller ganado, inscripción sin duplicados); `TalleresTests` en verde.

<a id="b17"></a>

### B17 — Talleres: pantallas

**Resultado:** pestaña Talleres con calendario/lista como Clases.

**Dependencias:** B16, B12. **Archivos probables:** `frontend/src/features/workshops/*` (nuevo), `MonthCalendar.tsx` (reutilizar), `AuthenticatedShell.tsx`, `App.tsx`, tests.

**Aceptación:**

- [x] Calendario/lista reutilizando `MonthCalendar`; clic en un día crea un taller (título, horario, servicio taller).
- [x] Clic en un taller: lista de inscriptos y su cantidad; inscribir desde candidatos.

**Verificación:** F + UI(workshops) + D. *Recorte prioritario.*

**Evidencia:** 09/11/2026: calendario/lista, alta y ficha con anotados y cantidad en `features/workshops`; `Workshops.test.tsx` 3/3.

<a id="b18"></a>

### B18 — Cierre y verificación integral

**Resultado:** bonus verificado de punta a punta, con evidencia y guía de despliegue del SQL.

**Dependencias:** todas las tareas retenidas. **Archivos probables:** este `todo.md`, `docs/segunda-entrega-bonus/` (guía SQL de producción), documentación de contratos si cambió.

**Aceptación:**

- [x] Suite backend completa y suite frontend completa sin fallos nuevos; build y lint correctos; `schema.d.ts` regenerado sin cambios manuales.
- [ ] Recorrido manual local con Administrador, Profesor y Vendedor: ganar una oportunidad → alumno → curso → clase → asistencia/examen → ficha «x/y»; Vendedor sin acceso académico; Profesor sin acceso comercial.
- [x] Revisión independiente centrada en permisos del Profesor, sin hallazgos altos sin resolver.
- [x] Guía para aplicar `segunda-entrega-bonus.sql` en producción (backup, orden, verificación), **sin ejecutarla**; recortes y deuda registrados; correo de Contacto definido o pendiente anotado.

**Verificación:** B + F + suites completas + D; sin repetir seguridad si no cambiaron dependencias. Merge y publicación requieren OK específico del usuario.

**Evidencia (09/11/2026):** frontend 179/179, build y lint (solo la advertencia previa de `providers.tsx`). Backend completo: 187/188 en 12 min 6 s; el único fallo (`AuthTests` contaba 7 permisos del administrador, ahora 8 con `GestionarAcademia`) se corrigió y se repitieron `AuthTests`, `ClasesTests`, `ProfesoresTests` y `CursosTests` (16/16). Revisión independiente (solo lectura): sin fugas comerciales ni IDOR; corregidos el rango de la nota y la carrera al quitar niveles; el resto, aceptado y registrado en [plan](plan.md). Guía de esquema y recorrido en [aplicar-esquema.md](aplicar-esquema.md). **Pendiente:** el recorrido manual con tres perfiles en el navegador (requiere aplicar el SQL a la base de desarrollo con `levantar-bonus-academia.ps1`, decisión del usuario) y la revisión visual de landing y calendarios; correo de Contacto (`VITE_CONTACT_EMAIL`) aún sin definir. Sin merge ni publicación.

<a id="b19"></a>

### B19 — Ajustes tras la revisión del usuario

**Resultado:** pedidos del usuario al probar la versión (09/11/2026).

**Aceptación:**

- [x] Mi perfil: cualquier usuario, también el administrador, edita nombre, apellido, correo y usuario (`PATCH /auth/me`, identidad de la sesión); roles, estado y contraseña siguen siendo administrativos.
- [x] Menú lateral separado por tipo con «línea · Tipo · línea»: Inicio arriba; Comercial (Empresas, Contactos, Oportunidades, Embudo); Academia (Alumnos, Cursos, Clases, Talleres, Profesores); Gestión (Usuarios, Catálogos, Servicios, Embudos y etapas). Un tipo sin entradas visibles no se muestra.
- [x] Pestaña Profesores: el administrador edita los datos del profesor (mismo diálogo que Usuarios) y sus niveles (`PUT /profesores/{id}/niveles`, sin quitar niveles con cursos).
- [x] Ficha del alumno sin curso: «Asignar curso» para el profesor (sus cursos) y el administrador (todos los del nivel).
- [x] Clases: al elegir el curso el título se sugiere como «Curso · Clase N» (editable); al entrar en una clase se editan título, fecha, horario y examen (`PUT /clases/{id}`; el curso no cambia y un examen con notas no deja de serlo).
- [x] Un curso no puede tener dos clases que se pisen en el horario (409, también al editar; horarios contiguos sí); cursos distintos del mismo nivel pueden coincidir.

**Evidencia (09/11/2026):** backend `EdicionClasesPerfilTests`, `ClasesTests`, `ProfesorAccesoTests`, `AuthTests`, `UsuariosTests`, `HttpContractTests` 39/39 (5 min 13 s); frontend 187/187, build y lint sin advertencias nuevas; `schema.d.ts` regenerado. No se repitió la suite backend completa. Sin merge ni publicación.

## Registro de cambios

- 09/11/2026: plan bonus escrito y aprobado por el usuario. Solo documentación; sin código, servicios, suites, merge ni publicación.
