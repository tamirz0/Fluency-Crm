# Verificación CP05 — Catálogos

Trabajo iniciado el 21/10/2026; cierre en curso el 22/10/2026. Base local `segunda-entrega` / `4a6d65a`, árbol inicial limpio; T04 y T12/CP04 integradas. Rama solicitada `segunda-entrega-cp05-catalogos`. Un responsable implementa y verifica T13 → T14 → T15; revisión independiente agrupada al cierre. Sin merge, push ni T16.

## Alcance y destino

Seis catálogos configurables: estados de cliente, orígenes comerciales, niveles de inglés, modalidades, motivos de pérdida y tipos de actividad. Los tres estados de oportunidad permanecen fijos. No se altera el SQL instalado ni se inicia el mapeo de servicios/embudos.

Docker identificado en la guía: `running`, publicación exclusiva `127.0.0.1:5433`. Consulta de solo lectura previa a escrituras: `current_database() = fluency_segunda_entrega_test`, identidad/propietario coincidentes y cero esquemas `t03_*`. Los fixtures conservan host/base exclusivos, esquema GUID, validación de OID/propietario, manifiesto y limpieza propia con RESTRICT. No se consulta Supabase.

## Comprobaciones durante la implementación

Desde raíz:

```powershell
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~CatalogoMappingTests|FullyQualifiedName~SchemaTests'
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter 'FullyQualifiedName~CatalogosTests'
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
```

Desde `frontend`, Vitest con TEMP/TMP en `frontend/node_modules/.tmp`:

```powershell
npm run api:types
npm run test:run -- src/features/settings/CatalogsPage.test.tsx --maxWorkers=1
npm run test:run -- --maxWorkers=1
npm run build
npm run lint
```

- T13: prueba inicial detectó los campos ausentes; mapeo inicial 1/1 (22 s). Mapeos completos + SchemaTests **21/21**, cero omitidas, **2 min 12 s** del runner. Semillas EF de los seis catálogos y estados fijos; empresa conserva etiqueta/activo de un origen inactivo, incluso después de vaciar el tracking. Commit `dbb3518`.
- T14: RED HTTP 2/2 fallidas por rutas ausentes (30 s). El inventario actualizado de rutas pasó en su primera ejecución; mantiene el rechazo de controladores retirados.
- T14 GREEN: **2/2**, cero omitidas, **6 min 23 s** del runner (**387,95 s** invocación). Recorre los seis catálogos, alta/edición/desactivar/reactivar, duplicados normalizados, omisión/null/campos extra, búsqueda sin acentos, filtros/paginación, 401/403 y conservación de una empresa asociada. La matriz de responsable comercial se agregó para la suite final, sin otro fixture.
- T15: RED 4/4 por pantalla ausente; GREEN **4/4**, **17,81 s**. Alta con doble submit, edición, desactivación/reactivación y etiqueta conservada, filtro inactivos, nombre de tipo de actividad, estados fijos sin acciones, error/reintento/vacío y valores conservados ante rechazo. Tipos generados desde API local; ID/activo obligatorios corregidos en metadata antes de regenerar. Build backend 0 errores/advertencias (3,06 s); build frontend correcto (Vite 3,06 s), lint solo warning previo de `providers.tsx:9`.

## Incidentes y retrabajo

- El sandbox impedía acceso a Docker, escrituras de Git y la primera invocación .NET; se solicitaron los accesos correspondientes. El alias WindowsApps de Python no era ejecutable; se usó Node instalado para ediciones locales, sin instalar dependencias.
- Primer GREEN T14: 500 en altas (2 fallos, inventario de rutas correcto; 75,41 s de invocación). Una llamada diagnóstica directa dentro del mismo fixture localizó que EF no traducía filtros posteriores al constructor del DTO (7 s). Se pasó a inicializadores de propiedades. Segunda ejecución aún fallaba (75,58 s); se detuvo la cadena y se volvió a localizar la excepción: la propiedad alternativa de etiqueta no estaba declarada en la proyección usada para ordenar/duplicados (7 s). Se explicitó su valor null. Diagnósticos temporales retirados; no se bajó a evaluación en memoria ni se cambió el contrato de error para exponer detalles.
- Ninguna prueba fue interrumpida por ausencia de salida; no se usaron timeouts diagnósticos. Build, tests y API se gestionan en secuencia cuando comparten binarios.
- T15: un mock repetía el código ABIERTA como descripción y hacía ambigua la consulta del test; se ajustó a las descripciones reales y al campo nombre de tipos de actividad. Un comando de edición tuvo una ruta relativa duplicada y lanzó innecesariamente la misma prueba sin cambios; se corrigió la ruta, sin atribuir esa repetición a un fallo de producto.
- Primer cierre frontend: **37/94** (158,93 s), con 57 fallos nuevos por un único acceso `roles.includes` en la navegación compartida: los fixtures comerciales históricos no tienen roles. Se corrigió el acceso opcional, preservando pruebas/fixtures y ocultando administración sin rol/permiso; commit `da5e852`. La repetición completa se justifica por esa regresión, sin repetir backend por este cambio.
- En revisión documental propia se detectó un recorte accidental de CAPABILITIES por un separador CRLF; se restauró el contenido desde Git y se verificó el diff antes del commit. No se perdió contenido ni se cambiaron requisitos.

