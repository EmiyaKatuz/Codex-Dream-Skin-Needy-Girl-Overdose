# Windows installation and updates

[中文](install-windows.md) · [English](install-windows.en.md)

For Windows 10+ x64. Release Setup includes the required runtime and installs for the current user.

## First installation

1. Install official `OpenAI.Codex` from Microsoft Store, launch it successfully once, then exit.
2. Download `CodexDreamSkin-Setup-vX.Y.Z.exe` and `SHA256SUMS.txt` from [Releases](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest), and verify the installer's SHA-256.
3. Run the installer and complete the wizard.
4. Open **Codex Dream Skin** from the Start menu, then right-click its tray icon and apply the theme. If Codex is running, save input and confirm the requested restart.

### SmartScreen prompts

Current packages are unsigned and may show **Windows protected your PC**. Verify the filename, repository source, and SHA-256, then choose **More info → Run anyway**. When organization policy restricts execution, contact an administrator or use an approved distribution method, keeping system protection enabled.

Setup runs per user. Cancel any unexpected administrator password prompt and verify the download source.

## Daily use

| Entry | Action |
| --- | --- |
| Codex Dream Skin in the Start menu or on the desktop | Open the native theme manager |
| Double-click the tray icon | Open the same manager |
| Right-click the tray icon | Apply themes, replace backgrounds, import ZIPs, save and switch themes, configure motion, pause, or restore |

The manager adjusts the current theme's background transparency and moves inactive themes to the Recycle Bin. Themes, images, and preferences live under `%LOCALAPPDATA%\CodexDreamSkin`.

Choose **Import Theme ZIP…**, then apply the imported theme from **Saved Themes**. See [theme management](theme-management.en.md) for pack formats, image limits, and manual directory placement, and [motion settings](theme-motion.en.md) for animation options.

## Updates

1. Download the new Setup.exe and `SHA256SUMS.txt`, and verify the checksum.
2. Exit the Dream Skin tray and close Codex.
3. Run the new installer over the existing installation.
4. Reopen Codex Dream Skin and apply the theme from the tray.

Updates preserve the active theme, library, images, and configuration backups. A newly downloaded installer may trigger SmartScreen again.

The tray's **Check for updates** contacts GitHub Releases when clicked and opens the download entry. Users perform the download and installation.

## Restore and uninstall

Choose restore from the tray menu, then follow the prompts to close and reopen Codex. This restores the stock appearance and ends the debug session. Pausing the skin keeps that session open. See [SECURITY.md](../SECURITY.md) for local CDP access details.

Uninstall Codex Dream Skin through **Settings → Apps → Installed apps**. The uninstaller first restores the appearance and closes the managed session; a recovery failure stops removal and preserves runtime files for another attempt. Themes and images are kept by default. After backing up anything needed, you can manually remove `%LOCALAPPDATA%\CodexDreamSkin`.

## Troubleshooting

| Situation | Action |
| --- | --- |
| SmartScreen has no **Run anyway** option | Contact an administrator or use an approved channel; include Windows version, prompt details, and installer checksum when reporting |
| Node.js or the manager is missing | Rerun the latest Release Setup and retain installation logs |
| Official Store package missing or unverifiable | Confirm Codex came from Microsoft Store, is registered for this user, and has launched successfully once |
| `config.toml` syntax error | Back up the file and fix the reported TOML syntax; valid multiline arrays are supported |
| Theme fails after a Codex update | Exit the tray, rerun the latest Setup, and apply from the tray |

See the [Windows development and usage guide](../windows/README.en.md) for source installation, ports, and Acrylic. When filing a [bug](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/issues/new/choose), include versions, reproduction steps, and logs with credentials and private content removed.
