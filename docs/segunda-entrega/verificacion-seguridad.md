# Verificación de seguridad de la segunda entrega (T47)

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Comparación contra la línea de base de [T01](../../tasks/verificaciones/verificacion-t01.md) y [CP04](../../tasks/verificaciones/verificacion-cp04.md). Salidas redactadas: no se registran valores sensibles. **Estado: parcial; falta el escaneo de secretos con Gitleaks (ver abajo).**

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

- **Gitleaks: no ejecutado.** Se descargó el release oficial `v8.30.1` (windows x64) a un directorio nuevo del espacio temporal y se verificó su SHA-256 contra `checksums.txt` del mismo release (coincide), pero la ejecución del binario descargado fue **denegada por el control de permisos de la sesión**. No se evadió. Hasta correrlo (archivos de trabajo, índice e historial, con `--redact`), el control de secretos **no está aprobado**: un control no ejecutado no es un control limpio.
- Revisión estática del diff acumulado desde `9d58626` (excluidos lockfile y `schema.d.ts`, generados) con patrones de contraseñas, claves, tokens, cadenas de conexión y bloques de clave privada: solo dos coincidencias, ambas la contraseña ficticia de cuentas creadas dentro de las pruebas de API (`Ficticia123!`, ya usada por las pruebas previas). Es una comprobación de apoyo, no un reemplazo del escáner.
- No hay credencial de respaldo en el código (se retiró en T02) ni excepciones nuevas a controles: no se añadieron supresiones de lint, `@ts-ignore` ni exclusiones; `appsettings` no se modificó en esta etapa.

## Pendiente para cerrar T47

1. Ejecutar Gitleaks 8.30.1 (comando de T01) sobre archivos de trabajo, índice e historial y comparar contra la línea de base (único hallazgo previo: configuración local de `appsettings.json` ya retirada por el usuario). Puede hacerlo el usuario, o autorizar su ejecución en una sesión.
2. Confirmar que no aparecen secretos nuevos y registrar el resultado aquí. Si el escáner detectara algo, abrir una tarea acotada y repetir solo los controles afectados.
