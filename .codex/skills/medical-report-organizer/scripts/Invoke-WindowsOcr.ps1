[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [switch]$Recurse,

    [Alias('Format')]
    [ValidateSet('text', 'markdown', 'json')]
    [string]$OutputFormat = 'text',

    [string]$OutputPath,

    [string[]]$IncludeExtensions = @('.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime]

function ConvertTo-Task {
    param(
        [Parameter(Mandatory = $true)]
        [Type]$Type,

        [Parameter(Mandatory = $true)]
        $Operation
    )

    $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object {
            $_.Name -eq 'AsTask' -and
            $_.IsGenericMethod -and
            $_.GetGenericArguments().Count -eq 1 -and
            $_.GetParameters().Count -eq 1
        } |
        Select-Object -First 1

    if (-not $method) {
        throw 'Unable to locate Windows Runtime AsTask helper.'
    }

    return $method.MakeGenericMethod($Type).Invoke($null, @($Operation))
}

function Get-OcrText {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath
    )

    $file = (ConvertTo-Task -Type ([Windows.Storage.StorageFile]) -Operation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($FilePath))).GetAwaiter().GetResult()
    $stream = (ConvertTo-Task -Type ([Windows.Storage.Streams.IRandomAccessStream]) -Operation ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read))).GetAwaiter().GetResult()
    $decoder = (ConvertTo-Task -Type ([Windows.Graphics.Imaging.BitmapDecoder]) -Operation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream))).GetAwaiter().GetResult()
    $bitmap = (ConvertTo-Task -Type ([Windows.Graphics.Imaging.SoftwareBitmap]) -Operation ($decoder.GetSoftwareBitmapAsync())).GetAwaiter().GetResult()
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()

    if (-not $engine) {
        throw 'Windows OCR engine is unavailable for the current user profile languages.'
    }

    $result = (ConvertTo-Task -Type ([Windows.Media.Ocr.OcrResult]) -Operation ($engine.RecognizeAsync($bitmap))).GetAwaiter().GetResult()
    return $result.Text
}

function Join-RecordsAsText {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Items
    )

    $parts = New-Object System.Collections.Generic.List[string]

    foreach ($item in $Items) {
        $section = @(
            '===FILE==='
            $item.file_name
            '===TEXT==='
            $item.text
        ) -join [Environment]::NewLine
        $parts.Add($section) | Out-Null
    }

    return [string]::Join([Environment]::NewLine, $parts)
}

function Join-RecordsAsMarkdown {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Items
    )

    $parts = New-Object System.Collections.Generic.List[string]

    foreach ($item in $Items) {
        $section = @(
            "## $($item.file_name)"
            ''
            '```text'
            $item.text
            '```'
        ) -join [Environment]::NewLine
        $parts.Add($section) | Out-Null
    }

    return [string]::Join([Environment]::NewLine, $parts)
}

function Get-InputFiles {
    param(
        [Parameter(Mandatory = $true)]
        [string]$InputPath
    )

    $resolved = (Resolve-Path $InputPath).Path
    $item = Get-Item $resolved

    if ($item.PSIsContainer) {
        $search = @{
            Path = $resolved
            File = $true
        }

        if ($Recurse) {
            $search.Recurse = $true
        }

        return Get-ChildItem @search |
            Where-Object { $IncludeExtensions -contains $_.Extension.ToLowerInvariant() } |
            Sort-Object FullName
    }

    return ,$item
}

$files = @(Get-InputFiles -InputPath $Path)

if (-not $files -or $files.Count -eq 0) {
    throw "No supported image files found under '$Path'."
}

$records = @(
    foreach ($file in $files) {
    [pscustomobject]@{
        file_name = $file.Name
        full_path = $file.FullName
        text = Get-OcrText -FilePath $file.FullName
    }
}
)

$selectedFormat = ([regex]::Replace([string]$OutputFormat, '[^A-Za-z]', '')).ToLowerInvariant()
$content = Join-RecordsAsText -Items $records

if ($selectedFormat -eq 'json') {
    $content = $records | ConvertTo-Json -Depth 5
}
elseif ($selectedFormat -eq 'markdown') {
    $content = Join-RecordsAsMarkdown -Items $records
}

if ($OutputPath) {
    $resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
    $parent = Split-Path -Parent $resolvedOutput

    if ($parent) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    Set-Content -Path $resolvedOutput -Value $content -Encoding UTF8
    Write-Output $resolvedOutput
}
else {
    Write-Output $content
}
