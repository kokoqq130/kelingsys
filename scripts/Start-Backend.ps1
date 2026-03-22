$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'app\backend'
$pythonPath = Join-Path $backendRoot '.venv\Scripts\python.exe'

if (-not (Test-Path $pythonPath)) {
  throw "未找到后端虚拟环境，请先检查 $pythonPath"
}

Push-Location $backendRoot
try {
  & $pythonPath -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
}
finally {
  Pop-Location
}
