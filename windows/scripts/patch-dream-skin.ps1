[CmdletBinding()]
param(
  [string]$SourceRoot,
  [string]$StateRoot,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Assert-DreamSkinPatchSource {
  param([Parameter(Mandatory = $true)][string]$Root)

  $commonPath = Join-Path $Root 'scripts\common-windows.ps1'
  $startPath = Join-Path $Root 'scripts\start-dream-skin.ps1'
  $injectorPath = Join-Path $Root 'scripts\injector.mjs'
  $versionPath = Join-Path $Root 'VERSION'
  $rendererPath = Join-Path $Root 'assets\renderer-inject.js'
  $cssPath = Join-Path $Root 'assets\dream-skin.css'
  $acrylicCssPath = Join-Path $Root 'assets\internet-angel-acrylic.css'
  $extensionCssPath = Join-Path $Root 'assets\internet-angel-extension.css'
  foreach ($assetName in @('theme-motion.js', 'theme-motion.css', 'motion-settings.mjs', 'motion-payload.mjs')) {
    $motionPath = Join-Path $Root "assets\$assetName"
    if (-not (Test-Path -LiteralPath $motionPath -PathType Leaf)) {
      throw "Patch source is incomplete: $motionPath"
    }
  }
  foreach ($requiredPath in @(
    $commonPath, $startPath, $injectorPath, $versionPath, $rendererPath, $cssPath,
    $acrylicCssPath, $extensionCssPath
  )) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
      throw "Patch source is incomplete: $requiredPath"
    }
  }

  $commonText = Read-DreamSkinUtf8File -Path $commonPath
  $startText = Read-DreamSkinUtf8File -Path $startPath
  $injectorText = Read-DreamSkinUtf8File -Path $injectorPath
  $rendererText = Read-DreamSkinUtf8File -Path $rendererPath
  $cssText = Read-DreamSkinUtf8File -Path $cssPath
  $acrylicCssText = Read-DreamSkinUtf8File -Path $acrylicCssPath
  $extensionCssText = Read-DreamSkinUtf8File -Path $extensionCssPath
  if (-not $commonText.Contains('Resolve-DreamSkinStartPort') -or
    -not $startText.Contains('Resolve-DreamSkinStartPort -Port $Port') -or
    -not $injectorText.Contains('__DREAM_SIDEBAR_SCROLL_QUIET_ENABLED_JSON__') -or
    -not $injectorText.Contains('Array.isArray(result.scope?.missingL1)') -or
    -not $injectorText.Contains('const firstVisible = (nodes)') -or
    -not $rendererText.Contains('composerOwnerSelector') -or
    -not $rendererText.Contains('owner.closest?.("aside")') -or
    -not $rendererText.Contains('findGenericComposers') -or
    -not $rendererText.Contains('genericComposerRejectSelector') -or
    -not $rendererText.Contains('const NATIVE_PRESET_MIN_COUNT = 2;') -or
    -not $rendererText.Contains('const NAVIGATION_CONFIRM_DELAY_MS = 360;') -or
    -not $rendererText.Contains('navigationConfirmTimer') -or
    -not $rendererText.Contains('activeHomeSuggestionRoot') -or
    -not $rendererText.Contains('themeDiffsContainers') -or
    -not $rendererText.Contains('const fallbackProbe = () =>') -or
    -not $rendererText.Contains('[data-app-action-sidebar-thread-row]') -or
    -not $rendererText.Contains('SIDEBAR_SCROLL_QUIET_CLASS') -or
    -not $rendererText.Contains('appearanceFromClasses') -or
    -not $rendererText.Contains('const readableAccentInk = (accent, panel) =>') -or
    -not $rendererText.Contains('"--ds-on-accent"') -or
    -not $rendererText.Contains('[data-composer-surface-variant]') -or
    -not $cssText.Contains('[data-ds-part="composer"]') -or
    -not $cssText.Contains('aside:not(.app-shell-left-panel)') -or
    -not $cssText.Contains('_MainContentFrame_') -or
    -not $cssText.Contains('diffs-container') -or
    -not $cssText.Contains('[aria-modal="true"]') -or
    -not $cssText.Contains('_ComposerLayoutBody_') -or
    -not $cssText.Contains('.dream-native-suggestions-root') -or
    -not $cssText.Contains('html.codex-dream-skin.dream-theme-light :where(') -or
    -not $acrylicCssText.Contains('[class*="_railList_"]') -or
    -not $acrylicCssText.Contains('.text-fade-truncate') -or
    -not $acrylicCssText.Contains('.sidebar-item svg') -or
    -not $acrylicCssText.Contains('.dream-task .horizontal-scroll-fade-mask') -or
    -not $acrylicCssText.Contains('contain-intrinsic-block-size: auto 38px') -or
    -not $acrylicCssText.Contains('.dream-sidebar-scroll-quiet') -or
    -not $extensionCssText.Contains('.dream-theme-light') -or
    -not $extensionCssText.Contains('[data-angel-component]') -or
    -not $extensionCssText.Contains('[data-angel-component="scroll-bottom"]:is(:hover') -or
    -not $extensionCssText.Contains('[data-angel-component="edited-card-files"],') -or
    -not $extensionCssText.Contains('--angel-adaptive-text: var(--dream-text, var(--ds-text))')) {
    throw 'Patch source does not contain the required Codex 26.814 runtime fixes.'
  }
}

