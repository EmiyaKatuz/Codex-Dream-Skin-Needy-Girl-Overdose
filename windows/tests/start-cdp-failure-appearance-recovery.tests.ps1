[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$Root)

$ErrorActionPreference = 'Stop'
. (Join-Path $Root 'scripts\common-windows.ps1')
. (Join-Path $Root 'scripts\localization-windows.ps1')
# This lifecycle fixture stubs config I/O; never resolve the real user home.
function Resolve-DreamSkinConfigPaths {
  param([string]$StateRoot, [switch]$BindBackup)
  return [pscustomobject]@{
    ConfigPath = (Join-Path $StateRoot 'fixture-config.toml')
    BackupPath = (Join-Path $StateRoot 'fixture-backup.toml')
  }
}
$startPath = Join-Path $Root 'scripts\start-dream-skin.ps1'
$source = [System.IO.File]::ReadAllText($startPath)
$dotSourcePattern = '(?m)^\.\s+\(Join-Path \$PSScriptRoot ''(?:common-windows|theme-windows|localization-windows)\.ps1''\)\r?\n'
if ([regex]::Matches($source, $dotSourcePattern).Count -ne 3) {
  throw 'CDP failure fixture could not isolate the three runtime imports.'
}
$source = [regex]::Replace($source, $dotSourcePattern, '')
$source = $source.Replace(
  '$Injector = Join-Path $PSScriptRoot ''injector.mjs''',
  '$Injector = ''mock-injector.mjs'''
)
$source = $source.Replace(
  '$acrylicHelper = Join-Path $PSScriptRoot ''acrylic-window.ps1''',
  '$acrylicHelper = ''mock-acrylic-window.ps1'''
)
$source = $source.Replace('(Split-Path -Parent $PSScriptRoot)', '''mock-skill-root''')
if ($source.Contains('$PSScriptRoot')) {
  throw 'CDP failure fixture left a real script-root dependency in isolated source.'
}

$script:events = @()
$script:lockExited = $false
$script:installCalls = 0
$script:pendingAppearance = $false
$script:pendingResolveCalls = 0
$script:debugArguments = @()
$script:fixturePackageFullName = 'OpenAI.Codex_fixture'
$script:packageActivationOnly = $false
$script:officialFailurePoint = ''
$script:packageActivated = $false

