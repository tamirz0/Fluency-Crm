# Verificación CP06 — Servicios

Inicio: 22/10/2026. Base `segunda-entrega` / `4d0c966`, árbol limpio; CP05 y los commits documentales `c8e56c3` / `4d0c966` incluidos. Rama solicitada `segunda-entrega-cp06-servicios`. Un responsable implementa, verifica y revisa T16 → T17 → T18; revisión independiente agrupada GPT-6.1 Sol / Medium al cierre. Sin merge, push ni T19.

## Alcance y destino

T16: mapeos de servicio, embudo y etapa/estado, sin gestión de embudos/etapas. T17: API REST paginada de servicios, precio decimal/cero, permisos administrativos y referencias opcionales/inactivas. T18: listado/editor administrativo, edición diferencial y transporte/tipos actuales. Reutiliza cookie, antiforgery, actor, transacciones y patrones CP04–CP05; no introduce un mecanismo de seguridad o concurrencia que justifique High.

Antes de escribir: contenedor documentado `running`, publicación `127.0.0.1:5433`; consulta de solo lectura confirma `fluency_segunda_entrega_test` y propietario. Fixtures existentes conservados: host/base exclusivos, esquema GUID, guardas de identidad/OID/propietario y limpieza propia RESTRICT. Solo se escribieron datos ficticios dentro de esos esquemas. Sin Supabase ni reconstrucciones. La API local autorizada se detuvo antes de compilar; build, tests y API se secuencian.

El inventario supera cinco archivos por tarea contando tests/wiring/documentación. Subdivisión secuencial: T16.a entidades/mapeo, T16.b prueba de relaciones y restricciones SQL existentes; T17.a contratos/servicio/controlador, T17.b pruebas HTTP/inventario de rutas; T18.a cliente/tipos/navegación, T18.b pantalla/editor y pruebas. Cierre documental separado de implementación.

## Evidencia focalizada

- T16: prueba inicial no compila por navegaciones/DbSet ausentes. GREEN mapeo + SchemaTests **21/21**, cero omitidas, **2 min 13 s** del runner. Materializa etapa → estado y embudo → servicio, conserva embudo activo con servicio inactivo y lee oportunidad por el esquema objetivo. Restricciones SQL: orden activo único, repetición inactiva permitida y finales únicas aun inactivas. Commit `2e4140e`.
- T17: **3/3**, cero omitidas, **3 min 22 s** del runner (ServiciosTests + inventario de rutas). 401/403 y ambos operadores; alta/precio cero/decimal de diez enteros; rechazo de más de dos decimales/rango/negativos/null/omisión/campos extra; PATCH conserva o limpia opcionales; referencias inactivas existentes se conservan, nuevas se rechazan; búsqueda sin acentos/filtro/paginación; desactivación repetida conserva embudo activo. Ruta anterior retirada. Commit `07119de`.
- T18: RED **5/5** por pantalla aún ausente; GREEN **5/5**, **31,32 s**. Alta cero/doble envío, edición diferencial con referencias inactivas, errores reales sin cierre ni éxito ficticio, rechazo de precisión extra y envío decimal exacto, búsqueda/filtro al servidor, carga/reintento/vacío y acceso denegado sin consultar servicios.
- Frontend completo: **99/99**, doce archivos, cero omisiones, **310,81 s**. Aislamiento y un worker conservados. El runner atribuye 234,84 s a imports; no se desactivó aislamiento ni se repitió la suite por su duración.
- Build backend `dotnet build backend/FluencyAPI.slnx --no-restore -m:1`: **0 errores / 0 advertencias**, **4,30 s**. Suite backend completa **122/122**, cero omitidas, **6 min 37 s** del runner. Tras ella, revisión propia ajustó descripción opcional con blancos a null según contrato común; comprobación focalizada posterior **1/1**, **2 min 10 s**, recompilación sin errores/advertencias. Corrección en `a0bceac`.
- Tipos regenerados desde OpenAPI local (**506,1 ms**), sin edición manual; build frontend correcto (**3,14 s** Vite), lint sin errores y únicamente warning previo `providers.tsx:9`.

Comandos desde raíz (build, tests y API en secuencia):

```powershell
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~ServicioMappingTests|FullyQualifiedName~SchemaTests'
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~ServiciosTests|FullyQualifiedName~ApplicationMapsOnlyCompletedActions'
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --no-build
# TEMP/TMP en frontend/node_modules/.tmp para Vitest; comandos desde frontend:
npm run api:types
npm run test:run -- src/features/services/ServicesPage.test.tsx --maxWorkers=1
npm run test:run -- --maxWorkers=1
npm run build
npm run lint
```

## Incidentes y retrabajo

