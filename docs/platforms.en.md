# Platforms and development

[中文](./platforms.md) · [English](./platforms.en.md)

## Platform support

| Item | Windows | macOS | Linux |
| --- | --- | --- | --- |
| Installation | Setup.exe, source scripts | DMG, source scripts | Source scripts, tar.gz archive |
| Controls | System tray, native theme manager | Menu-bar app | Shell commands |
| Codex source | Microsoft Store `OpenAI.Codex` | Official Codex app | Primarily AUR `openai-codex-desktop` |
| Runtime | Setup bundles Node.js; source requires Node.js 22+ | Uses Node.js from Codex | Node.js 20+ |
| Custom backgrounds and saved themes | Supported | Supported | Uses current configuration |
| Theme ZIP import and transparency menu | Supported | Supported | — |
| Motion settings and restore | Supported | Supported | Supported |

Windows debugging sessions use a separate managed profile, which may require signing in to Codex on first use. Linux accepts a custom executable path through `CODEX_APP_BIN`.

Installation and platform commands: [Windows](../windows/README.en.md) · [macOS](../macos/README.en.md) · [Linux](../linux/README.md#english).

## Default paths

| Platform | Installed engine | User data and logs |
| --- | --- | --- |
| Windows | `%LOCALAPPDATA%\CodexDreamSkin\engine` | `%LOCALAPPDATA%\CodexDreamSkin` |
| macOS | `~/.codex/codex-dream-skin-studio` | `~/Library/Application Support/CodexDreamSkinStudio` |
| Linux | `~/.codex/codex-dream-skin-linux` | `${XDG_STATE_HOME:-~/.local/state}/CodexDreamSkin` |

The Windows managed profile is stored in `cdp-profile/` under its data directory. Saved themes on macOS and Windows are stored in `themes/` under their respective data directories.

## Shared runtime

All three platforms load styles and decorations into a verified Codex renderer over loopback CDP. `runtime/` holds the shared sources; platform scripts handle app discovery, startup, configuration, and restoration.

After editing shared styles or scripts, synchronize assets from the repository root:

```bash
node tools/sync-runtime-assets.mjs
node tools/sync-runtime-assets.mjs --check
```

See [theme management](./theme-management.en.md) for theme formats and image settings, [motion settings](./theme-motion.en.md) for preferences, and [security information](../SECURITY.md) for CDP and path validation.

## Development checks

Node.js 22 is recommended for cross-platform Node checks. Run these commands from the repository root:

```bash
node --test macos/tests/*.test.mjs windows/tests/*.test.mjs tools/*.test.mjs
node tools/sync-runtime-assets.mjs --check
node tools/check-selector-provenance.mjs
node macos/scripts/injector.mjs --check-payload
node windows/scripts/injector.mjs --check-payload
node linux/scripts/injector.mjs --check-payload
```

Use the corresponding platform environment for native builds and tests:

- Windows: PowerShell 5.1 / 7; source installation requires .NET SDK 8+ to [build the theme manager](../windows/theme-manager/README.en.md).
- macOS: `./macos/tests/run-tests.sh`; see the [macOS guide](../macos/README.en.md) for menu-bar app and DMG builds.
- Linux: see the [Linux guide](../linux/README.md#english) for archive builds and desktop verification.

See the [release process](./releases/README.md) and [change history](../windows/CHANGELOG.md).
