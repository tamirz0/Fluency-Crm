# CP09 — Contactos (en curso)

Inicio: 03/11/2026. Base `segunda-entrega` / `648853e` (CP08 integrada localmente). Rama `segunda-entrega-clientes`. Sin merge ni push autorizados. Este archivo cubre por ahora solo **T25**; T26, T27 y el cierre de CP09 siguen pendientes.

## T25 — Alcance

Responsable único (Sol/Medium), solo backend. Reemplaza la API retirada de contactos por `GET/POST /contactos` y `GET/PATCH /contactos/{id}` con el patrón de empresas (T23): permisos abiertos a todo usuario activo, PATCH diferencial atómico, transacción Serializable, filtro de errores con `code`. Cambiar o quitar la empresa modifica solo la FK del contacto (se eliminó el rechazo por oportunidades). El historial de etapas del contacto no se migra: lo aporta el contrato de actividades (T44). Sin `DELETE` (T27). Revisión independiente agrupada al cierre de CP09.

## Entorno e incidentes

- Destino de tests: `localhost:5433/fluency_segunda_entrega_test`, clave `ConnectionStrings:SegundaEntregaTestDB` en User Secrets. Las guardas del fixture no se tocaron.
- Primeras ejecuciones de `ContactosTests` fallaron 3/3 por **configuración local, no por producto**: primero faltaba la clave de tests; luego estaba con puerto `5432` y un punto final en el nombre de la base. El operador las corrigió; el fixture las rechazó correctamente mientras tanto.
- Sin cambios de producto por esos fallos. Sin Supabase ni reconstrucción de bases.

## Resultados

- Build de la solución sin advertencias ni errores (compilación previa a las pruebas).
- `ContactosTests` **3/3**, 5 min 9 s: roles y defaults, PATCH diferencial atómico, referencias inactivas conservadas/no reseleccionables, cambio A→B y desvinculación sin tocar la oportunidad, filtros combinados antes del conteo, búsqueda por razón social y diacríticos, paginación con orden estable, 401/404/400.
- Regresión `HttpContractTests` + `ClientesModelTests` + `EmpresasTests` **23/23**, 3 min 48 s. `HttpContractTests` actualizado: 48 acciones, `ContactoController` habilitado e inventario OpenAPI con `/contactos` y `/contactos/{id}`.
- `git diff --check` sin hallazgos.

## No ejecutado (no aprobado)

- Suite backend completa: se reserva para el cierre de CP09 (plan §5).
- Frontend, regeneración de `schema.d.ts` y recorrido manual: corresponden a T26.
- Revisión independiente: agrupada en CP09.
- Conteo de esquemas `t03_*` residuales tras las pruebas: no comprobado en esta sesión (sin acceso a `psql`/Docker desde el shell del agente).
- Los tiempos de los tests (≈1–2 min por caso) son altos para una base local; no se investigó.

## Comandos reproducibles

Desde la raíz:

```powershell
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore --filter "FullyQualifiedName~ContactosTests"
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-build --filter "FullyQualifiedName~HttpContractTests|FullyQualifiedName~ClientesModelTests|FullyQualifiedName~EmpresasTests"
git diff --check
```
