[CmdletBinding()]
param(
  [ValidateRange(1024, 65535)][int]$Port = 9335,
  [switch]$ProtectCurrentSession,
  [ValidateRange(250, 60000)][int]$PollIntervalMilliseconds = 1000,
  [ValidateRange(250, 60000)][int]$StableZeroMilliseconds = 1000,
  [ValidateRange(0, 300000)][int]$GracePeriodMilliseconds = 3000,
  [ValidateRange(0, 300000)][int]$StartupBaselineMilliseconds = 10000,
  [switch]$SelfTest
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

function New-DreamSkinAutoLaunchMachine {
  param([Parameter(Mandatory = $true)][bool]$ProtectRequested)

  return [pscustomobject][ordered]@{
    Initialized = $false
    ProtectRequested = $ProtectRequested
    ProtectionArmed = $false
    SessionActive = $false
    SessionSequence = 0
    Attempted = $false
    Suppressed = $false
    SuppressedReason = $null
    UntrustedSinceZero = $false
    TrustedZeroCount = 0
    ZeroStartedAtMilliseconds = $null
    GraceStartedAtMilliseconds = $null
    Phase = 'initializing'
  }
}

function Copy-DreamSkinAutoLaunchMachine {
  param([Parameter(Mandatory = $true)][object]$State)

  return [pscustomobject][ordered]@{
    Initialized = [bool]$State.Initialized
    ProtectRequested = [bool]$State.ProtectRequested
    ProtectionArmed = [bool]$State.ProtectionArmed
    SessionActive = [bool]$State.SessionActive
    SessionSequence = [int]$State.SessionSequence
    Attempted = [bool]$State.Attempted
    Suppressed = [bool]$State.Suppressed
    SuppressedReason = if ($null -eq $State.SuppressedReason) { $null } else { "$($State.SuppressedReason)" }
    UntrustedSinceZero = [bool]$State.UntrustedSinceZero
    TrustedZeroCount = [int]$State.TrustedZeroCount
    ZeroStartedAtMilliseconds = if ($null -eq $State.ZeroStartedAtMilliseconds) {
      $null
    } else {
      [int64]$State.ZeroStartedAtMilliseconds
    }
    GraceStartedAtMilliseconds = if ($null -eq $State.GraceStartedAtMilliseconds) {
      $null
    } else {
      [int64]$State.GraceStartedAtMilliseconds
    }
    Phase = "$($State.Phase)"
  }
}

function Invoke-DreamSkinAutoLaunchTransition {
  param(
    [Parameter(Mandatory = $true)][object]$State,
    [Parameter(Mandatory = $true)][bool]$ObservationSucceeded,
    [ValidateRange(0, 2147483647)][int]$ProcessCount = 0,
    [bool]$HasVerifiedCdp = $false,
    [bool]$HasDebugIntent = $false,
    [bool]$StartupBaselineActive = $false,
    [int64]$NowMilliseconds = 0,
    [ValidateRange(250, 60000)][int]$StableZeroMilliseconds = 1000,
    [ValidateRange(0, 300000)][int]$GraceMilliseconds = 5000
  )

  $next = Copy-DreamSkinAutoLaunchMachine -State $State
  $action = 'none'
  $reason = 'no-change'

  if (-not $ObservationSucceeded) {
    # An Appx/CIM/port inspection failure is not evidence that Codex exited.
    # Latch it until a trusted zero observation. If a session is already known,
    # that whole session becomes ineligible; if not, the next nonzero session
    # inherits the latch because the failed scan may have hidden its beginning.
    $next.UntrustedSinceZero = $true
    $next.TrustedZeroCount = 0
    $next.ZeroStartedAtMilliseconds = $null
    $next.GraceStartedAtMilliseconds = $null
    if ($next.SessionActive -and -not $next.Attempted) {
      $next.Suppressed = $true
      $next.SuppressedReason = 'observation-error'
    }
    $next.Phase = 'observation-error'
    return [pscustomobject]@{ State = $next; Action = $action; Reason = 'observation-error' }
  }

  if (-not $next.Initialized) {
    $next.Initialized = $true
    if ($next.ProtectRequested -and $ProcessCount -gt 0) {
      $next.ProtectionArmed = $true
    }
  }

  if ($ProcessCount -eq 0) {
    $zeroBoundaryRequired = $next.ProtectionArmed -or $next.SessionActive -or
      $next.Attempted -or $next.Suppressed -or $next.UntrustedSinceZero
    if ($zeroBoundaryRequired) {
      if ($null -eq $next.ZeroStartedAtMilliseconds) {
        $next.ZeroStartedAtMilliseconds = $NowMilliseconds
        $next.TrustedZeroCount = 1
        $next.Phase = 'confirming-stable-zero'
        return [pscustomobject]@{ State = $next; Action = $action; Reason = 'first-trusted-zero' }
      }
      $zeroElapsed = $NowMilliseconds - [int64]$next.ZeroStartedAtMilliseconds
      if ($zeroElapsed -lt $StableZeroMilliseconds) {
        $next.TrustedZeroCount = 1
        $next.Phase = 'confirming-stable-zero'
        return [pscustomobject]@{ State = $next; Action = $action; Reason = 'stable-zero-delay' }
      }
      $next.TrustedZeroCount = 2
    } else {
      $next.TrustedZeroCount = 0
      $next.ZeroStartedAtMilliseconds = $null
    }
    $protectionWasArmed = $next.ProtectionArmed
    $sessionWasActive = $next.SessionActive
    $next.ProtectionArmed = $false
    $next.SessionActive = $false
    $next.Attempted = $false
    $next.Suppressed = $false
    $next.SuppressedReason = $null
    $next.UntrustedSinceZero = $false
    $next.ZeroStartedAtMilliseconds = $null
    $next.GraceStartedAtMilliseconds = $null
    $next.Phase = 'idle'
    $reason = if ($protectionWasArmed) {
      'protected-session-ended'
    } elseif ($sessionWasActive) {
      'session-ended'
    } else {
      'no-codex-process'
    }
    return [pscustomobject]@{ State = $next; Action = $action; Reason = $reason }
  }

  $next.TrustedZeroCount = 0
  $next.ZeroStartedAtMilliseconds = $null

  if (-not $next.SessionActive) {
    $next.SessionActive = $true
    $next.SessionSequence = [int]$next.SessionSequence + 1
    $next.Attempted = $false
    $next.Suppressed = $false
    $next.SuppressedReason = $null
    $next.GraceStartedAtMilliseconds = $null
  }

  # Startup is a baseline scan, not a "new session" signal. Even without the
  # explicit protection switch, a process found on the first trustworthy scan
  # or during the startup baseline window is protected until a verified zero.
  if ($StartupBaselineActive) {
    $next.ProtectionArmed = $true
  }

  if ($next.UntrustedSinceZero -and -not $next.ProtectionArmed) {
    $next.Suppressed = $true
    $next.SuppressedReason = 'observation-error'
    $next.GraceStartedAtMilliseconds = $null
  }

  if ($next.ProtectionArmed) {
    $next.Phase = 'protecting-current-session'
    return [pscustomobject]@{
      State = $next
      Action = $action
      Reason = 'waiting-for-trusted-zero-process-observation'
    }
  }

  if ($next.Attempted) {
    $next.Phase = 'waiting-for-zero-after-attempt'
    return [pscustomobject]@{ State = $next; Action = $action; Reason = 'attempt-already-issued' }
  }

  if ($HasVerifiedCdp -or $HasDebugIntent) {
    $next.Suppressed = $true
    $next.SuppressedReason = if ($HasVerifiedCdp) { 'verified-cdp' } else { 'debug-intent' }
    $next.GraceStartedAtMilliseconds = $null
  }

  if ($next.Suppressed) {
    $next.Phase = if ($next.SuppressedReason -ceq 'observation-error') {
      'suppressed-observation-error'
    } else {
      'suppressed-debug-session'
    }
    return [pscustomobject]@{ State = $next; Action = $action; Reason = $next.SuppressedReason }
  }

  if ($null -eq $next.GraceStartedAtMilliseconds) {
    $next.GraceStartedAtMilliseconds = $NowMilliseconds
  }

  $elapsed = $NowMilliseconds - [int64]$next.GraceStartedAtMilliseconds
  if ($elapsed -lt $GraceMilliseconds) {
    $next.Phase = 'stock-grace-period'
    return [pscustomobject]@{ State = $next; Action = $action; Reason = 'stock-session-grace' }
  }

  # Record the attempt before the caller invokes the launcher. Success, failure,
  # or an observation race must all wait for a trusted zero-process boundary so
  # one stock session can never cause a restart loop.
  $next.Attempted = $true
  $next.Phase = 'restart-issued'
  return [pscustomobject]@{ State = $next; Action = 'restart'; Reason = 'stock-session-grace-complete' }
}

function Assert-DreamSkinAutoLaunchTest {
  param([Parameter(Mandatory = $true)][bool]$Condition, [Parameter(Mandatory = $true)][string]$Message)
  if (-not $Condition) { throw "Auto-launch self-test failed: $Message" }
}

function Invoke-DreamSkinAutoLaunchSelfTest {
  $grace = 1000

  $baseline = New-DreamSkinAutoLaunchMachine -ProtectRequested $false
  $step = Invoke-DreamSkinAutoLaunchTransition -State $baseline -ObservationSucceeded $true `
    -ProcessCount 1 -StartupBaselineActive $true -NowMilliseconds 0 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.ProtectionArmed -and $step.Action -ceq 'none') `
    'the first baseline scan must protect an existing session without an explicit switch'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 1 -StartupBaselineActive $false -NowMilliseconds 5000 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.ProtectionArmed -and $step.Action -ceq 'none') `
    'baseline protection must remain armed after the startup window'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 0 -StartupBaselineActive $false -NowMilliseconds 6000 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.ProtectionArmed) `
    'one zero observation must not release baseline protection'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 0 -StartupBaselineActive $false -NowMilliseconds 6100 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.ProtectionArmed -and $step.State.TrustedZeroCount -eq 1) `
    'queued zero observations must not bypass the stable-zero interval'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 0 -StartupBaselineActive $false -NowMilliseconds 7000 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest (-not $step.State.ProtectionArmed) `
    'baseline protection must require a time-stable trusted zero boundary'

  $baseline = New-DreamSkinAutoLaunchMachine -ProtectRequested $false
  $step = Invoke-DreamSkinAutoLaunchTransition -State $baseline -ObservationSucceeded $true `
    -ProcessCount 0 -StartupBaselineActive $true -NowMilliseconds 0 -GraceMilliseconds $grace
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 1 -StartupBaselineActive $true -NowMilliseconds 500 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.ProtectionArmed -and $step.Action -ceq 'none') `
    'a process appearing during the startup baseline window must be protected'

  $machine = New-DreamSkinAutoLaunchMachine -ProtectRequested $false
  $step = Invoke-DreamSkinAutoLaunchTransition -State $machine -ObservationSucceeded $true `
    -ProcessCount 1 -NowMilliseconds 100 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.Action -ceq 'none' -and $step.State.Phase -ceq 'stock-grace-period') `
    'an unprotected stock session must enter grace first'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 1 -NowMilliseconds 1099 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.Action -ceq 'none') 'grace must not complete early'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 1 -NowMilliseconds 1100 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.Action -ceq 'restart' -and $step.State.Attempted) `
    'stock grace completion must issue one restart'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 1 -NowMilliseconds 5000 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.Action -ceq 'none' -and $step.State.Phase -ceq 'waiting-for-zero-after-attempt') `
    'one session must never issue a second restart'

  $protected = New-DreamSkinAutoLaunchMachine -ProtectRequested $true
  $step = Invoke-DreamSkinAutoLaunchTransition -State $protected -ObservationSucceeded $true `
    -ProcessCount 2 -NowMilliseconds 0 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.ProtectionArmed -and $step.Action -ceq 'none') `
    'an initial running session must arm protection'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $false `
    -NowMilliseconds 5000 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.ProtectionArmed -and $step.State.Phase -ceq 'observation-error') `
    'an observation error must not disarm protection'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 3 -NowMilliseconds 8000 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.ProtectionArmed -and $step.Action -ceq 'none') `
    'protection must survive process replacement without an observed zero'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 0 -NowMilliseconds 9000 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.ProtectionArmed) `
    'one trusted zero must not release explicit protection'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 0 -NowMilliseconds 9100 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.ProtectionArmed) `
    'event bursts must not release explicit protection early'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 0 -NowMilliseconds 10000 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest (-not $step.State.ProtectionArmed -and -not $step.State.SessionActive) `
    'only a trusted zero observation may release protection'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 1 -NowMilliseconds 11000 -GraceMilliseconds $grace
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 1 -NowMilliseconds 12000 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.Action -ceq 'restart') `
    'a session started after protection is released may be restarted'

  foreach ($kind in @('cdp', 'debug')) {
    $machine = New-DreamSkinAutoLaunchMachine -ProtectRequested $false
    $transitionArguments = @{
      State = $machine
      ObservationSucceeded = $true
      ProcessCount = 1
      NowMilliseconds = 0
      GraceMilliseconds = $grace
      HasVerifiedCdp = $kind -ceq 'cdp'
      HasDebugIntent = $kind -ceq 'debug'
    }
    $step = Invoke-DreamSkinAutoLaunchTransition @transitionArguments
    Assert-DreamSkinAutoLaunchTest ($step.State.Suppressed -and $step.Action -ceq 'none') `
      "$kind intent must suppress the whole session"
    $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
      -ProcessCount 1 -NowMilliseconds 5000 -GraceMilliseconds $grace
    Assert-DreamSkinAutoLaunchTest ($step.Action -ceq 'none' -and $step.State.Suppressed) `
      "$kind suppression must remain until zero"
  }

  $machine = New-DreamSkinAutoLaunchMachine -ProtectRequested $false
  $step = Invoke-DreamSkinAutoLaunchTransition -State $machine -ObservationSucceeded $true `
    -ProcessCount 1 -NowMilliseconds 100 -GraceMilliseconds $grace
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $false `
    -NowMilliseconds 999 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.Suppressed -and
    $step.State.SuppressedReason -ceq 'observation-error') `
    'an inspection error must suppress the whole observed session'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 1 -NowMilliseconds 1000 -GraceMilliseconds $grace
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 1 -NowMilliseconds 5000 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.Action -ceq 'none' -and $step.State.Suppressed) `
    'an observation failure latch must survive until zero'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 0 -NowMilliseconds 6000 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.Suppressed -and $step.State.TrustedZeroCount -eq 1) `
    'one zero must not clear an observation failure latch'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 0 -NowMilliseconds 6100 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest ($step.State.Suppressed -and $step.State.TrustedZeroCount -eq 1) `
    'queued zero observations must not clear a failure latch early'
  $step = Invoke-DreamSkinAutoLaunchTransition -State $step.State -ObservationSucceeded $true `
    -ProcessCount 0 -NowMilliseconds 7000 -GraceMilliseconds $grace
  Assert-DreamSkinAutoLaunchTest (-not $step.State.Suppressed -and -not $step.State.UntrustedSinceZero) `
    'a stable trusted-zero boundary must clear the observation failure latch'

  Write-Host 'Codex Dream Skin auto-launch state machine self-test passed.'
}

if ($SelfTest) {
  Invoke-DreamSkinAutoLaunchSelfTest
  return
}

. (Join-Path $PSScriptRoot 'common-windows.ps1')
. (Join-Path $PSScriptRoot 'theme-windows.ps1')

$script:DreamSkinAutoLaunchInstallCache = $null
$script:DreamSkinAutoLaunchInstallCacheAt = [DateTime]::MinValue
$watcherProcess = Get-Process -Id $PID -ErrorAction Stop
try { $script:DreamSkinAutoLaunchSessionId = [int]$watcherProcess.SessionId } finally {
  $watcherProcess.Dispose()
}

function Get-DreamSkinAutoLaunchObservation {
  param(
    [Parameter(Mandatory = $true)][int]$DebugPort,
    [switch]$CaptureTargetProcesses
  )

  $cacheAge = ([DateTime]::UtcNow - $script:DreamSkinAutoLaunchInstallCacheAt).TotalSeconds
  if ($null -eq $script:DreamSkinAutoLaunchInstallCache -or $cacheAge -ge 30) {
    $packages = @(Get-AppxPackage -Name 'OpenAI.Codex' -ErrorAction Stop | Sort-Object Version -Descending)
    if ($packages.Count -eq 0) {
      throw 'The official OpenAI.Codex Store package is not installed.'
    }
    $validated = @()
    foreach ($package in $packages) {
      $install = ConvertTo-DreamSkinCodexInstall -Package $package
      if ($null -eq $install) {
        throw "A registered OpenAI.Codex package could not be validated: $($package.PackageFullName)"
      }
      $validated += $install
    }
    $script:DreamSkinAutoLaunchInstallCache = @($validated)
    $script:DreamSkinAutoLaunchInstallCacheAt = [DateTime]::UtcNow
  }
  $installs = @($script:DreamSkinAutoLaunchInstallCache)

  $targetProcesses = @()
  if ($CaptureTargetProcesses) {
    # The one final confirmation pins every target to its PID, creation time,
    # executable and validated Store package. Keep this stronger second read
    # off the regular grace scans so the background watcher stays lightweight.
    $snapshot = Get-DreamSkinRegisteredCodexProcessSnapshot -RegisteredInstalls $installs
    $registeredProcesses = @($snapshot.Processes)
    $targetProcesses = @($snapshot.TargetProcesses)
  } else {
    # Regular observations use one terminating CIM inventory. An unavailable
    # path or a package update is still fail-closed, but no per-process identity
    # requery is paid on every grace-period scan.
    $chatGptProcesses = @(
      Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" -ErrorAction Stop
    )
    $registeredProcesses = @()
    foreach ($process in $chatGptProcesses) {
      if ([int]$process.SessionId -ne $script:DreamSkinAutoLaunchSessionId) { continue }
      $processPath = Get-DreamSkinProcessExecutablePath -ProcessInfo $process
      if (-not $processPath) {
        throw "A ChatGPT.exe process path could not be inspected safely: PID $($process.ProcessId)"
      }
      $matches = @($installs | Where-Object {
        Test-DreamSkinPathEqual -Left $processPath -Right "$($_.Executable)"
      })
      if ($matches.Count -eq 1) {
        $registeredProcesses += $process
      } elseif ($matches.Count -gt 1) {
        throw "A Codex process matches more than one validated install: PID $($process.ProcessId)"
      } elseif ($processPath -match '(?i)\\WindowsApps\\OpenAI\.Codex_') {
        throw "A Codex package process is newer than the validated install cache: PID $($process.ProcessId)"
      }
    }
  }

  $debugIntentStatus = Get-DreamSkinCodexAnyDebugIntentStatus -Processes $registeredProcesses
  if ($debugIntentStatus -ceq 'uninspectable') {
    throw 'A registered Codex command line could not be inspected safely.'
  }
  $hasDebugIntent = $debugIntentStatus -ceq 'debug-intent'

  # Any debug intent is latched for the whole process session. The guarded
  # launcher performs authoritative listener/owner verification under the main
  # operation mutex, so the monitor does not import NetTCPIP or poll sockets.
  # This keeps the always-on process small and avoids adding latency to Codex.
  $hasVerifiedCdp = $false
  return [pscustomobject]@{
    ProcessCount = $registeredProcesses.Count
    HasVerifiedCdp = $hasVerifiedCdp
    HasDebugIntent = [bool]$hasDebugIntent
    TargetProcesses = $targetProcesses
    Detail = if ($hasDebugIntent) {
      'debug-intent'
    } elseif ($registeredProcesses.Count -gt 0) {
      'stock-session'
    } else {
      'no-process'
    }
  }
}

function Get-DreamSkinAutoLaunchLightObservation {
  if ($null -eq $script:DreamSkinAutoLaunchInstallCache) { return $null }
  $processes = @(Get-Process -Name ChatGPT -ErrorAction SilentlyContinue)
  $matchedCount = 0
  foreach ($process in $processes) {
    if ([int]$process.SessionId -ne $script:DreamSkinAutoLaunchSessionId) { continue }
    try { $processPath = $process.Path } catch { return $null }
    if (-not $processPath) { return $null }
    $matched = $false
    foreach ($install in @($script:DreamSkinAutoLaunchInstallCache)) {
      if (Test-DreamSkinPathEqual -Left $processPath -Right $install.Executable) {
        $matched = $true
        break
      }
    }
    if ($matched) {
      $matchedCount++
    } elseif ($processPath -match '(?i)\\WindowsApps\\OpenAI\.Codex_') {
      # Force the strict Appx/CIM path to refresh or fail closed across updates.
      return $null
    }
  }
  return [pscustomobject]@{
    ProcessCount = $matchedCount
    HasVerifiedCdp = $false
    HasDebugIntent = $false
    Detail = if ($matchedCount -gt 0) { 'known-session-light-scan' } else { 'no-process-light-scan' }
  }
}

function Assert-DreamSkinAutoLaunchPlainFile {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $item = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
  if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw "Auto-launch managed file is not a plain file: $Path"
  }
}

function Write-DreamSkinAutoLaunchLog {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Message
  )

  Assert-DreamSkinAutoLaunchPlainFile -Path $Path
  $line = '[dream-skin-auto] ' + [DateTime]::UtcNow.ToString('o') + ' ' + $Message + "`r`n"
  $encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::AppendAllText($Path, $line, $encoding)
}

function Write-DreamSkinAutoLaunchState {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][object]$Machine,
    [Parameter(Mandatory = $true)][string]$Phase,
    [Parameter(Mandatory = $true)][string]$StartedAt,
    [Parameter(Mandatory = $true)][string]$ScriptPath,
    [AllowNull()][string]$LastError,
    [AllowNull()][string]$LastObservation,
    [AllowNull()][string]$StoppedAt,
    [AllowNull()][string]$AttemptToken,
    [AllowNull()][string]$SessionToken,
    [AllowNull()][object[]]$TargetProcesses = @()
  )

  Assert-DreamSkinAutoLaunchPlainFile -Path $Path
  $state = [ordered]@{
    schemaVersion = 1
    platform = 'windows'
    pid = $PID
    startedAt = $StartedAt
    scriptPath = $ScriptPath
    phase = $Phase
    protectCurrentSession = [bool]$ProtectCurrentSession
    port = $Port
    protectionArmed = [bool]$Machine.ProtectionArmed
    sessionSequence = [int]$Machine.SessionSequence
    sessionActive = [bool]$Machine.SessionActive
    attempted = [bool]$Machine.Attempted
    attemptToken = $AttemptToken
    sessionToken = $SessionToken
    suppressedReason = $Machine.SuppressedReason
    untrustedSinceZero = [bool]$Machine.UntrustedSinceZero
    trustedZeroCount = [int]$Machine.TrustedZeroCount
    zeroStartedAtMilliseconds = $Machine.ZeroStartedAtMilliseconds
    graceStartedAtMilliseconds = $Machine.GraceStartedAtMilliseconds
    lastObservation = $LastObservation
    lastError = $LastError
    updatedAt = [DateTime]::UtcNow.ToString('o')
  }
  if ($StoppedAt) { $state['stoppedAt'] = $StoppedAt }
  if ($Phase -ceq 'restart-reserved') {
    $state['targetProcesses'] = @(
      ConvertTo-DreamSkinAutoRestartTargetProcesses `
        -TargetProcesses @($TargetProcesses)
    )
  } elseif (@($TargetProcesses).Count -gt 0) {
    throw 'Automatic restart targets may only be persisted in restart-reserved state.'
  }
  Write-DreamSkinUtf8FileAtomically -Path $Path -Content (($state | ConvertTo-Json -Depth 5) + "`r`n")
}

