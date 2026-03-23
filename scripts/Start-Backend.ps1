param(
  [string]$BindHost = '127.0.0.1',
  [int]$Port = 8000,
  [switch]$Reload
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'app\backend'
$setupScript = Join-Path $projectRoot 'scripts\Setup-Backend.ps1'
$pythonPath = Join-Path $backendRoot '.venv\Scripts\python.exe'

if (-not (Test-Path $setupScript)) {
  throw "未找到后端初始化脚本，请先检查 $setupScript"
}

& $setupScript

Push-Location $backendRoot
try {
  $uvicornArgs = @(
    '-m', 'uvicorn',
    'main:app',
    '--host', $BindHost,
    '--port', $Port
  )

  if ($Reload) {
    $uvicornArgs += '--reload'
  }

  & $pythonPath @uvicornArgs
}
finally {
  Pop-Location
}
