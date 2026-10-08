# Constraints de la segunda entrega

Acuerdos con el usuario: 07/10/2026. Proyecto académico. Este archivo fija criterios verificables; la instalación de herramientas, nuevos tests y automatización se difieren a la etapa de implementación pedida por el usuario.

Acuerdos de producto y permisos confirmados el 08/10/2026: [decisiones de la entrevista](docs/segunda-entrega/decisiones-confirmadas.md). La consulta comercial es compartida; las pruebas de autorización deben distinguir visibilidad de permiso de modificación. Todas las pruebas se realizan localmente.

## 1. Acuerdos

- Priorizar pruebas de reglas y recorridos fundamentales en backend y frontend, más seguridad de dependencias y secretos.
- No exigir cobertura total ni un porcentaje mínimo de líneas, ramas o mutaciones. No se agregó un proveedor de cobertura.
- Bloquear el cierre de una tarea por fallos nuevos de build, tipos, lint o pruebas, nuevos secretos y nuevos hallazgos de seguridad altos/críticos. Registrar problemas preexistentes por separado, sin permitir que empeoren.
- Procurar que los controles por tarea duren hasta unos 90 segundos. Es un presupuesto operativo, no un timeout para cortar pruebas y declararlas aprobadas. Reservar la suite completa y controles lentos para el cierre de cada módulo, dejando explícito qué se ejecutó por tarea.
- No se incorporan presupuestos de rendimiento ni una auditoría automática de accesibilidad como nuevas exigencias. Se conservan las convenciones existentes de teclado, foco, etiquetas y mensajes accesibles.
- Autonomía de Git acordada: el agente puede crear ramas y commits para el trabajo autorizado desde `segunda-entrega`. Los incrementos se integran en `segunda-entrega` después de presentar verificaciones y obtener el OK del usuario; `main` requiere una decisión explícita posterior. Ver `AGENTS.md` para el flujo y los nombres compatibles con Git.

## 2. Reglas de integridad del trabajo

- No agregar supresiones de comprobaciones para ocultar errores (`@ts-ignore`, desactivación de reglas de lint, exclusiones de cobertura/seguridad o equivalentes).
- No borrar, saltar ni debilitar pruebas para obtener un resultado verde. Si cambia legítimamente una regla funcional, actualizar las pruebas con referencia al diseño y justificar qué cambió.
- No dejar implementaciones ficticias, excepciones de “no implementado” ni errores ignorados silenciosamente en un recorrido declarado completo.
- No incorporar secretos al código, documentación, fixtures o salidas. Conservar los hallazgos redactados.
- No rebajar estas condiciones ni inventar excepciones. Una excepción nueva requiere un acuerdo explícito, alcance, motivo, responsable y vencimiento o hito de revisión.
- Revisar también archivos nuevos y cambios staged; `git diff` por sí solo no cubre todo el trabajo. Los diffs sensibles se inspeccionan con valores redactados.

Estado de aplicación: reglas escritas para revisión de cada cambio; no hay guard automático ni hooks instalados. Las exclusiones preexistentes se registran como deuda, no como permiso para copiar el patrón.

## 3. Controles disponibles

| Control | Criterio | Comando / mecanismo | Cuándo y estado |
|---|---|---|---|
| Tipos y build frontend | Cero errores nuevos; la configuración existente debe seguir compilando. | `npm run build` desde `frontend`. | Cierre de tarea que cambie frontend y cierre de módulo. Pasó en el relevamiento. No equivale a `strict: true`. |
| Lint de código propio | Cero errores nuevos, sin ocultarlos ni añadir supresiones. Registrar nuevas advertencias y resolver o justificar su causa. | `npm run lint -- src vite.config.ts` desde `frontend`. | Tareas frontend. Pasó con una advertencia previa. La selección explícita evita recorrer dependencias en este entorno. |
| Tests frontend | Cero fallos nuevos en pruebas pertinentes; conservar comprobaciones de comportamiento. | `npm run test:run -- <ruta-del-test>` para un archivo pertinente; `npm run test:run` para suite completa. | Por tarea: pruebas afectadas. Por módulo: suite completa. Adaptación de temporales documentada en el contexto. |
| Build backend | Cero errores nuevos. | `dotnet build backend/FluencyAPI.slnx --no-restore -m:1` desde raíz, después de restaurar dependencias si faltan. | Tareas backend y cierre de módulo. Variante diagnóstica con `-v:normal` pasó. |
| Higiene del diff | Sin errores de whitespace en los cambios propios ni alteraciones ajenas a la tarea. | `git diff --check`; revisión de archivos modificados, staged y nuevos. | Cada entrega de cambios. Para archivos nuevos, inspeccionarlos además: Git aún no los incluye en el diff normal. |
| Protección del nivel acordado | Ninguna regla debilitada, prueba silenciada o secreto nuevo. | Revisión del diff completo frente al estado inicial de la tarea, con redacción de secretos. | Cada tarea; revisión humana/agente, todavía sin automatización. |

