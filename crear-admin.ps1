$ErrorActionPreference = 'Stop'
$taskPreviousBootstrap = @{}
$taskBootstrapPassword = $null
try {
    foreach ($taskField in @('Nombre', 'Apellido', 'Correo', 'Username', 'Password')) {
        $taskKey = 'BootstrapAdmin__' + $taskField
        $taskPreviousBootstrap[$taskKey] = [Environment]::GetEnvironmentVariable($taskKey, 'Process')
        if ($taskField -eq 'Password') {
            $taskBootstrapPassword = Read-Host 'Contraseña del administrador inicial' -AsSecureString
            [Environment]::SetEnvironmentVariable($taskKey,
                [System.Net.NetworkCredential]::new('', $taskBootstrapPassword).Password, 'Process')
        } else {
            [Environment]::SetEnvironmentVariable($taskKey, (Read-Host $taskField), 'Process')
        }
    }
    dotnet run --no-build --no-restore --project backend/FluencyAPI --launch-profile http -- --bootstrap-admin
    if ($LASTEXITCODE -ne 0) { throw 'Bootstrap rechazado; revisar el diagnóstico sin compartir secretos.' }
} finally {
    foreach ($taskKey in $taskPreviousBootstrap.Keys) {
        if ($null -eq $taskPreviousBootstrap[$taskKey]) {
            Remove-Item -LiteralPath ('Env:' + $taskKey) -ErrorAction SilentlyContinue
        } else {
            [Environment]::SetEnvironmentVariable($taskKey, $taskPreviousBootstrap[$taskKey], 'Process')
        }
    }
    if ($null -ne $taskBootstrapPassword) { $taskBootstrapPassword.Dispose() }
}