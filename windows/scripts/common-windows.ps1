. (Join-Path $PSScriptRoot 'config-utf8.ps1')

$script:DreamSkinStartResultCategories = @(
  'none',
  'cdp-launch-failed',
  'cdp-direct-access-denied',
  'cdp-endpoint-unavailable',
  'port-unavailable',
  'state-reconciliation-failed',
  'injector-start-failed',
  'renderer-verification-failed',
  'superseded',
  'internal-start-failure'
)
$script:DreamSkinStartAppearanceRecoveryStates = @(
  'not-needed',
  'retained',
  'restored',
  'conflict-preserved',
  'blocked',
  'preserved-rendered'
)

function New-DreamSkinStartException {
  param(
    [Parameter(Mandatory = $true)][string]$Category,
    [Parameter(Mandatory = $true)][string]$Message,
    [AllowNull()][System.Exception]$InnerException
  )
  if ($script:DreamSkinStartResultCategories -cnotcontains $Category -or $Category -ceq 'none') {
    throw 'Invalid Dream Skin start failure category.'
  }
  $exception = if ($null -ne $InnerException) {
    [System.InvalidOperationException]::new($Message, $InnerException)
  } else {
    [System.InvalidOperationException]::new($Message)
  }
  $exception.Data['DreamSkinStartCategory'] = $Category
  return $exception
}

function Get-DreamSkinStartFailureCategory {
  param(
    [Parameter(Mandatory = $true)][System.Exception]$Exception,
    [ValidateSet(
      'cdp-launch-failed', 'cdp-direct-access-denied', 'cdp-endpoint-unavailable',
      'port-unavailable', 'state-reconciliation-failed', 'injector-start-failed',
      'renderer-verification-failed', 'superseded', 'internal-start-failure'
    )]
    [string]$FallbackCategory = 'internal-start-failure'
  )
  $current = $Exception
  while ($null -ne $current) {
    $category = "$($current.Data['DreamSkinStartCategory'])"
    if ($script:DreamSkinStartResultCategories -ccontains $category -and $category -cne 'none') {
      return $category
    }
    $current = $current.InnerException
  }
  return $FallbackCategory
}

function Get-DreamSkinStartResultPath {
  param(
    [Parameter(Mandatory = $true)][string]$StateRoot,
    [Parameter(Mandatory = $true)][string]$Token
  )
  if ($Token -cnotmatch '\A[a-f0-9]{32}\z') {
    throw 'Dream Skin start result token is invalid.'
  }
  $root = [System.IO.Path]::GetFullPath($StateRoot)
  return Join-Path $root ('.start-result-' + $Token + '.json')
}

function Write-DreamSkinStartResult {
  param(
    [Parameter(Mandatory = $true)][string]$StateRoot,
    [Parameter(Mandatory = $true)][string]$Token,
    [Parameter(Mandatory = $true)][ValidateSet('success', 'failure')][string]$Outcome,
    [Parameter(Mandatory = $true)][string]$Category,
    [Parameter(Mandatory = $true)][string]$AppearanceRecovery
  )
  if ($script:DreamSkinStartResultCategories -cnotcontains $Category -or
    $script:DreamSkinStartAppearanceRecoveryStates -cnotcontains $AppearanceRecovery -or
    ($Outcome -ceq 'success' -and $Category -cne 'none') -or
    ($Outcome -ceq 'failure' -and $Category -ceq 'none')) {
    throw 'Dream Skin start result fields are invalid.'
  }
  $path = Get-DreamSkinStartResultPath -StateRoot $StateRoot -Token $Token
  [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetFullPath($StateRoot)) | Out-Null
  if (Get-Command Assert-DreamSkinNoReparseComponents -ErrorAction SilentlyContinue) {
    Assert-DreamSkinNoReparseComponents -Path $path
  }
  $result = [ordered]@{
    schemaVersion = 1
    token = $Token
    outcome = $Outcome
    category = $Category
    appearanceRecovery = $AppearanceRecovery
  }
  $content = (($result | ConvertTo-Json -Compress) + "`r`n")
  if ($script:DreamSkinUtf8NoBom.GetByteCount($content) -gt 4096) {
    throw 'Dream Skin start result exceeded its fixed size limit.'
  }
  Write-DreamSkinUtf8FileAtomically -Path $path -Content $content -ExpectedBytes $null
}

function Read-DreamSkinStartResult {
  param(
    [Parameter(Mandatory = $true)][string]$StateRoot,
    [Parameter(Mandatory = $true)][string]$Token
  )
  $path = Get-DreamSkinStartResultPath -StateRoot $StateRoot -Token $Token
  if (Get-Command Assert-DreamSkinNoReparseComponents -ErrorAction SilentlyContinue) {
    Assert-DreamSkinNoReparseComponents -Path $path
  }
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw 'Dream Skin start did not return a structured result.'
  }
  $stream = $null
  try {
    # Hold one non-writable, non-deletable handle from the size check through
    # the read. This prevents a path swap or growth between two file opens.
    $stream = [System.IO.FileStream]::new(
      $path,
      [System.IO.FileMode]::Open,
      [System.IO.FileAccess]::Read,
      [System.IO.FileShare]::Read
    )
    if ($stream.Length -le 0 -or $stream.Length -gt 4096) {
      throw 'Dream Skin start returned an invalid structured result size.'
    }
    $bytes = [byte[]]::new([int]$stream.Length)
    $offset = 0
    while ($offset -lt $bytes.Length) {
      $read = $stream.Read($bytes, $offset, $bytes.Length - $offset)
      if ($read -le 0) {
        throw 'Dream Skin start returned a truncated structured result.'
      }
      $offset += $read
    }
  } finally {
    if ($null -ne $stream) { $stream.Dispose() }
  }
  $json = ConvertFrom-DreamSkinUtf8Bytes -Bytes $bytes -Path $path
  try { $result = $json | ConvertFrom-Json -ErrorAction Stop } catch {
    throw 'Dream Skin start returned invalid structured result JSON.'
  }
  if ($null -eq $result -or $result -is [string] -or $result -is [array]) {
    throw 'Dream Skin start returned an invalid structured result object.'
  }
  $allowed = @('schemaVersion', 'token', 'outcome', 'category', 'appearanceRecovery')
  $properties = @($result.PSObject.Properties)
  if ($properties.Count -ne $allowed.Count) {
    throw 'Dream Skin start returned an unexpected structured result shape.'
  }
  foreach ($property in $properties) {
    if ($allowed -cnotcontains $property.Name) {
      throw 'Dream Skin start returned an unexpected structured result field.'
    }
  }
  if (($result.schemaVersion -isnot [int] -and $result.schemaVersion -isnot [long]) -or
    [int64]$result.schemaVersion -ne 1 -or
    $result.token -isnot [string] -or "$($result.token)" -cne $Token -or
    $result.outcome -isnot [string] -or
    @('success', 'failure') -cnotcontains "$($result.outcome)" -or
    $result.category -isnot [string] -or
    $script:DreamSkinStartResultCategories -cnotcontains "$($result.category)" -or
    $result.appearanceRecovery -isnot [string] -or
    $script:DreamSkinStartAppearanceRecoveryStates -cnotcontains "$($result.appearanceRecovery)" -or
    ("$($result.outcome)" -ceq 'success' -and "$($result.category)" -cne 'none') -or
    ("$($result.outcome)" -ceq 'failure' -and "$($result.category)" -ceq 'none')) {
    throw 'Dream Skin start returned invalid structured result values.'
  }
  return $result
}

function Enter-DreamSkinOperationLock {
  param(
    [ValidateRange(0, 300000)]
    [int]$TimeoutMilliseconds = 0
  )
  $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $mutex = [System.Threading.Mutex]::new($false, "Global\CodexDreamSkin.$sid.Operation")
  $acquired = $false
  try {
    $acquired = $mutex.WaitOne($TimeoutMilliseconds)
  } catch [System.Threading.AbandonedMutexException] {
    $acquired = $true
  }
  if (-not $acquired) {
    $mutex.Dispose()
    if ($TimeoutMilliseconds -eq 0) {
      throw 'Another Codex Dream Skin install, start, restore, or verify operation is already running.'
    }
    throw "Another Codex Dream Skin operation did not finish within $TimeoutMilliseconds ms."
  }
  return $mutex
}

function Exit-DreamSkinOperationLock {
  param([Parameter(Mandatory = $true)][System.Threading.Mutex]$Mutex)
  try { $Mutex.ReleaseMutex() } finally { $Mutex.Dispose() }
}

function Assert-DreamSkinPort {
  param([Parameter(Mandatory = $true)][int]$Port)
  if ($Port -lt 1024 -or $Port -gt 65535) { throw "Port must be between 1024 and 65535: $Port" }
}

function Test-DreamSkinPathEqual {
  param([string]$Left, [string]$Right)
  if (-not $Left -or -not $Right) { return $false }
  try {
    return ([System.IO.Path]::GetFullPath($Left).TrimEnd('\') -ieq [System.IO.Path]::GetFullPath($Right).TrimEnd('\'))
  } catch {
    return $false
  }
}

function Test-DreamSkinPathWithin {
  param([string]$Path, [string]$Root)
  if (-not $Path -or -not $Root) { return $false }
  try {
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $prefix = [System.IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
    return $fullPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)
  } catch {
    return $false
  }
}

function Get-DreamSkinRuntimeEnginePaths {
  param([string]$StateRoot = (Join-Path $env:LOCALAPPDATA 'CodexDreamSkin'))
  $root = Join-Path ([System.IO.Path]::GetFullPath($StateRoot)) 'engine'
  $scripts = Join-Path $root 'scripts'
  return [pscustomobject]@{
    Root = $root
    Scripts = $scripts
    Runtime = Join-Path $root 'runtime'
    Version = Join-Path $root 'VERSION'
    CommunityApply = Join-Path $scripts 'apply-community-theme.ps1'
    Start = Join-Path $scripts 'start-dream-skin.ps1'
    Restore = Join-Path $scripts 'restore-dream-skin.ps1'
    Tray = Join-Path $scripts 'tray-dream-skin.ps1'
    AutoLaunch = Join-Path $scripts 'auto-launch-dream-skin.ps1'
    AutoLaunchManager = Join-Path $scripts 'manage-auto-launch-dream-skin.ps1'
    AcrylicHelper = Join-Path $scripts 'acrylic-window.ps1'
    WindowEffectsManager = Join-Path $scripts 'manage-window-effects.ps1'
    CheckUpdate = Join-Path $scripts 'check-update.ps1'
  }
}

function Get-DreamSkinWindowEffectsPath {
  param([string]$StateRoot = (Join-Path $env:LOCALAPPDATA 'CodexDreamSkin'))
  return Join-Path ([System.IO.Path]::GetFullPath($StateRoot)) 'window-effects.json'
}

function Read-DreamSkinWindowEffects {
  param([string]$StateRoot = (Join-Path $env:LOCALAPPDATA 'CodexDreamSkin'))
  $path = Get-DreamSkinWindowEffectsPath -StateRoot $StateRoot
  if (-not (Test-Path -LiteralPath $path)) {
    return [pscustomobject]@{
      SchemaVersion = 1
      Platform = 'windows'
      WindowMaterial = 'system'
      Path = $path
      Exists = $false
    }
  }
  Assert-DreamSkinNoReparseComponents -Path $path
  $item = Get-Item -LiteralPath $path -Force -ErrorAction Stop
  if ($item.PSIsContainer -or ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0 -or
    $item.Length -lt 2 -or $item.Length -gt 4096) {
    throw "Dream Skin window-effects settings are not a small regular file: $path"
  }
  try {
    $settings = (Read-DreamSkinUtf8File -Path $path) | ConvertFrom-Json -ErrorAction Stop
  } catch {
    throw "Dream Skin window-effects settings are unreadable; no native window material was changed: $path"
  }
  if ($null -eq $settings -or $settings -is [string] -or $settings -is [array]) {
    throw 'Dream Skin window-effects settings must be a JSON object.'
  }
  $names = @($settings.PSObject.Properties.Name)
  $expectedNames = @('schemaVersion', 'platform', 'windowMaterial')
  if (@($names | Where-Object { $_ -notin $expectedNames }).Count -gt 0 -or
    @($expectedNames | Where-Object { $_ -notin $names }).Count -gt 0) {
    throw 'Dream Skin window-effects settings contain missing or unsupported fields.'
  }
  $schemaVersion = 0
  if (-not [int]::TryParse("$($settings.schemaVersion)", [ref]$schemaVersion) -or
    $schemaVersion -ne 1 -or "$($settings.platform)" -cne 'windows') {
    throw 'Dream Skin window-effects settings have an unsupported schema or platform.'
  }
  $material = "$($settings.windowMaterial)".ToLowerInvariant()
  if ($material -notin @('system', 'acrylic')) {
    throw 'Dream Skin window-effects windowMaterial must be system or acrylic.'
  }
  return [pscustomobject]@{
    SchemaVersion = 1
    Platform = 'windows'
    WindowMaterial = $material
    Path = $path
    Exists = $true
  }
}

function Write-DreamSkinWindowEffects {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('system', 'acrylic')][string]$WindowMaterial,
    [string]$StateRoot = (Join-Path $env:LOCALAPPDATA 'CodexDreamSkin')
  )
  $fullStateRoot = [System.IO.Path]::GetFullPath($StateRoot)
  Ensure-DreamSkinManagedDirectory -Path $fullStateRoot -Root $fullStateRoot
  $path = Get-DreamSkinWindowEffectsPath -StateRoot $fullStateRoot
  if (Test-Path -LiteralPath $path) {
    $null = Read-DreamSkinWindowEffects -StateRoot $fullStateRoot
  } else {
    Assert-DreamSkinNoReparseComponents -Path $path
  }
  $settings = [ordered]@{
    schemaVersion = 1
    platform = 'windows'
    windowMaterial = $WindowMaterial.ToLowerInvariant()
  }
  Write-DreamSkinUtf8FileAtomically -Path $path `
    -Content (($settings | ConvertTo-Json -Depth 3) + "`r`n")
  return Read-DreamSkinWindowEffects -StateRoot $fullStateRoot
}

function Get-DreamSkinAcrylicEnvironment {
  $build = 0
  try {
    $currentVersion = Get-ItemProperty `
      -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -ErrorAction Stop
    [void][int]::TryParse("$($currentVersion.CurrentBuildNumber)", [ref]$build)
  } catch {
    $build = 0
  }
  $transparencyEnabled = $false
  try {
    $personalize = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey(
      'Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
    )
    try {
      $transparencyEnabled = [int]$personalize.GetValue('EnableTransparency', 1) -ne 0
    } finally {
      if ($null -ne $personalize) { $personalize.Dispose() }
    }
  } catch {
    $transparencyEnabled = $false
  }
  return [pscustomobject]@{
    Build = $build
    TransparencyEnabled = $transparencyEnabled
    Supported = [bool]($build -ge 22621 -and $transparencyEnabled)
  }
}

function Test-DreamSkinTrayActive {
  $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $mutex = [System.Threading.Mutex]::new($false, "Local\CodexDreamSkin.$sid.Tray")
  $acquired = $false
  try {
    try { $acquired = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] {
      $acquired = $true
    }
    if ($acquired) {
      $mutex.ReleaseMutex()
      $acquired = $false
      return $false
    }
    return $true
  } finally {
    if ($acquired) { try { $mutex.ReleaseMutex() } catch {} }
    $mutex.Dispose()
  }
}

