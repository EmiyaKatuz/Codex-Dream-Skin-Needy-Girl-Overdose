[CmdletBinding()]
param(
  [string]$OutputDirectory,
  [string]$IsccPath,
  [string]$NodeArchivePath,
  [int]$DownloadTimeoutSeconds = 120,
  [string]$WorkingDirectory,
  [switch]$KeepWorkingDirectory
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$installerRoot = $PSScriptRoot
$windowsRoot = Split-Path -Parent $installerRoot
$repositoryRoot = Split-Path -Parent $windowsRoot
$manifestPath = Join-Path $installerRoot 'node-runtime.json'
$definitionPath = Join-Path $installerRoot 'codex-dream-skin.iss'
$bootstrapPath = Join-Path $installerRoot 'setup-bootstrap.ps1'
$versionPath = Join-Path $windowsRoot 'VERSION'
$macosVersionPath = Join-Path (Join-Path $repositoryRoot 'macos') 'VERSION'
$macosPackagePath = Join-Path (Join-Path $repositoryRoot 'macos') 'package.json'
$licensePath = Join-Path (Join-Path $repositoryRoot 'macos') 'LICENSE'
$noticePath = Join-Path (Join-Path $repositoryRoot 'macos') 'NOTICE.md'
$innoLanguageRoot = Join-Path $installerRoot 'languages'
$innoChineseLanguagePath = Join-Path $innoLanguageRoot 'ChineseSimplified.isl'
$innoSetupLicensePath = Join-Path $innoLanguageRoot 'Inno-Setup-License.txt'
$innoChineseLanguageSha256 = '7d544b9bb1d142cfa11f2e5d3cc8abe2e55f8e066c5124e3772675aa236e1278'
$innoSetupLicenseSha256 = '0c81595601bce47eeef8d865d5da7f9ca2c6a12235b7482b29f5ab23ed02ee5a'
$publicPresetRoot = Join-Path (Join-Path (Join-Path $repositoryRoot 'macos') 'presets') `
  'preset-gothic-void-crusade'
$publicPresetImagePath = Join-Path $publicPresetRoot 'background.jpg'
$publicPresetThemePath = Join-Path $publicPresetRoot 'theme.json'
$publicPresetImageSha256 = 'b76a7cbe2ff9d923846e931984d243a7ba1f25de8d190b5c6412c809c41aee42'
$publicPresetThemeSha256 = '8316c6ad29e3b84806358ab4a730c7e063b261e379179b9608cf751c282d66a7'
$defaultThemeImagePath = Join-Path $windowsRoot 'assets\dream-reference.jpg'
$defaultThemePath = Join-Path $windowsRoot 'assets\theme.json'
$defaultThemeImageSha256 = '4858200d0c5714091d3d15cfa6a07f237b543e1c07d02c599be3fc11353b72c3'
$defaultThemeSha256 = 'e7f18ca3e535da6e5e4a9c81c48aef3d2e2f7c58eb3d0c4fd4c4b09ed2b96384'
$pixelThemeImagePath = Join-Path $windowsRoot 'assets\codex-dream-skin-pixel-cafe.png'
$pixelThemePath = Join-Path $windowsRoot 'assets\theme-choten.json'
$pixelThemeImageSha256 = 'd78177458da6c805d5ef55ea65cf4352a80aba921f4770029f15384bdcdbdea5'
$pixelThemeSha256 = '0ba8d94c7974b01aa3b05886e65afc3323591996f2db7f2d759236019797c430'

function Read-ReleaseTextFile {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Required release input does not exist: $Path"
  }
  return [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
}

function Get-NormalizedReleaseTextSha256 {
  param([Parameter(Mandatory = $true)][string]$Path)
  $text = (Read-ReleaseTextFile -Path $Path).Replace("`r`n", "`n").Replace("`r", "`n")
  $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($text)
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    return (($sha256.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join '')
  } finally {
    $sha256.Dispose()
  }
}

function Resolve-ReleasePath {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$BasePath
  )
  if ([System.IO.Path]::IsPathRooted($Path)) {
    return [System.IO.Path]::GetFullPath($Path)
  }
  return [System.IO.Path]::GetFullPath((Join-Path $BasePath $Path))
}