function Test-DreamSkinPatchFileMatches {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Installed
  )

  if (-not (Test-Path -LiteralPath $Source -PathType Leaf) -or
    -not (Test-Path -LiteralPath $Installed -PathType Leaf)) {
    return $false
  }
  return (Get-FileHash -LiteralPath $Source -Algorithm SHA256).Hash -ceq
    (Get-FileHash -LiteralPath $Installed -Algorithm SHA256).Hash
}

function Move-DreamSkinPatchDirectoryAtomically {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  $sourceFull = [System.IO.Path]::GetFullPath($Source)
  $destinationFull = [System.IO.Path]::GetFullPath($Destination)
  if (-not (Test-Path -LiteralPath $sourceFull -PathType Container) -or
    (Test-Path -LiteralPath $destinationFull)) {
    throw "Atomic runtime directory move has invalid endpoints: $sourceFull -> $destinationFull"
  }
  # PowerShell's FileSystem provider can degrade Move-Item on a directory into
  # child-by-child moves when an executable below it is open. Directory.Move is
  # one same-volume Win32 rename: it either commits the whole tree or leaves the
  # source byte-for-byte intact.
  $maximumAttempts = 6
  for ($attempt = 1; $attempt -le $maximumAttempts; $attempt += 1) {
    try {
      [System.IO.Directory]::Move($sourceFull, $destinationFull)
      return
    } catch [System.UnauthorizedAccessException], [System.IO.IOException] {
      # A just-stopped managed Node process or an antivirus scanner can retain
      # a short-lived directory handle after process exit. Retry only while the
      # atomic rename demonstrably did not commit and both endpoints retain the
      # exact pre-move shape; every ambiguous state remains fail closed.
      if ($attempt -ge $maximumAttempts -or
        -not (Test-Path -LiteralPath $sourceFull -PathType Container) -or
        (Test-Path -LiteralPath $destinationFull)) {
        throw
      }
      $delayMilliseconds = [Math]::Min(1000, 75 * [Math]::Pow(2, $attempt - 1))
      Start-Sleep -Milliseconds ([int]$delayMilliseconds)
    }
  }
}

function Get-DreamSkinPatchEngineNodeUsers {
  param([Parameter(Mandatory = $true)][string]$NodePath)

  $users = @()
  $processes = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction Stop)
  foreach ($processInfo in $processes) {
    $processPath = Get-DreamSkinProcessExecutablePath -ProcessInfo $processInfo
    if ($processPath -and (Test-DreamSkinPathEqual -Left $processPath -Right $NodePath)) {
      $users += [int]$processInfo.ProcessId
    }
  }
  return @($users | Sort-Object -Unique)
}

