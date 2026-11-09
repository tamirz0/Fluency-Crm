# Aplica el bonus de academia (alumnos, cursos, clases, talleres y rol Profesor) sobre la base de
# DESARROLLO ya instalada. Aditivo: no borra ni modifica datos. Se rechaza si ya fue aplicado.
# Uso: .\levantar-bonus-academia.ps1 -containerId <id del contenedor PostgreSQL local>
# No ejecutar contra producción: allí lo aplica el operador con copia de seguridad previa.
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
END $$;
'@
$taskSql = $taskPreamble + "`n" +
    (Get-Content -LiteralPath 'backend/Persistence/SQL/segunda-entrega-bonus.sql' -Raw) + "`n" +
    (Get-Content -LiteralPath 'backend/Persistence/SQL/segunda-entrega-bonus-roles.sql' -Raw) +
    "`nCOMMIT;"
$taskOutput = $taskSql | docker exec -e PGOPTIONS= -i $taskContainer sh -c `
    'exec psql -X -w -h /var/run/postgresql -p 5432 -U "$POSTGRES_USER" -d fluency_segunda_entrega_dev -v ON_ERROR_STOP=1'
if ($LASTEXITCODE -ne 0) {
    throw 'Bonus de academia rechazado; revisar destino y estado sin borrar datos.'
}
'Bonus de academia aplicado en desarrollo: tablas nuevas, rol PROFESOR y permiso GestionarAcademia.'
