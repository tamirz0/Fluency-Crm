# Verificación T40: mapeo de actividades realizadas

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `Actividad` (tabla `actividad`) reemplaza al modelo anterior `ActividadOportunidad`: catálogo `TipoActividad` por `IdTipo`; autor `IdUsuario`; relaciones directas opcionales `IdEmpresa`, `IdContacto` e `IdOportunidad` (el CHECK de la base exige empresa o contacto); `FechaHora` (cuándo ocurrió) separada de `FechaRegistro` (default `CURRENT_TIMESTAMP` en la base); `Descripcion` obligatoria; `Resultado` opcional; `Activo`. Todas las FKs son `Restrict`: sin cascadas.
- Sin agenda, estado de tarea ni autor/fecha de modificación o baja. Las navegaciones de `Empresa`, `Contacto`, `Oportunidad`, `Usuario` y `TipoActividad` pasan a `Actividades`; el `DbSet` es `Actividades`. Ningún consumidor usaba el modelo anterior (el esquema objetivo y su SQL ya contenían `actividad`).

## Resultados

- Build: 0 errores, 0 advertencias.
- `ActividadesModelTests` 2/2 (mapeo, nulabilidad, FKs sin cascada, ausencia de campos de agenda/auditoría; lectura y escritura en UTC con una llamada de ayer cargada hoy —ambas fechas separadas—, relaciones directas y rechazo en la base de una oportunidad sin cliente, una descripción en blanco y un autor inexistente). Junto con `OportunidadesModelTests`, `ClientesModelTests` y `SchemaTests`: **25/25** en 2 min 10 s.
- No se repitió la suite backend completa (el último cierre es CP13, 163/163, anterior a este cambio); el cambio solo toca el modelo de actividades.

## Pendientes

Revisión independiente, auditorías y recorrido manual quedan para el cierre del módulo de actividades.
