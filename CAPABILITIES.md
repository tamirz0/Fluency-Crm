# Mapa de capacidades: segunda entrega

Estado al 12/10/2026: mapa, especificaciones técnicas y plan aprobados explícitamente por el usuario el 08/10. Planificación cerrada; T01–T08, CP01 y CP02 integradas localmente en `segunda-entrega`; CP02 en `c363670`, T07 en `10d8a0a` y T08 en `942e23d`, con autorización del usuario el 12/10/2026: administrador por comando explícito, sin HTTP/DDL, backend 82/82 y controles locales de CP02 completos. El usuario confirmó conexión Supabase, creación del administrador y reejecución sin cambios; CP02 cerrado. TLS efectivo no verificado. T07 integrada en `10d8a0a`; T08 integrada tras 44/44 y reviewer aprobado. T09 implementada/verificada en su rama (backend114/114, frontend86/86); CP03 con verificación técnica/reviewer completos y pendiente de validación del usuario, sin merge autorizado. T10 no iniciada. La cuenta de desarrollo aún no se creó y la sesión HTTP está implementada y verificada en T08; transporte implementado en T09 y login UI pendiente de T10. El [plan aprobado](tasks/plan.md) y las [tareas verificables](tasks/todo.md), con la evidencia funcional Supabase registrada, guían la ejecución.

Fuentes: [diseño](docs/segunda-entrega/diseño-segunda-entrega.md), [decisiones confirmadas](docs/segunda-entrega/decisiones-confirmadas.md), [contexto](docs/segunda-entrega/contexto-segunda-entrega.md) y [constraints](CONSTRAINTS.md).

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
