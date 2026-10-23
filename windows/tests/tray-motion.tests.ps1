[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$Root)

$ErrorActionPreference = 'Stop'
. (Join-Path $Root 'scripts\common-windows.ps1')
. (Join-Path $Root 'scripts\theme-windows.ps1')
. (Join-Path $Root 'scripts\localization-windows.ps1')
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Load only the helpers: never launch a tray, Codex process, or CDP session.
$trayPath = Join-Path $Root 'scripts\tray-dream-skin.ps1'
$parseTokens = $null
$parseErrors = $null
$trayAst = [System.Management.Automation.Language.Parser]::ParseFile(
  $trayPath, [ref]$parseTokens, [ref]$parseErrors
)
if (@($parseErrors).Count -gt 0) { throw "Tray script syntax failed: $parseErrors" }
$helperNames = @(
  'Get-DreamSkinTrayText', 'Add-DreamSkinTrayItem', 'Invoke-DreamSkinTrayMotionCommand',
  'Add-DreamSkinTrayMotionMenu', 'New-DreamSkinTrayBusyIcon',
  'Update-DreamSkinTrayOperationIcon', 'Update-DreamSkinTrayOperationState',
  'Invoke-DreamSkinTrayThemeOperation', 'Start-DreamSkinPowerShell'
)
foreach ($name in $helperNames) {
  $definition = $trayAst.Find({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -ceq $name
  }, $true)
  if ($null -eq $definition) { throw "Tray helper missing: $name" }
  Invoke-Expression $definition.Extent.Text
}