function Stop-DreamSkinTrayProcess {
  param(
    [string[]]$ScriptPaths = @(),
    [switch]$RequireStopped
  )
  if ($ScriptPaths.Count -eq 0) {
    $ScriptPaths = @((Get-DreamSkinRuntimeEnginePaths).Tray)
  }
  $normalized = @($ScriptPaths | ForEach-Object {
    try { [System.IO.Path]::GetFullPath($_) } catch { $null }
  } | Where-Object { $_ })
  $failures = @()
  try {
    $processes = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe' OR Name = 'pwsh.exe'" `
      -ErrorAction Stop
    foreach ($process in $processes) {
      if ($process.ProcessId -eq $PID -or -not $process.CommandLine) { continue }
      $matchesTray = $false
      foreach ($scriptPath in $normalized) {
        if ($process.CommandLine.IndexOf($scriptPath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
          $matchesTray = $true
          break
        }
      }
      if (-not $matchesTray) { continue }
      try {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
        Wait-Process -Id $process.ProcessId -Timeout 5 -ErrorAction SilentlyContinue
      } catch {
        $failures += "PID $($process.ProcessId): $($_.Exception.Message)"
      }
    }
  } catch {
    $failures += $_.Exception.Message
  }
  if ($failures.Count -gt 0) {
    $message = 'Could not close the Dream Skin tray automatically: ' + ($failures -join '; ')
    if ($RequireStopped) { throw $message }
    Write-Warning $message
  }
  if ($RequireStopped -and (Test-DreamSkinTrayActive)) {
    throw 'The Dream Skin tray is still active. Exit it and retry the operation.'
  }
}

function Assert-DreamSkinRuntimeTree {
  param([Parameter(Mandatory = $true)][string]$Path)
  $root = [System.IO.Path]::GetFullPath($Path)
  if (-not (Test-Path -LiteralPath $root -PathType Container)) {
    throw "Dream Skin runtime directory does not exist: $root"
  }
  if (-not (Get-Command Assert-DreamSkinNoReparseComponents -ErrorAction SilentlyContinue)) {
    throw 'Dream Skin managed-path validation is unavailable.'
  }
  Assert-DreamSkinNoReparseComponents -Path $root
  foreach ($item in Get-ChildItem -LiteralPath $root -Recurse -Force -ErrorAction Stop) {
    if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw "Dream Skin runtime contains a junction or symbolic link: $($item.FullName)"
    }
  }
}

function Remove-DreamSkinRuntimeTree {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$StateRoot
  )
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $fullStateRoot = [System.IO.Path]::GetFullPath($StateRoot)
  if (-not (Test-DreamSkinPathWithin -Path $fullPath -Root $fullStateRoot)) {
    throw "Refusing to remove a runtime path outside the Dream Skin state root: $fullPath"
  }
  if (-not (Test-Path -LiteralPath $fullPath)) { return }
  Assert-DreamSkinRuntimeTree -Path $fullPath
  Remove-Item -LiteralPath $fullPath -Recurse -Force -ErrorAction Stop
}

function Install-DreamSkinRuntimeEngine {
  param(
    [Parameter(Mandatory = $true)][string]$SkillRoot,
    [Parameter(Mandatory = $true)][string]$StateRoot
  )
  if (-not (Get-Command Ensure-DreamSkinManagedDirectory -ErrorAction SilentlyContinue)) {
    throw 'Dream Skin managed-directory validation is unavailable.'
  }

  $sourceRoot = [System.IO.Path]::GetFullPath($SkillRoot)
  $fullStateRoot = [System.IO.Path]::GetFullPath($StateRoot)
  $engine = Get-DreamSkinRuntimeEnginePaths -StateRoot $fullStateRoot
  $required = @(
    'VERSION',
    'assets\dream-reference.jpg',
    'assets\dream-skin.css',
    'assets\internet-angel-acrylic.css',
    'assets\internet-angel-extension.css',
    'assets\internet-angel-extension.js',
    'assets\css-predicate-cache.mjs',
    'assets\renderer-inject.js',
    'assets\safe-css-policy.json',
    'assets\safe-css-validator.mjs',
    'assets\selectors.json',
    'assets\theme-package-validator.mjs',
    'assets\theme.json',
    'presets\preset-gothic-void-crusade\background.jpg',
    'presets\preset-gothic-void-crusade\theme.json',
    'scripts\apply-community-theme.ps1',
    'scripts\acrylic-window.ps1',
    'scripts\auto-launch-dream-skin.ps1',
    'scripts\common-windows.ps1',
    'scripts\check-update.ps1',
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
    'scripts\verify-dream-skin.ps1'
  )
  $sourceHasBundledRuntime = Test-Path -LiteralPath (Join-Path $sourceRoot 'runtime') `
    -PathType Container
  if ($sourceHasBundledRuntime) {
    $required += @('runtime\node\node.exe', 'runtime\node\LICENSE')
  }
  foreach ($relative in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot $relative) -PathType Leaf)) {
      throw "Dream Skin runtime source is incomplete: $relative"
    }
  }
  $internetAngelTrayAssets = @(
    'assets\internet-angel-tray.ico',
    'assets\internet-angel-tray.png'
  )
  $internetAngelTrayAssetCount = @($internetAngelTrayAssets | Where-Object {
      Test-Path -LiteralPath (Join-Path $sourceRoot $_) -PathType Leaf
    }).Count
  if ($internetAngelTrayAssetCount -notin @(0, $internetAngelTrayAssets.Count)) {
    throw 'Dream Skin runtime source has an incomplete Internet Angel tray icon set.'
  }
  $sourceDirectories = @('assets', 'scripts', 'presets')
  if ($sourceHasBundledRuntime) {
    $sourceDirectories += 'runtime'
  }
  foreach ($directoryName in $sourceDirectories) {
    $sourceDirectory = Join-Path $sourceRoot $directoryName
    if ((Test-DreamSkinPathEqual -Left $fullStateRoot -Right $sourceDirectory) -or
      (Test-DreamSkinPathWithin -Path $fullStateRoot -Root $sourceDirectory)) {
      throw "Dream Skin state root cannot be created inside its runtime source: $fullStateRoot"
    }
    Assert-DreamSkinRuntimeTree -Path $sourceDirectory
  }

  Ensure-DreamSkinManagedDirectory -Path $fullStateRoot -Root $fullStateRoot
  $token = [guid]::NewGuid().ToString('N')
  $stagingRoot = Join-Path $fullStateRoot ".engine-staging-$token"
  $backupRoot = Join-Path $fullStateRoot ".engine-backup-$token"
  Ensure-DreamSkinManagedDirectory -Path $stagingRoot -Root $fullStateRoot

  try {
    Copy-Item -LiteralPath (Join-Path $sourceRoot 'VERSION') -Destination $stagingRoot `
      -Force -ErrorAction Stop
    foreach ($directoryName in $sourceDirectories) {
      Copy-Item -LiteralPath (Join-Path $sourceRoot $directoryName) -Destination $stagingRoot `
        -Recurse -Force -ErrorAction Stop
    }
    Assert-DreamSkinRuntimeTree -Path $stagingRoot
    foreach ($relative in $required) {
      if (-not (Test-Path -LiteralPath (Join-Path $stagingRoot $relative) -PathType Leaf)) {
        throw "Staged Dream Skin runtime is incomplete: $relative"
      }
    }

    $sourcePrefix = $sourceRoot.TrimEnd('\') + '\'
    $sourceFileRoots = @($sourceDirectories | ForEach-Object { Join-Path $sourceRoot $_ })
    $stagedFileRoots = @($sourceDirectories | ForEach-Object { Join-Path $stagingRoot $_ })
    $sourceFiles = @((Get-Item -LiteralPath (Join-Path $sourceRoot 'VERSION'))) + @(
      Get-ChildItem -LiteralPath $sourceFileRoots -Recurse -File -Force -ErrorAction Stop
    )
    $stagedFiles = @((Get-Item -LiteralPath (Join-Path $stagingRoot 'VERSION'))) + @(
      Get-ChildItem -LiteralPath $stagedFileRoots -Recurse -File -Force -ErrorAction Stop
    )
    if ($sourceFiles.Count -ne $stagedFiles.Count) {
      throw 'Staged Dream Skin runtime file count does not match its source.'
    }
    foreach ($sourceFile in $sourceFiles) {
      $relative = $sourceFile.FullName.Substring($sourcePrefix.Length)
      $stagedFile = Join-Path $stagingRoot $relative
      if (-not (Test-Path -LiteralPath $stagedFile -PathType Leaf) -or
        (Get-FileHash -Algorithm SHA256 -LiteralPath $sourceFile.FullName).Hash -cne
        (Get-FileHash -Algorithm SHA256 -LiteralPath $stagedFile).Hash) {
        throw "Staged Dream Skin runtime failed hash verification: $relative"
      }
    }

    # Unblock only verified managed copies so shortcuts can honor RemoteSigned instead of bypassing policy.
    foreach ($runtimeScript in Get-ChildItem -LiteralPath (Join-Path $stagingRoot 'scripts') `
      -Filter '*.ps1' -Recurse -File -Force -ErrorAction Stop) {
      Unblock-File -LiteralPath $runtimeScript.FullName -ErrorAction Stop
    }
    if (Test-Path -LiteralPath (Join-Path $stagingRoot 'runtime') -PathType Container) {
      foreach ($runtimeFile in Get-ChildItem -LiteralPath (Join-Path $stagingRoot 'runtime') `
        -Recurse -File -Force -ErrorAction Stop) {
        Unblock-File -LiteralPath $runtimeFile.FullName -ErrorAction Stop
      }
    }

    $hasBackup = $false
    if (Test-Path -LiteralPath $engine.Root) {
      Assert-DreamSkinRuntimeTree -Path $engine.Root
      Move-Item -LiteralPath $engine.Root -Destination $backupRoot -ErrorAction Stop
      $hasBackup = $true
    }
    try {
      Move-Item -LiteralPath $stagingRoot -Destination $engine.Root -ErrorAction Stop
    } catch {
      $installError = $_.Exception.Message
      if ($hasBackup -and -not (Test-Path -LiteralPath $engine.Root)) {
        try {
          Move-Item -LiteralPath $backupRoot -Destination $engine.Root -ErrorAction Stop
          $hasBackup = $false
        } catch {
          throw "Dream Skin runtime update failed and its previous engine could not be restored. Backup preserved at ${backupRoot}: $installError"
        }
      }
      throw
    }
    if ($hasBackup) {
      try { Remove-DreamSkinRuntimeTree -Path $backupRoot -StateRoot $fullStateRoot } catch {
        try {
          Write-Warning "Installed the new runtime but could not remove its previous backup: $($_.Exception.Message)"
        } catch {
          # Cleanup must never make a committed runtime update look unsuccessful.
        }
      }
    }
    return Get-DreamSkinRuntimeEnginePaths -StateRoot $fullStateRoot
  } finally {
    if (Test-Path -LiteralPath $stagingRoot) {
      try { Remove-DreamSkinRuntimeTree -Path $stagingRoot -StateRoot $fullStateRoot } catch {
        try {
          Write-Warning "Could not remove the staged Dream Skin runtime: $($_.Exception.Message)"
        } catch {
          # Cleanup must never mask the runtime installation result.
        }
      }
    }
  }
}

function Test-DreamSkinCommandLineToken {
  param([string]$CommandLine, [string]$Token)
  if (-not $CommandLine -or -not $Token) { return $false }
  $pattern = '(?i)(?:^|[\s"])' + [regex]::Escape($Token) + '(?=$|[\s"])'
  return [regex]::IsMatch($CommandLine, $pattern)
}

function Get-DreamSkinCodexDebugArgumentStatus {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]]$Processes,
    [Parameter(Mandatory = $true)][int]$Port
  )
  Assert-DreamSkinPort -Port $Port
  $flag = "--remote-debugging-port=$Port"
  $encodedFlag = [Uri]::EscapeDataString($flag)
  $sawReadableCommandLine = $false
  $sawProtocolRedirect = $false
  foreach ($process in $Processes) {
    $commandLine = "$($process.CommandLine)"
    if (-not $commandLine) { continue }
    $sawReadableCommandLine = $true
    $protocolPattern = '(?i)(?<!\S)"?(?<url>codex://[^\s"]*)"?'
    $protocolMatches = [regex]::Matches($commandLine, $protocolPattern)
    foreach ($protocolMatch in $protocolMatches) {
      $protocolArgument = $protocolMatch.Groups['url'].Value
      if ($protocolArgument.IndexOf($encodedFlag, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -or
        $protocolArgument.IndexOf($flag, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
        $sawProtocolRedirect = $true
      }
    }
    $rawArguments = [regex]::Replace($commandLine, $protocolPattern, ' ')
    if (Test-DreamSkinCommandLineToken -CommandLine $rawArguments -Token $flag) {
      return 'forwarded'
    }
  }
  if ($sawProtocolRedirect) { return 'protocol-redirected' }
  if ($sawReadableCommandLine) { return 'not-forwarded' }
  return 'uninspectable'
}

function Get-DreamSkinCodexAnyDebugIntentStatus {
  param([Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]]$Processes)
  if ($Processes.Count -eq 0) { return 'none' }
  # Treat a decoded flag anywhere in the command line (including inside a
  # codex:// query value) as intent. False positives only suppress automation.
  $pattern = '(?i)--(?:remote-debugging-(?:address|port|pipe)|inspect(?:-brk|-port)?|' +
    'auto-open-devtools-for-tabs|devtools)(?:=|\s|$)'
  foreach ($process in $Processes) {
    $commandLine = "$($process.CommandLine)"
    if (-not $commandLine) { return 'uninspectable' }
    $candidate = $commandLine
    for ($decodePass = 0; $decodePass -lt 3; $decodePass++) {
      if ([regex]::IsMatch($candidate, $pattern)) { return 'debug-intent' }
      try {
        $decoded = [Uri]::UnescapeDataString($candidate)
      } catch {
        return 'uninspectable'
      }
      if ($decoded -ceq $candidate) { break }
      $candidate = $decoded
    }
  }
  return 'none'
}

function ConvertTo-DreamSkinAutoRestartTargetProcesses {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]]$TargetProcesses,
    [switch]$AllowEmpty
  )

  $items = @($TargetProcesses)
  if ($items.Count -eq 0 -and -not $AllowEmpty) {
    throw 'The automatic restart reservation has no target processes.'
  }
  if ($items.Count -gt 256) {
    throw 'The automatic restart reservation has too many target processes.'
  }

  $seenProcessIds = @{}
  $validated = @()
  $expectedFields = @(
    'processId', 'sessionId', 'startTimeFileTimeUtc', 'executablePath',
    'packageFullName', 'packageFamilyName'
  )
  foreach ($item in $items) {
    if ($null -eq $item -or $item -is [string] -or $item -is [array]) {
      throw 'An automatic restart target process is not an object.'
    }
    $fieldNames = @($item.PSObject.Properties.Name)
    if (@($fieldNames | Where-Object { $_ -notin $expectedFields }).Count -gt 0 -or
      @($expectedFields | Where-Object { $_ -notin $fieldNames }).Count -gt 0) {
      throw 'An automatic restart target process contains missing or unsupported fields.'
    }

    $processId = 0
    $sessionId = -1
    $startTime = 0L
    if (-not [int]::TryParse("$($item.processId)", [ref]$processId) -or $processId -le 0 -or
      -not [int]::TryParse("$($item.sessionId)", [ref]$sessionId) -or $sessionId -lt 0 -or
      -not [long]::TryParse("$($item.startTimeFileTimeUtc)", [ref]$startTime) -or
      $startTime -le 0) {
      throw 'An automatic restart target process has an invalid PID, session, or creation time.'
    }
    if ($seenProcessIds.ContainsKey($processId)) {
      throw "The automatic restart reservation repeats PID $processId."
    }
    $seenProcessIds[$processId] = $true

    $rawExecutable = "$($item.executablePath)"
    if (-not $rawExecutable -or -not [System.IO.Path]::IsPathRooted($rawExecutable)) {
      throw 'An automatic restart target executable path is not absolute.'
    }
    try { $executable = [System.IO.Path]::GetFullPath($rawExecutable) } catch {
      throw 'An automatic restart target executable path is invalid.'
    }
    if ([System.IO.Path]::GetFileName($executable) -ine 'ChatGPT.exe') {
      throw 'An automatic restart target executable is not ChatGPT.exe.'
    }

    $packageFullName = "$($item.packageFullName)"
    $packageFamilyName = "$($item.packageFamilyName)"
    if ($packageFullName -cnotmatch '^[A-Za-z0-9._-]{1,256}$' -or
      $packageFamilyName -cnotmatch '^[A-Za-z0-9._-]{1,128}$') {
      throw 'An automatic restart target package identity is invalid.'
    }

    $validated += [pscustomobject][ordered]@{
      processId = $processId
      sessionId = $sessionId
      startTimeFileTimeUtc = $startTime
      executablePath = $executable
      packageFullName = $packageFullName
      packageFamilyName = $packageFamilyName
    }
  }
  return @($validated | Sort-Object processId)
}

function Test-DreamSkinAutoRestartTargetProcessesEqual {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]]$Reserved,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]]$Current
  )

  $expected = @(ConvertTo-DreamSkinAutoRestartTargetProcesses -TargetProcesses $Reserved)
  $actual = @(ConvertTo-DreamSkinAutoRestartTargetProcesses -TargetProcesses $Current -AllowEmpty)
  if ($expected.Count -ne $actual.Count) { return $false }
  for ($index = 0; $index -lt $expected.Count; $index++) {
    if ([int]$expected[$index].processId -ne [int]$actual[$index].processId -or
      [int]$expected[$index].sessionId -ne [int]$actual[$index].sessionId -or
      [long]$expected[$index].startTimeFileTimeUtc -ne
        [long]$actual[$index].startTimeFileTimeUtc -or
      -not (Test-DreamSkinPathEqual -Left "$($expected[$index].executablePath)" `
        -Right "$($actual[$index].executablePath)") -or
      "$($expected[$index].packageFullName)" -ine "$($actual[$index].packageFullName)" -or
      "$($expected[$index].packageFamilyName)" -ine "$($actual[$index].packageFamilyName)") {
      return $false
    }
  }
  return $true
}