function Enter-DreamSkinOperationLock { param([int]$TimeoutMilliseconds); return 'mock-lock' }
function Exit-DreamSkinOperationLock {
  param([object]$Mutex)
  if ($Mutex -eq 'mock-lock') { $script:lockExited = $true }
}
function Assert-DreamSkinPort { param([int]$Port) }
function Get-DreamSkinNodeRuntime {
  return [pscustomobject]@{ Path = 'mock-node.exe'; Version = '22.23.1' }
}
function Get-DreamSkinCodexInstall {
  return [pscustomobject]@{
    Executable = 'C:\Program Files\WindowsApps\OpenAI.Codex\app\ChatGPT.exe'
    PackageRoot = 'C:\Program Files\WindowsApps\OpenAI.Codex'
    PackageFullName = $script:fixturePackageFullName
    PackageFamilyName = 'OpenAI.Codex_fixture'
    Version = '26.803.5235.0'
  }
}
function Get-DreamSkinRegisteredCodexInstalls { return Get-DreamSkinCodexInstall }
function Get-DreamSkinRegisteredCodexProcessSnapshot {
  param([object[]]$RegisteredInstalls, [int]$ExpectedSessionId)
  if ($script:packageActivated -and $script:officialFailurePoint -ceq 'inspection') {
    throw 'forced process inspection failure'
  }
  $targets = @(if ($script:officialFailurePoint -ceq 'already-running' -or
    ($script:packageActivated -and $script:officialFailurePoint -cne 'closed')) {
    [pscustomobject]@{ processId = 909; sessionId = $ExpectedSessionId }
  })
  return [pscustomobject]@{ TargetProcesses = $targets }
}
function Get-DreamSkinThemePaths {
  param([string]$StateRoot)
  return [pscustomobject]@{
    Root = $StateRoot
    Active = (Join-Path $StateRoot 'active-theme')
    PauseFile = (Join-Path $StateRoot 'paused')
  }
}
function Ensure-DreamSkinManagedDirectory {
  param([string]$Path, [string]$Root)
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}
function Initialize-DreamSkinThemeStore {
  param([string]$SkillRoot, [string]$StateRoot)
  return Get-DreamSkinThemePaths -StateRoot $StateRoot
}
function Test-DreamSkinPaused { param([string]$StateRoot); return $false }
function Test-DreamSkinPendingAppearanceTransaction {
  param([string]$BackupPath)
  return $script:pendingAppearance
}
function Resolve-DreamSkinPendingAppearanceTransaction {
  param([string]$ConfigPath, [string]$BackupPath)
  $script:pendingResolveCalls += 1
  if ($script:pendingAppearance) { throw 'forced pending appearance recovery failure' }
  return $null
}
function Read-DreamSkinState { param([string]$Path); return $null }
function Get-DreamSkinCodexStatePathCandidate { param([object]$State); return $null }
function Get-DreamSkinCodexInstallFromState { param([object]$State); return $null }
function Get-DreamSkinCodexProcesses { param([object]$Codex); return @() }
function Test-DreamSkinPathEqual { param([string]$Left, [string]$Right); return $true }
function Get-DreamSkinVerifiedCdpIdentity {
  param([int]$Port, [object]$Codex, [int]$ExpectedSessionId, [int]$ExpectedProcessId)
  if ($script:packageActivated -and $script:officialFailurePoint -cin @('state', 'injector', 'window')) {
    if (-not $PSBoundParameters.ContainsKey('ExpectedSessionId') -or $ExpectedProcessId -ne 909) {
      throw 'The official launch did not pin CDP to its activation PID and Windows session.'
    }
    return [pscustomobject]@{ BrowserId = 'fixture-browser' }
  }
  return $null
}
function Get-DreamSkinVerifiedCdpIdentityForAnyRegistered { param([int]$Port); return $null }
function Test-DreamSkinCodexPortOwner {
  param([int]$Port, [object]$Codex, [int]$ExpectedSessionId, [int]$ExpectedProcessId)
  return $PSBoundParameters.ContainsKey('ExpectedSessionId') -and $ExpectedProcessId -eq 909
}
function Wait-DreamSkinWin32WindowEvidence {
  param([object]$Codex, [int]$TimeoutMilliseconds, [int]$ExpectedSessionId)
  return [pscustomobject]@{
    ProcessId = if ($script:officialFailurePoint -ceq 'window') { 910 } else { 909 }
    Handle = 202
    Width = 800
    Height = 600
  }
}
function Stop-DreamSkinRecordedAcrylicMonitor {
  param([object]$State, [string]$StateRoot)
  if ($script:officialFailurePoint -ceq 'state') { throw 'forced state reconciliation failure' }
}
function Stop-DreamSkinRecordedInjector { param([object]$State); return $true }
function Set-DreamSkinPaused { param([bool]$Paused, [string]$StateRoot) }
function Start-Process {
  throw 'forced injector startup failure'
}
function Test-DreamSkinPortAvailable { param([int]$Port); return $true }
function Get-DreamSkinActiveThemeAppearance { param([string]$ThemeDirectory); return 'dark' }
function Install-DreamSkinBaseTheme {
  param(
    [string]$ConfigPath, [string]$BackupPath, [string]$AppearanceTheme,
    [switch]$PassThruTransaction
  )
  $script:installCalls += 1
  return [pscustomobject]@{ SchemaVersion = 1 }
}
function Start-DreamSkinCodexForDebugging {
  param([object]$Codex, [string[]]$Arguments, [int]$Port, [int[]]$PreserveProcessIds,
    [switch]$PackageActivationOnly)
  $script:debugArguments = @($Arguments)
  $script:packageActivationOnly = [bool]$PackageActivationOnly
  $script:packageActivated = $true
  if ($script:officialFailurePoint -cin @('state', 'injector', 'window')) {
    return [pscustomobject]@{ ProcessId = 909; Strategy = 'package-activation' }
  }
  if ($script:forcedCategory) {
    throw (New-DreamSkinStartException -Category $script:forcedCategory `
      -Message 'forced categorized CDP launch failure' -InnerException $null)
  }
  throw 'forced CDP launch failure'
}
function Stop-DreamSkinCodex {
  param([object]$Codex, [int[]]$PreserveProcessIds, [switch]$AllowForce)
  $script:events += 'stop'
}
function Restore-DreamSkinManagedAppearanceSnapshot {
  param([string]$ConfigPath, [string]$BackupPath, [object]$Transaction)
  $script:events += 'restore'
  return [pscustomobject]@{ ConflictedKeys = @(); MarkerStatus = 'restored' }
}
function Complete-DreamSkinAppearanceTransaction { param([string]$BackupPath, [object]$Transaction) }
function Start-DreamSkinCodex {
  param([object]$Codex)
  $script:events += 'start'
  return 909
}
function Write-Host { param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Object) }

$originalLocalAppData = $env:LOCALAPPDATA
$originalDesktopProfile = $env:CODEX_ELECTRON_USER_DATA_PATH
$fixtureStateRoot = Join-Path ([System.IO.Path]::GetTempPath()) `
  ('dreamskin-start-cdp-failure-' + [guid]::NewGuid().ToString('N'))
$env:LOCALAPPDATA = $fixtureStateRoot
$childStateRoot = Join-Path $fixtureStateRoot 'CodexDreamSkin'
$failure = $null
try {
  $startBlock = [scriptblock]::Create($source)
  try { & $startBlock -Port 9335 } catch { $failure = $_ }
  # The isolated profile is needed by older Store builds that expose CDP only
  # with a non-default user data directory.
  $expectedProfile = [System.IO.Path]::GetFullPath((Join-Path $childStateRoot 'cdp-profile'))
  $profileArguments = @($script:debugArguments | Where-Object { $_ -like '--user-data-dir=*' })
  if ($null -eq $failure -or $failure.Exception.Message -cne 'forced CDP launch failure' -or
    $script:installCalls -ne 1 -or ($script:events -join ',') -cne 'stop,restore,start' -or
    -not $script:lockExited -or $script:packageActivationOnly -or $profileArguments.Count -ne 1 -or
    $profileArguments[0] -cne "--user-data-dir=$expectedProfile" -or
    -not (Test-Path -LiteralPath $expectedProfile -PathType Container)) {
    throw 'A failed CDP launch did not close Codex, restore appearance, then reopen normally.'
  }

  $script:fixturePackageFullName = 'OpenAI.Codex_26.1027.3384.0_x64__2p2nqsd0c76g0'
  $env:CODEX_ELECTRON_USER_DATA_PATH = $null
  $explicitProfile = Join-Path $fixtureStateRoot 'explicit profile'
  foreach ($case in @(
    @{ Parameters = @{}; Profile = $expectedProfile },
    @{ Parameters = @{ ProfilePath = $explicitProfile }; Profile = $explicitProfile }
  )) {
    $script:debugArguments = @()
    $launchFailure = $null
    $launchParameters = $case.Parameters
    try { & $startBlock -Port 9335 @launchParameters } catch { $launchFailure = $_ }
    $profileArguments = @($script:debugArguments | Where-Object { $_ -like '--user-data-dir=*' })
    if ($null -eq $launchFailure -or $launchFailure.Exception.Message -cne 'forced CDP launch failure' -or
      $script:packageActivationOnly -or
      ($profileArguments -join ',') -cne "--user-data-dir=$($case.Profile)" -or
      $script:debugArguments -cnotcontains '--remote-debugging-address=127.0.0.1' -or
      $script:debugArguments -cnotcontains '--remote-debugging-port=9335') {
      throw 'The launch did not select the expected Codex profile and activation mode.'
    }
  }

  foreach ($case in @(
    @{ Point = 'closed'; Message = 'forced CDP launch failure'; Recovery = 'restored'; Events = 'restore' },
    @{ Point = 'concurrent-app'; Message = 'forced CDP launch failure'; Recovery = 'blocked'; Events = '' },
    @{ Point = 'inspection'; Message = 'forced CDP launch failure'; Recovery = 'blocked'; Events = '' },
    @{ Point = 'window'; Message = '*window and debugging listener*'; Recovery = 'blocked'; Events = '' },
    @{ Point = 'state'; Message = 'forced state reconciliation failure'; Recovery = 'blocked'; Events = '' },
    @{ Point = 'injector'; Message = 'forced injector startup failure'; Recovery = 'blocked'; Events = '' }
  )) {
    $script:officialFailurePoint = $case.Point
    $script:packageActivated = $false
    $script:events = @()
    $script:debugArguments = @()
    $officialToken = [guid]::NewGuid().ToString('N')
    $officialFailure = $null
    try { & $startBlock -Port 9335 -UseOfficialProfile -ResultToken $officialToken } catch {
      $officialFailure = $_
    }
    $officialResult = Read-DreamSkinStartResult -StateRoot $childStateRoot -Token $officialToken
    if ($null -eq $officialFailure -or $officialFailure.Exception.Message -cnotlike $case.Message -or
      "$($officialResult.outcome)" -cne 'failure' -or
      "$($officialResult.appearanceRecovery)" -cne $case.Recovery -or
      ($script:events -join ',') -cne $case.Events -or -not $script:packageActivationOnly -or
      ($script:debugArguments -join ',') -cne '--remote-debugging-address=127.0.0.1,--remote-debugging-port=9335') {
      throw "Official profile failure '$($case.Point)' did not preserve Codex or the appearance transaction."
    }
    $script:fixturePackageFullName = 'OpenAI.Codex_26.1103.4239.0_x64__2p2nqsd0c76g0'
  }

  foreach ($case in @(
    @{ Point = 'already-running'; Message = 'Quit Codex from its tray menu*' },
    @{ Point = 'override'; Message = '-UseOfficialProfile requires a standalone background launch*' },
    @{ Point = 'unsupported'; Message = 'This Codex Store build has not been verified*' }
  )) {
    $script:officialFailurePoint = $case.Point
    $script:packageActivated = $false
    $script:events = @()
    $script:installCalls = 0
    if ($case.Point -ceq 'override') { $env:CODEX_ELECTRON_USER_DATA_PATH = $explicitProfile }
    if ($case.Point -ceq 'unsupported') { $script:fixturePackageFullName = 'OpenAI.Codex_fixture' }
    $officialFailure = $null
    try { & $startBlock -Port 9335 -UseOfficialProfile } catch { $officialFailure = $_ }
    $env:CODEX_ELECTRON_USER_DATA_PATH = $null
    if ($null -eq $officialFailure -or $officialFailure.Exception.Message -cnotlike $case.Message -or
      $script:packageActivated -or $script:installCalls -ne 0 -or $script:events.Count -ne 0) {
      throw "Official profile did not reject '$($case.Point)' before changing appearance or activating Codex."
    }
  }
  $script:officialFailurePoint = ''
  foreach ($category in @('cdp-direct-access-denied', 'cdp-endpoint-unavailable')) {
    $script:events = @()
    $script:lockExited = $false
    $script:installCalls = 0
    $script:forcedCategory = $category
    $token = [guid]::NewGuid().ToString('N')
    $categorizedFailure = $null
    try { & $startBlock -Port 9335 -ResultToken $token } catch { $categorizedFailure = $_ }
    $childResult = Read-DreamSkinStartResult -StateRoot $childStateRoot -Token $token
    Remove-Item -LiteralPath (
      Get-DreamSkinStartResultPath -StateRoot $childStateRoot -Token $token
    ) -Force
    if ($null -eq $categorizedFailure -or
      "$($childResult.outcome)" -cne 'failure' -or
      "$($childResult.category)" -cne $category -or
      "$($childResult.appearanceRecovery)" -cne 'restored' -or
      $script:installCalls -ne 1 -or ($script:events -join ',') -cne 'stop,restore,start' -or
      -not $script:lockExited) {
      throw "The outer child-result contract lost categorized failure '$category'."
    }
  }

  $script:events = @()
  $script:lockExited = $false
  $script:installCalls = 0
  $script:forcedCategory = $null
  $script:pendingAppearance = $true
  $script:pendingResolveCalls = 0
  $pendingToken = [guid]::NewGuid().ToString('N')
  $pendingFailure = $null
  try { & $startBlock -Port 9335 -ResultToken $pendingToken } catch { $pendingFailure = $_ }
  $pendingResult = Read-DreamSkinStartResult `
    -StateRoot $childStateRoot -Token $pendingToken
  Remove-Item -LiteralPath (
    Get-DreamSkinStartResultPath -StateRoot $childStateRoot -Token $pendingToken
  ) -Force
  if ($null -eq $pendingFailure -or $script:pendingResolveCalls -ne 1 -or
    $script:installCalls -ne 0 -or $script:events.Count -ne 0 -or
    "$($pendingResult.outcome)" -cne 'failure' -or
    "$($pendingResult.category)" -cne 'state-reconciliation-failed' -or
    "$($pendingResult.appearanceRecovery)" -cne 'blocked' -or
    -not $script:lockExited) {
    throw 'An unresolved durable appearance transaction did not block debug launch.'
  }
} finally {
  Remove-Variable -Name forcedCategory -Scope Script -ErrorAction SilentlyContinue
  Remove-Variable -Name debugArguments -Scope Script -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $fixtureStateRoot -Recurse -Force -ErrorAction SilentlyContinue
  $env:LOCALAPPDATA = $originalLocalAppData
  $env:CODEX_ELECTRON_USER_DATA_PATH = $originalDesktopProfile
}

Write-Output 'PASS: failed Windows CDP launch restores appearance and writes exact child categories.'
