[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$Root)

$ErrorActionPreference = 'Stop'
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
$terminalExitPattern = '(?m)^exit 0[ \t]*\r?$'
$terminalExitMatches = [regex]::Matches($source, $terminalExitPattern)
if ($terminalExitMatches.Count -ne 1) {
  throw "Start readiness fixture expected exactly one unindented success trailer, found $($terminalExitMatches.Count)."
}
$source = [regex]::Replace(
  $source,
  $terminalExitPattern,
  '$$script:startupReturned = $$true'
)
if ([regex]::Matches($source, $terminalExitPattern).Count -ne 0 -or
  [regex]::Matches($source, [regex]::Escape('$script:startupReturned = $true')).Count -ne 1) {
  throw 'Start readiness fixture did not replace the production success trailer with exactly one test sentinel.'
}
$dotSourcePattern = '(?m)^\.\s+\(Join-Path \$PSScriptRoot ''(?:common-windows|theme-windows|localization-windows)\.ps1''\)\r?\n'
if ([regex]::Matches($source, $dotSourcePattern).Count -ne 3) {
  throw 'Start readiness fixture could not isolate the three runtime imports.'
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
$source = $source.Replace(
  '(Split-Path -Parent $PSScriptRoot)',
  '''mock-skill-root'''
)
if ($source.Contains('$PSScriptRoot')) {
  throw 'Start readiness fixture left a real script-root dependency in the isolated source.'
}

function New-DreamSkinFixtureDaemon {
  $daemon = [pscustomobject]@{ Id = 4242; HasExited = $false }
  $daemon | Add-Member -MemberType ScriptMethod -Name WaitForExit -Value {
    param([int]$Milliseconds)
    return $this.HasExited
  }
  return $daemon
}

$script:daemon = New-DreamSkinFixtureDaemon
$script:dateCall = 0
$script:dateStepSeconds = 120
$script:verifyCalls = 0
$script:onceCalls = 0
$script:verifyExitCodes = @(2)
$script:verifyAllowedHidden = $false
$script:removeCalls = 0
$script:stateWritten = $false
$script:stateRemoved = $false
$script:daemonStopped = $false
$script:lockExited = $false
$script:startupReturned = $false
$script:hostMessages = @()
$script:cdpReady = $false
$script:appearanceInstallCalls = 0
$script:appearanceRestoreCalls = 0
$script:codexStopped = $false
$script:codexStarted = $false

function Enter-DreamSkinOperationLock {
  param([int]$TimeoutMilliseconds)
  return 'mock-lock'
}
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
    PackageFullName = 'OpenAI.Codex_fixture'
    PackageFamilyName = 'OpenAI.Codex_fixture'
    Version = '26.721.1.0'
  }
}
function Get-DreamSkinThemePaths {
  param([string]$StateRoot)
  return [pscustomobject]@{
    Root = $StateRoot
    Active = (Join-Path $StateRoot 'active-theme')
    PauseFile = (Join-Path $StateRoot 'paused')
  }
}
function Read-DreamSkinWindowEffects {
  param([string]$StateRoot)
  return [pscustomobject]@{ WindowMaterial = 'system' }
}
function Ensure-DreamSkinManagedDirectory { param([string]$Path, [string]$Root) }
function Initialize-DreamSkinThemeStore {
  param([string]$SkillRoot, [string]$StateRoot)
  return Get-DreamSkinThemePaths -StateRoot $StateRoot
}
function Test-DreamSkinPaused { param([string]$StateRoot); return $false }
function Test-DreamSkinPendingAppearanceTransaction { param([string]$BackupPath); return $false }
function Read-DreamSkinState { param([string]$Path); return $null }
function Get-DreamSkinRecordedStateSessionOwnership {
  param([AllowNull()][object]$State, [string]$StateRoot)
  return [pscustomobject]@{ IsLive = $false; SessionId = $null; Sources = @() }
}
function Get-DreamSkinCodexStatePathCandidate { param([object]$State); return $null }
function Get-DreamSkinCodexInstallFromState { param([object]$State); return $null }
function Get-DreamSkinCodexProcesses { param([object]$Codex); return @() }
function Test-DreamSkinPathEqual { param([string]$Left, [string]$Right); return $true }
function Get-DreamSkinVerifiedCdpIdentity {
  param([int]$Port, [object]$Codex)
  if (-not $script:cdpReady) { return $null }
  return [pscustomobject]@{ BrowserId = 'fixture-browser' }
}
function Wait-DreamSkinWin32WindowEvidence {
  param([object]$Codex, [int]$TimeoutMilliseconds)
  return [pscustomobject]@{
    ProcessId = 909
    Handle = '123456'
    Width = 1280
    Height = 800
  }
}
function Get-DreamSkinVerifiedCdpIdentityForAnyRegistered { param([int]$Port); return $null }
function Test-DreamSkinPortAvailable { param([int]$Port); return $true }
function Get-DreamSkinActiveThemeAppearance { param([string]$ThemeDirectory); return 'dark' }
function Install-DreamSkinBaseTheme {
  param(
    [string]$ConfigPath, [string]$BackupPath, [string]$AppearanceTheme,
    [switch]$TransparentWindows,
    [switch]$PassThruTransaction
  )
  $script:appearanceInstallCalls += 1
  return [pscustomobject]@{ SchemaVersion = 1 }
}
function Restore-DreamSkinManagedAppearanceSnapshot {
  param([string]$ConfigPath, [string]$BackupPath, [object]$Transaction)
  $script:appearanceRestoreCalls += 1
  return [pscustomobject]@{ ConflictedKeys = @(); MarkerStatus = 'restored' }
}
function Complete-DreamSkinAppearanceTransaction { param([string]$BackupPath, [object]$Transaction) }
function Start-DreamSkinCodexForDebugging {
  param([object]$Codex, [string[]]$Arguments, [int]$Port, [int[]]$PreserveProcessIds)
  $script:cdpReady = $true
  return [pscustomobject]@{ Strategy = 'package-activation' }
}
function Stop-DreamSkinCodex {
  param([object]$Codex, [int[]]$PreserveProcessIds, [switch]$AllowForce)
  $script:codexStopped = $true
  $script:cdpReady = $false
}
function Start-DreamSkinCodex {
  param([object]$Codex)
  $script:codexStarted = $true
  return 909
}
function Stop-DreamSkinRecordedInjector { param([object]$State); return $true }
function Stop-DreamSkinRecordedAcrylicMonitor {
  param([object]$State, [string]$StateRoot)
  return $true
}
function Set-DreamSkinPaused { param([bool]$Paused, [string]$StateRoot); return $true }
function Invoke-DreamSkinCodexWindowActivation { param([object]$Codex); return $true }
function ConvertTo-DreamSkinProcessArgument { param([string]$Value); return $Value }
function Start-Process {
  [CmdletBinding()]
  param(
    [string]$FilePath,
    [object[]]$ArgumentList,
    [string]$WindowStyle,
    [switch]$PassThru,
    [string]$RedirectStandardOutput,
    [string]$RedirectStandardError
  )
  return $script:daemon
}
function Get-DreamSkinProcessStartedAt { param([int]$ProcessId); return '2026-07-25T00:00:00.0000000Z' }
function Write-DreamSkinState {
  param([string]$Path, [object]$State)
  $script:stateWritten = $true
}
function Invoke-DreamSkinNative {
  param([string]$FilePath, [object[]]$ArgumentList, [switch]$DiscardStderr, [switch]$SeparateStderr)
  if ($ArgumentList -contains '--verify') {
    $script:verifyCalls += 1
    $script:verifyAllowedHidden = $ArgumentList -contains '--allow-hidden-document'
    $verifyIndex = [Math]::Min($script:verifyCalls - 1, $script:verifyExitCodes.Count - 1)
    $verifyExitCode = [int]$script:verifyExitCodes[$verifyIndex]
    return [pscustomobject]@{
      ExitCode = $verifyExitCode
      Output = @($(if ($verifyExitCode -eq 0) { '{"pass":true}' } else { '{"pass":false}' }))
    }
  }
  if ($ArgumentList -contains '--once') {
    $script:onceCalls += 1
    return [pscustomobject]@{ ExitCode = 2; Output = @('{"pass":false}') }
  }
  if ($ArgumentList -contains '--remove') {
    $script:removeCalls += 1
    return [pscustomobject]@{ ExitCode = 0; Output = @() }
  }
  throw 'The startup fixture received an unexpected native command.'
}
function Write-DreamSkinUtf8FileAtomically { param([string]$Path, [string]$Content) }
function Get-Date {
  $script:dateCall += 1
  return [DateTime]::new(2026, 7, 25, 0, 0, 0, [DateTimeKind]::Utc).AddSeconds(
    $script:dateStepSeconds * $script:dateCall
  )
}
function Start-Sleep { param([int]$Milliseconds, [int]$Seconds) }
function Stop-Process {
  [CmdletBinding()]
  param([object]$InputObject, [switch]$Force)
  $InputObject.HasExited = $true
  $script:daemonStopped = $true
}
function Remove-Item {
  [CmdletBinding()]
  param([string]$LiteralPath, [switch]$Force)
  if ([System.IO.Path]::GetFileName($LiteralPath) -ceq 'state.json') {
    $script:stateRemoved = $true
  }
}
function Write-Host {
  param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Object)
  $script:hostMessages += ($Object -join ' ')
}