function Test-DreamSkinAutoRestartTargetProcessesSubset {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]]$Reserved,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]]$Current
  )

  $expected = @(ConvertTo-DreamSkinAutoRestartTargetProcesses -TargetProcesses $Reserved)
  $actual = @(ConvertTo-DreamSkinAutoRestartTargetProcesses -TargetProcesses $Current -AllowEmpty)
  if ($actual.Count -gt $expected.Count) { return $false }
  $expectedByProcessId = @{}
  foreach ($target in $expected) { $expectedByProcessId[[int]$target.processId] = $target }
  foreach ($target in $actual) {
    $processId = [int]$target.processId
    if (-not $expectedByProcessId.ContainsKey($processId)) { return $false }
    $reservedTarget = $expectedByProcessId[$processId]
    if ([int]$reservedTarget.sessionId -ne [int]$target.sessionId -or
      [long]$reservedTarget.startTimeFileTimeUtc -ne [long]$target.startTimeFileTimeUtc -or
      -not (Test-DreamSkinPathEqual -Left "$($reservedTarget.executablePath)" `
        -Right "$($target.executablePath)") -or
      "$($reservedTarget.packageFullName)" -ine "$($target.packageFullName)" -or
      "$($reservedTarget.packageFamilyName)" -ine "$($target.packageFamilyName)") {
      return $false
    }
  }
  return $true
}

function Get-DreamSkinRegisteredCodexProcessSnapshot {
  param(
    [Parameter(Mandatory = $true)][object[]]$RegisteredInstalls,
    [ValidateRange(0, 2147483647)][int]$ExpectedSessionId
  )

  $installs = @($RegisteredInstalls)
  if ($installs.Count -eq 0) {
    throw 'No validated Codex Store install is available for an automatic restart snapshot.'
  }
  if ($PSBoundParameters.ContainsKey('ExpectedSessionId')) {
    $snapshotSessionId = $ExpectedSessionId
  } else {
    $currentProcess = Get-Process -Id $PID -ErrorAction Stop
    try { $snapshotSessionId = [int]$currentProcess.SessionId } finally { $currentProcess.Dispose() }
  }
  $allProcesses = @(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" -ErrorAction Stop)
  $registeredProcesses = @()
  $targets = @()
  foreach ($process in $allProcesses) {
    $processId = 0
    $processSessionId = -1
    if (-not [int]::TryParse("$($process.ProcessId)", [ref]$processId) -or $processId -le 0) {
      throw 'A ChatGPT.exe process has an invalid PID.'
    }
    if (-not [int]::TryParse("$($process.SessionId)", [ref]$processSessionId) -or
      $processSessionId -lt 0) {
      throw "A ChatGPT.exe process has an invalid Windows session ID: PID $processId"
    }
    if ($processSessionId -ne $snapshotSessionId) { continue }
    $processPath = Get-DreamSkinProcessExecutablePath -ProcessInfo $process
    if (-not $processPath) {
      throw "A ChatGPT.exe process path could not be inspected safely: PID $processId"
    }
    $matches = @($installs | Where-Object {
      Test-DreamSkinPathEqual -Left $processPath -Right "$($_.Executable)"
    })
    if ($matches.Count -eq 0) {
      if ($processPath -match '(?i)\\WindowsApps\\OpenAI\.Codex_') {
        throw "A Codex package process does not match a validated install: PID $processId"
      }
      continue
    }
    if ($matches.Count -ne 1) {
      throw "A Codex process matches more than one validated install: PID $processId"
    }
    $install = $matches[0]

    $processHandle = $null
    try {
      $processHandle = Get-Process -Id $processId -ErrorAction Stop
      $startTime = $processHandle.StartTime.ToUniversalTime().ToFileTimeUtc()
    } catch {
      throw "A Codex process creation time could not be inspected safely: PID $processId"
    } finally {
      if ($null -ne $processHandle) { $processHandle.Dispose() }
    }
    $liveProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction Stop
    if ($null -eq $liveProcess) {
      throw "A Codex process exited while its automatic restart identity was captured: PID $processId"
    }
    $livePath = Get-DreamSkinProcessExecutablePath -ProcessInfo $liveProcess
    if (-not $livePath -or
      -not (Test-DreamSkinPathEqual -Left $livePath -Right "$($install.Executable)")) {
      throw "A Codex process identity changed while it was captured: PID $processId"
    }
    $confirmHandle = $null
    try {
      $confirmHandle = Get-Process -Id $processId -ErrorAction Stop
      $confirmedStartTime = $confirmHandle.StartTime.ToUniversalTime().ToFileTimeUtc()
    } catch {
      throw "A Codex process exited while its creation time was confirmed: PID $processId"
    } finally {
      if ($null -ne $confirmHandle) { $confirmHandle.Dispose() }
    }
    if ($confirmedStartTime -ne $startTime) {
      throw "A Codex PID was reused while its automatic restart identity was captured: PID $processId"
    }

    $registeredProcesses += $liveProcess
    $targets += [pscustomobject][ordered]@{
      processId = $processId
      sessionId = $processSessionId
      startTimeFileTimeUtc = $startTime
      executablePath = [System.IO.Path]::GetFullPath("$($install.Executable)")
      packageFullName = "$($install.PackageFullName)"
      packageFamilyName = "$($install.PackageFamilyName)"
    }
  }
  return [pscustomobject]@{
    Processes = @($registeredProcesses | Sort-Object ProcessId)
    TargetProcesses = @(
      ConvertTo-DreamSkinAutoRestartTargetProcesses -TargetProcesses $targets -AllowEmpty
    )
  }
}

function Assert-DreamSkinAutoRestartControlClear {
  param([Parameter(Mandatory = $true)][string]$StateRoot)

  $fullStateRoot = [System.IO.Path]::GetFullPath($StateRoot)
  $stopPath = Join-Path $fullStateRoot 'auto-launch.stop'
  $pausePath = Join-Path $fullStateRoot 'paused'
  Assert-DreamSkinNoReparseComponents -Path $stopPath
  Assert-DreamSkinNoReparseComponents -Path $pausePath
  if (Test-Path -LiteralPath $stopPath) {
    throw 'Automatic Dream Skin launch was disabled before restart authorization.'
  }
  if (Test-Path -LiteralPath $pausePath) {
    throw 'Dream Skin was paused before automatic restart authorization.'
  }
}

function Assert-DreamSkinAutoRestartReservation {
  param(
    [Parameter(Mandatory = $true)][string]$StateRoot,
    [Parameter(Mandatory = $true)][string]$Token,
    [Parameter(Mandatory = $true)][string]$ExpectedScriptPath
  )
  if ($Token -cnotmatch '^[0-9a-f]{32}$') {
    throw 'The automatic restart reservation token is invalid.'
  }
  $fullStateRoot = [System.IO.Path]::GetFullPath($StateRoot)
  $statePath = Join-Path $fullStateRoot 'auto-launch-state.json'
  Assert-DreamSkinAutoRestartControlClear -StateRoot $fullStateRoot
  if (-not (Test-Path -LiteralPath $statePath -PathType Leaf)) {
    throw 'The automatic restart reservation is missing.'
  }
  $stateItem = Get-Item -LiteralPath $statePath -Force -ErrorAction Stop
  if (($stateItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0 -or
    $stateItem.Length -le 0 -or $stateItem.Length -gt 65536) {
    throw 'The automatic restart reservation file is unsafe or invalid.'
  }
  try {
    $reservation = (Read-DreamSkinUtf8File -Path $statePath) | ConvertFrom-Json -ErrorAction Stop
  } catch {
    throw 'The automatic restart reservation is unreadable.'
  }
  $required = @(
    'schemaVersion', 'platform', 'pid', 'startedAt', 'scriptPath', 'phase',
    'attemptToken', 'targetProcesses'
  )
  foreach ($field in $required) {
    if ($reservation.PSObject.Properties.Name -notcontains $field -or -not "$($reservation.$field)") {
      throw "The automatic restart reservation is missing: $field"
    }
  }
  if ([int]$reservation.schemaVersion -ne 1 -or "$($reservation.platform)" -cne 'windows' -or
    "$($reservation.phase)" -cne 'restart-reserved' -or
    "$($reservation.attemptToken)" -cne $Token) {
    throw 'The automatic restart reservation is stale or has the wrong state.'
  }
  $expectedScript = [System.IO.Path]::GetFullPath($ExpectedScriptPath)
  if (-not (Test-DreamSkinPathEqual -Left "$($reservation.scriptPath)" -Right $expectedScript)) {
    throw 'The automatic restart reservation points to an unexpected monitor script.'
  }
  $monitorPid = 0
  if (-not [int]::TryParse("$($reservation.pid)", [ref]$monitorPid) -or $monitorPid -le 0) {
    throw 'The automatic restart monitor PID is invalid.'
  }
  $monitor = Get-Process -Id $monitorPid -ErrorAction SilentlyContinue
  if ($null -eq $monitor) { throw 'The automatic restart monitor is no longer running.' }
  $startedAt = $monitor.StartTime.ToUniversalTime().ToString('o')
  if ($startedAt -cne "$($reservation.startedAt)") {
    throw 'The automatic restart monitor identity no longer matches its reservation.'
  }
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $monitorPid" -ErrorAction Stop
  $powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
  $processPath = Get-DreamSkinProcessExecutablePath -ProcessInfo $processInfo
  if (-not (Test-DreamSkinPathEqual -Left $processPath -Right $powershellPath) -or
    -not (Test-DreamSkinCommandLineToken -CommandLine "$($processInfo.CommandLine)" -Token $expectedScript)) {
    throw 'The automatic restart monitor process identity is not trusted.'
  }
  $targetProcesses = @(
    ConvertTo-DreamSkinAutoRestartTargetProcesses `
      -TargetProcesses @($reservation.targetProcesses)
  )
  $targetSessionIds = @($targetProcesses | ForEach-Object { [int]$_.sessionId } |
    Sort-Object -Unique)
  $monitorSessionId = [int]$monitor.SessionId
  $processInfoSessionId = -1
  $currentProcess = Get-Process -Id $PID -ErrorAction Stop
  try { $currentSessionId = [int]$currentProcess.SessionId } finally { $currentProcess.Dispose() }
  if (-not [int]::TryParse("$($processInfo.SessionId)", [ref]$processInfoSessionId) -or
    $targetSessionIds.Count -ne 1 -or
    [int]$targetSessionIds[0] -ne $monitorSessionId -or
    $processInfoSessionId -ne $monitorSessionId -or
    $currentSessionId -ne $monitorSessionId) {
    throw 'The automatic restart reservation does not belong to this Windows session.'
  }
  return [pscustomobject]@{
    State = $reservation
    TargetProcesses = $targetProcesses
    SessionId = $monitorSessionId
  }
}

function Invoke-DreamSkinAutoRestartStockRecovery {
  param(
    [Parameter(Mandatory = $true)][string]$StateRoot,
    [Parameter(Mandatory = $true)][object]$Codex,
    [Parameter(Mandatory = $true)]
    [ValidateRange(0, 2147483647)][int]$ExpectedSessionId,
    [Parameter(Mandatory = $true)][string]$FailureMessage
  )

  try {
    Assert-DreamSkinAutoRestartControlClear -StateRoot $StateRoot
    $snapshot = Get-DreamSkinRegisteredCodexProcessSnapshot `
      -RegisteredInstalls @(Get-DreamSkinRegisteredCodexInstalls) `
      -ExpectedSessionId $ExpectedSessionId
  } catch {
    throw "$FailureMessage Automatic stock recovery was not attempted because the reserved session could not be verified as empty: $($_.Exception.Message)"
  }
  if (@($snapshot.TargetProcesses).Count -ne 0) {
    throw "$FailureMessage Automatic stock recovery preserved the newly observed same-session Codex process set."
  }
  try {
    $null = Start-DreamSkinCodex -Codex $Codex
  } catch {
    throw "$FailureMessage Automatic stock recovery could not reopen Codex: $($_.Exception.Message)"
  }
  throw "$FailureMessage Codex was reopened without Dream Skin; the automatic handoff remains failed."
}

function ConvertTo-DreamSkinProcessArgument {
  param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Value)
  if ($Value.Contains('"')) { throw 'Process arguments containing a double quote are not supported.' }
  if ($Value.Length -eq 0) { return '""' }
  if ($Value -notmatch '\s') { return $Value }
  $escaped = [regex]::Replace($Value, '(\\+)$', '$1$1')
  return '"' + $escaped + '"'
}

function ConvertTo-DreamSkinArgumentLine {
  param([AllowEmptyCollection()][string[]]$Arguments = @())
  return (($Arguments | ForEach-Object { ConvertTo-DreamSkinProcessArgument -Value $_ }) -join ' ')
}

function Get-DreamSkinProcessExecutablePath {
  param([Parameter(Mandatory = $true)][object]$ProcessInfo)
  if ($ProcessInfo.ExecutablePath) { return "$($ProcessInfo.ExecutablePath)" }
  try {
    $process = Get-Process -Id ([int]$ProcessInfo.ProcessId) -ErrorAction Stop
    if ($process.Path) { return "$($process.Path)" }
    return "$($process.MainModule.FileName)"
  } catch {
    return $null
  }
}

# Windows PowerShell 5.1 promotes redirected native-command stderr lines to
# ErrorRecords; while $ErrorActionPreference is 'Stop' the first stderr line
# becomes a terminating NativeCommandError before the exit code can be read.
# Run the command with the preference relaxed and report output + exit code.
function Invoke-DreamSkinNative {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [string[]]$ArgumentList = @(),
    [switch]$DiscardStderr
  )
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    if ($DiscardStderr) {
      $nativeOutput = @(& $FilePath @ArgumentList 2>$null)
    } else {
      $nativeOutput = @(& $FilePath @ArgumentList 2>&1)
    }
    $exitCode = $LASTEXITCODE
    $output = @($nativeOutput | ForEach-Object { "$_" })
    return [pscustomobject]@{ Output = $output; ExitCode = $exitCode }
  } finally {
    $ErrorActionPreference = $previousPreference
  }
}

function ConvertFrom-DreamSkinUtf8Base64 {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Value
  )
  try {
    $bytes = [Convert]::FromBase64String($Value.Trim())
    return ([System.Text.UTF8Encoding]::new($false, $true)).GetString($bytes)
  } catch {
    throw 'The native UTF-8 probe returned invalid data.'
  }
}

function Import-DreamSkinPowerShellSecurityModule {
  $command = Get-Command Get-AuthenticodeSignature -CommandType Cmdlet -ErrorAction SilentlyContinue
  if ($command) { return }
  try {
    Import-Module Microsoft.PowerShell.Security -ErrorAction Stop
  } catch {
    $modulePath = Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Security\Microsoft.PowerShell.Security.psd1'
    if (-not (Test-Path -LiteralPath $modulePath -PathType Leaf)) {
      throw "PowerShell security module is unavailable: $($_.Exception.Message)"
    }
    Import-Module $modulePath -ErrorAction Stop
  }
  $command = Get-Command Get-AuthenticodeSignature -CommandType Cmdlet -ErrorAction SilentlyContinue
  if (-not $command) {
    throw 'PowerShell security module loaded, but Get-AuthenticodeSignature is unavailable.'
  }
}

