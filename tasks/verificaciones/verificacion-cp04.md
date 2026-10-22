# Verificación T10–T12 / CP04 — módulo acceso

Fecha de cierre: 21/10/2026 (America/Buenos_Aires). **T10–T12 y CP04 completos y verificados en `segunda-entrega-CP04-acceso`; integrados localmente por fast-forward en `segunda-entrega` / `20c5383`, sin push.** Rama de trabajo derivada de `segunda-entrega` / `2930e95`. Responsable único para implementación, pruebas y revisión propia; revisión independiente agrupada antes de presentar el bloque.

## Resultado y trazabilidad

Git inicial limpio. T09 ya estaba integrada mediante `3ac9310` (segundo padre `418c4f5`), con los cambios documentales `e6b99eb` y `2930e95` conservados. El usuario autorizó integrar al retomar; no fue necesario repetir un merge. Se reutilizó la evidencia válida de T09/CP03 y no se repitieron controles por sus cambios documentales.

- **T10:** login/restauración por servidor, sin identidad en storage; eliminación del dato histórico. Logout HTTP, limpieza de caché ante fin de sesión, distinción 401/403, actualización por foco y bloqueo hasta comprobar identidad. Se conservan formularios si no cambia la identidad. No se publican las pantallas comerciales retiradas.
- **T11:** cuentas administradas exclusivamente por administrador, roles fijos, altas/perfil/roles/password/desactivar/reactivar. Consultas paginadas y opciones activas mínimas para todos. PATCH con presencia explícita, unicidad normalizada en PostgreSQL, BCrypt costo12 y límite UTF-8. Mutaciones Serializable con relectura del permiso del actor; sin reintentos automáticos ni borrado físico.
- **T12:** pantalla `/configuracion/usuarios`, visible por permiso actual, filtros/paginación en servidor y diálogos accesibles. Validación, errores y doble envío cubiertos. Contratos generados desde OpenAPI local; ningún cambio manual en schema.d.ts. El inicio del módulo acceso sólo muestra saludo y navegación habilitada; no consulta recursos comerciales retirados.

Inventario real mayor que la estimación inicial; subdivisión conservando tareas y dependencias: T10.a sesión/cliente/contexto/rutas, T10.b pruebas de acceso, T10.c arnés histórico y cinco imports de regresión, T10.d evidencia. T11.a contratos/servicio, T11.b controlador/wiring, T11.c pruebas/inventario HTTP, T11.d evidencia. T12.a cliente/tipos, T12.b pantalla/formulario, T12.c navegación/pruebas y T12.d cierre CP04. Sin implementador delegado.

Los consumidores comerciales anteriores siguen fuera de App. Sus pruebas conservan asserts usando identidad ficticia sólo en `test/LegacyAuthProvider.tsx`; no acreditan autenticación ni reabren rutas. No existe aún selector operativo de responsables: los formularios históricos lo muestran de sólo lectura. Se publica el cliente tipado de opciones activas para los consumidores previstos en tareas comerciales, sin inventar un selector fuera de alcance ni perder etiquetas históricas existentes.

Commits de implementación: `84c0fff` (T10), `d6b22c9` (T11), `f5bff5d` (correcciones de revisión de sesión) y `4c46fc4` (T12). Documentación separada.

## Entorno y comandos reproducibles

Contenedor `968c3a20d1e5` activo, publicación única `127.0.0.1:5433 → 5432`. Antes de escribir, DatabaseIsolationTests confirmó 5/5. El fixture exige `fluency_segunda_entrega_test`, host/puerto exactos, identidad y propietario; esquemas GUID propios y limpieza RESTRICT. No se tocaron Supabase, bases anteriores, esquema de desarrollo ni T06.

API de demo: Development en `localhost:5169`, conexión de desarrollo previamente parseada y validada como `localhost:5433 / fluency_segunda_entrega_dev`, sin imprimir secretos. Vite en `127.0.0.1:5173`. Credenciales/cuentas elegidas por el operador; no se crearon cuentas de desarrollo desde los tests.

Desde raíz:

```powershell
docker ps --format '{{.ID}} {{.Status}} {{.Ports}}'
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~DatabaseIsolationTests'
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~UsuariosTests|FullyQualifiedName~AuthTests|FullyQualifiedName~HttpContractTests'
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-build --no-restore --filter 'FullyQualifiedName~ApplicationMapsOnlyCompletedAuthActionsAndNoLegacyRoutes'
git diff --check
```

Desde frontend, TEMP/TMP en `frontend/node_modules/.tmp` para Vitest:

