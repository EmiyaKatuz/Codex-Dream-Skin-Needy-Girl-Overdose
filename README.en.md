# Codex Dream Skin · INTERNET ANGEL

<p align="center">
  <a href="./README.md">中文</a> · <strong>English</strong>
</p>

<p align="center">
  <strong>An immersive INTERNET ANGEL theme for Codex Desktop.</strong><br>
  Shared three-platform overlays · Native-control styling · Animated states · Local theme management
</p>

<p align="center">
  <img src="windows/assets/dream-reference.jpg" alt="INTERNET ANGEL theme background" width="900">
</p>

> Current version: `1.5.19`. Windows, macOS, and Linux share the same INTERNET ANGEL component classifier, overlay, and animation runtime.

This independent fork builds on [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin). Its focus is the INTERNET ANGEL visual system, cross-platform parity, launcher compatibility, and clear security boundaries.

## Features

- Styles the home screen, sidebar, tasks, composer, settings, terminal, permissions, diffs, subagents, and status surfaces.
- Synchronizes one component classifier, dedicated overlay, and animation layer from [`runtime/`](./runtime/) to Windows, macOS, and Linux. Theme switching cleans up old observers, listeners, and component marks.
- Supports bundled themes, local images, theme ZIP archives, Safe CSS, saved themes, and live switching.
- Provides Windows Setup, tray controls, Start menu entries, desktop shortcuts, update checks, pause, and restore.
- Provides a macOS DMG and menu-bar app plus Linux install and release scripts.
- Uses loopback-only CDP while leaving official Codex binaries, signatures, `WindowsApps` permissions, and `app.asar` unchanged.

## Install

### Windows Release

1. Download `CodexDreamSkin-Setup-vX.Y.Z.exe` and `SHA256SUMS.txt` from the [latest release](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest).
2. Verify the Setup.exe SHA-256.
3. Run the installer, then launch `Codex Dream Skin` from the Start menu.

Setup includes a pinned, hash-validated Node.js runtime, so release users do not need a separate Node.js installation. Current packages are unsigned; verify the download source and checksum before approving a SmartScreen prompt. See the [Windows installation guide](./docs/install-windows.md) for updates, theme import, recovery, and uninstall steps.

If official Store package validation fails, confirm that Codex came from Microsoft Store, is registered for the current Windows user, and has launched successfully at least once. Validation covers the Store signature, development mode, package manifest, `app\ChatGPT.exe`, and AUMID.

### Windows from source

Requires Node.js 22 or newer and Windows PowerShell 5.1 or PowerShell 7:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\install-dream-skin.ps1
```

Runtime and theme data are installed under `%LOCALAPPDATA%\CodexDreamSkin`. The installer creates `Codex Dream Skin`, `Codex Dream Skin - Tray`, and `Codex Dream Skin - Restore` desktop shortcuts.

### macOS

Download `CodexDreamSkin-vX.Y.Z.dmg` from the [latest release](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest), move the app to Applications, and launch it. The DMG includes its runtime. Current builds use ad-hoc signing; complete the first-launch approval in macOS Settings. See the [macOS installation guide](./docs/install-macos.md).

### Linux

Linux support is primarily tested with AUR [`openai-codex-desktop`](https://aur.archlinux.org/packages/openai-codex-desktop) and requires Node.js 20 or newer:

```bash
./linux/scripts/install-dream-skin-linux.sh
```

See the [Linux guide](./linux/README.md) for verification, restore, release archives, and custom paths.

## Update and restore

- Release users: exit Codex and the tray, verify the new checksum, and install over the existing version.
- Source users: pull this fork and run the relevant installer again.
- Windows users can run `Codex Dream Skin - Restore` to return to the stock appearance.
- Themes, imported images, and configuration backups remain in the managed data directory.

## Technical and security notes

- CDP accepts only loopback endpoints with validated Browser IDs, page Target IDs, and WebSocket paths.
- Windows first verifies a visible native window through `Browser.getWindowForTarget` and its bounds.
- When Codex does not expose a CDP `Browser.WindowID`, the compatibility path accepts only Win32 HWND evidence. The launcher uses `EnumWindows` to require a visible, non-minimized, adequately sized HWND, then revalidates that the owning process belongs to the verified official `ChatGPT.exe`.
- DOM visibility, viewport size, and Codex structure remain independent hard requirements. Renderer evidence alone cannot satisfy native-window verification.
- Images, ZIP archives, paths, symbolic links, Safe CSS, runtime hashes, and process identities have bounded validation. See the [Windows installation guide](./docs/install-windows.md) for format limits.
- Loopback is not authentication; see [`SECURITY.md`](./SECURITY.md) for the CDP exposure window and safer operating guidance.

## Development and verification

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\tests\run-tests.ps1
node .\tools\internet-angel-extension.test.mjs
node .\windows\scripts\injector.mjs --check-payload
```

The macOS regression entry point is `./macos/tests/run-tests.sh`. See [`docs/platforms.md`](./docs/platforms.md) for platform architecture and theme formats. Historical release notes remain in [`windows/CHANGELOG.md`](./windows/CHANGELOG.md).

## Roadmap

- Add more animation differences for states such as thinking and output
- Maintain long-term compatibility with major Codex Desktop and upstream releases
- Continue miscellaneous fixes

## License and notice

- This is an unofficial, community-maintained project. Codex and related rights belong to their respective owners.
- IP assets and trademarks shown by this theme or skin belong to their respective owners.
- This project is MIT licensed; see [`LICENSE`](./LICENSE) and [`macos/NOTICE.md`](./macos/NOTICE.md).

## Credits

- Original project: [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)
- Gothic Void Crusade contributor: [@seansong-ideogram](https://github.com/seansong-ideogram)