if (-not $SourceRoot) {
  $SourceRoot = Split-Path -Parent $PSScriptRoot
}
$sourceRoot = [System.IO.Path]::GetFullPath($SourceRoot)
$commonSourcePath = Join-Path $sourceRoot 'scripts\common-windows.ps1'
$startSourcePath = Join-Path $sourceRoot 'scripts\start-dream-skin.ps1'
$injectorSourcePath = Join-Path $sourceRoot 'scripts\injector.mjs'
$patchSourcePath = Join-Path $sourceRoot 'scripts\patch-dream-skin.ps1'
$rendererSourcePath = Join-Path $sourceRoot 'assets\renderer-inject.js'
$cssSourcePath = Join-Path $sourceRoot 'assets\dream-skin.css'
$acrylicCssSourcePath = Join-Path $sourceRoot 'assets\internet-angel-acrylic.css'
$extensionCssSourcePath = Join-Path $sourceRoot 'assets\internet-angel-extension.css'

. (Join-Path $sourceRoot 'scripts\common-windows.ps1')
. (Join-Path $sourceRoot 'scripts\theme-windows.ps1')

$stateRoot = if ($StateRoot) {
  [System.IO.Path]::GetFullPath($StateRoot)
} else {
  Join-Path $env:LOCALAPPDATA 'CodexDreamSkin'
}
$engine = Get-DreamSkinRuntimeEnginePaths -StateRoot $stateRoot
if (-not (Test-Path -LiteralPath $engine.Root -PathType Container)) {
  throw "No installed Dream Skin runtime was found at $($engine.Root). Run install-dream-skin.ps1 first."
}
if (-not (Test-Path -LiteralPath $engine.Scripts -PathType Container)) {
  throw "The installed Dream Skin runtime is incomplete at $($engine.Root)."
}
Assert-DreamSkinRuntimeTree -Path $engine.Root
Assert-DreamSkinPatchSource -Root $sourceRoot

$installedCommon = Join-Path $engine.Scripts 'common-windows.ps1'
$installedStart = Join-Path $engine.Scripts 'start-dream-skin.ps1'
$installedInjector = Join-Path $engine.Scripts 'injector.mjs'
$installedPatch = Join-Path $engine.Scripts 'patch-dream-skin.ps1'
$installedRenderer = Join-Path $engine.Root 'assets\renderer-inject.js'
$installedCss = Join-Path $engine.Root 'assets\dream-skin.css'
$installedAcrylicCss = Join-Path $engine.Root 'assets\internet-angel-acrylic.css'
$installedExtensionCss = Join-Path $engine.Root 'assets\internet-angel-extension.css'
$patchIdentityPairs = @(
  @{ Source = $commonSourcePath; Installed = $installedCommon },
  @{ Source = $startSourcePath; Installed = $installedStart },
  @{ Source = $injectorSourcePath; Installed = $installedInjector },
  @{ Source = $patchSourcePath; Installed = $installedPatch },
  @{ Source = $rendererSourcePath; Installed = $installedRenderer },
  @{ Source = $cssSourcePath; Installed = $installedCss },
  @{ Source = $acrylicCssSourcePath; Installed = $installedAcrylicCss },
  @{ Source = $extensionCssSourcePath; Installed = $installedExtensionCss }
)
$motionAssetNames = @('theme-motion.js', 'theme-motion.css', 'motion-settings.mjs', 'motion-payload.mjs')
foreach ($assetName in $motionAssetNames) {
  $patchIdentityPairs += @{
    Source = (Join-Path $sourceRoot "assets\$assetName")
    Installed = (Join-Path $engine.Root "assets\$assetName")
  }
}
$alreadyPatched = $true
foreach ($pair in $patchIdentityPairs) {
  if (-not (Test-DreamSkinPatchFileMatches -Source $pair.Source -Installed $pair.Installed)) {
    $alreadyPatched = $false
    break
  }
}
if ($alreadyPatched) {
  Write-Host "The installed Dream Skin runtime at $($engine.Root) already contains the Codex 26.814 fixes."
  return
}
if ($DryRun) {
  Write-Host "Dry run: would patch launcher, injector, and renderer/css assets from $sourceRoot."
  return
}

