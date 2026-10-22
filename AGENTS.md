# Fluency CRM: instrucciones de trabajo

## Contexto y fuentes

Proyecto académico: CRM de una academia de inglés. Backend ASP.NET Core 10 / EF Core / PostgreSQL; frontend React 19 / TypeScript / Vite / MUI.

## Simplicidad y esfuerzo proporcional

Acuerdo explícito del 12/10/2026, aplicable al orquestador y a todos los subagentes. El objetivo es un trabajo práctico que funcione y cumpla la consigna. Este criterio concreta el enfoque de `ponytail` y prevalece sobre ceremonias genéricas de las skills; no reabre el alcance funcional aprobado.

- Elegir la solución más simple que resuelva completamente la necesidad. Reutilizar lo existente; SQL o un procedimiento manual breve son opciones válidas para operaciones puntuales. No agregar flexibilidad, abstracciones, dependencias ni infraestructura para necesidades hipotéticas.
- Verificar en proporción al comportamiento y al riesgo. Configuraciones y operaciones puntuales pueden acreditarse con una ejecución manual reproducible y revisión del resultado. Automatizar cuando proteja una regla relevante o una regresión probable; evitar variantes exhaustivas de configuración y casos marginales sin riesgo concreto.
- Priorizar permisos, reglas comerciales, persistencia y recorridos fundamentales. Conservar el cuidado de datos, secretos y contraseñas, y la honestidad de la evidencia. No retirar las pruebas actuales por esta actualización; el bootstrap T06 se conserva porque funciona.
- Usar los aproximadamente 90 segundos por tarea como señal para revisar el costo de verificación, sin cortar controles y declararlos aprobados. Antes de añadir mecanismos o pruebas costosas, evaluar una alternativa más directa. Reservar suites completas para cierres pertinentes y evitar repeticiones sin cambios ni dudas nuevas.
- Si una necesidad simple empieza a requerir un mecanismo propio, muchos tests o mucha preparación, explicar la alternativa simple y su limitación y consultar antes de desarrollarla. Resolver decisiones rutinarias con autonomía. Delegar solo cuando aporte valor concreto; comunicar este enfoque en cada encargo.

## Modalidad de trabajo (21/10/2026)

- Un responsable por bloque funcional implementa, verifica y revisa su diff. Sustituye la separación fija de orquestador e implementador. Antes de implementar, resumir resultado, verificación suficiente y revisión prevista, sin rehacer el plan aprobado.
- Decidir la revisión antes de implementar: independiente para autenticación, permisos, contraseñas, operaciones destructivas y transacciones sensibles; agrupada en checkpoint para funcionalidad habitual; propia para documentación y cambios mecánicos de bajo riesgo. Clasificación inicial T10–T12 en `tasks/todo.md`.
- Delegar solo una pieza independiente o revisión justificada, explicando su beneficio. Encargos con fuentes, archivos, criterios y límites acotados; sin copiar toda la conversación ni repetir controles válidos por rutina.
- Ante un fallo, distinguir producto, configuración, entorno y test antes de editar. Tras dos intentos sin evidencia nueva, detener la cadena de cambios y reevaluar. Consultar si falta un dato del usuario; resolver decisiones rutinarias con autonomía. Cada nuevo test debe proteger una regla o regresión concreta.
- El revisor identifica defectos, incumplimientos o riesgos verificables. Sugerencias opcionales no amplían alcance ni bloquean cierre. Revisar correcciones y efectos relacionados, sin reiniciar toda la auditoría.
- Conservar continuidad entre tareas relacionadas; un checkpoint puede cerrar el chat. Traspaso breve: rama/commit, terminado, pendiente, decisiones y evidencia. No reconstruir toda la historia ni esperar a perder acuerdos.
- Al pedir OK de merge, dejar commits y evidencia listos y finalizar el turno, sin trabajo adicional ni sondeos mientras se espera. Al retomar, comprobar Git y repetir solo controles afectados por cambios, conflictos o evidencia inválida. Autorizar implementación no autoriza merge/publicación.

## Lectura previa

Antes de cambiar código:

1. Revisar `git status --short` y preservar cambios locales preexistentes.
2. Leer `CONSTRAINTS.md`. No debilitar los controles para hacer pasar un cambio.
3. Leer la tarea y sus dependencias en `tasks/todo.md`. Consultar en `docs/segunda-entrega/contexto-segunda-entrega.md` el mapa de fuentes y los antecedentes pertinentes; sus resultados históricos no acreditan el estado actual.
4. Cargar las secciones relevantes de `docs/segunda-entrega/diseño-segunda-entrega.md`, incluyendo reglas y ejemplos además del E-R.

