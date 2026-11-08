# Verificación CP13: módulo de oportunidades

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo` (commits desde `0badcd9`, T28, hasta T39). Sin merge ni push; el OK de integración queda a cargo del usuario.

## Alcance cubierto

T28–T39 con sus consumidores: modelo e historial, alta, consulta compartida (tabla, ficha, historial y funnel por rol), edición, reasignación, movimiento, cierre ganada/perdida, reapertura con el cierre anterior conservado como texto y baja lógica. T30a (título opcional) incluida. Cada incremento tiene su evidencia técnica en `verificacion-t28.md` … `verificacion-t39.md`.

## Resultados (estado al commit de T39, `6ef1a13`)

- **Backend completo: 163/163** (9 min 30 s, sin omisiones). Build sin errores ni advertencias.
- **Frontend completo: 132/132** (17 archivos); `tsc -b` y `npm run build` correctos; `npm run lint` solo con la advertencia previa de `providers.tsx:9`.
- Circuito alta → reasignación → movimiento → cierre → reapertura → baja cubierto por API real contra PostgreSQL: `AltaOportunidadTests`, `ReasignacionTests`, `MovimientoTests`, `CierreTests`, `ReaperturaTests` (cerrar → reabrir → corregir → cerrar de nuevo), `BajaOportunidadTests`; consultas en `ConsultaOportunidadesTests`; carreras representativas en cada módulo (edición/reasignación, movimientos, cierres, reaperturas y baja simultáneos) con historia coherente.
- Bloqueos de clientes y configuración repetidos con operaciones reales (no fixtures): empresa, contacto, embudo y etapa se bloquean mientras haya oportunidades vigentes abiertas o cerradas y se liberan al darlas de baja (`BajaOportunidadTests`, `BajasClientesTests`, `EmbudosTests`, `EtapasTests`).
- Los recorridos ya habilitados (acceso, usuarios, catálogos, servicios, embudos/etapas, empresas, contactos) siguen pasando en la misma ejecución completa.

## Cambios legítimos de pruebas (resumen)

Contrato de rutas de `HttpContractTests` (de 50 a 62 acciones, rutas añadidas en cada tarea); retiro de las pruebas del listado/funnel/transición del contrato anterior reemplazadas por las del contrato nuevo (T32, T33); ampliación de `forms.test.tsx`, `bajas.test.tsx` y `FunnelPage.test.tsx`; pruebas nuevas de diálogos de cierre y reapertura.

## Pendientes y límites

- **Revisión independiente previa al merge: pendiente.** Solo hubo revisión propia del diff de cada tarea. El código de las operaciones de escritura repite el mismo preámbulo (permiso, transacción Serializable, actor activo, propiedad y estado); no se unificó para no introducir riesgo sin una necesidad real.
- **Validación autenticada del usuario pendiente** (T30 y los recorridos de UI de T32–T39): recorrido manual con API real y revisión visual en el navegador; no se pudo hacer en esta sesión. T30 sigue sin marcarse terminada hasta entonces. **Operación manual pendiente en bases ya creadas:** `ALTER TABLE oportunidad ALTER COLUMN titulo DROP NOT NULL;` (T30a).
- Auditorías npm y .NET y Gitleaks no se repitieron en este tramo; la deuda de dependencias de CP04 (Vite, Vitest, `source-map-js`) sigue abierta hasta T47.
- Las actividades (T40+) aún no existen: «actividades se conservan tras la baja» queda por verificar en ese módulo.
