# T49.1 — Plan de rediseño visual y experiencia

Fecha: 10/11/2026. Dirección visual y elaboración del plan acordadas con el usuario. **R01–R11 completos.** Seguimiento de la tarea principal en [todo.md](todo.md#t49-1); el detalle y los checks de este archivo son la única lista de bloques de T49.1. Integración y publicación requieren autorización específica.

## Objetivo y referencias

Renovar landing, acceso y CRM para que Fluency se vea profesional, minimalista y agradable de usar en escritorio, con especial cuidado en tablas, fichas, embudo y animaciones. La referencia conceptual revisada por el usuario incluye inicio, empresas, ficha, embudo y landing; emplea un fondo carbón, superficies oscuras discretas y azul **#4575B2** seleccionado por el usuario. Las cifras y registros de esos prototipos son ficticios; sus botones, columnas, menú y textos no son una especificación funcional. Woker inspira la jerarquía, compacidad y agrupación, no su marca ni su contenido.

Observaciones del diagnóstico: inicio comercial con tres cifras y amplio espacio libre; listados con filtros que ocupan dos filas; embudo con estados vacíos repetidos y desplazamiento horizontal; landing con muchas tarjetas similares y bloques de iconos decorativos. No se pudo ver una tabla poblada en la instancia revisada. La renovación anterior T30b se revirtió por pantallas descentradas; centrar con relación al espacio realmente disponible junto al menú es requisito de aceptación.

## Decisiones de diseño y comportamiento

- **Visual:** solo oscuro, colores neutros carbón, superficies y bordes sutiles; #4575B2 como acento, con variantes accesibles para texto, foco y estados. El par blanco sobre #4575B2 alcanza aproximadamente 4,73:1; no reutilizar automáticamente el texto oscuro del prototipo en ese botón (aprox. 3,61:1). Verificar combinaciones reales, incluidos deshabilitado y foco. Conservar un tratamiento reconocible por etapa y sus nombres: la asignación actual usa `stageToneClass(index)` y cinco tonos; no sustituirla por un color fijo para todas las etapas ni asociar nombres configurables a colores rígidos.
- **Navegación:** «Fluency» sin isotipo en la esquina superior izquierda; Inicio y grupos Comercial, Academia y Gestión, sin grupo «Referencia» ni enlace a la landing en el shell. Los grupos con entradas permitidas son plegables y accesibles con botón, nombre, `aria-expanded` y `aria-controls`. Al entrar en una ruta, abrir su grupo si está cerrado para identificar la ubicación, sin impedir que el usuario lo cierre luego; estado en memoria por sesión de interfaz, sin persistencia nueva innecesaria. Mantener orden, destinos y filtrado por rol/permisos.
- **Cuenta:** mostrar una única entrada arriba a la derecha que abra un menú con «Mi perfil» y «Cerrar sesión». Conservar el mecanismo actual de `logout`, estado pendiente, gestión de error/sesión y retorno de foco; no alterar autenticación, identidad o permisos. Sin usuario ni cierre de sesión duplicados abajo a la izquierda.
- **Tablas y fichas:** mejorar tipografía, densidad, ancho, alineación, buscadores, filtros, estados, paginación y jerarquía; conservar todas las columnas y datos existentes (el prototipo abrevia campos por ilustración), ordenaciones, búsquedas y acciones reales. El enlace principal sigue accesible por teclado; los enlaces de correo, teléfono y relaciones conservan su destino. No hacer depender la información exclusivamente del color. Conservación de fechas, datos faltantes y valores reales.
- **Animaciones:** usar transiciones discretas y coherentes en plegado, menú de cuenta, botones, foco, diálogos y cambios de estado; feedback claro durante arrastre y al guardar. Preferir CSS/MUI ya presentes, propiedades como `opacity`/`transform` cuando corresponda y duraciones breves orientativas de 150–220 ms; el despliegue de secciones puede usar la transición existente de MUI. Sin cascadas repetitivas, flashes ni bloqueo de interacción. `prefers-reduced-motion` reduce o elimina movimiento no esencial sin esconder contenido; no retrasar estados de éxito/error. No incorporar una biblioteca de animación por defecto.
- **Escritorio:** validar al menos 1280×720 y 1920×1080 (o anchos disponibles equivalentes); sin objetivo nuevo de diseño para móviles por decisión del usuario, conservando comportamiento existente sin eliminar deliberadamente compatibilidad. Las tablas y el embudo pueden tener desplazamiento horizontal contenido; nunca cortar información ni desplazar la página completa indebidamente.
- **Alcance y autonomía:** conservar funcionalidades existentes. Se autorizan mejoras pequeñas de presentación e interacción necesarias para los objetivos, por ejemplo claridad de estados y controles plegables. Cambios grandes de producto, nuevos módulos, integraciones, nuevas reglas comerciales, operaciones masivas o cambios de API/esquema requieren propuesta y autorización específica. Reutilizar React/MUI y estilos existentes; no agregar dependencias por defecto.

## Invariantes y límites

1. Mantener rutas, controles por rol, sesión del servidor, identidad, protección de datos, mensajes de error, botones y capacidades actuales. No suprimir pruebas ni usar datos ficticios como datos reales. El Profesor conserva su inicio propio con cursos, alumnos, clases, exámenes y avisos; el comercial conserva sus tres cifras y consultas actuales.
2. Mantener `DndContext`, desplazamiento, plegado de etapas, selección de embudo/responsable, apertura de ficha y estados de carga/error. Arrastre por puntero y teclado, cancelación y anuncios accesibles siguen funcionando. Al soltar en etapa abierta se ejecuta el movimiento; al soltar en Ganada/Perdida se abre el diálogo de cierre con sus datos y validaciones. Respetar `accionesPermitidas` y etapas configurables. Conservar el reordenamiento de etapas de configuración.
3. Mantener filtros, paginación, validaciones, estados de carga/error/vacío y navegación existente en todos los módulos. No introducir operaciones supuestas por el mockup: por ejemplo, el botón de nueva oportunidad en el tablero no acredita que hoy exista allí; agregarlo solo si es una mejora pequeña y funciona con las mismas reglas y permisos.
4. Landing: preservar anclas útiles, acceso al login, enlace de contacto y redirección de sesión; usar solo capacidades reales. El correo de ejemplo pendiente no debe sustituirse por un dato inventado.
5. No escribir en producción ni usar Supabase para pruebas. Antes de API/base, comprobar destino y estado siguiendo `AGENTS.md` y `docs/segunda-entrega/entorno-local.md`; no aplicar migraciones B22, reconstruir bases ni eliminar recursos por inferencia. Usar datos locales de prueba autorizados o mocks para exploración visual.
6. La guía frontend anterior contiene valores visuales que este plan cambia: actualizar solo sus reglas de presentación vigentes al cierre, sin convertir afirmaciones funcionales históricas en requisitos nuevos ni sobrescribir decisiones académicas actuales.

## Orden, tareas y aceptación

Un responsable implementa, verifica y revisa su diff por bloque. Antes de cada bloque: leer `AGENTS.md`, `CONSTRAINTS.md` §§1–5, el seguimiento aplicable y las secciones pertinentes de la guía frontend; verificar `git status --short`, rama, dependencias y evidencia. Preservar archivos ajenos. Rutas indicativas: subdividir si el diff real supera unas cinco ubicaciones principales. La revisión es propia por bloque y agrupada en checkpoint para cambios habituales; si se modifica lógica de autenticación o autorización, aplicar revisión independiente según `tasks/plan.md` §6.1. Nada de cambios de código durante esta planificación.

### R01 — Línea de base y mapa de pantallas

- [x] Inventariar rutas y componentes en `frontend/src/App.tsx`, `app/AuthenticatedShell.tsx` y `features/`; identificar listados, fichas, formularios, diálogos, calendarios, configuración y sus pruebas, incluidos ambos inicios. Verificar estado de B22 y del entorno sin operar bases; documentar deuda o fallos previos con su identidad.
- **Depende de:** T49.1 iniciada. **Verificación:** lectura de rutas, controles existentes y capturas de referencia local seguras; registrar destino y limitaciones. **Revisión:** propia. **Tamaño:** S; documentación/evidencia.

### R02 — Tema y estilos base

- [x] Ajustar `app/providers.tsx`, `index.css` y estilos comunes al sistema oscuro y acento acordados; conservar colores semánticos, etapa, legibilidad y foco. Evitar duplicación nueva de valores cuando un token existente resuelve el caso.
- **Depende de:** R01. **Verificación:** revisión visual comparativa de botones, campos, tablas y alertas; contraste de pares usados; pruebas focalizadas afectadas y `npm run build` en `frontend`. **Revisión:** propia. **Tamaño:** S–M.

### R03 — Shell, grupos y cuenta

- [x] Aplicar shell compacto con marca textual, grupos plegables y menú de cuenta superior. Conservar enlaces, filtros por permisos y comportamiento de sesión; abrir grupo de ruta activa sin dejar atrapado el foco. Teclado abre/cierra controles y Escape cierra el menú de cuenta con retorno de foco; ocultar grupos vacíos.
- **Depende de:** R02. **Archivos probables:** `app/AuthenticatedShell.tsx`, tests de App/shell y estilos si hacen falta. **Verificación:** pruebas de apertura/cierre, navegación directa, perfil, logout y visibilidad por rol; recorrido manual administrador, vendedor y profesor. Si cambia lógica de sesión/autorización, revisión independiente. **Tamaño:** M.

### R04 — Piloto de Empresas y tablas compartidas

- [x] Rediseñar encabezado, filtros, tabla y paginación de Empresas, preservando columnas, búsqueda y acciones. Trabajar sobre estados con datos, vacíos, filtros, carga y error; comprobar textos largos. Reutilizar estilos compartidos solo si mantienen el comportamiento de sus consumidores.
- **Depende de:** R02–R03. **Archivos probables:** `features/companies/CompaniesPage.tsx`, `companies.css` y tests existentes. **Verificación:** pruebas focalizadas de Empresas; inspección en 1280/1920 y con zoom, teclado y datos ficticios locales. **Revisión:** propia; contraste visual con el prototipo aprobado. **Tamaño:** M.

### R05 — Otros listados comerciales y académicos

- [x] Aplicar criterios del piloto a Contactos, Oportunidades y Alumnos, sin perder columnas, filtros, orden, accesos o paginación. Subdividir por pantalla si excede el tamaño; revisar tablas embebidas en detalles de cursos y configuración.
- **Depende de:** R04. **Archivos probables:** `features/contacts`, `features/opportunities`, `features/students`, estilos y tests pertinentes. **Verificación:** tests focalizados por listado y revisión de datos largos, enlaces y estados. **Revisión:** propia por pantalla. **Tamaño:** M por subbloque.

### R06 — Fichas, formularios y diálogos

- [x] Actualizar componentes compartidos `RecordProfile`, `RecordForm`, `CommercialHistory` y consumidores de empresa/contacto/oportunidad/alumno; revisar además diálogos y formularios particulares. Mantener campos, validaciones, permisos, mensajes, navegación, acciones e historial; no esconder información ni convertir valores de solo lectura en campos editables. Subdividir por ficha/flujo.
- **Depende de:** R02–R05. **Verificación:** tests de fichas, formularios y actividad afectados; recorrido de edición con errores, guardado y cancelación en entorno local autorizado. **Revisión:** propia por subbloque. **Tamaño:** M por flujo.

### R07 — Embudo y animación del arrastre

- [x] Adaptar `features/funnel/FunnelPage.tsx` y `funnel.css`: columnas compactas, cabeceras, conteos y tarjetas del prototipo; conservar tonos por etapa, despliegue, desplazamiento contenido y todos los invariantes del punto 2. El estado visual de origen, destino, arrastre y error debe ser claro; sin desplazar ni interceptar el foco o el puntero.
- **Depende de:** R02–R03. **Verificación:** `npm run test:run -- src/features/funnel/FunnelPage.test.tsx` y pruebas de cierre afectadas; recorrido local de arrastrar entre abiertas, cancelar, soltar en finales y cumplir permisos, con ratón y teclado; movimiento reducido. **Revisión:** propia del diff y checkpoint funcional. **Tamaño:** M.

### R08 — Inicio comercial, Profesor y módulos académicos

- [x] Adaptar ambos inicios a la jerarquía visual acordada sin cifras inventadas ni pérdida de consultas. Aplicar el sistema a Cursos, Clases, Talleres, Profesores, calendario y asistencia; incluir estados, botones y diálogos. Dividir por módulo; respetar permisos y visibilidad.
- **Depende de:** R02–R03. **Verificación:** tests focalizados de cada módulo e inicios; recorrido local con profesor y administrador, calendario/lista, asistencia y estados vacíos/error. **Revisión:** propia por bloque. **Tamaño:** M por módulo.

### R09 — Configuración y perfil

- [x] Adaptar usuarios, catálogos, servicios, embudos/etapas y perfil al sistema visual. Conservar manejo de niveles, habilitaciones, orden de etapas, validación y acciones por permiso. Subdividir en perfil/usuarios y catálogos/embudos si hace falta.
- **Depende de:** R02–R03. **Verificación:** tests focalizados correspondientes y recorrido local del orden de etapas con ratón y teclado. **Revisión:** propia; independiente si cambia seguridad/autorización. **Tamaño:** M por subbloque.

### R10 — Landing y acceso

- [x] Rediseñar `features/landing/LandingPage.tsx` y `features/login/LoginPage.tsx` con identidad compartida, composición más editorial y menos bloques repetidos. Conservar capacidades reales, textos relevantes, anclas, destino de contacto, redirecciones y manejo de errores; no introducir promesas, datos o correo ficticio nuevos. Dividir landing y login si hace falta.
- **Depende de:** R02. **Verificación:** tests existentes de landing/login y recorrido visual en escritorio; revisar centrado del login y sección hero; teclado y foco. **Revisión:** propia; independiente si cambia lógica de sesión. **Tamaño:** S–M por pantalla.

### R11 — Movimiento transversal y cierre

- [x] Homogeneizar duración y respuesta de interacciones ya tocadas; revisar movimiento reducido, estados de carga y continuidad visual. Evitar alterar comportamiento por decoración o sumar dependencia.
- [x] Ejecutar `npm run test:run`, `npm run build` y `npm run lint` desde `frontend`; registrar resultados reales, fallos previos/nuevos y controles no ejecutados. Aplicar `git diff --check` e inspeccionar también archivos nuevos y staged; revisar que no se pierdan funcionalidades.
- [x] Recorrido local con los perfiles existentes: navegación/cuenta, filtros y fichas, movimientos del embudo, inicio de Profesor, calendario y landing; comparar centrado y legibilidad en dos tamaños de escritorio. Registrar evidencia visual sin datos sensibles y pendientes. Actualizar solo reglas visuales vigentes de la guía frontend y seguimiento de T49.1.
- **Depende de:** R04–R10. **Revisión:** propia por bloque y agrupada al cierre, independiente si cambió autenticación/autorización u otro riesgo definido en §6.1. **Tamaño:** subdividir movimiento, controles y documentación.

## Checkpoints y entrega

- **CP visual:** tras R03–R04, comparar shell y Empresas con los prototipos y validar contraste, centrado y funcionalidad antes de propagar el patrón. La revisión del usuario es conveniente, no una autorización obligatoria para cada bloque.
- **CP funcional:** tras R05–R09, comprobar recorridos comerciales y académicos y preservación del drag & drop y permisos. Registrar limitaciones en vez de presentar controles omitidos como aprobados.
- **Cierre:** R10–R11 y evidencia consolidada. Presentar diff, controles, riesgos y pendientes. Cada merge y publicación requiere OK específico posterior; el OK de implementación no lo sustituye. No trabajar sobre `main` ni publicar por iniciativa propia.

## Decisiones pendientes y supuestos

- La densidad final de tablas y el acento se contrastarán con datos ficticios largos; conservar #4575B2 como ancla y ajustar tonos de texto/foco para contraste.
- Las pantallas del prototipo son orientación visual, no comportamiento probado ni autorización para quitar campos o agregar funciones comerciales.
- La validación de la instancia publicada y el estado de la migración B22 no se deducen del merge Git. Comprobar destino y autorización antes de cualquier operación de base.
- El esfuerzo exacto depende del inventario de R01; no se promete una duración sin medir. Si aparece una mejora de producto grande, describir alcance y pedir autorización antes de implementarla.


## Evidencia de ejecución — 10/11/2026

- **R01, línea de base:** `cambios-ui-ux` limpia al iniciar, en `f98e613`; `a9e9482` (B22) es ancestro. Mapa contrastado con `App.tsx`: landing y acceso; dos inicios y perfil; empresas, contactos y oportunidades con listados/fichas/alta/edición, actividades e historial; embudo y diálogos; alumnos, cursos, clases, talleres y profesores; usuarios, catálogos, servicios y etapas. Sus pruebas están en `App.test.tsx` y junto a cada feature. No se generó una nueva captura del estado previo al cambio.
- **R02–R06 y R08–R10:** CSS compartido y tema MUI; tabla de Empresas con búsqueda en una fila a 1280 px y datos ficticios largos, con ajuste de teléfonos tras revisar la primera captura. Chrome a 1280×720 y 1920×1080 para Empresas, landing y acceso; centrado de Empresas medido respecto de `main` a 1920. Contrastes calculados: blanco sobre acento 4,73:1; azul claro sobre superficie 9,07:1; texto secundario sobre campo 9,04:1; borde de campo sobre campo 3,80:1.
- **R03 y entorno:** PostgreSQL local en 5433, base `fluency_segunda_entrega_dev`; API en loopback en perfil Development. Servicios, tipos y embudos respondieron con el esquema B22 ya disponible; no se aplicó ninguna migración. Chrome inició sesión real de administrador, abrió 13 pantallas comerciales, académicas y de gestión a 1280 sin desplazamiento horizontal de página ni alertas de error, y comprobó perfil y cierre de sesión. La prueba focalizada cubrió plegado con Enter/Espacio y cierre con Escape con devolución de foco.
- **R07:** una oportunidad de prueba identificada como «Prueba visual T49.1» en desarrollo. Chrome con eventos de navegador comprobó inicio y cancelación del arrastre con teclado, movimiento con puntero entre etapas abiertas y apertura y cancelación del diálogo al soltar en Perdida. Las pruebas de embudo y cierre también cubren permisos y rechazo del servidor. La oportunidad de prueba quedó en la base local para inspección.
- **R11, controles:** suite frontend 194/194, más la prueba de teclado agregada y pasada en la repetición focalizada de `App.test.tsx` (16/16). Build y `git diff --check` correctos. Lint solo con la advertencia preexistente de Fast Refresh en `providers.tsx`. No se ejecutó la suite backend: la implementación no cambia su código, contratos ni esquema.
- **Cierre de R11 en Chrome local:** Profesor vio el inicio académico, cursos, clases y alumnos. Vendedor vio el inicio comercial y su cartera en el embudo. Las rutas fuera de cada perfil redirigieron al inicio. Se confirmó el traslado por teclado con Espacio, flechas y Espacio, incluida la persistencia. En el editor de etapas, la flecha reordenó el borrador, conservó el foco y dejó intactas las etapas finales. La recarga descartó el borrador; el guardado del orden se cubrió en las pruebas automatizadas. Con movimiento reducido, las transiciones de navegación bajaron a 0,01 ms.
- **Datos y recorrido de cierre:** en desarrollo se usaron un alumno, un curso y una clase ficticios. Profesor marcó Presente desde la planilla y la marca se mantuvo al recargar. La clase apareció en calendario y lista, y la lista abrió su ficha. En Empresas se comprobó búsqueda sin resultados, limpieza de filtros y apertura de ficha. Los datos de prueba quedaron identificados en desarrollo. Los recorridos no requirieron cambios adicionales de producto ni repetir las suites. Sin integración, push ni publicación.
