# Verificación de seguridad de la segunda entrega (T47)

Fecha: 05/11/2026; completada el 08/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Comparación contra la línea de base de [T01](../../tasks/verificaciones/verificacion-t01.md) y [CP04](../../tasks/verificaciones/verificacion-cp04.md). Salidas redactadas: no se registran valores sensibles. **Estado: completa; sin hallazgos nuevos.**

## Repetición del 08/11/2026

Tras las auditorías del 05/11 cambió una dependencia: `@dnd-kit/core` `^6.3.1` (commit `b7047b6`, 06/11). Por eso se repitieron los controles de dependencias: `npm audit --audit-level=high` en la raíz y en `frontend` y `dotnet list package --vulnerable --include-transitive` en los cuatro proyectos, todos **sin vulnerabilidades** (exit 0). No hubo otros cambios de manifiestos desde el 05/11.

## Dependencias npm

| Control | Antes (T01 / CP04) | Ahora |
|---|---|---|
| `npm audit --audit-level=high` en la raíz (Supabase CLI) | 0 vulnerabilidades | 0 vulnerabilidades (exit 0) |
| `npm audit --audit-level=high` en `frontend`, antes de actuar | T01: 1 alto (`source-map-js@1.2.1`); CP04 sumó `vite` 8.3.0 (alto) y `vitest`/`@vitest/mocker` 5.0.1 (moderado) | 6: 4 altos (`source-map-js`, `vite`, `undici`, `zod`) y 2 moderados (`vitest`, `@vitest/mocker`). `undici` y `zod` son avisos publicados después de T01/CP04 sobre versiones que ya estaban en el lockfile; no los introdujo el trabajo de esta etapa |
| Corrección | — | Actualización **dirigida** (sin `audit fix` general, sin cambiar `package.json`): `npm update zod vite vitest @vitest/mocker undici source-map-js --ignore-scripts`, todas dentro de los rangos ya declarados: `zod` 4.6.5→4.6.7, `vite` 8.3.0→8.3.6, `vitest` 5.0.1→5.1.0, `undici` 8.10.2→8.12.4, `source-map-js` 1.2.1→1.2.2 (más sus transitivas en `package-lock.json`) |
| Resultado | — | `npm audit --audit-level=high`: **0 vulnerabilidades** (exit 0). Frontend completo 144/144, `tsc -b`, `npm run build` y `npm run lint` (solo la advertencia previa) correctos tras la actualización |

Con esto quedan cerradas las deudas B8 y las registradas en CP04 (Vite, Vitest/`@vitest/mocker`).

## Dependencias .NET

`dotnet list backend/FluencyAPI.slnx package --vulnerable --include-transitive --no-restore --format json` con acceso a `api.nuget.org`: cuatro proyectos (API, Services, Persistence y Tests), **sin vulnerabilidades reportadas** (exit 0, sin `problems`), igual que en T01 y T05. La consulta contra la fuente remota se completó; no se asume limpia por ausencia de red.

## Secretos

- **Gitleaks 8.30.1, ejecutado el 08/11/2026 con autorización del usuario.** El ZIP del release oficial coincide con el SHA-256 de T01 (`D29144DE…AFC4E`) y se extrajo en un directorio temporal de la sesión. Comandos de T01, con `--redact=100`:
  - Historial (`--all --no-textconv --no-ext-diff`): 179 commits, ~8,15 MB, **sin hallazgos** (exit 0).
  - Índice (`--pre-commit --staged`): vacío al momento del escaneo, **sin hallazgos** (exit 0). No sustituye la revisión previa a cada commit.
  - Árbol de trabajo (versionados + nuevos no ignorados, copiados fuera de `node_modules`): 337 archivos, ~2,51 MB, **sin hallazgos** (exit 0). Una primera copia omitió archivos con nombres no ASCII (git escapa esos nombres); se repitió con `core.quotepath=off` y 0 omitidos.
  - Frente a T01 desapareció el único hallazgo previo (configuración local de `appsettings.json`, ya retirada por el usuario). Sin supresiones ni reglas propias.
  - Un escáner limpio no acredita ausencia de secretos: no se validó la vigencia de credenciales ni se reescribió el historial.
- Revisión estática del diff acumulado desde `9d58626` (excluidos lockfile y `schema.d.ts`, generados) con patrones de contraseñas, claves, tokens, cadenas de conexión y bloques de clave privada: solo dos coincidencias, ambas la contraseña ficticia de cuentas creadas dentro de las pruebas de API (`Ficticia123!`, ya usada por las pruebas previas). Es una comprobación de apoyo, no un reemplazo del escáner.
- No hay credencial de respaldo en el código (se retiró en T02) ni excepciones nuevas a controles: no se añadieron supresiones de lint, `@ts-ignore` ni exclusiones; `appsettings` no se modificó en esta etapa.

- Revisión estática del 08/11/2026 sobre `backend` (sin `bin`/`obj`): `Persistence` no contiene cadenas de conexión ni `OnConfiguring`; la contraseña del administrador inicial se lee de `BootstrapAdmin__Password`; las coincidencias restantes son valores ficticios de las pruebas (`Ficticia123!`, `fictitious`, un `DummyCredential`).

## Deuda previa observada (no introducida por la segunda entrega)

`backend/Persistence/SQL/creacion-tablas.sql` es el script de la primera entrega, todavía enlazado desde `README.md`. Inserta un usuario de demostración con contraseña `123456` en texto plano. Gitleaks no lo detecta. No se usa para la segunda entrega (esquema en `segunda-entrega-esquema.sql`, sin usuarios automáticos) y no se modificó. Conviene retirarlo o marcarlo como obsoleto en el README antes de publicar: decisión pendiente del usuario.

## Cierre

T47 cumple sus tres criterios: auditorías npm/.NET y escaneo de secretos sin hallazgos nuevos, sin fallbacks de credenciales y sin excepciones nuevas a controles.