$SkillRoot = $Root
$StateRoot = Join-Path ([System.IO.Path]::GetTempPath()) `
  ('dreamskin-motion-' + [char]0x6D4B + [char]0x8BD5 + '-' + [guid]::NewGuid().ToString('N'))
$motionPath = Join-Path $StateRoot 'motion.json'
$originalLanguage = $env:DREAMSKIN_LANG
$menu = $null
$script:trayThemeOperations = [System.Collections.Generic.List[object]]::new()
$script:trayThemeMenuItems = [System.Collections.Generic.List[object]]::new()
$script:trayThemeOperationDepth = 0
$script:trayThemeBusy = $false
$script:trayBusyItem = [pscustomobject]@{ Visible = $false }
$script:menuRebuilt = 0
$script:launchedChildren = 0
$trayRestingIcon = [System.Drawing.SystemIcons]::Application
$script:trayBusyIcon = $null
$script:trayOperationFeedbackReady = $true
$notify = [pscustomobject]@{ Text = 'Codex Dream Skin'; Icon = $trayRestingIcon }
$trayActivityTimer = [pscustomobject]@{ Starts = 0; Stops = 0 }
$trayActivityTimer | Add-Member -MemberType ScriptMethod -Name Start -Value { $this.Starts += 1 }
$trayActivityTimer | Add-Member -MemberType ScriptMethod -Name Stop -Value { $this.Stops += 1 }

function Rebuild-DreamSkinTrayMenu { $script:menuRebuilt += 1 }
function Show-DreamSkinTrayError { param([string]$Message) throw $Message }
function Assert-TrayMotionRejected {
  param([scriptblock]$Action, [string]$Label)
  $rejected = $false
  try { $null = & $Action } catch { $rejected = $true }
  if (-not $rejected) { throw "Tray accepted $Label." }
}
function New-TrayProcessFixture {
  $child = [pscustomobject]@{ HasExited = $false; Disposed = $false }
  $child | Add-Member -MemberType ScriptMethod -Name Dispose -Value { $this.Disposed = $true }
  return $child
}

try {
  $env:DREAMSKIN_LANG = 'en-US'
  $defaults = Invoke-DreamSkinTrayMotionCommand -Arguments @('--get')
  if ($defaults.mode -cne 'system') { throw 'Tray did not receive the shared default mode.' }
  $menu = [System.Windows.Forms.ContextMenuStrip]::new()
  Add-DreamSkinTrayMotionMenu
  if ($menu.Items.Count -ne 1) { throw 'Tray motion submenu was not created.' }
  $motionItems = $menu.Items[0].DropDownItems
  foreach ($mode in @('system', 'off', 'subtle', 'full')) {
    $index = [array]::IndexOf(@('system', 'off', 'subtle', 'full'), $mode)
    $motionItems[$index].PerformClick()
    $saved = Invoke-DreamSkinTrayMotionCommand -Arguments @('--get')
    if ($saved.mode -cne $mode) { throw "Motion menu closure selected the wrong mode: $mode" }
  }
  foreach ($effect in @('interactions', 'status', 'character', 'ambient', 'themeTransition')) {
    $index = 5 + [array]::IndexOf(@('interactions', 'status', 'character', 'ambient', 'themeTransition'), $effect)
    $motionItems[$index].PerformClick()
    $saved = Invoke-DreamSkinTrayMotionCommand -Arguments @('--get')
    if ($saved.effects.$effect -ne $false -or $saved.mode -cne 'full') {
      throw "Motion effect menu did not preserve the selected mode: $effect"
    }
  }
  if ($script:menuRebuilt -ne 9 -or $script:launchedChildren -ne 0) {
    throw 'Motion preferences must refresh menu state without launching Codex.'
  }
  $preserved = [System.IO.File]::ReadAllText($motionPath)
  Assert-TrayMotionRejected -Label 'an invalid preference' -Action {
    Invoke-DreamSkinTrayMotionCommand -Arguments @('--set-mode', 'invalid')
  }
  if ([System.IO.File]::ReadAllText($motionPath) -cne $preserved) {
    throw 'Rejected motion preference replaced the previous settings.'
  }
  $menu.Dispose()
  $menu = [System.Windows.Forms.ContextMenuStrip]::new()
  $env:DREAMSKIN_LANG = 'zh-CN'
  Add-DreamSkinTrayMotionMenu
  if ($menu.Items[0].Text -cne (Get-DreamSkinText -Key 'Motion' -Language 'zh-CN') -or
    -not $menu.Items[0].DropDownItems[3].Checked -or $menu.Items[0].DropDownItems[5].Checked) {
    throw 'Saved motion settings or localized labels did not survive menu reconstruction.'
  }
  $menu.Items[0].DropDownItems[5].PerformClick()
  $enabled = Invoke-DreamSkinTrayMotionCommand -Arguments @('--get')
  if ($enabled.effects.interactions -ne $true -or $enabled.effects.ambient -ne $false) {
    throw 'Re-enabling one effect changed a different stored preference.'
  }

  # Invalid on-disk settings leave the rest of the tray usable and are preserved.
  $invalid = '{"schemaVersion":1,"mode":"unexpected"}'
  [System.IO.File]::WriteAllText($motionPath, $invalid, [System.Text.UTF8Encoding]::new($false))
  $menu.Dispose()
  $menu = [System.Windows.Forms.ContextMenuStrip]::new()
  Add-DreamSkinTrayMotionMenu
  if ($menu.Items[0].DropDownItems.Count -ne 1 -or
    $menu.Items[0].DropDownItems[0].Enabled -or
    [System.IO.File]::ReadAllText($motionPath) -cne $invalid) {
    throw 'Invalid motion settings were overwritten or broke the tray fallback.'
  }
  [System.IO.File]::WriteAllText($motionPath, $preserved, [System.Text.UTF8Encoding]::new($false))

  $null = Invoke-DreamSkinTrayMotionCommand -Arguments @('--set-effect', 'status', 'on')
  $operationItem = [pscustomobject]@{ Enabled = $true }
  $script:trayThemeMenuItems.Add($operationItem)
  $child = New-TrayProcessFixture
  $script:trayThemeOperations.Add($child)
  Update-DreamSkinTrayOperationState
  if (-not $script:trayThemeBusy -or $operationItem.Enabled -or -not $script:trayBusyItem.Visible) {
    throw 'A live theme child did not expose busy state and disable duplicate operations.'
  }
  if ($null -eq $script:trayBusyIcon -or $script:trayBusyIcon.Width -ne 32 -or
    $script:trayBusyIcon.Height -ne 32 -or
    -not [object]::ReferenceEquals($notify.Icon, $script:trayBusyIcon)) {
    throw 'A live operation did not display its memory-only hourglass icon.'
  }
  $firstBusyIcon = $script:trayBusyIcon
  Update-DreamSkinTrayOperationState
  if (-not [object]::ReferenceEquals($script:trayBusyIcon, $firstBusyIcon)) {
    throw 'Busy polling must reuse one static icon instead of allocating frames.'
  }
  # Mode/status changes take effect on the next state update. There is no
  # animation to conflict with Windows reduced-motion or high-contrast modes.
  $null = Invoke-DreamSkinTrayMotionCommand -Arguments @('--set-mode', 'off')
  Update-DreamSkinTrayOperationState
  if (-not [object]::ReferenceEquals($notify.Icon, $trayRestingIcon) -or -not $script:trayThemeBusy) {
    throw 'Motion off must withdraw the hourglass without hiding the operation status.'
  }
  foreach ($mode in @('system', 'subtle', 'full')) {
    $null = Invoke-DreamSkinTrayMotionCommand -Arguments @('--set-mode', $mode)
    Update-DreamSkinTrayOperationState
    if (-not [object]::ReferenceEquals($notify.Icon, $firstBusyIcon)) {
      throw "Enabled mode did not restore static operation feedback: $mode"
    }
  }
  $null = Invoke-DreamSkinTrayMotionCommand -Arguments @('--set-effect', 'status', 'off')
  Update-DreamSkinTrayOperationState
  if (-not [object]::ReferenceEquals($notify.Icon, $trayRestingIcon)) {
    throw 'The status switch must suppress the operation icon independently of mode.'
  }
  $null = Invoke-DreamSkinTrayMotionCommand -Arguments @('--set-effect', 'status', 'on')
  Update-DreamSkinTrayOperationState
  $validBusySettings = [System.IO.File]::ReadAllText($motionPath)
  [System.IO.File]::WriteAllText($motionPath, $invalid, [System.Text.UTF8Encoding]::new($false))
  Add-DreamSkinTrayMotionMenu
  if (-not [object]::ReferenceEquals($notify.Icon, $trayRestingIcon) -or
    $null -ne $script:trayMotionSettings) {
    throw 'Unavailable settings must withdraw the busy decoration immediately.'
  }
  [System.IO.File]::WriteAllText($motionPath, $validBusySettings, [System.Text.UTF8Encoding]::new($false))
  Add-DreamSkinTrayMotionMenu
  if (-not [object]::ReferenceEquals($notify.Icon, $firstBusyIcon)) {
    throw 'A successful menu refresh did not restore allowed static feedback.'
  }
  $child.HasExited = $true
  Update-DreamSkinTrayOperationState
  if ($script:trayThemeBusy -or -not $operationItem.Enabled -or $script:trayBusyItem.Visible -or
    -not $child.Disposed -or $notify.Text -cne 'Codex Dream Skin' -or $trayActivityTimer.Stops -lt 1 -or
    -not [object]::ReferenceEquals($notify.Icon, $trayRestingIcon)) {
    throw 'Exited theme children retained busy state, handles, or fabricated a success tooltip.'
  }

  $script:releasedLocks = 0
  function Enter-DreamSkinOperationLock { return [pscustomobject]@{ TestLock = $true } }
  function Exit-DreamSkinOperationLock { param($Mutex) $script:releasedLocks += 1 }
  $returned = Invoke-DreamSkinTrayThemeOperation -Action {
    if (-not $script:trayThemeBusy -or $operationItem.Enabled) { throw 'Missing synchronous busy state.' }
    return 'completed action'
  }
  if ($returned -cne 'completed action' -or $script:trayThemeBusy -or $script:releasedLocks -ne 1) {
    throw 'Synchronous theme operation did not preserve result and release busy state.'
  }
  Assert-TrayMotionRejected -Label 'a failed operation' -Action {
    Invoke-DreamSkinTrayThemeOperation -Action { throw 'Expected operation failure.' }
  }
  if ($script:trayThemeBusy -or $script:trayThemeOperationDepth -ne 0 -or $script:releasedLocks -ne 2) {
    throw 'Theme operation failure leaked a lock or busy state.'
  }
  function Enter-DreamSkinOperationLock { throw 'Expected lock failure.' }
  Assert-TrayMotionRejected -Label 'a failed operation lock' -Action {
    Invoke-DreamSkinTrayThemeOperation -Action { throw 'Unreachable action.' }
  }
  if ($script:trayThemeBusy -or $script:trayThemeOperationDepth -ne 0 -or $script:releasedLocks -ne 2) {
    throw 'Lock acquisition failure retained busy state or released a lock it did not own.'
  }

  $powershell = 'powershell.exe'
  function Start-Process {
    param([string]$FilePath, [string]$ArgumentList, [string]$WindowStyle, [switch]$PassThru)
    if (-not $PassThru -or $ArgumentList -notmatch '-ExecutionPolicy RemoteSigned -File ' -or
      $ArgumentList -match '-ExecutionPolicy Bypass') {
      throw 'Tray launch lost managed RemoteSigned process tracking.'
    }
    $script:launchedChildren += 1
    return New-TrayProcessFixture
  }
  Start-DreamSkinPowerShell -Script (Join-Path $Root 'scripts\start-dream-skin.ps1') -ThemeOperation
  if ($script:launchedChildren -ne 1 -or -not $script:trayThemeBusy -or $trayActivityTimer.Starts -ne 1) {
    throw 'Async theme launch did not start bounded process monitoring.'
  }
  Assert-TrayMotionRejected -Label 'a second concurrent tray apply' -Action {
    Start-DreamSkinPowerShell -Script (Join-Path $Root 'scripts\start-dream-skin.ps1') -ThemeOperation
  }
  if ($script:launchedChildren -ne 1) { throw 'Busy tray launched a duplicate theme process.' }
  $script:trayThemeOperations[0].HasExited = $true
  Update-DreamSkinTrayOperationState
  if ($script:trayThemeBusy -or $env:DREAMSKIN_LANG -cne 'zh-CN') {
    throw 'Async launch did not restore language context or clear its busy marker.'
  }
  Write-Host 'Windows tray motion preferences and operation-state checks passed.'
} finally {
  if ($null -ne $menu) { $menu.Dispose() }
  $notify.Icon = $trayRestingIcon
  if ($null -ne $script:trayBusyIcon) { $script:trayBusyIcon.Dispose() }
  foreach ($child in $script:trayThemeOperations) { $child.Dispose() }
  $script:trayThemeOperations.Clear()
  $env:DREAMSKIN_LANG = $originalLanguage
  Remove-Item -LiteralPath $StateRoot -Recurse -Force -ErrorAction SilentlyContinue
}