$operationLock = Enter-DreamSkinOperationLock
try {
  $engineNodePath = Join-Path $engine.Root 'runtime\node\node.exe'
  $engineNodeUsers = @(Get-DreamSkinPatchEngineNodeUsers -NodePath $engineNodePath)
  if ($engineNodeUsers.Count -ne 0) {
    throw "The managed Dream Skin Node runtime is in use by PID(s) $($engineNodeUsers -join ', '). Stop the exact injector and retry; Codex itself does not need to restart."
  }
  $token = [guid]::NewGuid().ToString('N')
  $stagingRoot = Join-Path $stateRoot ".engine-patch-$token"
  $backupRoot = Join-Path $stateRoot ".engine-patch-backup-$token"
  $failedRoot = Join-Path $stateRoot ".engine-patch-failed-$token"
  $applied = $false
  $hasBackup = $false
  $preserveTransactions = $false
  try {
    # Clone the complete managed engine first so the patch preserves bundled Node,
    # presets, and every non-patch asset. The committed update is one directory swap;
    # consumers can therefore observe either the old engine or the new one, never a
    # eight-file mixture.
    Copy-Item -LiteralPath $engine.Root -Destination $stagingRoot -Recurse -Force `
      -ErrorAction Stop
    Assert-DreamSkinRuntimeTree -Path $stagingRoot

    $stagedCommon = Join-Path $stagingRoot 'scripts\common-windows.ps1'
    $stagedStart = Join-Path $stagingRoot 'scripts\start-dream-skin.ps1'
    $stagedInjector = Join-Path $stagingRoot 'scripts\injector.mjs'
    $stagedPatch = Join-Path $stagingRoot 'scripts\patch-dream-skin.ps1'
    $stagedRenderer = Join-Path $stagingRoot 'assets\renderer-inject.js'
    $stagedCss = Join-Path $stagingRoot 'assets\dream-skin.css'
    $stagedAcrylicCss = Join-Path $stagingRoot 'assets\internet-angel-acrylic.css'
    $stagedExtensionCss = Join-Path $stagingRoot 'assets\internet-angel-extension.css'
    Copy-Item -LiteralPath $commonSourcePath -Destination $stagedCommon -Force -ErrorAction Stop
    Copy-Item -LiteralPath $startSourcePath -Destination $stagedStart -Force -ErrorAction Stop
    Copy-Item -LiteralPath $injectorSourcePath -Destination $stagedInjector -Force -ErrorAction Stop
    Copy-Item -LiteralPath $patchSourcePath -Destination $stagedPatch -Force -ErrorAction Stop
    Copy-Item -LiteralPath $rendererSourcePath -Destination $stagedRenderer -Force -ErrorAction Stop
    Copy-Item -LiteralPath $cssSourcePath -Destination $stagedCss -Force -ErrorAction Stop
    Copy-Item -LiteralPath $acrylicCssSourcePath -Destination $stagedAcrylicCss -Force `
      -ErrorAction Stop
    Copy-Item -LiteralPath $extensionCssSourcePath -Destination $stagedExtensionCss -Force `
      -ErrorAction Stop
    $patchPairs = @(
      @{ Relative = 'scripts\common-windows.ps1'; Source = $commonSourcePath; Staged = $stagedCommon; Installed = $installedCommon },
      @{ Relative = 'scripts\start-dream-skin.ps1'; Source = $startSourcePath; Staged = $stagedStart; Installed = $installedStart },
      @{ Relative = 'scripts\injector.mjs'; Source = $injectorSourcePath; Staged = $stagedInjector; Installed = $installedInjector },
      @{ Relative = 'scripts\patch-dream-skin.ps1'; Source = $patchSourcePath; Staged = $stagedPatch; Installed = $installedPatch },
      @{ Relative = 'assets\renderer-inject.js'; Source = $rendererSourcePath; Staged = $stagedRenderer; Installed = $installedRenderer },
      @{ Relative = 'assets\dream-skin.css'; Source = $cssSourcePath; Staged = $stagedCss; Installed = $installedCss },
      @{ Relative = 'assets\internet-angel-acrylic.css'; Source = $acrylicCssSourcePath; Staged = $stagedAcrylicCss; Installed = $installedAcrylicCss },
      @{ Relative = 'assets\internet-angel-extension.css'; Source = $extensionCssSourcePath; Staged = $stagedExtensionCss; Installed = $installedExtensionCss }
    )
    foreach ($assetName in $motionAssetNames) {
      $relative = "assets\$assetName"
      $motionSource = Join-Path $sourceRoot $relative
      $motionStaged = Join-Path $stagingRoot $relative
      Copy-Item -LiteralPath $motionSource -Destination $motionStaged -Force -ErrorAction Stop
      $patchPairs += @{
        Relative = $relative; Source = $motionSource; Staged = $motionStaged
        Installed = (Join-Path $engine.Root $relative)
      }
    }
    foreach ($pair in $patchPairs) {
      $sourceHash = (Get-FileHash -LiteralPath $pair.Source -Algorithm SHA256).Hash
      $stagedHash = (Get-FileHash -LiteralPath $pair.Staged -Algorithm SHA256).Hash
      if ($sourceHash -cne $stagedHash) {
        throw "Staged patch file failed hash verification: $($pair.Relative)"
      }
    }
    # Only PowerShell entry points participate in MOTW unblocking, and only after
    # their staged bytes have been authenticated against the selected source.
    # injector.mjs is data/code consumed by the bundled runtime and is never
    # unblocked here.
    foreach ($stagedScript in @($stagedCommon, $stagedStart, $stagedPatch)) {
      Unblock-File -LiteralPath $stagedScript -ErrorAction Stop
    }

    Assert-DreamSkinRuntimeTree -Path $engine.Root
    Move-DreamSkinPatchDirectoryAtomically -Source $engine.Root -Destination $backupRoot
    $hasBackup = $true
    try {
      Move-DreamSkinPatchDirectoryAtomically -Source $stagingRoot -Destination $engine.Root
    } catch {
      $swapError = $_.Exception.Message
      if ($hasBackup -and -not (Test-Path -LiteralPath $engine.Root)) {
        try {
          Move-DreamSkinPatchDirectoryAtomically -Source $backupRoot -Destination $engine.Root
          $hasBackup = $false
        } catch {
          $preserveTransactions = $true
          throw "Dream Skin runtime patch failed and its previous engine could not be restored. Backup preserved at ${backupRoot}: $swapError"
        }
      }
      throw
    }

    try {
      foreach ($pair in $patchPairs) {
        $installedHash = (Get-FileHash -LiteralPath $pair.Installed -Algorithm SHA256).Hash
        $sourceHash = (Get-FileHash -LiteralPath $pair.Source -Algorithm SHA256).Hash
        if ($installedHash -cne $sourceHash) {
          throw "Installed patch file failed verification: $($pair.Relative)"
        }
      }
    } catch {
      $verificationError = $_.Exception.Message
      try {
        if (Test-Path -LiteralPath $engine.Root) {
          Move-DreamSkinPatchDirectoryAtomically -Source $engine.Root -Destination $failedRoot
        }
        Move-DreamSkinPatchDirectoryAtomically -Source $backupRoot -Destination $engine.Root
        $hasBackup = $false
      } catch {
        $preserveTransactions = $true
        throw "Dream Skin runtime patch failed verification and its previous engine could not be restored. Backup preserved at ${backupRoot}; failed candidate preserved at ${failedRoot}: $verificationError"
      }
      if (Test-Path -LiteralPath $failedRoot) {
        try { Remove-DreamSkinRuntimeTree -Path $failedRoot -StateRoot $stateRoot } catch {
          Write-Warning "Could not remove failed patch candidate ${failedRoot}: $($_.Exception.Message)"
        }
      }
      throw "Dream Skin runtime patch failed verification; the previous engine was restored: $verificationError"
    }

    $applied = $true
  } finally {
    if (-not $preserveTransactions -and (Test-Path -LiteralPath $stagingRoot)) {
      try { Remove-DreamSkinRuntimeTree -Path $stagingRoot -StateRoot $stateRoot } catch {
        Write-Warning "Could not remove staged patch engine ${stagingRoot}: $($_.Exception.Message)"
      }
    }
    if ($applied -and $hasBackup -and (Test-Path -LiteralPath $backupRoot)) {
      try { Remove-DreamSkinRuntimeTree -Path $backupRoot -StateRoot $stateRoot } catch {
        Write-Warning "Installed the patch but could not remove its previous engine backup ${backupRoot}: $($_.Exception.Message)"
      }
    }
  }
  if (-not $applied) {
    throw 'Patch application did not complete.'
  }
  Write-Host "Patched installed Dream Skin runtime at $($engine.Root). No uninstall or Codex restart was required."
} finally {
  Exit-DreamSkinOperationLock -Mutex $operationLock
}
