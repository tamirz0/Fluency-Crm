# Verificación T09 / CP03: transporte de sesión

12/10/2026. Rama `segunda-entrega-t09-transporte-sesion`, desde `segunda-entrega` / `54ff182`. Usuario autorizó implementar, probar y revisar, **sin merge**: su validación y OK de integración siguen pendientes. Código/tests y documentación se guardan en commits separados.

## Resultado

- Cliente actual tipado con las cuatro rutas `/auth/*`, cookies mediante `credentials: include`, CSRF solo en memoria y header automático para mutaciones. Renovación después de login/logout; descarte ante 401/400. Requests simultáneos comparten la obtención pendiente. Ninguna mutación se reenvía automáticamente.
- `loginSession` y `getSessionRequest` conservan usuario/vencimiento; `loginRequest` conserva su retorno de usuario para componentes anteriores, todavía fuera de App. `logoutRequest` realiza POST/204 y renueva CSRF anónimo. ProblemDetails mantiene status/code/traceId/errores de campos; 401 y 403 siguen distinguibles.
- `/api` y proxy Vite local existentes se conservan. `VITE_API_BASE_URL` permite una URL explícita para el futuro hosting; no configura CORS/cookies del servidor ni acredita compatibilidad entre sitios.
- `schema.d.ts` regenerado desde `http://localhost:5169/openapi/v1.json`, sin edición manual. `legacy-schema.d.ts` es copia idéntica del anterior: mantiene compilables componentes pendientes sin republicar sus endpoints. Los contratos/clientes históricos se retiran al sustituir cada módulo; no constituyen una segunda API operativa.
- App sigue vacía, sin página provisional ni login visible. El AuthProvider anterior conserva temporalmente su perfil local fuera de la navegación real; no guarda credenciales/token de autenticación y se reemplaza en T10. El transporte nuevo no escribe sessionStorage/localStorage.

## Controles ejecutados

| Control | Resultado |
|---|---|
| RED inicial | Dos casos nuevos de transporte fallaron antes de implementar: login aún usaba contrato anterior. Caso de empresas confirmó por separado la omisión de arnés de T07. |
| Primer GREEN | Cliente 2/2 después de implementar/regenerar. |
| Suite backend completa, `dotnet test ... --no-build --no-restore -m:1` | 114/114, cero fallos/omisiones; runner 4 min 8 s. Incluye autenticación HTTP/actor/CSRF/expiración/roles y regresión de bootstrap/persistencia/contratos. |
| Primera suite frontend completa | 85/86, 173,03 s. Único fallo B7: primer import diferido del formulario de oportunidades no terminó antes de la aserción; DOM mostraba Cargando oportunidades. |
| Reproducción B7 después del ajuste | 1/1, 24,49 s; filtro seleccionó ese caso y dejó fuera los otros 24. No es suite completa. |
| Suite frontend completa final | 86/86, nueve archivos, cero fallos/omisiones; 171,20 s. Incluye nueve casos de transporte y seis de App sin rutas anteriores. |
| Build frontend y lint | TypeScript/Vite correctos, fase Vite inicial 1,17 s y final 629 ms. Sin errores lint, solo warning previo providers.tsx:9. |
| Build backend / diff / secretos finales | Backend cero errores/advertencias, 2,35 s. Diff sin errores. Gitleaks snapshot tracked+new: exit0, 1.144.945 bytes, sin hallazgos y redacción100%; revisión estática sin secretos nuevos. |
| Revisión independiente | Aprobación final explícita GPT-6.1 Sol/High de código y evidencia, sin hallazgos requeridos. Solo lectura, sin repetir controles. |

Comandos desde frontend, usando TEMP/TMP del proceso en `frontend/node_modules/.tmp/t09` según la guía del entorno:

```powershell
npm run api:types
npm run test:run -- src/api/client.test.ts --maxWorkers=1 --no-file-parallelism
npm run test:run -- --maxWorkers=1 --no-file-parallelism
npm run build
npm run lint -- src vite.config.ts
```

Desde raíz:

