# Mapa de capacidades: segunda entrega

Estado al 22/10/2026: planificación aprobada y cerrada. T01–T15/CP01–CP05 integradas localmente en `segunda-entrega`, con CP05 validada por el usuario; sin publicar. T16–T18 implementadas/verificadas en `segunda-entrega-cp06-servicios`: mapeos de servicio/embudo/etapa y administración de servicios con precio decimal/cero y referencias inactivas conservadas, sin modificar embudos al desactivar. Backend122/122 más comprobación focalizada posterior 1/1; frontend99/99. [Evidencia CP06](tasks/verificaciones/verificacion-cp06.md); validación del usuario confirmada el 22/10/2026; implementación de CP06 cerrada e integración pendiente. Gestión de embudos/etapas y T19+ no iniciadas. El [seguimiento](tasks/todo.md) conserva el estado verificable.

Fuentes: [diseño](docs/segunda-entrega/diseño-segunda-entrega.md), [decisiones confirmadas](docs/segunda-entrega/decisiones-confirmadas.md), [contexto](docs/segunda-entrega/contexto-segunda-entrega.md) y [constraints](CONSTRAINTS.md).

La validación anterior de CP03 se conserva sin repetirla. CP04 reutiliza cookie/antiforgery/actor del servidor y añade sus consumidores de UI y cuentas; las pantallas comerciales retiradas siguen sin publicarse. CP05 reutiliza esos controles para catálogos; su implementación no autoriza integrar la rama.

| ID estable | Responsabilidad | Depende de |
|---|---|---|
| `acceso` | Autenticación, administrador inicial, usuarios, roles y autorización por acción/propiedad. | — |
| `configuracion-comercial` | Servicios, embudos, etapas y catálogos configurables. | `acceso` |
| `clientes` | Empresas, contactos, responsables y asociaciones históricas. | `acceso`, `configuracion-comercial` |
| `oportunidades` | Negociaciones, consultas, tabla/funnel, transición/cierre/reapertura, bajas e historial de etapas. | `acceso`, `configuracion-comercial`, `clientes` |
| `actividades` | Interacciones e historial comercial que se presenta en fichas de clientes y oportunidades. | `acceso`, `configuracion-comercial`, `clientes`, `oportunidades` |

Orden de referencia: acceso → configuración comercial → clientes → oportunidades → actividades. El plan enlazado organiza incrementos verificables; este orden no obliga a construir todo el backend antes del frontend.

Se conserva una aplicación React y una API ASP.NET Core con los proyectos actuales. Cada módulo comprende su API, persistencia, UI y verificación; no implica microservicios, nuevos proyectos por módulo ni paquetes de infraestructura.

El historial de etapas pertenece a `oportunidades`. `actividades` compone la lectura del historial comercial y agrega su presentación a las fichas ya existentes: las entidades de clientes no dependen del servicio de actividades para sus altas/ediciones. Las validaciones referenciales de bajas se resuelven con consultas de persistencia y no requieren dependencias circulares entre servicios.

## Índice de especificaciones

Leer primero [las decisiones técnicas comunes](docs/segunda-entrega/especificacion-tecnica.md). Sus contratos, estructura, estilo, comandos y límites forman parte de cada especificación de módulo.

| Módulo | Especificación |
|---|---|
| Acceso | [SPEC-acceso.md](SPEC-acceso.md) |
| Configuración comercial | [SPEC-configuracion-comercial.md](SPEC-configuracion-comercial.md) |
| Clientes | [SPEC-clientes.md](SPEC-clientes.md) |
| Oportunidades | [SPEC-oportunidades.md](SPEC-oportunidades.md) |
| Actividades | [SPEC-actividades.md](SPEC-actividades.md) |
