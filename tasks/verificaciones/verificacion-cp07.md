# Verificación CP07 — Configuración

Inicio: 31/10/2026. Base `segunda-entrega` / `bf33de8`, árbol limpio; CP06 (`c0c6a26`) y documentación posterior incluidos. Rama `segunda-entrega-cp07-configuracion`. Responsable único, secuencia T19 → T20 → T21; revisión independiente agrupada GPT-6.1 Sol / Medium prevista al cierre. Sin merge, push ni T22.

## Alcance y preparación

T19.a contratos/servicio/controlador y registro; T19.b pruebas de alta atómica, historia, bajas y permisos. T20.a sustituye API retirada de etapas, contratos y servicio; T20.b comprueba orden, reactivación, historia, carreras y rutas. T21.a tipos generados/cliente/navegación; T21.b listado, editores y pruebas UI. Se subdividen porque el inventario real supera cinco archivos por tarea. Documentación separada de implementación.

Antes de implementar se definieron resultado, pruebas focalizadas y revisión propia/independiente. Se conservan transacciones cortas Serializable y los índices existentes; no hay migraciones, dependencias nuevas, reintentos de mutaciones ni implementación comercial futura.

Contenedor documentado `running`, puerto publicado `127.0.0.1:5433`. DatabaseIsolationTests **5/5**, cero omisiones, **13 s**: conexión exclusiva `fluency_segunda_entrega_test`, identidad/propietario y limpieza propia comprobados antes de los nuevos fixtures. Se conservan guardas de host, OID, propietario, esquema GUID y limpieza RESTRICT. Sin Supabase, reconstrucciones ni cuentas fuera de fixtures.

Desarrollo comprobado por configuración efectiva (User Secrets/override, usando `set_ConnectionString`) y consulta de propietario: `localhost:5433 / fluency_segunda_entrega_dev`. Sin datos de demostración escritos por el agente. La receta PowerShell de `entorno-local.md` se conserva íntegra.

## Controles y resultados

- T19 RED: ruta ausente, 404. GREEN **2/2**, **2 min 13 s**. Alta con exactamente dos finales/órdenes 1–2 y ninguna abierta; fallo forzado en final revierte embudo y etapas. Servicio inactivo conservado, nuevas asignaciones rechazadas, bloqueos por abiertas activas, historia y bajas sin restauración comercial.
- T20 focal inicial **1/1**, **1 min 42 s**: intercambio, colisión sin cambios parciales, finales permanentes y reactivación max+1/idempotente.
- Backend focal ampliado **6/6**, cero omitidas, **4 min 18 s**: EmbudosTests + EtapasTests + inventario de rutas. Ambos operadores sin permisos de escritura; etapa sin uso se mueve, historia bloquea movimiento; dos altas HTTP con mismo orden dejan un 201 y un 409. Dos transacciones de fixture compiten por final GANADA: índice rechaza la segunda y rollback conserva una sola. No hay ruta pública para crear finales manuales.
- T21 RED: tres casos fallan por pantalla ausente. Tanda posterior **5/6**; caso restante usaba matcher no instalado, corregido sin cambiar producto ni debilitar la aserción. Suite final confirma **6/6** de esta pantalla.
- Suite backend completa **128/128**, cero omitidas, **6 min 37 s**. Incluye también carrera baja/alta de oportunidad representada por fixture Serializable (40001, sin oportunidad persistida), rechazo de elementos null y rollback de la segunda fase del reordenamiento ante colisión forzada. La corrección puntual 404 surgió durante esta ejecución; se verifica después en forma focalizada, sin repetir toda la suite.
- Corrección de revisión: **1/1**, cero omitidas, **27 s**, recompilación sin errores/advertencias. Alta bajo embudo inexistente devuelve 404, PATCH hacia destino inexistente conserva 400 y no guarda el cambio de nombre. No se repitió la suite completa por esta corrección acotada.
- Frontend completo **105/105**, trece archivos, cero omisiones, **327,92 s**, incluyendo los seis casos nuevos. Temporales locales, un worker y aislamiento conservados; imports **239,33 s**. Cubre alta de embudo sin abiertas, finales permanentes, edición diferencial, envío único, reordenamiento con conflicto visible/recarga sin retry, baja/reactivación, errores de carga/búsqueda y denegación a operadores.
- OpenAPI local regeneró `schema.d.ts` (**810 ms**), sin edición manual. Build backend **0 errores / 0 advertencias**, **1,75 s**. Build frontend/tipos final pasó (**4,39 s** Vite); lint conserva solo warning previo en `providers.tsx:9`.

