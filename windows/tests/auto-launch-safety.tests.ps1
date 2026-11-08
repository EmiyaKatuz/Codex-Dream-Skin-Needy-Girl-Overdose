[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$Root)

$ErrorActionPreference = 'Stop'
$autoPath = Join-Path $Root 'scripts\auto-launch-dream-skin.ps1'
$managerPath = Join-Path $Root 'scripts\manage-auto-launch-dream-skin.ps1'
$startPath = Join-Path $Root 'scripts\start-dream-skin.ps1'
$commonPath = Join-Path $Root 'scripts\common-windows.ps1'
$restorePath = Join-Path $Root 'scripts\restore-dream-skin.ps1'

foreach ($path in @($autoPath, $managerPath, $startPath, $commonPath, $restorePath)) {
  $tokens = $null
  $errors = $null
  [void][Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$errors)
  if ($errors.Count -gt 0) { throw "$path failed to parse: $($errors[0].Message)" }
}

$autoSource = [IO.File]::ReadAllText($autoPath)
$managerSource = [IO.File]::ReadAllText($managerPath)
$startSource = [IO.File]::ReadAllText($startPath)
$commonSource = [IO.File]::ReadAllText($commonPath)
$restoreSource = [IO.File]::ReadAllText($restorePath)

foreach ($forbidden in @('Stop-DreamSkinCodex', 'Stop-Process', 'taskkill', '-RestartExisting')) {
  if ($autoSource.Contains($forbidden)) {
    throw "The automatic watcher directly controls Codex instead of using its guarded handoff: $forbidden"
  }
}
foreach ($required in @(
  'StartupBaselineMilliseconds',
  'StartupBaselineActive $startupBaselineActive',
  'TrustedZeroCount',
  'ZeroStartedAtMilliseconds',
  'StableZeroMilliseconds',
  "Phase 'restart-reserved'",
  '-AutoRestartReservationToken $attemptToken',
  '-RequireUnpaused',
  'auto-launch-state.json',
  'auto-launch.stop',
  '[System.Diagnostics.Stopwatch]::StartNew()',
  'Get-DreamSkinCodexAnyDebugIntentStatus',
  '-CaptureTargetProcesses',
  '$targetProcesses = @($snapshot.TargetProcesses)',
  '-TargetProcesses @($confirmation.TargetProcesses)',
  '[AllowNull()][object[]]$TargetProcesses = @()',
  '__InstanceCreationEvent WITHIN 2',
  '__InstanceDeletionEvent WITHIN 2',
  '[System.Threading.AutoResetEvent]::new($false)',
  'DreamSkinAutoLaunchSessionId',
  'Global\CodexDreamSkin.$sid.AutoLaunch',
  '-MessageData $eventSignal -Action',
  '$eventSignal.WaitOne($waitMilliseconds)',
  'Process events are unavailable; using the bounded polling fallback.'
)) {
  if (-not $autoSource.Contains($required)) { throw "Automatic watcher safety contract is missing: $required" }
}
if ($autoSource.Contains('Wait-Event')) {
  throw 'The watcher must not consume unrelated PowerShell events or process a burst one event at a time.'
}
if ($autoSource.Contains('-Port $Port -AutoRestartStock')) {
  throw 'Automatic handoff pins an explicit port instead of allowing the guarded launcher to select safely.'
}

foreach ($forbidden in @('Stop-Process', 'taskkill', 'Stop-DreamSkinCodex')) {
  if ($managerSource.Contains($forbidden)) {
    throw "The automatic-launch manager may not terminate processes: $forbidden"
  }
}
foreach ($required in @(
  'Codex Dream Skin Auto Launch.lnk',
  '-ExecutionPolicy RemoteSigned',
  'auto-launch-dream-skin.ps1',
  'auto-launch.stop',
  'auto-launch-state.json',
  'did not stop within ten seconds',
  '$shortcutWasManaged',
  '$watcherLaunchAttempted',
  'Rollback also failed',
  '-ProtectCurrentSession cannot arm an already-running watcher'
)) {
  if (-not $managerSource.Contains($required)) { throw "Automatic-launch manager is missing: $required" }
}
$startupArgumentIndex = $managerSource.IndexOf('$StartupArguments =', [StringComparison]::Ordinal)
$shortcutFunctionIndex = $managerSource.IndexOf('function Assert-DreamSkinAutoLaunchControlFile', [StringComparison]::Ordinal)
if ($startupArgumentIndex -lt 0 -or $shortcutFunctionIndex -le $startupArgumentIndex) {
  throw 'The managed Startup argument declaration could not be isolated.'
}
$startupArgumentBlock = $managerSource.Substring(
  $startupArgumentIndex,
  $shortcutFunctionIndex - $startupArgumentIndex
)
if ($startupArgumentBlock.Contains('ProtectCurrentSession')) {
  throw 'The login Startup shortcut must not persist the one-time current-session protection switch.'
}

