$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'app\backend'
$venvRoot = Join-Path $backendRoot '.venv'
$pythonPath = Join-Path $venvRoot 'Scripts\python.exe'
$requirementsPath = Join-Path $backendRoot 'requirements.txt'

if (-not (Test-Path $requirementsPath)) {
  throw "未找到后端依赖文件：$requirementsPath"
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  throw '未找到系统 Python，请先安装 Python 3.11+ 并确保 python 命令可用。'
}

if (-not (Test-Path $pythonPath)) {
  Write-Host "正在创建后端虚拟环境：$venvRoot"
  python -m venv $venvRoot
}

$needsInstall = $false

try {
  & $pythonPath -c "import fastapi, uvicorn" | Out-Null
}
catch {
  $needsInstall = $true
}

if ($needsInstall) {
  Write-Host '正在安装后端依赖...'
  & $pythonPath -m pip install -r $requirementsPath
}

Write-Host "后端虚拟环境已就绪：$pythonPath"
