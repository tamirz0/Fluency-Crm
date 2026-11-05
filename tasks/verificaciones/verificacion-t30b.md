# Verificación T30b: renovación de la apariencia

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
