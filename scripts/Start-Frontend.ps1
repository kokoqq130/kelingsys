param(
  [string]$BindHost = '127.0.0.1',
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $projectRoot 'app\frontend'
$nodeModulesPath = Join-Path $frontendRoot 'node_modules'

Push-Location $frontendRoot
try {
  if (-not (Test-Path $nodeModulesPath)) {
    pnpm install
  }
  pnpm run dev -- --host $BindHost --port $Port
}
finally {
  Pop-Location
}
