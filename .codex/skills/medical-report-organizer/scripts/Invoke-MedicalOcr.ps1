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
$windowsOcr = Join-Path $scriptDir 'Invoke-WindowsOcr.ps1'

if (-not (Test-Path $windowsOcr)) {
    throw "Missing bundled OCR script: $windowsOcr"
}

# Future-proof entrypoint: when a Python OCR implementation is added and
# available on PATH, this wrapper can prefer it. For now, always use the
# tested Windows OCR implementation.
$params = @{
    Path = $Path
    Format = $Format
}

if ($Recurse) {
    $params.Recurse = $true
}

if ($OutputPath) {
    $params.OutputPath = $OutputPath
}

& $windowsOcr @params