$autoGuardIndex = $startSource.IndexOf(
  'Assert-DreamSkinAutoRestartReservation -StateRoot $StateRoot', [StringComparison]::Ordinal
)
$debugGuardIndex = $startSource.IndexOf(
  'Get-DreamSkinCodexAnyDebugIntentStatus -Processes $codexProcesses', [StringComparison]::Ordinal
)
$identityGuardIndex = $startSource.IndexOf(
  'Test-DreamSkinAutoRestartTargetProcessesEqual', [StringComparison]::Ordinal
)
$stopIndex = $startSource.IndexOf('Stop-DreamSkinCodex -Codex $codexToStop', [StringComparison]::Ordinal)
if ($autoGuardIndex -lt 0 -or $identityGuardIndex -le $autoGuardIndex -or
  $debugGuardIndex -le $identityGuardIndex -or $stopIndex -le $debugGuardIndex -or
  ([regex]::Matches($startSource, 'Assert-DreamSkinAutoRestartReservation').Count -lt 2)) {
  throw 'The launcher does not revalidate its reservation, exact target set, and debug intent before stopping Codex.'
}
foreach ($required in @(
  '[switch]$AutoRestartStock',
  '[string]$AutoRestartReservationToken',
  "'-AutoRestartStock requires a live auto-launch reservation token.'",
  'Test-DreamSkinPaused -StateRoot $StateRoot',
  '-ExpectedAutoRestartTargets @($autoRestartReservation.TargetProcesses)',
  'Assert-DreamSkinAutoRestartStableZero -StateRoot $StateRoot',
  '$autoRestartExpectedSessionId = [int]$autoRestartReservation.SessionId',
  '$autoSessionParameters = @{ ExpectedSessionId = $autoRestartExpectedSessionId }',
  '-ExpectedSessionId $autoRestartExpectedSessionId',
  'Get-DreamSkinRecordedStateSessionOwnership',
  'A live Dream Skin session in another Windows session owns the shared managed state.',
  'Invoke-DreamSkinAutoRestartStockRecovery -StateRoot $StateRoot',
  'Automatic Dream Skin apply stopped after launch; the launched Codex session was preserved:',
  'codexSessionId = [int]$win32Window.SessionId',
  'codexPid = [int]$win32Window.ProcessId',
  'codexStartTimeFileTimeUtc = [long]$win32Window.StartTimeFileTimeUtc',
  '$directProcessId = Start-DreamSkinCodexDirect -Codex $codex -Arguments $arguments',
  'if ($debugLaunchAttempted -and -not $AutoRestartStock)',
  'Automatic handoff state validation failed; the exact launched Codex processes were preserved.',
  'Automatic handoff startup rollback preserved the exact launched Codex processes.'
)) {
  if (-not $startSource.Contains($required)) { throw "Automatic restart guard is missing: $required" }
}
$stableZeroIndex = $startSource.IndexOf(
  'Assert-DreamSkinAutoRestartStableZero -StateRoot $StateRoot', [StringComparison]::Ordinal
)
$directLaunchIndex = $startSource.IndexOf(
  '$directProcessId = Start-DreamSkinCodexDirect -Codex $codex -Arguments $arguments',
  [StringComparison]::Ordinal
)
$genericDebugLaunchIndex = $startSource.IndexOf(
  '$debugLaunch = Start-DreamSkinCodexForDebugging', [StringComparison]::Ordinal
)
if ($stableZeroIndex -lt 0 -or $directLaunchIndex -le $stableZeroIndex -or
  $genericDebugLaunchIndex -le $directLaunchIndex) {
  throw 'Automatic handoff is not stable-zero/direct-first ahead of the ordinary cleanup-capable launch path.'
}
foreach ($required in @(
  'ConvertTo-DreamSkinAutoRestartTargetProcesses',
  'Global\CodexDreamSkin.$sid.Operation',
  'Get-DreamSkinRegisteredCodexProcessSnapshot',
  'Test-DreamSkinAutoRestartTargetProcessesEqual',
  'Test-DreamSkinAutoRestartTargetProcessesSubset',
  "'processId', 'sessionId', 'startTimeFileTimeUtc'",
  '[AllowNull()][object[]]$ExpectedAutoRestartTargets',
  '[AllowNull()][string]$AutoRestartStateRoot',
  '[ValidateRange(0, 2147483647)][int]$ExpectedSessionId',
  '$currentSessionId -ne $monitorSessionId',
  '$processSessionId -eq $ExpectedSessionId',
  '$ownerSessionId -ne $ExpectedSessionId',
  '$currentSessionId -eq $ExpectedSessionId',
  'Assert-DreamSkinAutoRestartControlClear -StateRoot $AutoRestartStateRoot',
  'Stop-Process -InputObject $processObject'
)) {
  if (-not $commonSource.Contains($required)) {
    throw "Automatic restart process-identity binding is missing: $required"
  }
}
if ([regex]::Matches($startSource, 'Invoke-DreamSkinAutoRestartStockRecovery').Count -lt 3 -or
  $startSource.Contains('Automatic Dream Skin restart stopped after the reserved close: $($_.Exception.Message)"' + "`r`n" + '        return') -or
  $startSource.Contains('Automatic Dream Skin activation skipped: $($_.Exception.Message)"' + "`r`n" + '          return')) {
  throw 'A post-close automatic handoff failure can still return success without strong stock recovery.'
}
if (-not $restoreSource.Contains('& $autoLaunchManager -Disable') -or
  $restoreSource.IndexOf('& $autoLaunchManager -Disable', [StringComparison]::Ordinal) -gt
  $restoreSource.IndexOf('Start-DreamSkinCodex -Codex $relaunchCodex', [StringComparison]::Ordinal)) {
  throw 'Restore does not disable automatic relaunch before reopening official Codex.'
}

if (-not (Get-Command Get-DreamSkinCodexAnyDebugIntentStatus -CommandType Function -ErrorAction SilentlyContinue)) {
  . $commonPath
}

# The single per-user state slot is protected across terminal sessions by the
# Global namespace. Every host probes its own engine in an independent process;
# PowerShell Core additionally probes Windows PowerShell when that host exists.
# The cross-edition host is warmed before the parent takes the mutex, and a
# ready-file handshake keeps host startup and lock contention on separate
# budgets. The child embeds only the production lock functions so cold-loading
# the rest of common-windows.ps1 cannot hide the actual mutex contract.
$lockProbeStartupBudgetMilliseconds = 60000
$lockProbeContentionBudgetMilliseconds = 15000
$lockProbeCleanupBudgetMilliseconds = 5000

function Stop-DreamSkinLockProbeProcess {
  param(
    [Parameter(Mandatory = $true)][System.Diagnostics.Process]$Process,
    [Parameter(Mandatory = $true)][string]$Label
  )
  if ($Process.HasExited) { return }
  Stop-Process -InputObject $Process -Force -ErrorAction Stop
  if (-not $Process.WaitForExit($lockProbeCleanupBudgetMilliseconds)) {
    throw "$Label could not be stopped within the bounded cleanup budget."
  }
}

