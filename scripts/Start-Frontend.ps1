$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $projectRoot 'app\frontend'

Push-Location $frontendRoot
try {
  if (-not (Test-Path (Join-Path $frontendRoot 'node_modules'))) {
    pnpm install
  }
  pnpm dev
}
finally {
  Pop-Location
}
