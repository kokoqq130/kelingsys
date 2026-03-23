$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'app\backend'
$venvRoot = Join-Path $backendRoot '.venv'
$pythonPath = Join-Path $venvRoot 'Scripts\python.exe'
$requirementsPath = Join-Path $backendRoot 'requirements.txt'
$paddleCpuIndex = 'https://www.paddlepaddle.org.cn/packages/stable/cpu/'
$requiredPython = @(3, 12)

if (-not (Test-Path $requirementsPath)) {
  throw "Backend requirements file not found: $requirementsPath"
}

function Test-PythonVersion {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$CommandParts,

    [Parameter(Mandatory = $true)]
    [int[]]$Version
  )

  $versionCheck = "import sys; expected = ($($Version[0]), $($Version[1])); raise SystemExit(0 if sys.version_info[:2] == expected else 1)"
  try {
    & $CommandParts[0] @($CommandParts | Select-Object -Skip 1) -c $versionCheck | Out-Null
    return $LASTEXITCODE -eq 0
  }
  catch {
    return $false
  }
}

function Get-BootstrapPython {
  $candidates = New-Object System.Collections.Generic.List[string[]]

  $localPython312 = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe'
  if (Test-Path $localPython312) {
    $candidates.Add(@($localPython312))
  }

  $pyCmd = Get-Command py -ErrorAction SilentlyContinue
  if ($pyCmd) {
    $candidates.Add(@($pyCmd.Source, '-3.12'))
  }

  $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
  if ($pythonCmd) {
    $candidates.Add(@($pythonCmd.Source))
  }

  foreach ($candidate in $candidates) {
    if (Test-PythonVersion -CommandParts $candidate -Version $requiredPython) {
      return ,$candidate
    }
  }

  return $null
}

$needsRecreate = $false

if (Test-Path $pythonPath) {
  $needsRecreate = -not (Test-PythonVersion -CommandParts @($pythonPath) -Version $requiredPython)
}

if ($needsRecreate) {
  Write-Host "Existing backend virtual environment is not Python $($requiredPython[0]).$($requiredPython[1]). Recreating: $venvRoot"
  Remove-Item -LiteralPath $venvRoot -Recurse -Force
}

if (-not (Test-Path $pythonPath)) {
  $bootstrapPython = Get-BootstrapPython
  if (-not $bootstrapPython) {
    throw 'Python 3.12 was not found. Install Python 3.12 or make `py -3.12` available on PATH.'
  }

  Write-Host "Creating backend virtual environment with Python 3.12: $venvRoot"
  & $bootstrapPython[0] @($bootstrapPython | Select-Object -Skip 1) -m venv $venvRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create backend virtual environment: $venvRoot"
  }
}

$needsInstall = $false

$moduleCheck = "import importlib.util; required = ('fastapi', 'uvicorn', 'paddle', 'paddleocr'); missing = [name for name in required if importlib.util.find_spec(name) is None]; raise SystemExit(0 if not missing else 1)"

& $pythonPath -c $moduleCheck | Out-Null
if ($LASTEXITCODE -ne 0) {
  $needsInstall = $true
}

if ($needsInstall) {
  Write-Host 'Installing backend dependencies...'
  & $pythonPath -m pip install --upgrade pip
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to upgrade pip in backend virtual environment.'
  }

  & $pythonPath -m pip install --extra-index-url $paddleCpuIndex -r $requirementsPath
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to install backend dependencies.'
  }
}

& $pythonPath -c $moduleCheck | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Backend dependencies are still incomplete after installation.'
}

Write-Host "Backend virtual environment ready: $pythonPath"