function Assert-NodeRuntimeManifest {
  param([Parameter(Mandatory = $true)][object]$Manifest)
  $expectedVersion = '22.23.1'
  $expectedArchive = "node-v$expectedVersion-win-x64.zip"
  $expectedRoot = "node-v$expectedVersion-win-x64"
  $expectedUrl = "https://nodejs.org/dist/v$expectedVersion/$expectedArchive"
  $expectedHash = '7df0bc9375723f4a86b3aa1b7cc73342423d9677a8df4538aca31a049e309c29'

  if ("$($Manifest.version)" -cne $expectedVersion -or
    "$($Manifest.platform)" -cne 'win' -or
    "$($Manifest.architecture)" -cne 'x64' -or
    "$($Manifest.archive)" -cne $expectedArchive -or
    "$($Manifest.url)" -cne $expectedUrl -or
    "$($Manifest.sha256)" -cne $expectedHash -or
    "$($Manifest.nodeEntry)" -cne "$expectedRoot/node.exe" -or
    "$($Manifest.licenseEntry)" -cne "$expectedRoot/LICENSE") {
    throw 'The pinned Node.js runtime manifest differs from the reviewed v22.23.1 win-x64 release.'
  }
}

function Resolve-IsccExecutable {
  param([string]$RequestedPath)
  $candidates = @()
  if ($RequestedPath) { $candidates += $RequestedPath }
  if (${env:ProgramFiles(x86)}) {
    $candidates += Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'
  }
  if ($env:ProgramFiles) {
    $candidates += Join-Path $env:ProgramFiles 'Inno Setup 6\ISCC.exe'
  }
  if ($env:ChocolateyInstall) {
    $candidates += Join-Path $env:ChocolateyInstall 'bin\iscc.exe'
  }
  $command = Get-Command 'ISCC.exe' -ErrorAction SilentlyContinue
  if ($command) { $candidates += $command.Source }

  foreach ($candidate in $candidates) {
    if (-not $candidate) { continue }
    $resolved = Resolve-ReleasePath -Path $candidate -BasePath $repositoryRoot
    if (Test-Path -LiteralPath $resolved -PathType Leaf) { return $resolved }
  }
  throw 'Inno Setup 6 compiler (ISCC.exe) was not found. Install Inno Setup 6 or pass -IsccPath.'
}

function Copy-ReleaseDirectory {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )
  if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
    throw "Required release directory does not exist: $Source"
  }
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  foreach ($item in Get-ChildItem -LiteralPath $Source -Force) {
    Copy-Item -LiteralPath $item.FullName -Destination $Destination -Recurse -Force -ErrorAction Stop
  }
}

function Copy-ZipEntry {
  param(
    [Parameter(Mandatory = $true)][object]$Archive,
    [Parameter(Mandatory = $true)][string]$EntryName,
    [Parameter(Mandatory = $true)][string]$Destination
  )
  $entry = $Archive.GetEntry($EntryName)
  if ($null -eq $entry -or $entry.Length -le 0) {
    throw "The Node.js archive is missing a non-empty entry: $EntryName"
  }
  $parent = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  $input = $entry.Open()
  try {
    $output = [System.IO.File]::Open(
      $Destination,
      [System.IO.FileMode]::CreateNew,
      [System.IO.FileAccess]::Write,
      [System.IO.FileShare]::None
    )
    try { $input.CopyTo($output) } finally { $output.Dispose() }
  } finally {
    $input.Dispose()
  }
}