Implementación guardada en `6b6cca3`. Sin cambios de dependencias, SQL instalado ni guardas de fixtures.

Comandos desde raíz, salvo npm desde `frontend`:

```powershell
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter FullyQualifiedName~DatabaseIsolationTests -v minimal
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter FullyQualifiedName~EmbudosTests -v minimal
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~EmbudosTests|FullyQualifiedName~EtapasTests|FullyQualifiedName~ApplicationMapsOnlyCompletedActions' -v minimal
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-build --no-restore -v minimal
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter FullyQualifiedName~CreatingStageUnderMissingFunnelReturns404 -v minimal
npm run api:types
npm run build
npm run lint
npm run test:run -- src/features/settings/FunnelsPage.test.tsx
# Suite completa con TEMP/TMP locales según contexto §6; no cambiar aislamiento.
npm run test:run -- --maxWorkers=1 --no-file-parallelism
git diff --check
```

## Incidentes y revisión

- Binding de body inicialmente omitido: 400; se añadió FromBody como exige la convención existente. Una proyección de DTO por constructor produjo error de traducción EF (500); diagnóstico focalizado identificó la causa y se reemplazó por el patrón existente de inicializadores. Pruebas verdes posteriores.
- Se lanzó por error otra compilación antes de finalizar la prueba anterior: MSB3027 por binario bloqueado. No se cambió producto ni se interrumpió el test activo; comprobación de procesos/duración y base sin esperas, finalizó correctamente. Los siguientes build/tests/API se secuencian.
- Generación OpenAPI restringida por acceso a localhost: EACCES; repetición con acceso local permitido exitosa. El build dependiente falló por tipos aún no generados y pasó después de generarlos.
- Test UI buscaba texto Ganada ambiguo entre nombre y estado; se corrigió para buscar el campo accesible de orden. Otra aserción usaba matcher ausente; se comprobó el mismo valor con el patrón del proyecto.
- Primera suite frontend completa omitió la receta documentada de temporales: 12 suites fallaron al importar por ENOENT, 25 pruebas ejecutadas pasaron. No es fallo de producto ni suite aprobada. La repetición con TEMP/TMP local, un worker y aislamiento conservado pasó 105/105.
- Consulta final de solo lectura mal entrecomillada: el shell expandió delimitadores SQL y PostgreSQL la rechazó antes de ejecutarla. Se transmitió SQL por stdin con la receta documentada; resultados correctos, sin cambios de datos.
- Revisión propia: errores de orden sobreviven a la recarga; selector paginado conserva la referencia elegida fuera de la página actual; no se ofrecen acciones de baja ni selector de estado/embudo en finales. Sin nuevas supresiones de lint.

Revisión independiente agrupada realizada con **GPT-6.1 Sol / Medium**, contexto acotado, solo lectura y sin repetir controles. Un hallazgo P2: alta de etapa bajo embudo inexistente devolvía 400 en vez de 404. Corregido y verificado 1/1, incluyendo conservación de 400 para destino inválido por PATCH. Sin otros defectos requeridos ni cobertura adicional imprescindible señalada. No se escaló a High ni se pidió otra revisión completa.

Gitleaks 8.30.1 staged e historial `bf33de8..HEAD`, con redacción: sin hallazgos nuevos. Revisión propia del diff completo, nuevos archivos y documentos, sin recortes ni whitespace inválido. Manifiestos/lockfiles, guardas de fixtures y constraints sin cambios. Auditorías previas conservan sus fechas y deuda (incluida B8/T47); no se repiten auditorías de dependencias sin cambios de paquetes.

