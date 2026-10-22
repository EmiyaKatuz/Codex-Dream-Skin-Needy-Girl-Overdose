# Codex Dream Skin · INTERNET ANGEL

[中文](./README.md) · [English](./README.en.md)

An INTERNET ANGEL theme for Codex Desktop on Windows, macOS, and Linux.

<p align="center">
  <img src="windows/assets/dream-reference.jpg" alt="INTERNET ANGEL theme background" width="900">
</p>

Current version: **1.8.0** · [Release notes](./docs/releases/v1.8.0-en.md) · [Download](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest)

## Features

- Themes the home screen, sidebar, conversations, composer, settings, and terminal.
- Adds task feedback, a pixel character, stars, and blinking animation for the bundled wallpaper character.
- macOS and Windows support custom backgrounds, theme ZIP imports, saved themes, switching, and background transparency.
- Provides motion and restore controls through the macOS menu bar, Windows tray, or Linux commands.

## Install

Install and launch Codex Desktop once, then follow your platform guide.

| Platform | Download and requirements | Guide |
| --- | --- | --- |
| Windows | `CodexDreamSkin-Setup-vX.Y.Z.exe`; Microsoft Store Codex; bundled Node.js | [Install and update](./docs/install-windows.en.md) |
| macOS | `CodexDreamSkin-vX.Y.Z.dmg`; uses Node.js from Codex | [Install and update](./docs/install-macos.en.md) |
| Linux | Node.js 20+; primarily supports AUR `openai-codex-desktop` | [Install and commands](./linux/README.md#english) |

Download Windows and macOS packages from the [latest release](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest) and verify them against `SHA256SUMS.txt` before running. Source installation: [Windows](./windows/README.en.md) · [macOS](./macos/README.en.md) · [Linux](./linux/README.md#english).

## Use

- **Themes**: use the macOS **Theme** menu or the Windows tray to switch and import themes. Open the Codex Dream Skin window on Windows to adjust transparency and delete saved themes. See [theme management](./docs/theme-management.en.md).
- **Motion**: choose System, Off, Subtle, or Full. Full mode enables home-screen characters and ambient effects; system reduced-motion settings take priority. See [motion settings](./docs/theme-motion.en.md).
- **Update and restore**: quit Codex and the theme tool before installing an update. Use the restore control described in your platform guide to return to the original appearance.

## Documentation

| Topic | 中文 | English |
| --- | --- | --- |
| Project overview | [阅读](./docs/PROJECT.md) | [Read](./docs/PROJECT.en.md) |
| Platforms and development | [阅读](./docs/platforms.md) | [Read](./docs/platforms.en.md) |
| Theme management and format | [阅读](./docs/theme-management.md) | [Read](./docs/theme-management.en.md) |
| Motion settings | [阅读](./docs/theme-motion.md) | [Read](./docs/theme-motion.en.md) |
| Background creation | [阅读](./docs/reference-background-prompt-guide.md) | [Read](./docs/reference-background-prompt-guide.en.md) |

See [SECURITY.md](./SECURITY.md) for runtime and security information.

## Origin and license

A community-maintained fork of [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin). Thanks to early theme contributor [@seansong-ideogram](https://github.com/seansong-ideogram).

Code is [MIT licensed](./LICENSE). Codex, theme assets, and trademarks belong to their respective rights holders; see the [asset notice](./macos/NOTICE.md).
