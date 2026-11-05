# Verificación T30c: landing pública

> **Revertida el 05/11/2026 a pedido del usuario:** las pantallas se veían descentradas. T30c ya no está en el código; esta nota queda como registro histórico. Se conservaron el título opcional (T30a), el subtítulo de cliente en la ficha, la tabla de contactos sin anchos fijos, el centrado de la frase del login y los avisos de sesión flotantes.

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `/` muestra `LandingPage` (pública). Una sesión activa va directo a `/inicio`; las rutas protegidas siguen redirigiendo a `/login`.
- Estructura inspirada en la referencia indicada (barra superior con acciones, hero con etiqueta y producto, bloques numerados, pasos, preguntas frecuentes y cierre con llamada a la acción), con diseño y textos propios: barra con marca, anclas y «Iniciar sesión» / «Registrarse»; hero con titular, bajada, ambos botones y una maqueta decorativa del tablero (HTML/CSS, sin imágenes externas); franja de módulos; tres bloques de propuesta de valor; tres pasos; preguntas frecuentes (acordeón MUI); cierre; pie. Responsive (una columna bajo 980 px, anclas ocultas bajo 720 px).
- **Iniciar sesión** lleva a `/login`. **Registrarse** no tiene flujo: las cuentas las crea un administrador (SPEC de acceso), así que el botón solo muestra un aviso flotante («El registro todavía no está habilitado…») y no llama a la API.
- Los textos describen el alcance completo planeado del producto (p. ej. historial, cierre y reapertura), parte del cual llega en T31–T45.

## Resultados

- `App.test.tsx` 18/18 (3 casos de landing: raíz con login y registro, registro sin llamadas a la API, sesión activa → inicio; y el aviso flotante). Frontend completo **120/120**, build correcto, lint solo con la advertencia previa.

## Pendiente

- Revisión visual del usuario (sin herramienta de navegador en la sesión).
