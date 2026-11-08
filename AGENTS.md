# Fluency CRM: instrucciones de trabajo

Proyecto académico: academia de inglés; ASP.NET Core 10 / EF Core / PostgreSQL y React 19 / TypeScript / Vite / MUI. Acuerdos vigentes al 21/10/2026.

## Alcance y forma de trabajo

- Resolver completamente lo acordado con la solución más simple, reutilizando lo existente. Sin abstracciones, dependencias ni funcionalidades hipotéticas. Este criterio concreta `ponytail` y prevalece sobre ceremonias genéricas de skills. No reabrir el plan funcional aprobado.
- Un responsable implementa, verifica y revisa su diff por bloque. Antes de implementar, definir brevemente resultado, comprobación suficiente y revisión prevista. Delegar excepcionalmente con beneficio concreto; reglas de modelos/revisión en el plan §6.1.
- Ante fallos, distinguir producto, configuración, entorno y test antes de editar. Tras dos intentos sin evidencia nueva, detener la cadena de cambios y reevaluar; preguntar si falta un dato del usuario. Cada nuevo control debe resolver una incertidumbre o proteger una regla real.
- Verificación proporcional: pruebas focalizadas durante la tarea y controles amplios en el cierre pertinente. No debilitar pruebas, validaciones ni seguridad. Para operaciones puntuales se admite evidencia manual reproducible; consultar antes de convertir una necesidad simple en un mecanismo complejo. No rehacer T06.
- Al pedir OK de integración, dejar commits/evidencia listos y finalizar el turno. Sin sondeos ni trabajo adicional mientras se espera; al retomar comprobar Git y repetir controles solo si hay cambios relevantes o evidencia inválida.

## Lectura según la tarea

Revisar `git status --short` antes de editar y preservar cambios ajenos. Leer solo secciones pertinentes; reutilizar contexto vigente. Este mapa no obliga a cargar todos los documentos. En tareas documentales no arrancar servicios, regenerar tipos ni ejecutar suites.

| Necesidad | Fuente y alcance |
|---|---|
| Iniciar o retomar una tarea | [tasks/todo.md](tasks/todo.md): estado, dependencia, aceptación y revisión de esa tarea. Contrastar con Git y autorizaciones de la conversación; no deducir permisos de una marca de completado. |
| Cambiar o verificar código | [CONSTRAINTS.md](CONSTRAINTS.md), §§1–5: reglas, comandos y controles aplicables. Historia posterior solo si hace falta comparar deuda o evidencia. |
| Implementar comportamiento | [CAPABILITIES.md](CAPABILITIES.md) para localizar la SPEC pertinente; [diseño](docs/segunda-entrega/diseño-segunda-entrega.md): reglas, excepciones y ejemplos del módulo, además del E-R. [Especificación técnica](docs/segunda-entrega/especificacion-tecnica.md) para contratos comunes. |
| Resolver dudas de requisitos | [Decisiones confirmadas](docs/segunda-entrega/decisiones-confirmadas.md) y [contexto §1](docs/segunda-entrega/contexto-segunda-entrega.md): mapa de fuentes académicas en Enunciado/. El diseño aprobado no acredita implementación; sus simplificaciones no son requisitos textuales de la cátedra. |
| Elegir revisión/modelo o cambiar de bloque/chat | [Plan §§6–6.1](tasks/plan.md): revisión por riesgo, delegación y traspaso. Clasificación del bloque en tasks/todo.md. |
| Operar API, PostgreSQL, secretos o bootstrap | [Entorno local](docs/segunda-entrega/entorno-local.md): destinos y contenedor; perfil Production; almacenes Codex/Windows Terminal; inicio; aislamiento de tests; T06. Leer solo la operación necesaria. |
| Modificar frontend | [Guía frontend](docs/primera-entrega/frontend-arquitectura-y-reglas.md), §§2, 5–6 y 8–10: estructura, cliente centralizado, tipos generados, formularios, tema oscuro y accesibilidad. Reglas funcionales/sesión antiguas quedan sustituidas por la SPEC actual; para acceso, [SPEC-acceso.md](SPEC-acceso.md). No editar schema.d.ts a mano. |
| Localizar arquitectura, diagnosticar entorno o contrastar antecedentes | [Contexto](docs/segunda-entrega/contexto-segunda-entrega.md), §§2, 6–7, y evidencia de la tarea enlazada desde tasks/todo.md. Resultados históricos no prueban el estado actual; documentos de primera entrega no limitan la segunda. |

## Git y autorizaciones

- Base de trabajo y PR: `segunda-entrega`. Ramas y commits autónomos dentro de la tarea; incrementos de implementación en ramas derivadas, como `segunda-entrega-acceso` (no `segunda-entrega/acceso`, incompatible con la referencia base).
- Se admiten commits directos en `segunda-entrega` para trabajo autorizado, sin eludir el OK de integración de otra rama. Separar commits de implementación (`feat:`, `fix:`, `test:`) y documentación (`docs:`).
- Cada merge y publicación requiere OK específico después de presentar cambios, evidencia y pendientes. Autorizar implementación no autoriza integración. No trabajar sobre `main`, hacer push/merge hacia ella ni cambiar protecciones sin autorización explícita.

## Límites permanentes

- No imprimir secretos, contraseñas, cadenas de conexión ni configuraciones sensibles completas; diagnósticos redactados. Credenciales y cuentas las decide el operador.
- Antes de probar una API/base, comprobar destino real y estado. El usuario puede preparar Docker; hacer una comprobación breve y conservar guardas de fixtures, sin redescubrir la instalación ni reiniciar procesos ajenos. Si cambian las condiciones, revalidar.
- Suites exclusivamente locales en el destino de tests identificado, con limpieza propia acordada. Supabase es producción: no probar allí ni repetir/borrar su esquema. Conservar bloqueo de host remoto en Development. No reconstruir bases, borrar recursos ajenos ni desplegar por iniciativa propia.
- La identidad procede de la sesión del servidor, nunca de sessionStorage ni de un ID enviado por el cliente. Preservar permisos, integridad, tratamiento de errores y accesibilidad.
- Distinguir fallos nuevos, deuda previa y límites del entorno. Un control no ejecutado no está aprobado. Registrar evidencia y pendientes sin duplicar el historial en este archivo.
