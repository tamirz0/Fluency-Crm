# Plan express pre-entrega — Ultimo refinamiento

## 1. Objetivo y presupuesto

Tarea [T48,5 — Ultimo refinamiento](todo.md#t48-5). Fecha: 08/11/2026. Estado (09/11/2026): **E0b, E1, E2 y E3 implementados y verificados con pruebas (frontend 155, backend 174); pendientes el recorrido manual en la app real, la preparación T49 y el OK de integración**.

Llegar al jueves **12/11/2026** con una demo estable. Terminar funcionalidades el martes **10/11** y dedicar el miércoles **11/11** al cierre. Presupuesto confirmado: **8 horas-persona totales entre Mateo y Lautaro hasta el miércoles**, no ocho por persona ni por día. Trabajar simultáneamente no duplica ese presupuesto. Según el usuario, Profesor, cursos y asistencia aportan valor pero no son requisitos explícitos de la cátedra.

Objetivo: verificar el circuito comercial existente y agregar un inicio útil con métricas reales. El dashboard es recortable; estabilidad y verificación son obligatorias. Esta documentación no acredita implementación ni autoriza merge/publicación.

Complementa el [plan anterior](plan.md), sin reemplazarlo. Rigen [AGENTS.md](../AGENTS.md), [CONSTRAINTS §§1–5](../CONSTRAINTS.md), [plan §6.1](plan.md#61-metodología-de-agentes-acordada) y [entorno local](../docs/segunda-entrega/entorno-local.md). Sin dependencias nuevas, infraestructura, rediseño general ni cambios de esquema para el dashboard.

## 2. Base inspeccionada y reutilización

Inspección de solo lectura del 08/11/2026: rama `segunda-entrega-final`, HEAD `47fbda6`; árbol limpio antes de documentar. El código coincide con `master` local `aeb41af`; solo difiere `CLAUDE.md`. No se consultó el estado remoto actual. El usuario informa proyecto publicado y mergeado a `master`; no se verificó el despliegue.

| Área | Estado y reutilización |
|---|---|
| Arquitectura | React/TypeScript/Vite/MUI, cliente HTTP y React Query; API ASP.NET Core, servicios y EF Core/PostgreSQL. Mantener patrones actuales. |
| Clientes/comercial | Empresas/contactos con estado y listados con `TotalCount`; servicios con nivel opcional, embudos, oportunidades, actividades e historial. Reutilizar contactos; no crear Alumno ni reinterpretar Servicio como Curso. |
| Inicio | `frontend/src/App.tsx`, `AccessHome`: solo saludo; faltan métricas. |
| Ganar | `backend/Services/Implementations/OportunidadService.cs`, `CloseAsync`/`PromoverAClienteAsync`: empresa/contacto Potencial pasan a Cliente dentro de la transacción. Respeta otros estados y reabrir no revierte. Requiere estados configurados y Cliente activo. Prueba específica en `backend/FluencyAPI.Tests/CierreTests.cs`. |
| Arrastre | `frontend/src/features/funnel/FunnelPage.tsx` infiere resultado desde la columna; servidor resuelve etapa. `CloseOpportunityDialog.tsx` todavía permite cambiar resultado, sin pedir etapa destino. |
| Acceso | Cookie, antiforgery, actor del servidor y tres roles fijos. Usuarios tiene edición administrativa, no perfil propio editable. |
| Académico | Sin entidades/API/pantallas de cursos, clases, asistencia o exámenes. Profesor exige revisar consultas comerciales hoy compartidas entre autenticados. |

La [evidencia T48](../docs/segunda-entrega/verificacion-final-local.md) registra 172 pruebas backend, 151 frontend y recorridos manuales aprobados el 08/11. Es histórica, no una ejecución nueva ni prueba del despliegue actual. T48/CP16 siguen cerradas; T48,5 exige evidencia posterior para sus cambios.

## 3. Prioridades y exclusiones

| Pedido | Decisión | Motivo / condición |
|---|---|---|
| Circuito comercial | Obligatorio verificar | Defectos fundamentales desplazan mejoras. |
| Potencial → Cliente al ganar | Verificar lo existente | No rehacerlo; comprobar actualización visible de ficha y métricas. |
| Inferir resultado por arrastre | Verificar lo existente | Ya funciona. Simplificar selector redundante es extra 1. |
| Combo «Tipo de actividad» vacío al registrar actividad (defecto reportado 09/11) | Obligatorio corregir | Defecto del circuito comercial. Causa: `/catalogos/tipos-actividad/opciones` devuelve `nombre` con `descripcion: null` y el combo solo leía `descripcion`; el test lo enmascaraba con un fixture irreal. |
| Dashboard | Mejora principal, recortable | Tres tarjetas según §4; reducir a dos/inicio actual según §6. |
| Tres clases de hoy y ver más | Fuera | Depende de módulo inexistente; sin datos ficticios. |
| Perfil | Extra de consulta | Extra 2; edición propia postergada por contrato/validaciones nuevos. |
| Cambios sin guardar | Postergado | No hay guard central; navegación interna, recarga y cierre requieren controles distintos. No declarar global una solución parcial. |
| Cursos por nivel, grilla, ficha y alumnos Cliente | Postergado | Modelo Curso/Inscripción, integridad, API y UI nuevos. |
| Candidatos por oportunidad/nivel | Postergado con cursos | Nivel opcional en Servicio; oportunidad de empresa no identifica alumnos individuales. |
| Clases: título, horario, curso, profesor, lista/calendario | Postergado | Depende de cursos/asignaciones. Futuro: lista antes que calendario. |
| Asistencia y total por alumno | Postergado | Inscripciones/clases y reglas de ausente, sin registrar y denominador histórico. |
| Exámenes y notas | Postergado | Reglas de escala, carga, consulta y persistencia nuevas. |
| Profesor en Usuarios, niveles desde perfil y acceso restringido | Postergado | Autorización transversal en servidor, navegación y relaciones nuevas. |
| Admin ve todas las clases; pestaña Profesores con cantidades | Postergado | Depende del circuito académico anterior. |
| Renombrar globalmente clientes/contactos a Alumnos | Fuera | Mantener empresas/personas; la tarjeta Alumnos sí admite definición explícita. |

No iniciar módulos académicos aunque se avance rápido: requieren un plan posterior. Extras solo con mínimo verificado, sin fallos nuevos y conservando las tres horas del miércoles.

## 4. Reglas del dashboard

- **Alumnos:** contactos activos en estado Cliente. Sin empresas, Potenciales o bajas. Resolver estado desde catálogo; sin IDs fijos de base.
- **Abiertas:** oportunidades activas con estado actual derivado de etapa ABIERTA.
- **Cerradas este mes:** oportunidades activas actualmente GANADA o PERDIDA con `FechaCierre` en el mes calendario actual de Buenos Aires: primer día inclusive, primer día del siguiente mes exclusivo. Respetar fecha de negocio guardada sin conversiones que cambien día. Una reabierta deja de contar; no contar eventos históricos de cierre.
- Alcance global coherente con listados compartidos de los tres roles existentes, no con funnel personal.
- Enlaces a contactos/oportunidades existentes. No afirmar filtros que no se aplican; admitir «Ver oportunidades» general. No agregar un listado mensual para justificar enlace.
- Cero válido; error de red/catálogo no equivale a cero. Mostrar carga/error/reintento. Mantener accesibilidad, tema y adaptación.
- Ganar/perder/reabrir o modificar contactos debe actualizar consultas afectadas. Ganar también cambia contacto: invalidar solo oportunidades puede dejar datos desactualizados.

Reutilizar `TotalCount` filtrado para Alumnos y Abiertas. El listado actual no filtra mes de cierre: resolver ese conteo en servidor, sin descargar todas las páginas ni contar una página. Si hace falta resumen, endpoint pequeño y autenticado dentro de patrones actuales, sin modificar permisos. Acordar ruta/DTO antes de dividir API/UI. Regenerar tipos por procedimiento existente si cambia OpenAPI; no editar `schema.d.ts` a mano.

Referencia visual: tarjetas sencillas inspiradas en inicio de Woker, sin réplica exacta/rediseño. No se inspeccionó esa demo y no es dependencia para terminar.

## 5. Bloques y comprobaciones

Un responsable implementa, verifica y revisa su diff por bloque. Estimaciones en horas-persona con comprobación focalizada y revisión propia. Los máximos no caben juntos: aplicar §6.

| Bloque | Resultado / aceptación | Ubicaciones orientativas | Esfuerzo / riesgo |
|---|---|---|---|
| E0 — Base | Revalidar Git, destino local y estados. Ganar promueve y arrastrar infiere; comprobar actualización visible, registrar defectos. | OportunidadService, CierreTests, FunnelPage, CloseOpportunityDialog; guía local | 0,5 h / bajo salvo defecto |
| E0b — Combo de actividades | El combo «Tipo de actividad» muestra el nombre de cada tipo (activo) al registrar/editar desde empresa, contacto u oportunidad; fixtures de pruebas con la forma real del API. | ActivityForm.tsx, ActivityForm.test.tsx, CommercialHistory.test.tsx | 0,25 h / bajo |
| E1 — Inicio | Conteos, tarjetas, enlaces honestos, carga/error/reintento y refresco según §4. | App.tsx, cliente HTTP; consulta/endpoint/DTO si hacen falta; tipos generados y pruebas | 3–4 h / medio |
| E2 — Arrastre (extra 1) | Resultado fijo/oculto desde arrastre; conservar selección en cierre genérico, cancelar sin escribir y datos obligatorios. | FunnelPage, CloseOpportunityDialog y pruebas | 0,5–1 h / bajo |
| E3 — Perfil consulta (extra 2) | Datos no sensibles de sesión actual; sin edición ni ID aportado por cliente. | Navegación, ruta/página, useAuth; sin endpoints administrativos para usuarios comunes | 0,5–1 h / bajo |
| E4 — Cierre | Controles/recorrido integral posterior, revisión, evidencia y preparación §7. | Pruebas afectadas, evidencia y seguimiento | 2 h + 1 h contingencia / medio |

Orden: **E0 → contrato API/UI → E1 completo → E2 si cabe → E3 si cabe → E4**. E1 a 4 h deja solo 0,5 h fuera de E0/E4: descartar extras que no entren.

Reparto sugerido, intercambiable: Mateo conteos/contrato; Lautaro tarjetas/enlaces tras acuerdo. Un responsable edita cliente/tipos generados. No paralelizar escrituras en DbContext, esquema, Program o cliente HTTP. Revisión entre implementadores para cambios habituales; sin crear agentes por rutina. Acceso/sesión/transacción sensible nueva exige revisión independiente del plan §6.1 o recortar ese cambio.

Verificación focalizada E1: cero/varios contactos, Potencial/Cliente y bajas; abiertas/ganadas/perdidas/reabiertas; límites del mes y fuera de ellos; total independiente de paginación. API comprueba conteos persistentes y rechazo sin sesión; UI presentación, errores, enlaces y refresco. E2: ambas finales, cancelar y cierre genérico. Reutilizar pruebas sin infraestructura nueva.

## 6. Agenda y recortes

| Fecha | Horas-persona del equipo | Resultado / corte |
|---|---:|---|
| Lunes 09/11 | 3 | E0: 0,5 h; contrato y avance E1: 2,5 h. Sin asumir trabajo adicional el domingo. |
| Martes 10/11 | 2 | Terminar E1 y controles; E2/E3 solo con margen. Congelar funcionalidades al terminar. |
| Miércoles 11/11 | 3 | E4: 2 h controles/correcciones/revisión/preparación + 1 h contingencia. Sin extras nuevos. |
| Jueves 12/11 | 0 previstas | Presentar versión comprobada. |

1. Fallo fundamental del CRM: pausar mejoras. Distinguir producto/configuración/entorno/test antes de editar; tras dos intentos sin evidencia nueva, reevaluar.
2. Conteo mensual incorrecto al corte del martes: retirar tarjeta y contrato/UI incompleto asociado. Retener Alumnos/Abiertas sin cifras aproximadas.
3. Dos tarjetas tampoco verificadas al corte: conservar inicio actual. Respaldo mínimo: CRM existente con recorrido comprobado.
4. Recortar primero E3, después E2 y después tarjeta mensual. Nunca permisos, validaciones o verificación fundamental.
5. Sin módulos académicos, edición de perfil ni aviso global de cambios sin guardar por tiempo sobrante.
6. Agotadas ocho horas: registrar terminado/descartado; no asumir extensión ni marcar pendientes aprobados.
7. Sin margen para integrar/publicar con OK y comprobar versión: presentar versión publicada estable; sin publicación de último momento sin comprobación.

## 7. Cierre, T49 y demo

Antes de probar API/base, comprobar destino real y estado según guía local; mantener guardas de fixtures. Suites solo en destino local de tests identificado. No usar Supabase/Azure como fixture, recrear esquema publicado o reiniciar procesos ajenos.

Tras último cambio de producto: backend `dotnet build backend/FluencyAPI.slnx --no-restore -m:1`; desde frontend, `npm run build` y `npm run lint`; suites pertinentes completas con `dotnet test backend/FluencyAPI.slnx` y `npm run test:run`. Secuenciar procesos con binarios compartidos. Backend completo tardó unos 11 minutos en T48: reservarlos. Reutilizar evidencia válida, sin repetir por la sola espera. Revisar archivos nuevos/diff completo y `git diff --check`. No debilitar controles.

Recorrido manual local: login, métricas, contacto Potencial → oportunidad → movimiento → Ganada → Cliente → historia/contadores actualizados; pérdida/cancelación, reapertura según rol, permisos existentes y persistencia. Cuentas/datos elegidos por operador, sin secretos ni cuentas automáticas de demo. LegacyApp no sustituye comprobar App real. Identificar recorridos repetidos y evidencia reutilizada.

Seguridad según T47/constraints si cambian dependencias/acceso o se invalida evidencia. Separar fallos nuevos, deuda y límites; no ejecutado no equivale a aprobado. Esta preparación documental no requiere servicios, tipos generados ni suites.

Al cerrar: registro §8 y commits/evidencia listos para solicitar OK de integración; finalizar turno al pedirlo, sin sondeos. Aprobar plan no autoriza merge/publicación. Reglas históricas usan `segunda-entrega`, base observada `segunda-entrega-final`/`master`: confirmar destino/autorización antes de integrar; no reconstruir ramas antiguas por inferencia.

[T49](todo.md#t49) depende del cierre de T48,5 con alcance retenido verificado y recortes explícitos. El usuario informa publicación existente: contrastar topología/artefactos, preparar solo lo necesario para versión resultante, sin asumir despliegue desde cero. Su preparación puede avanzar con datos disponibles; el cierre debe referir a esa versión. T49 no ejecuta publicación. Actualizar publicación exige OK específico y comprobar versión/destino, sin pruebas destructivas en producción. La cuenta del profesor mencionada en T49 es para el docente evaluador, no el rol Profesor postergado.

Demo objetivo: métricas → contacto Potencial/oportunidad → arrastre/cierre → Cliente → historia y contadores actualizados → diferencias de roles. Si se recorta dashboard, omitir ese paso y declarar recorte. No afirmar gestión académica operativa.

## 8. Registro de ejecución

Completar al ejecutar; checklist único de cierre en [todo.md](todo.md#t48-5). Sin duplicar historial T48.

| Bloque | Responsable | Estado / horas | Commit, evidencia y pendientes |
|---|---|---|---|
| E0 | Por asignar | Pendiente / 0 | Sin verificación nueva |
| E0b | Lautaro (con Claude) | Corregido y verificado en pruebas 09/11 / 0,25 | Combo lee `nombre ?? descripcion`; fixtures de ActivityForm y CommercialHistory con la forma real del API (`nombre`, `descripcion: null`). `ActivityForm.test` 6/6. Falta comprobarlo a mano en el App real. |
| E1 | Lautaro (con Claude) | Implementado 09/11; API sin ejecutar | Contrato: `GET /inicio/resumen` → `{ alumnos, oportunidadesAbiertas, cerradasEsteMes }` (`InicioController`, `InicioService`, `InicioContracts.cs`); Cliente resuelto por descripción, sin IDs fijos; mes de Buenos Aires UTC-3 con rango `[primer día, primer día siguiente)` sobre `FechaCierre`. UI en `features/home/HomePage.tsx`: carga/error/reintento (error nunca muestra 0), enlaces generales «Ver contactos»/«Ver oportunidades» (las listas no leen filtros de URL), reconsulta en cada visita (`refetchOnMount: 'always'`). `schema.d.ts` regenerado (+61 líneas, solo el endpoint). Frontend: `HomePage.test` 3/3. Backend: `InicioTests` pasa contra la base local de tests (primer/último día del mes, mes anterior y siguiente, reabierta, dada de baja, Alumnos y 401 sin sesión); el conteo mensual queda verificado y no aplica el recorte 2 del §6. Se actualizó `HttpContractTests` (71 acciones, `/inicio/resumen`). |
| E2 | Lautaro (con Claude) | Implementado 09/11 | `CloseOpportunityDialog`: con resultado ya decidido (arrastre o etapa final elegida) se muestra fijo, sin selector; el cierre genérico («Cerrar» en la ficha) conserva el selector. Pruebas de diálogo y embudo actualizadas (16/16 en opportunities+funnel). Tarjeta del embudo: la línea secundaria muestra primero el contacto y luego la empresa (`FunnelPage.test` 9/9); el título derivado «Empresa – Contacto» lo arma el servidor y no se tocó. Observación de demo (no es defecto): el formulario de oportunidad lista **embudos** activos y deriva el servicio; en la base de desarrollo del 09/11 solo «Clases de Inglés Inicial» tiene embudo, por lo que «intermedio» y «avanzado» no aparecen hasta crearles uno en Configuración → Embudos y etapas. |
| E3 | Lautaro (con Claude) | Implementado 09/11 | `/perfil` (`features/profile/ProfilePage.tsx`): nombre, usuario, correo y roles de la sesión del servidor, sin edición; acceso desde el nombre en la barra lateral. `ProfilePage.test` 1/1. |
| E4 y preparación T49 | Por asignar | Parcial 09/11 | Frontend: `npm run lint` (solo el warning previo de `providers.tsx`), `npm run build` y `npm run test:run` (20 archivos, 155 tests) en verde. Backend: `dotnet build` sin errores; `dotnet test backend/FluencyAPI.slnx` (contenedor local `fluency-pg`, 09/11, 11 min 41 s): 173 de 174 pasaron; la única falla fue `HttpContractTests` por la ruta nueva, corregida y reejecutada 19/19 sin repetir la suite completa. E0: la promoción Potencial → Cliente al ganar está cubierta por `CierreTests` (pasó en esa corrida). Pendiente: recorrido manual en la app real (incluye el combo de actividades y la inferencia al arrastrar), preparación T49. Sin merge ni publicación. |

Traspaso: rama/HEAD y cambios ajenos, horas consumidas/restantes, alcance retenido, controles con fecha/resultado y versión, fallos y siguiente acción. Registrar extras descartados y tarjetas retiradas con motivo. «Descartado para esta entrega» no significa implementado. T48,5 solo cierra con alcance retenido verificado y pendientes/recortes explícitos.