La lectura de SPEC, decisiones y evidencias se limita al alcance y dependencias de la tarea. No releer todas las fuentes por rutina; reutilizar contexto vigente y volver a fuentes ante cambios o dudas concretas. Para trabajo exclusivamente documental, leer reglas y secciones pertinentes sin arrancar servicios.

Los PDF de `Enunciado/` son la referencia académica. `docs/segunda-entrega/diseño-segunda-entrega.md` es el diseño funcional acordado; no describe lo ya implementado. Las simplificaciones allí declaradas no equivalen a requisitos textuales de la cátedra. No reabrir decisiones funcionales cerradas ni implementar mejoras futuras sin una nueva indicación del usuario.

`docs/primera-entrega/api-frontend.md`, `docs/primera-entrega/modelo-dominio.md`, `docs/primera-entrega/entrega-1.md` y `docs/primera-entrega/plan_primer_entrega.md` describen la primera entrega. No usar sus pendientes históricos como estado actual ni sus límites temporales para excluir funcionalidades de la segunda entrega. La guía `docs/primera-entrega/frontend-arquitectura-y-reglas.md` conserva convenciones técnicas/visuales salvo reglas sustituidas por el diseño nuevo.

Estado y autorizaciones: [tasks/todo.md](tasks/todo.md), contrastado con Git. Al 21/10/2026, T01–T08 integradas; T09/CP03 verificadas y validadas por el usuario, pendientes de autorización de integración. T10 no iniciada. Esta actualización metodológica no autoriza merge ni implementación. Modelos y revisión en plan §6.1; no pedir otra aprobación del plan funcional.

## Entornos y datos

- Desarrollo: User Secrets ConnectionStrings:SegundaEntregaDB, localhost:5433 / fluency_segunda_entrega_dev. Tests: ConnectionStrings:SegundaEntregaTestDB / fluency_segunda_entrega_test, esquema GUID propio y limpieza limitada con RESTRICT, sin cascadas ni barridos. Desarrollo no tiene limpieza automática. No reconstruir bases ni repetir inicialización por rutina.
- Consultar [entorno local](docs/segunda-entrega/entorno-local.md) antes de operar. Codex accedió a un almacén de secretos en LocalCache distinto de Windows Terminal: no asumir que ambos ven lo mismo ni modificar el producto para compensarlo.
- El usuario puede preparar Docker y accesos. El agente confirma estado y destino al iniciar las pruebas y revalida si cambian; conserva las guardas de cada fixture. No redescubrir la instalación ni reiniciar procesos ajenos.
- T06 se conserva: --bootstrap-admin explícito sin HTTP/DDL; las cinco variables BootstrapAdmin__... las elige el operador, solo en entorno y nunca en Git. No elegir credenciales ni crear cuentas por iniciativa propia.
- Supabase es producción: ConnectionStrings:SegundaEntregaProductionDB; en hosting ConnectionStrings__SegundaEntregaProductionDB. Fuentes normales prevalecen; User Secrets es respaldo local solo de esa clave. CP02 y bootstrap confirmados por el usuario; TLS efectivo sigue sin verificar. No ejecutar suites allí ni repetir/borrar el esquema preparado.
- Conservar bloqueo de host remoto en Development. Topología Azure pendiente; cookies elegidas, sin obligación de agregar un proxy. Inventarios y evidencia histórica en tasks/verificaciones/ y la guía local.

## Mapa y convenciones

- `backend/FluencyAPI`: controladores, configuración y OpenAPI. `backend/Services`: contratos y lógica. `backend/Persistence`: modelos EF y SQL.
- `frontend/src/api/client.ts`: acceso HTTP centralizado. `schema.d.ts` se genera desde OpenAPI; no editarlo a mano.
- `frontend/src/features`: pantallas por funcionalidad; `app` y `auth`: navegación, providers y sesión.
- Conservar los patrones existentes de TanStack Query, React Hook Form/Zod, PATCH diferencial, errores visibles y reintentos. Adaptar reglas de negocio al diseño acordado, no copiar las antiguas automáticamente.
- Conservar tema oscuro, accesibilidad básica y componentes compartidos útiles. No incorporar frameworks ni abstracciones generales sin una necesidad concreta.
- Desde T08 la API tiene autenticación cookie, antiforgery y políticas efectivas; el usuario de `sessionStorage` no acredita identidad ante el servidor. No tratar un ID enviado en un formulario como identidad autenticada.

## Comandos

