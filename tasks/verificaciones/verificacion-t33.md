# Verificación T33: funnel según el rol

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `/embudo` publicada en `App` y en el menú (se retiró la propiedad `commercial` del menú: «Oportunidades» y «Embudo» ya son siempre visibles). `FunnelPage` consume `GET /embudos/{id}/funnel`.
- Selector de embudo (primer embudo activo por defecto) que separa los procesos; un embudo inactivo se puede consultar y lo explica un aviso. Columnas tal como las devuelve el servidor (activas, también vacías y finales; las finales se rotulan «Ganada»/«Perdida» en el contador). Cada columna se puede contraer y las tarjetas conservan el resumen y la expansión (valor, cierre estimado, responsable).
- Vendedor: no ve selector de responsable ni envía `idResponsable`; el servidor fuerza su cartera (comprobado en T31). Administrador y responsable comercial: selector de responsable opcional que envía `idResponsable`. La tabla global no se ve afectada.
- `client.ts`: `getFunnel`, tipo `Funnel` y clave de caché por embudo y responsable. Se retiran el contrato anterior de transición (`updateOpportunityStage`, `getCommercialStages` y tipos asociados), `OportunidadResumen` y `flattenOpportunitiesByStage`; `orderStagesByPosition` se conserva porque la pantalla de inicio anterior todavía la usa.

## Resultados

- `FunnelPage.test.tsx` 3/3: columnas vacías y finales con tarjetas, expansión y contracción; vendedor sin selector ni `idResponsable`; superior que filtra por responsable, cambia de embudo y ve el aviso de embudo inactivo; error con reintento y estado sin embudos.
- Frontend completo **113/113** (dos corridas seguidas), 15 archivos. `tsc -b` y `npm run build` correctos; `npm run lint` solo con la advertencia previa de `providers.tsx:9`.
- Cambios legítimos de pruebas: se retiraron cuatro de `Consultations.test.tsx` (aplanado por etapas y funnel/transición del contrato anterior) y el caso de ruta retirada `/embudo` de `App.test.tsx`, que se reemplazó por un caso que habilita `/oportunidades` y `/embudo`. `forms.test.tsx` responde el historial vacío de la ficha.

## Límites y pendientes

- **Aceptación 3 parcial:** el selector de transición («Cambiar etapa») no existe todavía; depende del comando `/mover` (T36) y del cierre (T37), que no están implementados, así que no se dejó un botón sin efecto. Tarjetas resumidas y expansión conservadas.
- Dos vendedores con el mismo embudo contra API real: cubierto en backend por `ConsultaOportunidadesTests` (T31); el recorrido en navegador queda para el usuario.
- Revisión independiente, auditorías npm y Gitleaks pendientes.
