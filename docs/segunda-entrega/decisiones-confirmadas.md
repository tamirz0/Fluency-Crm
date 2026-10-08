# Decisiones confirmadas para la segunda entrega

Confirmadas por el usuario el 08/10/2026 al cerrar la entrevista con `interview-me`. Este documento complementa el [diseño funcional](diseño-segunda-entrega.md); no describe funcionalidades implementadas. El pedido posterior autoriza guardar estos acuerdos y completar la especificación técnica, todavía sin plan detallado ni código.

## 1. Intención y alcance

Completar un CRM académico funcional, comprensible y demostrable para una academia de inglés. Conservar el circuito y las simplificaciones del diseño. Priorizar soluciones técnicas sencillas y pruebas de lo fundamental. El objetivo de esta entrega no es operar comercialmente un producto.

El agente resuelve con autonomía detalles técnicos rutinarios; consulta cuando una decisión cambia el comportamiento acordado, amplía el alcance o tiene consecuencias importantes. No trasladar al usuario cada parámetro o elección de implementación.

## 2. Roles y permisos

Se conservan tres perfiles preconfigurados: **Administrador**, **Responsable comercial** y **Vendedor**. Sus permisos vienen definidos y no se editan desde una pantalla. El administrador crea usuarios y les asigna los roles necesarios; no hay permisos especiales configurables por usuario.

| Operación | Administrador | Responsable comercial | Vendedor |
|---|---|---|---|
| Consultar empresas/contactos | Todos | Todos | Todos |
| Crear y modificar empresas/contactos | Sí | Sí | Sí |
| Consultar tabla y detalle de oportunidades | Todas | Todas | Todas |
| Consultar actividades e historiales comerciales | Todos | Todos | Todos |
| Oportunidades visibles en el funnel | Todas | Todas | Solo las propias |
| Modificar, mover y cerrar oportunidades | Todas, respetando el circuito | Todas, respetando el circuito | Solo las propias, respetando el circuito |
| Reasignar oportunidades | Todas | Todas | Puede reasignar una propia a otro vendedor |
| Reabrir oportunidades cerradas | Sí | Sí | No |
| Agregar/modificar/dar de baja actividades vinculadas a una oportunidad | Cualquiera, según reglas del diseño | Cualquiera, según reglas del diseño | Solo si es responsable de esa oportunidad |
| Administrar usuarios, roles asignados y configuración comercial | Sí | No | No |
| Redefinir los permisos de un rol desde la aplicación | No | No | No |

Precisiones:

- El responsable de una empresa/contacto es información de gestión, no una restricción para consultarlo o modificarlo.
- La primera propuesta de ocultar oportunidades ajenas al vendedor quedó reemplazada: son consultables en tabla, detalle y sus historiales. La vista personal del funnel evita saturar su pantalla; no es una barrera de lectura de esas oportunidades.
- El vendedor no puede cambiar una oportunidad ajena ni modificar sus actividades accediendo por otra pantalla o llamando directamente a la API.
- La asignación vigente determina quién puede modificar. Tras reasignar una oportunidad, el vendedor anterior conserva consulta, pero deja de gestionarla si ya no es su responsable.
- Los permisos no anulan los bloqueos de negocio: una oportunidad cerrada requiere reapertura para corregir datos comerciales; las bajas siguen la matriz del diseño.
- Reabrir exige administrador o responsable comercial, justificación, etapa abierta activa del mismo embudo y conservación automática del cierre anterior; no hay circuito separado de solicitud/aprobación.
- Los nombres “jefe” usados en la entrevista corresponden al rol **Responsable comercial**, distinto del administrador.

## 3. Usuarios y sesión

- La instalación inicial crea un único administrador. Desde ese usuario se crean las demás cuentas y se asignan roles.
- No hay registro público ni cuentas de demostración adicionales creadas automáticamente.
- Los tres roles y sus permisos se inicializan con el sistema. Esto no obliga a crear tres usuarios.
- La sesión tiene una expiración razonable, determinada técnicamente. Al vencer, el usuario vuelve a iniciar sesión.
- No incorporar “recordarme”, renovación persistente ni una pantalla de gestión de sesiones para esta entrega.
- La autenticación efectiva y las autorizaciones se validan en el servidor, conservando la obligación de impedir acceso a usuarios desactivados.

## 4. Entornos y entrega

- Todas las pruebas se realizan en la versión local. PostgreSQL local ya está dockerizado; el ID suministrado está en [AGENTS.md](../../AGENTS.md).
- Cuando la versión esté preparada, se publicará en el entorno **existente** de Azure para frontend, backend y base, donde ya funciona la primera entrega según lo informado por el usuario.
- La URL pública permite que profesores u otras personas con cuenta prueben el CRM. Pública no significa acceso anónimo a datos ni registro libre.
- No probar escribiendo datos en Azure por conveniencia del agente. La preparación de una publicación y su autorización son distintas del trabajo local.
- El usuario no pidió verificar Docker ni Azure en esta fase documental; no se atribuye al agente una comprobación de ese entorno.

## 5. Calidad y autonomía

Se mantienen los [constraints](../../CONSTRAINTS.md): pruebas fundamentales sin cobertura porcentual obligatoria; seguridad de dependencias y secretos; no agregar fallos ni empeorar deuda previa; presupuesto aproximado de 90 segundos por tarea, con controles lentos al cierre del módulo.

Se mantiene el flujo de [AGENTS.md](../../AGENTS.md): ramas y commits autónomos desde `segunda-entrega`, integración hacia esa rama después del OK del usuario y `main` reservada para una decisión explícita posterior.

## 6. Cómo usar estos acuerdos

La especificación técnica deberá concretar mecanismos de autenticación, contratos, representación de datos y pruebas manteniendo estos comportamientos. Separar siempre acuerdos confirmados de propuestas técnicas todavía en revisión. El alcance de una regla del diseño no puede ampliarse por elegir un mecanismo técnico.