$StateRoot = Join-Path $env:LOCALAPPDATA 'CodexDreamSkin'
$StopMarkerPath = Join-Path $StateRoot 'auto-launch.stop'
$PauseMarkerPath = Join-Path $StateRoot 'paused'
$StatePath = Join-Path $StateRoot 'auto-launch-state.json'
$LogPath = Join-Path $StateRoot 'auto-launch.log'
$StartScript = Join-Path $PSScriptRoot 'start-dream-skin.ps1'
$ScriptPath = [IO.Path]::GetFullPath($PSCommandPath)
$StartedAt = (Get-Process -Id $PID -ErrorAction Stop).StartTime.ToUniversalTime().ToString('o')
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
# State, stop signals and the Startup entry are per-user rather than per
# terminal session. Match that ownership with one cross-session mutex so two
# Fast User Switching/RDP logons for the same SID cannot overwrite each
# other's reservation. The first owner watches only its pinned SessionId;
# another session exits fail-closed until that owner stops.
$mutex = [System.Threading.Mutex]::new($false, "Global\CodexDreamSkin.$sid.AutoLaunch")
$acquired = $false
$machine = New-DreamSkinAutoLaunchMachine -ProtectRequested ([bool]$ProtectCurrentSession)
$lastPublishedPhase = $null
$lastErrorMessage = $null
$lastErrorLogAt = [DateTime]::MinValue
$lastLoggedError = $null
$lastObservationDetail = $null
$sessionToken = $null
$attemptToken = $null
$baselineScanComplete = $false
$clock = [System.Diagnostics.Stopwatch]::StartNew()
$eventSourcePrefix = "CodexDreamSkin.AutoLaunch.$PID"
$eventSources = @("$eventSourcePrefix.Start", "$eventSourcePrefix.Stop")
$eventJobs = @()
$eventSignal = [System.Threading.AutoResetEvent]::new($false)
$eventDriven = $false
$nextObservationAtMilliseconds = [int64]0