Desde `frontend`:

```powershell
npm run test:run
npm run lint -- src vite.config.ts
npm run build
npm run dev
```

Desde la raíz:

```powershell
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
git diff --check
```

`--no-restore` presupone dependencias restauradas; en una instalación nueva, usar primero `dotnet restore backend/FluencyAPI.slnx`. Para regenerar tipos, `npm run api:types` desde `frontend` requiere la API local en `http://localhost:5169`. No arrancar la API ni regenerar archivos para una tarea exclusivamente documental.

El relevamiento detectó problemas de temporales del sandbox en Vitest, alcance excesivo del comando lint sin rutas y tres tests fallando por una URL local modificada. Consultar el diagnóstico y la invocación alternativa en `docs/segunda-entrega/contexto-segunda-entrega.md`; no declarar todos los controles verdes ni silenciar pruebas para resolverlo.

## Autonomía y flujo de Git

Acuerdo actualizado por el usuario el 07/10/2026; reemplaza las restricciones anteriores que exigían pedir permiso para crear ramas o commits, incluidas las de la documentación histórica.

- `segunda-entrega` es la rama de trabajo e integración. El agente puede crear ramas derivadas y commits de forma autónoma, sin pedir autorización en cada paso, dentro de la tarea encomendada.
- Para incrementos de implementación, crear ramas desde `segunda-entrega` y preparar cambios pequeños y revisables. Se permite hacer commits directamente sobre `segunda-entrega` cuando corresponda al trabajo autorizado; no usarlo para eludir la aprobación de una integración desde otra rama.
- Usar nombres como `segunda-entrega-refactor-api-rest`. El ejemplo solicitado `segunda-entrega/refactor-api-rest` expresa la organización deseada, pero Git no permite mantener simultáneamente una rama `segunda-entrega` y otra bajo `segunda-entrega/` por conflicto entre referencias.
- Los PR de los incrementos deben tener `segunda-entrega` como rama base. Antes de integrar una rama, completar el trabajo y las comprobaciones pertinentes y presentar cambios, resultados y pendientes; entonces pedir el OK del usuario. El merge puede realizarlo el usuario o el agente después de ese OK.
- `main` queda fuera del trabajo habitual: no hacer commits directos, push ni merges hacia ella. El usuario informó que configuró su protección remota para admitir cambios mediante PR; esa configuración no fue verificada por el agente.
- Si el avance hace conveniente integrar a `main`, proponerlo con motivos y esperar autorización explícita. La conveniencia por sí sola no autoriza la integración ni cambiar las protecciones.
- Preservar cambios ajenos y separar los commits propios de configuración local preexistente o secretos.
- Acuerdo del usuario del 12/10/2026: conservar separados los commits de implementación (`feat:`, `fix:`, `test:`) y los de documentación (`docs:`).

## PostgreSQL local

El usuario informó que PostgreSQL local está dockerizado y proporcionó este contenedor:

```text
968c3a20d1e55ae43fa73f0c27ff3fcc08f38c00a22ae27105c8b227cd14a964
```

T02–T04 comprobaron este contenedor en ejecución, publicado en `127.0.0.1:5433` hacia `5432/tcp`, con las bases locales acordadas y sus propietarios verificados. T04 confirmó PostgreSQL 17.11. Antes de usos posteriores revalidar destino y estado; no inferir credenciales del ID ni imprimirlas. La indicación original de no inspeccionarlo se limitaba a la actualización documental; la implementación posterior autorizada ya realizó las comprobaciones registradas en la guía local y las evidencias.

## Límites de trabajo

- Aplicar la autonomía de Git indicada arriba; no realizar despliegues ni operaciones destructivas sobre bases por iniciativa propia.
- Antes de probar una API, comprobar su destino real: un cambio local puede apuntar a un servicio remoto aunque README describa localhost. Las pruebas que escriban datos requieren un entorno de prueba identificado y una forma de limpieza acordada.
- La posibilidad de reconstruir datos de prueba no autoriza a borrar o recrear automáticamente bases locales o compartidas. La estrategia se decidirá después.
- No imprimir credenciales, cadenas de conexión o archivos completos de configuración sensible. Informar ubicaciones y diagnósticos con valores redactados.
- Mantener distinguibles fallos nuevos, deuda inicial y limitaciones del entorno. Un control no ejecutado no cuenta como aprobado.
- Las pruebas deben cubrir lo fundamental del trabajo práctico; no exigir cobertura total ni un porcentaje arbitrario. Registrar resultado, alcance y pendientes al cerrar cada tarea.
