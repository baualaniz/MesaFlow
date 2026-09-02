[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$localFirebase = Join-Path $PSScriptRoot '..\node_modules\.bin\firebase.cmd'
$firebaseCommand = if (Test-Path -LiteralPath $localFirebase) { $localFirebase } else { 'firebase.cmd' }

$requirements = @(
    @{ Name = 'Git'; Command = 'git'; Args = @('--version'); Required = $true },
    @{ Name = 'Flutter'; Command = 'flutter'; Args = @('--version'); Required = $true },
    @{ Name = 'Dart'; Command = 'dart'; Args = @('--version'); Required = $true },
    @{ Name = 'Node.js'; Command = 'node'; Args = @('--version'); Required = $true },
    @{ Name = 'npm'; Command = 'npm.cmd'; Args = @('--version'); Required = $true },
    @{ Name = 'Firebase CLI'; Command = $firebaseCommand; Args = @('--version'); Required = $true },
    @{ Name = 'Java'; Command = 'java'; Args = @('-version'); Required = $true }
)

$failed = $false

Write-Host 'MesaFlow - comprobacion de entorno' -ForegroundColor Cyan
Write-Host ''

foreach ($requirement in $requirements) {
    $resolved = Get-Command $requirement.Command -ErrorAction SilentlyContinue

    if ($null -eq $resolved) {
        $label = if ($requirement.Required) { 'FALTA' } else { 'OPCIONAL' }
        $color = if ($requirement.Required) { 'Red' } else { 'Yellow' }
        Write-Host ('[{0}] {1}' -f $label, $requirement.Name) -ForegroundColor $color
        if ($requirement.Required) { $failed = $true }
        continue
    }

    try {
        $versionOutput = & $requirement.Command @($requirement.Args) 2>&1
        if ($LASTEXITCODE -ne 0) { throw "El comando termino con codigo $LASTEXITCODE." }
        $version = $versionOutput | Select-Object -First 2
        Write-Host ('[OK] {0}: {1}' -f $requirement.Name, ($version -join ' ')) -ForegroundColor Green
    }
    catch {
        Write-Host ('[ERROR] {0}: {1}' -f $requirement.Name, $_.Exception.Message) -ForegroundColor Red
        if ($requirement.Required) { $failed = $true }
    }
}

Write-Host ''
if ($failed) {
    Write-Host 'El entorno aun no cumple todos los requisitos obligatorios.' -ForegroundColor Red
    exit 1
}

Write-Host 'Herramientas base disponibles. Ejecutando flutter doctor...' -ForegroundColor Cyan
& flutter doctor
if ($LASTEXITCODE -ne 0) {
    Write-Host 'flutter doctor detecto un problema que requiere revision.' -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host 'Entorno listo para comenzar MesaFlow.' -ForegroundColor Green
