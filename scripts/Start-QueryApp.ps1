param(
  [string]$BindHost = '127.0.0.1',
  [int]$BackendPort = 8000,
  [int]$FrontendPort = 5173,
  [switch]$BackendReload,
  [string]$ApiProxyTarget
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendScript = Join-Path $projectRoot 'scripts\Start-Backend.ps1'
$frontendScript = Join-Path $projectRoot 'scripts\Start-Frontend.ps1'
$powershell = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'

if (-not (Test-Path $powershell)) {
  $powershell = 'powershell.exe'
}

if (-not $ApiProxyTarget) {
  $ApiProxyTarget = "http://${BindHost}:${BackendPort}"
}

$backendArgs = @(
  '-NoExit',
  '-ExecutionPolicy', 'Bypass',
  '-File', $backendScript,
  '-BindHost', $BindHost,
  '-Port', $BackendPort
)

if ($BackendReload) {
  $backendArgs += '-Reload'
}

Start-Process -FilePath $powershell -ArgumentList $backendArgs
Start-Sleep -Seconds 2
Start-Process -FilePath $powershell -ArgumentList @(
  '-NoExit',
  '-ExecutionPolicy', 'Bypass',
  '-File', $frontendScript,
  '-BindHost', $BindHost,
  '-Port', $FrontendPort,
  '-ApiProxyTarget', $ApiProxyTarget
)
