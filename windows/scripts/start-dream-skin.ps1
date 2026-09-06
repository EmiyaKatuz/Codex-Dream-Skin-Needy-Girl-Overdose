[CmdletBinding()]
param(
  [int]$Port = 9335,
  [switch]$RestartExisting,
  [switch]$AutoRestartStock,
  [string]$AutoRestartReservationToken,
  [switch]$PromptRestart,
  [string]$ProfilePath,
  [switch]$ForegroundInjector,
  [ValidateRange(0, 300000)][int]$OperationLockTimeoutMilliseconds = 0,
  [switch]$RequireUnpaused,
  [ValidatePattern('^[a-f0-9]{32}$')][string]$ResultToken
)

$ErrorActionPreference = 'Stop'
$PortExplicit = $PSBoundParameters.ContainsKey('Port')
$ProfilePathExplicit = $PSBoundParameters.ContainsKey('ProfilePath') -and [bool]$ProfilePath
$Injector = Join-Path $PSScriptRoot 'injector.mjs'
. (Join-Path $PSScriptRoot 'common-windows.ps1')
. (Join-Path $PSScriptRoot 'theme-windows.ps1')
. (Join-Path $PSScriptRoot 'localization-windows.ps1')

function Assert-DreamSkinAutoRestartStableZero {
  param(
    [Parameter(Mandatory = $true)][string]$StateRoot,
    [Parameter(Mandatory = $true)]
    [ValidateRange(0, 2147483647)][int]$ExpectedSessionId,
    [ValidateRange(250, 5000)][int]$StableMilliseconds = 1000
  )

  $registeredInstalls = @(Get-DreamSkinRegisteredCodexInstalls)
  Assert-DreamSkinAutoRestartControlClear -StateRoot $StateRoot
  $first = Get-DreamSkinRegisteredCodexProcessSnapshot -RegisteredInstalls $registeredInstalls `
    -ExpectedSessionId $ExpectedSessionId
  if (@($first.TargetProcesses).Count -ne 0) {
    throw 'A new Codex process appeared before the automatic managed launch.'
  }
  Start-Sleep -Milliseconds $StableMilliseconds
  Assert-DreamSkinAutoRestartControlClear -StateRoot $StateRoot
  $second = Get-DreamSkinRegisteredCodexProcessSnapshot -RegisteredInstalls $registeredInstalls `
    -ExpectedSessionId $ExpectedSessionId
  if (@($second.TargetProcesses).Count -ne 0) {
    throw 'The Codex zero-process boundary was not stable before automatic managed launch.'
  }
}

function Invoke-DreamSkinStartupAppearanceRecovery {
  param(
    [AllowNull()][object]$Transaction,
    [Parameter(Mandatory = $true)][string]$ConfigPath,
    [Parameter(Mandatory = $true)][string]$BackupPath
  )
  if ($null -eq $Transaction) { return 'not-needed' }
  try {
    $result = Restore-DreamSkinManagedAppearanceSnapshot `
      -ConfigPath $ConfigPath -BackupPath $BackupPath -Transaction $Transaction
    if ($result.ConflictedKeys.Count -gt 0 -or
      "$($result.MarkerStatus)" -ceq 'conflict-preserved') {
      Write-Warning 'Startup appearance recovery preserved newer user changes instead of overwriting them.'
      return 'conflict-preserved'
    }
    return 'restored'
  } catch {
    Write-Warning 'Startup appearance recovery could not commit safely; the current config and ownership marker were preserved.'
    return 'blocked'
  }
}

function Test-DreamSkinRenderedVerificationOutput {
  param([AllowEmptyCollection()][object[]]$Output)
  try {
    $payload = ($Output -join "`n") | ConvertFrom-Json -ErrorAction Stop
    foreach ($target in @($payload.targets)) {
      $result = $target.result
      $readiness = $result.readiness
      if ($result.installed -is [bool] -and [bool]$result.installed -and
        $result.stylePresent -is [bool] -and [bool]$result.stylePresent -and
        $readiness.documentPass -is [bool] -and [bool]$readiness.documentPass -and
        $readiness.viewportPass -is [bool] -and [bool]$readiness.viewportPass -and
        $readiness.structurePass -is [bool] -and [bool]$readiness.structurePass) {
        return $true
      }
    }
  } catch {
    return $false
  }
  return $false
}