function Write-DreamSkinIcon {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [string]$SourcePath = (Join-Path $windowsRoot 'assets\internet-angel-tray.ico')
  )
  if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) {
    throw "Internet Angel application icon is missing: $SourcePath"
  }
  $icon = [System.IO.File]::ReadAllBytes($SourcePath)
  if ($icon.Length -lt 22 -or
    [System.BitConverter]::ToUInt16($icon, 0) -ne 0 -or
    [System.BitConverter]::ToUInt16($icon, 2) -ne 1) {
    throw 'Internet Angel application icon has an invalid ICO header.'
  }
  $count = [System.BitConverter]::ToUInt16($icon, 4)
  if ($count -lt 1 -or $icon.Length -lt 6 + (16 * $count)) {
    throw 'Internet Angel application icon has an invalid ICO directory.'
  }
  $seenSizes = @{}
  for ($index = 0; $index -lt $count; $index++) {
    $entryOffset = 6 + (16 * $index)
    $width = if ($icon[$entryOffset] -eq 0) { 256 } else { [int]$icon[$entryOffset] }
    $height = if ($icon[$entryOffset + 1] -eq 0) { 256 } else { [int]$icon[$entryOffset + 1] }
    $planes = [System.BitConverter]::ToUInt16($icon, $entryOffset + 4)
    $imageLength = [System.BitConverter]::ToUInt32($icon, $entryOffset + 8)
    $imageOffset = [System.BitConverter]::ToUInt32($icon, $entryOffset + 12)
    if ($width -ne $height -or
      $planes -notin @(0, 1) -or
      [System.BitConverter]::ToUInt16($icon, $entryOffset + 6) -ne 32 -or
      $imageLength -lt 8 -or $imageOffset -lt 6 + (16 * $count) -or
      [uint64]$imageOffset + [uint64]$imageLength -gt [uint64]$icon.Length) {
      throw "Internet Angel application icon contains an invalid ${width}px frame."
    }
    $seenSizes["$width"] = $true
  }
  foreach ($requiredSize in @(16, 24, 32, 48, 64, 256)) {
    if (-not $seenSizes.ContainsKey("$requiredSize")) {
      throw "Internet Angel application icon is missing its ${requiredSize}px frame."
    }
  }
  $parent = Split-Path -Parent $Path
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  [System.IO.File]::WriteAllBytes($Path, $icon)
}

$version = (Read-ReleaseTextFile -Path $versionPath).Trim()
if ($version -cnotmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') {
  throw "windows/VERSION must contain a three-part semantic version: $version"
}
$macosVersion = (Read-ReleaseTextFile -Path $macosVersionPath).Trim()
$macosPackage = (Read-ReleaseTextFile -Path $macosPackagePath) | ConvertFrom-Json
if ($macosVersion -cne $version -or "$($macosPackage.version)" -cne $version) {
  throw "Release versions differ: windows=$version macOS=$macosVersion package=$($macosPackage.version)"
}