- Docker/Git/.NET requieren acceso fuera del sandbox; comprobaciones autorizadas, sin imprimir conexiones ni credenciales.
- Un parche de reemplazo completo fue rechazado por usar delete/add sobre la misma ruta; no modificó archivos. Se usó escritura directa para los archivos de código sustituidos.
- Una edición de precisión apuntó inicialmente al primer `HasPrecision(10,2)` (descuento legado); la revisión del diff lo detectó y corrigió antes del commit, conservando el legado y cambiando únicamente precioReferencia a 12,2. La suite posterior compila el estado corregido.
- Intento RED T17 después de cambiar la interfaz: compilación falló porque el controlador anterior todavía llamaba GetAllAsync. Se completó su consumidor antes del GREEN; no fue un fallo de entorno ni evidencia HTTP. No se repitió ese intento.
- Pruebas sin salida: se respetó su duración y se contrastó el proceso antes de recoger el resultado; ninguna fue interrumpida. No se agregó infraestructura de consumo.
- El diagnóstico inicial de Development usó una asignación de propiedad que PowerShell interpretó como clave del diccionario DbConnectionStringBuilder; falló la guarda sin escribir en base. La inspección redactada mostró el problema; usando set_ConnectionString se confirmó host local/5433/base de desarrollo, sin override y propietario correcto. Existe un administrador activo; no se imprimieron credenciales ni se crearon cuentas.
- Primera generación de tipos: sandbox bloqueó localhost con EACCES. Se repitió con acceso autorizado al mismo destino; generador, build y lint correctos. No fue un defecto de producto ni se repitieron suites por ello.

## Cierre y revisión

Revisión independiente agrupada **GPT-6.1 Sol / Medium**, rango `4d0c966..da6c7dd` y esta evidencia: **sin defectos que requieran corrección dentro de CP06**. Contrastó mapeos/SQL, precio decimal/cero, permisos/actor/relectura transaccional, PATCH omitido/null, referencias inactivas, independencia de embudos, paginación, consumidores y estados del editor. Solo lectura, sin repetir suites/builds/API ni sugerencias opcionales. El revisor confirmó el límite del recorrido autenticado pendiente; no lo reemplaza por los tests separados.

Gitleaks 8.30.1, `git --redact --no-banner --log-opts '4d0c966..HEAD'` y `git --staged --redact --no-banner`: **sin secretos nuevos** en los cuatro commits de implementación y documentos staged. Revisión propia de nuevos archivos y diff documental acotado, sin recortes accidentales ni errores de whitespace. Dependencias, lockfiles, constraints y guardas de fixtures sin cambios; auditorías previas conservan fecha/límites y deuda para T47. Sin fallos de producto pendientes. Los incidentes detectados por implementación/revisión propia quedaron corregidos; la revisión independiente no generó retrabajo. Se registran duraciones y resultados, sin atribuir ahorro de consumo ni agregar medición.

Limpieza final comprobada después de todas las pruebas: **0 esquemas t03_* y 0 tablas de usuario** en `fluency_segunda_entrega_test`. API propia reiniciada sin build, lanzador PID **13340**; Vite existente PID **4776** conservado. Logs/PID propios en `node_modules/.tmp/cp06` (ignorado). Página local **200**, proxy `/api/servicios` sin sesión **401**. Navegador integrado llega a login desde la ruta protegida; no hay sesión administrativa disponible en ese navegador, por lo que el recorrido real autenticado queda para el operador. Los tests cubren UI y persistencia/API por separado; no se presenta esa combinación como un recorrido real de navegador ya ejecutado.

## Recorrido local del operador

Destino comprobado: `localhost:5433 / fluency_segunda_entrega_dev`, configuración efectiva sin override y propietario correcto, con un administrador activo existente elegido por el operador. No se crean cuentas ni se eligen credenciales. El agente no agrega datos de demo fuera de fixtures.

1. Abrir `http://127.0.0.1:5173/configuracion/servicios` e ingresar con el administrador existente. API Development en `http://localhost:5169`, proxy `/api` habitual.
2. Crear `Validación CP06 22-10` con precio **0**, sin nivel/modalidad/duración; guardar y actualizar la página para comprobar persistencia.
3. Editar precio a **123.45** (también admite coma decimal en UI), duración **20** y una referencia activa elegida por el operador. Guardar, recargar y comprobar que sigue en **123,45** sin multiplicación por duración.
4. Probar **1.005**: debe rechazar más de dos decimales, conservar el formulario y no guardar. Cancelar o corregir.
5. Desactivar, filtrar **Inactivos**, editar otro campo y reactivar. Si hay un servicio propio con nivel/modalidad ya inactivos, editar su descripción y comprobar etiquetas y referencias conservadas; no desactivar semillas para fabricar el caso. API/UI cubren el caso en fixtures.
6. Limpieza del dato de demostración: desactivar únicamente ese servicio y dejarlo inactivo; no hay DELETE ni barrido SQL. No crear embudos para la demo de CP06. La independencia de embudos se verificó en fixtures; su gestión corresponde a T19.
7. Con vendedor/responsable ya existentes, si el operador dispone de esas cuentas: enlace administrativo oculto y URL directa denegada. No crear cuentas para esta prueba.

Validación manual del usuario e integración pendientes; no autoriza merge ni publicación.