function Invoke-DreamSkinLockProbeWarmup {
  param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string]$Label
  )
  $warmupSource = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes('exit 0'))
  $warmup = $null
  try {
    $warmup = Start-Process -FilePath $Executable `
      -ArgumentList "-NoLogo -NoProfile -NonInteractive -EncodedCommand $warmupSource" `
      -WindowStyle Hidden -PassThru
    if (-not $warmup.WaitForExit($lockProbeStartupBudgetMilliseconds)) {
      Stop-DreamSkinLockProbeProcess -Process $warmup -Label "$Label startup warmup"
      throw "$Label did not prewarm within the host-startup budget."
    }
    if ($warmup.ExitCode -ne 0) {
      throw "$Label startup warmup failed with exit phase code $($warmup.ExitCode)."
    }
  } finally {
    if ($null -ne $warmup) {
      try {
        Stop-DreamSkinLockProbeProcess -Process $warmup -Label "$Label startup warmup"
      } finally {
        $warmup.Dispose()
      }
    }
  }
}

function Invoke-DreamSkinGlobalOperationLockProbe {
  param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string]$Label
  )
  $readyPath = Join-Path ([System.IO.Path]::GetTempPath()) `
    ("dreamskin-operation-lock-ready-$([guid]::NewGuid().ToString('N')).txt")
  $escapedReadyPath = $readyPath.Replace("'", "''")
  $probeTemplate = @'
function Enter-DreamSkinOperationLock {
  param([ValidateRange(0, 300000)][int]$TimeoutMilliseconds = 0)
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

try {
  [System.IO.File]::WriteAllText(
    '__READY_PATH__',
    'ready',
    [System.Text.UTF8Encoding]::new($false)
  )
} catch {
  exit 10
}

try {
  $probe = Enter-DreamSkinOperationLock
  Exit-DreamSkinOperationLock -Mutex $probe
  exit 9
} catch {
  if ($_.Exception.Message -ceq 'Another Codex Dream Skin install, start, restore, or verify operation is already running.') {
    exit 0
  }
  exit 8
}
'@
  $probeSource = $probeTemplate.Replace('__READY_PATH__', $escapedReadyPath)
  $encodedProbe = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($probeSource))
  $lockProbe = $null
  try {
    $lockProbe = Start-Process -FilePath $Executable `
      -ArgumentList "-NoLogo -NoProfile -NonInteractive -EncodedCommand $encodedProbe" `
      -WindowStyle Hidden -PassThru
    $startupDeadline = [DateTime]::UtcNow.AddMilliseconds($lockProbeStartupBudgetMilliseconds)
    $ready = $false
    do {
      if (Test-Path -LiteralPath $readyPath) {
        $ready = $true
        break
      }
      if ($lockProbe.HasExited) {
        $ready = Test-Path -LiteralPath $readyPath
        break
      }
      Start-Sleep -Milliseconds 50
    } while ([DateTime]::UtcNow -lt $startupDeadline)

    if (-not $ready) {
      $startupExitCode = if ($lockProbe.HasExited) { "$($lockProbe.ExitCode)" } else { 'running' }
      Stop-DreamSkinLockProbeProcess -Process $lockProbe -Label $Label
      throw "$Label failed before the ready phase (exit phase code: $startupExitCode)."
    }
    if (-not $lockProbe.WaitForExit($lockProbeContentionBudgetMilliseconds)) {
      Stop-DreamSkinLockProbeProcess -Process $lockProbe -Label $Label
      throw "$Label reached the ready phase but did not reject contention within the contention budget."
    }
    if ($lockProbe.ExitCode -ne 0) {
      $phase = switch ($lockProbe.ExitCode) {
        8 { 'unexpected-exception'; break }
        9 { 'lock-acquired'; break }
        10 { 'ready-signal-failed'; break }
        default { 'unknown'; break }
      }
      throw "$Label did not fail closed on the held Global mutex (exit phase code $($lockProbe.ExitCode): $phase)."
    }
  } finally {
    try {
      if ($null -ne $lockProbe) {
        Stop-DreamSkinLockProbeProcess -Process $lockProbe -Label $Label
      }
    } finally {
      if ($null -ne $lockProbe) { $lockProbe.Dispose() }
      if ([System.IO.File]::Exists($readyPath)) { [System.IO.File]::Delete($readyPath) }
    }
  }
}

$sameEditionCommand = if ($PSVersionTable.PSEdition -ceq 'Core') { 'pwsh.exe' } else { 'powershell.exe' }
$currentHostProcess = [System.Diagnostics.Process]::GetCurrentProcess()
try {
  $sameEditionExecutable = $currentHostProcess.MainModule.FileName
} finally {
  $currentHostProcess.Dispose()
}
$lockProbeHosts = @(
  [pscustomobject]@{
    Executable = $sameEditionExecutable
    Label = "same-edition $sameEditionCommand operation-lock probe"
  }
)
if ($PSVersionTable.PSEdition -ceq 'Core') {
  $windowsPowerShellCommands = @(Get-Command powershell.exe -CommandType Application `
    -ErrorAction SilentlyContinue)
  if ($windowsPowerShellCommands.Count -gt 0) {
    $windowsPowerShellCommand = $windowsPowerShellCommands[0]
    Invoke-DreamSkinLockProbeWarmup -Executable $windowsPowerShellCommand.Source `
      -Label 'cross-edition Windows PowerShell operation-lock probe'
    $lockProbeHosts += [pscustomobject]@{
      Executable = $windowsPowerShellCommand.Source
      Label = 'cross-edition Windows PowerShell operation-lock probe'
    }
  }
}

$heldGlobalOperationLock = Enter-DreamSkinOperationLock -TimeoutMilliseconds 5000
try {
  foreach ($probeHost in $lockProbeHosts) {
    Invoke-DreamSkinGlobalOperationLockProbe -Executable $probeHost.Executable -Label $probeHost.Label
  }
} finally {
  Exit-DreamSkinOperationLock -Mutex $heldGlobalOperationLock
}

$intentCases = @(
  @{ Expected = 'none'; Processes = @() },
  @{ Expected = 'none'; Processes = @([pscustomobject]@{ CommandLine = 'ChatGPT.exe --type=renderer' }) },
  @{ Expected = 'debug-intent'; Processes = @([pscustomobject]@{ CommandLine = 'ChatGPT.exe --remote-debugging-port 9444' }) },
  @{ Expected = 'debug-intent'; Processes = @([pscustomobject]@{ CommandLine = 'codex://x?arg=%252D%252Dremote-debugging-port%253D9444' }) },
  @{ Expected = 'debug-intent'; Processes = @([pscustomobject]@{ CommandLine = 'ChatGPT.exe --remote-debugging-pipe' }) },
  @{ Expected = 'uninspectable'; Processes = @([pscustomobject]@{ CommandLine = $null }) }
)
foreach ($case in $intentCases) {
  $actual = Get-DreamSkinCodexAnyDebugIntentStatus -Processes $case.Processes
  if ($actual -cne $case.Expected) {
    throw "Generic debug-intent classifier returned $actual instead of $($case.Expected)."
  }
}

$baseTargets = @(
  [pscustomobject][ordered]@{
    processId = 4100
    sessionId = 7
    startTimeFileTimeUtc = 133700000000000001L
    executablePath = 'C:\Program Files\WindowsApps\OpenAI.Codex_1.0.0.0_x64__publisher\app\ChatGPT.exe'
    packageFullName = 'OpenAI.Codex_1.0.0.0_x64__publisher'
    packageFamilyName = 'OpenAI.Codex_publisher'
  },
  [pscustomobject][ordered]@{
    processId = 4101
    sessionId = 7
    startTimeFileTimeUtc = 133700000000000002L
    executablePath = 'C:\Program Files\WindowsApps\OpenAI.Codex_1.0.0.0_x64__publisher\app\ChatGPT.exe'
    packageFullName = 'OpenAI.Codex_1.0.0.0_x64__publisher'
    packageFamilyName = 'OpenAI.Codex_publisher'
  }
)
$reorderedTargets = @($baseTargets[1], $baseTargets[0])
if (-not (Test-DreamSkinAutoRestartTargetProcessesEqual `
    -Reserved $baseTargets -Current $reorderedTargets)) {
  throw 'An exact automatic restart target set should compare equal regardless of input order.'
}