## Cierre, revisión y recorrido local

Revisión independiente agrupada, GPT-6.1 Sol / High, contra `4a6d65a..0728d6a` más corrección de navegación: **sin defectos concretos que requieran corrección**. Reutilizó evidencia válida y revisó estáticamente permisos actuales y relectura transaccional, lista cerrada, estados fijos, referencias/etiquetas inactivas, binding/errores y UI. No ejecutó suites ni modificó archivos. Los defectos descritos arriba fueron encontrados por implementación/verificación propia, no por ese revisor. No se mide ni atribuye ahorro de consumo.

Gitleaks 8.30.1, `git --redact --no-banner --log-opts '4a6d65a..HEAD'`: sin secretos nuevos; control final del rango y staged. Diff sin errores de whitespace; manifiestos/lockfiles, constraints y guardas de fixtures sin cambios. Auditorías de dependencias de CP04 conservan fecha y límites; no se repiten sin cambios de dependencias. La deuda de seguridad previa sigue pendiente para T47.

| Cierre final | Resultado |
|---|---|
| Backend completo | **119/119**, cero omitidas, **6 min 39 s** del runner (**404,71 s** invocación). Incluye matriz del responsable comercial y recorridos ya habilitados. |
| Frontend completo | **94/94**, once archivos, cero omisiones, **164,81 s**; aislamiento y un worker conservados. |
| Builds / tipos / lint | Correctos. Backend 0 errores/advertencias; Vite final **3,45 s**; único warning previo de `providers.tsx:9`. Tipos generados automáticamente desde API local. |
| Limpieza de tests | **0 esquemas de fixture y 0 tablas de usuario** en `fluency_segunda_entrega_test`, después de terminar la suite. |
| Operación local | OpenAPI API **200**, página Vite **200**, opciones por proxy sin sesión **401**. Navegador integrado muestra login al abrir la ruta protegida. |

Los 57 fallos de navegación quedaron resueltos sin cambiar pruebas/fixtures. API propia detenida durante build/tests backend y reiniciada después. Servicios propios de demo quedan activos: lanzador API PID **16096**, Vite PID **4776**; registros/PIDs locales ignorados en `node_modules/.tmp/cp05`. No se detuvieron procesos ajenos. La comprobación de navegador no acredita una sesión administrativa: el recorrido autenticado manual corresponde al operador.

### Recorrido del operador (destino y limpieza definidos antes de usar datos fuera del fixture)

Destino: `localhost:5433 / fluency_segunda_entrega_dev`, validado sin imprimir la conexión; consulta de identidad/propiedad correcta y un administrador activo ya existente. No se crearon cuentas ni se eligieron credenciales. Las mutaciones ejecutadas por el agente pertenecen solo a fixtures de tests; desarrollo se conserva para la validación del usuario.

1. Abrir `http://127.0.0.1:5173/configuracion/catalogos` e ingresar con el administrador existente del operador. API Development en `http://localhost:5169`; Vite usa `/api` con su proxy habitual.
2. En **Orígenes comerciales**, crear `Validación CP05 22-10`, editar su etiqueta a `Validación CP05 22-10 editada`, desactivar y filtrar **Inactivos**: etiqueta visible y acción Reactivar. Reactivar y comprobar **Activos**.
3. Para la limpieza de ese dato de demostración, desactivar únicamente esa opción y dejarla inactiva; no hay DELETE físico ni barrido SQL. Si la etiqueta ya existe, reutilizarla o elegir otra etiqueta propia, sin modificar semillas. La acción conserva referencias; no crear empresas/contactos para esta prueba.
4. Elegir **Tipos de actividad** y comprobar el campo Nombre. Elegir **Estados de oportunidad**: ABIERTA/GANADA/PERDIDA, sin alta, edición ni desactivación.
5. Con vendedor/responsable existentes, si el operador dispone de esas cuentas: sin enlace administrativo; URL directa denegada. La API y su matriz de roles están verificadas en fixtures. No crear cuentas para completar esta comprobación.

### Validación del usuario e integración (22/10/2026)

El usuario confirmó que completó y validó el recorrido manual; indicó que funciona y autorizó integrar la rama. CP05 se integró localmente en `segunda-entrega` mediante fast-forward de `4a6d65a` a `809a23a`. No se hizo push ni se inició T16.