```powershell
npm run api:types
npm run test:run -- src/App.test.tsx src/features/settings/UsersPage.test.tsx --maxWorkers=1
npm run test:run -- --maxWorkers=1
npm run build
npm run lint
```

## Resultados

| Control | Resultado |
|---|---|
| RED T10 | 6/6 fallaban contra App vacía; GREEN inicial 6/6, 31,86s. |
| RED T11 | 2/2 fallaban antes de implementar rutas. GREEN inicial 2/2, 2min32s. |
| RED T12 | 4/4 fallaban antes de montar la pantalla. GREEN inicial conjunto T10/T12 10/10, 59,67s. |
| Backend completo final | **116/116, cero omitidas, 4min9s.** |
| Build backend final | **0 errores/advertencias**, 2,01s. |
| Metadata/rutas HTTP tras última edición de OpenAPI | **1/1**, 705ms. Sólo controladores de acceso/usuarios habilitados; 13 acciones y 11 rutas esperadas. |
| Frontend focalizado final | **18/18**, 59,56s. Incluye cuatro rutas comerciales retiradas, foco/login, conservación de formulario y bloqueo/recuperación del diálogo con fallo de /me. |
| Frontend completo final | **90/90, diez archivos, cero omisiones, 216,94s.** |
| Build/tipos/lint frontend | **Correctos**; Vite final 4,70s, sólo warning previo `providers.tsx:9`. Tipos regenerados desde la API local, sin edición manual. |
| Gitleaks redactado | **Sin hallazgos**: staged final 57,99KB y tres commits previos 42,31KB. Incluye archivos nuevos y correcciones; documentación final también escaneada antes de su commit. |
| Recorrido local de usuario | **Confirmado por el usuario: recorrido completo, sin fallos.** Login → crear vendedor/responsable → editar roles/password → desactivar/reactivar → recarga/foco → logout. Pantalla de login observada en navegador integrado. |

Las pruebas backend verifican rol actual sin renovar expiresAt, invalidación al cambiar password/desactivar, reactivación, conservación de una empresa asignada, username/correo duplicados normalizados, PATCH inválido/omitido/null, búsqueda sin acentos, paginación, 72bytes exactos aceptados y exceso rechazado, vendedores/responsables sin administración y opciones sin datos administrativos. No se agregó una carrera de revocación artificialmente sincronizada: se verificaron requests posteriores y la relectura Serializable se revisó estáticamente.

## Revisión independiente y correcciones

Una revisión agrupada de T10/T11/T12 detectó tres fallos de sesión: foco desmontaba formularios, foco podía invalidar un login en curso y un fallo de CSRF posterior a logout204 retenía usuario/caché. Corregidos, con regresiones específicas. El seguimiento se limitó a estas correcciones y sus efectos: el portal MUI requería bloqueo propio de campos/envío y una salida accesible cuando falla /me. Solución final: controles y guardia de submit bloqueados, Cancelar disponible y reintento accesible al cerrar el diálogo. El intento con disablePortal generaba un diálogo oculto a accesibilidad; los tests lo detectaron y se retiró, sin cambiar asserts para ocultarlo.

El revisor confirmó que no quedan correcciones bloqueantes en lo revisado; no ejecutó suites. Se solicitó modelo/esfuerzo conforme a §6.1 (GPT-6.1 Sol/High por riesgos de sesión y contraseña); no hay telemetría independiente para certificar la configuración efectiva.

Revisión propia de contrato, diff, archivos nuevos/staged, integridad y secretos. Cambios funcionales deliberados en tests: identidad de storage y App vacía sustituidas por identidad de servidor/rutas de acceso; se mantiene protección del corte comercial. No se rebajaron assertions, validaciones, reglas, timeouts ni aislamiento.

## Seguridad y deuda anterior

Auditoría raíz npm: 0 hallazgos. Auditoría .NET de cuatro proyectos: sin paquetes vulnerables reportados. Auditoría frontend: 2 altos (`source-map-js`, `vite`) y 2 moderados (`@vitest/mocker`, `vitest`), cero críticos. Manifiestos y lockfiles idénticos a `2930e95`; ninguno fue introducido ni actualizado por CP04.

