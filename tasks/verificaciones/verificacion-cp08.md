# CP08 — Empresas

Inicio: 31/10/2026. Base `segunda-entrega` / `b5d376b`, árbol limpio; CP07 y ajuste visual `a25ac23` incluidos. Rama `segunda-entrega-cp08-empresas`. Sin merge ni push autorizados.

## Alcance y organización

Responsable único, ejecución secuencial. T22: entidades, mapeos y prueba PostgreSQL (4 archivos). T23.a: contratos, servicio e interfaz; T23.b: controlador, activación HTTP y pruebas (3 y 4 archivos). T24.a: cliente/tipos y navegación (4); T24.b: listado, formulario, ficha, selector de responsable y pruebas (5); T24.c: regresiones de consumidores/navegación (4). Documentación y evidencia en commit separado. Estas subdivisiones conservan la aceptación de T22–T24; no incluyen T25/T27.

Listado existente con filtros/paginación en servidor y orden razón social/ID; formulario existente con responsable, defaults y PATCH diferencial; ficha con fecha/referencias legibles. Revisión propia por bloque e independiente agrupada GPT-6.1 Sol/Medium realizada, sin escalar a High. El responsable no dispone de control para cambiar el modelo de este chat; se informó al usuario.

## Entorno e incidentes

- Contenedor acordado: running, `127.0.0.1:5433`. Parseo con `set_ConnectionString`: tests exclusivamente `localhost:5433/fluency_segunda_entrega_test`. Fixtures conservan guardas de identidad, OID, esquema exclusivo y limpieza RESTRICT.
- Primer intento de tests restringido terminó sin salida; repetición con permisos mostró bloqueo de DLL por API preexistente PID 13944. Se conservó ese proceso y se cambió la salida a `-p:OutputPath=bin/CP08/`. No hubo cambios de producto por ese fallo de entorno.
- Prueba RED `ClientesModelTests`: falló por estado nullable en metadata (8 s), antes de implementar mapeos.
- RED de empresas: rutas aún ausentes, 404 (2/2 fallidas, 30 s). Focal posterior 21/22: empresas y mapeos correctos; el inventario HTTP todavía esperaba 40 acciones en lugar de 44. Se actualizó su lista explícita de rutas/controladores; el control pasó en la suite completa.
- UI detectó doble POST con respuesta rápida/doble clic: corregido con guarda inmediata por ref, conservando reintento tras error. Un error de escape de texto en el test impidió el primer transform; corregido antes de ejecutar los casos.
- Adaptación de fixtures: responsable requerido, respuesta paginada y mocks por URL en lugar de orden de llegada. Primera ejecución de cuatro archivos: 39/42 y un error de fixture; los casos corregidos pasaron en la suite completa. Se conservó el aislamiento y se usó TEMP/TMP local desde la primera invocación.
- Suite frontend completa: único fallo en aserción antigua que mantenía retirada `/empresas/nueva`; se sustituyó por dos pruebas positivas de empresas, conservando los bloqueos de contactos/oportunidades/funnel. Al retomar tras el corte de cuota se perdió el resultado del último proceso: se repitió solo `App.test.tsx`, 13/13. Build detectó una opción `exact` no admitida por el tipo de Testing Library; retirada sin cambio de comportamiento ni nueva suite.
- El primer snapshot de secretos quedó bajo `node_modules` y el scanner procesó 0 bytes: resultado inválido. Se reutilizó la receta de temporales fuera de dependencias: 355,39 KB procesados, sin hallazgos. Sin nueva infraestructura.

## Resultados

- T22 focal **1/1**, 16 s: materialización EF contra SQL objetivo, FK restrictivas, cambio de empresa del contacto sin cambiar la oportunidad histórica y consulta parametrizada de bloqueos con fixture. Sin API de contactos/bajas.
- Backend completo **132/132**, cero omitidas, **6 min 37 s**. Comprueba identidad/CSRF y módulos previos, permisos compartidos de ambos operadores, defaults, estado comercial Inactivo conservando activo, rechazo de campos ocultos, PATCH atómico, null/omisión, referencias inactivas y páginas con filtros combinados.
- Después de revisión: focal búsqueda/paginación **2/2**, **1 min 45 s**, tras RED del caso nuevo (27 s). No se repitió la suite completa: el cambio se limita a la normalización y la composición de la consulta. Backend compiló sin advertencias/errores en esta ejecución; build de solución previo **0/0**, 3,06 s.
- Frontend completo: **12 suites verdes + App con una aserción obsoleta** (105/106, 319,70 s). Corregida la aserción de retiro conforme al alcance aprobado: **App 13/13**, 30,39 s al retomar. Los **107 casos vigentes** quedan comprobados mediante la suite amplia más ese focal, sin omisiones ni errores pendientes. Empresas **13/13**, formularios **25/25**, búsqueda **5/5** y Home **1/1** dentro de la amplia. No se presenta como una única suite 107/107.
- Tipos generados desde OpenAPI **local 5170**, 821,6 ms; sin editar `schema.d.ts`. Build frontend/tipos final correcto (Vite 4,11 s); lint solo conserva `react/only-export-components` previo en `providers.tsx:9`.
- Seguridad según cambios: revisión de límites de entrada, sesión/actor, campos admitidos y consultas parametrizadas; Gitleaks con redacción sobre commits y cambios, sin secretos nuevos. Sin dependencias nuevas ni cambios de manifiestos/lockfiles: no se repitieron auditorías de paquetes; la deuda anterior sigue en T47, no se declara resuelta.
- Base exclusiva de tests tras terminar: **0 esquemas t03_* / 0 tablas de usuario**. Sin reconstrucciones, limpieza SQL comercial ni acceso a Supabase.

