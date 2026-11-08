# Verificación T04: esquema comercial

Fecha: 11/10/2026. Rama `segunda-entrega-t04-esquema-comercial`, desde `segunda-entrega` / `333d946`. Inicio autorizado explícitamente por el usuario después de la comprobación previa. T01–T03/CP01 ya integradas, comprobadas por ascendencia de Git; árbol inicial limpio. No se reabrió el plan aprobado ni se hicieron merges/publicaciones.

## Alcance y fuentes

T04.a prepara SQL explícito y pruebas PostgreSQL. T04.b concreta la preparación local y su documentación. No incorpora EF migrations, modificaciones de mapeos comerciales, roles/permisos iniciales de T05, administrador de T06 ni recorridos API/UI futuros.

Fuentes: [T04 y aceptación](../todo.md#t04), [plan](../plan.md), [SPEC común §5–6](../../docs/segunda-entrega/especificacion-tecnica.md), E-R/reglas/ejemplos del [diseño](../../docs/segunda-entrega/diseño-segunda-entrega.md), inicialización de [configuración comercial](../../SPEC-configuracion-comercial.md) y SPEC de acceso/clientes/oportunidades/actividades. Relevamiento académico con pypdf: `Definiciones-Generales.pdf` pp. 3–5 y `Modulos_Principales.pdf` pp. 4–7 para persistencia, referencias e historial; `Entregas-CRM.pdf` pp. 2–3 para alcance final. No se identificó una contradicción funcional nueva. El límite de auditoría del diseño §9.4 se conserva, sin añadir log genérico.

## Preparación y límites

Antes de implementar se confirmó contenedor activo, publicación exclusiva `127.0.0.1:5433`, PostgreSQL 17.11 e identidad/propietario de las dos bases acordadas; desarrollo y tests tenían cero tablas y cero esquemas de fixture. Vite activo en 5173; API sin escuchar en 5169. La comprobación sin elevación no tenía visibilidad suficiente de procesos/Docker; se repitió con acceso de solo lectura. No se detuvieron procesos ajenos ni se inició la API.

Las dos claves User Secrets estaban disponibles desde el entorno del agente, sin overrides de conexión. La comparación redactada de desarrollo confirmó host local/puerto/base y usuario coincidentes con el contenedor verificado. El diagnóstico inicial propio de PowerShell falló por el adaptador IDictionary de `DbConnectionStringBuilder`: asignar `.ConnectionString` creó una clave literal; usar `.set_ConnectionString(...)` resolvió la comprobación, sin modificar secretos ni bases. Esto no es un cambio de destino ni un fallo de PostgreSQL.

SQL: 20 tablas del producto, IDs generados, relaciones N:M de identidad, activos obligatorios, `numeric(12,2)`, `date`/`timestamptz`, referencias `RESTRICT`, checks locales e índices parciales. La oportunidad no almacena embudo/servicio/estado derivados. Tres estados fijos de oportunidad se siembran junto al índice que resuelve sus IDs por código; los otros catálogos se preparan en el segundo archivo. No hay usuarios, roles/permisos, servicios ni embudos de demostración.

Ambos archivos requieren destino expreso y esquema disponible. DDL y catálogos se ejecutan juntos en una transacción externa; no se reinterpretan ni recortan scripts para tests. La [guía local](../../docs/segunda-entrega/entorno-local.md#preparación-explícita-del-esquema-comercial-t04) contiene el procedimiento exacto, con comprobación de contenedor/base/propietario y rechazo de desarrollo ocupado.

El fixture comercial usa exclusivamente `SegundaEntregaTestDB`, esquema GUID propio y manifiesto explícito de tablas. Antes de limpiar comprueba base/propietario/OID, bloquea las tablas propias y valida el manifiesto; elimina en orden de dependencias con `RESTRICT` y una transacción. Una tabla sustituida/adicional, dependencia externa u objeto residual impide confirmar; no hay cascadas, borrado de bases ni barrido de restos. PostgreSQL elimina índices/constraints y secuencias dependientes de las tablas propias con ellas; no se promete inventariar todo objeto agregado a una tabla propia. `search_path` separa nombres, no constituye aislamiento por permisos del usuario local.

Los tests prueban restricciones de PostgreSQL y preservación de datos; no acreditan todavía permisos, cierres ni movimientos comerciales por HTTP. La API y sus mapeos se adaptan en las tareas siguientes. La prohibición de desactivar finales y su existencia exacta por alta de embudo corresponden a servicios transaccionales posteriores; el índice de T04 garantiza su unicidad. El rechazo de más de dos decimales corresponde a validación de entrada posterior: `numeric(12,2)` por sí solo puede redondear valores SQL directos.

## Resultados

| Control | Resultado | Duración |
|---|---|---|
| RED inicial, test de instalación antes de crear SQL | 1 fallo esperado por archivo SQL inexistente; compiló y conectó, sin omisiones. Preparación revertida. | TRX: 3,45 s |
| Primera suite SchemaTests | 3/19 correctas; 16 fallos por `SELECT nombre` ambiguo en el seed del test, corregido a `nombres.nombre`. Sin omisiones; no se interrumpió ni se debilitó el DDL. | TRX: 125,69 s |
| Focalizada correctiva: historia y limpieza | 2/2 correctas, con preservación histórica, tabla inesperada y vista dependiente que impiden limpieza. | TRX: 17,64 s |
| SchemaTests completo final, comando abajo | 20/20 correctas, cero omitidas, PostgreSQL real. | TRX: 133,16 s |
| Mutación representativa del CHECK de participantes | Cambiar `> 0` a `>= 0` produjo el fallo esperado del único caso de cero participantes: `Assert.Throws`, no se lanzó excepción. Fuente y copia de output restauradas byte a byte. | Invocación: 9,90 s; TRX: 7,20 s |
| Build backend después de restaurar SQL | Correcto, cero errores/advertencias. | Invocación: 1,80 s |
| Suite backend completa posterior, comando abajo | 46/46 correctas, cero omitidas: 20 de esquema + 26 anteriores. | Invocación: 134,61 s; TRX: 133,66 s |
| Gitleaks del índice de los cinco archivos de código | Sin secretos detectados, redacción 100 %. | Herramienta: 1,34 s; scanner: 200 ms |
| Aplicación de desarrollo del código `287c71b` | Procedimiento exacto extraído de la guía: SQL idéntico al commit, transacción confirmada en destino nuevo verificado. | Procedimiento: 0,67 s |
| Inventario final por SELECT | Desarrollo: 20 tablas; usuarios/roles/permisos/servicios/embudos/oportunidades/actividades/transiciones: 0; estados oportunidad 3, estados cliente 4, tipos actividad 9. Tests: 0 tablas y 0 esquemas propios. Propietarios correctos en ambas; desarrollo sin esquemas de fixture. | 0,44 s |
| Higiene documental | 59 enlaces locales con destino existente, 13 bloques PowerShell sin errores de sintaxis; `git diff --check` correcto. No se ejecutaron los snippets históricos. | Sin instrumentar |
| Gitleaks de los siete documentos completos por stdin | Sin secretos detectados; incluye evidencia nueva y archivos de seguimiento completos. Redacción 100 %. | Scanner: 154 ms |

Las suites superaron el presupuesto aproximado de 90 segundos; se completaron sin recortar pruebas, timeouts ni aislamiento. Los fallos iniciales pertenecían al seed nuevo y se resolvieron antes de los resultados finales. El primer intento RED dentro del sandbox salió 1 sin diagnóstico útil; las ejecuciones válidas de tests/build se realizaron con acceso al entorno local de Windows, como en T03. Un control sin diagnóstico no se contó como evidencia del comportamiento.

Los informes quedan ignorados en `node_modules/.tmp/t04-controls`: `t04-red.trx`, `t04-schema-green.trx` (fallos iniciales), `t04-schema-verified.trx`, `t04-mutation.trx` y `t04-backend.trx`; el implementador conserva además su informe focalizado. El orquestador contrastó los contadores TRX y ejecutó build/suite completa/mutación/preparación/inventario; no se aceptó solo el informe del implementador.

## Revisión y cierre

Implementador y revisor independiente usaron GPT-6.1 Sol/High por afectar SQL y limpieza. Revisión estática de requisitos, cinco archivos de código, SQL, pruebas, guía y evidencia: sin hallazgos requeridos. El orquestador pidió distinguir destino ausente/distinto en un esquema vacío (no confundirlo con rechazo de tablas previas), confirmó el bloqueo previo a comprobar OID/eliminar y ejecutó la mutación para verificar efectividad. La revisión precisó el límite de dependencias internas de DROP TABLE, reflejado arriba. No se agregó infraestructura para inventariar universalmente objetos ni se ampliaron reglas de negocio.

T04.a/T04.b completadas; código guardado en `287c71b`, documentación y seguimiento en commit separado. La instalación de desarrollo quedó confirmada, sin limpieza automática ni cuentas; no volver a ejecutar inicialización ni reconstruirla. Las pruebas limpiaron únicamente sus recursos; no quedan tablas/esquemas propios. No se hicieron merge, push ni publicación. Integración de esta rama requiere el OK del usuario; después corresponde T05 (mapeos de identidad y tres roles fijos). CP02 sigue pendiente hasta T05/T06.

## Comandos y continuidad

```powershell
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-build --no-restore --filter 'FullyQualifiedName~SchemaTests' --logger 'trx;LogFileName=t04-schema-verified.trx' --results-directory node_modules/.tmp/t04-controls
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-build --no-restore --logger 'trx;LogFileName=t04-backend.trx' --results-directory node_modules/.tmp/t04-controls
git diff --check
```

`--no-build` presupone el build vigente; para reproducir desde otro checkout, compilar antes de esas invocaciones. El caso de mutación usó `--no-restore` (con build para copiar el SQL modificado), filtro `FullyQualifiedName~SchemaTests.PostgreSqlRejectsInvalidLocalValuesOrBrokenReferences&DisplayName~cantidad_participantes` e informe `t04-mutation.trx`. La mutación se aplicó solo durante ese experimento y no está en el commit.

Gitleaks 8.30.1, binario verificado en T01 bajo `node_modules/.tmp/t01-tools/gitleaks-8.30.1/gitleaks.exe`: código staged con `git . --pre-commit --staged --redact=100 --no-banner --no-color`; documentos completos concatenados por stdin con `stdin --redact=100 --no-banner --no-color`. El índice documental final se comprueba antes de su commit. No se repitió auditoría de historial: el antecedente conocido de B4 y las limitaciones del scanner registradas en T02 conservan su alcance.

Las ejecuciones de tests usan PostgreSQL real local y la conexión TCP exclusiva; no Azure ni la base anterior. La preparación operativa de desarrollo usa `psql` por el socket del contenedor identificado y el mismo SQL versionado. No se cambiaron paquetes ni lockfiles. Auditorías de dependencias/frontend de T03 conservan su fecha y alcance; B7 no se considera resuelto y B8 sigue pendiente. Los controles no ejecutados en T04 no se presentan como repetidos.

Referencias de operación: [índices parciales PostgreSQL 17](https://www.postgresql.org/docs/17/indexes-partial.html), [esquemas](https://www.postgresql.org/docs/17/ddl-schemas.html), [psql](https://www.postgresql.org/docs/17/app-psql.html), [dependencias y RESTRICT](https://www.postgresql.org/docs/17/ddl-depend.html). El contrato del proyecto y la evidencia local gobiernan la aceptación.