No basta comparar cantidades de fallos: revisar su identidad y causa. Sustituir un fallo previo por uno nuevo no satisface “no empeorar”. Los fallos esperados por una regla funcional deliberadamente cambiada requieren actualizar la prueba con evidencia, no eliminarlos de la suite.

## 4. Seguridad: criterios acordados y activación pendiente

| Dimensión | Criterio acordado | Mecanismo de verificación | Estado real |
|---|---|---|---|
| Dependencias npm | Cero nuevos hallazgos altos/críticos en dependencias directas o transitivas. | `npm audit --audit-level=high` en `frontend` y en raíz; revisar resultados contra la base previa. No usar `audit fix` automáticamente. | npm disponible. Se intentó `npm audit --json --ignore-scripts` en frontend y falló por DNS (`ENOTFOUND registry.npmjs.org`). No existe todavía inventario válido de vulnerabilidades. |
| Dependencias .NET | Mismo criterio de severidad; el fallo de consulta no cuenta como análisis limpio. | `dotnet list backend/FluencyAPI.slnx package --vulnerable --include-transitive --no-restore --format json`; inspeccionar severidades del resultado. | CLI y opciones comprobadas en ayuda local; consulta de vulnerabilidades pendiente. El comando no constituye por sí solo un bloqueo automático por severidad. |
| Secretos | Cero nuevos secretos; no imprimir valores detectados. | Revisión redactada de cambios. Propuesta para automatizar: Gitleaks con redacción, cubriendo archivos nuevos y cambios de trabajo además del historial que corresponda. | Gitleaks no encontrado en PATH; no instalado ni ejecutado. No hay un escaneo completo ni un resultado “sin secretos”. |

Los controles de dependencias usan bases externas de vulnerabilidades; aportan verificación independiente de los tests propios. Su activación y comparación reproducible quedan pendientes de implementación. Sin un análisis exitoso inicial no se puede afirmar que un hallazgo sea nuevo o previo.

Para una tarea que cambie dependencias o autenticación, una revisión faltante debe quedar expresamente pendiente y no presentarse como validada. Esto no bloquea preparar documentación de contexto ni obliga a instalar herramientas en esta etapa.

## 5. Qué se considera testing fundamental

Este es el alcance de verificación acordado, no un listado de tareas ni el diseño de la futura suite. Los casos concretos se derivan de §14 de `docs/segunda-entrega/diseño-segunda-entrega.md` y de los contratos que se acuerden.

| Área | Evidencia mínima esperada al implementar ese módulo |
|---|---|
| Acceso y permisos | Acceso permitido y denegado; usuario inactivo; alcance por rol/registro; autor obtenido de la sesión del servidor; reapertura sin permiso rechazada. |
| Alta de oportunidad | Al menos empresa o contacto; defaults correctos; datos opcionales no bloqueantes; embudo sin abierta activa rechazado; historial inicial persistido. |
| Embudos y etapas | Finales únicas y no desactivables, orden activo por embudo, destinos del mismo embudo y disponibilidad según el uso directo. |
| Movimiento, cierre y reapertura | Una transición efectiva genera historial; pérdida exige motivo; ganada conserva valor/fecha; reapertura autorizada conserva cierre anterior; sin escrituras parciales si falla la operación. |
| Asociaciones y bajas | Cambio de empresa del contacto preserva relaciones anteriores; edición ajena a la asociación sigue permitida; bloqueos de clientes distintos de embudos; sin cascadas ni restauración de datos comerciales. |
| Actividades e historiales | Usuario y ambas fechas correctos, coherencia del contexto, orden cronológico y visibilidad tras bajas según diseño. |
| Consultas | Filtros y paginación coherentes, sin datos fuera del permiso del usuario y sin pérdidas/duplicaciones por orden inestable. |
| Interfaz de recorridos críticos | Validación visible, permisos reflejados, tratamiento de carga/error, requests correctos, prevención de doble envío y actualización de datos visibles. |

