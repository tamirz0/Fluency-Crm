# Publicación: Vercel + Azure + Supabase (guía preparada, no ejecutada)

Fecha de preparación: 09/11/2026 (T49). Describe la versión resultante de [T48,5](../../tasks/todo.md#t48-5) sobre el entorno **ya publicado**. No instala nada, no despliega y no se probó contra Azure, Vercel ni Supabase: todo lo que figura como «comprobado» se verificó localmente o en el repositorio. Los datos de hosting provienen del dueño del proyecto (09/11/2026).

## 1. Topología

| Pieza | Servicio | Dirección |
|---|---|---|
| Frontend (SPA) | Vercel | `https://fluency-crm-sable.vercel.app` |
| API (ASP.NET Core 10) | Azure Web App `FluencyAPI` | `https://fluencyapi-e5a7b7g8btg0ghhh.chilecentral-01.azurewebsites.net` |
| Base de datos | Supabase (PostgreSQL), esquema `fluency_crm` | Session pooler; cadena solo en Azure |

`frontend/vercel.json` reenvía `/api/:path*` a la API de Azure (quitando el prefijo `/api`) y sirve `index.html` para las rutas de la SPA. El navegador solo habla con el dominio de Vercel: **un único origen**. La cookie de sesión (`Fluency.Session`) y la de antiforgery (`Fluency.Antiforgery`) son `HttpOnly`, `Secure` y `SameSite=Lax`, sin atributo `Domain`, así que quedan asociadas al dominio de Vercel y no cruzan sitios. CORS solo importa si alguien llama a la API de Azure directamente desde otro origen; `appsettings.json` ya lista el dominio de Vercel en `Cors:AllowedOrigins`, por lo que no hace falta una variable de Azure para eso.

## 2. Configuración requerida

**Azure (App Service → Variables de entorno):** la única variable cargada y necesaria es

| Nombre | Contenido |
|---|---|
| `ConnectionStrings__SegundaEntregaProductionDB` | Cadena Npgsql completa de Supabase |

Nada más es obligatorio. El perfil de ejecución es `Production` (valor por defecto de App Service): selecciona esa clave, no expone OpenAPI/Scalar y fuerza cookies `Secure`. Si la variable falta o la cadena no tiene `Host` y `Database`, la API no arranca y lo informa sin imprimir la cadena.

Recomendaciones para la cadena (ver [entorno local](entorno-local.md#perfil-production-para-supabase)): parámetros del **Session pooler**, `Search Path=fluency_crm` y `SSL Mode=VerifyFull` (con `Root Certificate` si la CA no es reconocida); `SSL Mode=Require` cifra pero no verifica la identidad del servidor. La cadena no se guarda en Git ni se pega en tickets o chats.

**GitHub:** el secreto `AZURE_WEBAPP_PUBLISH_PROFILE` lo usa `.github/workflows/deploy-backend.yml`. El archivo `*.pubxml.user` de `Properties/PublishProfiles/` está ignorado por Git y no debe versionarse.

**Vercel:** sin variables propias; la dirección de Azure está en `vercel.json` (si cambia la API, se edita ahí y se vuelve a desplegar el frontend).

## 3. Esquema y administrador inicial

- El esquema vive en `backend/Persistence/SQL/` (`segunda-entrega-esquema.sql`, `-catalogos.sql`, `-roles.sql`), sin migraciones EF. **T48,5 no cambia el esquema:** `git diff aeb41af..HEAD -- backend/Persistence` está vacío. La publicación de esta versión no requiere ejecutar SQL. Los scripts rechazan un esquema ocupado y no sirven para actualizar uno existente.
- El administrador inicial se crea una sola vez con `--bootstrap-admin` (variables `BootstrapAdmin__Nombre/Apellido/Correo/Username/Password` solo en el proceso, nunca en Git ni en User Secrets). Es idempotente: con un administrador activo no cambia nada. Ver [entorno local, T06](entorno-local.md#administrador-inicial-explícito-t06).
- **Por confirmar con el dueño de Supabase:** que la base publicada corresponde a este esquema y ya tiene su administrador. La guía lo supone por el uso actual, no lo comprobó.

## 4. Orden de publicación de esta versión

1. **Backend primero.** T48,5 agrega `GET /inicio/resumen`; el inicio del frontend lo consume. Si el frontend llegara antes, el inicio mostraría su aviso con «Reintentar», sin romper el resto.
2. **Frontend después** (Vercel).
3. Comprobar la versión desplegada (§7) antes de dar la demo.

**Atención:** el workflow de Azure se dispara solo con **cada push a `master` que modifique `backend/**`** (también admite ejecución manual). Integrar T48,5 en `master` despliega el backend automáticamente; por eso el merge exige OK específico y debe hacerse cuando se quiera publicar. Si Vercel despliega desde `master` también queda por confirmar (no consta en el repositorio).

## 5. HTTPS, sesión y claves de Data Protection

- HTTPS lo termina Azure y Vercel; la API redirige HTTP→HTTPS y las cookies exigen `Secure`.
- La sesión dura 8 horas, sin renovación; la identidad sale siempre del servidor.
- La API **no configura** un almacén persistente de claves de Data Protection. Cookie de sesión y antiforgery se cifran con esas claves. Si el App Service es Linux o el disco no persiste, un reinicio o escalado puede invalidar las sesiones abiertas: la consecuencia es volver a iniciar sesión, no pérdida de datos. **Por confirmar con el dueño de Azure:** sistema operativo del plan y si hay más de una instancia (con varias instancias sin claves compartidas, las sesiones fallarían de forma intermitente). No se añadió configuración nueva por no haber evidencia de problema.
- El límite de intentos de inicio de sesión (10 por minuto) se calcula por IP de origen. Detrás de Vercel y Azure esa IP depende de las cabeceras reenviadas; **no se comprobó** si identifica al cliente real. Con una IP compartida, varios usuarios entrando a la vez podrían recibir 429. Verificar en la demo con dos sesiones consecutivas.

## 6. Copias de seguridad y recuperación

| Objetivo acordado | Valor |
|---|---|
| RTO (tiempo máximo de recuperación) | 30 minutos |
| RPO (pérdida máxima de datos) | 15 minutos |
| Mecanismo informado | Backups diarios de Supabase |

**Brecha:** un backup diario solo garantiza un RPO de hasta 24 horas. Para cumplir 15 minutos hace falta recuperación a un punto en el tiempo (PITR) activa en Supabase, o aceptar formalmente un RPO mayor. **Por confirmar en el panel de Supabase** si PITR está habilitado en el plan; mientras no se confirme, el RPO de 15 minutos es un objetivo, no una garantía. El RTO de 30 minutos tampoco se ensayó: no se hizo una restauración de prueba.

Rollback de esta versión, que no cambia el esquema:
- **Backend:** volver a ejecutar el workflow (manual) sobre el commit anterior a T48,5, o redesplegar su paquete; no requiere tocar la base.
- **Frontend:** en Vercel, restaurar el despliegue anterior.
- **Base de datos:** solo ante corrupción de datos; restauración desde Supabase y, antes, avisar a quien opere la demo. No restaurar por una falla de la aplicación.

## 7. Comprobación posterior a la publicación (sin escribir datos de prueba en producción)

1. `GET <API>/auth/csrf` responde 200 y `GET <API>/inicio/resumen` sin sesión responde 401 (confirma que la versión nueva está arriba y que la autenticación es obligatoria).
2. En `https://fluency-crm-sable.vercel.app`: iniciar sesión con la cuenta del evaluador, abrir Inicio (tres cifras, sin aviso de error) y recorrer Empresas, Contactos, Oportunidades y Embudo en modo lectura.
3. Cerrar sesión y confirmar que `/inicio` redirige al login.

Las pruebas que escriben datos (suites, recorridos con altas y cierres) se hacen **solo en local**; nunca contra Supabase.

## 8. Cuenta del profesor evaluador

La cuenta se solicita por contacto con la empresa desarrolladora. La credencial **no se versiona ni se comparte por canales escritos en el repositorio**. Procedimiento: el administrador crea el usuario desde Configuración → Usuarios con el rol que el operador decida, y la contraseña se entrega por un canal privado. Esta cuenta es para el docente evaluador; no es el rol Profesor, postergado.

## 9. Validación equivalente en local

Con Docker (`fluency-pg`, puerto 127.0.0.1:5433) y la base de tests identificada: `dotnet build backend/FluencyAPI.slnx --no-restore -m:1`, `dotnet test backend/FluencyAPI.slnx` (≈12 min), y desde `frontend/` `npm run build`, `npm run lint` y `npm run test:run`. Último resultado registrado: backend 174 pruebas y frontend 155 en verde ([plan express §8](../../tasks/plan-express-pre-entrega.md#8-registro-de-ejecución)).

## 10. Pendientes que no dependen de este repositorio

| Pendiente | Responsable |
|---|---|
| PITR de Supabase y ensayo de restauración (RPO/RTO) | Dueño de Supabase |
| SO del plan de Azure, número de instancias y persistencia de claves | Dueño de Azure |
| Confirmar esquema instalado y administrador en la base publicada | Dueño de Supabase / operador |
| Origen de despliegue de Vercel (rama) | Dueño de Vercel |
| Creación y entrega de la cuenta del evaluador | Empresa desarrolladora |
| Merge a `master` (dispara el despliegue del backend) y publicación | OK específico del usuario |

Hasta cerrar estos puntos, el procedimiento está **preparado, no declarado listo para desplegar**.