$missingTarget = @($baseTargets[0])
if (Test-DreamSkinAutoRestartTargetProcessesEqual -Reserved $baseTargets -Current $missingTarget) {
  throw 'A missing automatic restart target must fail the pre-close exact comparison.'
}
if (-not (Test-DreamSkinAutoRestartTargetProcessesSubset `
    -Reserved $baseTargets -Current $missingTarget)) {
  throw 'A reserved process that exits during shutdown must remain an allowed subset.'
}

$additionalTarget = @($baseTargets) + @([pscustomobject][ordered]@{
  processId = 4102
  sessionId = $baseTargets[0].sessionId
  startTimeFileTimeUtc = 133700000000000003L
  executablePath = $baseTargets[0].executablePath
  packageFullName = $baseTargets[0].packageFullName
  packageFamilyName = $baseTargets[0].packageFamilyName
})
if ((Test-DreamSkinAutoRestartTargetProcessesEqual `
    -Reserved $baseTargets -Current $additionalTarget) -or
  (Test-DreamSkinAutoRestartTargetProcessesSubset `
    -Reserved $baseTargets -Current $additionalTarget)) {
  throw 'An additional Codex process must never inherit the reserved shutdown authorization.'
}

$replacementTarget = @(
  [pscustomobject][ordered]@{
    processId = $baseTargets[0].processId
    sessionId = $baseTargets[0].sessionId
    startTimeFileTimeUtc = ([long]$baseTargets[0].startTimeFileTimeUtc + 1L)
    executablePath = $baseTargets[0].executablePath
    packageFullName = $baseTargets[0].packageFullName
    packageFamilyName = $baseTargets[0].packageFamilyName
  },
  $baseTargets[1]
)
if ((Test-DreamSkinAutoRestartTargetProcessesEqual `
    -Reserved $baseTargets -Current $replacementTarget) -or
  (Test-DreamSkinAutoRestartTargetProcessesSubset `
    -Reserved $baseTargets -Current $replacementTarget)) {
  throw 'PID reuse with a different process creation time must fail closed.'
}

$packageReplacement = @(
  [pscustomobject][ordered]@{
    processId = $baseTargets[0].processId
    sessionId = $baseTargets[0].sessionId
    startTimeFileTimeUtc = $baseTargets[0].startTimeFileTimeUtc
    executablePath = $baseTargets[0].executablePath
    packageFullName = 'OpenAI.Codex_2.0.0.0_x64__publisher'
    packageFamilyName = $baseTargets[0].packageFamilyName
  },
  $baseTargets[1]
)
if (Test-DreamSkinAutoRestartTargetProcessesEqual `
    -Reserved $baseTargets -Current $packageReplacement) {
  throw 'A changed package identity must fail the automatic restart target comparison.'
}

$sessionReplacement = @(
  [pscustomobject][ordered]@{
    processId = $baseTargets[0].processId
    sessionId = ([int]$baseTargets[0].sessionId + 1)
    startTimeFileTimeUtc = $baseTargets[0].startTimeFileTimeUtc
    executablePath = $baseTargets[0].executablePath
    packageFullName = $baseTargets[0].packageFullName
    packageFamilyName = $baseTargets[0].packageFamilyName
  },
  $baseTargets[1]
)
if ((Test-DreamSkinAutoRestartTargetProcessesEqual `
    -Reserved $baseTargets -Current $sessionReplacement) -or
  (Test-DreamSkinAutoRestartTargetProcessesSubset `
    -Reserved $baseTargets -Current $sessionReplacement)) {
  throw 'A process from another Windows session must never inherit shutdown authorization.'
}

$duplicateRejected = $false
try {
  $null = ConvertTo-DreamSkinAutoRestartTargetProcesses `
    -TargetProcesses @($baseTargets[0], $baseTargets[0])
} catch { $duplicateRejected = $true }
if (-not $duplicateRejected) { throw 'Duplicate automatic restart target PIDs must be rejected.' }

$malformedRejected = $false
try {
  $null = ConvertTo-DreamSkinAutoRestartTargetProcesses -TargetProcesses @(
    [pscustomobject]@{ processId = 4100; startTimeFileTimeUtc = 1 }
  )
} catch { $malformedRejected = $true }
if (-not $malformedRejected) { throw 'Malformed automatic restart target objects must be rejected.' }

$singletonJson = @(
  ((@($baseTargets[0]) | ConvertTo-Json -Depth 4) | ConvertFrom-Json).PSObject.Copy()
)
if (-not (Test-DreamSkinAutoRestartTargetProcessesEqual `
    -Reserved @($baseTargets[0]) -Current $singletonJson)) {
  throw 'A single target must survive the PowerShell 5.1 JSON singleton round trip.'
}

