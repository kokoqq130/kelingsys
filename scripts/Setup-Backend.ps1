$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'app\backend'
$venvRoot = Join-Path $backendRoot '.venv'
$pythonPath = Join-Path $venvRoot 'Scripts\python.exe'
$requirementsPath = Join-Path $backendRoot 'requirements.txt'

if (-not (Test-Path $requirementsPath)) {
  throw "Backend requirements file not found: $requirementsPath"
}

function Get-BootstrapPython {
  $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
  if ($pythonCmd) {
    return @($pythonCmd.Source)
  }

  $pyCmd = Get-Command py -ErrorAction SilentlyContinue
  if ($pyCmd) {
    foreach ($args in @(@('-3.11'), @('-3'), @())) {
      try {
        & $pyCmd.Source @args -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" | Out-Null
        return @($pyCmd.Source) + $args
      }
      catch {
      }
    }
  }

  return $null
}

if (-not (Test-Path $pythonPath)) {
  $bootstrapPython = Get-BootstrapPython
  if (-not $bootstrapPython) {
    throw 'Python 3.11+ was not found. Install Python or make `python` / `py` available on PATH.'
  }

  Write-Host "Creating backend virtual environment: $venvRoot"
  & $bootstrapPython[0] @($bootstrapPython | Select-Object -Skip 1) -m venv $venvRoot
}

$needsInstall = $false

try {
  & $pythonPath -c "import fastapi, uvicorn" | Out-Null
}
catch {
  $needsInstall = $true
}

if ($needsInstall) {
  Write-Host 'Installing backend dependencies...'
  & $pythonPath -m pip install -r $requirementsPath
}

Write-Host "Backend virtual environment ready: $pythonPath"