- B8 conservada: `source-map-js@1.2.1`, [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), alto.
- Deuda preexistente adicional identificada en CP04: `vite@8.3.0`, alto; advisories de launch-editor [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv), [GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw), [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm); Vite [GHSA-9jrq-w75r-8gcw](https://github.com/advisories/GHSA-9jrq-w75r-8gcw), [GHSA-rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22), [GHSA-vfpm-58rq-9qcg](https://github.com/advisories/GHSA-vfpm-58rq-9qcg). `vitest/@vitest/mocker@5.0.1`, moderado: [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8), [GHSA-xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp).

No se ejecutó audit fix ni se actualizaron herramientas ajenas a este bloque. Es deuda a resolver como máximo en T47, no una declaración de frontend libre de vulnerabilidades. Vite sólo escucha loopback. B7 no se reprodujo en las suites comerciales de esta ejecución.

Comandos S: `npm audit --audit-level=high --json` en raíz/frontend; `dotnet list backend/FluencyAPI.slnx package --vulnerable --include-transitive --no-restore --format json`; Gitleaks8.30.1 existente con `git --staged --redact` y rango `2930e95..HEAD`, más revisión de archivos nuevos.

## Incidentes de entorno separados de producto

- SDK dentro de sandbox fallaba al acceder a Service Control Manager; .NET se ejecutó con la autorización de herramienta fuera del sandbox. Docker también necesitó acceso a su pipe. Sin cambiar el entorno ni elevar perfiles del producto.
- La salida del runner backend llegó tarde; se comprobó que PostgreSQL no tenía sesiones/esperas. La primera suite focalizada devolvió éxito al solicitar interrupción. Una repetición diagnóstica con 60s era menor que su duración real, generó dump y fue abortada por esa opción; ese control **no se considera aprobado**. Se retiró el dump propio tras verificar su ruta. Las ejecuciones completas posteriores terminaron normalmente. Al cierre se detectó el esquema residual exacto `t03_9b2310b693f74570b7893577d42a4ad9`: revisión manual confirmó sus 21 tablas del fixture, propietario, OID, timestamps de la ejecución diagnóstica, tres cuentas ficticias esperadas y cero empresas. Se limpiaron exclusivamente esos recursos tras bloquear tablas y revalidar manifiesto/OID/datos dentro de una transacción, en orden del fixture y con RESTRICT. Sin CASCADE ni barrido por prefijo; consulta final: cero esquemas de tests.
- Dos builds se solaparon con procesos propios y fallaron al copiar DLL bloqueadas (API/testhost). Se detuvo sólo la API propia o se esperó terminar los tests; build final correcto. No se modificó código para esos errores.
- El primer parser PowerShell usó el adaptador IDictionary de DbConnectionStringBuilder; se corrigió usando set_ConnectionString/get_Item. Ningún secreto impreso ni configuración modificada.
- El primer navegador no alcanzaba Vite dentro del sandbox. Vite fuera del aislamiento, mismo loopback, permitió observar el formulario real. No se cambiaron firewall, CORS ni puertos públicos.
- Primer contrato OpenAPI publicó filtros PascalCase y omitió éxitos tras metadata común: filtros declarados explícitamente en controller y respuestas tipadas. El build frontend detectó también props de MUI9 que debían ir en sx. Un fallo de orden cultural del inventario HTTP se corrigió manteniendo todas las rutas esperadas. La suite frontend detectó mensajes de error de red duplicados; login evita duplicar el mensaje cuando el contexto bloquea para comprobar la sesión.

## Evaluación de §6.1 y continuidad

Un responsable implementó y verificó, sin coordinación de escrituras con otro implementador. La revisión agrupada aportó defectos concretos en sesión y en su recuperación accesible; las rondas adicionales fueron sobre correcciones importantes y efectos del mismo bloque. Hubo retrabajo real en foco/portal y metadata OpenAPI; no se atribuye ahorro de tokens sin medición comparable. Suites completas reservadas al cierre, con repeticiones motivadas por fallos concretos. **Valoración del usuario (21/10/2026):** el checkpoint tomó unos 50 minutos y se completó de forma más autónoma, convocando al usuario solo para revisar CP04; consumió menos que otras implementaciones. Se mantiene esta metodología por ahora.

CP04 completo: controles técnicos, revisión y demo del usuario aprobados. Integrado localmente por fast-forward en `segunda-entrega` / `20c5383`, con autorización explícita del usuario el 21/10/2026. No se hizo push; T13 no se inició. Pendientes posteriores: deuda de dependencias B8 y adicional preexistente (prevista como máximo en T47) y topología/publicación de T49. API/Vite iniciados por este agente se detuvieron después de la demo; el contenedor del usuario permanece activo. Logs y auditorías crudos conservados en `node_modules/.tmp/cp04-evidence/` (ignorado); ningún dump ni secreto versionado.
