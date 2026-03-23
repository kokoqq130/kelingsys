[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [switch]$Recurse,

    [ValidateSet('text', 'markdown', 'json')]
    [string]$Format = 'text',

    [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDir '..\..\..\..'))
$setupScript = Join-Path $projectRoot 'scripts\Setup-Backend.ps1'
$pythonPath = Join-Path $projectRoot 'app\backend\.venv\Scripts\python.exe'
$ocrScript = Join-Path $scriptDir 'invoke_paddle_ocr.py'

if (-not (Test-Path $setupScript)) {
    throw "Backend setup script not found: $setupScript"
}

if (-not (Test-Path $ocrScript)) {
    throw "Missing bundled PaddleOCR script: $ocrScript"
}

& $setupScript

if (-not (Test-Path $pythonPath)) {
    throw "Backend Python not found after setup: $pythonPath"
}

$args = @(
    $ocrScript,
    '--path', $Path,
    '--format', $Format
)

if ($Recurse) {
    $args += '--recurse'
}

if ($OutputPath) {
    $args += @('--output-path', $OutputPath)
}

& $pythonPath @args
