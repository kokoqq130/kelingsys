$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendScript = Join-Path $projectRoot 'scripts\Start-Backend.ps1'
$frontendScript = Join-Path $projectRoot 'scripts\Start-Frontend.ps1'
$powershell = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'

Start-Process -FilePath $powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $backendScript
Start-Sleep -Seconds 2
Start-Process -FilePath $powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $frontendScript
