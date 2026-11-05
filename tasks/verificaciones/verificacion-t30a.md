# Verificación T30a: título opcional de la oportunidad

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`, commit `99fc7ce`. Sin merge ni push.

## Cambio

Por indicación del docente (CRM de referencia), la oportunidad puede crearse sin título; se muestra el nombre de la empresa, del contacto o de ambos. Acuerdo registrado en [decisiones-confirmadas](../../docs/segunda-entrega/decisiones-confirmadas.md#51-actualizaciones-posteriores), [SPEC-oportunidades.md](../../SPEC-oportunidades.md) y el diseño.

- SQL versionado: `oportunidad.titulo` pasa a nulable (`CHECK (titulo IS NULL OR btrim(titulo) <> '')`).
- Alta: `titulo` ausente, nulo o en blanco se guarda como null; máximo 100.
- Respuesta: `titulo` (propio, puede ser null) y `tituloVisible`, calculado al leer: título propio; si falta, razón social; o `Nombre Apellido` del contacto; o `Empresa – Nombre Apellido`. Es el nombre actual del cliente, no una copia.
- UI: título opcional con aviso de qué se mostrará, embudo preseleccionado si hay uno solo (alta con tres clics y sin escribir), ficha con `tituloVisible`. `schema.d.ts` regenerado desde la compilación nueva (API temporal en el puerto 5199, detenida), sin edición manual.

## Resultados

- Backend completo **147/147**, cero omitidas, 7 min 27 s (146 previos + `WithoutATitleTheClientNameIsShownAndAnExplicitTitlePrevails`). `AltaOportunidadTests`, `OportunidadesModelTests` y `SchemaTests` actualizados sin debilitar aserciones; el caso «sin título» dejó de ser un error y se sustituyó por «título demasiado largo».
- Frontend completo **116/116** (el nuevo caso de «tres clics»); build correcto; lint solo con la advertencia previa.

## Entorno

- Había un proceso `FluencyAPI` de Visual Studio del operador que bloqueaba los DLL de `bin/`: un primer `--no-build` corrió contra binarios viejos y **no se usó como evidencia**. Las pruebas válidas se compilaron y ejecutaron con `--artifacts-path` en un directorio temporal, sin tocar ese proceso.

## Operación manual pendiente (bases ya creadas)

El cambio está solo en el SQL versionado; no se ejecutó en ninguna base existente. En el desarrollo local (y, cuando corresponda, en producción) basta con:

```sql
ALTER TABLE oportunidad ALTER COLUMN titulo DROP NOT NULL;
```

El `CHECK` previo (`btrim(titulo) <> ''`) se mantiene y sigue rechazando textos en blanco (un `NULL` no lo viola). Hasta aplicarlo, un alta sin título falla contra esa base.
