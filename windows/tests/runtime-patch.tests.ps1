[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$Root)

$ErrorActionPreference = 'Stop'
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) (
  'codex-dream-skin-runtime-patch-' + [guid]::NewGuid().ToString('N')
)
New-Item -ItemType Directory -Path $temporaryRoot | Out-Null

try {
  $stateRoot = Join-Path $temporaryRoot 'state'
  $engineRoot = Join-Path $stateRoot 'engine'
  $scriptsRoot = Join-Path $engineRoot 'scripts'
  $assetsRoot = Join-Path $engineRoot 'assets'
  New-Item -ItemType Directory -Path $scriptsRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $assetsRoot -Force | Out-Null
  [System.IO.File]::WriteAllText(
    (Join-Path $engineRoot 'VERSION'),
    "1.5.9`r`n",
    [System.Text.UTF8Encoding]::new($false)
  )
  $installedCommon = Join-Path $scriptsRoot 'common-windows.ps1'
  $installedStart = Join-Path $scriptsRoot 'start-dream-skin.ps1'
  [System.IO.File]::WriteAllText(
    $installedCommon,
    'old common-windows.ps1',
    [System.Text.UTF8Encoding]::new($false)
  )
  [System.IO.File]::WriteAllText(
    $installedStart,
    'old start-dream-skin.ps1',
    [System.Text.UTF8Encoding]::new($false)
  )
  $sentinel = Join-Path $engineRoot 'keep.txt'
  [System.IO.File]::WriteAllText($sentinel, 'keep', [System.Text.UTF8Encoding]::new($false))

  $patchScript = Join-Path $Root 'scripts\patch-dream-skin.ps1'
  $quickFixBuilder = Join-Path (Split-Path -Parent $Root) 'tools\build-quickfix-patch.ps1'
  $quickFixBuilderSource = [System.IO.File]::ReadAllText($quickFixBuilder)
  foreach ($requiredQuickFixAsset in @(
    'renderer-inject.js',
    'css-predicate-cache.mjs',
    'dream-skin.css',
    'internet-angel-acrylic.css',
    'internet-angel-extension.js',
    'internet-angel-extension.css'
  )) {
    if (-not $quickFixBuilderSource.Contains("'$requiredQuickFixAsset'")) {
      throw "The quick-fix archive omits a runtime patch asset: $requiredQuickFixAsset"
    }
  }
  if (-not $quickFixBuilderSource.Contains("'injector.mjs'")) {
    throw 'The quick-fix archive omits the injector paired with its renderer payload.'
  }
  $quickFixOutput = Join-Path $temporaryRoot 'quickfix-output'
  $quickFixExtract = Join-Path $temporaryRoot 'quickfix-extract'
  & $quickFixBuilder -OutputDirectory $quickFixOutput
  $quickFixArchives = @(Get-ChildItem -LiteralPath $quickFixOutput -Filter '*.zip' -File)
  if ($quickFixArchives.Count -ne 1) {
    throw 'The quick-fix builder did not create exactly one ZIP archive.'
  }
  Expand-Archive -LiteralPath $quickFixArchives[0].FullName -DestinationPath $quickFixExtract
  foreach ($requiredQuickFixAsset in @(
    'renderer-inject.js',
    'css-predicate-cache.mjs',
    'dream-skin.css',
    'internet-angel-acrylic.css',
    'internet-angel-extension.js',
    'internet-angel-extension.css'
  )) {
    $sourceAsset = Join-Path $Root "assets\$requiredQuickFixAsset"
    $archivedAsset = Join-Path $quickFixExtract "assets\$requiredQuickFixAsset"
    if (-not (Test-Path -LiteralPath $archivedAsset -PathType Leaf) -or
      (Get-FileHash -LiteralPath $sourceAsset -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $archivedAsset -Algorithm SHA256).Hash) {
      throw "The built quick-fix archive has a missing or stale asset: $requiredQuickFixAsset"
    }
  }
  $archivedInjector = Join-Path $quickFixExtract 'scripts\injector.mjs'
  $sourceInjector = Join-Path $Root 'scripts\injector.mjs'
  if (-not (Test-Path -LiteralPath $archivedInjector -PathType Leaf) -or
    (Get-FileHash -LiteralPath $sourceInjector -Algorithm SHA256).Hash -cne
    (Get-FileHash -LiteralPath $archivedInjector -Algorithm SHA256).Hash) {
    throw 'The built quick-fix archive has a missing or stale injector.'
  }
  & $patchScript -SourceRoot $Root -StateRoot $stateRoot -DryRun
  if ([System.IO.File]::ReadAllText($installedCommon) -cne 'old common-windows.ps1' -or
    [System.IO.File]::ReadAllText($installedStart) -cne 'old start-dream-skin.ps1' -or
    -not (Test-Path -LiteralPath $sentinel -PathType Leaf)) {
    throw 'Dry run changed the installed runtime or its sentinel file.'
  }

  & $patchScript -SourceRoot $Root -StateRoot $stateRoot
  $sourceCommon = Join-Path $Root 'scripts\common-windows.ps1'
  $sourceStart = Join-Path $Root 'scripts\start-dream-skin.ps1'
  $installedInjector = Join-Path $scriptsRoot 'injector.mjs'
  $sourcePatch = Join-Path $Root 'scripts\patch-dream-skin.ps1'
  $installedPatch = Join-Path $scriptsRoot 'patch-dream-skin.ps1'
  $sourceRenderer = Join-Path $Root 'assets\renderer-inject.js'
  $sourceCss = Join-Path $Root 'assets\dream-skin.css'
  $sourceAcrylicCss = Join-Path $Root 'assets\internet-angel-acrylic.css'
  $sourceExtensionCss = Join-Path $Root 'assets\internet-angel-extension.css'
  $sourceExtensionScript = Join-Path $Root 'assets\internet-angel-extension.js'
  $sourcePredicateRuntime = Join-Path $Root 'assets\css-predicate-cache.mjs'
  $installedRenderer = Join-Path $assetsRoot 'renderer-inject.js'
  $installedCss = Join-Path $assetsRoot 'dream-skin.css'
  $installedAcrylicCss = Join-Path $assetsRoot 'internet-angel-acrylic.css'
  $installedExtensionCss = Join-Path $assetsRoot 'internet-angel-extension.css'
  $installedExtensionScript = Join-Path $assetsRoot 'internet-angel-extension.js'
  $installedPredicateRuntime = Join-Path $assetsRoot 'css-predicate-cache.mjs'
  if ((Get-FileHash -LiteralPath $installedCommon -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceCommon -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedStart -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceStart -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedInjector -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceInjector -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedPatch -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourcePatch -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedRenderer -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceRenderer -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedCss -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceCss -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedAcrylicCss -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceAcrylicCss -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedExtensionCss -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceExtensionCss -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedExtensionScript -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceExtensionScript -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedPredicateRuntime -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourcePredicateRuntime -Algorithm SHA256).Hash -or
    [System.IO.File]::ReadAllText($sentinel) -cne 'keep') {
    throw 'Runtime patch did not replace the launcher, injector, renderer/css assets, and patch script while preserving the sentinel file.'
  }

  [System.IO.File]::AppendAllText(
    $installedAcrylicCss,
    "`r`n/* stale token-complete Acrylic payload */`r`n",
    [System.Text.UTF8Encoding]::new($false)
  )
  & $patchScript -SourceRoot $Root -StateRoot $stateRoot
  if ((Get-FileHash -LiteralPath $installedCommon -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceCommon -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedStart -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceStart -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedInjector -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceInjector -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedRenderer -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceRenderer -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedCss -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceCss -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedAcrylicCss -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceAcrylicCss -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $installedExtensionCss -Algorithm SHA256).Hash -cne
      (Get-FileHash -LiteralPath $sourceExtensionCss -Algorithm SHA256).Hash) {
    throw 'A token-complete but byte-stale runtime was incorrectly treated as already patched.'
  }

  [System.IO.File]::AppendAllText(
    $installedExtensionScript,
    "`r`n// stale extension-only scheduler payload`r`n",
    [System.Text.UTF8Encoding]::new($false)
  )
  $beforeExtensionRepairSentinel = (Get-FileHash -LiteralPath $sentinel -Algorithm SHA256).Hash
  & $patchScript -SourceRoot $Root -StateRoot $stateRoot -DryRun
  if ((Get-FileHash -LiteralPath $installedExtensionScript -Algorithm SHA256).Hash -ceq
    (Get-FileHash -LiteralPath $sourceExtensionScript -Algorithm SHA256).Hash) {
    throw 'Dry run repaired the stale extension instead of leaving the engine intact.'
  }
  & $patchScript -SourceRoot $Root -StateRoot $stateRoot
  if ((Get-FileHash -LiteralPath $installedExtensionScript -Algorithm SHA256).Hash -cne
    (Get-FileHash -LiteralPath $sourceExtensionScript -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $sentinel -Algorithm SHA256).Hash -cne $beforeExtensionRepairSentinel) {
    throw 'An extension-only stale runtime was not repaired while preserving unrelated files.'
  }

  $patchedFiles = @(
    $installedCommon, $installedStart, $installedInjector, $installedPatch, $installedRenderer,
    $installedCss, $installedAcrylicCss, $installedExtensionCss, $installedExtensionScript, $installedPredicateRuntime
  )
  [System.IO.File]::AppendAllText(
    $installedPredicateRuntime, "`r`n// stale predicate dependency`r`n", [System.Text.UTF8Encoding]::new($false)
  )
  & $patchScript -SourceRoot $Root -StateRoot $stateRoot
  if ((Get-FileHash -LiteralPath $installedPredicateRuntime -Algorithm SHA256).Hash -cne
    (Get-FileHash -LiteralPath $sourcePredicateRuntime -Algorithm SHA256).Hash) {
    throw 'A stale predicate runtime dependency was not atomically repaired.'
  }
  $beforeIdempotentHashes = @($patchedFiles | ForEach-Object {
    (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash
  })
  & $patchScript -SourceRoot $Root -StateRoot $stateRoot
  $afterIdempotentHashes = @($patchedFiles | ForEach-Object {
    (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash
  })
  if (($beforeIdempotentHashes -join ',') -cne ($afterIdempotentHashes -join ',')) {
    throw 'Applying the exact same runtime patch twice changed an already byte-identical engine.'
  }

  $pathNode = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $pathNode) { $pathNode = Get-Command node -ErrorAction Stop }
  $runtimeNodeRoot = Join-Path $engineRoot 'runtime\node'
  New-Item -ItemType Directory -Path $runtimeNodeRoot -Force | Out-Null
  $runtimeNode = Join-Path $runtimeNodeRoot 'node.exe'
  Copy-Item -LiteralPath $pathNode.Source -Destination $runtimeNode -Force
  [System.IO.File]::WriteAllText(
    (Join-Path $runtimeNodeRoot 'LICENSE'),
    'Node.js runtime license fixture',
    [System.Text.UTF8Encoding]::new($false)
  )
  $keepAliveScript = Join-Path $temporaryRoot 'keep-engine-node-alive.mjs'
  [System.IO.File]::WriteAllText(
    $keepAliveScript,
    'setInterval(() => {}, 1000);',
    [System.Text.UTF8Encoding]::new($false)
  )
  $activeEngineNode = Start-Process -FilePath $runtimeNode -ArgumentList $keepAliveScript `
    -WindowStyle Hidden -PassThru
  try {
    [System.IO.File]::AppendAllText(
      $installedAcrylicCss,
      "`r`n/* stale while bundled node is running */`r`n",
      [System.Text.UTF8Encoding]::new($false)
    )
    $beforeLockedPatch = @(
      Get-ChildItem -LiteralPath $engineRoot -Recurse -File -Force |
        Sort-Object FullName |
        ForEach-Object {
          "$($_.FullName.Substring($engineRoot.Length + 1))=$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)"
        }
    ) -join "`n"
    $lockedPatchFailed = $false
    try {
      & $patchScript -SourceRoot $Root -StateRoot $stateRoot
    } catch {
      if ($_.Exception.Message -notlike '*managed Dream Skin Node runtime is in use*') { throw }
      $lockedPatchFailed = $true
    }
    $activeEngineNode.Refresh()
    $afterLockedPatch = @(
      Get-ChildItem -LiteralPath $engineRoot -Recurse -File -Force |
        Sort-Object FullName |
        ForEach-Object {
          "$($_.FullName.Substring($engineRoot.Length + 1))=$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)"
        }
    ) -join "`n"
    if (-not $lockedPatchFailed -or $activeEngineNode.HasExited -or
      $beforeLockedPatch -cne $afterLockedPatch) {
      throw 'A locked runtime patch did not fail closed with its live Node and exact engine intact.'
    }
  } finally {
    if (-not $activeEngineNode.HasExited) {
      Stop-Process -Id $activeEngineNode.Id -Force -ErrorAction SilentlyContinue
      $null = $activeEngineNode.WaitForExit(5000)
    }
  }
  & $patchScript -SourceRoot $Root -StateRoot $stateRoot
  if ((Get-FileHash -LiteralPath $installedAcrylicCss -Algorithm SHA256).Hash -cne
    (Get-FileHash -LiteralPath $sourceAcrylicCss -Algorithm SHA256).Hash) {
    throw 'The runtime patch did not commit after the bundled Node released its lock.'
  }

  $enginePrefix = $engineRoot.TrimEnd('\') + '\'
  $beforeFailedSwap = @(
    Get-ChildItem -LiteralPath $engineRoot -Recurse -File -Force |
      Sort-Object FullName |
      ForEach-Object {
        $relative = $_.FullName.Substring($enginePrefix.Length)
        "$relative=$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)"
      }
  ) -join "`n"
  $failureSourceRoot = Join-Path $temporaryRoot 'forced-swap-source'
  Copy-Item -LiteralPath $Root -Destination $failureSourceRoot -Recurse -Force
  $failurePatch = Join-Path $failureSourceRoot 'scripts\patch-dream-skin.ps1'
  $failurePatchText = [System.IO.File]::ReadAllText($failurePatch)
  $errorPreferenceNeedle = '$ErrorActionPreference = ''Stop'''
  $directoryMoveNeedle = '      [System.IO.Directory]::Move($sourceFull, $destinationFull)'
  if (-not $failurePatchText.Contains($errorPreferenceNeedle) -or
    -not $failurePatchText.Contains($directoryMoveNeedle)) {
    throw 'Could not install the forced atomic swap failure seam in the patch fixture.'
  }
  $failurePatchText = $failurePatchText.Replace(
    $errorPreferenceNeedle,
    "$errorPreferenceNeedle`r`n`$script:DreamSkinForceOneMoveAccessDenial = `$true`r`n`$script:DreamSkinForceOneSwapFailure = `$true"
  ).Replace(
    $directoryMoveNeedle,
    @'
      if ($script:DreamSkinForceOneMoveAccessDenial -and
        [System.IO.Path]::GetFileName($destinationFull) -like '.engine-patch-backup-*') {
        $script:DreamSkinForceOneMoveAccessDenial = $false
        throw [System.UnauthorizedAccessException]::new('forced transient atomic patch access denial')
      }
      if ($script:DreamSkinForceOneSwapFailure -and
        [System.IO.Path]::GetFileName($destinationFull) -ceq 'engine') {
        $script:DreamSkinForceOneSwapFailure = $false
        throw 'forced atomic patch swap failure'
      }
      [System.IO.Directory]::Move($sourceFull, $destinationFull)
'@
  )
  [System.IO.File]::WriteAllText(
    $failurePatch,
    $failurePatchText,
    [System.Text.UTF8Encoding]::new($false)
  )
  $forcedPatchFailed = $false
  try {
    & (Join-Path $failureSourceRoot 'scripts\patch-dream-skin.ps1') `
      -SourceRoot $failureSourceRoot -StateRoot $stateRoot
  } catch {
    if ($_.Exception.Message -notlike '*forced atomic patch swap failure*') { throw }
    $forcedPatchFailed = $true
  }
  if (-not $forcedPatchFailed) {
    throw 'The forced patch swap failure did not stop the transaction.'
  }
  $afterFailedSwap = @(
    Get-ChildItem -LiteralPath $engineRoot -Recurse -File -Force |
      Sort-Object FullName |
      ForEach-Object {
        $relative = $_.FullName.Substring($enginePrefix.Length)
        "$relative=$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)"
      }
  ) -join "`n"
  if ($beforeFailedSwap -cne $afterFailedSwap) {
    throw 'A failed atomic patch swap did not restore the exact previous engine.'
  }

  [System.IO.File]::AppendAllText(
    $installedExtensionScript,
    "`r`n// preserve this exact stale extension on verification rollback`r`n",
    [System.Text.UTF8Encoding]::new($false)
  )
  $beforeFailedVerification = @(
    Get-ChildItem -LiteralPath $engineRoot -Recurse -File -Force |
      Sort-Object FullName |
      ForEach-Object {
        $relative = $_.FullName.Substring($enginePrefix.Length)
        "$relative=$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)"
      }
  ) -join "`n"
  $verificationPatchText = [System.IO.File]::ReadAllText($patchScript)
  $installedHashNeedle = '        $installedHash = (Get-FileHash -LiteralPath $pair.Installed -Algorithm SHA256).Hash'
  if (-not $verificationPatchText.Contains($installedHashNeedle)) {
    throw 'Could not install the extension verification failure seam in the patch fixture.'
  }
  $verificationPatchText = $verificationPatchText.Replace(
    $installedHashNeedle,
    @'
        if ($pair.Relative -ceq 'assets\internet-angel-extension.js') {
          [System.IO.File]::AppendAllText($pair.Installed, '// forced extension verification mismatch')
        }
        $installedHash = (Get-FileHash -LiteralPath $pair.Installed -Algorithm SHA256).Hash
'@
  )
  [System.IO.File]::WriteAllText($failurePatch, $verificationPatchText, [System.Text.UTF8Encoding]::new($true))
  $verificationPatchFailed = $false
  try {
    & $failurePatch -SourceRoot $failureSourceRoot -StateRoot $stateRoot
  } catch {
    if ($_.Exception.Message -notlike '*previous engine was restored*internet-angel-extension.js*') { throw }
    $verificationPatchFailed = $true
  }
  $afterFailedVerification = @(
    Get-ChildItem -LiteralPath $engineRoot -Recurse -File -Force |
      Sort-Object FullName |
      ForEach-Object {
        $relative = $_.FullName.Substring($enginePrefix.Length)
        "$relative=$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash)"
      }
  ) -join "`n"
  if (-not $verificationPatchFailed -or $beforeFailedVerification -cne $afterFailedVerification) {
    throw 'An extension hash mismatch did not restore the byte-exact previous engine.'
  }
  & $patchScript -SourceRoot $Root -StateRoot $stateRoot
  if ((Get-FileHash -LiteralPath $installedExtensionScript -Algorithm SHA256).Hash -cne
    (Get-FileHash -LiteralPath $sourceExtensionScript -Algorithm SHA256).Hash) {
    throw 'The extension did not repair after verification rollback.'
  }

  $transactionDirectories = @(Get-ChildItem -LiteralPath $stateRoot -Directory -Force |
    Where-Object {
      $_.Name -like '.engine-patch*' -or
      $_.Name -like '.engine-patch-backup*' -or
      $_.Name -like '.engine-patch-failed*'
    })
  if ($transactionDirectories.Count -ne 0) {
    throw 'Runtime patch left staging or backup transaction directories behind.'
  }
} finally {
  Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Output 'PASS: runtime patch atomically replaces launcher, injector, and renderer/css payloads, preserves state, and restores exact bytes on swap failure.'
