# Codex Dream Skin for Windows

[中文](README.md) · [English](README.en.md)

An INTERNET ANGEL theme for Codex Desktop, with custom backgrounds, saved themes, motion effects, and appearance recovery. Themes load through local CDP, while the sidebar, tasks, and composer use native Codex controls.

## Requirements

- Windows 10 or newer, x64.
- Official `OpenAI.Codex` installed from Microsoft Store, registered for the current user, and launched successfully at least once.
- Windows PowerShell 5.1 or newer.
- Release Setup includes Node.js; source installation requires Node.js 22+ and .NET SDK 8+.

## Release installation

Download Setup.exe and `SHA256SUMS.txt` from [Releases](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest), verify the checksum, and run the installer. Installation is per user. See the [Windows installation guide](../docs/install-windows.en.md) for first launch, SmartScreen prompts, updates, and removal.

Open **Codex Dream Skin** to enter the native theme manager. Right-click the tray icon to apply a theme, switch saved themes, or restore the appearance. Double-clicking the icon also opens the manager.

## Source installation

Exit Codex and the Dream Skin tray, then run from the repository root:

```powershell
node .\tools\build-theme-manager.mjs
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\install-dream-skin.ps1
```

The installer validates the official Store package and runtime, backs up managed appearance settings, and initializes the theme library. It creates these entries by default:

| Entry | Purpose |
| --- | --- |
| `Codex Dream Skin` | Open the native theme manager and tray |
| `Codex Dream Skin - Tray` | Open tray controls |
| `Codex Dream Skin - Restore` | Restore the stock appearance and close the managed CDP session |

The default port search starts at `9335`. Add `-Port 9444` to the installation command to specify a port in `1024–65535`. Scripts use `RemoteSigned`, and deployment validates the managed runtime checksums.

After updating the source, exit Codex and the tray, then repeat the build and installation commands. Personal themes, images, and preferences are preserved.

## Launch and verification

Right-click the tray icon and apply the theme, or run from the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\start-dream-skin.ps1 -PromptRestart
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\verify-dream-skin.ps1 `
  -ScreenshotPath "$env:TEMP\codex-dream-skin.png"
```

The launcher asks before restarting a running Codex session. Verification checks the CDP identity, skin version, native controls, and decorative layers. Use the screenshot to check overflow and contrast. See the [QA checklist](references/qa-inventory.md) for interaction checks.

## Themes and motion

The tray provides background replacement, ZIP import, theme saving and switching, motion settings, pause, reapply, and restore. The initial installation includes the Internet Angel JPEG theme.

The native manager adjusts the current theme's background transparency and moves inactive themes to the Recycle Bin. See the [theme manager guide](theme-manager/README.en.md).

- Backgrounds support PNG, JPEG, and WebP, up to 10 MiB, 16384 pixels per edge, and 50 million pixels total.
- Use **Import Theme ZIP…** to add a pack to the library, then apply it from **Saved Themes**. See [theme management](../docs/theme-management.en.md) for formats and limits.
- Motion offers System, Off, Subtle, and Full modes plus five effect switches. See [motion settings](../docs/theme-motion.en.md).
- DreamSkin.cc's **Apply in app** opens a confirmation before downloading and validating the theme. Save input before any requested Codex launch or restart; the client first verifies the current visible theme to establish a rollback baseline.

## Acrylic window material

Desktop Acrylic is available on Windows 11 22621+ with system transparency effects enabled. The setting takes effect on the next Dream Skin launch:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\manage-window-effects.ps1 -Set Acrylic
```

Use `-Status` to inspect the setting or `-Set System` to restore the system material.

## Automatic handoff from the official shortcut

This option is off by default. Enable the per-user watcher while protecting the Codex session already open at the time:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\manage-auto-launch-dream-skin.ps1 -Enable -ProtectCurrentSession
```

After that session ends, newly launched stock Codex sessions receive a three-second grace period before handoff to Dream Skin. Handoff closes the stock session; after a 15-second graceful-close window, remaining verified processes may be force-stopped. Save input first.

Each Windows user can own one watcher and one live managed session, including across Fast User Switching and RDP. Use `-Status` to inspect the watcher or `-Disable` to stop it and remove its Startup entry.

## Restore

Choose restore from the tray menu, or run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\restore-dream-skin.ps1 `
  -RestoreBaseTheme -PromptRestart
```

Add `-Uninstall` to remove shortcuts created by source installation. `-RecoverConfigBackup` saves the current configuration before restoring the complete pre-install `config.toml`; use it for configuration damage that normal appearance recovery cannot resolve.

End the debug session with a full restore and restart, or quit all Codex processes and reopen through the official entry. Pausing the theme keeps the debug session open. See [SECURITY.md](../SECURITY.md) for local CDP access details.

## Files and logs

| Purpose | Path |
| --- | --- |
| Runtime | `%LOCALAPPDATA%\CodexDreamSkin\engine` |
| Active theme | `%LOCALAPPDATA%\CodexDreamSkin\active-theme` |
| Theme library | `%LOCALAPPDATA%\CodexDreamSkin\themes` |
| Image archive | `%LOCALAPPDATA%\CodexDreamSkin\images` |
| Session state | `%LOCALAPPDATA%\CodexDreamSkin\state.json` |
| Logs | `%LOCALAPPDATA%\CodexDreamSkin\injector.log`, `injector-error.log`, `verify.log` |
| Codex configuration | `%USERPROFILE%\.codex\config.toml` |

## Troubleshooting and development

| Situation | Action |
| --- | --- |
| Source installation cannot find Node.js | Confirm 22+ with `node --version`, then reopen PowerShell |
| Store package missing | Check the current user's installation with `Get-AppxPackage -Name OpenAI.Codex` |
| Theme manager missing | Rebuild and reinstall the manager, or rerun Release Setup |
| Specified port occupied | Choose another available port |
| Theme fails after a Codex update | Update and reinstall Dream Skin, then apply from the tray |
| CDP endpoint missing | Apply from the tray, retry, and retain launch and verification logs |

See [runtime notes](references/runtime-notes.md) for compatibility and recovery details, and [platform reference](../docs/platforms.en.md) for paths. When filing a [bug](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/issues/new/choose), include Windows, Codex, and Dream Skin versions, reproduction steps, and logs with credentials and private content removed.

Run regression checks from the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\tests\run-tests.ps1
node .\tools\internet-angel-extension.test.mjs
node .\windows\scripts\injector.mjs --check-payload
```

See the [native manager guide](theme-manager/README.en.md) for its build and tests, and [SKILL.md](SKILL.md) for maintainer constraints.
