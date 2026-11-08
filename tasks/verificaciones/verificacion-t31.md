# Verificación T31: consulta de oportunidades e historial de etapas

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `GET /oportunidades`: todas las vigentes (lectura compartida), paginación común; filtros `q`, `idResponsable`, `idEmpresa`, `idContacto`, `idEmbudo`, `idEtapa`, `estado` (solo `ABIERTA|GANADA|PERDIDA`, si no 400), `idOrigen`. Filtros y búsqueda se aplican antes de contar y paginar; orden creación e ID descendentes. La búsqueda ignora mayúsculas y tildes y recorre título, razón social y nombre/apellido del contacto. Los filtros se combinan con AND: los incompatibles dan un conjunto vacío.
- Cada elemento trae `accionesPermitidas` calculadas para el actor (igual que el detalle).
- `GET /oportunidades/{id}/historial-etapas`: paginado por fecha e ID ascendentes, con etapas anterior/nueva (nombres), autor y observación; 404 si la oportunidad no existe o está dada de baja. Sin endpoints de edición (POST/DELETE → 405).
- `GET /embudos/{id}/funnel` (implementado en `OportunidadesController`): columnas activas del embudo ordenadas por `orden`/ID (también vacías y finales) con sus oportunidades vigentes (mismo DTO que el listado, sin historial). Vendedor sin rol superior: siempre su cartera; el `idResponsable` enviado se ignora. Administrador/responsable comercial: todas, con filtro opcional. Un embudo inactivo se consulta y devuelve `activo=false`; inexistente → 404. La tabla global no se ve afectada.
- Decisión: el orden de las columnas es el configurado (`orden`); la UI (T33) decide cómo presentar las finales.

## Resultados

- Build: 0 errores, 0 advertencias.
- `ConsultaOportunidadesTests` **3/3** (lista: lectura compartida, orden, paginación, búsqueda con tildes, filtros individuales e incompatibles, parámetros inválidos; historial: orden con empate por ID, paginación, 404, solo lectura; funnel: columnas vacías/finales, filtro de superior, cartera forzada del vendedor, etapa inactiva, embudo inactivo, 404/400). Un primer fallo fue un error de la propia prueba (el responsable de la oportunidad comparada era el vendedor); se corrigió la aserción, no el producto.
- `HttpContractTests` + `AltaOportunidadTests` **26/26** (7 min 28 s). Cambio legítimo del contrato de rutas: 52→55 acciones, rutas `/embudos/{id}/funnel` y `/oportunidades/{id}/historial-etapas` añadidas a la lista esperada.
- `AltaOportunidadTests.Seed`/`SeedAsync` pasaron de `private` a `internal` para reutilizar el fixture.

## Límites y pendientes

- Suite backend completa no repetida (queda para el cierre del módulo); frontend no tocado. `schema.d.ts` se regenera en T32 con su consumidor.
- Revisión independiente pendiente (revisión propia del diff).