try {
  try {
    $acquired = $mutex.WaitOne(0)
  } catch [System.Threading.AbandonedMutexException] {
    $acquired = $true
  }
  if (-not $acquired) { exit 0 }

  Ensure-DreamSkinManagedDirectory -Path $StateRoot -Root $StateRoot
  Assert-DreamSkinAutoLaunchPlainFile -Path $StopMarkerPath
  Assert-DreamSkinAutoLaunchPlainFile -Path $PauseMarkerPath
  Assert-DreamSkinAutoLaunchPlainFile -Path $StatePath
  Assert-DreamSkinAutoLaunchPlainFile -Path $LogPath
  if (-not (Test-Path -LiteralPath $StartScript -PathType Leaf)) {
    throw "Dream Skin start script is missing: $StartScript"
  }

  if (Test-Path -LiteralPath $StopMarkerPath -PathType Leaf) {
    Write-DreamSkinAutoLaunchLog -Path $LogPath -Message 'Stop marker is present; watcher did not start.'
    Write-DreamSkinAutoLaunchState -Path $StatePath -Machine $machine -Phase 'stopped' `
      -StartedAt $StartedAt -ScriptPath $ScriptPath -LastError $null `
      -LastObservation 'stop-marker-present' -StoppedAt ([DateTime]::UtcNow.ToString('o'))
    exit 0
  }

  Write-DreamSkinAutoLaunchLog -Path $LogPath -Message (
    "Watcher started (protectCurrentSession=$([bool]$ProtectCurrentSession), port=$Port)."
  )
  Write-DreamSkinAutoLaunchState -Path $StatePath -Machine $machine -Phase $machine.Phase `
    -StartedAt $StartedAt -ScriptPath $ScriptPath -LastError $null -LastObservation $null
  $lastPublishedPhase = $machine.Phase

  try {
    $eventJobs += Register-WmiEvent -Query (
      "SELECT * FROM __InstanceCreationEvent WITHIN 2 WHERE " +
      "TargetInstance ISA 'Win32_Process' AND TargetInstance.Name = 'ChatGPT.exe'"
    ) -SourceIdentifier $eventSources[0] -MessageData $eventSignal -Action {
      [void]$event.MessageData.Set()
    } -ErrorAction Stop
    $eventJobs += Register-WmiEvent -Query (
      "SELECT * FROM __InstanceDeletionEvent WITHIN 2 WHERE " +
      "TargetInstance ISA 'Win32_Process' AND TargetInstance.Name = 'ChatGPT.exe'"
    ) -SourceIdentifier $eventSources[1] -MessageData $eventSignal -Action {
      [void]$event.MessageData.Set()
    } -ErrorAction Stop
    $eventDriven = $true
    Write-DreamSkinAutoLaunchLog -Path $LogPath -Message 'Process start/stop event monitoring is active.'
  } catch {
    foreach ($source in $eventSources) {
      Unregister-Event -SourceIdentifier $source -ErrorAction SilentlyContinue
    }
    foreach ($job in $eventJobs) { Remove-Job -Job $job -Force -ErrorAction SilentlyContinue }
    $eventJobs = @()
    Write-DreamSkinAutoLaunchLog -Path $LogPath -Message (
      'Process events are unavailable; using the bounded polling fallback.'
    )
  }

  while (-not (Test-Path -LiteralPath $StopMarkerPath -PathType Leaf)) {
    $nowMilliseconds = [int64]$clock.ElapsedMilliseconds
    if ($nowMilliseconds -lt $nextObservationAtMilliseconds) {
      $remainingMilliseconds = $nextObservationAtMilliseconds - $nowMilliseconds
      if ($eventDriven) {
        $waitMilliseconds = [Math]::Max(1, [Math]::Min(2000, $remainingMilliseconds))
        if ($eventSignal.WaitOne($waitMilliseconds)) {
          # AutoResetEvent coalesces an Electron process burst into one rescan
          # and can only be signaled by this watcher's two filtered WMI actions.
          $nextObservationAtMilliseconds = 0
        } else {
          continue
        }
      } else {
        Start-Sleep -Milliseconds ([Math]::Min($PollIntervalMilliseconds, $remainingMilliseconds))
        continue
      }
      $nowMilliseconds = [int64]$clock.ElapsedMilliseconds
    }
    $startupBaselineActive = -not $baselineScanComplete -or
      $nowMilliseconds -lt $StartupBaselineMilliseconds
    $observation = $null
    $transition = $null
    try {
      $lightScanAllowed = $machine.Initialized -and (
        -not $machine.SessionActive -or $machine.ProtectionArmed -or
        $machine.Attempted -or $machine.Suppressed
      )
      if ($lightScanAllowed) {
        $observation = Get-DreamSkinAutoLaunchLightObservation
      }
      if ($null -eq $observation) {
        $observation = Get-DreamSkinAutoLaunchObservation -DebugPort $Port
      }
      $transition = Invoke-DreamSkinAutoLaunchTransition -State $machine -ObservationSucceeded $true `
        -ProcessCount $observation.ProcessCount -HasVerifiedCdp $observation.HasVerifiedCdp `
        -HasDebugIntent $observation.HasDebugIntent -NowMilliseconds $nowMilliseconds `
        -StartupBaselineActive $startupBaselineActive -StableZeroMilliseconds $StableZeroMilliseconds `
        -GraceMilliseconds $GracePeriodMilliseconds
      $baselineScanComplete = $true
      $lastErrorMessage = $null
      $lastObservationDetail = $observation.Detail
    } catch {
      $message = $_.Exception.Message
      $transition = Invoke-DreamSkinAutoLaunchTransition -State $machine -ObservationSucceeded $false `
        -NowMilliseconds $nowMilliseconds -StableZeroMilliseconds $StableZeroMilliseconds `
        -GraceMilliseconds $GracePeriodMilliseconds
      $lastErrorMessage = if ($message.Length -gt 500) { $message.Substring(0, 500) } else { $message }
      $lastObservationDetail = 'error'
      $now = [DateTime]::UtcNow
      if ($lastErrorMessage -cne $lastLoggedError -or
        ($now - $lastErrorLogAt).TotalSeconds -ge 30) {
        Write-DreamSkinAutoLaunchLog -Path $LogPath -Message "Observation failed closed: $lastErrorMessage"
        $lastErrorLogAt = $now
        $lastLoggedError = $lastErrorMessage
      }
    }

    $previousPhase = $machine.Phase
    $previousSessionSequence = [int]$machine.SessionSequence
    $machine = $transition.State
    if ($machine.SessionActive -and [int]$machine.SessionSequence -ne $previousSessionSequence) {
      $sessionToken = [guid]::NewGuid().ToString('N')
    } elseif (-not $machine.SessionActive) {
      $sessionToken = $null
      $attemptToken = $null
    }
    if ($machine.Phase -cne $lastPublishedPhase) {
      Write-DreamSkinAutoLaunchLog -Path $LogPath -Message (
        "Phase $previousPhase -> $($machine.Phase) ($($transition.Reason))."
      )
      Write-DreamSkinAutoLaunchState -Path $StatePath -Machine $machine -Phase $machine.Phase `
        -StartedAt $StartedAt -ScriptPath $ScriptPath -LastError $lastErrorMessage `
        -LastObservation $lastObservationDetail -AttemptToken $attemptToken -SessionToken $sessionToken
      $lastPublishedPhase = $machine.Phase
    }

    if ($transition.Action -ceq 'restart') {
      # Close the final race between the grace-period observation and launch.
      # Any error, disappearance, CDP, debug argument, or occupied debug port
      # consumes this session's sole attempt without touching Codex.
      $confirmed = $false
      try {
        $confirmation = Get-DreamSkinAutoLaunchObservation -DebugPort $Port `
          -CaptureTargetProcesses
        $confirmed = $confirmation.ProcessCount -gt 0 -and
          @($confirmation.TargetProcesses).Count -eq $confirmation.ProcessCount -and
          -not $confirmation.HasVerifiedCdp -and -not $confirmation.HasDebugIntent
        $lastObservationDetail = $confirmation.Detail
      } catch {
        $lastErrorMessage = $_.Exception.Message
        Write-DreamSkinAutoLaunchLog -Path $LogPath -Message (
          "Restart confirmation failed closed; waiting for zero: $lastErrorMessage"
        )
      }

      if ($confirmed) {
        if ((Test-Path -LiteralPath $StopMarkerPath -PathType Leaf) -or
          (Test-Path -LiteralPath $PauseMarkerPath -PathType Leaf)) {
          $confirmed = $false
          $lastObservationDetail = 'disabled-or-paused-before-reservation'
        }
      }

      if ($confirmed) {
        $attemptToken = [guid]::NewGuid().ToString('N')
        Write-DreamSkinAutoLaunchLog -Path $LogPath -Message (
          "Restarting confirmed stock session $($machine.SessionSequence) after grace."
        )
        # This durable reservation is consumed by start-dream-skin only after
        # that script owns the main operation mutex and rechecks process intent.
        Write-DreamSkinAutoLaunchState -Path $StatePath -Machine $machine -Phase 'restart-reserved' `
          -StartedAt $StartedAt -ScriptPath $ScriptPath -LastError $null `
          -LastObservation $lastObservationDetail -AttemptToken $attemptToken `
          -SessionToken $sessionToken -TargetProcesses @($confirmation.TargetProcesses)
        $powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
        $previousNativePreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
          if ((Test-Path -LiteralPath $StopMarkerPath -PathType Leaf) -or
            (Test-Path -LiteralPath $PauseMarkerPath -PathType Leaf)) {
            $launcherExitCode = 0
            $lastObservationDetail = 'disabled-or-paused-after-reservation'
          } else {
            & $powershell -NoProfile -ExecutionPolicy RemoteSigned -File $StartScript `
              -AutoRestartStock -AutoRestartReservationToken $attemptToken -RequireUnpaused
            $launcherExitCode = $LASTEXITCODE
          }
        } finally {
          $ErrorActionPreference = $previousNativePreference
        }
        if ($launcherExitCode -eq 0) {
          Write-DreamSkinAutoLaunchLog -Path $LogPath -Message 'Stock-session restart completed successfully.'
        } else {
          $lastErrorMessage = "start-dream-skin.ps1 exited with code $launcherExitCode"
          Write-DreamSkinAutoLaunchLog -Path $LogPath -Message (
            "$lastErrorMessage; waiting for a trusted zero-process boundary."
          )
        }
      } else {
        Write-DreamSkinAutoLaunchLog -Path $LogPath -Message (
          'Restart was suppressed by the confirmation observation; waiting for zero.'
        )
      }

      $machine.Phase = 'waiting-for-zero-after-attempt'
      Write-DreamSkinAutoLaunchState -Path $StatePath -Machine $machine -Phase $machine.Phase `
        -StartedAt $StartedAt -ScriptPath $ScriptPath -LastError $lastErrorMessage `
        -LastObservation $lastObservationDetail -AttemptToken $null -SessionToken $sessionToken
      $lastPublishedPhase = $machine.Phase
    }

    $activeRescan = $machine.Phase -in @(
      'stock-grace-period', 'confirming-stable-zero', 'observation-error', 'restart-issued'
    )
    $rescanDelay = if ($activeRescan) { $PollIntervalMilliseconds } else { 30000 }
    if (-not $eventDriven) { $rescanDelay = [Math]::Min($rescanDelay, $PollIntervalMilliseconds) }
    $nextObservationAtMilliseconds = [int64]$clock.ElapsedMilliseconds + [int64]$rescanDelay
  }

  Assert-DreamSkinAutoLaunchPlainFile -Path $StopMarkerPath
  Write-DreamSkinAutoLaunchLog -Path $LogPath -Message 'Stop marker observed; watcher is exiting.'
  Write-DreamSkinAutoLaunchState -Path $StatePath -Machine $machine -Phase 'stopped' `
    -StartedAt $StartedAt -ScriptPath $ScriptPath -LastError $lastErrorMessage `
    -LastObservation 'stop-marker-observed' -StoppedAt ([DateTime]::UtcNow.ToString('o'))
} catch {
  try {
    if ($acquired -and (Test-Path -LiteralPath $StateRoot -PathType Container)) {
      $fatalMessage = $_.Exception.Message
      if ($fatalMessage.Length -gt 500) { $fatalMessage = $fatalMessage.Substring(0, 500) }
      try { Write-DreamSkinAutoLaunchLog -Path $LogPath -Message "Watcher stopped on error: $fatalMessage" } catch {}
      try {
        Write-DreamSkinAutoLaunchState -Path $StatePath -Machine $machine -Phase 'error' `
          -StartedAt $StartedAt -ScriptPath $ScriptPath -LastError $fatalMessage `
          -LastObservation $lastObservationDetail -StoppedAt ([DateTime]::UtcNow.ToString('o'))
      } catch {}
    }
  } catch {}
  throw
} finally {
  foreach ($source in $eventSources) {
    Unregister-Event -SourceIdentifier $source -ErrorAction SilentlyContinue
    Get-Event -SourceIdentifier $source -ErrorAction SilentlyContinue |
      Remove-Event -ErrorAction SilentlyContinue
  }
  foreach ($job in $eventJobs) { Remove-Job -Job $job -Force -ErrorAction SilentlyContinue }
  $eventSignal.Dispose()
  if ($acquired) { try { $mutex.ReleaseMutex() } catch {} }
  $mutex.Dispose()
}
