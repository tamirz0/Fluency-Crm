param(
        [Parameter(Mandatory = $true)]
        [string]$containerId
)

$ErrorActionPreference = 'Stop'
$taskContainer = $containerId
$taskState = docker inspect --format '{{.State.Status}}' $taskContainer
if ($LASTEXITCODE -ne 0 -or $taskState -ne 'running') {
    throw 'El contenedor local identificado no está disponible.'
}
$taskPorts = docker inspect --format '{{json .NetworkSettings.Ports}}' $taskContainer |
    ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or @($taskPorts.'5432/tcp').Count -ne 1 -or
    $taskPorts.'5432/tcp'[0].HostIp -ne '127.0.0.1' -or
    $taskPorts.'5432/tcp'[0].HostPort -ne '5433') {
    throw 'La publicación del PostgreSQL local no coincide con el destino acordado.'
}
$taskPreamble = @'
BEGIN;
SET LOCAL search_path = public;
SET LOCAL fluency.target_database = 'fluency_segunda_entrega_dev';
DO $$
BEGIN
    IF current_database() <> 'fluency_segunda_entrega_dev'
       OR current_user <> session_user
       OR current_user <> (SELECT pg_get_userbyid(datdba)
                           FROM pg_database WHERE datname = current_database()) THEN
        RAISE EXCEPTION 'Destino o propietario de desarrollo inesperado';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
               WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
                 AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
                 AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')) THEN
        RAISE EXCEPTION 'Desarrollo no está vacío; no se reconstruye automáticamente';
    END IF;
END $$;
'@
$taskSql = $taskPreamble + "`n" +
    (Get-Content -LiteralPath 'backend/Persistence/SQL/segunda-entrega-esquema.sql' -Raw) +
    "`n" + (Get-Content -LiteralPath 'backend/Persistence/SQL/segunda-entrega-catalogos.sql' -Raw) +
    "`nCOMMIT;"
$taskOutput = $taskSql | docker exec -e PGOPTIONS= -i $taskContainer sh -c `
    'exec psql -X -w -h /var/run/postgresql -p 5432 -U "$POSTGRES_USER" -d fluency_segunda_entrega_dev -v ON_ERROR_STOP=1'
if ($LASTEXITCODE -ne 0) {
    throw 'Preparación rechazada; revisar destino y restricciones sin borrar datos.'
}
'Esquema y catálogos preparados en desarrollo.'