$originalLocalAppData = $env:LOCALAPPDATA
$env:LOCALAPPDATA = Join-Path ([System.IO.Path]::GetTempPath()) 'dreamskin-start-readiness-fixture'
$failed = $false
$failureMessage = '(startup did not throw)'
try {
  $startBlock = [scriptblock]::Create($source)
  try {
    & $startBlock -Port 9335
  } catch {
    $failureMessage = $_.Exception.Message
    $failed = $_.Exception.Message -like 'Dream Skin verification failed.*'
  }
} finally {
  $env:LOCALAPPDATA = $originalLocalAppData
}

$announcedActive = @($script:hostMessages | Where-Object {
  $_ -like 'Codex Dream Skin is active*'
}).Count -gt 0
if (-not $failed -or $script:verifyCalls -ne 1 -or $script:onceCalls -ne 1 -or
  -not $script:verifyAllowedHidden -or
  $script:removeCalls -ne 0 -or $script:appearanceInstallCalls -ne 1 -or
  $script:appearanceRestoreCalls -ne 1 -or -not $script:codexStopped -or
  -not $script:codexStarted -or
  -not $script:stateWritten -or -not $script:stateRemoved -or
  -not $script:daemonStopped -or -not $script:daemon.HasExited -or
  -not $script:lockExited -or $script:startupReturned -or $announcedActive) {
  $detail = [ordered]@{
    failureMessage = $failureMessage
    failed = $failed
    verifyCalls = $script:verifyCalls
    verifyAllowedHidden = $script:verifyAllowedHidden
    removeCalls = $script:removeCalls
    stateWritten = $script:stateWritten
    stateRemoved = $script:stateRemoved
    daemonStopped = $script:daemonStopped
    daemonHasExited = $script:daemon.HasExited
    lockExited = $script:lockExited
    startupReturned = $script:startupReturned
    announcedActive = $announcedActive
  } | ConvertTo-Json -Compress
  throw "A failed renderer readiness check did not stop startup and run the existing rollback path: $detail"
}

