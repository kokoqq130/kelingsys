[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backendRoot = Join-Path $projectRoot 'app\backend'
$python = Join-Path $backendRoot '.venv\Scripts\python.exe'

if (-not (Test-Path $python)) {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCommand) {
        throw '找不到Python。请先运行 scripts/Setup-Backend.ps1。'
    }
    $python = $pythonCommand.Source
}

Push-Location $backendRoot
try {
    & $python 'check_consistency.py'
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