$manifest = (Read-ReleaseTextFile -Path $manifestPath) | ConvertFrom-Json
Assert-NodeRuntimeManifest -Manifest $manifest
$null = Read-ReleaseTextFile -Path $definitionPath
$null = Read-ReleaseTextFile -Path $bootstrapPath
$null = Read-ReleaseTextFile -Path $licensePath
$null = Read-ReleaseTextFile -Path $noticePath
$null = Read-ReleaseTextFile -Path $innoChineseLanguagePath
$null = Read-ReleaseTextFile -Path $innoSetupLicensePath
$innoChineseLanguageHash = (Get-FileHash -LiteralPath $innoChineseLanguagePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($innoChineseLanguageHash -cne $innoChineseLanguageSha256) {
  throw "The pinned Inno Setup Simplified Chinese messages changed. Expected $innoChineseLanguageSha256, found $innoChineseLanguageHash."
}
$innoSetupLicenseHash = (Get-FileHash -LiteralPath $innoSetupLicensePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($innoSetupLicenseHash -cne $innoSetupLicenseSha256) {
  throw "The pinned Inno Setup license changed. Expected $innoSetupLicenseSha256, found $innoSetupLicenseHash."
}
$publicPresetTheme = (Read-ReleaseTextFile -Path $publicPresetThemePath) | ConvertFrom-Json
if ("$($publicPresetTheme.id)" -cne 'preset-gothic-void-crusade' -or
  "$($publicPresetTheme.image)" -cne 'background.jpg') {
  throw 'The public Windows release preset metadata is unexpected.'
}
if (-not (Test-Path -LiteralPath $publicPresetImagePath -PathType Leaf)) {
  throw "The public Windows release preset image is missing: $publicPresetImagePath"
}
$publicPresetImageHash = (Get-FileHash -LiteralPath $publicPresetImagePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($publicPresetImageHash -cne $publicPresetImageSha256) {
  throw "The reviewed public preset image changed. Expected $publicPresetImageSha256, found $publicPresetImageHash."
}
$publicPresetThemeHash = Get-NormalizedReleaseTextSha256 -Path $publicPresetThemePath
if ($publicPresetThemeHash -cne $publicPresetThemeSha256) {
  throw "The reviewed public preset metadata changed. Expected $publicPresetThemeSha256, found $publicPresetThemeHash."
}
$defaultTheme = (Read-ReleaseTextFile -Path $defaultThemePath) | ConvertFrom-Json
if ("$($defaultTheme.id)" -cne 'preset-internet-angel-default' -or
  "$($defaultTheme.image)" -cne 'dream-reference.jpg') {
  throw 'The default Internet Angel theme metadata is unexpected.'
}
$pixelTheme = (Read-ReleaseTextFile -Path $pixelThemePath) | ConvertFrom-Json
if ("$($pixelTheme.id)" -cne 'preset-internet-angel' -or
  "$($pixelTheme.image)" -cne 'codex-dream-skin-pixel-cafe.png') {
  throw 'The Pixel Cafe Internet Angel theme metadata is unexpected.'
}
$reviewedThemeFiles = @(
  @{
    Path = $defaultThemeImagePath
    ExpectedSha256 = $defaultThemeImageSha256
    Label = 'default Internet Angel image'
    NormalizeText = $false
  },
  @{
    Path = $defaultThemePath
    ExpectedSha256 = $defaultThemeSha256
    Label = 'default Internet Angel metadata'
    NormalizeText = $true
  },
  @{
    Path = $pixelThemeImagePath
    ExpectedSha256 = $pixelThemeImageSha256
    Label = 'Pixel Cafe Internet Angel image'
    NormalizeText = $false
  },
  @{
    Path = $pixelThemePath
    ExpectedSha256 = $pixelThemeSha256
    Label = 'Pixel Cafe Internet Angel metadata'
    NormalizeText = $true
  }
)
foreach ($reviewedThemeFile in $reviewedThemeFiles) {
  $reviewedThemeHash = if ($reviewedThemeFile.NormalizeText) {
    Get-NormalizedReleaseTextSha256 -Path $reviewedThemeFile.Path
  } else {
    (Get-FileHash -LiteralPath $reviewedThemeFile.Path -Algorithm SHA256).Hash.ToLowerInvariant()
  }
  if ($reviewedThemeHash -cne $reviewedThemeFile.ExpectedSha256) {
    throw "The reviewed $($reviewedThemeFile.Label) changed. Expected $($reviewedThemeFile.ExpectedSha256), found $reviewedThemeHash."
  }
}
$compiler = Resolve-IsccExecutable -RequestedPath $IsccPath

if (-not $OutputDirectory) { $OutputDirectory = Join-Path $repositoryRoot 'release' }
$OutputDirectory = Resolve-ReleasePath -Path $OutputDirectory -BasePath $repositoryRoot
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

if ($WorkingDirectory) {
  $WorkingDirectory = Resolve-ReleasePath -Path $WorkingDirectory -BasePath $repositoryRoot
  if (Test-Path -LiteralPath $WorkingDirectory) {
    throw "The requested working directory already exists: $WorkingDirectory"
  }
  New-Item -ItemType Directory -Path $WorkingDirectory | Out-Null
} else {
  $WorkingDirectory = Join-Path ([System.IO.Path]::GetTempPath()) (
    'codex-dream-skin-windows-release-' + [guid]::NewGuid().ToString('N')
  )
  New-Item -ItemType Directory -Path $WorkingDirectory | Out-Null
}

try {
  $archivePath = if ($NodeArchivePath) {
    Resolve-ReleasePath -Path $NodeArchivePath -BasePath $repositoryRoot
  } else {
    Join-Path $WorkingDirectory "$($manifest.archive)"
  }
  if (-not $NodeArchivePath) {
    $previousProtocol = [Net.ServicePointManager]::SecurityProtocol
    try {
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      Write-Host "Downloading pinned Node.js v$($manifest.version) runtime..."
      Invoke-WebRequest -UseBasicParsing -Uri "$($manifest.url)" -OutFile $archivePath -TimeoutSec $DownloadTimeoutSeconds
    } finally {
      [Net.ServicePointManager]::SecurityProtocol = $previousProtocol
    }
  }
  if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) {
    throw "Node.js archive does not exist: $archivePath"
  }
  $archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($archiveHash -cne "$($manifest.sha256)") {
    throw "Node.js archive SHA-256 mismatch. Expected $($manifest.sha256), found $archiveHash."
  }

  $stageRoot = Join-Path $WorkingDirectory 'stage'
  $payloadRoot = Join-Path $stageRoot 'payload'
  $nodeRoot = Join-Path (Join-Path $payloadRoot 'runtime') 'node'
  $languageRoot = Join-Path $stageRoot 'languages'
  New-Item -ItemType Directory -Path $payloadRoot | Out-Null
  New-Item -ItemType Directory -Path $languageRoot | Out-Null
  Copy-ReleaseDirectory -Source (Join-Path $windowsRoot 'assets') -Destination (Join-Path $payloadRoot 'assets')
  Copy-ReleaseDirectory -Source (Join-Path $windowsRoot 'scripts') -Destination (Join-Path $payloadRoot 'scripts')
  Copy-ReleaseDirectory -Source $publicPresetRoot `
    -Destination (Join-Path $payloadRoot 'presets\preset-gothic-void-crusade')
  [System.IO.File]::WriteAllText(
    (Join-Path $payloadRoot 'VERSION'),
    "$version`r`n",
    [System.Text.UTF8Encoding]::new($false)
  )
  Copy-Item -LiteralPath $bootstrapPath -Destination (Join-Path $stageRoot 'setup-bootstrap.ps1') -Force
  Copy-Item -LiteralPath $licensePath -Destination (Join-Path $stageRoot 'LICENSE.txt') -Force
  Copy-Item -LiteralPath $noticePath -Destination (Join-Path $stageRoot 'NOTICE.md') -Force
  Copy-Item -LiteralPath $innoChineseLanguagePath `
    -Destination (Join-Path $languageRoot 'ChineseSimplified.isl') -Force

  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
  try {
    Copy-ZipEntry -Archive $zip -EntryName "$($manifest.nodeEntry)" `
      -Destination (Join-Path $nodeRoot 'node.exe')
    Copy-ZipEntry -Archive $zip -EntryName "$($manifest.licenseEntry)" `
      -Destination (Join-Path $nodeRoot 'LICENSE')
  } finally {
    $zip.Dispose()
  }
  Write-DreamSkinIcon -Path (Join-Path (Join-Path $payloadRoot 'assets') 'codex-dream-skin.ico') `
    -SourcePath (Join-Path $windowsRoot 'assets\internet-angel-tray.ico')

  $expectedPayloadFiles = @(
    'VERSION',
    'assets\dream-reference.jpg',
    'assets\codex-dream-skin-pixel-cafe.png',
    'assets\dream-skin.css',
    'assets\internet-angel-acrylic.css',
    'assets\internet-angel-extension.css',
    'assets\internet-angel-extension.js',
    'assets\internet-angel-tray.ico',
    'assets\internet-angel-tray.png',
    'assets\renderer-inject.js',
    'assets\safe-css-policy.json',
    'assets\safe-css-validator.mjs',
    'assets\selectors.json',
    'assets\theme-package-validator.mjs',
    'assets\theme-choten.json',
    'assets\theme.json',
    'assets\codex-dream-skin.ico',
    'presets\preset-gothic-void-crusade\background.jpg',
    'presets\preset-gothic-void-crusade\theme.json',
    'scripts\apply-community-theme.ps1',
    'scripts\acrylic-window.ps1',
    'scripts\auto-launch-dream-skin.ps1',
    'scripts\check-update.ps1',
    'scripts\common-windows.ps1',
    'scripts\config-utf8.ps1',
    'scripts\image-metadata.mjs',
    'scripts\injector.mjs',
    'scripts\install-dream-skin.ps1',
    'scripts\manage-auto-launch-dream-skin.ps1',
    'scripts\manage-window-effects.ps1',
    'scripts\patch-dream-skin.ps1',
    'scripts\localization-windows.ps1',
    'scripts\restore-dream-skin.ps1',
    'scripts\start-dream-skin.ps1',
    'scripts\theme-windows.ps1',
    'scripts\tray-dream-skin.ps1',
    'scripts\validate-safe-css-file.mjs',
    'scripts\verify-dream-skin.ps1',
    'runtime\node\node.exe',
    'runtime\node\LICENSE'
  )
  foreach ($relative in $expectedPayloadFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $payloadRoot $relative) -PathType Leaf)) {
      throw "Staged installer payload is incomplete: $relative"
    }
  }
  $stagedDefaultImage = Join-Path (Join-Path $payloadRoot 'assets') 'dream-reference.jpg'
  $stagedDefaultImageHash = (Get-FileHash -LiteralPath $stagedDefaultImage -Algorithm SHA256).Hash.ToLowerInvariant()
  $stagedDefaultThemePath = Join-Path (Join-Path $payloadRoot 'assets') 'theme.json'
  $stagedDefaultThemeHash = Get-NormalizedReleaseTextSha256 -Path $stagedDefaultThemePath
  $stagedDefaultTheme = (Read-ReleaseTextFile -Path $stagedDefaultThemePath) | ConvertFrom-Json
  $stagedPixelImage = Join-Path (Join-Path $payloadRoot 'assets') 'codex-dream-skin-pixel-cafe.png'
  $stagedPixelImageHash = (Get-FileHash -LiteralPath $stagedPixelImage -Algorithm SHA256).Hash.ToLowerInvariant()
  $stagedPixelThemePath = Join-Path (Join-Path $payloadRoot 'assets') 'theme-choten.json'
  $stagedPixelThemeHash = Get-NormalizedReleaseTextSha256 -Path $stagedPixelThemePath
  $stagedPixelTheme = (Read-ReleaseTextFile -Path $stagedPixelThemePath) | ConvertFrom-Json
  $stagedPublicThemePath = Join-Path (Join-Path $payloadRoot 'presets') `
    'preset-gothic-void-crusade\theme.json'
  $stagedPublicImagePath = Join-Path (Join-Path $payloadRoot 'presets') `
    'preset-gothic-void-crusade\background.jpg'
  $stagedPublicImageHash = (Get-FileHash -LiteralPath $stagedPublicImagePath -Algorithm SHA256).Hash.ToLowerInvariant()
  $stagedPublicThemeHash = Get-NormalizedReleaseTextSha256 -Path $stagedPublicThemePath
  if ($stagedDefaultImageHash -cne $defaultThemeImageSha256 -or
    $stagedDefaultThemeHash -cne $defaultThemeSha256 -or
    "$($stagedDefaultTheme.id)" -cne 'preset-internet-angel-default' -or
    "$($stagedDefaultTheme.image)" -cne 'dream-reference.jpg' -or
    $stagedPixelImageHash -cne $pixelThemeImageSha256 -or
    $stagedPixelThemeHash -cne $pixelThemeSha256 -or
    "$($stagedPixelTheme.id)" -cne 'preset-internet-angel' -or
    "$($stagedPixelTheme.image)" -cne 'codex-dream-skin-pixel-cafe.png' -or
    $stagedPublicImageHash -cne $publicPresetImageSha256 -or
    $stagedPublicThemeHash -cne $publicPresetThemeSha256 -or
    "$($publicPresetTheme.id)" -cne 'preset-gothic-void-crusade' -or
    "$($publicPresetTheme.image)" -cne 'background.jpg') {
    throw 'Staged installer payload did not retain the reviewed Internet Angel themes and Gothic preset.'
  }

  $arguments = @(
    "/DAppVersion=$version",
    "/DStageRoot=$stageRoot",
    "/DOutputDir=$OutputDirectory",
    $definitionPath
  )
  Write-Host "Building CodexDreamSkin-Setup-v$version.exe..."
  & $compiler @arguments
  if ($LASTEXITCODE -ne 0) { throw "ISCC.exe failed with exit code $LASTEXITCODE." }

  $artifactPath = Join-Path $OutputDirectory "CodexDreamSkin-Setup-v$version.exe"
  if (-not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
    throw "Inno Setup did not create the expected artifact: $artifactPath"
  }
  Write-Host "Windows release created: $artifactPath"
} finally {
  if (-not $KeepWorkingDirectory -and (Test-Path -LiteralPath $WorkingDirectory)) {
    Remove-Item -LiteralPath $WorkingDirectory -Recurse -Force -ErrorAction SilentlyContinue
  } elseif ($KeepWorkingDirectory) {
    Write-Host "Windows release working directory preserved at: $WorkingDirectory"
  }
}