## Revisión independiente

GPT-6.1 Sol/Medium, contexto acotado, solo lectura y sin suites repetidas. Foco solicitado: permisos compartidos, defaults, PATCH, referencias y filtros/paginación. Único P2: búsqueda incompleta de diacríticos (`São`/`Citroën`). Corregido con `translate`/`strpos` parametrizados y equivalencias simétricas reutilizadas de `UsuarioService`; conserva proyección, activo, filtros, conteo y orden. El revisor comprobó únicamente esa corrección y no encontró otros defectos importantes relacionados. Resultado focal posterior 2/2 registrado arriba.

## Comandos reproducibles

Desde raíz, salvo npm desde `frontend`. Secuenciar backend build/tests/API; usar salida CP08 mientras siga abierta la API anterior:

```powershell
dotnet build backend/FluencyAPI.slnx --no-restore -m:1 -p:OutputPath=bin/CP08/
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore -p:OutputPath=bin/CP08/ --filter FullyQualifiedName~ClientesModelTests -v:minimal
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore -p:OutputPath=bin/CP08/ --filter 'FullyQualifiedName~EmpresasTests|FullyQualifiedName~ClientesModelTests|FullyQualifiedName~HttpContractTests' -v:minimal
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-build --no-restore -p:OutputPath=bin/CP08/ -v:minimal
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore -p:OutputPath=bin/CP08/ --filter 'FullyQualifiedName~SearchNormalizesLatinDiacriticsOnBothSides|FullyQualifiedName~CombinesFiltersBeforeCountingAndPaginatesWithStableOrder' -v:minimal

$env:TEMP=Join-Path (Get-Location) 'node_modules/.tmp'
$env:TMP=$env:TEMP
npm run test:run -- src/features/companies/Companies.test.tsx --maxWorkers=1
npm run test:run -- --maxWorkers=1
npm run test:run -- src/App.test.tsx --maxWorkers=1
npx openapi-typescript http://localhost:5170/openapi/v1.json -o src/api/schema.d.ts
npm run build
npm run lint
git diff --check
```

## Recorrido local del operador

Destino **exclusivo de desarrollo**: `localhost:5433/fluency_segunda_entrega_dev`. El 31/10 se comprobó un usuario activo por cada rol existente: Administrador, Responsable comercial y Vendedor. No se eligieron credenciales ni se crearon cuentas. El operador usa las suyas.

**Tratamiento antes de crear datos:** usar una única empresa ficticia con prefijo `Validación CP08 31-10` y observación `Demostración CP08; conservar hasta T27`. Reutilizarla entre roles. Los datos permanecen almacenados: CP08 no ofrece baja ni restauración. No usar SQL para limpiarlos ni presentar estado comercial Inactivo como baja. No se escribió ningún dato fuera de fixtures durante la implementación.

Instancias separadas preparadas: **UI [127.0.0.1:5174](http://127.0.0.1:5174/empresas)**, API `localhost:5170` con Development y la conexión local identificada. El proxy usa una copia temporal ignorada de la configuración existente (`frontend/node_modules/.tmp/cp08.vite.config.ts`), sin modificar la configuración versionada ni procesos ajenos. Tras la interrupción de cuota se revalidaron Git, contenedor, conexiones y puertos, y se reabrieron únicamente estas instancias. Verificación inicial real: HTML 200, `/api/empresas` sin sesión 401; navegador redirige a login. No acredita el recorrido autenticado del operador.

1. Entrar con el **Vendedor** existente y abrir Empresas → Nueva empresa. Crear la empresa ficticia acordada, dejar Estado sin selección (Potencial predeterminado) y elegir como responsable al **Responsable comercial** existente, distinto del actor.
2. Comprobar la ficha: razón social normalizada, Potencial, responsable elegido, fecha local, correo/teléfono enlazados si se informaron y observaciones. Volver al listado y buscar por razón social/CUIT/correo/teléfono; combinar Estado, Origen y Responsable. Limpiar filtros debe volver a la primera página.
3. Cerrar sesión y entrar con **Administrador**; localizar la misma empresa, editar un dato ordinario y limpiar un opcional previamente informado. Guardar, comprobar confirmación y ficha actualizada; responsable y estado se conservan.
4. Entrar con **Responsable comercial** y comprobar lectura y edición de esa misma empresa. Guardar sin cambios debe permanecer deshabilitado. Los tres roles pueden gestionarla; responsable no implica exclusividad.
5. En listado elegir 10 por página. Si existen más de 10 coincidencias, recorrer páginas y contrastar conteo/filtros; si no, comprobar controles deshabilitados. Las dos páginas filtradas con desempate por ID están demostradas por fixtures, sin sembrar empresas de demo para forzarlas.

Pendientes: validación autenticada del usuario y OK específico posterior de integración. Sin merge, push, T25, T27 ni publicación.
