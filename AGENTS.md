# Fluency CRM: instrucciones de trabajo

## Contexto y fuentes

Proyecto académico: CRM de una academia de inglés. Backend ASP.NET Core 10 / EF Core / PostgreSQL; frontend React 19 / TypeScript / Vite / MUI.

Antes de cambiar código:

1. Revisar `git status --short` y preservar cambios locales preexistentes.
2. Leer `CONSTRAINTS.md`. No debilitar los controles para hacer pasar un cambio.
3. Leer `docs/segunda-entrega/contexto-segunda-entrega.md` para el mapa de fuentes, estado inicial y decisiones técnicas pendientes.
4. Cargar las secciones relevantes de `docs/segunda-entrega/diseño-segunda-entrega.md`, incluyendo reglas y ejemplos además del E-R.

Los PDF de `Enunciado/` son la referencia académica. `docs/segunda-entrega/diseño-segunda-entrega.md` es el diseño funcional acordado; no describe lo ya implementado. Las simplificaciones allí declaradas no equivalen a requisitos textuales de la cátedra. No reabrir decisiones funcionales cerradas ni implementar mejoras futuras sin una nueva indicación del usuario.

`docs/primera-entrega/api-frontend.md`, `docs/primera-entrega/modelo-dominio.md`, `docs/primera-entrega/entrega-1.md` y `docs/primera-entrega/plan_primer_entrega.md` describen la primera entrega. No usar sus pendientes históricos como estado actual ni sus límites temporales para excluir funcionalidades de la segunda entrega. La guía `docs/primera-entrega/frontend-arquitectura-y-reglas.md` conserva convenciones técnicas/visuales salvo reglas sustituidas por el diseño nuevo.

Estado al 11/10/2026: especificación y plan aprobados explícitamente el 08/10; planificación cerrada. T01/T02 integradas en `segunda-entrega`, con push confirmado por el usuario. T03 y CP01 completadas en `segunda-entrega-t03-pruebas-aisladas`, pendientes del OK de integración. Siguiente tarea tras integrar: T04, esquema comercial; no repetir T01–T03 ni pedir de nuevo aprobación del plan. Leer `docs/segunda-entrega/decisiones-confirmadas.md`, `CAPABILITIES.md`, `docs/segunda-entrega/especificacion-tecnica.md`, los `SPEC-*.md` pertinentes, `tasks/plan.md`, `tasks/todo.md` y las evidencias de `tasks/verificaciones/`. La metodología de orquestador, implementadores y revisión independiente está en el plan §6.1. Se conserva el OK específico antes de cada merge y publicación. La topología de Azure sigue pendiente; las cookies están elegidas, un proxy nuevo no es obligatorio por sí mismo.

Desarrollo usa User Secrets, clave `ConnectionStrings:SegundaEntregaDB`, y `localhost:5433` / `fluency_segunda_entrega_dev`, todavía vacía; el esquema corresponde a T04. Tests usan la clave exclusiva `ConnectionStrings:SegundaEntregaTestDB` y `fluency_segunda_entrega_test`, con esquema GUID y tabla probe propios por ejecución; limpieza limitada con RESTRICT, sin cascadas ni barridos de restos. El usuario confirmó la importación de ambas claves al almacén normal de Windows y el retiro de información sensible de `appsettings.json`. En esta instalación, los procesos lanzados desde Codex accedieron a un almacén redirigido a `LocalCache`, distinto del de Windows Terminal: consultar `docs/segunda-entrega/entorno-local.md` antes de asumir que un secreto visible para el agente lo es también para el usuario. La preparación/limpieza del futuro esquema comercial se concretará en T04; T03 no autoriza borrar bases ni recursos ajenos.

## Mapa y convenciones

- `backend/FluencyAPI`: controladores, configuración y OpenAPI. `backend/Services`: contratos y lógica. `backend/Persistence`: modelos EF y SQL.
- `frontend/src/api/client.ts`: acceso HTTP centralizado. `schema.d.ts` se genera desde OpenAPI; no editarlo a mano.
- `frontend/src/features`: pantallas por funcionalidad; `app` y `auth`: navegación, providers y sesión.
- Conservar los patrones existentes de TanStack Query, React Hook Form/Zod, PATCH diferencial, errores visibles y reintentos. Adaptar reglas de negocio al diseño acordado, no copiar las antiguas automáticamente.
- Conservar tema oscuro, accesibilidad básica y componentes compartidos útiles. No incorporar frameworks ni abstracciones generales sin una necesidad concreta.
- La API actual no tiene autenticación/autorización efectiva; el usuario de `sessionStorage` no acredita identidad ante el servidor. No tratar un ID enviado en un formulario como identidad autenticada.

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

## PostgreSQL local

El usuario informó que PostgreSQL local está dockerizado y proporcionó este contenedor:

```text
968c3a20d1e55ae43fa73f0c27ff3fcc08f38c00a22ae27105c8b227cd14a964
```

Usarlo como referencia para levantar PostgreSQL en localhost cuando una futura tarea lo necesite. Estado, puerto publicado, base, usuario y credenciales no fueron comprobados; no inferirlos del ID. El usuario pidió únicamente documentarlo en esta actualización: no inspeccionar, arrancar ni probar el contenedor ahora. Esta restricción corresponde a la actualización documental, no impide usarlo cuando sea necesario en una tarea posterior autorizada.

## Límites de trabajo

- Aplicar la autonomía de Git indicada arriba; no realizar despliegues ni operaciones destructivas sobre bases por iniciativa propia.
- Antes de probar una API, comprobar su destino real: un cambio local puede apuntar a un servicio remoto aunque README describa localhost. Las pruebas que escriban datos requieren un entorno de prueba identificado y una forma de limpieza acordada.
- La posibilidad de reconstruir datos de prueba no autoriza a borrar o recrear automáticamente bases locales o compartidas. La estrategia se decidirá después.
- No imprimir credenciales, cadenas de conexión o archivos completos de configuración sensible. Informar ubicaciones y diagnósticos con valores redactados.
- Mantener distinguibles fallos nuevos, deuda inicial y limitaciones del entorno. Un control no ejecutado no cuenta como aprobado.
- Las pruebas deben cubrir lo fundamental del trabajo práctico; no exigir cobertura total ni un porcentaje arbitrario. Registrar resultado, alcance y pendientes al cerrar cada tarea.