$StateRoot = Join-Path $env:LOCALAPPDATA 'CodexDreamSkin'
$ConfigPath = Join-Path $HOME '.codex\config.toml'
$BackupPath = Join-Path $StateRoot 'config.before-dream-skin.toml'
$operationLock = $null
$startFailureCategory = 'internal-start-failure'
$appearanceTransaction = $null
$appearanceRecovery = 'not-needed'
try {
  $operationLock = Enter-DreamSkinOperationLock `
    -TimeoutMilliseconds $OperationLockTimeoutMilliseconds
  if ($AutoRestartStock -and ($RestartExisting -or $PromptRestart)) {
    throw '-AutoRestartStock cannot be combined with -RestartExisting or -PromptRestart.'
  }
  if ($AutoRestartStock -and -not $AutoRestartReservationToken) {
    throw '-AutoRestartStock requires a live auto-launch reservation token.'
  }
  if (-not $AutoRestartStock -and $AutoRestartReservationToken) {
    throw '-AutoRestartReservationToken is only valid with -AutoRestartStock.'
  }
  Assert-DreamSkinPort -Port $Port
  if ($ProfilePath) { $ProfilePath = [System.IO.Path]::GetFullPath($ProfilePath) }
  $node = Get-DreamSkinNodeRuntime
  $currentCodex = Get-DreamSkinCodexInstall
  $codex = $currentCodex
  $windowEffects = Read-DreamSkinWindowEffects -StateRoot $StateRoot
  $windowMaterial = $windowEffects.WindowMaterial
  $acrylicTransparencyReady = $false
  $acrylicHelper = Join-Path $PSScriptRoot 'acrylic-window.ps1'
  if ($windowMaterial -ceq 'acrylic') {
    $acrylicEnvironment = Get-DreamSkinAcrylicEnvironment
    if (-not $acrylicEnvironment.Supported) {
      throw "Desktop Acrylic requires Windows 11 build 22621 or newer with Transparency effects enabled. Current build: $($acrylicEnvironment.Build)."
    }
    if (-not (Test-Path -LiteralPath $acrylicHelper -PathType Leaf)) {
      throw "The managed Desktop Acrylic helper is missing: $acrylicHelper"
    }
    $codexConfigPath = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex\config.toml'
    $acrylicTransparencyReady = Test-DreamSkinAcrylicTransparencyConfig `
      -ConfigPath $codexConfigPath
    if (-not (Test-DreamSkinAcrylicTransparencyConfigManageable -ConfigPath $codexConfigPath)) {
      throw 'Desktop Acrylic cannot safely manage opaqueWindows = false in the active Codex light chrome theme; no app process or native window was changed.'
    }
    if ($ForegroundInjector) {
      throw 'Desktop Acrylic currently requires the managed background injector; remove -ForegroundInjector or set window effects to System.'
    }
  }
  $language = Resolve-DreamSkinLanguage -StateRoot $StateRoot
  $themePaths = Get-DreamSkinThemePaths -StateRoot $StateRoot
  Ensure-DreamSkinManagedDirectory -Path $themePaths.Root -Root $themePaths.Root
  if (-not $ProfilePathExplicit) {
    # Chromium 136+ ignores remote-debugging switches for its default data
    # directory. Keep Dream Skin on a separate persistent profile so current
    # Codex builds can expose CDP without weakening or modifying the official
    # profile. A caller-provided path remains an explicit advanced override.
    $ProfilePath = [System.IO.Path]::GetFullPath((Join-Path $StateRoot 'cdp-profile'))
    Ensure-DreamSkinManagedDirectory -Path $ProfilePath -Root $StateRoot
  }
  $StatePath = Join-Path $StateRoot 'state.json'
  $StdoutPath = Join-Path $StateRoot 'injector.log'
  $StderrPath = Join-Path $StateRoot 'injector-error.log'
  $VerifyPath = Join-Path $StateRoot 'verify.log'
  $AcrylicStdoutPath = Join-Path $StateRoot 'acrylic-monitor.log'
  $AcrylicStderrPath = Join-Path $StateRoot 'acrylic-monitor-error.log'
  $themePaths = Initialize-DreamSkinThemeStore -SkillRoot (Split-Path -Parent $PSScriptRoot) -StateRoot $StateRoot
  $pauseWasSet = Test-DreamSkinPaused -StateRoot $StateRoot
  if ($RequireUnpaused -and $pauseWasSet) {
    $startFailureCategory = 'superseded'
    throw 'A newer pause request superseded this theme apply before renderer verification.'
  }
  $autoLaunchScript = $null
  $autoRestartReservation = $null
  $autoRestartExpectedSessionId = $null
  $autoSessionParameters = @{}
  if ($AutoRestartStock) {
    $autoLaunchScript = Join-Path (Split-Path -Parent $Injector) 'auto-launch-dream-skin.ps1'
    $autoRestartReservation = Assert-DreamSkinAutoRestartReservation -StateRoot $StateRoot `
      -Token $AutoRestartReservationToken -ExpectedScriptPath $autoLaunchScript
    $autoRestartExpectedSessionId = [int]$autoRestartReservation.SessionId
    $autoSessionParameters = @{ ExpectedSessionId = $autoRestartExpectedSessionId }
  }

  $previousState = Read-DreamSkinState -Path $StatePath
  $previousStateOwnership = Get-DreamSkinRecordedStateSessionOwnership `
    -State $previousState -StateRoot $StateRoot
  if ($previousStateOwnership.IsLive) {
    $launcherProcess = Get-Process -Id $PID -ErrorAction Stop
    try { $launcherSessionId = [int]$launcherProcess.SessionId } finally {
      $launcherProcess.Dispose()
    }
    $expectedOwnerSessionId = if ($AutoRestartStock) {
      $autoRestartExpectedSessionId
    } else {
      $launcherSessionId
    }
    if ([int]$previousStateOwnership.SessionId -ne [int]$expectedOwnerSessionId) {
      $ownershipMessage =
        'A live Dream Skin session in another Windows session owns the shared managed state.'
      if ($AutoRestartStock) {
        Write-Host "Automatic Dream Skin restart skipped: $ownershipMessage"
        return
      }
      throw "$ownershipMessage Close or restore that session before reapplying the skin here."
    }
  }
  if (-not $PortExplicit -and $null -ne $previousState -and $previousState.port) {
    $savedPort = [int]$previousState.port
    Assert-DreamSkinPort -Port $savedPort
    $Port = $savedPort
  }
  $savedPathCandidate = Get-DreamSkinCodexStatePathCandidate -State $previousState
  $savedCodex = Get-DreamSkinCodexInstallFromState -State $previousState
  $candidateMatchesCurrent = [bool]($null -ne $savedPathCandidate -and
    (Test-DreamSkinPathEqual -Left $savedPathCandidate.PackageRoot -Right $currentCodex.PackageRoot) -and
    (Test-DreamSkinPathEqual -Left $savedPathCandidate.Executable -Right $currentCodex.Executable))
  if ($null -ne $savedPathCandidate -and $null -eq $savedCodex -and -not $candidateMatchesCurrent) {
    $unverifiedSavedRunning =
      (Get-DreamSkinCodexProcesses -Codex $savedPathCandidate @autoSessionParameters).Count -gt 0
    $unverifiedSavedOwnsPort = Test-DreamSkinCodexPortOwner -Port $Port `
      -Codex $savedPathCandidate @autoSessionParameters
    if ($unverifiedSavedRunning -or $unverifiedSavedOwnsPort) {
      throw 'The saved Codex path is still active but no longer matches a registered OpenAI.Codex package. Close it manually; state was preserved.'
    }
  }

  $currentProcesses = Get-DreamSkinCodexProcesses -Codex $currentCodex @autoSessionParameters
  $codexToStop = $currentCodex
  $cdpIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $currentCodex `
    @autoSessionParameters
  if ($null -eq $cdpIdentity) {
    # After a Store auto-update the running (older) package still owns the
    # verified endpoint while Get-DreamSkinCodexInstall already resolves to
    # the new one.  Adopt the running install instead of restarting it.
    $runningRegistered = Get-DreamSkinVerifiedCdpIdentityForAnyRegistered -Port $Port `
      @autoSessionParameters
    if ($null -ne $runningRegistered) {
      $cdpIdentity = $runningRegistered.Identity
      $codex = $runningRegistered.Codex
      $codexToStop = $runningRegistered.Codex
    }
  }
  $savedIsDifferent = [bool]($null -ne $savedCodex -and
    -not (Test-DreamSkinPathEqual -Left $savedCodex.Executable -Right $currentCodex.Executable))
  if ($savedIsDifferent) {
    $savedProcesses = Get-DreamSkinCodexProcesses -Codex $savedCodex @autoSessionParameters
    $savedOwnsPort = Test-DreamSkinCodexPortOwner -Port $Port -Codex $savedCodex `
      @autoSessionParameters
    if ($currentProcesses.Count -gt 0 -and ($savedProcesses.Count -gt 0 -or $savedOwnsPort)) {
      throw 'Multiple registered Codex package versions are active. Close them manually before starting Dream Skin.'
    }
    if ($savedProcesses.Count -gt 0 -or $savedOwnsPort) {
      if ($savedOwnsPort -and $savedProcesses.Count -eq 0) {
        throw 'The saved Codex listener is active but its process cannot be managed safely; state was preserved.'
      }
      $savedIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $savedCodex `
        @autoSessionParameters
      if ($null -ne $savedIdentity) {
        $codex = $savedCodex
        $codexToStop = $savedCodex
        $cdpIdentity = $savedIdentity
        Write-Warning 'Reapplying Dream Skin to the still-running registered Codex version; the current Store version will be used after that app exits.'
      } else {
        $codexToStop = $savedCodex
        $currentProcesses = $savedProcesses
      }
    }
  }
  if ($windowMaterial -ceq 'acrylic' -and $null -ne $cdpIdentity -and
    -not $acrylicTransparencyReady) {
    # A live System/Mica session cannot be made renderer-transparent safely
    # while Codex owns config.toml. Route through the existing explicit restart
    # authorization so the closed-app transaction can set opaqueWindows=false.
    $cdpIdentity = $null
    Write-Warning 'Desktop Acrylic requires a one-time Codex restart to enable transparent window rendering.'
  }
  $pendingAppearanceTransaction = Test-DreamSkinPendingAppearanceTransaction `
    -BackupPath $BackupPath
  if ($pendingAppearanceTransaction) {
    # A previous process ended before it could commit or recover appearance.
    # Do not reuse its live session: the locked restart path closes Codex first,
    # then Install-DreamSkinBaseTheme performs the durable three-way recovery.
    $appearanceRecovery = 'blocked'
    $cdpIdentity = $null
  }
  $debugReady = $null -ne $cdpIdentity
  $codexProcesses = if (Test-DreamSkinPathEqual -Left $codexToStop.Executable -Right $currentCodex.Executable) {
    $currentProcesses
  } else {
    Get-DreamSkinCodexProcesses -Codex $codexToStop @autoSessionParameters
  }
  if ($AutoRestartStock) {
    # Revalidate both the reservation and the complete registered Codex process
    # set under the operation mutex. A session that exited, was replaced, or
    # gained another process cannot transfer its one-shot authorization.
    $autoRestartReservation = Assert-DreamSkinAutoRestartReservation -StateRoot $StateRoot `
      -Token $AutoRestartReservationToken -ExpectedScriptPath $autoLaunchScript
    try {
      $autoRestartSnapshot = Get-DreamSkinRegisteredCodexProcessSnapshot `
        -RegisteredInstalls @(Get-DreamSkinRegisteredCodexInstalls) `
        -ExpectedSessionId $autoRestartExpectedSessionId
    } catch {
      Write-Host "Automatic Dream Skin restart skipped: the reserved Codex process set could not be verified: $($_.Exception.Message)"
      return
    }
    if (-not (Test-DreamSkinAutoRestartTargetProcessesEqual `
        -Reserved @($autoRestartReservation.TargetProcesses) `
        -Current @($autoRestartSnapshot.TargetProcesses))) {
      Write-Host 'Automatic Dream Skin restart skipped: the reserved Codex process set exited, changed, or gained another process.'
      return
    }
    $targetsMatchSelectedInstall = @($autoRestartReservation.TargetProcesses | Where-Object {
      -not (Test-DreamSkinPathEqual -Left "$($_.executablePath)" -Right "$($codexToStop.Executable)") -or
      "$($_.packageFullName)" -ine "$($codexToStop.PackageFullName)" -or
      "$($_.packageFamilyName)" -ine "$($codexToStop.PackageFamilyName)"
    }).Count -eq 0
    if (-not $targetsMatchSelectedInstall) {
      Write-Host 'Automatic Dream Skin restart skipped: the reserved processes do not belong to the one selected Codex Store install.'
      return
    }
    $codexProcesses = @($autoRestartSnapshot.Processes)
  }
  $closedExistingCodex = $false
  if (-not $debugReady -and $codexProcesses.Count -gt 0) {
    $restartAuthorized = [bool]($RestartExisting -or $AutoRestartStock)
    if ($AutoRestartStock) {
      $debugIntent = Get-DreamSkinCodexAnyDebugIntentStatus -Processes $codexProcesses
      if ($debugIntent -ne 'none') {
        Write-Host "Automatic Dream Skin restart skipped: Codex debug intent is $debugIntent."
        return
      }
      if (Test-DreamSkinPaused -StateRoot $StateRoot) {
        Write-Host 'Automatic Dream Skin restart skipped: the skin was paused.'
        return
      }
      $latestAutoRestartReservation = Assert-DreamSkinAutoRestartReservation `
        -StateRoot $StateRoot -Token $AutoRestartReservationToken `
        -ExpectedScriptPath $autoLaunchScript
      if (-not (Test-DreamSkinAutoRestartTargetProcessesEqual `
          -Reserved @($autoRestartReservation.TargetProcesses) `
          -Current @($latestAutoRestartReservation.TargetProcesses))) {
        Write-Host 'Automatic Dream Skin restart skipped: the process reservation changed before shutdown.'
        return
      }
      $autoRestartReservation = $latestAutoRestartReservation
    }
    if (-not $restartAuthorized -and $PromptRestart) {
      $restartAuthorized = Confirm-DreamSkinRestart -Message `
        (Get-DreamSkinText -Key 'RestartPrompt' -Language $language)
      if (-not $restartAuthorized) {
        Write-Host (Get-DreamSkinText -Key 'LaunchCancelled' -Language $language)
        exit 0
      }
    }
    if (-not $restartAuthorized) {
      throw 'Codex is open without a verified Dream Skin CDP endpoint. Close it first or explicitly use -RestartExisting.'
    }
    if ($AutoRestartStock) {
      Stop-DreamSkinCodex -Codex $codexToStop -AllowForce `
        -ExpectedAutoRestartTargets @($autoRestartReservation.TargetProcesses) `
        -AutoRestartStateRoot $StateRoot
    } else {
      Stop-DreamSkinCodex -Codex $codexToStop -AllowForce
    }
    $closedExistingCodex = $true
    $codex = $currentCodex
    if ($AutoRestartStock) {
      try {
        Assert-DreamSkinAutoRestartStableZero -StateRoot $StateRoot `
          -ExpectedSessionId $autoRestartExpectedSessionId
      } catch {
        Invoke-DreamSkinAutoRestartStockRecovery -StateRoot $StateRoot `
          -Codex $currentCodex -ExpectedSessionId $autoRestartExpectedSessionId `
          -FailureMessage "Automatic Dream Skin restart stopped after the reserved close: $($_.Exception.Message)"
      }
    }
  }

  $launchedWithCdp = $false
  $debugLaunchAttempted = $false
  $debugLaunch = $null
  $debugLaunchBaselineProcessIds = @()
  # Latches positive renderer evidence when only the native-window probe is inconclusive.
  $skinLooksRendered = $false
  $acrylicDescriptor = $null
  try {
    if ($pendingAppearanceTransaction) {
      $startFailureCategory = 'state-reconciliation-failed'
      try {
        $pendingRecovery = Resolve-DreamSkinPendingAppearanceTransaction `
          -ConfigPath $ConfigPath -BackupPath $BackupPath
        if ($null -ne $pendingRecovery -and
          ($pendingRecovery.ConflictedKeys.Count -gt 0 -or
            "$($pendingRecovery.MarkerStatus)" -ceq 'conflict-preserved')) {
          Write-Warning 'Interrupted appearance recovery preserved newer user changes.'
        }
        $pendingAppearanceTransaction = $false
      } catch {
        $appearanceRecovery = 'blocked'
        throw 'Interrupted startup appearance could not be recovered safely; config was preserved.'
      }
    }
    if ($null -eq (Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $codex `
        @autoSessionParameters)) {
      # Codex is closed on this path; sync the appearanceTheme pin to the
      # active theme before launching (config writes race the app while it runs).
      try {
        $appearanceTransaction = Install-DreamSkinBaseTheme `
          -ConfigPath $ConfigPath -BackupPath $BackupPath `
          -AppearanceTheme (Get-DreamSkinActiveThemeAppearance -ThemeDirectory $themePaths.Active) `
          -TransparentWindows:($windowMaterial -ceq 'acrylic') `
          -PassThruTransaction
        if ($null -ne $appearanceTransaction) { $appearanceRecovery = 'retained' }
      } catch {
        $appearanceTransaction = $null
        $appearanceRecovery = 'not-needed'
        Write-Warning "Could not sync Codex appearanceTheme to the active theme: $($_.Exception.Message)"
      }
      if ($windowMaterial -ceq 'acrylic' -and
        -not (Test-DreamSkinAcrylicTransparencyConfig -ConfigPath $codexConfigPath)) {
        throw 'The Codex theme sync did not preserve opaqueWindows = false for Desktop Acrylic.'
      }
      $startFailureCategory = 'port-unavailable'
      if (-not (Test-DreamSkinPortAvailable -Port $Port)) {
        $Port = Resolve-DreamSkinStartPort -Port $Port -PortExplicit $PortExplicit
      }
      $arguments = @('--remote-debugging-address=127.0.0.1', "--remote-debugging-port=$Port")
      if ($ProfilePathExplicit) {
        New-Item -ItemType Directory -Force -Path $ProfilePath | Out-Null
      }
      $arguments += "--user-data-dir=$ProfilePath"
      if ($AutoRestartStock) {
        try {
          Assert-DreamSkinAutoRestartControlClear -StateRoot $StateRoot
          $preLaunchSnapshot = Get-DreamSkinRegisteredCodexProcessSnapshot `
            -RegisteredInstalls @(Get-DreamSkinRegisteredCodexInstalls) `
            -ExpectedSessionId $autoRestartExpectedSessionId
          if (@($preLaunchSnapshot.TargetProcesses).Count -ne 0) {
            throw 'A new Codex process appeared at the automatic activation boundary.'
          }
        } catch {
          Invoke-DreamSkinAutoRestartStockRecovery -StateRoot $StateRoot `
            -Codex $currentCodex -ExpectedSessionId $autoRestartExpectedSessionId `
            -FailureMessage "Automatic Dream Skin activation failed before direct launch: $($_.Exception.Message)"
        }
      }
      $debugLaunchAttempted = $true
      $startFailureCategory = 'cdp-launch-failed'
      if ($AutoRestartStock) {
        # The official handoff has already closed one exact reserved session and
        # proved a same-session stable zero. Launch the validated Store
        # executable directly so a package-protocol redirect does not require a
        # broad cleanup/retry. Any failure preserves every process it created.
        $directProcessId = Start-DreamSkinCodexDirect -Codex $codex -Arguments $arguments
        $directStatus = Wait-DreamSkinCodexDebugArgumentStatus -Codex $codex -Port $Port `
          @autoSessionParameters
        if ($directStatus -in @('protocol-redirected', 'not-forwarded')) {
          throw "Automatic Dream Skin direct launch did not retain the CDP arguments ($directStatus); its processes were preserved."
        }
        $debugLaunch = [pscustomobject]@{
          ProcessId = $directProcessId
          Strategy = 'direct-store-executable'
          ArgumentStatus = $directStatus
          PackageArgumentStatus = 'not-attempted'
        }
      } else {
        $debugLaunchBaselineProcessIds = @(
          Get-DreamSkinCodexProcesses -Codex $codex @autoSessionParameters |
            ForEach-Object { [int]$_.ProcessId }
        )
        $debugLaunch = Start-DreamSkinCodexForDebugging -Codex $codex -Arguments $arguments `
          -Port $Port -PreserveProcessIds $debugLaunchBaselineProcessIds
      }
      $launchedWithCdp = $true
      if ($debugLaunch.Strategy -eq 'direct-store-executable' -and
        $debugLaunch.PackageArgumentStatus -ne 'not-attempted') {
        Write-Warning 'Codex package activation did not preserve the CDP arguments; using the validated Store executable fallback for this session.'
      }
    }

    $startFailureCategory = 'cdp-endpoint-unavailable'
    $deadline = (Get-Date).AddSeconds(45)
    $cdpIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $codex `
      @autoSessionParameters
    while ($null -eq $cdpIdentity) {
      $argumentStatus = Get-DreamSkinCodexDebugArgumentStatus `
        -Processes @(Get-DreamSkinCodexProcesses -Codex $codex @autoSessionParameters) `
        -Port $Port
      if ($argumentStatus -eq 'protocol-redirected') {
        throw "Codex $($codex.Version) converted the CDP argument into a codex:// navigation path instead of opening a debugging endpoint."
      }
      if ((Get-Date) -ge $deadline) {
        if ($null -ne $debugLaunch -and $debugLaunch.Strategy -eq 'direct-store-executable') {
          throw "The validated direct Store executable fallback did not expose a verified loopback CDP endpoint on port $Port within 45 seconds. Codex $($codex.Version) may disable CDP in this production runtime; no protected app files or permissions were changed."
        }
        throw "Codex did not expose a verified loopback CDP endpoint on port $Port within 45 seconds."
      }
      Start-Sleep -Milliseconds 400
      $cdpIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $codex `
        @autoSessionParameters
    }
    $win32Window = Wait-DreamSkinWin32WindowEvidence -Codex $codex `
      -TimeoutMilliseconds 30000 @autoSessionParameters
    if ($null -eq $win32Window) {
      throw 'Codex exposed CDP without a verified visible Win32 HWND owned by the registered executable.'
    }
    $win32WindowArgs = @(
      '--win32-window-pid', "$($win32Window.ProcessId)",
      '--win32-window-hwnd', "$($win32Window.Handle)",
      '--win32-window-width', "$($win32Window.Width)",
      '--win32-window-height', "$($win32Window.Height)"
    )
    if ($windowMaterial -ceq 'acrylic') {
      $descriptors = @(& $acrylicHelper -Action Describe `
        -TargetProcessId $win32Window.ProcessId `
        -ExpectedWindowHandle ([long]$win32Window.Handle))
      if ($descriptors.Count -ne 1) {
        throw 'The Desktop Acrylic helper did not return exactly one pinned Codex window descriptor.'
      }
      $acrylicDescriptor = $descriptors[0]
      if ([int]$acrylicDescriptor.ProcessId -ne [int]$win32Window.ProcessId -or
        "$($acrylicDescriptor.ExecutablePath)" -ine "$($codex.Executable)" -or
        "$($acrylicDescriptor.PackageFamilyName)" -cne "$($codex.PackageFamilyName)" -or
        [long]$acrylicDescriptor.WindowHandleValue -ne [long]$win32Window.Handle -or
        [int]$acrylicDescriptor.CurrentBackdrop -notin @(2, 3)) {
        throw 'The Desktop Acrylic descriptor does not match the exact verified Store Codex HWND or a supported native backdrop.'
      }
    }
    $injectorWindowArgs = $win32WindowArgs + @('--window-material', $windowMaterial)
  } catch {
    $launchError = $_
    if ($debugLaunchAttempted -and -not $AutoRestartStock) {
      try {
        Stop-DreamSkinCodex -Codex $codex `
          -PreserveProcessIds $debugLaunchBaselineProcessIds -AllowForce
      } catch {
        Write-Warning 'Launch rollback could not fully close the failed CDP session.'
      }
    }
    $failedLaunchClosed =
      (Get-DreamSkinCodexProcesses -Codex $codex @autoSessionParameters).Count -eq 0
    if ($null -ne $appearanceTransaction) {
      if ($failedLaunchClosed) {
        $appearanceRecovery = Invoke-DreamSkinStartupAppearanceRecovery `
          -Transaction $appearanceTransaction -ConfigPath $ConfigPath -BackupPath $BackupPath
      } else {
        $appearanceRecovery = 'blocked'
        Write-Warning 'Startup appearance recovery was blocked because the failed Codex process could not be confirmed closed.'
      }
    }
    if ($AutoRestartStock -and ($closedExistingCodex -or $debugLaunchAttempted)) {
      Invoke-DreamSkinAutoRestartStockRecovery -StateRoot $StateRoot `
        -Codex $currentCodex -ExpectedSessionId $autoRestartExpectedSessionId `
        -FailureMessage "Automatic Dream Skin launch failed: $($launchError.Exception.Message)"
    }
    if (-not $AutoRestartStock -and
      ($closedExistingCodex -or $debugLaunchAttempted) -and $failedLaunchClosed) {
      if ($debugLaunchAttempted) {
        Write-Warning 'Dream Skin launch failed; reopening Codex without a debugging port.'
      }
      try { $null = Start-DreamSkinCodex -Codex $codex } catch {
        Write-Warning 'Launch rollback could not reopen Codex automatically.'
      }
    }
    throw $launchError
  }

  $startFailureCategory = 'state-reconciliation-failed'
  $pauseCleared = $false
  try {
    $null = Stop-DreamSkinRecordedAcrylicMonitor -State $previousState -StateRoot $StateRoot
    if ($windowMaterial -ceq 'acrylic') {
      $restoredDescriptors = @(& $acrylicHelper -Action Describe `
        -TargetProcessId $win32Window.ProcessId `
        -ExpectedWindowHandle ([long]$win32Window.Handle))
      if ($restoredDescriptors.Count -ne 1 -or
        [int]$restoredDescriptors[0].ProcessId -ne [int]$acrylicDescriptor.ProcessId -or
        [long]$restoredDescriptors[0].StartTimeFileTimeUtc -ne [long]$acrylicDescriptor.StartTimeFileTimeUtc -or
        [long]$restoredDescriptors[0].WindowHandleValue -ne [long]$acrylicDescriptor.WindowHandleValue -or
        "$($restoredDescriptors[0].ExecutablePath)" -ine "$($acrylicDescriptor.ExecutablePath)" -or
        "$($restoredDescriptors[0].PackageFamilyName)" -cne "$($acrylicDescriptor.PackageFamilyName)" -or
        [int]$restoredDescriptors[0].CurrentBackdrop -ne 2) {
        throw 'The exact Codex HWND did not return to its verified Mica baseline before Acrylic handoff.'
      }
      $acrylicDescriptor = $restoredDescriptors[0]
    }
    $recordedInjectorStopped = Stop-DreamSkinRecordedInjector -State $previousState
    if (-not $recordedInjectorStopped) {
      $staleStatePath = Archive-DreamSkinStateFile -Path $StatePath
      Write-Warning "Archived stale Dream Skin state at $staleStatePath"
    }
    # Keep a paused, already-running watcher paused until all state checks and
    # restart consent have succeeded. A cancelled prompt stays side-effect free.
    Set-DreamSkinPaused -Paused $false -StateRoot $StateRoot | Out-Null
    $pauseCleared = $true
  } catch {
    if ($launchedWithCdp) {
      if ($AutoRestartStock) {
        Write-Warning 'Automatic handoff state validation failed; the exact launched Codex processes were preserved.'
        if ($null -ne $appearanceTransaction) { $appearanceRecovery = 'blocked' }
      } else {
        $stateRollbackClosed = $false
        try {
          Stop-DreamSkinCodex -Codex $codex -AllowForce
          $stateRollbackClosed = (Get-DreamSkinCodexProcesses -Codex $codex).Count -eq 0
        } catch {
          $stateRollbackClosed = $false
        }
        if ($stateRollbackClosed) {
          $appearanceRecovery = Invoke-DreamSkinStartupAppearanceRecovery `
            -Transaction $appearanceTransaction -ConfigPath $ConfigPath -BackupPath $BackupPath
          try { $null = Start-DreamSkinCodex -Codex $codex } catch {
            Write-Warning 'State validation rollback could not reopen Codex automatically.'
          }
        } else {
          if ($null -ne $appearanceTransaction) { $appearanceRecovery = 'blocked' }
          Write-Warning 'State validation rollback could not fully close Codex; close Codex to ensure its CDP port is closed.'
        }
      }
    }
    if ($pauseWasSet) {
      try { Set-DreamSkinPaused -Paused $true -StateRoot $StateRoot | Out-Null } catch {
        Write-Warning 'State validation rollback could not restore the existing paused state.'
      }
    }
    throw
  }

  if ($AutoRestartStock) {
    try {
      Assert-DreamSkinAutoRestartControlClear -StateRoot $StateRoot
    } catch {
      throw "Automatic Dream Skin apply stopped after launch; the launched Codex session was preserved: $($_.Exception.Message)"
    }
  }
  if ($ForegroundInjector) {
    $startFailureCategory = 'injector-start-failed'
    $foregroundStopwatch = $null
    $foregroundSuperseded = $true
    $foregroundLockReleased = $false
    $foregroundBaselinePause = $null
    $foregroundBaselineFingerprint = $null
    try {
      Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
      $foregroundBaselinePause = [bool](Test-DreamSkinPaused -StateRoot $StateRoot)
      $foregroundBaselineFingerprint = Get-DreamSkinThemeRuntimeContentFingerprint `
        -ThemeDirectory $themePaths.Active
      if ($null -ne $appearanceTransaction) {
        Complete-DreamSkinAppearanceTransaction `
          -BackupPath $BackupPath -Transaction $appearanceTransaction
      }
      Exit-DreamSkinOperationLock -Mutex $operationLock
      $operationLock = $null
      $foregroundLockReleased = $true
      $foregroundStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
      & $node.Path $Injector --watch --port $Port --browser-id $cdpIdentity.BrowserId `
        --theme-dir $themePaths.Active --pause-file $themePaths.PauseFile @injectorWindowArgs
      $foregroundExitCode = $LASTEXITCODE
      if ($foregroundExitCode -ne 0) {
        throw "The foreground injector exited during startup (exit code $foregroundExitCode)."
      }
      if ($ResultToken) {
        Write-DreamSkinStartResult -StateRoot $StateRoot -Token $ResultToken `
          -Outcome 'success' -Category 'none' -AppearanceRecovery $appearanceRecovery
      }
      exit 0
    } catch {
      $foregroundError = $_
      $foregroundImmediateFailure = $null -eq $foregroundStopwatch -or
        $foregroundStopwatch.Elapsed.TotalSeconds -lt 10
      if (-not $foregroundImmediateFailure) {
        Write-Warning 'The foreground injector ended after its startup window; current Codex and appearance state were preserved.'
        throw $foregroundError
      }
      if ($null -eq $operationLock) {
        try {
          $operationLock = Enter-DreamSkinOperationLock `
            -TimeoutMilliseconds $OperationLockTimeoutMilliseconds
        } catch {
          if ($null -ne $appearanceTransaction) { $appearanceRecovery = 'blocked' }
          Write-Warning 'Foreground startup recovery could not reacquire the operation lock.'
        }
      }
      if ($null -ne $operationLock) {
        if (-not $foregroundLockReleased) {
          $foregroundSuperseded = $false
        } else {
          try {
            $foregroundCurrentPause = [bool](Test-DreamSkinPaused -StateRoot $StateRoot)
            $foregroundCurrentFingerprint = Get-DreamSkinThemeRuntimeContentFingerprint `
              -ThemeDirectory $themePaths.Active
            $foregroundSuperseded = $null -ne (Read-DreamSkinState -Path $StatePath) -or
              $foregroundCurrentPause -ne $foregroundBaselinePause -or
              "$foregroundCurrentFingerprint" -cne "$foregroundBaselineFingerprint"
          } catch {
            $foregroundSuperseded = $true
          }
        }
      }
      if ($launchedWithCdp -and $null -ne $operationLock) {
        $foregroundClosed = $false
        try {
          if (-not $foregroundSuperseded) {
            $foregroundProcesses = @(Get-DreamSkinCodexProcesses -Codex $codex)
            if ($foregroundProcesses.Count -eq 0) {
              $foregroundClosed = $true
            } else {
              $foregroundIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $codex
              if ($null -ne $foregroundIdentity -and
                "$($foregroundIdentity.BrowserId)" -ceq "$($cdpIdentity.BrowserId)") {
                Stop-DreamSkinCodex -Codex $codex -AllowForce
                $foregroundClosed = (Get-DreamSkinCodexProcesses -Codex $codex).Count -eq 0
              }
            }
          }
        } catch {
          $foregroundClosed = $false
        }
        if ($foregroundClosed) {
          $appearanceRecovery = Invoke-DreamSkinStartupAppearanceRecovery `
            -Transaction $appearanceTransaction -ConfigPath $ConfigPath -BackupPath $BackupPath
          try { $null = Start-DreamSkinCodex -Codex $codex } catch {
            Write-Warning 'Foreground startup recovery could not reopen Codex automatically.'
          }
        } else {
          if ($null -ne $appearanceTransaction) { $appearanceRecovery = 'blocked' }
          if ($foregroundSuperseded) {
            Write-Warning 'Foreground startup recovery was superseded by a newer managed session.'
          } else {
            Write-Warning 'Foreground startup recovery could not confirm that its Codex session was closed.'
          }
        }
      }
      if ($pauseWasSet -and $null -ne $operationLock -and -not $foregroundSuperseded) {
        try { Set-DreamSkinPaused -Paused $true -StateRoot $StateRoot | Out-Null } catch {
          Write-Warning 'Foreground startup rollback could not restore the existing paused state.'
        }
      }
      throw $foregroundError
    }
  }

  $state = $null
  $daemon = $null
  $acrylicMonitor = $null
  $acrylicMonitorStartedAt = $null
  $acrylicStopFile = $null
  $acrylicArmFile = $null
  $startFailureCategory = 'injector-start-failed'
  try {
    $injectorArgs = @((ConvertTo-DreamSkinProcessArgument -Value $Injector), '--watch', '--port', "$Port",
      '--browser-id', $cdpIdentity.BrowserId, '--theme-dir',
      (ConvertTo-DreamSkinProcessArgument -Value $themePaths.Active), '--pause-file',
      (ConvertTo-DreamSkinProcessArgument -Value $themePaths.PauseFile)) + $injectorWindowArgs
    $daemon = Start-Process -FilePath $node.Path -ArgumentList $injectorArgs -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput $StdoutPath -RedirectStandardError $StderrPath
    Start-Sleep -Milliseconds 500
    if ($daemon.HasExited) { throw "The injector exited during startup. See $StderrPath" }

    $injectorStartedAt = Get-DreamSkinProcessStartedAt -ProcessId $daemon.Id
    if (-not $injectorStartedAt) { throw 'The injector process identity could not be recorded safely.' }
    if ($windowMaterial -ceq 'acrylic') {
      $acrylicStopFile = Join-Path $StateRoot `
        ('acrylic-monitor-' + [guid]::NewGuid().ToString('N') + '.stop')
      $acrylicArmFile = Join-Path $StateRoot `
        ('acrylic-monitor-' + [guid]::NewGuid().ToString('N') + '.arm')
      Assert-DreamSkinNoReparseComponents -Path $acrylicStopFile
      Assert-DreamSkinNoReparseComponents -Path $acrylicArmFile
      if ((Test-Path -LiteralPath $acrylicStopFile) -or
        (Test-Path -LiteralPath $acrylicArmFile)) {
        throw 'A new Acrylic monitor control path already exists.'
      }
    }
    $state = [pscustomobject]@{
      schemaVersion = 3
      platform = 'windows'
      port = $Port
      injectorPid = $daemon.Id
      injectorStartedAt = $injectorStartedAt
      injectorPath = $Injector
      nodePath = $node.Path
      nodeVersion = $node.Version
      codexExe = $codex.Executable
      codexPackageRoot = $codex.PackageRoot
      codexPackageFullName = $codex.PackageFullName
      codexPackageFamilyName = $codex.PackageFamilyName
      codexVersion = $codex.Version
      codexPid = [int]$win32Window.ProcessId
      codexStartTimeFileTimeUtc = [long]$win32Window.StartTimeFileTimeUtc
      codexSessionId = [int]$win32Window.SessionId
      browserId = $cdpIdentity.BrowserId
      profilePath = $ProfilePath
      themeDir = $themePaths.Active
      pauseFile = $themePaths.PauseFile
      windowMaterial = $windowMaterial
      nativeBackdropBefore = if ($null -ne $acrylicDescriptor) { [int]$acrylicDescriptor.CurrentBackdrop } else { $null }
      acrylicMonitorPid = $null
      acrylicMonitorStartedAt = $null
      acrylicMonitorPath = if ($null -ne $acrylicDescriptor) { $acrylicHelper } else { $null }
      acrylicMonitorStopFile = $acrylicStopFile
      acrylicMonitorArmFile = $acrylicArmFile
      acrylicTargetPid = if ($null -ne $acrylicDescriptor) { [int]$acrylicDescriptor.ProcessId } else { $null }
      acrylicTargetStartTimeFileTimeUtc = if ($null -ne $acrylicDescriptor) { [long]$acrylicDescriptor.StartTimeFileTimeUtc } else { $null }
      acrylicTargetExecutablePath = if ($null -ne $acrylicDescriptor) { "$($acrylicDescriptor.ExecutablePath)" } else { $null }
      acrylicTargetPackageFamilyName = if ($null -ne $acrylicDescriptor) { "$($acrylicDescriptor.PackageFamilyName)" } else { $null }
      acrylicTargetWindowClass = if ($null -ne $acrylicDescriptor) { "$($acrylicDescriptor.WindowClass)" } else { $null }
      acrylicTargetWindowHandle = if ($null -ne $acrylicDescriptor) { [long]$acrylicDescriptor.WindowHandleValue } else { $null }
      startupPhase = if ($null -ne $acrylicDescriptor) { 'acrylic-monitor-spawning' } else { 'verifying' }
      createdAt = (Get-Date).ToUniversalTime().ToString('o')
    }
    # Persist the target and control files before an unarmed monitor exists.
    # A hard crash can therefore leave no unrecorded native Acrylic write.
    Write-DreamSkinState -Path $StatePath -State $state
    if ($windowMaterial -ceq 'acrylic') {
      $powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
      $monitorTokens = @(
        '-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'RemoteSigned',
        '-File', $acrylicHelper,
        '-Action', 'Monitor',
        '-TargetProcessId', "$($acrylicDescriptor.ProcessId)",
        '-ExpectedStartTimeFileTimeUtc', "$($acrylicDescriptor.StartTimeFileTimeUtc)",
        '-ExpectedExecutablePath', "$($acrylicDescriptor.ExecutablePath)",
        '-ExpectedPackageFamilyName', "$($acrylicDescriptor.PackageFamilyName)",
        '-ExpectedWindowClass', "$($acrylicDescriptor.WindowClass)",
        '-ExpectedWindowHandle', "$($acrylicDescriptor.WindowHandleValue)",
        '-StopFile', $acrylicStopFile,
        '-ArmFile', $acrylicArmFile,
        '-ConfirmTargetIdentity'
      )
      $monitorArgumentLine = ($monitorTokens | ForEach-Object {
        ConvertTo-DreamSkinProcessArgument -Value "$_"
      }) -join ' '
      $acrylicMonitor = Start-Process -FilePath $powershellPath -ArgumentList $monitorArgumentLine `
        -WindowStyle Hidden -PassThru -RedirectStandardOutput $AcrylicStdoutPath `
        -RedirectStandardError $AcrylicStderrPath
      Start-Sleep -Milliseconds 300
      if ($acrylicMonitor.HasExited) {
        throw "The Desktop Acrylic monitor exited during startup. See $AcrylicStderrPath"
      }
      $acrylicMonitorStartedAt = Get-DreamSkinProcessStartedAt -ProcessId $acrylicMonitor.Id
      if (-not $acrylicMonitorStartedAt) {
        throw 'The Desktop Acrylic monitor process identity could not be recorded safely.'
      }
      $state.acrylicMonitorPid = $acrylicMonitor.Id
      $state.acrylicMonitorStartedAt = $acrylicMonitorStartedAt
      $state.startupPhase = 'acrylic-monitor-recorded'
      Write-DreamSkinState -Path $StatePath -State $state
      Write-DreamSkinUtf8FileAtomically -Path $acrylicArmFile `
        -Content ("armedAt=" + [DateTime]::UtcNow.ToString('o') + "`r`n")
      $acrylicDeadline = [DateTime]::UtcNow.AddSeconds(8)
      $acrylicApplied = $false
      do {
        if ($acrylicMonitor.HasExited) {
          throw "The Desktop Acrylic monitor exited before applying the material. See $AcrylicStderrPath"
        }
        try {
          $probes = @(& $acrylicHelper -Action Probe `
            -TargetProcessId $acrylicDescriptor.ProcessId `
            -ExpectedStartTimeFileTimeUtc $acrylicDescriptor.StartTimeFileTimeUtc `
            -ExpectedExecutablePath $acrylicDescriptor.ExecutablePath `
            -ExpectedPackageFamilyName $acrylicDescriptor.PackageFamilyName `
            -ExpectedWindowClass $acrylicDescriptor.WindowClass `
            -ExpectedWindowHandle $acrylicDescriptor.WindowHandleValue)
          $acrylicApplied = $probes.Count -eq 1 -and [int]$probes[0].CurrentBackdrop -eq 3
        } catch {
          $acrylicApplied = $false
        }
        if (-not $acrylicApplied) { Start-Sleep -Milliseconds 200 }
      } while (-not $acrylicApplied -and [DateTime]::UtcNow -lt $acrylicDeadline)
      if (-not $acrylicApplied) {
        throw 'Windows did not retain Desktop Acrylic on the verified Codex window.'
      }
      Remove-Item -LiteralPath $acrylicArmFile -Force -ErrorAction SilentlyContinue
      $state.startupPhase = 'verifying'
      Write-DreamSkinState -Path $StatePath -State $state
    }

    $startFailureCategory = 'renderer-verification-failed'
    # The one-shot verify races Codex's first paint: on a slow machine the
    # shell markers are not rendered yet when the daemon has barely started,
    # and a single early miss used to tear the whole startup down.  The
    # watcher keeps applying in the background, so retry until a deadline.
    $verifyDeadline = (Get-Date).AddSeconds(90)
    $forceInjectedAfterVerifyFailure = $false
    while ($true) {
      $verifyArguments = @(
        $Injector, '--verify', '--port', "$Port",
        '--browser-id', $cdpIdentity.BrowserId, '--theme-dir', $themePaths.Active,
        '--timeout-ms', '30000', '--allow-hidden-document'
      ) + $injectorWindowArgs
      $verify = Invoke-DreamSkinNative -FilePath $node.Path -ArgumentList $verifyArguments
      Write-DreamSkinUtf8FileAtomically -Path $VerifyPath -Content (($verify.Output -join "`r`n") + "`r`n")
      if ($verify.ExitCode -eq 0) { break }
      # A verify can fail while the theme is demonstrably on screen: the
      # renderer reports the document visible, the viewport sized and the shell
      # structure present, and only the native-window probe -- which some Codex
      # builds never resolve -- comes back false.  Killing Codex in that state
      # destroys a working skin the user is looking at, so remember it and let
      # the rollback below leave the app alone (#267).
      if (Test-DreamSkinRenderedVerificationOutput -Output $verify.Output) {
        # Latch positive evidence. A later transient or malformed probe must not
        # erase proof that a complete skin was already visible on screen.
        $skinLooksRendered = $true
      }
      if (-not $forceInjectedAfterVerifyFailure) {
        $forceInjectedAfterVerifyFailure = $true
        try { [void](Invoke-DreamSkinCodexWindowActivation -Codex $codex) } catch {}
        $onceArguments = @(
          $Injector, '--once', '--port', "$Port",
          '--browser-id', $cdpIdentity.BrowserId, '--theme-dir', $themePaths.Active,
          '--timeout-ms', '15000', '--allow-hidden-document'
        ) + $injectorWindowArgs
        $once = Invoke-DreamSkinNative -FilePath $node.Path -ArgumentList $onceArguments
        Write-DreamSkinUtf8FileAtomically -Path $VerifyPath -Content (
          (($verify.Output + $once.Output) -join "`r`n") + "`r`n"
        )
        if (Test-DreamSkinRenderedVerificationOutput -Output $once.Output) {
          $skinLooksRendered = $true
        }
        if ($once.ExitCode -eq 0) { break }
      }
      if ($daemon.HasExited) { throw "The injector exited during startup. See $StderrPath" }
      if ((Get-Date) -ge $verifyDeadline) { throw "Dream Skin verification failed. See $VerifyPath" }
      Start-Sleep -Seconds 3
    }
    if ($null -ne $appearanceTransaction) {
      Complete-DreamSkinAppearanceTransaction `
        -BackupPath $BackupPath -Transaction $appearanceTransaction
    }
    $state.startupPhase = 'active'
    Write-DreamSkinState -Path $StatePath -State $state
  } catch {
    $startupError = $_
    $acrylicStopped = $true
    if ($null -ne $acrylicMonitor) {
      try {
        if (-not $acrylicMonitor.HasExited -and $acrylicStopFile) {
          if (-not (Test-Path -LiteralPath $acrylicStopFile)) {
            Write-DreamSkinUtf8FileAtomically -Path $acrylicStopFile `
              -Content ("stopRequestedAt=" + [DateTime]::UtcNow.ToString('o') + "`r`n")
          }
          [void]$acrylicMonitor.WaitForExit(15000)
        }
        if (-not $acrylicMonitor.HasExited) {
          # Stop the loop before restoring; otherwise it can race the rollback
          # and immediately reapply Acrylic after a successful Mica write.
          Stop-Process -InputObject $acrylicMonitor -Force -ErrorAction Stop
          [void]$acrylicMonitor.WaitForExit(5000)
        }
        if ($null -ne $acrylicDescriptor) {
          [void](& $acrylicHelper -Action Restore `
            -TargetProcessId $acrylicDescriptor.ProcessId `
            -ExpectedStartTimeFileTimeUtc $acrylicDescriptor.StartTimeFileTimeUtc `
            -ExpectedExecutablePath $acrylicDescriptor.ExecutablePath `
            -ExpectedPackageFamilyName $acrylicDescriptor.PackageFamilyName `
            -ExpectedWindowClass $acrylicDescriptor.WindowClass `
            -ExpectedWindowHandle $acrylicDescriptor.WindowHandleValue `
            -ConfirmTargetIdentity)
        }
        $acrylicStopped = $acrylicMonitor.HasExited
      } catch {
        $acrylicStopped = $false
        Write-Warning 'Startup rollback could not fully stop the newly created Desktop Acrylic monitor.'
      } finally {
        if ($acrylicStopFile -and $acrylicStopped) {
          Remove-Item -LiteralPath $acrylicStopFile -Force -ErrorAction SilentlyContinue
        }
      }
    }
    if ($acrylicArmFile -and $acrylicStopped) {
      Remove-Item -LiteralPath $acrylicArmFile -Force -ErrorAction SilentlyContinue
    }
    if ($acrylicStopFile -and $acrylicStopped) {
      Remove-Item -LiteralPath $acrylicStopFile -Force -ErrorAction SilentlyContinue
    }
    # We own the daemon Process object, so stop it directly: the object is
    # immune to PID reuse, and identity re-validation cannot spuriously
    # refuse.  Slow machines also need more than a moment for teardown; a
    # premature "did not stop" here is what used to leave duelling watchers.
    $injectorStopped = $true
    if ($null -ne $daemon) {
      if (-not $daemon.HasExited) {
        try {
          Stop-Process -InputObject $daemon -Force -ErrorAction Stop
        } catch {
          Write-Warning 'The newly created injector could not be signalled during startup rollback.'
        }
      }
      [void]$daemon.WaitForExit(15000)
      $injectorStopped = $daemon.HasExited
      if (-not $injectorStopped) {
        Write-Warning "The rollback injector has not exited yet: PID $($daemon.Id). State was preserved so the next start can reconcile it."
      }
    }
    if ($injectorStopped -and -not $launchedWithCdp -and -not $skinLooksRendered) {
      try {
        $rollbackIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $codex `
          @autoSessionParameters
        if ($null -ne $rollbackIdentity -and $rollbackIdentity.BrowserId -ceq $cdpIdentity.BrowserId) {
          $removal = Invoke-DreamSkinNative -FilePath $node.Path -ArgumentList @(
            $Injector, '--remove', '--port', "$Port",
            '--browser-id', $cdpIdentity.BrowserId, '--timeout-ms', '5000') -DiscardStderr
          if ($removal.ExitCode -ne 0) { throw 'Injector removal returned a failure status.' }
        }
      } catch {
        Write-Warning 'Startup rollback could not remove the partially applied live skin; reload or close Codex to clear it.'
      }
    }
    if ($injectorStopped -and $acrylicStopped) {
      Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
    }
    if ($launchedWithCdp -and -not $skinLooksRendered) {
      if ($AutoRestartStock) {
        Write-Warning 'Automatic handoff startup rollback preserved the exact launched Codex processes.'
        if ($null -ne $appearanceTransaction) { $appearanceRecovery = 'blocked' }
      } else {
        $rendererRollbackClosed = $false
        try {
          Stop-DreamSkinCodex -Codex $codex -AllowForce
          $rendererRollbackClosed = (Get-DreamSkinCodexProcesses -Codex $codex).Count -eq 0
        } catch {
          $rendererRollbackClosed = $false
        }
        if ($rendererRollbackClosed) {
          $appearanceRecovery = Invoke-DreamSkinStartupAppearanceRecovery `
            -Transaction $appearanceTransaction -ConfigPath $ConfigPath -BackupPath $BackupPath
          try { $null = Start-DreamSkinCodex -Codex $codex } catch {
            Write-Warning 'Startup rollback could not reopen Codex automatically.'
          }
        } else {
          if ($null -ne $appearanceTransaction) { $appearanceRecovery = 'blocked' }
          Write-Warning 'Startup rollback could not fully close Codex; close Codex to ensure its CDP port is closed.'
        }
      }
    } elseif ($skinLooksRendered -and $ResultToken -and $launchedWithCdp -and
      $null -ne $appearanceTransaction) {
      # One-click apply has a parent theme-file transaction. Leaving the new
      # appearance/session alive would make any parent file rollback produce a
      # mixed theme. Close only the still-matching CDP session, recover this
      # appearance transaction, and reopen ordinary Codex before reporting.
      $renderedRollbackClosed = $false
      try {
        $renderedProcesses = @(Get-DreamSkinCodexProcesses -Codex $codex)
        if ($renderedProcesses.Count -eq 0) {
          $renderedRollbackClosed = $true
        } else {
          $renderedIdentity = Get-DreamSkinVerifiedCdpIdentity -Port $Port -Codex $codex
          if ($null -ne $renderedIdentity -and
            "$($renderedIdentity.BrowserId)" -ceq "$($cdpIdentity.BrowserId)") {
            Stop-DreamSkinCodex -Codex $codex -AllowForce
            $renderedRollbackClosed = (Get-DreamSkinCodexProcesses -Codex $codex).Count -eq 0
          }
        }
      } catch {
        $renderedRollbackClosed = $false
      }
      if ($renderedRollbackClosed) {
        $appearanceRecovery = Invoke-DreamSkinStartupAppearanceRecovery `
          -Transaction $appearanceTransaction -ConfigPath $ConfigPath -BackupPath $BackupPath
        try { $null = Start-DreamSkinCodex -Codex $codex } catch {
          Write-Warning 'Rendered-session rollback could not reopen Codex automatically.'
        }
      } else {
        $appearanceRecovery = 'blocked'
        Write-Warning 'Rendered-session rollback could not confirm the exact Codex session was closed.'
      }
    } elseif ($skinLooksRendered) {
      # The skin is on screen and only an inconclusive probe failed. Force-
      # restarting Codex here would take a working window away from the user
      # and leave them with the stock appearance, which is worse than the
      # unverified state we are in. The injector is already stopped and the
      # state file removed, so nothing claims this session is verified; Codex
      # keeps running with its debug port until the user closes it (#267).
      if ($null -ne $appearanceTransaction) {
        try {
          Complete-DreamSkinAppearanceTransaction `
            -BackupPath $BackupPath -Transaction $appearanceTransaction
          $appearanceRecovery = 'preserved-rendered'
        } catch {
          $appearanceRecovery = 'blocked'
          Write-Warning 'Rendered appearance ownership could not be committed; the pending recovery record was retained.'
        }
      }
      Write-Warning 'Dream Skin could not verify this session, but the theme is rendered. Codex was left running; close and reopen it to return to the stock appearance.'
    }
    if ($pauseWasSet -and $pauseCleared) {
      try {
        Set-DreamSkinPaused -Paused $true -StateRoot $StateRoot | Out-Null
      } catch {
        Write-Warning 'Startup rollback could not restore the existing paused state.'
      }
    }
    throw $startupError
  }

  Write-Host "Codex Dream Skin is active on verified loopback port $Port."
  if ($ResultToken) {
    Write-DreamSkinStartResult -StateRoot $StateRoot -Token $ResultToken `
      -Outcome 'success' -Category 'none' -AppearanceRecovery $appearanceRecovery
  }
} catch {
  $startError = $_
  if ($ResultToken) {
    try {
      $reportedCategory = Get-DreamSkinStartFailureCategory `
        -Exception $startError.Exception -FallbackCategory $startFailureCategory
      Write-DreamSkinStartResult -StateRoot $StateRoot -Token $ResultToken `
        -Outcome 'failure' -Category $reportedCategory -AppearanceRecovery $appearanceRecovery
    } catch {
      Write-Warning 'Dream Skin could not write its bounded child-start result.'
    }
  }
  throw $startError
} finally {
  if ($null -ne $operationLock) { Exit-DreamSkinOperationLock -Mutex $operationLock }
}

# This script launches native verification helpers.  A successful helper can
# still leave PowerShell's process-level LASTEXITCODE stale on some hosts, so
# make the already-verified success result explicit for callers such as the
# managed hot-update wrapper.
exit 0