# Same executable paths can coexist across RDP/Fast User Switching sessions.
# Automatic handoff must never treat another session's process or CDP owner as
# evidence for the reserved session; ordinary manual calls keep their old
# machine-wide behavior when ExpectedSessionId is not supplied.
$crossSessionOriginalPortListeners =
  (Get-Command Get-DreamSkinPortListeners -CommandType Function).ScriptBlock
$script:crossSessionProcesses = @(
  [pscustomobject]@{
    ProcessId = 5100
    SessionId = 7
    ExecutablePath = $baseTargets[0].executablePath
    CommandLine = 'ChatGPT.exe --type=browser'
  },
  [pscustomobject]@{
    ProcessId = 5101
    SessionId = 8
    ExecutablePath = $baseTargets[0].executablePath
    CommandLine = 'ChatGPT.exe --remote-debugging-port=9335'
  }
)
try {
  Set-Item 'function:Get-CimInstance' -Value {
    [CmdletBinding()]
    param([string]$ClassName, [string]$Filter)
    if ($Filter -cmatch "^Name = 'ChatGPT[.]exe'$" ) {
      return @($script:crossSessionProcesses)
    }
    $match = [regex]::Match("$Filter", '^ProcessId = (?<pid>[0-9]+)$')
    if ($match.Success) {
      $processId = [int]$match.Groups['pid'].Value
      return @($script:crossSessionProcesses | Where-Object {
        [int]$_.ProcessId -eq $processId
      })
    }
    return @()
  }
  Set-Item 'function:Get-DreamSkinPortListeners' -Value {
    param($Port)
    return @([pscustomobject]@{ LocalAddress = '127.0.0.1'; OwningProcess = 5101 })
  }

  $syntheticInstall = [pscustomobject]@{ Executable = $baseTargets[0].executablePath }
  $manualProcesses = @(Get-DreamSkinCodexProcesses -Codex $syntheticInstall)
  $reservedProcesses = @(Get-DreamSkinCodexProcesses -Codex $syntheticInstall `
    -ExpectedSessionId 7)
  if ($manualProcesses.Count -ne 2 -or $reservedProcesses.Count -ne 1 -or
    [int]$reservedProcesses[0].SessionId -ne 7) {
    throw 'Session-bound Codex enumeration did not exclude an identical executable in another session.'
  }
  $script:crossSessionProcesses = @($script:crossSessionProcesses | Where-Object {
    [int]$_.SessionId -eq 8
  })
  if (@(Get-DreamSkinCodexProcesses -Codex $syntheticInstall).Count -ne 1 -or
    @(Get-DreamSkinCodexProcesses -Codex $syntheticInstall -ExpectedSessionId 7).Count -ne 0) {
    throw 'Another session would incorrectly suppress same-session stock recovery after a failed handoff.'
  }
  & {
    Set-StrictMode -Version 2.0
    if (-not (Test-DreamSkinCodexPortOwner -Port 9335 -Codex $syntheticInstall) -or
      (Test-DreamSkinCodexPortOwner -Port 9335 -Codex $syntheticInstall `
        -ExpectedSessionId 7) -or
      -not (Test-DreamSkinCodexPortOwner -Port 9335 -Codex $syntheticInstall `
        -ExpectedSessionId 8)) {
      throw 'Session-bound CDP ownership did not reject an identical owner from another session.'
    }
    if (Test-DreamSkinPortAvailable -Port 9335) {
      throw "Another session's rejected CDP owner must still keep its machine-wide port unavailable."
    }
  }
  Set-Item 'function:Get-DreamSkinPortListeners' -Value { param($Port); return @() }
  & {
    Set-StrictMode -Version 2.0
    if ((Test-DreamSkinCodexPortOwner -Port 9335 -Codex $syntheticInstall) -or
      -not (Test-DreamSkinPortAvailable -Port 9335)) {
      throw 'A zero-listener CDP port was not normalized safely under StrictMode.'
    }
  }
} finally {
  Set-Item 'function:Get-DreamSkinPortListeners' -Value $crossSessionOriginalPortListeners
  Remove-Item 'function:Get-CimInstance' -Force -ErrorAction SilentlyContinue
  Remove-Variable -Name crossSessionProcesses -Scope Script -ErrorAction SilentlyContinue
}

# Recovery is authorized only by a successful, all-registered, session-bound
# strong snapshot. Inspection failure or another registered version preserves
# the observed state; exact zero reopens stock but still returns a failed
# handoff status to the watcher.
$recoveryFunctionNames = @(
  'Assert-DreamSkinAutoRestartControlClear',
  'Get-DreamSkinRegisteredCodexInstalls',
  'Get-DreamSkinRegisteredCodexProcessSnapshot',
  'Start-DreamSkinCodex'
)
$recoveryOriginalFunctions = @{}
foreach ($functionName in $recoveryFunctionNames) {
  $recoveryOriginalFunctions[$functionName] =
    (Get-Command $functionName -CommandType Function).ScriptBlock
}
$script:recoveryMode = 'inspection-failure'
$script:recoveryStartCalled = $false
try {
  Set-Item 'function:Assert-DreamSkinAutoRestartControlClear' -Value { param($StateRoot) }
  Set-Item 'function:Get-DreamSkinRegisteredCodexInstalls' -Value {
    return @([pscustomobject]@{ Executable = $baseTargets[0].executablePath })
  }
  Set-Item 'function:Get-DreamSkinRegisteredCodexProcessSnapshot' -Value {
    param($RegisteredInstalls, $ExpectedSessionId)
    if ([int]$ExpectedSessionId -ne 7) { throw 'Synthetic recovery lost its session binding.' }
    if ($script:recoveryMode -ceq 'inspection-failure') {
      throw 'synthetic CIM failure'
    }
    if ($script:recoveryMode -ceq 'other-version') {
      return [pscustomobject]@{
        Processes = @([pscustomobject]@{ ProcessId = 5199 })
        TargetProcesses = @([pscustomobject]@{ processId = 5199 })
      }
    }
    return [pscustomobject]@{ Processes = @(); TargetProcesses = @() }
  }
  Set-Item 'function:Start-DreamSkinCodex' -Value {
    param($Codex)
    $script:recoveryStartCalled = $true
    return 6200
  }
  $syntheticRecoveryInstall = [pscustomobject]@{ Executable = $baseTargets[0].executablePath }

  $recoveryError = $null
  try {
    Invoke-DreamSkinAutoRestartStockRecovery -StateRoot 'C:\SyntheticState' `
      -Codex $syntheticRecoveryInstall -ExpectedSessionId 7 -FailureMessage 'handoff failed.'
  } catch { $recoveryError = $_.Exception.Message }
  if ($script:recoveryStartCalled -or
    $recoveryError -cnotmatch 'could not be verified as empty') {
    throw 'An uninspectable recovery snapshot must fail closed without activating stock Codex.'
  }

  $script:recoveryMode = 'other-version'
  $recoveryError = $null
  try {
    Invoke-DreamSkinAutoRestartStockRecovery -StateRoot 'C:\SyntheticState' `
      -Codex $syntheticRecoveryInstall -ExpectedSessionId 7 -FailureMessage 'handoff failed.'
  } catch { $recoveryError = $_.Exception.Message }
  if ($script:recoveryStartCalled -or
    $recoveryError -cnotmatch 'preserved the newly observed same-session') {
    throw 'A different registered Codex version in the reserved session must suppress stock recovery.'
  }

  $script:recoveryMode = 'exact-zero'
  $recoveryError = $null
  try {
    Invoke-DreamSkinAutoRestartStockRecovery -StateRoot 'C:\SyntheticState' `
      -Codex $syntheticRecoveryInstall -ExpectedSessionId 7 -FailureMessage 'handoff failed.'
  } catch { $recoveryError = $_.Exception.Message }
  if (-not $script:recoveryStartCalled -or
    $recoveryError -cnotmatch 'reopened without Dream Skin; the automatic handoff remains failed') {
    throw 'A verified exact-zero recovery must reopen stock while retaining a nonzero handoff result.'
  }
} finally {
  foreach ($functionName in $recoveryFunctionNames) {
    Set-Item "function:$functionName" -Value $recoveryOriginalFunctions[$functionName]
  }
  Remove-Variable -Name recoveryMode -Scope Script -ErrorAction SilentlyContinue
  Remove-Variable -Name recoveryStartCalled -Scope Script -ErrorAction SilentlyContinue
}

