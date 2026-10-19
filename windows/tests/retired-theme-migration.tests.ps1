[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $Root 'scripts\common-windows.ps1')
. (Join-Path $Root 'scripts\theme-windows.ps1')
$fixture = Join-Path ([System.IO.Path]::GetTempPath()) ('dreamskin-retired-migration-' + [guid]::NewGuid().ToString('N'))
$engine = Join-Path $fixture 'engine'
$assets = Join-Path $engine 'assets'
$stateRoot = Join-Path $fixture 'state'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$operation = $null

function Get-RetiredFixtureHashes([string]$Directory) {
  $prefix = [System.IO.Path]::GetFullPath($Directory).TrimEnd('\') + '\'
  return @(
    Get-ChildItem -LiteralPath $Directory -Recurse -File -Force | Sort-Object FullName | ForEach-Object {
      $_.FullName.Substring($prefix.Length) + '=' + (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
    }
  ) -join "`n"
}

function Write-RetiredFixturePack([string]$Directory, [string]$Id, [string]$Name, [switch]$Customized) {
  New-Item -ItemType Directory -Path $Directory -Force | Out-Null
  $theme = $script:retiredFixtureTemplate | ConvertTo-Json -Depth 12 | ConvertFrom-Json
  $theme.id = $Id; $theme.name = $Name; $theme.image = 'old.jpg'
  if ($Customized) { $theme.tagline = 'A real user customization must survive.' }
  Write-DreamSkinTheme -ThemeDirectory $Directory -Theme $theme
  Copy-Item -LiteralPath (Join-Path $Root 'assets\dream-reference.jpg') -Destination (Join-Path $Directory 'old.jpg')
}

try {
  New-Item -ItemType Directory -Path $assets -Force | Out-Null
  foreach ($file in @('theme.json', 'dream-reference.jpg')) {
    Copy-Item -LiteralPath (Join-Path $Root "assets\$file") -Destination (Join-Path $assets $file)
  }
  $retained = (Read-DreamSkinUtf8File -Path (Join-Path $assets 'theme.json')) | ConvertFrom-Json
  $script:retiredFixtureTemplate = $retained | ConvertTo-Json -Depth 12 | ConvertFrom-Json
  $script:retiredFixtureTemplate.id = 'preset-retired-fixture'
  $script:retiredFixtureTemplate.name = 'Pixel Cafe'
  $script:retiredFixtureTemplate.image = 'old.jpg'
  $script:retiredFixtureTemplate.tagline = 'Retired fixture metadata differs from the retained JPEG.'
  $imageHash = (Get-FileHash -LiteralPath (Join-Path $assets 'dream-reference.jpg') -Algorithm SHA256).Hash.ToLowerInvariant()
  $catalog = [ordered]@{
    schemaVersion = 1; version = '1.7.2'
    retained = [ordered]@{ theme = $retained; imageSha256 = $imageHash }
    templates = @([ordered]@{ key = 'retired-fixture'; theme = $script:retiredFixtureTemplate; imageSha256 = $imageHash })
  }
  Write-DreamSkinUtf8FileAtomically -Path (Join-Path $assets 'retired-theme-catalog.json') `
    -Content ($catalog | ConvertTo-Json -Depth 16)
  # Only the test engine supplies a catalog override. Its shim calls the real
  # migration API; the production CLI cannot accept a user-provided catalog.
  $realModule = (Join-Path $Root 'assets\retired-theme-migration.mjs') | ConvertTo-Json -Compress
  $shim = @'
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const { migrateRetiredThemes } = await import(pathToFileURL(__REAL_MODULE__).href);
const args = process.argv.slice(2);
const value = name => args[args.indexOf(name) + 1];
const catalog = JSON.parse(fs.readFileSync(new URL('./retired-theme-catalog.json', import.meta.url), 'utf8'));
try {
  const result = await migrateRetiredThemes({stateRoot:value('--state-root'), activeName:value('--active-name'), defaultThemeDir:value('--default-theme-dir'), catalog});
  console.log(JSON.stringify(result));
} catch { console.error('fixture migration failed'); process.exitCode = 1; }
'@
  [System.IO.File]::WriteAllText((Join-Path $assets 'retired-theme-migration.mjs'), $shim.Replace('__REAL_MODULE__', $realModule), $utf8)
  $operation = Enter-DreamSkinOperationLock
  $paths = Initialize-DreamSkinThemeStore -SkillRoot $engine -StateRoot $stateRoot
  $retiredDirectory = Join-Path $paths.Saved 'preset-retired-fixture'
  $renamedDirectory = Join-Path $paths.Saved 'renamed-pixel-cafe'
  $customDirectory = Join-Path $paths.Saved 'custom-same-name'
  $cssDirectory = Join-Path $paths.Saved 'custom-css'
  Write-RetiredFixturePack $retiredDirectory 'preset-retired-fixture' 'Pixel Cafe'
  Write-RetiredFixturePack $renamedDirectory '20261019-060500-1234abcd' 'Renamed old wallpaper'
  Write-RetiredFixturePack $customDirectory 'custom-same-name' 'Pixel Cafe' -Customized
  Write-RetiredFixturePack $cssDirectory 'custom-css' 'Pixel Cafe'
  [System.IO.File]::WriteAllText((Join-Path $cssDirectory 'theme.css'), '[data-ds-part="root"] { color: #ff45c8; }', $utf8)
  $activeTheme = $script:retiredFixtureTemplate | ConvertTo-Json -Depth 12 | ConvertFrom-Json
  $null = Set-DreamSkinActiveTheme -ImagePath (Join-Path $retiredDirectory 'old.jpg') -Theme $activeTheme -StateRoot $stateRoot
  # The first initialization only seeds this isolated fixture. Remove its marker
  # to represent an existing v1.7.1 installation that has never been migrated.
  Remove-Item -LiteralPath (Join-Path $stateRoot '.retired-theme-migration-1.7.2.json') -Force
  $beforeActive = Get-RetiredFixtureHashes $paths.Active
  $beforeRetired = Get-RetiredFixtureHashes $retiredDirectory
  $beforeRenamed = Get-RetiredFixtureHashes $renamedDirectory
  $beforeCustom = Get-RetiredFixtureHashes $customDirectory
  $beforeCss = Get-RetiredFixtureHashes $cssDirectory

  if (-not ('DreamSkinRetiredMigrationMutexHolder' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Threading;
public sealed class DreamSkinRetiredMigrationMutexHolder : IDisposable {
    readonly ManualResetEvent ready = new ManualResetEvent(false);
    readonly ManualResetEvent release = new ManualResetEvent(false);
    readonly Thread thread;
    public bool Acquired;
    public DreamSkinRetiredMigrationMutexHolder(string name) {
        thread = new Thread(() => {
            using (var mutex = new Mutex(false, name)) {
                try { Acquired = mutex.WaitOne(0); }
                catch (AbandonedMutexException) { Acquired = true; }
                ready.Set();
                if (Acquired) { release.WaitOne(); mutex.ReleaseMutex(); }
            }
        });
        thread.IsBackground = true; thread.Start();
        if (!ready.WaitOne(5000)) throw new Exception("Mutex holder did not become ready.");
    }
    public void Dispose() { release.Set(); thread.Join(); ready.Dispose(); release.Dispose(); }
}
'@
  }
  $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $holder = [DreamSkinRetiredMigrationMutexHolder]::new("Local\CodexDreamSkin.$sid.ThemeImport")
  try {
    if (-not $holder.Acquired) { throw 'The native ThemeImport collision fixture could not acquire its mutex.' }
    $rejected = $false
    try { Invoke-DreamSkinRetiredThemeMigration -SkillRoot $engine -StateRoot $stateRoot } catch {
      if ($_.Exception.Message -notlike '*Another theme operation*') { throw }
      $rejected = $true
    }
    if (-not $rejected -or (Get-RetiredFixtureHashes $paths.Active) -cne $beforeActive -or
      (Get-RetiredFixtureHashes $retiredDirectory) -cne $beforeRetired -or
      (Test-Path -LiteralPath (Join-Path $stateRoot 'retired-themes'))) {
      throw 'A real concurrent ThemeImport operation did not block migration before any theme mutation.'
    }
  } finally { $holder.Dispose() }

  $null = Initialize-DreamSkinThemeStore -SkillRoot $engine -StateRoot $stateRoot
  $active = Read-DreamSkinTheme -ThemeDirectory $paths.Active
  $saved = @(Get-DreamSkinSavedThemes -StateRoot $stateRoot)
  if ($active.Theme.id -cne 'preset-internet-angel-default' -or $saved.Count -ne 3 -or
    (Test-Path -LiteralPath $retiredDirectory) -or (Test-Path -LiteralPath $renamedDirectory)) {
    throw 'Initialization did not replace the retired active theme and remove matching retired entries from tray discovery.'
  }
  if ((Get-RetiredFixtureHashes $customDirectory) -cne $beforeCustom -or
    (Get-RetiredFixtureHashes $cssDirectory) -cne $beforeCss) {
    throw 'Migration changed a same-name customized theme or a user Safe CSS variant.'
  }
  $backups = @(Get-ChildItem -LiteralPath (Join-Path $stateRoot 'retired-themes') -Directory)
  if ($backups.Count -ne 1) { throw 'Migration did not create exactly one versioned backup.' }
  $manifest = (Read-DreamSkinUtf8File -Path (Join-Path $backups[0].FullName 'manifest.json')) | ConvertFrom-Json
  $retiredEntry = @($manifest.themes | Where-Object { $_.source -ceq 'preset-retired-fixture' })
  $renamedEntry = @($manifest.themes | Where-Object { $_.source -ceq 'renamed-pixel-cafe' })
  if (-not $manifest.activeReplaced -or $retiredEntry.Count -ne 1 -or $renamedEntry.Count -ne 1 -or
    (Get-RetiredFixtureHashes (Join-Path $backups[0].FullName 'active-theme')) -cne $beforeActive -or
    (Get-RetiredFixtureHashes (Join-Path $backups[0].FullName $retiredEntry[0].backup)) -cne $beforeRetired -or
    (Get-RetiredFixtureHashes (Join-Path $backups[0].FullName $renamedEntry[0].backup)) -cne $beforeRenamed) {
    throw 'Retired theme backups did not retain the exact old active and saved files.'
  }
  $afterMigration = Get-RetiredFixtureHashes $stateRoot
  $null = Initialize-DreamSkinThemeStore -SkillRoot $engine -StateRoot $stateRoot
  if ((Get-RetiredFixtureHashes $stateRoot) -cne $afterMigration -or
    @(Get-ChildItem -LiteralPath (Join-Path $stateRoot 'retired-themes') -Directory).Count -ne 1) {
    throw 'Repeated initialization changed the migrated state or created another backup.'
  }
  Write-Host 'Retired-theme migration native integration tests passed.'
} finally {
  if ($operation) { Exit-DreamSkinOperationLock -Mutex $operation }
  if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}
