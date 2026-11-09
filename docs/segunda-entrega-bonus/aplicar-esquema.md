# Aplicar el esquema del bonus de academia

Fecha: 09/11/2026. **Preparado, no ejecutado en ninguna base real por el agente.** Los scripts son aditivos: no borran ni modifican datos existentes y se rechazan si ya fueron aplicados.

**Atajo para pegar en la consola SQL (producción, compañeros):** [`agregar-bonus-academia.sql`](../../backend/Persistence/SQL/agregar-bonus-academia.sql) hace todo lo de las dos filas siguientes en una sola transacción, sin editar nada y repetible; termina con una consulta de verificación. Para una base nueva alcanza con [`creacion-tablas.sql`](../../backend/Persistence/SQL/creacion-tablas.sql), que ya incluye el bonus. Una prueba comprueba que ambos sigan al esquema vigente.

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `backend/Persistence/SQL/segunda-entrega-bonus.sql` | `servicio.es_taller` y las tablas `profesor_nivel`, `curso`, `alumno`, `clase`, `clase_alumno`, `taller` y `taller_inscripcion`. |
| 2 | `backend/Persistence/SQL/segunda-entrega-bonus-roles.sql` | Rol `PROFESOR` y permiso `GestionarAcademia` (Profesor y Administrador). Idempotente; exige que el rol `ADMINISTRADOR` ya exista. |

Ambos corren en **una transacción** con el mismo protocolo que el esquema base: `search_path` único y `fluency.target_database` igual a la base actual (si no, fallan sin cambiar nada).

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

1. Administrador: Servicios → crear un servicio con nivel (p. ej. B1) y otro marcado «Es un taller». Crear los embudos y las etapas finales de cada uno.
2. Vendedor: crear un contacto, abrir una oportunidad del servicio con nivel y ganarla → el contacto pasa a Cliente y aparece en Alumnos.
3. Administrador: Usuarios → nueva cuenta con rol Profesor. Ingresar como Profesor: Mi perfil → marcar B1; Cursos → Nuevo curso → sumar al alumno; Clases → elegir un día → crear una clase y un examen; abrir cada una y marcar presente/ausente y notas.
4. Vendedor: abrir la ficha del contacto-alumno → ver «x/y» de asistencia. Comprobar que no ve Alumnos, Cursos, Clases ni Talleres.
5. Profesor: confirmar que no ve Empresas, Contactos, Oportunidades, Embudo, Usuarios ni Servicios y que esas URL lo devuelven a sus clases.
6. Talleres: ganar una oportunidad del servicio de taller y anotar a la persona desde el taller; comprobar que no se creó un alumno.
