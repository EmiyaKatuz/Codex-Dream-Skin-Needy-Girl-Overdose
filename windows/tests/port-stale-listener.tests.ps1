[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$Root)

$ErrorActionPreference = 'Stop'
$commonPath = Join-Path $Root 'scripts\common-windows.ps1'
if (-not (Get-Command Resolve-DreamSkinStartPort -CommandType Function -ErrorAction SilentlyContinue)) {
  . $commonPath
}

$functionNames = @(
  'Test-DreamSkinPortAvailable',
  'Get-DreamSkinPortListeners',
  'Test-DreamSkinListenerOwnerAlive',
  'Select-DreamSkinPort'
)
$originalFunctions = @{}
foreach ($name in $functionNames) {
  $command = Get-Command $name -CommandType Function -ErrorAction Stop
  $originalFunctions[$name] = $command.ScriptBlock
}
$script:portAvailable = $true
$script:portListeners = @()
$script:staleOwnerProcessIds = @()
$script:selectedPort = $null

function Test-DreamSkinPortAvailable {
  param([int]$Port)
  return $script:portAvailable
}
function Get-DreamSkinPortListeners {
  param([int]$Port)
  return @($script:portListeners)
}
function Test-DreamSkinListenerOwnerAlive {
  param([object]$Listener)
  return [bool]($script:staleOwnerProcessIds -notcontains [int]$Listener.OwningProcess)
}
function Select-DreamSkinPort {
  param([int]$PreferredPort)
  $script:selectedPort = $PreferredPort
  return $PreferredPort + 1
}

try {
  $resolved = Resolve-DreamSkinStartPort -Port 9335 -PortExplicit $true
  if ($resolved -ne 9335 -or $null -ne $script:selectedPort) {
    throw 'A free explicit port was not preserved.'
  }

  $script:portAvailable = $false
  $script:portListeners = @([pscustomobject]@{ OwningProcess = 4242 })
  $script:staleOwnerProcessIds = @()
  $script:selectedPort = $null
  $liveRejected = $false
  try {
    $null = Resolve-DreamSkinStartPort -Port 9335 -PortExplicit $true
  } catch {
    $liveRejected = $true
  }
  if (-not $liveRejected -or $null -ne $script:selectedPort) {
    throw 'A live unverified listener on an explicit port did not fail closed.'
  }

  $script:portListeners = @([pscustomobject]@{ OwningProcess = 8276 })
  $script:staleOwnerProcessIds = @(8276)
  $script:selectedPort = $null
  $resolved = Resolve-DreamSkinStartPort -Port 9335 -PortExplicit $true
  if ($resolved -ne 9336 -or $script:selectedPort -ne 9335) {
    throw 'A stale listener on an explicit port did not select the next free port.'
  }

  $script:portListeners = @([pscustomobject]@{ OwningProcess = 4242 })
  $script:staleOwnerProcessIds = @()
  $script:selectedPort = $null
  $resolved = Resolve-DreamSkinStartPort -Port 9335 -PortExplicit $false
  if ($resolved -ne 9336 -or $script:selectedPort -ne 9335) {
    throw 'The default port scan did not select the next free port.'
  }
} finally {
  foreach ($name in $functionNames) {
    Set-Item -Path "function:$name" -Value $originalFunctions[$name]
  }
}

Write-Output 'PASS: stale listener port recovery falls back to the next free loopback port.'

& {
  Set-StrictMode -Version 2.0
  $fixture = [pscustomobject]@{ Targets = @(); OwnerChecks = 0; LoseOwner = $false }

  function Test-DreamSkinCodexPortOwner {
    param([int]$Port, [object]$Codex, [int]$ExpectedSessionId)
    if ($Port -ne 9335 -or $ExpectedSessionId -ne 7) {
      throw 'CDP identity verification must preserve the expected port and Windows session.'
    }
    $fixture.OwnerChecks += 1
    return (-not $fixture.LoseOwner -or $fixture.OwnerChecks -eq 1)
  }

  function Get-DreamSkinCdpBrowserIdentity {
    param([int]$Port)
    return [pscustomobject]@{
      BrowserId = 'browser-123'
      WebSocketDebuggerUrl = "ws://127.0.0.1:$Port/devtools/browser/browser-123"
      Browser = 'Codex test browser'
    }
  }

  function Get-DreamSkinCdpTargets {
    param([int]$Port)
    return $fixture.Targets
  }

  $identityArguments = @{
    Port = 9335
    Codex = [pscustomobject]@{ Executable = 'C:\Synthetic\ChatGPT.exe' }
    ExpectedSessionId = 7
  }
  $fixture.Targets = @([pscustomobject]@{ id = 'page-one' })
  $identity = Get-DreamSkinVerifiedCdpIdentity @identityArguments
  if ($null -eq $identity -or $identity.BrowserId -cne 'browser-123' -or $identity.TargetCount -ne 1) {
    throw 'CDP identity verification rejected a browser with one page target.'
  }

  $fixture.Targets += [pscustomobject]@{ id = 'page-two' }
  $identity = Get-DreamSkinVerifiedCdpIdentity @identityArguments
  if ($null -eq $identity -or $identity.TargetCount -ne 2) {
    throw 'CDP identity verification returned the wrong count for multiple page targets.'
  }

  $fixture.OwnerChecks = 0
  $fixture.LoseOwner = $true
  if ($null -ne (Get-DreamSkinVerifiedCdpIdentity @identityArguments) -or $fixture.OwnerChecks -ne 2) {
    throw 'CDP identity verification accepted a changed listener owner.'
  }

  $fixture.Targets = @()
  $fixture.LoseOwner = $false
  if ($null -ne (Get-DreamSkinVerifiedCdpIdentity @identityArguments)) {
    throw 'CDP identity verification accepted a browser without a page target.'
  }
}

Write-Output 'PASS: CDP identity handles zero, one, and multiple page targets and rechecks the listener owner.'