# A live exact injector in another Windows session owns the single per-user
# state slot. The owner is inferred for pre-codexSessionId schema-3 states, so
# the launcher can reject cross-session cleanup before any Codex close.
$script:stateOwnerStart = [DateTime]::Parse('2026-08-03T12:00:00.0000000Z').ToUniversalTime()
$script:stateOwnerProcess = [pscustomobject]@{
  ProcessId = 6300
  SessionId = 8
  ExecutablePath = 'C:\SyntheticRuntime\node.exe'
  CommandLine = 'node.exe C:\SyntheticEngine\injector.mjs --watch --port 9335 --browser-id browser-8'
}
try {
  Set-Item 'function:Get-CimInstance' -Value {
    [CmdletBinding()]
    param($ClassName, $Filter)
    if ("$Filter" -ceq 'ProcessId = 6300') { return $script:stateOwnerProcess }
    return $null
  }
  Set-Item 'function:Get-Process' -Value {
    [CmdletBinding()]
    param($Id)
    if ([int]$Id -ne 6300) { return $null }
    $process = [pscustomobject]@{ StartTime = $script:stateOwnerStart }
    $process | Add-Member -MemberType ScriptMethod -Name Dispose -Value { return }
    return $process
  }
  $legacyLiveState = [pscustomobject]@{
    injectorPid = 6300
    injectorStartedAt = $script:stateOwnerStart.ToString('o')
    injectorPath = 'C:\SyntheticEngine\injector.mjs'
    nodePath = 'C:\SyntheticRuntime\node.exe'
    port = 9335
    browserId = 'browser-8'
  }
  $ownership = Get-DreamSkinRecordedStateSessionOwnership -State $legacyLiveState `
    -StateRoot 'C:\SyntheticState'
  if (-not $ownership.IsLive -or [int]$ownership.SessionId -ne 8) {
    throw 'A legacy live managed state did not infer its exact Windows session owner.'
  }
  $legacyLiveState | Add-Member -NotePropertyName codexSessionId -NotePropertyValue 7
  $mismatchRejected = $false
  try {
    $null = Get-DreamSkinRecordedStateSessionOwnership -State $legacyLiveState `
      -StateRoot 'C:\SyntheticState'
  } catch { $mismatchRejected = $true }
  if (-not $mismatchRejected) {
    throw 'A saved state session that conflicts with its live exact injector must fail closed.'
  }
} finally {
  Remove-Item 'function:Get-CimInstance' -Force -ErrorAction SilentlyContinue
  Remove-Item 'function:Get-Process' -Force -ErrorAction SilentlyContinue
  Remove-Variable -Name stateOwnerStart -Scope Script -ErrorAction SilentlyContinue
  Remove-Variable -Name stateOwnerProcess -Scope Script -ErrorAction SilentlyContinue
}

