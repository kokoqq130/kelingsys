[CmdletBinding()]
param(
    [string]$MarkdownPath,
    [string]$OutputPath,
    [switch]$KeepWorkFiles
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Get-PythonPath {
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $fallback = 'C:\Users\wangf\AppData\Local\Python\pythoncore-3.14-64\python.exe'
    if (Test-Path $fallback) {
        return $fallback
    }

    throw 'Python executable not found. Add python to PATH or update the fallback path in this script.'
}

function Get-BrowserPath {
    $candidates = @(
        'C:\Program Files\Google\Chrome\Application\chrome.exe',
        'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
        'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw 'Chrome or Edge was not found in the expected local paths.'
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptDir '..\..\..\..')).Path

function Get-DefaultMainMarkdown {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Root
    )

    $preferredMainDoc = Join-Path $Root '柯灵用\柯灵基本信息.md'
    if (Test-Path $preferredMainDoc) {
        return (Resolve-Path $preferredMainDoc).Path
    }

    $namedMatch = Get-ChildItem -Path $Root -Recurse -File -Filter '柯灵基本信息.md' |
        Select-Object -First 1
    if ($namedMatch) {
        return $namedMatch.FullName
    }

    $candidateDirs = Get-ChildItem -Path $Root -Directory |
        Where-Object { $_.Name -ne '.codex' -and $_.Name -ne '.git' }

    foreach ($dir in $candidateDirs) {
        $markdowns = @(Get-ChildItem -Path $dir.FullName -File -Filter *.md | Sort-Object Name)
        if ($markdowns.Count -ge 1) {
            return $markdowns[0].FullName
        }
    }

    throw 'Unable to locate a default main markdown document under the project root.'
}

if (-not $MarkdownPath) {
    $MarkdownPath = Get-DefaultMainMarkdown -Root $projectRoot
}

if (-not $OutputPath) {
    $defaultMd = Get-DefaultMainMarkdown -Root $projectRoot
    $OutputPath = [System.IO.Path]::ChangeExtension($defaultMd, '.pdf')
}

$markdown = (Resolve-Path $MarkdownPath).Path
$output = [System.IO.Path]::GetFullPath($OutputPath)
$outputDir = Split-Path -Parent $output
if (-not $outputDir) {
    throw 'Unable to determine output directory.'
}
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$renderer = Join-Path $scriptDir 'render_markdown_html.py'
if (-not (Test-Path $renderer)) {
    throw "Missing renderer script: $renderer"
}

$pythonExe = Get-PythonPath
$browserExe = Get-BrowserPath
$tempHtml = Join-Path $outputDir '.tmp_main_doc_export.html'
$tempProfile = Join-Path $outputDir '.tmp_pdf_browser_profile'

& $pythonExe $renderer $markdown $tempHtml | Out-Null

New-Item -ItemType Directory -Force -Path $tempProfile | Out-Null
$fileUrl = 'file:///' + (($tempHtml -replace '\\', '/') -replace ' ', '%20')
$args = @(
    '--headless',
    '--disable-gpu',
    '--no-first-run',
    '--no-pdf-header-footer',
    "--user-data-dir=$tempProfile",
    '--allow-file-access-from-files',
    "--print-to-pdf=$output",
    $fileUrl
)

$proc = Start-Process -FilePath $browserExe -ArgumentList $args -Wait -PassThru -NoNewWindow
if ($proc.ExitCode -ne 0 -or -not (Test-Path $output)) {
    throw "PDF export failed. Browser exit code: $($proc.ExitCode)"
}

if (-not $KeepWorkFiles) {
    Remove-Item $tempHtml -ErrorAction SilentlyContinue
    Remove-Item $tempProfile -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Output $output
