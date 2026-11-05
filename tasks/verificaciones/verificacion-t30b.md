# Verificación T30b: renovación de la apariencia

> **Revertida el 05/11/2026 a pedido del usuario:** las pantallas se veían descentradas. T30b ya no está en el código; esta nota queda como registro histórico. Se conservaron el título opcional (T30a), el subtítulo de cliente en la ficha, la tabla de contactos corregida y el centrado de la frase del login; el aviso de sesión flotante se retiró después. Detalle en [verificacion-t30a.md](verificacion-t30a.md).

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`, commit `0998eeb`. Sin merge ni push.

## Alcance

Se conserva MUI, el tema oscuro, la tipografía Source Sans 3, las rutas, los textos accesibles y los flujos. No se agregan dependencias.

- Paleta y medidas en un solo lugar: variables CSS en `index.css` (`--bg`, `--surface*`, `--border*`, `--text*`, `--accent*`, `--radius*`, `--shadow`) y el tema de MUI en `app/providers.tsx` (constante `palette`, con comentario que remite a las variables). Los ~20 colores fijos de los CSS pasaron a variables.
- Aspecto: superficies más profundas y bordes suaves; acento turquesa más vivo; radios de 10–14 px y sombras discretas; tablas dentro de una tarjeta, alineadas a la izquierda y con cabecera en versalitas; fichas y secciones de formulario como tarjetas; chips redondeados; listas móviles como tarjetas; diálogos, menús y popovers con borde; botones y campos con transiciones y anillo de foco; menú lateral con marca, ítem activo en píldora y borde derecho; login con degradado sutil.

## Resultados

- Frontend completo **116/116**, build correcto, lint solo con la advertencia previa de `providers.tsx`. Hubo un error de tipos propio (`containedPrimary` ya no existe en MUI 9) corregido antes del commit.

## Pendiente

- **Revisión visual del usuario en el navegador.** No hay herramienta de navegador en esta sesión: los resultados anteriores prueban compilación y comportamiento, no apariencia. Los ajustes finos se hacen cambiando las variables de `index.css` y la constante `palette`.
- Pantallas aún sin ver renderizadas: login, inicio, listados, fichas, formularios, configuración.

## Ajustes tras la revisión visual del usuario (05/11/2026)

El usuario aprobó el aspecto general y pidió cuatro correcciones, hechas en el commit siguiente al de T30b:

- **Login:** la frase de marca queda centrada verticalmente en su panel (grilla de tres filas) en lugar de pegada abajo.
- **Avisos de sesión:** el error, «Comprobando sesión…» y «Reintentar sesión» de `AuthContext` flotan sobre la pantalla (`position: fixed`, por encima del contenido) y ya no desplazan nada. El error de credenciales del propio formulario de login sigue dentro de la tarjeta del formulario.
- **Tablas responsive:** la tabla de contactos tiene 8 columnas pero las reglas de ancho fijo en porcentaje solo cubrían 7, así que «Responsable» quedaba sin espacio y con `overflow-wrap: anywhere` se partía letra por letra. Se quitaron todos los anchos por columna (contactos, oportunidades, empresas), las tablas pasan a diseño automático con ancho mínimo y el contenedor se desplaza en horizontal cuando no entran; las celdas solo parten palabras que no caben. Las empresas ya cambiaban a tarjetas en móvil; contactos y oportunidades se desplazan en horizontal.
- **Landing (T30c):** ver [verificacion-t30c.md](verificacion-t30c.md).

Resultados: frontend completo 120/120, build correcto, lint solo con la advertencia previa. **Sigue pendiente la revisión visual de estos cuatro ajustes.**
