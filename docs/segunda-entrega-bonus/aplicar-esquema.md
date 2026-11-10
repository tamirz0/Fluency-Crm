# Aplicar el esquema del bonus de academia

Fecha: 09/11/2026. **Preparado, no ejecutado en ninguna base real por el agente.** Actualizado el 09/11/2026 con los tipos de servicio y los embudos base (ver el apartado siguiente). Los scripts son aditivos: no borran ni modifican datos existentes y se rechazan si ya fueron aplicados.

**Atajo para pegar en la consola SQL (producción, compañeros):** [`agregar-bonus-academia.sql`](../../backend/Persistence/SQL/agregar-bonus-academia.sql) hace todo lo de las dos filas siguientes en una sola transacción, sin editar nada y repetible; termina con una consulta de verificación. Para una base nueva alcanza con [`creacion-tablas.sql`](../../backend/Persistence/SQL/creacion-tablas.sql), que ya incluye el bonus. Una prueba comprueba que ambos sigan al esquema vigente.

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `backend/Persistence/SQL/segunda-entrega-bonus.sql` | Las tablas `profesor_nivel`, `curso`, `alumno`, `clase`, `clase_alumno`, `taller` y `taller_inscripcion`. |
| 2 | `backend/Persistence/SQL/segunda-entrega-bonus-roles.sql` | Rol `PROFESOR` y permiso `GestionarAcademia` (Profesor y Administrador). Idempotente; exige que el rol `ADMINISTRADOR` ya exista. |

Ambos corren en **una transacción** con el mismo protocolo que el esquema base: `search_path` único y `fluency.target_database` igual a la base actual (si no, fallan sin cambiar nada).

## Tipos de servicio, modalidades y embudos base (bases ya instaladas)

[`agregar-tipos-servicio-embudos.sql`](../../backend/Persistence/SQL/agregar-tipos-servicio-embudos.sql) lleva una base instalada al modelo con **tipo de servicio** y **admisión de servicios por embudo**, en una transacción y de forma repetible. Ejecutarlo **después** de `agregar-bonus-academia.sql` (si la base no tenía el bonus) y **antes** de desplegar el backend nuevo:

- `servicio.es_taller` se reemplaza por `id_tipo_servicio`: talleres → Talleres; con nivel → Clases; el resto → «Otros» (solo si existen).
- Cada embudo conserva su servicio actual como selección puntual de su tipo (`embudo_servicio` / `embudo_tipo_servicio`) y `embudo.id_servicio` se elimina; `oportunidad.id_servicio` se copia del embudo de su etapa.
- Se agregan las modalidades por defecto que falten (no se tocan las existentes) y, **solo si la base no tiene embudos**, los embudos «Clases de Inglés» y «Talleres» con sus seis etapas.
- Una base nueva no lo necesita: `creacion-tablas.sql` ya incluye todo (sección «Embudos base»). Una prueba ejecuta la migración sobre una base con la forma anterior.

Preparado, no ejecutado en ninguna base real: aplicarlo en producción requiere copia previa y el OK del operador.

## Desarrollo local

Con el contenedor PostgreSQL local identificado (ver [entorno local](../segunda-entrega/entorno-local.md)):

```powershell
.\levantar-bonus-academia.ps1 -containerId <id del contenedor>
```

El script verifica estado y puerto del contenedor, la base `fluency_segunda_entrega_dev` y su propietario antes de escribir. Después reiniciar la API.

## Producción (Supabase) — lo hace el operador

1. **Copia de seguridad** o punto de restauración previo (pendiente de [publicación §10](../segunda-entrega/publicacion-azure.md): PITR/RPO).
2. Verificar que la base destino es la publicada y que el esquema base está instalado (`SELECT to_regclass('alumno')` debe devolver `NULL`).
3. Pegar y ejecutar completo `agregar-bonus-academia.sql` (ya trae `BEGIN`/`COMMIT` y no necesita editarse). Alternativa con las guardas de destino: los dos scripts de la tabla, en ese orden, en una transacción con `SET LOCAL search_path = public;` y `set_config('fluency.target_database', current_database(), true)`.
4. Comprobar (el script devuelve estos conteos al final): `SELECT nombre FROM rol` incluye `PROFESOR`; `SELECT count(*) FROM information_schema.tables WHERE table_name IN ('alumno','curso','clase','clase_alumno','taller','taller_inscripcion','profesor_nivel')` devuelve 7.
5. **Después** del esquema, desplegar el backend y el frontend nuevos. El orden inverso deja la API sin tablas.
6. Crear al menos una cuenta con rol Profesor desde Usuarios y pedirle que marque sus niveles en Mi perfil.

El merge a `master` dispara el despliegue del backend: no mergear hasta tener el esquema aplicado.

## Recorrido manual sugerido (local)

1. Administrador: Servicios → crear un servicio de tipo Clases (con nivel, p. ej. B1) y otro de tipo Talleres. Los embudos «Clases de Inglés» y «Talleres» ya existen con sus etapas; un servicio nuevo de cada tipo entra solo.
2. Vendedor: crear un contacto, abrir una oportunidad del servicio de Clases y ganarla → el contacto pasa a Cliente y aparece en Alumnos.
3. Administrador: Usuarios → nueva cuenta con rol Profesor. Ingresar como Profesor: Mi perfil → marcar B1; Cursos → Nuevo curso → sumar al alumno; Clases → elegir un día → crear una clase y un examen; abrir cada una y marcar presente/ausente y notas.
4. Vendedor: abrir la ficha del contacto-alumno → ver «x/y» de asistencia. Comprobar que no ve Alumnos, Cursos, Clases ni Talleres.
5. Profesor: confirmar que no ve Empresas, Contactos, Oportunidades, Embudo, Usuarios ni Servicios y que esas URL lo devuelven a sus clases.
6. Talleres: ganar una oportunidad del servicio de taller y anotar a la persona desde el taller; comprobar que no se creó un alumno.
