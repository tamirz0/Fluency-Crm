# Verificación final local de la segunda entrega (T48 / CP16)

Fecha: 08/11/2026. Rama `segunda-entrega-oportunidades-modelo`, sobre el commit `ccb4828`. Todo en local: sin Azure, sin Supabase y sin usuarios automáticos de demostración. Las suites usan la base de pruebas aislada (ver [entorno local](entorno-local.md)).

## Controles automáticos

| Control | Resultado | Duración |
|---|---|---|
| `dotnet test backend/FluencyAPI.slnx` (compila los cuatro proyectos y corre la suite completa) | **172/172**, 0 fallos, 0 omitidas | 10 min 40 s |
| `npm run build` en `frontend` (`tsc -b && vite build`) | Correcto | ~10 s |
| `npm run lint` en `frontend` | Exit 0; solo la advertencia previa `react(only-export-components)` en `src/app/providers.tsx` | — |
| `npx vitest run` en `frontend` | **151/151** en 18 archivos, 0 omitidas | 43,6 s |

La suite del backend crece de 171 (T46) a 172 por la prueba nueva de `CierreTests` (Potencial → Cliente al ganar). El frontend pasa de 144 a 151 desde T46 por el trabajo posterior de oportunidades y fichas.

Seguridad: no se repite. Los controles de [T47](verificacion-seguridad.md) se hicieron hoy, tras el último cambio de dependencias, y desde entonces solo se modificaron documentos.

## Cobertura de los casos de T48

| Caso | Dónde se comprueba |
|---|---|
| Administrador configura y crea usuarios | `UsuariosTests`, `CatalogosTests`, `ServiciosTests`, `EmbudosTests`, `EtapasTests` |
| Vendedor gestiona clientes y oportunidades propias; responsable supervisa y reabre | `AltaOportunidadTests`, `CierreTests`, `ReaperturaTests`, `ReasignacionTests`; matrices 401/403 en cada módulo |
| Tabla global compartida y funnel propio | `ConsultaOportunidadesTests`, `MovimientoTests` |
| Reasignación, cierre, reapertura, historial y bajas | `ReasignacionTests`, `CierreTests`, `ReaperturaTests`, `BajaOportunidadTests` |
| Recorrido con perfiles separados | Manual, ver abajo |
| Persistencia tras reinicio | Manual, ver abajo |

## Verificación manual del usuario

- **Recorrido con perfiles separados:** aprobado por el usuario el 08/11/2026, probado con varias cuentas de vendedor.
- **Persistencia tras reiniciar la API:** comprobada por el usuario el 08/11/2026; los datos seguían disponibles.
- **T30 (alta de oportunidad con la API real):** aprobada por el usuario el mismo día.
- Del recorrido surgió un ajuste: al ganar una oportunidad, la empresa y el contacto en estado Potencial pasan a Cliente. Implementado en `4f16300`, probado y documentado en `SPEC-oportunidades.md`.

## Deuda y límites

- Las suites con `LegacyApp` siguen sin migrar al `App` real (deuda registrada en T46).
- `creacion-tablas.sql` de la primera entrega conserva un usuario de demostración y sigue enlazado desde el README (ver el informe de seguridad). No afecta al esquema de la segunda entrega.
- La evidencia manual es declarada por el usuario; no se conservan capturas ni registros por rol.
- No se valida Azure ni Supabase. TLS efectivo hacia Supabase sigue sin verificarse (límite de CP02). La preparación de publicación corresponde a T49.
