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
2. Ir a **Embudos y etapas**, crear `Validación CP07 31-10 Embudo` eligiendo ese servicio. Abrir **Etapas**: únicamente Ganada y Perdida, órdenes 1 y 2; mensaje de que aún no permite altas de oportunidades.
3. Crear abierta `Validación CP07 31-10 Consulta` con orden 5. Recargar y comprobar persistencia. Las finales permiten corregir textos/orden y no ofrecen desactivar ni cambiar estado/embudo.
4. En la lista intercambiar órdenes Ganada=2 y Perdida=1 y pulsar **Guardar orden**. Luego repetir un orden activo: debe mostrar conflicto y recargar, sin repetir la mutación. Corregir y guardar manualmente.
5. Desactivar Consulta; crear otra abierta con el orden 5; reactivar Consulta y comprobar orden 6. Desactivar el servicio y comprobar que el embudo y sus etapas siguen activos.
6. Desactivar/reactivar el embudo: etapas conservan estado; no restaura oportunidades. Los bloqueos por oportunidades e historia se prueban con fixtures, sin adelantar T22 ni crear negocios de demo.
7. Limpieza: desactivar solo las abiertas creadas para esta demo, después el embudo y el servicio. Las dos finales quedan activas dentro del embudo inactivo; es el comportamiento previsto.
8. Si el operador dispone de cuentas vendedor/responsable ya existentes, verificar enlace oculto y URL directa denegada. No crear cuentas para este control.

Pendiente validación real autenticada por el operador; tests UI y API separados no equivalen a ese recorrido de navegador. Integración/publicación requieren OK específico posterior.
