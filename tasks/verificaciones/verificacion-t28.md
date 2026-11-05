# Verificación T28: modelo e historial de oportunidades

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`, commit `0badcd9`. Sin merge ni push.

## Alcance

- `Oportunidad` y `HistorialEtapa` reflejan el esquema objetivo (`oportunidad`, `historial_etapas`). Embudo, servicio y estado no se persisten: se derivan de la etapa (`IdEtapaNavigation` → embudo → servicio / estado). Todas las FK del módulo son `Restrict`.
- Retirados `OportunidadItem`, `LogOportunidadCambio`, sus `DbSet` y navegaciones, y el servicio, interfaz, contratos y controlador heredados (el controlador ya estaba fuera de la API y no tenía consumidores; T29 crea los nuevos). Registro DI y entrada de `RetiredControllers` eliminados.
- `EmpresaService.DeleteAsync` y `ContactoService.DeleteAsync` cuentan oportunidades activas con EF dentro de la misma transacción Serializable, en lugar del SQL provisional.
- Obligaciones de la revisión de CP09: el chequeo contacto-empresa del servicio antiguo desaparece con él. Queda para **T29** exigir empresa y contacto activos y escribir en transacción Serializable.

## Resultados

- `dotnet build backend/FluencyAPI.slnx --no-restore -m:1`: 0 errores, 0 advertencias.
- `OportunidadesModelTests` **2/2** (36 s): lectura con estado/servicio/embudo derivados; ausencia de propiedades `IdServicio`/`IdEstado`/`IdEmbudo` y de las entidades retiradas; FK restrictivas; `numeric(12,2)` en 0 y 9999999999,99; `DateOnly` y `timestamptz` UTC; campos académicos opcionales; historial inicial con etapa anterior null y segundo registro con anterior; borrado de oportunidad/etapa con historial rechazado (23503); 6 índices `ix_oportunidad_*` y 4 `ix_historial_*`.
- Backend completo **140/140**, cero omitidas, 7 min 13 s (138 previos + 2).
- Git: `git diff --check` limpio.

## Entorno

- Docker estaba detenido al comenzar (puerto 5433 cerrado): los tests fallaban al conectar, antes de ejecutar código propio. El usuario lo levantó. El contenedor actual tiene un ID distinto al documentado en `entorno-local.md`; las guardas de identidad del fixture validaron la base de tests y el destino sigue siendo local.

## No ejecutado

- Frontend, auditorías de dependencias y Gitleaks: sin cambios en frontend ni manifiestos.
- Revisión independiente: solo revisión propia del diff; se hará con la revisión de CP10.
