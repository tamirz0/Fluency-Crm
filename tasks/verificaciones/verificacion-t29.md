# Verificación T29: alta de oportunidades

Fecha: 05/11/2026. Rama `segunda-entrega-oportunidades-modelo`. Sin merge ni push.

## Alcance

- `POST /oportunidades` (política `GestionarOportunidad`, 201 con `Location`) y `GET /oportunidades/{id}` (necesario para resolver el `Location` y reutilizado por T31). Sin listado, PATCH ni transiciones.
- Alta: título, `idEmbudo` (solo contexto, no se persiste) y empresa o contacto; opcionales etapa, responsable, origen, valor y campos académicos. Empresa y contacto deben estar activos y, si se envían ambos, el contacto debe pertenecer a la empresa (400 `VALIDATION_FAILED`). Referencias no disponibles: 400 `REFERENCE_UNAVAILABLE`.
- Etapa explícita: abierta, activa y del embudo activo; omitida: primera abierta activa por orden e ID. Sin ninguna: 409 `BUSINESS_CONFLICT` sin escribir. Servicio inactivo no bloquea.
- Valor: omitido o `null` copia el precio del servicio; un importe informado, incluido 0, prevalece (0 a 9.999.999.999,99, dos decimales). Participantes no multiplican.
- Responsable: omitido es el actor; el vendedor que envía otro recibe 403 `FORBIDDEN`; administrador/responsable comercial eligen un usuario activo.
- Oportunidad e historial inicial (etapa anterior null, autor de la sesión) se insertan juntos en transacción Serializable; una baja concurrente de empresa/contacto produce 409 `CONCURRENT_CHANGE` en uno de los lados (cierra la obligación de la revisión de CP09). El cuerpo no puede falsificar autor, estado, activo, fecha ni servicio (propiedades desconocidas: 400).
- `accionesPermitidas` calculadas según rol, dueño y estado; la API no las usa como autorización.

## Resultados

- Build: 0 errores, 0 advertencias. `git diff --check` limpio.
- `AltaOportunidadTests` **6/6**: mínimo con defaults e historial; valores (omitido, null, cero, participantes, precio posterior); responsable y campos falsificados; referencias y valores inválidos sin escrituras; rollback ante fallo del historial (restricción de prueba) sin oportunidad residual; carrera alta contra baja de empresa/contacto (6 rondas).
- Mutación: invertir el orden de la etapa por defecto es detectada por `MinimalCreation...` y se restauró.
- Backend completo: 145/146 en 7 min 57 s; el fallo era `HttpContractTests.ApplicationMapsOnlyCompletedActionsAndNoLegacyRoutes` (cambio legítimo de contrato: 50→52 acciones, rutas `/oportunidades` y `/oportunidades/{id}`). Se actualizó la lista esperada sin debilitarla y `HttpContractTests` pasó 19/19. No se repitió la suite completa tras ese cambio solo de test.

## Límites y pendientes

- Cada test de API tarda 34 s–1 min 55 s (arranque del host y del esquema); `AltaOportunidadTests` suma unos 6 min 40 s, por encima del presupuesto de 90 s por tarea pero sin recortar pruebas.
- `schema.d.ts` no se regeneró: lo hace T30 con su consumidor. Frontend, auditorías y Gitleaks no se ejecutaron.
- Revisión independiente pendiente (revisión propia del diff únicamente).
