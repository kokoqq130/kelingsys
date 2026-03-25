param(
  [string]$BindHost = '127.0.0.1',
  [int]$Port = 5173,
  [string]$ApiProxyTarget = 'http://127.0.0.1:8000'
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
  $env:VITE_API_PROXY_TARGET = $ApiProxyTarget
  pnpm run dev -- --host $BindHost --port $Port
}
finally {
  Pop-Location
}