Probar una regla en el nivel que realmente la protege. Los mocks de frontend no demuestran permisos, transacciones ni integridad de PostgreSQL. Para reglas persistentes fundamentales hará falta evidencia de integración con datos de prueba aislados; runner y preparación se decidirán después.

No se exigen tests que repliquen internals, snapshots extensos, todas las combinaciones cosméticas ni pruebas nuevas por cada edición documental. Conservar la suite existente salvo cambios funcionales deliberados y justificados.

## 6. Línea de base y deuda previa

Base: `segunda-entrega` / `f9fde15` más cambios locales de configuración y URL que ya existían al iniciar. Este inventario no concede excepciones permanentes ni afirma que el producto esté listo para entrega.

| ID | Situación observada | Tratamiento |
|---|---|---|
| B1 | 68 tests pasaron y 3 fallaron de 71; los tres de `Companies.test.tsx` esperan `/api/...` pero el cliente local apunta a Azure. | Preservar el cambio del usuario. Resolver coherencia de configuración/expectativas en la próxima etapa; no suprimir asserts. |
| B2 | `npm run lint` sin rutas recorrió `node_modules`; la invocación explícita al código propio pasó. | Documentar alcance real y normalizar el comando al implementar infraestructura de checks. |
| B3 | Advertencia `react/only-export-components` en `frontend/src/app/providers.tsx:9`. Supresión previa `react/refs` en `LoginPage.tsx`; `CS1591` deshabilitado en proyectos API/Services. | Registrar como existente; no introducir nuevas supresiones por analogía. |
| B4 | Conexión de respaldo con contraseña literal en `backend/Persistence/Models/FluencyLocalDbContext.cs:67`. | Valor redactado; resolver manejo de secretos. No se verificó validez ni se realizó auditoría de historial. |
| B5 | Sin autenticación/autorización efectiva de backend, tests .NET ni controles completos de seguridad. | Brechas del objetivo. No considerar permisos validados por pasar la suite frontend. |
| B6 | Primera ejecución de Vitest falló al cargar temporales del sandbox. La repetición con TEMP/TMP dentro de `frontend/node_modules/.tmp` y un worker completó en 177,51 s. | Problema de entorno distinguido de B1. La suite completa supera el presupuesto por tarea y queda para cierre de módulo; no se cambia aislamiento ni se recortan pruebas para bajar el tiempo. |

No hay excepciones nuevas aprobadas. La deuda se vuelve a evaluar al trabajar sobre el área afectada y antes de declarar completa la entrega final. Responsable de decidir su aceptación: usuario/equipo del trabajo práctico, sin asignar obligaciones a personas no consultadas.

## 7. Cierre y continuidad

Por tarea informar archivos cambiados, controles ejecutados y resultados, fallos nuevos/previos y comprobaciones pendientes. Si el entorno impide un control, registrarlo como no verificado; no como aprobado. Los 90 segundos no habilitan a omitir evidencia fundamental.

Por módulo ejecutar la suite pertinente completa y verificar el recorrido real contra un entorno de prueba identificado. La consigna evalúa funcionamiento integral y persistencia, que un build no demuestra.

Actualización del 08/10/2026: especificación técnica y [plan](tasks/plan.md) aprobados; planificación cerrada y [tareas verificables](tasks/todo.md) pendientes de implementación. Este contrato de calidad no cambia con la aprobación. No se agregaron scripts, dependencias, CI, tests ni cambios funcionales en esta preparación.