Limpieza final después de todas las pruebas: **0 esquemas t03_* / 0 tablas de usuario** en la base exclusiva de tests. Desarrollo conserva **un administrador activo**, sin consultar credenciales ni crear cuentas. API propia iniciada sin build en `localhost:5169` después de terminar tests (PID 13944); Vite propio en `127.0.0.1:5173` (PID 17236). Página de embudos **200**, proxy `/api/embudos` sin sesión **401**; navegador integrado llega al login sin error. No se ingresaron credenciales. El recorrido autenticado real sigue a cargo del operador. No se añaden datos de demo fuera de fixtures.

## Recorrido local del operador

Destino: desarrollo local identificado arriba; usar el administrador existente elegido por el operador. No elegir credenciales ni crear cuentas. Datos de demostración: prefijo `Validación CP07 31-10`; al terminar, desactivar solo esos registros. No hay borrado físico ni barridos SQL.

1. Abrir `http://127.0.0.1:5173/configuracion/servicios`, iniciar sesión y crear `Validación CP07 31-10 Servicio` con precio 0.
2. Ir a **Embudos y etapas**, crear `Validación CP07 31-10 Embudo` eligiendo ese servicio. Abrir **Etapas**: bloque de abiertas vacío y mensaje de que aún no permite altas de oportunidades; Ganada y Perdida en el bloque fijo del sistema, sin números ni controles de arrastre.
3. Crear abiertas `Validación CP07 31-10 Consulta` y `Validación CP07 31-10 Propuesta`. El alta asigna automáticamente el siguiente orden activo disponible; la lista muestra posiciones visuales 1 y 2. Recargar y comprobar persistencia. Las finales ofrecen edición de nombre/descripción, sin orden, estado ni embudo.
4. Arrastrar Propuesta antes de Consulta desde el asa y pulsar **Guardar orden**. Recargar: debe conservar la secuencia. Usar ↑/↓ sobre el asa para devolverlas al orden anterior, comprobar anuncio/foco y guardar. Para probar una colisión en un embudo recién creado, editar el Orden de una abierta a 1: debe mostrar conflicto y conservar el editor; cancelar. Los valores internos de las finales siguen siendo 1/2, aunque no se muestren ni puedan editarse en esta UI. La presentación de respuestas 409 del guardado visual también está cubierta en Vitest.
5. Desactivar Consulta: debe aparecer después de las activas, numerada y con asa deshabilitada. Crear otra abierta y reactivar Consulta: debe incorporarse al final de las activas. La persistencia conserva max(orden activo)+1, independientemente de la numeración visual. Desactivar el servicio y comprobar que el embudo y sus etapas siguen activos.
6. Desactivar/reactivar el embudo: etapas conservan estado; no restaura oportunidades. Los bloqueos por oportunidades e historia se prueban con fixtures, sin adelantar T22 ni crear negocios de demo.
7. Limpieza: desactivar solo las abiertas creadas para esta demo, después el embudo y el servicio. Las dos finales quedan activas dentro del embudo inactivo; es el comportamiento previsto.
8. Si el operador dispone de cuentas vendedor/responsable ya existentes, verificar enlace oculto y URL directa denegada. No crear cuentas para este control.

Al cierre inicial quedó pendiente la validación real autenticada del operador; tests UI y API separados no equivalen a ese recorrido de navegador. La validación autenticada del ajuste visual posterior se registra abajo. Integración/publicación requieren OK específico posterior.

## Ajuste visual de etapas — 31/10/2026

Plan visual aprobado y ejecutado sobre `aa6bb7d`, árbol limpio en la misma rama. Implementación: `a25ac23`. Responsable único; cuatro archivos frontend (pantalla, editor, componente de orden y pruebas), más esta evidencia. Se conserva la historia anterior; solo se actualizó el recorrido vigente para reflejar la interfaz nueva.

Abiertas activas reordenables arriba; inactivas al final con asa deshabilitada y numeración visual continua desde 1. Finales ordenadas por código GANADA/PERDIDA, aunque cambien sus nombres u órdenes internos; sin números, arrastre, baja ni edición de orden. El editor conserva nombre/descripción. Alta abierta automática al máximo activo + 1. Tema oscuro, componentes y estilos existentes, sin dependencias nuevas.