function Assert-DreamSkinTrustedNodeImage {
  param([Parameter(Mandatory = $true)][string]$Path)

  # Runs BEFORE the binary is ever executed. Get-DreamSkinValidatedNodeRuntime
  # learns the version by running `node -p`, so any authenticity check placed
  # after that point would already have executed attacker-controlled code.
  Import-DreamSkinPowerShellSecurityModule
  $signature = Get-AuthenticodeSignature -LiteralPath $Path -ErrorAction Stop
  if ("$($signature.Status)" -ine 'Valid') {
    throw "The Node.js runtime is not validly signed: $Path ($($signature.Status))."
  }
  $subject = "$($signature.SignerCertificate.Subject)"
  # Publisher names observed on official Node.js builds. The subject is echoed
  # in the failure so an unexpected-but-legitimate publisher can be identified
  # and added deliberately, rather than the check being loosened blindly.
  if ($subject -notmatch '(?i)O=("?)(OpenJS Foundation|Node\.js Foundation|Microsoft Corporation|GitHub, Inc\.)') {
    throw "The Node.js runtime is signed by an unexpected publisher: $subject"
  }
}

function Get-DreamSkinValidatedNodeRuntime {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [int]$MinimumMajor = 22
  )
  $candidate = [System.IO.Path]::GetFullPath($Path)
  if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
    throw "Node.js runtime does not exist: $candidate"
  }
  Assert-DreamSkinTrustedNodeImage -Path $candidate
  $versionProbe = Invoke-DreamSkinNative -FilePath $candidate -ArgumentList @('-p', 'process.versions.node') -DiscardStderr
  $version = ($versionProbe.Output -join '').Trim()
  if ($versionProbe.ExitCode -ne 0 -or -not $version) { throw 'The Node.js runtime could not be validated.' }
  # Windows PowerShell 5.1 decodes redirected native stdout through the active
  # console code page. Node writes UTF-8, so a non-ASCII temporary path can be
  # corrupted before Test-Path sees it. Keep the transport ASCII-only and
  # decode the original UTF-8 bytes explicitly; never fall back to the
  # candidate when the identity probe is invalid.
  $pathProbe = Invoke-DreamSkinNative -FilePath $candidate -ArgumentList @(
    '-e', "process.stdout.write(Buffer.from(process.execPath, 'utf8').toString('base64'))"
  ) -DiscardStderr
  $encodedRuntimePath = ($pathProbe.Output -join '').Trim()
  $runtimePath = ''
  if ($pathProbe.ExitCode -eq 0 -and $encodedRuntimePath) {
    try {
      $runtimePath = ConvertFrom-DreamSkinUtf8Base64 -Value $encodedRuntimePath
    } catch {
      $runtimePath = ''
    }
  }
  $runtimePathExists = $false
  if ($runtimePath) {
    try { $runtimePathExists = Test-Path -LiteralPath $runtimePath -PathType Leaf } catch {}
  }
  if ($pathProbe.ExitCode -ne 0 -or -not $runtimePath -or -not $runtimePathExists) {
    $reason = 'path-not-found'
    if ($pathProbe.ExitCode -ne 0) { $reason = 'probe-exit' }
    elseif (-not $encodedRuntimePath) { $reason = 'empty-output' }
    elseif (-not $runtimePath) { $reason = 'invalid-output' }
    throw "The Node.js executable path could not be validated ($reason)."
  }
  $major = 0
  if (-not [int]::TryParse(($version -split '\.')[0], [ref]$major) -or $major -lt $MinimumMajor) {
    throw "Node.js $MinimumMajor or newer is required; found $version at $runtimePath."
  }
  return [pscustomobject]@{ Path = $runtimePath; Version = $version; Major = $major }
}

function Get-DreamSkinNodeRuntime {
  param([int]$MinimumMajor = 22)

  # The runtime that runs Safe CSS validation, theme-package validation, image
  # metadata limits and the injector must not be redirectable: anyone able to
  # write HKCU\Environment (no admin needed) could otherwise point every
  # validator at their own node.exe and bypass all of them at once. So there is
  # no environment-variable override -- macOS pins the same way, see
  # require_signed_node_runtime in macos/scripts/common-macos.sh.
  #
  # An installed engine always ships runtime\node\node.exe and must use it. The
  # repository source tree has no bundled copy (the installer downloads it), so
  # running the suite from source falls back to PATH -- but that candidate goes
  # through the exact same Authenticode gate, so a hostile node.exe on PATH is
  # rejected before it is ever executed.
  $runtimeRoot = Split-Path -Parent $PSScriptRoot
  $bundledNode = Join-Path $runtimeRoot 'runtime\node\node.exe'
  if (Test-Path -LiteralPath $bundledNode -PathType Leaf) {
    return Get-DreamSkinValidatedNodeRuntime -Path $bundledNode -MinimumMajor $MinimumMajor
  }

  $command = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $command) { $command = Get-Command node -ErrorAction SilentlyContinue }
  if (-not $command) {
    throw "The bundled Node.js runtime is missing ($bundledNode) and Node.js $MinimumMajor or newer was not found in PATH."
  }
  return Get-DreamSkinValidatedNodeRuntime -Path $command.Source -MinimumMajor $MinimumMajor
}

function ConvertTo-DreamSkinCodexInstall {
  param(
    [Parameter(Mandatory = $true)][object]$Package,
    [AllowNull()][object]$Manifest
  )
  if ("$($Package.Name)" -ine 'OpenAI.Codex' -or -not $Package.InstallLocation -or
    -not $Package.PackageFullName -or -not $Package.PackageFamilyName -or
    "$($Package.SignatureKind)" -ine 'Store' -or [bool]$Package.IsDevelopmentMode) {
    return $null
  }
  $packageRoot = "$($Package.InstallLocation)"
  $executable = Join-Path $packageRoot 'app\ChatGPT.exe'
  if (-not (Test-Path -LiteralPath $executable)) { return $null }
  try {
    if (-not $PSBoundParameters.ContainsKey('Manifest')) {
      $Manifest = Get-AppxPackageManifest -Package $Package -ErrorAction Stop
    }
    $applications = @($Manifest.Package.Applications.Application | Where-Object {
      "$($_.Executable)".Replace('/', '\') -ieq 'app\ChatGPT.exe'
    })
    if ($applications.Count -ne 1) { return $null }
    $applicationId = "$($applications[0].Id)"
  } catch {
    return $null
  }
  $packageFamilyName = "$($Package.PackageFamilyName)"
  if ($packageFamilyName -cnotmatch '^[A-Za-z0-9._-]{1,128}$' -or
    $applicationId -cnotmatch '^[A-Za-z0-9._-]{1,64}$') {
    return $null
  }
  return [pscustomobject]@{
    PackageRoot = $packageRoot
    Executable = $executable
    Version = "$($Package.Version)"
    PackageFullName = "$($Package.PackageFullName)"
    PackageFamilyName = $packageFamilyName
    ApplicationId = $applicationId
    AppUserModelId = "$packageFamilyName!$applicationId"
    SignatureKind = "$($Package.SignatureKind)"
  }
}

function Get-DreamSkinRegisteredCodexInstalls {
  $packages = @(Get-AppxPackage -Name 'OpenAI.Codex' -ErrorAction Stop | Sort-Object Version -Descending)
  $installs = @()
  foreach ($package in $packages) {
    $install = ConvertTo-DreamSkinCodexInstall -Package $package
    if ($null -ne $install) { $installs += $install }
  }
  return $installs
}

function Get-DreamSkinCodexInstall {
  $installs = @(Get-DreamSkinRegisteredCodexInstalls)
  if ($installs.Count -eq 0) { throw 'The official OpenAI.Codex Store package is not installed or its identity cannot be validated.' }
  return $installs[0]
}

function Initialize-DreamSkinPackageLauncher {
  if ('CodexDreamSkin.PackageLauncher' -as [type]) { return }
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

namespace CodexDreamSkin {
  [Flags]
  internal enum ActivateOptions : uint {
    None = 0
  }

  [ComImport]
  [Guid("2e941141-7f97-4756-ba1d-9decde894a3d")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  internal interface IApplicationActivationManager {
    [PreserveSig]
    int ActivateApplication(
      [MarshalAs(UnmanagedType.LPWStr)] string appUserModelId,
      [MarshalAs(UnmanagedType.LPWStr)] string arguments,
      ActivateOptions options,
      out uint processId);
  }

  [ComImport]
  [Guid("45ba127d-10a8-46ea-8ab7-56ea9078943c")]
  internal class ApplicationActivationManager {}

  public static class PackageLauncher {
    public static uint Launch(string appUserModelId, string arguments) {
      var manager = (IApplicationActivationManager)new ApplicationActivationManager();
      try {
        uint processId;
        int result = manager.ActivateApplication(
          appUserModelId,
          arguments ?? string.Empty,
          ActivateOptions.None,
          out processId);
        Marshal.ThrowExceptionForHR(result);
        return processId;
      } finally {
        if (Marshal.IsComObject(manager)) Marshal.FinalReleaseComObject(manager);
      }
    }
  }
}
'@
}

function Start-DreamSkinCodex {
  param(
    [Parameter(Mandatory = $true)][object]$Codex,
    [AllowEmptyCollection()][string[]]$Arguments = @()
  )
  $appUserModelId = "$($Codex.AppUserModelId)"
  if ($appUserModelId -cnotmatch '^[A-Za-z0-9._-]{1,128}![A-Za-z0-9._-]{1,64}$') {
    throw 'The registered Codex AppUserModelId is unavailable or invalid.'
  }
  Initialize-DreamSkinPackageLauncher
  $argumentLine = ConvertTo-DreamSkinArgumentLine -Arguments $Arguments
  $processId = [CodexDreamSkin.PackageLauncher]::Launch($appUserModelId, $argumentLine)
  if ($processId -le 0) { throw 'Windows did not return a Codex process ID after package activation.' }
  return $processId
}

function Assert-DreamSkinCodexDirectLaunchTarget {
  param([Parameter(Mandatory = $true)][object]$Codex)
  $expectedExecutable = if ($Codex.PackageRoot) {
    Join-Path "$($Codex.PackageRoot)" 'app\ChatGPT.exe'
  } else {
    $null
  }
  $expectedAppUserModelId = if ($Codex.PackageFamilyName -and $Codex.ApplicationId) {
    "$($Codex.PackageFamilyName)!$($Codex.ApplicationId)"
  } else {
    $null
  }
  if ("$($Codex.SignatureKind)" -ine 'Store' -or -not $Codex.PackageFullName -or
    -not $expectedExecutable -or -not $expectedAppUserModelId -or
    "$($Codex.AppUserModelId)" -cne $expectedAppUserModelId -or
    -not (Test-DreamSkinPathEqual -Left "$($Codex.Executable)" -Right $expectedExecutable) -or
    -not (Test-Path -LiteralPath $expectedExecutable -PathType Leaf)) {
    throw 'Direct launch requires the exact executable from the validated OpenAI.Codex Store package.'
  }
}

function Start-DreamSkinCodexDirect {
  param(
    [Parameter(Mandatory = $true)][object]$Codex,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]]$Arguments
  )
  Assert-DreamSkinCodexDirectLaunchTarget -Codex $Codex
  $argumentLine = ConvertTo-DreamSkinArgumentLine -Arguments $Arguments
  $process = Start-Process -FilePath "$($Codex.Executable)" -ArgumentList $argumentLine `
    -PassThru -ErrorAction Stop
  try {
    if ($process.Id -le 0) { throw 'Windows did not return a Codex process ID after direct launch.' }
    return $process.Id
  } finally {
    $process.Dispose()
  }
}

function Get-DreamSkinDirectLaunchFailureKind {
  param([Parameter(Mandatory = $true)][System.Exception]$Exception)
  $current = $Exception
  while ($null -ne $current) {
    if ($current -is [System.UnauthorizedAccessException] -or
      ($current -is [System.ComponentModel.Win32Exception] -and $current.NativeErrorCode -eq 5) -or
      $current.HResult -eq -2147024891) {
      return 'access-denied'
    }
    $current = $current.InnerException
  }
  return 'start-failed'
}

function Wait-DreamSkinCodexDebugArgumentStatus {
  param(
    [Parameter(Mandatory = $true)][object]$Codex,
    [Parameter(Mandatory = $true)][int]$Port,
    [int]$TimeoutSeconds = 5,
    [ValidateRange(0, 2147483647)][int]$ExpectedSessionId
  )
  $processArguments = @{ Codex = $Codex }
  if ($PSBoundParameters.ContainsKey('ExpectedSessionId')) {
    $processArguments.ExpectedSessionId = $ExpectedSessionId
  }
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastStatus = 'uninspectable'
  do {
    $processes = @(Get-DreamSkinCodexProcesses @processArguments)
    $lastStatus = Get-DreamSkinCodexDebugArgumentStatus -Processes $processes -Port $Port
    if ($lastStatus -in @('forwarded', 'protocol-redirected')) { return $lastStatus }
    if ((Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
  } while ((Get-Date) -lt $deadline)
  return $lastStatus
}

function Start-DreamSkinCodexForDebugging {
  param(
    [Parameter(Mandatory = $true)][object]$Codex,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]]$Arguments,
    [Parameter(Mandatory = $true)][int]$Port,
    [AllowEmptyCollection()][int[]]$PreserveProcessIds
  )
  $preservedProcessIds = if ($PSBoundParameters.ContainsKey('PreserveProcessIds')) {
    @($PreserveProcessIds)
  } else {
    @(Get-DreamSkinCodexProcesses -Codex $Codex | ForEach-Object { [int]$_.ProcessId })
  }
  $packageProcessId = Start-DreamSkinCodex -Codex $Codex -Arguments $Arguments
  $packageStatus = Wait-DreamSkinCodexDebugArgumentStatus -Codex $Codex -Port $Port
  if ($packageStatus -ne 'protocol-redirected') {
    return [pscustomobject]@{
      ProcessId = $packageProcessId
      Strategy = 'package-activation'
      ArgumentStatus = $packageStatus
      PackageArgumentStatus = $packageStatus
    }
  }

  try {
    Stop-DreamSkinCodex -Codex $Codex -PreserveProcessIds $preservedProcessIds -AllowForce
  } catch {
    throw (New-DreamSkinStartException -Category 'cdp-launch-failed' `
      -Message 'Codex package activation did not retain the CDP arguments, and its process could not be closed safely.' `
      -InnerException $_.Exception)
  }

  try {
    $directProcessId = Start-DreamSkinCodexDirect -Codex $Codex -Arguments $Arguments
  } catch {
    $failureKind = Get-DreamSkinDirectLaunchFailureKind -Exception $_.Exception
    $category = if ($failureKind -ceq 'access-denied') {
      'cdp-direct-access-denied'
    } else {
      'cdp-launch-failed'
    }
    throw (New-DreamSkinStartException -Category $category `
      -Message "Codex $($Codex.Version) converted the CDP argument into a codex:// navigation path. Direct launch of the validated Store executable failed ($failureKind), so this Codex/Windows combination cannot expose the Dream Skin debugging endpoint without modifying the protected app package." `
      -InnerException $_.Exception)
  }

  $directStatus = Wait-DreamSkinCodexDebugArgumentStatus -Codex $Codex -Port $Port
  if ($directStatus -in @('protocol-redirected', 'not-forwarded')) {
    try {
      Stop-DreamSkinCodex -Codex $Codex -PreserveProcessIds $preservedProcessIds -AllowForce
    } catch {
      throw (New-DreamSkinStartException -Category 'cdp-endpoint-unavailable' `
        -Message 'Direct Codex launch did not retain the CDP arguments and could not be closed safely.' `
        -InnerException $_.Exception)
    }
    throw (New-DreamSkinStartException -Category 'cdp-endpoint-unavailable' `
      -Message "Codex $($Codex.Version) did not retain the CDP argument during package activation or validated direct launch. Dream Skin cannot run without modifying the protected app package." `
      -InnerException $null)
  }

  return [pscustomobject]@{
    ProcessId = $directProcessId
    Strategy = 'direct-store-executable'
    ArgumentStatus = $directStatus
    PackageArgumentStatus = $packageStatus
  }
}

function Get-DreamSkinCodexStatePathCandidate {
  param([AllowNull()][object]$State)
  if ($null -eq $State -or -not $State.codexExe -or -not $State.codexPackageRoot) { return $null }
  $executable = "$($State.codexExe)"
  $packageRoot = "$($State.codexPackageRoot)"
  $expectedExecutable = Join-Path $packageRoot 'app\ChatGPT.exe'
  if (-not (Test-DreamSkinPathEqual -Left $executable -Right $expectedExecutable)) { return $null }
  return [pscustomobject]@{
    PackageRoot = $packageRoot
    Executable = $executable
    Version = "$($State.codexVersion)"
    FromState = $true
    RegisteredPackageVerified = $false
  }
}

function Resolve-DreamSkinCodexInstallFromState {
  param(
    [AllowNull()][object]$State,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]]$RegisteredInstalls
  )
  $candidate = Get-DreamSkinCodexStatePathCandidate -State $State
  if ($null -eq $candidate) { return $null }

  $hasFullName = [bool]$State.codexPackageFullName
  $hasFamilyName = [bool]$State.codexPackageFamilyName
  if ($hasFullName -xor $hasFamilyName) { return $null }
  foreach ($install in $RegisteredInstalls) {
    $pathMatches = (Test-DreamSkinPathEqual -Left $candidate.PackageRoot -Right $install.PackageRoot) -and
      (Test-DreamSkinPathEqual -Left $candidate.Executable -Right $install.Executable)
    if (-not $pathMatches) { continue }
    if ($hasFullName -and ("$($State.codexPackageFullName)" -ine $install.PackageFullName -or
      "$($State.codexPackageFamilyName)" -ine $install.PackageFamilyName)) {
      continue
    }
    return [pscustomobject]@{
      PackageRoot = $install.PackageRoot
      Executable = $install.Executable
      Version = $install.Version
      PackageFullName = $install.PackageFullName
      PackageFamilyName = $install.PackageFamilyName
      ApplicationId = $install.ApplicationId
      AppUserModelId = $install.AppUserModelId
      SignatureKind = $install.SignatureKind
      FromState = $true
      RegisteredPackageVerified = $true
    }
  }
  return $null
}

function Get-DreamSkinCodexInstallFromState {
  param([AllowNull()][object]$State)
  try { $installs = @(Get-DreamSkinRegisteredCodexInstalls) } catch { return $null }
  return Resolve-DreamSkinCodexInstallFromState -State $State -RegisteredInstalls $installs
}

function Test-DreamSkinWebSocketUrl {
  param([string]$Value, [int]$Port)
  try {
    $uri = [Uri]$Value
    $hostName = $uri.Host.ToLowerInvariant()
    return ($uri.IsAbsoluteUri -and $uri.Scheme -eq 'ws' -and $uri.Port -eq $Port -and
      $hostName -in @('127.0.0.1', 'localhost', '::1', '[::1]') -and -not $uri.UserInfo -and
      -not $uri.Query -and -not $uri.Fragment -and
      $uri.AbsolutePath -cmatch '^/devtools/(?:page|browser)/[A-Za-z0-9._-]{1,200}$')
  } catch {
    return $false
  }
}

function Get-DreamSkinUrlSearchParameterValue {
  param([Parameter(Mandatory)][Uri]$Uri, [Parameter(Mandatory)][string]$Name)

  $query = $Uri.Query
  if ([string]::IsNullOrEmpty($query)) { return $null }
  if ($query.StartsWith('?')) { $query = $query.Substring(1) }

  # Match URLSearchParams.get(): split the raw query before percent-decoding,
  # decode each name/value independently, compare names case-sensitively, and
  # return the first matching value when a parameter is repeated.
  foreach ($rawParameter in $query.Split([char]'&')) {
    $separatorIndex = $rawParameter.IndexOf('=')
    if ($separatorIndex -ge 0) {
      $rawName = $rawParameter.Substring(0, $separatorIndex)
      $rawValue = $rawParameter.Substring($separatorIndex + 1)
    } else {
      $rawName = $rawParameter
      $rawValue = ''
    }
    $decodedName = [Uri]::UnescapeDataString($rawName.Replace('+', ' '))
    if ($decodedName -ceq $Name) {
      return [Uri]::UnescapeDataString($rawValue.Replace('+', ' '))
    }
  }
  return $null
}

function Test-DreamSkinCdpPageTarget {
  param([AllowNull()][object]$Target, [int]$Port)
  if ($null -eq $Target -or "$($Target.type)" -cne 'page' -or
    "$($Target.url)" -notlike 'app://*') {
    return $false
  }
  try {
    $targetUrl = [Uri]"$($Target.url)"
    $initialRoute = Get-DreamSkinUrlSearchParameterValue -Uri $targetUrl -Name 'initialRoute'
    if ($targetUrl.Scheme -cne 'app' -or
      $initialRoute -ceq '/avatar-overlay') {
      return $false
    }
  } catch {
    return $false
  }
  if ($Target.id -isnot [string]) { return $false }
  $targetId = "$($Target.id)"
  $webSocketUrl = "$($Target.webSocketDebuggerUrl)"
  if (-not (Test-DreamSkinBrowserId -Value $targetId) -or
    -not (Test-DreamSkinWebSocketUrl -Value $webSocketUrl -Port $Port)) {
    return $false
  }
  try {
    return ([Uri]$webSocketUrl).AbsolutePath -ceq "/devtools/page/$targetId"
  } catch {
    return $false
  }
}

function Get-DreamSkinCdpTargets {
  param([int]$Port)
  try {
    $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/list" -TimeoutSec 2 `
      -MaximumRedirection 0 -ErrorAction Stop
    return @($targets | Where-Object { Test-DreamSkinCdpPageTarget -Target $_ -Port $Port })
  } catch {
    return @()
  }
}

