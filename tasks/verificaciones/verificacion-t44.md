# Verificación T44: historial comercial combinado

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `GET /empresas/{id}/historial-comercial`, `GET /contactos/{id}/historial-comercial` y `GET /oportunidades/{id}/historial-comercial` (lectura compartida por todo usuario activo; `page`, `pageSize`, `desde` inclusivo, `hasta` exclusivo). Es una proyección, no una tabla: `HistorialComercialItem` con `tipo` ACTIVIDAD (tipo, descripción, resultado, fecha del hecho y de registro) o TRANSICION (etapa anterior y nueva, observación), `idOrigen`, autor, oportunidad con su título visible y asociaciones.
- Actividades y transiciones se unen en SQL (UNION ALL) antes de contar y paginar; orden fecha descendente, tipo e ID de origen descendentes. Las actividades de un cliente usan sus FKs directas (una con empresa y contacto aparece una sola vez); el contacto no incluye lo de su empresa actual y un cambio de empresa del contacto no mueve la historia. Las transiciones son las de las oportunidades vigentes asociadas directamente.
- Contextos vigentes: una empresa, contacto u oportunidad dados de baja responden 404 (sin papelera ni recuperación); las transiciones de una oportunidad dada de baja dejan de usarse, pero su actividad sigue apareciendo en los clientes vigentes asociados; una actividad dada de baja desaparece de todas las vistas.
- `HistorialComercialService` registrado en `Program.cs`; controlador propio con rutas absolutas.

## Resultados

- Build: 0 errores, 0 advertencias.
- `HistorialComercialTests` 1/1 y `HttpContractTests` 19/19 (70 acciones): **20/20** en 3 min 59 s. El caso cubre: unión y orden con un empate exacto actividad/transición (desempata el tipo), actividad por empresa y contacto sin duplicar, contacto sin lo de la empresa, paginación por tres páginas intercaladas igual a la lista completa con el mismo total, fechas inclusivas y exclusivas sobre ambas fuentes, cambio de empresa A→B del contacto, oportunidad dada de baja (actividad que sigue visible, 404 de su historial), actividad dada de baja, empresa dada de baja y parámetros inválidos.
- No se repitió la suite backend completa (último cierre CP13, 163/163).

## Límites y pendientes

- La presentación en las fichas llega con T45. Revisión independiente, auditorías y recorrido manual pendientes.