El arrastre usa eventos de puntero desde el asa y captura sobre el cuerpo estable de la tabla; teclado ↑/↓, anuncio y conservación de foco. Solo modifica un borrador hasta Guardar orden. Se permutan las posiciones persistidas de las abiertas activas (incluidos huecos); el PUT existente sigue incluyendo todas las activas, con finales intactas e inactivas excluidas. Guardas de doble envío/movimiento pendiente, actualización de caché y conflicto visible con recarga, sin retry automático. Backend, esquema, contratos, cliente API y tipos generados sin cambios.

**Controles:**

- RED: **6 fallos / 3 correctas**, **34,60 s**, por pantalla anterior sin separación/asas y órdenes aún editables en alta/finales. GREEN focal **9/9**, **33,90 s**. Dos casos adicionales se incorporaron al cierre completo.
- Suite frontend completa: **110/110**, trece archivos, cero omisiones, **320,54 s**; incluye **11/11** del módulo. TEMP/TMP locales, un worker y aislamiento conservados. Verifica payload exacto con huecos y finales renombradas/órdenes distintos, arrastre sin escritura, teclado/anuncio/foco, cancelación, doble envío, bloqueo pendiente, conflictos/recarga, alta al máximo activo y acciones existentes.
- `npm run build`: tipos/build correctos (**4,84 s** Vite). `npm run lint`: cero errores, solo warning previo de `providers.tsx:9`. `git diff --check` y Gitleaks staged sin hallazgos. Revisión propia del diff completo/nuevo componente y del mapeo de posiciones; no se ampliaron reglas ni se debilitaron pruebas. La evidencia backend anterior conserva su alcance; no se ejecutó nuevamente una suite backend para este cambio de interfaz.

Comandos npm desde `frontend`, con `$env:TEMP` y `$env:TMP` apuntando a `frontend/node_modules/.tmp/cp07-visual-vitest`:

```powershell
npm run test:run -- src/features/settings/FunnelsPage.test.tsx --maxWorkers=1 --no-file-parallelism
npm run build
npm run lint
npm run test:run -- --maxWorkers=1 --no-file-parallelism
```

**Validación autenticada real y limpieza:** el usuario proporcionó sesión y autorizó guardar en su embudo de prueba. Se confirmó el mismo proceso API Development (PID 13944) cuyo destino `localhost:5433 / fluency_segunda_entrega_dev` ya estaba identificado, y contenedor running en `127.0.0.1:5433`. Antes de mutar se definió crear solo `Validación CP07 arrastre temporal 31-10`, restaurar el orden de Prueba y desactivar la temporal al terminar. Sin cuentas/credenciales nuevas ni uso de Supabase.

- Alta temporal sin campo Orden: persistió **4**, con máximo activo previo **3**; la abierta inactiva de orden 6 no intervino. Arrastre real mediante asa cambió la posición visual; una consulta antes de Guardar confirmó que los valores persistidos seguían intactos.
- Guardar y recargar conservó la secuencia nueva. ↑ sobre el asa de Prueba mantuvo foco, anunció su posición y permitió guardar la restauración. La final GANADA se mostró primero aun teniendo orden interno 2 y PERDIDA orden 1.
- Colisión real del editor temporal con orden 2 mostró «El orden o la etapa final ya existe. Recargue los datos.» y mantuvo el formulario. Se canceló; no hubo escritura parcial. Editor de Ganada comprobado con solo nombre/descripción; sin guardar cambios sobre finales. Baja/reactivación de la temporal comprobadas, seguida de su baja final. Consola del navegador: cero errores/advertencias.
- Consulta final: originales conservados exactamente: **Ganada 2 activa; Perdida 1 activa; Consulta 6 inactiva; Prueba 3 activa**. Solo se añadió la etapa temporal, **4 inactiva**, como limpieza lógica acordada; sin DELETE ni barridos. Captura final en `node_modules/.tmp/cp07-visual-validacion.jpg` (ignorada por Git).

Incidentes: la pestaña de navegador anterior había desaparecido; una pestaña nueva llegó al login y luego se usó la sesión facilitada por el usuario. Sin fallos nuevos de producto ni retrabajo posterior a los controles verdes. Ajuste listo para revisión, sin merge, push ni T22. La aprobación de integración sigue pendiente del usuario.
