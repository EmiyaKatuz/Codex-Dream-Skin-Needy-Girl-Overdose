[CmdletBinding()]
param([int]$Port = 9335)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName Microsoft.VisualBasic
. (Join-Path $PSScriptRoot 'localization-windows.ps1')
. (Join-Path $PSScriptRoot 'common-windows.ps1')
. (Join-Path $PSScriptRoot 'theme-windows.ps1')

Assert-DreamSkinPort -Port $Port
$SkillRoot = Split-Path -Parent $PSScriptRoot
$StateRoot = Join-Path $env:LOCALAPPDATA 'CodexDreamSkin'
$paths = $null
$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
$startScript = Join-Path $PSScriptRoot 'start-dream-skin.ps1'
$restoreScript = Join-Path $PSScriptRoot 'restore-dream-skin.ps1'
$checkUpdateScript = Join-Path $PSScriptRoot 'check-update.ps1'
$startupShortcut = Join-Path ([Environment]::GetFolderPath('Startup')) 'Codex Dream Skin.lnk'

$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$mutex = [System.Threading.Mutex]::new($false, "Local\CodexDreamSkin.$sid.Tray")
$acquired = $false
$notify = $null
$trayIcon = $null
$menu = $null
$trayActivityTimer = $null
$script:trayThemeOperations = [System.Collections.Generic.List[object]]::new()
$script:trayThemeMenuItems = [System.Collections.Generic.List[object]]::new()
$script:trayThemeOperationDepth = 0
$script:trayThemeBusy = $false
$script:trayBusyItem = $null
try {
  try { $acquired = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $acquired = $true }
  if (-not $acquired) { exit 0 }

  $initializationLock = Enter-DreamSkinOperationLock
  try {
    $paths = Initialize-DreamSkinThemeStore -SkillRoot $SkillRoot -StateRoot $StateRoot
  } finally {
    Exit-DreamSkinOperationLock -Mutex $initializationLock
  }

  $notify = [System.Windows.Forms.NotifyIcon]::new()
  $trayIconPath = Join-Path $SkillRoot 'assets\internet-angel-tray.ico'
  if (Test-Path -LiteralPath $trayIconPath -PathType Leaf) {
    $trayIcon = [System.Drawing.Icon]::new($trayIconPath)
    $notify.Icon = $trayIcon
  } else {
    $notify.Icon = [System.Drawing.SystemIcons]::Application
  }
  $notify.Text = 'Codex Dream Skin'
  $notify.Visible = $true
  $menu = [System.Windows.Forms.ContextMenuStrip]::new()
  $notify.ContextMenuStrip = $menu

  function Show-DreamSkinTrayError {
    param([string]$Message)
    [void][System.Windows.Forms.MessageBox]::Show(
      $Message,
      'Codex Dream Skin',
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    )
  }

  function Get-DreamSkinTrayText {
    param(
      [Parameter(Mandatory = $true)][string]$Key,
      [object[]]$FormatArguments = @()
    )
    $language = Resolve-DreamSkinLanguage -StateRoot $StateRoot
    Get-DreamSkinText -Key $Key -Language $language -FormatArguments $FormatArguments
  }

  function Start-DreamSkinPowerShell {
    param(
      [Parameter(Mandatory = $true)][string]$Script,
      [string[]]$Arguments = @(),
      [switch]$ThemeOperation
    )
    if ($ThemeOperation -and $script:trayThemeBusy) {
      throw (Get-DreamSkinTrayText -Key 'ThemeOperationBusy')
    }
    $scriptToken = ConvertTo-DreamSkinProcessArgument -Value $Script
    $argumentLine = '-NoProfile -WindowStyle Hidden -ExecutionPolicy RemoteSigned -File ' + $scriptToken
    if ($Arguments.Count -gt 0) { $argumentLine += ' ' + ($Arguments -join ' ') }
    $previousLanguage = $env:DREAMSKIN_LANG
    try {
      $env:DREAMSKIN_LANG = Resolve-DreamSkinLanguage -StateRoot $StateRoot
      $child = Start-Process -FilePath $powershell -ArgumentList $argumentLine -WindowStyle Hidden -PassThru
      if ($ThemeOperation) {
        $script:trayThemeOperations.Add($child)
        Update-DreamSkinTrayOperationState
        $trayActivityTimer.Start()
      } else {
        $child.Dispose()
      }
    } finally {
      $env:DREAMSKIN_LANG = $previousLanguage
    }
  }

  function Add-DreamSkinTrayItem {
    param(
      [Parameter(Mandatory = $true)]
      [AllowEmptyCollection()]
      [System.Windows.Forms.ToolStripItemCollection]$Items,
      [Parameter(Mandatory = $true)][string]$Text,
      [AllowNull()][scriptblock]$Action,
      [bool]$Enabled = $true,
      [bool]$Checked = $false,
      [switch]$ThemeOperation
    )
    $item = [System.Windows.Forms.ToolStripMenuItem]::new($Text)
    $item.Enabled = $Enabled -and (-not $ThemeOperation -or -not $script:trayThemeBusy)
    if ($ThemeOperation) { $script:trayThemeMenuItems.Add($item) }
    $item.Checked = $Checked
    if ($null -ne $Action) {
      $item.add_Click({
        try { & $Action } catch { Show-DreamSkinTrayError -Message $_.Exception.Message }
      }.GetNewClosure())
    }
    [void]$Items.Add($item)
    return $item
  }

  function Add-DreamSkinTrayLanguageMenu {
    $preference = Get-DreamSkinLanguagePreference -StateRoot $StateRoot
    $languageMenu = [System.Windows.Forms.ToolStripMenuItem]::new(
      (Get-DreamSkinTrayText -Key 'Language')
    )
    foreach ($option in @(
      @{ Value = 'system'; Label = (Get-DreamSkinTrayText -Key 'LanguageSystem') },
      @{ Value = 'en-US'; Label = (Get-DreamSkinTrayText -Key 'LanguageEnglish') },
      @{ Value = 'zh-CN'; Label = (Get-DreamSkinTrayText -Key 'LanguageChinese') }
    )) {
      $optionValue = $option.Value
      $optionAction = {
        Set-DreamSkinLanguage -Language $optionValue -StateRoot $StateRoot
        Rebuild-DreamSkinTrayMenu
      }.GetNewClosure()
      $optionItem = Add-DreamSkinTrayItem -Items $languageMenu.DropDownItems -Text $option.Label -Action $optionAction
      $optionItem.Checked = $preference -ceq $optionValue
    }
    [void]$menu.Items.Add($languageMenu)
  }

  function Invoke-DreamSkinTrayMotionCommand {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    $helper = Join-Path $SkillRoot 'assets\motion-settings.mjs'
    if (-not (Test-Path -LiteralPath $helper -PathType Leaf)) {
      throw (Get-DreamSkinTrayText -Key 'MotionUnavailable')
    }
    $motionPath = Join-Path $StateRoot 'motion.json'
    Assert-DreamSkinNoReparseComponents -Path $motionPath
    $node = Get-DreamSkinNodeRuntime
    $result = Invoke-DreamSkinNative -FilePath $node.Path -ArgumentList (
      @($helper) + $Arguments + @('--file', $motionPath)
    ) -DiscardStderr
    $json = ($result.Output -join "`n").Trim()
    if ($result.ExitCode -ne 0 -or $json.Length -gt 4096) {
      throw (Get-DreamSkinTrayText -Key 'MotionSettingsFailed')
    }
    try {
      $settings = $json | ConvertFrom-Json -ErrorAction Stop
      if ($null -eq $settings -or $settings.schemaVersion -ne 1 -or
        $settings.mode -cnotin @('system', 'off', 'subtle', 'full')) {
        throw 'Invalid motion settings result.'
      }
      foreach ($effect in @('interactions', 'status', 'character', 'ambient', 'themeTransition')) {
        if ($null -eq $settings.effects -or $settings.effects.$effect -isnot [bool]) {
          throw 'Invalid motion effect result.'
        }
      }
      return $settings
    } catch {
      throw (Get-DreamSkinTrayText -Key 'MotionSettingsFailed')
    }
  }

  function Add-DreamSkinTrayMotionMenu {
    $motionMenu = [System.Windows.Forms.ToolStripMenuItem]::new(
      (Get-DreamSkinTrayText -Key 'Motion')
    )
    try { $settings = Invoke-DreamSkinTrayMotionCommand -Arguments @('--get') } catch {
      $null = Add-DreamSkinTrayItem -Items $motionMenu.DropDownItems `
        -Text (Get-DreamSkinTrayText -Key 'MotionUnavailable') -Action $null -Enabled $false
      [void]$menu.Items.Add($motionMenu)
      return
    }
    foreach ($option in @(
      @{ Value = 'system'; Label = (Get-DreamSkinTrayText -Key 'MotionSystem') },
      @{ Value = 'off'; Label = (Get-DreamSkinTrayText -Key 'MotionOff') },
      @{ Value = 'subtle'; Label = (Get-DreamSkinTrayText -Key 'MotionSubtle') },
      @{ Value = 'full'; Label = (Get-DreamSkinTrayText -Key 'MotionFull') }
    )) {
      $optionValue = $option.Value
      $optionItem = Add-DreamSkinTrayItem -Items $motionMenu.DropDownItems -Text $option.Label `
        -Action $null -Checked ($settings.mode -ceq $optionValue)
      $optionItem.Tag = [string[]]@('--set-mode', $optionValue)
      # Retain the script session so private helpers remain available after
      # this function returns; per-item arguments live on the event sender.
      $optionItem.add_Click({
        param($sender, $eventArgs)
        try {
          $null = Invoke-DreamSkinTrayMotionCommand -Arguments $sender.Tag
          Rebuild-DreamSkinTrayMenu
        } catch { Show-DreamSkinTrayError -Message $_.Exception.Message }
      })
    }
    [void]$motionMenu.DropDownItems.Add([System.Windows.Forms.ToolStripSeparator]::new())
    foreach ($effect in @(
      @{ Value = 'interactions'; Label = (Get-DreamSkinTrayText -Key 'MotionInteractions') },
      @{ Value = 'status'; Label = (Get-DreamSkinTrayText -Key 'MotionStatus') },
      @{ Value = 'character'; Label = (Get-DreamSkinTrayText -Key 'MotionCharacter') },
      @{ Value = 'ambient'; Label = (Get-DreamSkinTrayText -Key 'MotionAmbient') },
      @{ Value = 'themeTransition'; Label = (Get-DreamSkinTrayText -Key 'MotionThemeTransition') }
    )) {
      $effectValue = $effect.Value
      $effectEnabled = $settings.effects.$effectValue
      $effectNext = if ($effectEnabled) { 'off' } else { 'on' }
      $effectItem = Add-DreamSkinTrayItem -Items $motionMenu.DropDownItems -Text $effect.Label `
        -Action $null -Checked $effectEnabled
      $effectItem.Tag = [string[]]@('--set-effect', $effectValue, $effectNext)
      $effectItem.add_Click({
        param($sender, $eventArgs)
        try {
          $null = Invoke-DreamSkinTrayMotionCommand -Arguments $sender.Tag
          Rebuild-DreamSkinTrayMenu
        } catch { Show-DreamSkinTrayError -Message $_.Exception.Message }
      })
    }
    [void]$motionMenu.DropDownItems.Add([System.Windows.Forms.ToolStripSeparator]::new())
    $null = Add-DreamSkinTrayItem -Items $motionMenu.DropDownItems `
      -Text (Get-DreamSkinTrayText -Key 'MotionSystemHint') -Action $null -Enabled $false
    [void]$menu.Items.Add($motionMenu)
  }

  function Update-DreamSkinTrayOperationState {
    # These are only the child processes started by this tray. An exited launch
    # is no longer busy; its exit alone never claims that a theme applied.
    for ($index = $script:trayThemeOperations.Count - 1; $index -ge 0; $index--) {
      $child = $script:trayThemeOperations[$index]
      $finished = $false
      try { $finished = $child.HasExited } catch { $finished = $true }
      if ($finished) {
        try { $child.Dispose() } catch {}
        $script:trayThemeOperations.RemoveAt($index)
      }
    }
    $script:trayThemeBusy = $script:trayThemeOperationDepth -gt 0 -or
      $script:trayThemeOperations.Count -gt 0
    $notify.Text = if ($script:trayThemeBusy) {
      'Codex Dream Skin: ' + (Get-DreamSkinTrayText -Key 'ThemeOperationBusy')
    } else { 'Codex Dream Skin' }
    if ($null -ne $script:trayBusyItem) { $script:trayBusyItem.Visible = $script:trayThemeBusy }
    foreach ($item in $script:trayThemeMenuItems) { $item.Enabled = -not $script:trayThemeBusy }
    if (-not $script:trayThemeBusy -and $null -ne $trayActivityTimer) {
      $trayActivityTimer.Stop()
    }
  }

  function Invoke-DreamSkinTrayThemeOperation {
    param([Parameter(Mandatory = $true)][scriptblock]$Action)
    $themeOperationLock = $null
    $script:trayThemeOperationDepth += 1
    Update-DreamSkinTrayOperationState
    try {
      $themeOperationLock = Enter-DreamSkinOperationLock
      return & $Action
    } finally {
      if ($null -ne $themeOperationLock) { Exit-DreamSkinOperationLock -Mutex $themeOperationLock }
      $script:trayThemeOperationDepth -= 1
      Update-DreamSkinTrayOperationState
    }
  }

  function Set-DreamSkinAutoStart {
    param([Parameter(Mandatory = $true)][bool]$Enabled)
    if (-not $Enabled) {
      Remove-Item -LiteralPath $startupShortcut -Force -ErrorAction SilentlyContinue
      return
    }
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($startupShortcut)
    $shortcut.TargetPath = $powershell
    $shortcut.Arguments = "-NoProfile -STA -WindowStyle Hidden -ExecutionPolicy RemoteSigned -File `"$PSScriptRoot\tray-dream-skin.ps1`""
    $shortcut.WorkingDirectory = $SkillRoot
    $shortcut.Description = 'Start Codex Dream Skin in the notification area'
    $shortcut.IconLocation = "$trayIconPath,0"
    $shortcut.Save()
  }

  function Rebuild-DreamSkinTrayMenu {
    $script:trayBusyItem = $null
    $script:trayThemeMenuItems.Clear()
    $oldItems = @($menu.Items)
    $menu.Items.Clear()
    foreach ($oldItem in $oldItems) { $oldItem.Dispose() }
    $paused = Test-DreamSkinPaused -StateRoot $StateRoot
    $state = $null
    try { $state = Read-DreamSkinState -Path $paths.State } catch {}
    $active = $null
    try { $active = Read-DreamSkinTheme -ThemeDirectory $paths.Active -SkipImageMetadata } catch {}
    $status = if ($paused) {
      Get-DreamSkinTrayText -Key 'StatusPaused'
    } elseif ($state) {
      Get-DreamSkinTrayText -Key 'StatusRunning'
    } else {
      Get-DreamSkinTrayText -Key 'StatusStopped'
    }
    if ($null -ne $active -and $null -ne $active.Theme -and $active.Theme.name) {
      $status += " · $($active.Theme.name)"
    }
    $script:trayBusyItem = Add-DreamSkinTrayItem -Items $menu.Items `
      -Text (Get-DreamSkinTrayText -Key 'ThemeOperationBusy') -Action $null -Enabled $false
    $script:trayBusyItem.Visible = $script:trayThemeBusy
    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text $status -Action $null -Enabled $false
    [void]$menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())

    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'Apply') -ThemeOperation -Action {
      $session = Get-DreamSkinLiveSessionContext -StateRoot $StateRoot
      $begin = $null
      if ($null -ne $session) {
        $begin = Show-DreamSkinOperationUi -Session $session -Phase begin -Kind apply -TimeoutMs 3000
      }
      Start-DreamSkinPowerShell -Script $startScript -ThemeOperation -Arguments @('-Port', "$Port", '-PromptRestart')
      # start-dream-skin is async; close the in-window loading so it does not stick for 180s.
      if ($null -ne $session -and $null -ne $begin -and $begin.Ok) {
        $null = Show-DreamSkinOperationUi -Session $session -Phase finish -Token $begin.Token `
          -UiState success -Message (Get-DreamSkinTrayText -Key 'ApplyStarted') -TimeoutMs 1500
      }
      $notify.ShowBalloonTip(1800, 'Codex Dream Skin', (Get-DreamSkinTrayText -Key 'Applying'), [System.Windows.Forms.ToolTipIcon]::Info)
    }
    # Match macOS menubar: pause = mark + live remove; resume lets the serialized
    # start path clear pause only after its safety checks and any restart consent.
    if ($paused) {
      $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'Resume') -ThemeOperation -Action {
        # Keep pause set while the start path validates and prompts; show in-window
        # loading when the existing CDP session is still reachable.
        $session = Get-DreamSkinLiveSessionContext -StateRoot $StateRoot
        $begin = $null
        if ($null -ne $session) {
          $begin = Show-DreamSkinOperationUi -Session $session -Phase begin -Kind apply -TimeoutMs 3000
        }
        Start-DreamSkinPowerShell -Script $startScript -ThemeOperation -Arguments @('-Port', "$Port", '-PromptRestart')
        if ($null -ne $session -and $null -ne $begin -and $begin.Ok) {
          $null = Show-DreamSkinOperationUi -Session $session -Phase finish -Token $begin.Token `
          -UiState success -Message (Get-DreamSkinTrayText -Key 'ResumeStarted') -TimeoutMs 1500
        }
        $notify.ShowBalloonTip(
          1800,
          'Codex Dream Skin',
          (Get-DreamSkinTrayText -Key 'Reapplying'),
          [System.Windows.Forms.ToolTipIcon]::Info
        )
      }
    } else {
      $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'Pause') -ThemeOperation -Action {
        # Match macOS pause: marker + live remove with in-window loading / result.
        $pauseNoSessionMessage = Get-DreamSkinTrayText -Key 'PauseNoSession'
        $pauseSucceededMessage = Get-DreamSkinTrayText -Key 'PauseSucceeded'
        $pauseFailedMessage = Get-DreamSkinTrayText -Key 'PauseFailed'
        $removal = Invoke-DreamSkinTrayThemeOperation -Action {
          $liveState = Read-DreamSkinState -Path $paths.State
          if ($null -ne $liveState -and "$($liveState.windowMaterial)" -ceq 'acrylic') {
            $null = Stop-DreamSkinRecordedAcrylicMonitor `
              -State $liveState -StateRoot $StateRoot
            $liveState.windowMaterial = 'system'
            $liveState.acrylicMonitorPid = $null
            $liveState.acrylicMonitorStartedAt = $null
            $liveState.acrylicMonitorPath = $null
            $liveState.acrylicMonitorStopFile = $null
            $liveState.acrylicMonitorArmFile = $null
            $liveState.startupPhase = 'paused'
            Write-DreamSkinState -Path $paths.State -State $liveState
          }
          Set-DreamSkinPaused -Paused $true -StateRoot $StateRoot | Out-Null
          Invoke-DreamSkinLiveRemove -StateRoot $StateRoot `
            -PauseNoSessionMessage $pauseNoSessionMessage `
            -PauseSucceededMessage $pauseSucceededMessage `
            -PauseFailedMessage $pauseFailedMessage
        }
        $icon = if ($removal.Removed) {
          [System.Windows.Forms.ToolTipIcon]::Info
        } else {
          [System.Windows.Forms.ToolTipIcon]::Warning
        }
        $removalMessage = $removal.Message
        $notify.ShowBalloonTip(2800, 'Codex Dream Skin', $removalMessage, $icon)
        if (-not $removal.Removed -and $removal.Attempted) {
          Show-DreamSkinTrayError -Message $removalMessage
        }
      }
    }
    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'ChangeBackground') -ThemeOperation -Action {
      $dialog = [System.Windows.Forms.OpenFileDialog]::new()
      $dialog.Title = Get-DreamSkinTrayText -Key 'BackgroundTitle'
      $dialog.Filter = Get-DreamSkinTrayText -Key 'ImageFilter'
      $dialog.Multiselect = $false
      try {
        if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
          $null = Invoke-DreamSkinTrayThemeOperation -Action {
            $null = Set-DreamSkinActiveThemeImage -ImagePath $dialog.FileName `
              -StateRoot $StateRoot
            Set-DreamSkinPaused -Paused $false -StateRoot $StateRoot | Out-Null
          }
          $notify.ShowBalloonTip(1800, 'Codex Dream Skin', (Get-DreamSkinTrayText -Key 'BackgroundUpdated'), [System.Windows.Forms.ToolTipIcon]::Info)
        }
      } finally {
        $dialog.Dispose()
      }
    }
    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'ImportZip') -ThemeOperation -Action {
      $dialog = [System.Windows.Forms.OpenFileDialog]::new()
      $dialog.Title = Get-DreamSkinTrayText -Key 'ImportTitle'
      $dialog.Filter = 'Dream Skin theme ZIP|*.zip'
      $dialog.Multiselect = $false
      try {
        if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
          $imported = Invoke-DreamSkinTrayThemeOperation -Action {
            Import-DreamSkinThemeZip -ArchivePath $dialog.FileName -StateRoot $StateRoot
          }
          if ($imported.Status -ceq 'Duplicate') {
            $message = Get-DreamSkinTrayText -Key 'ThemeExists' -FormatArguments @($imported.Name)
          } elseif ($imported.Replaced) {
            $message = Get-DreamSkinTrayText -Key 'ThemeUpdated' -FormatArguments @($imported.Name)
          } else {
            $message = Get-DreamSkinTrayText -Key 'ThemeImported' -FormatArguments @($imported.Name)
            if ($imported.Renamed) {
              $message += Get-DreamSkinTrayText -Key 'NewIdentifier' -FormatArguments @($imported.Id)
            }
            if ($imported.NameCollision) { $message += Get-DreamSkinTrayText -Key 'NameCollision' }
          }
          if ($imported.SafeCssStatus -ceq 'validated') {
            $message += Get-DreamSkinTrayText -Key 'CssValidated'
          }
          if ($imported.SignatureIgnored) { $message += Get-DreamSkinTrayText -Key 'SignatureIgnored' }
          $cleanupProperty = $imported.PSObject.Properties['CleanupWarning']
          $hasCleanupWarning = $null -ne $cleanupProperty -and
            -not [string]::IsNullOrWhiteSpace("$($cleanupProperty.Value)")
          if ($hasCleanupWarning) {
            $message += Get-DreamSkinTrayText -Key 'CleanupWarning'
          }
          $messageIcon = if ($hasCleanupWarning) {
            [System.Windows.Forms.ToolTipIcon]::Warning
          } else {
            [System.Windows.Forms.ToolTipIcon]::Info
          }
          $notify.ShowBalloonTip(4200, 'Codex Dream Skin', $message, $messageIcon)
        }
      } finally {
        $dialog.Dispose()
      }
    }
    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'SaveCurrent') -ThemeOperation -Action {
      $name = [Microsoft.VisualBasic.Interaction]::InputBox(
        (Get-DreamSkinTrayText -Key 'SavePrompt'),
        (Get-DreamSkinTrayText -Key 'SaveTitle'),
        ''
      )
      if ($name.Trim()) {
        $saved = Invoke-DreamSkinTrayThemeOperation -Action {
          Save-DreamSkinCurrentTheme -Name $name -StateRoot $StateRoot
        }
        $notify.ShowBalloonTip(
          1800,
          'Codex Dream Skin',
          (Get-DreamSkinTrayText -Key 'Saved' -FormatArguments @($saved.Theme.name)),
          [System.Windows.Forms.ToolTipIcon]::Info
        )
      }
    }

    $savedMenu = [System.Windows.Forms.ToolStripMenuItem]::new(
      (Get-DreamSkinTrayText -Key 'SavedThemes')
    )
    $savedThemes = @(Get-DreamSkinSavedThemes -StateRoot $StateRoot -SkipImageMetadata)
    if ($savedThemes.Count -eq 0) {
      $empty = [System.Windows.Forms.ToolStripMenuItem]::new(
        (Get-DreamSkinTrayText -Key 'NoSavedThemes')
      )
      $empty.Enabled = $false
      [void]$savedMenu.DropDownItems.Add($empty)
    } else {
      foreach ($saved in $savedThemes) {
        $savedPath = $saved.Path
        $savedName = $saved.Name
        $savedAction = {
          $null = Invoke-DreamSkinTrayThemeOperation -Action {
            $null = Use-DreamSkinSavedTheme -ThemeDirectory $savedPath -StateRoot $StateRoot
            Set-DreamSkinPaused -Paused $false -StateRoot $StateRoot | Out-Null
          }
          $notify.ShowBalloonTip(
            1800,
            'Codex Dream Skin',
            (Get-DreamSkinTrayText -Key 'Applied' -FormatArguments @($savedName)),
            [System.Windows.Forms.ToolTipIcon]::Info
          )
        }.GetNewClosure()
        $null = Add-DreamSkinTrayItem -Items $savedMenu.DropDownItems -Text $savedName -Action $savedAction
      }
    }
    $savedMenu.Enabled = -not $script:trayThemeBusy
    $script:trayThemeMenuItems.Add($savedMenu)
    [void]$menu.Items.Add($savedMenu)
    Add-DreamSkinTrayMotionMenu

    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'OpenThemes') -Action {
      $themeDirectoryToken = ConvertTo-DreamSkinProcessArgument -Value $paths.Saved
      Start-Process -FilePath explorer.exe -ArgumentList $themeDirectoryToken | Out-Null
    }
    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'OpenImages') -Action {
      $imageDirectoryToken = ConvertTo-DreamSkinProcessArgument -Value $paths.Images
      Start-Process -FilePath explorer.exe -ArgumentList $imageDirectoryToken | Out-Null
    }
    [void]$menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'CheckUpdate') -Action {
      Start-DreamSkinPowerShell -Script $checkUpdateScript -Arguments @('-Interactive')
    }
    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'Gallery') -Action {
      Start-Process -FilePath 'https://dreamskin.cc/gallery' | Out-Null
    }
    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'Studio') -Action {
      Start-Process -FilePath 'https://dreamskin.cc/studio' | Out-Null
    }
    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'OpenSite') -Action {
      Start-Process -FilePath 'https://dreamskin.cc' | Out-Null
    }
    $autoStartEnabled = Test-Path -LiteralPath $startupShortcut -PathType Leaf
    $autoStartAction = {
      Set-DreamSkinAutoStart -Enabled:(-not $autoStartEnabled)
    }.GetNewClosure()
    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'LaunchAtLogin') `
      -Action $autoStartAction -Checked $autoStartEnabled
    Add-DreamSkinTrayLanguageMenu
    [void]$menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'Restore') -ThemeOperation -Action {
      Start-DreamSkinPowerShell -Script $restoreScript -Arguments @(
        '-Port', "$Port", '-RestoreBaseTheme', '-PromptRestart'
      )
      $notify.Visible = $false
      [System.Windows.Forms.Application]::Exit()
    }
    $null = Add-DreamSkinTrayItem -Items $menu.Items -Text (Get-DreamSkinTrayText -Key 'Exit') -Action {
      $notify.Visible = $false
      [System.Windows.Forms.Application]::Exit()
    }
  }

  $menu.add_Opening({
    param($sender, $eventArgs)
    try {
      Rebuild-DreamSkinTrayMenu
    } catch {
      $eventArgs.Cancel = $true
      Show-DreamSkinTrayError -Message $_.Exception.Message
    }
  })
  $notify.add_DoubleClick({
    try {
      Start-DreamSkinPowerShell -Script $startScript -ThemeOperation -Arguments @('-Port', "$Port", '-PromptRestart')
    } catch {
      Show-DreamSkinTrayError -Message $_.Exception.Message
    }
  })
  $trayActivityTimer = [System.Windows.Forms.Timer]::new()
  $trayActivityTimer.Interval = 750
  $trayActivityTimer.add_Tick({ Update-DreamSkinTrayOperationState })
  [System.Windows.Forms.Application]::Run()
} finally {
  if ($null -ne $trayActivityTimer) {
    $trayActivityTimer.Stop()
    $trayActivityTimer.Dispose()
  }
  foreach ($child in $script:trayThemeOperations) {
    # Disposing a Process handle leaves the authorized operation running.
    try { $child.Dispose() } catch {}
  }
  $script:trayThemeOperations.Clear()
  if ($null -ne $notify) {
    $notify.Visible = $false
    $notify.ContextMenuStrip = $null
  }
  if ($null -ne $menu) { $menu.Dispose() }
  if ($null -ne $notify) { $notify.Dispose() }
  if ($null -ne $trayIcon) { $trayIcon.Dispose() }
  if ($acquired) { try { $mutex.ReleaseMutex() } catch {} }
  $mutex.Dispose()
}
