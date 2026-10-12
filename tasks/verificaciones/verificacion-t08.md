# Verificación T08: sesión cookie y actor validado

12/10/2026. Rama `segunda-entrega-t08-sesion-cookie`, desde `segunda-entrega` / `10d8a0a` (T07 integrada). El usuario autorizó merge condicionado a tests y reviewer aprobados, y continuar T09. Sin publicación ni push.

## Resultado y alcance

Cuatro rutas `/auth/*`, cookie de ocho horas absolutas no persistente, antiforgery en mutaciones, autenticación por defecto, políticas de permisos y actor validado por request. El registro público se eliminó; los siete controladores comerciales antiguos siguen fuera del descubrimiento. Roles/perfil se recalculan sin renovar vencimiento; usuario inactivo/inexistente/sin roles o contraseña cambiada invalidan la cookie. Login con límite 10/min/IP de conexión y error genérico. [Contrato implementado](../../docs/segunda-entrega/contrato-http.md).

Las pruebas utilizan TestServer y PostgreSQL real, exclusivamente `fluency_segunda_entrega_test` en `127.0.0.1:5433`, con esquema GUID por fixture y limpieza limitada existente con RESTRICT. Se revalidó Docker running y publicación local antes de las pruebas. Dos cuentas ficticias por fixture, contraseña aleatoria y BCrypt de bajo costo solo en tests; bootstrap T06/costo productivo 12 intactos. No hay escrituras en desarrollo ni producción.

## Controles

| Control | Resultado |
|---|---|
| RED inicial de tres casos HTTP anónimos | Los tres fallaron con 404 antes de implementar; posteriormente 3/3. |
| Primera ejecución AuthTests + HttpContractTests | 31/32, runner 2 min 25 s. Fallo en DTO del controlador exclusivo de tests; corregido y caso aislado posterior 1/1 (24 s). |
| Mutación representativa | Omitir temporalmente la comparación de huella: caso cambio de contraseña obtuvo 200 en lugar de 401. Detectada: 1 fallo/3 aprobadas, runner 51 s. Original restaurado en finally. |
| Final AuthTests + HttpContractTests + IdentityTests | 44/44, cero fallos/omisiones; runner 2 min 24 s, código original restaurado. |
| Build backend final | Correcto en serie después de tests: cero errores/advertencias, MSBuild 1,91 s. |
| npm raíz | Sin hallazgos. |
| npm frontend | Un alto preexistente: `source-map-js@1.2.1`, GHSA-68fv-2mgg-jv7q; coincide con B8. Cero críticos/nuevos; sin cambios de paquetes/lockfiles. |
| .NET, cuatro proyectos y transitivas | Sin vulnerabilidades reportadas por api.nuget.org. |
| Gitleaks 8.30.1, foto de versionados y nuevos no ignorados | Exit 0, 1.101.178 bytes, sin hallazgos; redacción 100%. Foto temporal propia eliminada después de verificar su ruta. Revisión estática adicional de DTO/claims/fixtures, sin secretos nuevos. |
| Diff y revisión independiente final | Diff sin errores. Reviewer sin hallazgos requeridos de código/documentos; aprobación de cierre tras resultados finales. |

Comandos desde raíz:

```powershell
dotnet test backend/FluencyAPI.Tests/FluencyAPI.Tests.csproj --no-restore -m:1 --filter 'FullyQualifiedName~AuthTests|FullyQualifiedName~HttpContractTests|FullyQualifiedName~IdentityTests' --logger 'console;verbosity=minimal'
dotnet build backend/FluencyAPI.slnx --no-restore -m:1
dotnet list backend/FluencyAPI.slnx package --vulnerable --include-transitive --no-restore
git diff --check
```

`npm audit --json --registry=https://registry.npmjs.org` en raíz/frontend, comparando identidad y severidad. Auditorías fuera del sandbox después de fallos DNS; revisión automática rechazó inicialmente el envío de nombres/versiones. El usuario lo autorizó explícitamente para npmjs.org/api.nuget.org, sin instalar/actualizar. Scanner: mismo snapshot y comando de T01, con prefijo temporal propio `fluency-t08-secrets-<GUID>` y `--redact=100`.

Cobertura HTTP: cookie cifrada/atributos/vencimiento, me/logout, token renovado y rechazo sin CSRF, mismo error de credenciales, desactivación/contraseña/borrado/sin roles, roles actuales, 401/403 sin redirección, ID de actor extra rechazado sin escritura, expiración por reloj controlado/cookie manipulada, rate limit/Retry-After y X-Forwarded-For no confiado, rutas antiguas no operativas y sin creación de usuarios.

## Incidencias y límites

El probe inicial usó un record posicional con atributo de validación sobre propiedad; MVC requiere atributos en parámetros para ese formato y produjo 500. Se cambió a record con propiedades init, coherente con los DTO del producto, y se retiró el diagnóstico temporal. Un intento de compilación solapado con tests ocupó DLL; se completan controles posteriores en serie, sin alterar reglas.

Revisión independiente de código GPT-6.1 Sol/High sin hallazgos requeridos; observación documental de autorización atendida. Revisión final de evidencia sin hallazgos requeridos; aprobación de cierre registrada al integrar. No se ejecutan frontend ni suite completa backend en esta tarea: frontend intacto, suite completa reservada para CP03. CP03 sigue pendiente de T09; login UI corresponde a T10. B8 y warning de lint conservan su estado. Desarrollo aún sin administrador, sin pruebas contra Supabase/Azure; TLS productivo/topología/cookies entre sitios y claves Data Protection quedan pendientes de publicación T49. No se añade infraestructura ni tabla de sesiones.
