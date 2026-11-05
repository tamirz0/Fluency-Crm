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

## Subtítulo de cliente en la ficha (05/11/2026)

A pedido del usuario, cuando la oportunidad tiene título propio la ficha muestra debajo la empresa, el contacto o «Empresa – Contacto» (`clientLabel` en `opportunityData.ts`, reutilizable por la tabla y el tablero de T32/T33). Sin título, el encabezado ya es ese nombre y no se repite. Cubierto en `forms.test.tsx`; frontend completo 117/117, build correcto.

## Contactos y centrado (05/11/2026)

- **Tabla de contactos:** tiene 8 columnas pero los anchos fijos en porcentaje cubrían 7, de modo que «Responsable» quedaba sin espacio y se partía letra por letra. Un primer intento con diseño automático dejó la tabla más angosta que su contenedor y con estilos rotos, y se descartó. Ahora hay anchos explícitos para las 8 columnas (suman 100 %, tabla con ancho completo y desplazamiento horizontal bajo 980 px) y, bajo 900 px, el listado cambia a tarjetas, igual que Empresas (`ContactCards`).
- **Centrado:** Usuarios, Catálogos, Servicios, Embudos y el inicio usaban un contenedor propio alineado a la izquierda (`maxWidth: 1600`), a diferencia de Empresas y Contactos (`.companies-page`, máximo 1440 px centrado). Ahora usan el mismo contenedor (referencias del usuario en `Referencias/mal-centrado`). Esto no tenía relación con el rediseño revertido.
- **Aviso de sesión:** se retiró el cartel flotante; vuelve a mostrarse en línea como antes. Se conserva la frase de marca del login centrada.
- Frontend completo 116/116, build correcto. Pendiente la revisión visual del usuario.