```powershell
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-build --no-restore -m:1 --logger 'console;verbosity=minimal'
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
git diff --check
```

Antes de la suite se revalidó Docker: running, única publicación 127.0.0.1:5433 → 5432. Las escrituras fueron exclusivamente a `fluency_segunda_entrega_test` y esquemas GUID del fixture, con limpieza RESTRICT existente. Sin desarrollo/producción ni reconstrucciones automáticas. El generador no pudo conectar dentro del sandbox (EACCES); fuera completó contra localhost en 575,8 ms, sin servicios remotos. El primer diagnóstico de destino de la API usó incorrectamente el adaptador IDictionary de PowerShell; se corrigió con los métodos del builder y se verificó host/puerto/base antes de arrancar, sin imprimir cadenas ni secretos.

## Ensayo de navegador y regresión

API Development en localhost:5169 con destino verificado `fluency_segunda_entrega_dev`/localhost:5433; Vite en 127.0.0.1:5173. Navegador IAB con arnés temporal ignorado que importa el cliente real y registra solo métodos/rutas/status/presencia del header, nunca tokens/cookies/contraseñas:

1. `getSessionRequest`: GET `/api/auth/me`, credentials include, sin CSRF, 401 UNAUTHENTICATED.
2. Login con usuario ficticio inexistente: GET `/api/auth/csrf` 200 y POST `/api/auth/login` 401, credentials include y header CSRF presente. El servidor aceptó antiforgery y rechazó las credenciales con el mensaje genérico; dos requests, sin reintento. No se crearon usuarios ni datos. El circuito autenticado positivo/logout está cubierto con PostgreSQL real por la suite backend, no se afirma login exitoso en navegador sin cuenta de desarrollo.

Se detectó una omisión propia de T07: cuatro suites comerciales aún importaban App, que devuelve null. Se conservan todas sus pruebas/asserts mediante `test/LegacyApp.tsx` exclusivo de tests e imports adaptados. Las seis pruebas de App real siguen demostrando que no monta rutas anteriores. Setup Request ahora usa el Request real con resolución de URL relativa, conservando input/init para asserts existentes. Para B7, beforeAll prepara únicamente OpportunityFormPage; conserva aislamiento, timeouts y todas las comprobaciones de formulario, filtrado y payload. No cambia código del producto ni reglas comerciales anteriores.

## Validación del usuario y límites

**Validación del usuario (21/10/2026):** recorrido local de login y sesión completado; `/auth/me` devolvió la identidad autenticada. El token CSRF anterior fue rechazado con 400; tras obtener uno nuevo, el logout se completó y `/auth/me` volvió a responder 401. El usuario ejecutó `npm run test:run -- src/api/client.test.ts --maxWorkers=1 --no-file-parallelism`: 9/9 tests aprobados, 22,08 s.

CP03 verifica acceso HTTP y transporte, todavía sin login desde UI (T10). No usar Supabase para suites ni compartir credenciales/token.

Sin cambios de dependencias/lockfiles: auditorías de T08 del mismo día siguen siendo aplicables (npm raíz/.NET sin hallazgos; B8 source-map-js alto previo). No se repiten consultas sin cambios. TLS productivo, claves Data Protection y topología de frontend/API quedan para T49. El arnés temporal de navegador se eliminó; pestaña, API y Vite iniciados para el ensayo se cerraron. No pertenece al producto ni a los commits. Se observaron warnings de Development por perfil HTTP sin puerto HTTPS y consulta de varias colecciones; no hubo error de requests y no se cambió configuración ni se acredita HTTPS productivo. No se implementa T10, no se hace merge/push ni se modifica main.

## Cierre

Código/tests guardados en `ecb6976` (`feat:`); documentación en commit `docs:` separado. Gitleaks sobre índice de implementación: exit0, 88.940 bytes, sin hallazgos. Reviewer independiente aprobó explícitamente código y evidencia tras recibir los resultados completos; no quedan correcciones requeridas. El usuario aprobó CP03 el 21/10/2026 tras la validación manual y el test frontend registrados arriba. La integración sigue pendiente de autorización; T10 no iniciada.