# Injector loss does not release a live Codex/CDP owner. New states use the
# exact verified Win32 PID/start/path; legacy states double-sample their saved
# Browser ID and derive one loopback listener session. Ambiguous same-path
# processes fail closed instead of being mistaken for a stale state slot.
$legacyOwnerFunctionNames = @(
  'Get-DreamSkinVerifiedCdpIdentity',
  'Get-DreamSkinPortListeners'
)
$legacyOwnerOriginalFunctions = @{}
foreach ($functionName in $legacyOwnerFunctionNames) {
  $legacyOwnerOriginalFunctions[$functionName] =
    (Get-Command $functionName -CommandType Function).ScriptBlock
}
$script:codexOwnerStart = [DateTime]::Parse('2026-08-03T12:30:00.0000000Z').ToUniversalTime()
$script:codexOwnerBrowserId = 'browser-9'
$script:codexOwnerCdpCalls = 0
$script:codexOwnerProcess = [pscustomobject]@{
  ProcessId = 6400
  SessionId = 9
  ExecutablePath = 'C:\SyntheticPackage\app\ChatGPT.exe'
  CommandLine = 'ChatGPT.exe --remote-debugging-port=9335'
}
$script:crossedInjectorProcess = [pscustomobject]@{
  ProcessId = 6500
  SessionId = 7
  ExecutablePath = 'C:\SyntheticRuntime\node.exe'
  CommandLine = 'node.exe C:\SyntheticEngine\injector.mjs --watch --port 9335 --browser-id browser-9'
}
try {
  Set-Item 'function:Get-CimInstance' -Value {
    [CmdletBinding()]
    param($ClassName, $Filter)
    if ("$Filter" -ceq 'ProcessId = 6400' -or
      "$Filter" -ceq "Name = 'ChatGPT.exe'") {
      return $script:codexOwnerProcess
    }
    if ("$Filter" -ceq 'ProcessId = 6500') { return $script:crossedInjectorProcess }
    return $null
  }
  Set-Item 'function:Get-Process' -Value {
    [CmdletBinding()]
    param($Id)
    if ([int]$Id -notin @(6400, 6500)) { return $null }
    $process = [pscustomobject]@{ StartTime = $script:codexOwnerStart }
    $process | Add-Member -MemberType ScriptMethod -Name Dispose -Value { return }
    return $process
  }
  Set-Item 'function:Get-DreamSkinPortListeners' -Value {
    param($Port)
    return @([pscustomobject]@{ LocalAddress = '127.0.0.1'; OwningProcess = 6400 })
  }
  Set-Item 'function:Get-DreamSkinVerifiedCdpIdentity' -Value {
    param($Port, $Codex)
    $script:codexOwnerCdpCalls++
    return [pscustomobject]@{ BrowserId = $script:codexOwnerBrowserId }
  }
  $newCodexOnlyState = [pscustomobject]@{
    codexPid = 6400
    codexStartTimeFileTimeUtc = $script:codexOwnerStart.ToFileTimeUtc()
    codexSessionId = 9
    codexExe = 'C:\SyntheticPackage\app\ChatGPT.exe'
    codexPackageRoot = 'C:\SyntheticPackage'
    port = 9335
    browserId = 'browser-9'
  }
  $newOwnership = Get-DreamSkinRecordedStateSessionOwnership -State $newCodexOnlyState `
    -StateRoot 'C:\SyntheticState'
  if (-not $newOwnership.IsLive -or [int]$newOwnership.SessionId -ne 9 -or
    $script:codexOwnerCdpCalls -ne 0) {
    throw 'An injector-less new state did not retain its exact recorded Codex process owner.'
  }

  $legacyCodexOnlyState = [pscustomobject]@{
    codexExe = 'C:\SyntheticPackage\app\ChatGPT.exe'
    codexPackageRoot = 'C:\SyntheticPackage'
    port = 9335
    browserId = 'browser-9'
  }
  $legacyOwnership = Get-DreamSkinRecordedStateSessionOwnership -State $legacyCodexOnlyState `
    -StateRoot 'C:\SyntheticState'
  if (-not $legacyOwnership.IsLive -or [int]$legacyOwnership.SessionId -ne 9 -or
    $script:codexOwnerCdpCalls -ne 2) {
    throw 'An injector-less legacy state did not infer its stable saved CDP owner session.'
  }

  $crossedLegacyState = [pscustomobject]@{
    injectorPid = 6500
    injectorStartedAt = $script:codexOwnerStart.ToString('o')
    injectorPath = 'C:\SyntheticEngine\injector.mjs'
    nodePath = 'C:\SyntheticRuntime\node.exe'
    codexExe = 'C:\SyntheticPackage\app\ChatGPT.exe'
    codexPackageRoot = 'C:\SyntheticPackage'
    port = 9335
    browserId = 'browser-9'
  }
  $crossedOwnerRejected = $false
  try {
    $null = Get-DreamSkinRecordedStateSessionOwnership -State $crossedLegacyState `
      -StateRoot 'C:\SyntheticState'
  } catch { $crossedOwnerRejected = $true }
  if (-not $crossedOwnerRejected) {
    throw 'A legacy injector and saved CDP owner from different sessions must conflict fail closed.'
  }

  $script:codexOwnerBrowserId = 'replacement-browser'
  $ambiguousRejected = $false
  try {
    $null = Get-DreamSkinRecordedStateSessionOwnership -State $legacyCodexOnlyState `
      -StateRoot 'C:\SyntheticState'
  } catch { $ambiguousRejected = $true }
  if (-not $ambiguousRejected) {
    throw 'A same-path Codex with ambiguous legacy Browser identity must fail closed.'
  }
} finally {
  foreach ($functionName in $legacyOwnerFunctionNames) {
    Set-Item "function:$functionName" -Value $legacyOwnerOriginalFunctions[$functionName]
  }
  Remove-Item 'function:Get-CimInstance' -Force -ErrorAction SilentlyContinue
  Remove-Item 'function:Get-Process' -Force -ErrorAction SilentlyContinue
  Remove-Variable -Name codexOwnerStart -Scope Script -ErrorAction SilentlyContinue
  Remove-Variable -Name codexOwnerBrowserId -Scope Script -ErrorAction SilentlyContinue
  Remove-Variable -Name codexOwnerCdpCalls -Scope Script -ErrorAction SilentlyContinue
  Remove-Variable -Name codexOwnerProcess -Scope Script -ErrorAction SilentlyContinue
  Remove-Variable -Name crossedInjectorProcess -Scope Script -ErrorAction SilentlyContinue
}