function Test-DreamSkinBrowserId {
  param([string]$Value)
  return [bool]($Value -and $Value.Length -le 200 -and $Value -cmatch '^[A-Za-z0-9._-]+$')
}

function Get-DreamSkinCdpBrowserIdentity {
  param([int]$Port)
  try {
    $version = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/version" -TimeoutSec 2 `
      -MaximumRedirection 0 -ErrorAction Stop
    $webSocketUrl = "$($version.webSocketDebuggerUrl)"
    if (-not (Test-DreamSkinWebSocketUrl -Value $webSocketUrl -Port $Port)) { return $null }
    $uri = [Uri]$webSocketUrl
    $match = [regex]::Match($uri.AbsolutePath, '^/devtools/browser/(?<id>[A-Za-z0-9._-]{1,200})$')
    if (-not $match.Success -or $uri.Query -or $uri.Fragment) { return $null }
    $browserId = $match.Groups['id'].Value
    if (-not (Test-DreamSkinBrowserId -Value $browserId)) { return $null }
    return [pscustomobject]@{
      BrowserId = $browserId
      WebSocketDebuggerUrl = $webSocketUrl
      Browser = "$($version.Browser)"
    }
  } catch {
    return $null
  }
}

function Get-DreamSkinPortListeners {
  param([int]$Port)
  if (-not (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)) {
    throw 'Get-NetTCPConnection is required to verify CDP listener ownership.'
  }
  return @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Test-DreamSkinListenerOwnerAlive {
  param([Parameter(Mandatory = $true)][object]$Listener)
  $ownerProcessId = [int]$Listener.OwningProcess
  if ($ownerProcessId -le 0) { return $false }
  return $null -ne (Get-CimInstance Win32_Process `
    -Filter "ProcessId = $ownerProcessId" -ErrorAction SilentlyContinue)
}

function Resolve-DreamSkinStartPort {
  param(
    [Parameter(Mandatory = $true)][int]$Port,
    [Parameter(Mandatory = $true)][bool]$PortExplicit
  )
  if (Test-DreamSkinPortAvailable -Port $Port) { return $Port }

  $listeners = @(Get-DreamSkinPortListeners -Port $Port)
  $staleListeners = @($listeners | Where-Object {
    -not (Test-DreamSkinListenerOwnerAlive -Listener $_)
  })
  if ($PortExplicit -and $staleListeners.Count -lt $listeners.Count) {
    throw "Port $Port is already occupied by an unverified listener. Choose another port."
  }
  if ($PortExplicit -and $staleListeners.Count -gt 0) {
    Write-Warning "Port $Port is held by a stale listener whose owning process no longer exists; selecting another port."
  }
  return Select-DreamSkinPort -PreferredPort $Port
}

function Test-DreamSkinPortAvailable {
  param([int]$Port)
  return @(Get-DreamSkinPortListeners -Port $Port).Count -eq 0
}

function Test-DreamSkinCodexPortOwner {
  param(
    [int]$Port,
    [Parameter(Mandatory = $true)][object]$Codex,
    [ValidateRange(0, 2147483647)][int]$ExpectedSessionId
  )
  $enforceSession = $PSBoundParameters.ContainsKey('ExpectedSessionId')
  $listeners = @(Get-DreamSkinPortListeners -Port $Port)
  if ($listeners.Count -eq 0) { return $false }
  foreach ($listener in $listeners) {
    if ($listener.LocalAddress -notin @('127.0.0.1', '::1')) { return $false }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$listener.OwningProcess)" -ErrorAction SilentlyContinue
    $processPath = if ($process) { Get-DreamSkinProcessExecutablePath -ProcessInfo $process } else { $null }
    $ownerSessionId = -1
    if ($enforceSession -and
      (-not [int]::TryParse("$($process.SessionId)", [ref]$ownerSessionId) -or
        $ownerSessionId -ne $ExpectedSessionId)) {
      return $false
    }
    if (-not $processPath -or -not (Test-DreamSkinPathEqual -Left $processPath -Right $Codex.Executable)) {
      return $false
    }
  }
  return $true
}

function Get-DreamSkinVerifiedCdpIdentity {
  param(
    [int]$Port,
    [Parameter(Mandatory = $true)][object]$Codex,
    [ValidateRange(0, 2147483647)][int]$ExpectedSessionId
  )
  $ownerArguments = @{ Port = $Port; Codex = $Codex }
  if ($PSBoundParameters.ContainsKey('ExpectedSessionId')) {
    $ownerArguments.ExpectedSessionId = $ExpectedSessionId
  }
  if (-not (Test-DreamSkinCodexPortOwner @ownerArguments)) { return $null }
  $browser = Get-DreamSkinCdpBrowserIdentity -Port $Port
  if ($null -eq $browser) { return $null }
  $targets = Get-DreamSkinCdpTargets -Port $Port
  if ($targets.Count -eq 0) { return $null }
  if (-not (Test-DreamSkinCodexPortOwner @ownerArguments)) { return $null }
  return [pscustomobject]@{
    BrowserId = $browser.BrowserId
    BrowserWebSocketDebuggerUrl = $browser.WebSocketDebuggerUrl
    Browser = $browser.Browser
    TargetCount = $targets.Count
  }
}

function Test-DreamSkinCodexCdpEndpoint {
  param(
    [int]$Port,
    [Parameter(Mandatory = $true)][object]$Codex,
    [ValidateRange(0, 2147483647)][int]$ExpectedSessionId
  )
  $identityArguments = @{ Port = $Port; Codex = $Codex }
  if ($PSBoundParameters.ContainsKey('ExpectedSessionId')) {
    $identityArguments.ExpectedSessionId = $ExpectedSessionId
  }
  return $null -ne (Get-DreamSkinVerifiedCdpIdentity @identityArguments)
}

function Get-DreamSkinVerifiedCdpIdentityForAnyRegistered {
  # A Store auto-update replaces the "current" package directory while the
  # older version keeps running and owning the verified endpoint.  Accepting
  # any registered OpenAI.Codex install keeps the strict owner validation
  # (every candidate passed the same package identity checks) without
  # restarting a healthy skinned Codex just because the Store updated.
  param(
    [int]$Port,
    [ValidateRange(0, 2147483647)][int]$ExpectedSessionId
  )
  $identityArguments = @{ Port = $Port }
  if ($PSBoundParameters.ContainsKey('ExpectedSessionId')) {
    $identityArguments.ExpectedSessionId = $ExpectedSessionId
  }
  foreach ($install in @(Get-DreamSkinRegisteredCodexInstalls)) {
    $identity = Get-DreamSkinVerifiedCdpIdentity -Codex $install @identityArguments
    if ($null -ne $identity) {
      return [pscustomobject]@{
        Identity = $identity
        Codex = $install
      }
    }
  }
  return $null
}

function Select-DreamSkinPort {
  param([int]$PreferredPort)
  for ($candidate = $PreferredPort; $candidate -le [Math]::Min(65535, $PreferredPort + 100); $candidate++) {
    if (Test-DreamSkinPortAvailable -Port $candidate) { return $candidate }
  }
  throw "No free loopback port was found between $PreferredPort and $([Math]::Min(65535, $PreferredPort + 100))."
}

function Wait-DreamSkinPortAvailable {
  param([int]$Port, [int]$TimeoutSeconds = 5)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    if (Test-DreamSkinPortAvailable -Port $Port) { return $true }
    Start-Sleep -Milliseconds 200
  } while ((Get-Date) -lt $deadline)
  return $false
}

function Read-DreamSkinState {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try {
    $state = (Read-DreamSkinUtf8File -Path $Path) | ConvertFrom-Json -ErrorAction Stop
    if ($null -eq $state -or $state -is [string] -or $state -is [array]) { throw 'State root must be an object.' }
    $properties = @($state.PSObject.Properties.Name)
    if ($properties -contains 'platform' -and "$($state.platform)" -ine 'windows') {
      throw 'State platform is not Windows.'
    }
    $schemaVersion = 1
    if ($properties -contains 'schemaVersion') {
      $schemaVersion = 0
      if (-not [int]::TryParse("$($state.schemaVersion)", [ref]$schemaVersion) -or
        $schemaVersion -lt 1 -or $schemaVersion -gt 3) {
        throw 'State schema is not supported.'
      }
    }
    if ($schemaVersion -ge 3) {
      foreach ($required in @(
        'platform', 'port', 'injectorPid', 'injectorStartedAt', 'injectorPath', 'nodePath',
        'codexExe', 'codexPackageRoot', 'codexPackageFullName', 'codexPackageFamilyName', 'browserId'
      )) {
        if ($properties -notcontains $required -or -not $state.$required) {
          throw "State schema 3 is missing required field: $required"
        }
      }
    }
    if ($properties -contains 'port') {
      $statePort = 0
      if (-not [int]::TryParse("$($state.port)", [ref]$statePort)) { throw 'State port is invalid.' }
      Assert-DreamSkinPort -Port $statePort
    }
    if ($properties -contains 'injectorPid' -and $null -ne $state.injectorPid) {
      $statePid = 0
      if (-not [int]::TryParse("$($state.injectorPid)", [ref]$statePid) -or $statePid -le 0) {
        throw 'State injector PID is invalid.'
      }
    }
    if ($properties -contains 'browserId' -and $state.browserId -and
      -not (Test-DreamSkinBrowserId -Value "$($state.browserId)")) {
      throw 'State browser ID is invalid.'
    }
    if ($properties -contains 'codexSessionId' -and $null -ne $state.codexSessionId) {
      $stateSessionId = -1
      if (-not [int]::TryParse("$($state.codexSessionId)", [ref]$stateSessionId) -or
        $stateSessionId -lt 0) {
        throw 'State Codex Windows session ID is invalid.'
      }
    }
    if ($properties -contains 'codexPid' -or
      $properties -contains 'codexStartTimeFileTimeUtc') {
      $stateCodexPid = 0
      $stateCodexStart = 0L
      if ($properties -notcontains 'codexPid' -or
        $properties -notcontains 'codexStartTimeFileTimeUtc' -or
        -not [int]::TryParse("$($state.codexPid)", [ref]$stateCodexPid) -or
        $stateCodexPid -le 0 -or
        -not [long]::TryParse("$($state.codexStartTimeFileTimeUtc)",
          [ref]$stateCodexStart) -or $stateCodexStart -le 0) {
        throw 'State Codex process identity is invalid.'
      }
    }
    return $state
  } catch {
    throw "Dream Skin state is unreadable; it was preserved for inspection: $Path"
  }
}

function Write-DreamSkinState {
  param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)][object]$State)
  $json = $State | ConvertTo-Json -Depth 6
  Write-DreamSkinUtf8FileAtomically -Path $Path -Content ($json + "`r`n")
}

function Get-DreamSkinRecordedProcessSessionEvidence {
  param(
    [Parameter(Mandatory = $true)][int]$ProcessId,
    [AllowNull()][string]$ExpectedStartedAt,
    [long]$ExpectedStartTimeFileTimeUtc = 0,
    [AllowNull()][string]$ExpectedExecutablePath,
    [AllowEmptyCollection()][string[]]$RequiredCommandLineTokens = @(),
    [Parameter(Mandatory = $true)][string]$Description
  )

  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" `
    -ErrorAction Stop
  if ($null -eq $processInfo) { return $null }
  if (-not $ExpectedStartedAt -and $ExpectedStartTimeFileTimeUtc -le 0) {
    throw "The live recorded $Description has no creation-time identity; state was preserved."
  }
  $process = Get-Process -Id $ProcessId -ErrorAction Stop
  try {
    $actualStartedAt = $process.StartTime.ToUniversalTime().ToString('o')
    $actualStartFileTime = $process.StartTime.ToUniversalTime().ToFileTimeUtc()
  } finally {
    $process.Dispose()
  }
  if (($ExpectedStartedAt -and $actualStartedAt -cne $ExpectedStartedAt) -or
    ($ExpectedStartTimeFileTimeUtc -gt 0 -and
      $actualStartFileTime -ne $ExpectedStartTimeFileTimeUtc)) {
    return $null
  }
  $processPath = Get-DreamSkinProcessExecutablePath -ProcessInfo $processInfo
  if (-not $ExpectedExecutablePath -or -not $processPath -or
    -not (Test-DreamSkinPathEqual -Left $processPath -Right $ExpectedExecutablePath)) {
    throw "The live recorded $Description executable identity is not trusted; state was preserved."
  }
  if (@($RequiredCommandLineTokens).Count -gt 0) {
    $commandLine = "$($processInfo.CommandLine)"
    if (-not $commandLine) {
      throw "The live recorded $Description command line is unreadable; state was preserved."
    }
    foreach ($token in @($RequiredCommandLineTokens)) {
      if (-not $token -or
        -not (Test-DreamSkinCommandLineToken -CommandLine $commandLine -Token $token)) {
        throw "The live recorded $Description command identity is not trusted; state was preserved."
      }
    }
  }
  $sessionId = -1
  if (-not [int]::TryParse("$($processInfo.SessionId)", [ref]$sessionId) -or
    $sessionId -lt 0) {
    throw "The live recorded $Description Windows session cannot be verified; state was preserved."
  }
  return [pscustomobject]@{
    ProcessId = $ProcessId
    SessionId = $sessionId
    Description = $Description
  }
}

function Get-DreamSkinRecordedLegacyCdpSessionEvidence {
  param([Parameter(Mandatory = $true)][object]$State)

  if (-not $State.port -or -not $State.browserId -or -not $State.codexExe) {
    return $null
  }
  $port = 0
  if (-not [int]::TryParse("$($State.port)", [ref]$port)) { return $null }
  Assert-DreamSkinPort -Port $port
  $codex = Get-DreamSkinCodexStatePathCandidate -State $State
  if ($null -eq $codex) {
    throw 'The recorded Codex executable cannot be validated for session ownership.'
  }
  $firstIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $port -Codex $codex
  if ($null -eq $firstIdentity -or
    "$($firstIdentity.BrowserId)" -cne "$($State.browserId)") {
    return $null
  }

  $listeners = @(Get-DreamSkinPortListeners -Port $port)
  if ($listeners.Count -eq 0) {
    throw 'The recorded Codex CDP owner disappeared during session ownership verification.'
  }
  $sessionIds = @()
  $processIds = @()
  foreach ($listener in $listeners) {
    if ($listener.LocalAddress -notin @('127.0.0.1', '::1')) {
      throw 'The recorded Codex CDP owner is not loopback-only.'
    }
    $processId = [int]$listener.OwningProcess
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" `
      -ErrorAction Stop
    $processPath = if ($processInfo) {
      Get-DreamSkinProcessExecutablePath -ProcessInfo $processInfo
    } else {
      $null
    }
    $sessionId = -1
    if (-not $processPath -or
      -not (Test-DreamSkinPathEqual -Left $processPath -Right $codex.Executable) -or
      -not [int]::TryParse("$($processInfo.SessionId)", [ref]$sessionId) -or
      $sessionId -lt 0) {
      throw 'The recorded Codex CDP owner identity changed during session ownership verification.'
    }
    $processIds += $processId
    $sessionIds += $sessionId
  }
  $uniqueSessionIds = @($sessionIds | Sort-Object -Unique)
  $secondIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $port -Codex $codex
  if ($uniqueSessionIds.Count -ne 1 -or $null -eq $secondIdentity -or
    "$($secondIdentity.BrowserId)" -cne "$($firstIdentity.BrowserId)") {
    throw 'The recorded Codex CDP owner was not stable within one Windows session.'
  }
  return [pscustomobject]@{
    ProcessId = [int]$processIds[0]
    SessionId = [int]$uniqueSessionIds[0]
    Description = 'Dream Skin recorded CDP owner'
  }
}

function Get-DreamSkinRecordedStateSessionOwnership {
  param(
    [AllowNull()][object]$State,
    [string]$StateRoot = (Join-Path $env:LOCALAPPDATA 'CodexDreamSkin')
  )
  if ($null -eq $State) {
    return [pscustomobject]@{ IsLive = $false; SessionId = $null; Sources = @() }
  }

  $recordedSessionId = $null
  $sessionProperty = $State.PSObject.Properties['codexSessionId']
  if ($null -ne $sessionProperty -and $null -ne $sessionProperty.Value) {
    $parsedSessionId = -1
    if (-not [int]::TryParse("$($sessionProperty.Value)", [ref]$parsedSessionId) -or
      $parsedSessionId -lt 0) {
      throw 'The recorded Codex Windows session ID is invalid; state was preserved.'
    }
    $recordedSessionId = $parsedSessionId
  }

  $evidence = @()
  $codexPidProperty = $State.PSObject.Properties['codexPid']
  if ($null -ne $codexPidProperty -and $codexPidProperty.Value) {
    $codexPid = 0
    $codexStart = 0L
    if (-not [int]::TryParse("$($codexPidProperty.Value)", [ref]$codexPid) -or
      $codexPid -le 0 -or
      -not [long]::TryParse("$($State.codexStartTimeFileTimeUtc)",
        [ref]$codexStart) -or $codexStart -le 0) {
      throw 'The recorded Codex process identity is invalid; state was preserved.'
    }
    $evidence += @(Get-DreamSkinRecordedProcessSessionEvidence -ProcessId $codexPid `
      -ExpectedStartTimeFileTimeUtc $codexStart `
      -ExpectedExecutablePath "$($State.codexExe)" `
      -Description 'Dream Skin Codex window')
  }
  if ($State.injectorPid) {
    $injectorPid = 0
    if (-not [int]::TryParse("$($State.injectorPid)", [ref]$injectorPid) -or
      $injectorPid -le 0) {
      throw 'The recorded injector PID is invalid; state was preserved.'
    }
    $evidence += @(Get-DreamSkinRecordedProcessSessionEvidence -ProcessId $injectorPid `
      -ExpectedStartedAt "$($State.injectorStartedAt)" `
      -ExpectedExecutablePath "$($State.nodePath)" `
      -RequiredCommandLineTokens @(
        "$($State.injectorPath)", '--watch', "$($State.port)", "$($State.browserId)"
      ) -Description 'Dream Skin injector')
  }

  $monitorProperty = $State.PSObject.Properties['acrylicMonitorPid']
  if ($null -ne $monitorProperty -and $monitorProperty.Value) {
    $monitorPid = 0
    if (-not [int]::TryParse("$($monitorProperty.Value)", [ref]$monitorPid) -or
      $monitorPid -le 0) {
      throw 'The recorded Acrylic monitor PID is invalid; state was preserved.'
    }
    $powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
    $evidence += @(Get-DreamSkinRecordedProcessSessionEvidence -ProcessId $monitorPid `
      -ExpectedStartedAt "$($State.acrylicMonitorStartedAt)" `
      -ExpectedExecutablePath $powershellPath `
      -RequiredCommandLineTokens @(
        "$($State.acrylicMonitorPath)", 'Monitor', "$($State.acrylicTargetPid)",
        "$($State.acrylicTargetStartTimeFileTimeUtc)",
        "$($State.acrylicTargetWindowHandle)", "$($State.acrylicMonitorStopFile)",
        "$($State.acrylicMonitorArmFile)", '-ConfirmTargetIdentity'
      ) -Description 'Dream Skin Acrylic monitor')
  }

  $targetProperty = $State.PSObject.Properties['acrylicTargetPid']
  if ($null -ne $targetProperty -and $targetProperty.Value) {
    $targetPid = 0
    $targetStart = 0L
    if (-not [int]::TryParse("$($targetProperty.Value)", [ref]$targetPid) -or
      $targetPid -le 0 -or
      -not [long]::TryParse("$($State.acrylicTargetStartTimeFileTimeUtc)",
        [ref]$targetStart) -or $targetStart -le 0) {
      throw 'The recorded Acrylic target identity is invalid; state was preserved.'
    }
    $evidence += @(Get-DreamSkinRecordedProcessSessionEvidence -ProcessId $targetPid `
      -ExpectedStartTimeFileTimeUtc $targetStart `
      -ExpectedExecutablePath "$($State.acrylicTargetExecutablePath)" `
      -Description 'Dream Skin Acrylic target')
  }

  $liveEvidence = @($evidence | Where-Object { $null -ne $_ })
  if ($null -eq $codexPidProperty) {
    $legacyCdpEvidence = Get-DreamSkinRecordedLegacyCdpSessionEvidence -State $State
    if ($null -ne $legacyCdpEvidence) {
      $liveEvidence += $legacyCdpEvidence
    }
  }
  if ($liveEvidence.Count -eq 0) {
    $codex = Get-DreamSkinCodexStatePathCandidate -State $State
    if ($null -ne $codex) {
      $matchingCodexProcesses = @()
      foreach ($processInfo in @(Get-CimInstance Win32_Process `
          -Filter "Name = 'ChatGPT.exe'" -ErrorAction Stop)) {
        $processPath = Get-DreamSkinProcessExecutablePath -ProcessInfo $processInfo
        if (-not $processPath) {
          throw 'A live ChatGPT.exe path is unreadable while recorded state ownership is unresolved.'
        }
        if (Test-DreamSkinPathEqual -Left $processPath -Right $codex.Executable) {
          $matchingCodexProcesses += $processInfo
        }
      }
      if ($matchingCodexProcesses.Count -gt 0) {
        throw 'A matching Codex process is still live, but its recorded state session ownership cannot be proven.'
      }
    }
    return [pscustomobject]@{
      IsLive = $false
      SessionId = $recordedSessionId
      Sources = @()
    }
  }
  $liveSessionIds = @($liveEvidence | ForEach-Object { [int]$_.SessionId } |
    Sort-Object -Unique)
  if ($liveSessionIds.Count -ne 1 -or
    ($null -ne $recordedSessionId -and
      [int]$recordedSessionId -ne [int]$liveSessionIds[0])) {
    throw 'The live Dream Skin state has conflicting Windows session ownership; state was preserved.'
  }
  return [pscustomobject]@{
    IsLive = $true
    SessionId = [int]$liveSessionIds[0]
    Sources = @($liveEvidence | ForEach-Object { "$($_.Description):$($_.ProcessId)" })
  }
}

function Archive-DreamSkinStateFile {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $directory = [System.IO.Path]::GetDirectoryName([System.IO.Path]::GetFullPath($Path))
  $stamp = (Get-Date).ToString('yyyyMMdd-HHmmss-fff')
  $archivePath = Join-Path $directory "state.stale-$stamp-$([guid]::NewGuid().ToString('N')).json"
  Move-Item -LiteralPath $Path -Destination $archivePath -ErrorAction Stop
  return $archivePath
}

function Get-DreamSkinProcessStartedAt {
  param([int]$ProcessId)
  try {
    return (Get-Process -Id $ProcessId -ErrorAction Stop).StartTime.ToUniversalTime().ToString('o')
  } catch {
    return $null
  }
}

function Stop-DreamSkinRecordedInjector {
  param([AllowNull()][object]$State)
  if ($null -eq $State -or -not $State.injectorPid) { return $true }
  $processId = [int]$State.injectorPid
  $processHandle = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if (-not $processHandle) { return $true }
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
  if (-not $process) {
    if ($processHandle.HasExited) { return $true }
    throw "The recorded injector PID $processId is running, but its identity cannot be inspected. State was preserved."
  }

  $expectedInjector = if ($State.injectorPath) {
    "$($State.injectorPath)"
  } elseif ($State.skillRoot) {
    Join-Path "$($State.skillRoot)" 'scripts\injector.mjs'
  } else {
    $null
  }
  $processPath = Get-DreamSkinProcessExecutablePath -ProcessInfo $process
  $commandLine = "$($process.CommandLine)"
  if (-not $processPath -or -not $commandLine) {
    throw "The recorded injector PID $processId is running, but its identity cannot be inspected. State was preserved."
  }
  $isNodeExecutable = [System.IO.Path]::GetFileName("$processPath") -ieq 'node.exe'
  $nodeMatches = -not $State.nodePath -or
    (Test-DreamSkinPathEqual -Left $processPath -Right "$($State.nodePath)")
  $injectorMatches = [bool]($expectedInjector -and
    (Test-DreamSkinCommandLineToken -CommandLine $commandLine -Token $expectedInjector) -and
    (Test-DreamSkinCommandLineToken -CommandLine $commandLine -Token '--watch'))
  if ($State.port) {
    $portPattern = '(?i)(?:^|\s)--port(?:=|\s+)' + [regex]::Escape("$($State.port)") + '(?=$|\s)'
    $injectorMatches = $injectorMatches -and [regex]::IsMatch($commandLine, $portPattern)
  } else {
    $injectorMatches = $false
  }
  if ($State.browserId) {
    $browserPattern = '(?:^|\s)(?i:--browser-id)(?:=|\s+)' + [regex]::Escape("$($State.browserId)") + '(?=$|\s)'
    $injectorMatches = $injectorMatches -and [regex]::IsMatch($commandLine, $browserPattern)
  }
  try {
    $startedAt = $processHandle.StartTime.ToUniversalTime().ToString('o')
  } catch {
    if ($processHandle.HasExited) { return $true }
    throw "The recorded injector PID $processId is running, but its start time cannot be inspected. State was preserved."
  }
  $startMatches = -not $State.injectorStartedAt -or $startedAt -eq "$($State.injectorStartedAt)"
  $identityMatches = [bool]($isNodeExecutable -and $nodeMatches -and $injectorMatches -and $startMatches)

  if (-not $identityMatches) {
    throw "The recorded injector PID $processId is running, but its visible identity does not match the saved Dream Skin process. State was preserved."
  }

  Stop-Process -Id $processId -Force -ErrorAction Stop
  # Chromium/Node can retain a terminating process object for slightly longer
  # than the renderer teardown that triggered this cleanup.  Use a bounded
  # native wait before treating the exact, already-verified PID as stuck.
  try { Wait-Process -Id $processId -Timeout 15 -ErrorAction Stop } catch {}
  if (Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue) {
    throw "The recorded Dream Skin injector did not stop: PID $processId"
  }
  return $true
}

function Restore-DreamSkinRecordedAcrylicTarget {
  param(
    [Parameter(Mandatory = $true)][object]$State,
    [string]$StateRoot = (Join-Path $env:LOCALAPPDATA 'CodexDreamSkin')
  )
  $fullStateRoot = [System.IO.Path]::GetFullPath($StateRoot)
  $helper = (Get-DreamSkinRuntimeEnginePaths -StateRoot $fullStateRoot).AcrylicHelper
  if (-not (Test-Path -LiteralPath $helper -PathType Leaf)) {
    throw "The managed Acrylic helper is missing while restoring the native window: $helper"
  }

  $targetPid = 0
  $targetStart = 0L
  $targetWindow = 0L
  if (-not [int]::TryParse("$($State.acrylicTargetPid)", [ref]$targetPid) -or $targetPid -le 0 -or
    -not [long]::TryParse("$($State.acrylicTargetStartTimeFileTimeUtc)", [ref]$targetStart) -or $targetStart -le 0 -or
    -not [long]::TryParse("$($State.acrylicTargetWindowHandle)", [ref]$targetWindow) -or $targetWindow -le 0) {
    throw 'The recorded Acrylic target descriptor is invalid.'
  }

  $targetProcess = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
  if ($null -eq $targetProcess) { return $true }
  try {
    $liveStart = $targetProcess.StartTime.ToUniversalTime().ToFileTimeUtc()
  } catch {
    if ($null -eq (Get-Process -Id $targetPid -ErrorAction SilentlyContinue)) { return $true }
    throw 'The recorded Acrylic target creation time could not be revalidated.'
  } finally {
    if ($null -ne $targetProcess) { $targetProcess.Dispose() }
  }
  # A different process now owns the PID, so the recorded HWND died with the old
  # process and must never be written through the stale descriptor.
  if ($liveStart -ne $targetStart) { return $true }

  $restoreArguments = @{
    Action = 'Restore'
    TargetProcessId = $targetPid
    ExpectedStartTimeFileTimeUtc = $targetStart
    ExpectedExecutablePath = "$($State.acrylicTargetExecutablePath)"
    ExpectedPackageFamilyName = "$($State.acrylicTargetPackageFamilyName)"
    ExpectedWindowClass = "$($State.acrylicTargetWindowClass)"
    ExpectedWindowHandle = $targetWindow
    AllowHiddenTarget = $true
    ConfirmTargetIdentity = $true
  }
  $restore = @(& $helper @restoreArguments)
  if ($restore.Count -ne 1) {
    throw 'The recorded Acrylic target restore did not return one exact result.'
  }
  if ([bool]$restore[0].TargetMissing) { return $true }
  $restoreArguments.Action = 'Probe'
  $restoreArguments.Remove('ConfirmTargetIdentity')
  $probe = @(& $helper @restoreArguments)
  if ($probe.Count -eq 1 -and [bool]$probe[0].TargetMissing) { return $true }
  if ($probe.Count -ne 1 -or [int]$probe[0].CurrentBackdrop -ne 2 -or
    [long]$probe[0].WindowHandleValue -ne $targetWindow) {
    throw 'The recorded Codex HWND did not verify as Mica after Acrylic restoration.'
  }
  return $true
}

function Wait-DreamSkinAcrylicMonitorMutexAvailable {
  param(
    [Parameter(Mandatory = $true)][int]$TargetProcessId,
    [Parameter(Mandatory = $true)][long]$TargetStartTimeFileTimeUtc,
    [int]$TimeoutMilliseconds = 5000,
    [int]$StableMilliseconds = 1000
  )
  $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $name = 'Local\CodexDreamSkin.Acrylic.{0}.{1}.{2}' -f `
    $sid, $TargetProcessId, $TargetStartTimeFileTimeUtc
  $mutex = [System.Threading.Mutex]::new($false, $name)
  $deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMilliseconds)
  $availableSince = $null
  try {
    do {
      $acquired = $false
      try {
        try { $acquired = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] {
          $acquired = $true
        }
        if ($acquired) {
          if ($null -eq $availableSince) { $availableSince = [DateTime]::UtcNow }
          if (([DateTime]::UtcNow - $availableSince).TotalMilliseconds -ge $StableMilliseconds) {
            return $true
          }
        } else {
          $availableSince = $null
        }
      } finally {
        if ($acquired) { $mutex.ReleaseMutex() }
      }
      Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $deadline)
    return $false
  } finally {
    $mutex.Dispose()
  }
}

function Stop-DreamSkinRecordedAcrylicMonitor {
  param(
    [AllowNull()][object]$State,
    [string]$StateRoot = (Join-Path $env:LOCALAPPDATA 'CodexDreamSkin')
  )
  if ($null -eq $State) { return $true }
  $monitorPidProperty = $State.PSObject.Properties['acrylicMonitorPid']
  $monitorPidRecorded = if ($null -ne $monitorPidProperty) { $monitorPidProperty.Value } else { $null }
  $monitorControlRecorded = $false
  foreach ($controlName in @(
    'acrylicMonitorPath', 'acrylicMonitorStopFile', 'acrylicMonitorArmFile'
  )) {
    $controlProperty = $State.PSObject.Properties[$controlName]
    if ($null -ne $controlProperty -and $controlProperty.Value) {
      $monitorControlRecorded = $true
      break
    }
  }
  if (-not $monitorPidRecorded -and -not $monitorControlRecorded) { return $true }
  foreach ($required in @(
    'acrylicMonitorPath', 'acrylicMonitorStopFile', 'acrylicMonitorArmFile',
    'acrylicTargetPid', 'acrylicTargetStartTimeFileTimeUtc',
    'acrylicTargetExecutablePath', 'acrylicTargetPackageFamilyName',
    'acrylicTargetWindowClass', 'acrylicTargetWindowHandle'
  )) {
    if ($State.PSObject.Properties.Name -notcontains $required -or -not "$($State.$required)") {
      throw "Recorded Acrylic monitor state is missing: $required"
    }
  }

  $fullStateRoot = [System.IO.Path]::GetFullPath($StateRoot)
  $expectedHelper = (Get-DreamSkinRuntimeEnginePaths -StateRoot $fullStateRoot).AcrylicHelper
  if (-not (Test-DreamSkinPathEqual -Left "$($State.acrylicMonitorPath)" -Right $expectedHelper)) {
    throw 'The recorded Acrylic monitor script is outside the current managed engine.'
  }
  $stopFile = [System.IO.Path]::GetFullPath("$($State.acrylicMonitorStopFile)")
  $stopParent = [System.IO.Path]::GetDirectoryName($stopFile)
  $stopName = [System.IO.Path]::GetFileName($stopFile)
  if (-not (Test-DreamSkinPathEqual -Left $stopParent -Right $fullStateRoot) -or
    $stopName -cnotmatch '^acrylic-monitor-[a-f0-9]{32}\.stop$') {
    throw 'The recorded Acrylic monitor stop path is not a managed per-session signal.'
  }
  Assert-DreamSkinNoReparseComponents -Path $stopFile
  $armFile = [System.IO.Path]::GetFullPath("$($State.acrylicMonitorArmFile)")
  $armParent = [System.IO.Path]::GetDirectoryName($armFile)
  $armName = [System.IO.Path]::GetFileName($armFile)
  if (-not (Test-DreamSkinPathEqual -Left $armParent -Right $fullStateRoot) -or
    $armName -cnotmatch '^acrylic-monitor-[a-f0-9]{32}\.arm$') {
    throw 'The recorded Acrylic monitor arm path is not a managed per-session signal.'
  }
  Assert-DreamSkinNoReparseComponents -Path $armFile

  $targetPidValue = 0
  $targetStartValue = 0L
  if (-not [int]::TryParse("$($State.acrylicTargetPid)", [ref]$targetPidValue) -or
    $targetPidValue -le 0 -or
    -not [long]::TryParse("$($State.acrylicTargetStartTimeFileTimeUtc)", [ref]$targetStartValue) -or
    $targetStartValue -le 0) {
    throw 'The recorded Acrylic target process identity is invalid.'
  }

  if (-not $monitorPidRecorded) {
    $startupPhaseProperty = $State.PSObject.Properties['startupPhase']
    if ($null -eq $startupPhaseProperty -or
      "$($startupPhaseProperty.Value)" -cne 'acrylic-monitor-spawning') {
      throw 'A PID-less Acrylic monitor record is outside the guarded spawning handoff.'
    }
    # The parent can terminate after spawning the unarmed monitor but before its
    # PID is persisted. Signal that exact pending monitor through the already-
    # recorded stop file and wait until its per-target mutex is stably free.
    if (-not (Test-Path -LiteralPath $stopFile)) {
      Write-DreamSkinUtf8FileAtomically -Path $stopFile `
        -Content ("stopRequestedAt=" + [DateTime]::UtcNow.ToString('o') + "`r`n")
    }
    if (-not (Wait-DreamSkinAcrylicMonitorMutexAvailable `
        -TargetProcessId $targetPidValue `
        -TargetStartTimeFileTimeUtc $targetStartValue)) {
      throw 'An unarmed Acrylic monitor did not release its exact target mutex; recovery signals were preserved.'
    }
    $null = Restore-DreamSkinRecordedAcrylicTarget -State $State -StateRoot $fullStateRoot
    # Keep the unique stop signal: a child already created by Start-Process may
    # still be cold-starting before Add-Type/mutex acquisition. Its eventual
    # first action must continue to be an immediate, non-mutating exit.
    Remove-Item -LiteralPath $armFile -Force -ErrorAction SilentlyContinue
    return $true
  }

  foreach ($required in @('acrylicMonitorPid', 'acrylicMonitorStartedAt')) {
    if ($State.PSObject.Properties.Name -notcontains $required -or -not "$($State.$required)") {
      throw "Recorded Acrylic monitor state is missing: $required"
    }
  }

  $monitorPid = 0
  if (-not [int]::TryParse("$monitorPidRecorded", [ref]$monitorPid) -or $monitorPid -le 0) {
    throw 'The recorded Acrylic monitor PID is invalid.'
  }
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $monitorPid" -ErrorAction SilentlyContinue
  if ($null -eq $processInfo) {
    $null = Restore-DreamSkinRecordedAcrylicTarget -State $State -StateRoot $fullStateRoot
    Remove-Item -LiteralPath $stopFile -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $armFile -Force -ErrorAction SilentlyContinue
    return $true
  }
  $powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
  $processPath = Get-DreamSkinProcessExecutablePath -ProcessInfo $processInfo
  $commandLine = "$($processInfo.CommandLine)"
  $monitorStartedAt = Get-DreamSkinProcessStartedAt -ProcessId $monitorPid
  if ($monitorStartedAt -cne "$($State.acrylicMonitorStartedAt)") {
    # The recorded monitor has exited and this PID belongs to a later process.
    # Never stop the replacement; only reconcile the exact saved Codex HWND.
    $null = Restore-DreamSkinRecordedAcrylicTarget -State $State -StateRoot $fullStateRoot
    Remove-Item -LiteralPath $stopFile -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $armFile -Force -ErrorAction SilentlyContinue
    return $true
  }
  $targetPid = "$($State.acrylicTargetPid)"
  $targetStart = "$($State.acrylicTargetStartTimeFileTimeUtc)"
  $targetWindowHandle = 0L
  if (-not [long]::TryParse("$($State.acrylicTargetWindowHandle)", [ref]$targetWindowHandle) -or
    $targetWindowHandle -le 0) {
    throw 'The recorded Acrylic target HWND is invalid.'
  }
  $targetWindow = "$targetWindowHandle"
  $identityMatches = $processPath -and $commandLine -and
    (Test-DreamSkinPathEqual -Left $processPath -Right $powershellPath) -and
    (Test-DreamSkinCommandLineToken -CommandLine $commandLine -Token $expectedHelper) -and
    (Test-DreamSkinCommandLineToken -CommandLine $commandLine -Token 'Monitor') -and
    (Test-DreamSkinCommandLineToken -CommandLine $commandLine -Token $targetPid) -and
    (Test-DreamSkinCommandLineToken -CommandLine $commandLine -Token $targetStart) -and
    (Test-DreamSkinCommandLineToken -CommandLine $commandLine -Token '-ExpectedWindowHandle') -and
    (Test-DreamSkinCommandLineToken -CommandLine $commandLine -Token $targetWindow) -and
    (Test-DreamSkinCommandLineToken -CommandLine $commandLine -Token $stopFile) -and
    (Test-DreamSkinCommandLineToken -CommandLine $commandLine -Token $armFile) -and
    (Test-DreamSkinCommandLineToken -CommandLine $commandLine -Token '-ConfirmTargetIdentity')
  if (-not $identityMatches) {
    throw "The recorded Acrylic monitor PID $monitorPid does not match its saved managed identity."
  }

  if (-not (Test-Path -LiteralPath $stopFile)) {
    Write-DreamSkinUtf8FileAtomically -Path $stopFile `
      -Content ("stopRequestedAt=" + [DateTime]::UtcNow.ToString('o') + "`r`n")
  }
  $deadline = [DateTime]::UtcNow.AddSeconds(15)
  do {
    if ($null -eq (Get-Process -Id $monitorPid -ErrorAction SilentlyContinue)) { break }
    Start-Sleep -Milliseconds 200
  } while ([DateTime]::UtcNow -lt $deadline)
  $remainingMonitor = Get-Process -Id $monitorPid -ErrorAction SilentlyContinue
  if ($null -ne $remainingMonitor) {
    try {
      if ($remainingMonitor.StartTime.ToUniversalTime().ToString('o') -cne "$($State.acrylicMonitorStartedAt)") {
        $remainingMonitor.Dispose()
        $remainingMonitor = $null
      } else {
        Stop-Process -InputObject $remainingMonitor -Force -ErrorAction Stop
        [void]$remainingMonitor.WaitForExit(5000)
        if (-not $remainingMonitor.HasExited) {
          throw "The recorded Acrylic monitor did not stop: PID $monitorPid"
        }
      }
    } finally {
      if ($null -ne $remainingMonitor) { $remainingMonitor.Dispose() }
    }
  }
  $null = Restore-DreamSkinRecordedAcrylicTarget -State $State -StateRoot $fullStateRoot
  Remove-Item -LiteralPath $stopFile -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $armFile -Force -ErrorAction SilentlyContinue
  return $true
}

function Get-DreamSkinCodexProcesses {
  param(
    [Parameter(Mandatory = $true)][object]$Codex,
    [ValidateRange(0, 2147483647)][int]$ExpectedSessionId
  )
  $enforceSession = $PSBoundParameters.ContainsKey('ExpectedSessionId')
  return @(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $processSessionId = -1
      $sessionMatches = -not $enforceSession -or
        ([int]::TryParse("$($_.SessionId)", [ref]$processSessionId) -and
          $processSessionId -eq $ExpectedSessionId)
      $processPath = Get-DreamSkinProcessExecutablePath -ProcessInfo $_
      $sessionMatches -and
        (Test-DreamSkinPathEqual -Left $processPath -Right $Codex.Executable)
    })
}

function Initialize-DreamSkinWin32WindowProbe {
  if ('CodexDreamSkin.NativeWindowProbeV1' -as [type]) { return }
  Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

namespace CodexDreamSkin {
  public sealed class NativeWindowEvidence {
    public string Handle { get; set; }
    public uint ProcessId { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
  }

  public static class NativeWindowProbeV1 {
    private delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    private struct Rect {
      public int Left;
      public int Top;
      public int Right;
      public int Bottom;
    }

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool IsWindowVisible(IntPtr hwnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool IsIconic(IntPtr hwnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetWindowRect(IntPtr hwnd, out Rect rect);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);

    [DllImport("user32.dll")]
    private static extern IntPtr GetWindow(IntPtr hwnd, uint command);

    [DllImport("user32.dll")]
    private static extern int GetWindowLong(IntPtr hwnd, int index);

    [DllImport("dwmapi.dll")]
    private static extern int DwmGetWindowAttribute(
      IntPtr hwnd,
      int attribute,
      out int value,
      int valueSize);

    public static NativeWindowEvidence[] Find(
      uint[] allowedProcessIds,
      int minimumWidth,
      int minimumHeight) {
      var allowed = new HashSet<uint>(allowedProcessIds ?? Array.Empty<uint>());
      var results = new List<NativeWindowEvidence>();
      if (allowed.Count == 0) return results.ToArray();

      EnumWindows((hwnd, _) => {
        uint processId;
        GetWindowThreadProcessId(hwnd, out processId);
        if (!allowed.Contains(processId) || !IsWindowVisible(hwnd) || IsIconic(hwnd)) return true;
        if (GetWindow(hwnd, 4) != IntPtr.Zero) return true; // GW_OWNER
        if ((GetWindowLong(hwnd, -20) & 0x00000080) != 0) return true; // WS_EX_TOOLWINDOW

        int cloaked;
        if (DwmGetWindowAttribute(hwnd, 14, out cloaked, sizeof(int)) == 0 && cloaked != 0) {
          return true;
        }

        Rect rect;
        if (!GetWindowRect(hwnd, out rect)) return true;
        var width = Math.Max(0, rect.Right - rect.Left);
        var height = Math.Max(0, rect.Bottom - rect.Top);
        if (width < minimumWidth || height < minimumHeight) return true;
        results.Add(new NativeWindowEvidence {
          Handle = unchecked((ulong)hwnd.ToInt64()).ToString(
            System.Globalization.CultureInfo.InvariantCulture),
          ProcessId = processId,
          Width = width,
          Height = height
        });
        return true;
      }, IntPtr.Zero);
      return results.ToArray();
    }
  }
}
'@
}

function Get-DreamSkinWin32WindowEvidence {
  param(
    [Parameter(Mandatory = $true)][object]$Codex,
    [ValidateRange(0, 2147483647)][int]$ExpectedSessionId
  )
  Initialize-DreamSkinWin32WindowProbe
  $processArguments = @{ Codex = $Codex }
  $enforceSession = $PSBoundParameters.ContainsKey('ExpectedSessionId')
  if ($enforceSession) { $processArguments.ExpectedSessionId = $ExpectedSessionId }
  $processes = @(Get-DreamSkinCodexProcesses @processArguments)
  $processIds = @($processes | ForEach-Object { [uint32]$_.ProcessId })
  if ($processIds.Count -eq 0) { return $null }

  $candidates = @([CodexDreamSkin.NativeWindowProbeV1]::Find($processIds, 320, 240) |
    Sort-Object -Property @{ Expression = { [int64]$_.Width * [int64]$_.Height }; Descending = $true })
  foreach ($candidate in $candidates) {
    $current = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$candidate.ProcessId)" `
      -ErrorAction SilentlyContinue
    $currentPath = if ($current) { Get-DreamSkinProcessExecutablePath -ProcessInfo $current } else { $null }
    $currentSessionId = -1
    $sessionRead = [int]::TryParse("$($current.SessionId)", [ref]$currentSessionId)
    $sessionMatches = $sessionRead -and
      (-not $enforceSession -or $currentSessionId -eq $ExpectedSessionId)
    $currentStartTime = 0L
    $currentProcess = Get-Process -Id ([int]$candidate.ProcessId) -ErrorAction SilentlyContinue
    if ($null -ne $currentProcess) {
      try {
        $currentStartTime = $currentProcess.StartTime.ToUniversalTime().ToFileTimeUtc()
      } catch {
        $currentStartTime = 0L
      } finally {
        $currentProcess.Dispose()
      }
    }
    if ($sessionMatches -and $currentPath -and
      $currentStartTime -gt 0 -and
      (Test-DreamSkinPathEqual -Left $currentPath -Right $Codex.Executable)) {
      return [pscustomobject]@{
        Source = 'win32-hwnd'
        ProcessId = [int]$candidate.ProcessId
        SessionId = [int]$currentSessionId
        StartTimeFileTimeUtc = $currentStartTime
        Handle = "$($candidate.Handle)"
        Width = [int]$candidate.Width
        Height = [int]$candidate.Height
      }
    }
  }
  return $null
}

function Wait-DreamSkinWin32WindowEvidence {
  param(
    [Parameter(Mandatory = $true)][object]$Codex,
    [ValidateRange(250, 120000)][int]$TimeoutMilliseconds = 30000,
    [ValidateRange(0, 2147483647)][int]$ExpectedSessionId
  )
  $windowArguments = @{ Codex = $Codex }
  if ($PSBoundParameters.ContainsKey('ExpectedSessionId')) {
    $windowArguments.ExpectedSessionId = $ExpectedSessionId
  }
  $deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMilliseconds)
  do {
    $evidence = Get-DreamSkinWin32WindowEvidence @windowArguments
    if ($null -ne $evidence) { return $evidence }
    Start-Sleep -Milliseconds 200
  } while ([DateTime]::UtcNow -lt $deadline)
  return $null
}

function Get-DreamSkinCodexProcessesExcept {
  param(
    [Parameter(Mandatory = $true)][object]$Codex,
    [AllowEmptyCollection()][int[]]$PreserveProcessIds = @()
  )
  $preserved = @{}
  foreach ($processId in $PreserveProcessIds) {
    if ($processId -gt 0) { $preserved[$processId] = $true }
  }
  return @(
    Get-DreamSkinCodexProcesses -Codex $Codex | Where-Object {
      -not $preserved.ContainsKey([int]$_.ProcessId)
    }
  )
}

function Stop-DreamSkinCodex {
  param(
    [Parameter(Mandatory = $true)][object]$Codex,
    [AllowEmptyCollection()][int[]]$PreserveProcessIds = @(),
    [AllowNull()][object[]]$ExpectedAutoRestartTargets,
    [AllowNull()][string]$AutoRestartStateRoot,
    [switch]$AllowForce
  )
  if ($PSBoundParameters.ContainsKey('ExpectedAutoRestartTargets')) {
    if (@($PreserveProcessIds).Count -gt 0) {
      throw 'An identity-bound automatic restart cannot preserve an unrelated PID set.'
    }
    if (-not $AutoRestartStateRoot) {
      throw 'An identity-bound automatic restart requires its managed state root.'
    }
    $expectedTargets = @(
      ConvertTo-DreamSkinAutoRestartTargetProcesses `
        -TargetProcesses @($ExpectedAutoRestartTargets)
    )
    $expectedSessionIds = @($expectedTargets | ForEach-Object { [int]$_.sessionId } |
      Sort-Object -Unique)
    if ($expectedSessionIds.Count -ne 1) {
      throw 'An identity-bound automatic restart must target exactly one Windows session.'
    }
    $expectedSessionId = [int]$expectedSessionIds[0]
    foreach ($target in $expectedTargets) {
      if (-not (Test-DreamSkinPathEqual -Left "$($target.executablePath)" `
          -Right "$($Codex.Executable)") -or
        "$($target.packageFullName)" -ine "$($Codex.PackageFullName)" -or
        "$($target.packageFamilyName)" -ine "$($Codex.PackageFamilyName)") {
        throw 'The automatic restart target set does not belong to the exact Codex install selected for shutdown.'
      }
    }

    $registeredInstalls = @(Get-DreamSkinRegisteredCodexInstalls)
    $snapshot = Get-DreamSkinRegisteredCodexProcessSnapshot `
      -RegisteredInstalls $registeredInstalls -ExpectedSessionId $expectedSessionId
    if (-not (Test-DreamSkinAutoRestartTargetProcessesEqual `
        -Reserved $expectedTargets -Current @($snapshot.TargetProcesses))) {
      throw 'The automatic restart target process set changed before Codex shutdown; no window was closed.'
    }
    Assert-DreamSkinAutoRestartControlClear -StateRoot $AutoRestartStateRoot

    $expectedByProcessId = @{}
    foreach ($target in $expectedTargets) {
      $expectedByProcessId[[int]$target.processId] = $target
    }
    $closeTargets = @()
    $gracefulCloseSignalled = $false
    try {
      # Acquire and validate every Process object before sending any window
      # close. Closing the browser process can make renderer/GPU siblings exit
      # immediately, which is an allowed subset only after this exact gate.
      foreach ($item in @($snapshot.Processes)) {
        Assert-DreamSkinAutoRestartControlClear -StateRoot $AutoRestartStateRoot
        $processId = [int]$item.ProcessId
        $target = $expectedByProcessId[$processId]
        $processObject = Get-Process -Id $processId -ErrorAction Stop
        if ($processObject.StartTime.ToUniversalTime().ToFileTimeUtc() -ne
          [long]$target.startTimeFileTimeUtc) {
          $processObject.Dispose()
          throw "The automatic restart target PID was reused before close: $processId"
        }
        $closeTargets += [pscustomobject]@{
          Process = $processObject
          Target = $target
        }
      }
      $preCloseSnapshot = Get-DreamSkinRegisteredCodexProcessSnapshot `
        -RegisteredInstalls $registeredInstalls -ExpectedSessionId $expectedSessionId
      if (-not (Test-DreamSkinAutoRestartTargetProcessesEqual `
          -Reserved $expectedTargets -Current @($preCloseSnapshot.TargetProcesses))) {
        throw 'The automatic restart target process set changed at the final close boundary; no window was closed.'
      }

      # Processes without a main window are attempted first. The browser/window
      # process is last, so its successful close may take all siblings down
      # without turning their expected exit into a false startup failure.
      $orderedCloseTargets = @($closeTargets | Sort-Object `
        @{ Expression = { if ([long]$_.Process.MainWindowHandle -eq 0) { 0 } else { 1 } } }, `
        @{ Expression = { [int]$_.Target.processId } })
      foreach ($closeTarget in $orderedCloseTargets) {
        Assert-DreamSkinAutoRestartControlClear -StateRoot $AutoRestartStateRoot
        $processObject = $closeTarget.Process
        if ($processObject.HasExited) {
          if ($gracefulCloseSignalled) { continue }
          throw 'An automatic restart target exited before any verified window close was sent.'
        }
        if ($processObject.StartTime.ToUniversalTime().ToFileTimeUtc() -ne
          [long]$closeTarget.Target.startTimeFileTimeUtc) {
          throw "The automatic restart target PID was reused before close: $($closeTarget.Target.processId)"
        }
        try {
          $signalled = [bool]$processObject.CloseMainWindow()
          $gracefulCloseSignalled = $gracefulCloseSignalled -or $signalled
        } catch {
          if ($processObject.HasExited -and $gracefulCloseSignalled) { continue }
          throw
        }
      }
    } finally {
      foreach ($closeTarget in $closeTargets) {
        if ($null -ne $closeTarget.Process) { $closeTarget.Process.Dispose() }
      }
    }

    $deadline = [DateTime]::UtcNow.AddSeconds(15)
    $remainingSnapshot = $null
    do {
      Assert-DreamSkinAutoRestartControlClear -StateRoot $AutoRestartStateRoot
      try {
        $remainingSnapshot = Get-DreamSkinRegisteredCodexProcessSnapshot `
          -RegisteredInstalls $registeredInstalls -ExpectedSessionId $expectedSessionId
      } catch {
        # A reserved process may disappear between the inventory and identity
        # reads during normal shutdown. Retry, but never treat the failed read
        # as authorization to broaden the target set.
        $remainingSnapshot = $null
        Start-Sleep -Milliseconds 100
        continue
      }
      if (-not (Test-DreamSkinAutoRestartTargetProcessesSubset `
          -Reserved $expectedTargets -Current @($remainingSnapshot.TargetProcesses))) {
        throw 'The Codex process set was replaced or expanded during automatic shutdown; replacement processes were preserved.'
      }
      if (@($remainingSnapshot.TargetProcesses).Count -eq 0) {
        if (-not $gracefulCloseSignalled) {
          throw 'The reserved Codex session exited before a verified graceful close; no replacement was launched.'
        }
        return
      }
      Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $deadline)

    $forceSnapshotDeadline = [DateTime]::UtcNow.AddSeconds(2)
    $remainingSnapshot = $null
    do {
      Assert-DreamSkinAutoRestartControlClear -StateRoot $AutoRestartStateRoot
      try {
        $remainingSnapshot = Get-DreamSkinRegisteredCodexProcessSnapshot `
          -RegisteredInstalls $registeredInstalls -ExpectedSessionId $expectedSessionId
        break
      } catch {
        $remainingSnapshot = $null
        Start-Sleep -Milliseconds 100
      }
    } while ([DateTime]::UtcNow -lt $forceSnapshotDeadline)
    if ($null -eq $remainingSnapshot) {
      throw 'The Codex process set could not be revalidated before the automatic force-stop boundary.'
    }
    if (-not (Test-DreamSkinAutoRestartTargetProcessesSubset `
        -Reserved $expectedTargets -Current @($remainingSnapshot.TargetProcesses))) {
      throw 'The Codex process set was replaced or expanded during automatic shutdown; replacement processes were preserved.'
    }
    if (@($remainingSnapshot.TargetProcesses).Count -eq 0) {
      if (-not $gracefulCloseSignalled) {
        throw 'The reserved Codex session exited before a verified graceful close; no replacement was launched.'
      }
      return
    }
    if (-not $AllowForce) {
      throw 'Codex did not close within 15 seconds. Close it manually or explicitly authorize a forced restart.'
    }

    foreach ($target in @($remainingSnapshot.TargetProcesses)) {
      Assert-DreamSkinAutoRestartControlClear -StateRoot $AutoRestartStateRoot
      $processObject = $null
      try {
        $processObject = Get-Process -Id ([int]$target.processId) -ErrorAction SilentlyContinue
        if ($null -eq $processObject) { continue }
        if ($processObject.StartTime.ToUniversalTime().ToFileTimeUtc() -ne
          [long]$target.startTimeFileTimeUtc) {
          throw "The automatic restart target PID was reused before force-stop: $($target.processId)"
        }
        Stop-Process -InputObject $processObject -Force -ErrorAction Stop
        [void]$processObject.WaitForExit(5000)
      } finally {
        if ($null -ne $processObject) { $processObject.Dispose() }
      }
    }

    $finalDeadline = [DateTime]::UtcNow.AddSeconds(5)
    do {
      Assert-DreamSkinAutoRestartControlClear -StateRoot $AutoRestartStateRoot
      try {
        $finalSnapshot = Get-DreamSkinRegisteredCodexProcessSnapshot `
          -RegisteredInstalls $registeredInstalls -ExpectedSessionId $expectedSessionId
      } catch {
        Start-Sleep -Milliseconds 100
        continue
      }
      if (-not (Test-DreamSkinAutoRestartTargetProcessesSubset `
          -Reserved $expectedTargets -Current @($finalSnapshot.TargetProcesses))) {
        throw 'A replacement Codex process appeared after the bound shutdown; it was preserved.'
      }
      if (@($finalSnapshot.TargetProcesses).Count -eq 0) { return }
      Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $finalDeadline)
    throw 'The identity-bound automatic restart targets could not be stopped safely.'
  }
  if ($PSBoundParameters.ContainsKey('AutoRestartStateRoot')) {
    throw '-AutoRestartStateRoot is only valid with identity-bound automatic restart targets.'
  }

  $processes = Get-DreamSkinCodexProcessesExcept -Codex $Codex -PreserveProcessIds $PreserveProcessIds
  if ($processes.Count -eq 0) { return }
  foreach ($item in $processes) {
    try { [void](Get-Process -Id $item.ProcessId -ErrorAction Stop).CloseMainWindow() } catch {}
  }

  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-DreamSkinCodexProcessesExcept -Codex $Codex `
      -PreserveProcessIds $PreserveProcessIds).Count -gt 0 -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 250
  }
  $remaining = Get-DreamSkinCodexProcessesExcept -Codex $Codex -PreserveProcessIds $PreserveProcessIds
  if ($remaining.Count -eq 0) { return }
  if (-not $AllowForce) {
    throw 'Codex did not close within 15 seconds. Close it manually or explicitly authorize a forced restart.'
  }
  foreach ($item in $remaining) {
    $current = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$item.ProcessId)" -ErrorAction SilentlyContinue
    $currentPath = if ($current) { Get-DreamSkinProcessExecutablePath -ProcessInfo $current } else { $null }
    if ($currentPath -and (Test-DreamSkinPathEqual -Left $currentPath -Right $Codex.Executable)) {
      Stop-Process -Id $item.ProcessId -Force -ErrorAction SilentlyContinue
    }
  }
  Start-Sleep -Milliseconds 500
  if ((Get-DreamSkinCodexProcessesExcept -Codex $Codex `
      -PreserveProcessIds $PreserveProcessIds).Count -gt 0) {
    throw 'Codex could not be stopped safely.'
  }
}

function Confirm-DreamSkinRestart {
  param([string]$Message)
  $shell = New-Object -ComObject WScript.Shell
  return $shell.Popup($Message, 0, 'Codex Dream Skin', 52) -eq 6
}

function Invoke-DreamSkinCodexWindowActivation {
  param([Parameter(Mandatory = $true)][object]$Codex)
  $processes = @(Get-DreamSkinCodexProcesses -Codex $Codex)
  if ($processes.Count -eq 0) { return $false }
  $shell = New-Object -ComObject WScript.Shell
  foreach ($process in $processes) {
    try {
      if ($shell.AppActivate([int]$process.ProcessId)) { return $true }
    } catch {}
  }
  return $false
}
