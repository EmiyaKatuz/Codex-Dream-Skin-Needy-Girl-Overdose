[CmdletBinding()]
param([string]$OutputDirectory)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$windowsRoot = Join-Path $repositoryRoot 'windows'
$version = ([System.IO.File]::ReadAllText((Join-Path $windowsRoot 'VERSION'))).Trim()
$packageName = "CodexDreamSkin-QuickFix-v$version"
$outputDirectory = if ($OutputDirectory) {
  [System.IO.Path]::GetFullPath($OutputDirectory)
} else {
  Join-Path $repositoryRoot 'release'
}
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) (
  "codex-dream-skin-quickfix-" + [guid]::NewGuid().ToString('N')
)
$packageRoot = Join-Path $temporaryRoot $packageName
New-Item -ItemType Directory -Path (Join-Path $packageRoot 'scripts') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageRoot 'assets') -Force | Out-Null

try {
  Copy-Item -LiteralPath (Join-Path $windowsRoot 'VERSION') -Destination $packageRoot -Force
  Copy-Item -LiteralPath (Join-Path $windowsRoot 'installer\quickfix\fix.ps1') `
    -Destination $packageRoot -Force
  foreach ($assetName in @(
    'renderer-inject.js',
    'dream-skin.css',
    'internet-angel-acrylic.css',
    'internet-angel-extension.css',
    'theme-motion.js',
    'theme-motion.css',
    'motion-settings.mjs',
    'motion-payload.mjs'
  )) {
    Copy-Item -LiteralPath (Join-Path $windowsRoot "assets\$assetName") `
      -Destination (Join-Path $packageRoot "assets\$assetName") -Force
  }
  foreach ($scriptName in @(
    'common-windows.ps1',
    'config-utf8.ps1',
    'injector.mjs',
    'patch-dream-skin.ps1',
    'start-dream-skin.ps1',
    'theme-windows.ps1'
  )) {
    Copy-Item -LiteralPath (Join-Path $windowsRoot "scripts\$scriptName") `
      -Destination (Join-Path $packageRoot "scripts\$scriptName") -Force
  }

  $archivePath = Join-Path $outputDirectory "$packageName.zip"
  if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
  }
  Compress-Archive -Path (Join-Path $packageRoot '*') -DestinationPath $archivePath -CompressionLevel Optimal
  $hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  [System.IO.File]::WriteAllText(
    "$archivePath.sha256",
    "$hash  $([System.IO.Path]::GetFileName($archivePath))`r`n",
    [System.Text.UTF8Encoding]::new($false)
  )
  Write-Host "Quick-fix package created: $archivePath"
} finally {
  Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
}
