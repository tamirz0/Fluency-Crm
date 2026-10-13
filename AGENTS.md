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

## Lectura previa

Antes de cambiar código:

1. Revisar `git status --short` y preservar cambios locales preexistentes.
2. Leer `CONSTRAINTS.md`. No debilitar los controles para hacer pasar un cambio.
3. Leer `docs/segunda-entrega/contexto-segunda-entrega.md` para el mapa de fuentes, estado inicial y decisiones técnicas pendientes.
4. Cargar las secciones relevantes de `docs/segunda-entrega/diseño-segunda-entrega.md`, incluyendo reglas y ejemplos además del E-R.

Los PDF de `Enunciado/` son la referencia académica. `docs/segunda-entrega/diseño-segunda-entrega.md` es el diseño funcional acordado; no describe lo ya implementado. Las simplificaciones allí declaradas no equivalen a requisitos textuales de la cátedra. No reabrir decisiones funcionales cerradas ni implementar mejoras futuras sin una nueva indicación del usuario.

`docs/primera-entrega/api-frontend.md`, `docs/primera-entrega/modelo-dominio.md`, `docs/primera-entrega/entrega-1.md` y `docs/primera-entrega/plan_primer_entrega.md` describen la primera entrega. No usar sus pendientes históricos como estado actual ni sus límites temporales para excluir funcionalidades de la segunda entrega. La guía `docs/primera-entrega/frontend-arquitectura-y-reglas.md` conserva convenciones técnicas/visuales salvo reglas sustituidas por el diseño nuevo.

Estado al 12/10/2026: especificación y plan aprobados explícitamente el 08/10; planificación cerrada. T01–T08, CP01 y CP02 integradas localmente en `segunda-entrega`; CP02 en `c363670`, T07 en `10d8a0a` y T08 en `942e23d`, con autorización del usuario el 12/10/2026; controles locales de CP02 completos (backend 82/82, cero omisiones). La conexión a Supabase, creación y reejecución del administrador están confirmadas por el usuario; CP02 cerrado con su OK del 12/10/2026; T07 integrada en `10d8a0a`; T08 integrada tras 44/44 y reviewer aprobado. T09 implementada y verificada en segunda-entrega-t09-transporte-sesion: backend114/114 y frontend86/86. CP03 con verificación técnica/reviewer completos y pendiente de validación del usuario; no hacer merge ni iniciar T10 sin indicación. No repetir tareas integradas ni pedir de nuevo aprobación del plan. Leer `docs/segunda-entrega/decisiones-confirmadas.md`, `CAPABILITIES.md`, `docs/segunda-entrega/especificacion-tecnica.md`, los `SPEC-*.md` pertinentes, `tasks/plan.md`, `tasks/todo.md` y las evidencias de `tasks/verificaciones/`. La metodología de orquestador, implementadores y revisión independiente está en el plan §6.1. Se conserva el OK específico antes de cada merge y publicación. El ensayo Supabase lo realizó el usuario mediante el perfil Production; TLS efectivo sigue sin verificar. Conservar la protección contra host remoto en Development y no redirigir las suites locales. La topología de Azure sigue pendiente; las cookies están elegidas, un proxy nuevo no es obligatorio por sí mismo.

Desarrollo usa User Secrets, clave `ConnectionStrings:SegundaEntregaDB`, y `localhost:5433` / `fluency_segunda_entrega_dev`, con las 20 tablas y catálogos de T04 y los tres roles/siete permisos/dieciséis asociaciones de T05 aplicados explícitamente; sin usuarios ni datos comerciales de demostración. T06 habilita `--bootstrap-admin` separado del arranque normal, sin HTTP/DDL; el operador elige las cinco variables `BootstrapAdmin__...` de la SPEC, solo entorno, sin valores en Git. La cuenta de desarrollo aún no se creó; los tests demostraron creación/reejecución/concurrencia en su destino exclusivo. Tests usan la clave `ConnectionStrings:SegundaEntregaTestDB` y `fluency_segunda_entrega_test`, con esquema GUID propio por ejecución: probe de infraestructura o esquema comercial según el fixture; limpieza limitada con RESTRICT, sin cascadas ni barridos de restos. El usuario confirmó la importación de ambas claves al almacén normal de Windows y el retiro de información sensible de `appsettings.json`. En esta instalación, los procesos lanzados desde Codex accedieron a un almacén redirigido a `LocalCache`, distinto del de Windows Terminal: consultar `docs/segunda-entrega/entorno-local.md` antes de asumir que un secreto visible para el agente lo es también para el usuario. La preparación y limpieza del esquema comercial de tests están concretadas en T04; ver las evidencias T04–T06 y la guía local. Desarrollo no tiene limpieza automática; T03–T06 no autorizan borrar bases ni recursos ajenos.

Actualización Supabase del 12/10/2026: el usuario decidió usar ese proyecto como base productiva y pidió el perfil `Production`. Selecciona `ConnectionStrings:SegundaEntregaProductionDB`, separada de desarrollo/tests; las fuentes normales prevalecen y User Secrets sirve como respaldo local de esa clave exclusivamente. En hosting usar `ConnectionStrings__SegundaEntregaProductionDB`. El usuario confirmó la preparación de `fluency_crm` (20 tablas, 3 roles, 7 permisos, 16 asociaciones y 0 usuarios antes del bootstrap). Después del fallo inicial de TLS, el usuario confirmó conexión funcional, 1 usuario / 1 asociación / 1 administrador activo y reejecución sin cambios. Informó que no aplicó configuración TLS adicional: el modo efectivo no está verificado. CP02 cerrado con el OK del usuario del 12/10/2026, que también autorizó la integración. Ver [guía](docs/segunda-entrega/entorno-local.md#perfil-production-para-supabase) y [evidencia](tasks/verificaciones/verificacion-cp02-supabase.md). No ejecutar suites contra producción ni repetir/borrar el esquema preparado.

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