# Exercise the bound stop transaction without touching a real process. The
# simulated browser close makes every renderer sibling disappear immediately;
# that post-close subset is success, not a reason to force or lose recovery.
$boundFunctionNames = @(
  'Get-DreamSkinRegisteredCodexInstalls',
  'Get-DreamSkinRegisteredCodexProcessSnapshot',
  'Assert-DreamSkinAutoRestartControlClear'
)
$boundOriginalFunctions = @{}
foreach ($functionName in $boundFunctionNames) {
  $boundOriginalFunctions[$functionName] =
    (Get-Command $functionName -CommandType Function).ScriptBlock
}
$script:boundCloseSignalled = $false
$script:boundForceAttempted = $false
$script:boundFakeProcesses = @{}
try {
  foreach ($target in $baseTargets) {
    $fakeProcess = [pscustomobject]@{
      Id = [int]$target.processId
      StartTime = [DateTime]::FromFileTimeUtc([long]$target.startTimeFileTimeUtc)
      MainWindowHandle = if ([int]$target.processId -eq 4100) { 918273L } else { 0L }
      HasExited = $false
    }
    $fakeProcess | Add-Member -MemberType ScriptMethod -Name CloseMainWindow -Value {
      if ([long]$this.MainWindowHandle -eq 0) { return $false }
      $script:boundCloseSignalled = $true
      foreach ($candidate in $script:boundFakeProcesses.Values) { $candidate.HasExited = $true }
      return $true
    }
    $fakeProcess | Add-Member -MemberType ScriptMethod -Name Dispose -Value { return }
    $fakeProcess | Add-Member -MemberType ScriptMethod -Name WaitForExit -Value {
      param($Milliseconds)
      return $true
    }
    $script:boundFakeProcesses[[int]$target.processId] = $fakeProcess
  }

  Set-Item 'function:Get-DreamSkinRegisteredCodexInstalls' -Value {
    return @($script:boundFakeInstall)
  }
  Set-Item 'function:Get-DreamSkinRegisteredCodexProcessSnapshot' -Value {
    param($RegisteredInstalls, $ExpectedSessionId)
    if ([int]$ExpectedSessionId -ne [int]$baseTargets[0].sessionId) {
      throw 'The bound stop did not carry the reservation Windows session into its snapshots.'
    }
    if ($script:boundCloseSignalled) {
      return [pscustomobject]@{ Processes = @(); TargetProcesses = @() }
    }
    return [pscustomobject]@{
      Processes = @($baseTargets | ForEach-Object {
        [pscustomobject]@{ ProcessId = [int]$_.processId }
      })
      TargetProcesses = @($baseTargets)
    }
  }
  Set-Item 'function:Assert-DreamSkinAutoRestartControlClear' -Value { param($StateRoot) }
  Set-Item 'function:Get-Process' -Value {
    [CmdletBinding()]
    param([int]$Id)
    $candidate = $script:boundFakeProcesses[$Id]
    if ($null -eq $candidate -or [bool]$candidate.HasExited) {
      if ($ErrorActionPreference -ceq 'Stop') { throw "Synthetic process is absent: $Id" }
      return $null
    }
    return $candidate
  }
  Set-Item 'function:Stop-Process' -Value {
    [CmdletBinding()]
    param([Parameter(ValueFromPipeline = $true)]$InputObject, [switch]$Force)
    $script:boundForceAttempted = $true
    throw 'The synthetic graceful-close path must not force-stop a process.'
  }

  $script:boundFakeInstall = [pscustomobject]@{
    Executable = $baseTargets[0].executablePath
    PackageFullName = $baseTargets[0].packageFullName
    PackageFamilyName = $baseTargets[0].packageFamilyName
  }
  Stop-DreamSkinCodex -Codex $script:boundFakeInstall -AllowForce `
    -ExpectedAutoRestartTargets $baseTargets -AutoRestartStateRoot 'C:\SyntheticState'
  if (-not $script:boundCloseSignalled -or $script:boundForceAttempted) {
    throw 'The identity-bound stop did not accept a normal post-close sibling subset.'
  }
} finally {
  foreach ($functionName in $boundFunctionNames) {
    Set-Item "function:$functionName" -Value $boundOriginalFunctions[$functionName]
  }
  Remove-Item 'function:Get-Process' -Force -ErrorAction SilentlyContinue
  Remove-Item 'function:Stop-Process' -Force -ErrorAction SilentlyContinue
  Remove-Variable -Name boundFakeInstall -Scope Script -ErrorAction SilentlyContinue
  Remove-Variable -Name boundFakeProcesses -Scope Script -ErrorAction SilentlyContinue
  Remove-Variable -Name boundCloseSignalled -Scope Script -ErrorAction SilentlyContinue
  Remove-Variable -Name boundForceAttempted -Scope Script -ErrorAction SilentlyContinue
}

& $autoPath -SelfTest
Write-Host 'PASS: automatic launch protects existing sessions and uses a one-shot guarded restart.'