Write-Output 'PASS: renderer readiness failure stops Windows startup and clears transient state.'

$script:daemon = New-DreamSkinFixtureDaemon
$script:dateCall = 0
$script:dateStepSeconds = 15
$script:verifyCalls = 0
$script:onceCalls = 0
$script:verifyExitCodes = @(2, 2, 0)
$script:verifyAllowedHidden = $false
$script:removeCalls = 0
$script:stateWritten = $false
$script:stateRemoved = $false
$script:daemonStopped = $false
$script:lockExited = $false
$script:startupReturned = $false
$script:hostMessages = @()

$successFailureMessage = $null
$originalLocalAppData = $env:LOCALAPPDATA
$env:LOCALAPPDATA = Join-Path ([System.IO.Path]::GetTempPath()) 'dreamskin-start-readiness-fixture'
try {
  try {
    & $startBlock -Port 9335
  } catch {
    $successFailureMessage = $_.Exception.Message
  }
} finally {
  $env:LOCALAPPDATA = $originalLocalAppData
}

$announcedActive = @($script:hostMessages | Where-Object {
  $_ -like 'Codex Dream Skin is active*'
}).Count -gt 0
if ($null -ne $successFailureMessage -or $script:verifyCalls -ne 3 -or
  -not $script:verifyAllowedHidden -or $script:removeCalls -ne 0 -or
  -not $script:stateWritten -or $script:stateRemoved -or
  $script:daemonStopped -or $script:daemon.HasExited -or
  -not $script:lockExited -or -not $script:startupReturned -or -not $announcedActive) {
  $detail = [ordered]@{
    failureMessage = $successFailureMessage
    verifyCalls = $script:verifyCalls
    verifyAllowedHidden = $script:verifyAllowedHidden
    removeCalls = $script:removeCalls
    stateWritten = $script:stateWritten
    stateRemoved = $script:stateRemoved
    daemonStopped = $script:daemonStopped
    daemonHasExited = $script:daemon.HasExited
    lockExited = $script:lockExited
    startupReturned = $script:startupReturned
    announcedActive = $announcedActive
  } | ConvertTo-Json -Compress
  throw "Renderer readiness retries did not keep the watcher alive after the third verification succeeded: $detail"
}

Write-Output 'PASS: renderer readiness retries twice, succeeds on the third check, and keeps the watcher active.'
