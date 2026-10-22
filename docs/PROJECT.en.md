# Project overview

[中文](./PROJECT.md) · [English](./PROJECT.en.md)

Codex Dream Skin adds an INTERNET ANGEL theme to Codex Desktop. The current version is **1.8.0**, with support for Windows, macOS, and Linux.

## Features and runtime

The theme covers the home screen, sidebar, conversations, composer, settings, and terminal with shared motion effects. macOS and Windows also support custom backgrounds, theme ZIP imports, saved themes, switching, and background transparency.

Platform launchers connect to Codex over loopback CDP and load shared styles and decorations into a verified renderer. Platform scripts handle startup, configuration, state, and restoration; shared sources live in `runtime/`.

## Directories

| Directory | Contents |
| --- | --- |
| `runtime/` | Shared styles, renderer adaptation, motion, theme validation, and preferences |
| `macos/` | Menu-bar app, scripts, bundled theme, and DMG build |
| `windows/` | Tray, native theme manager, PowerShell scripts, and Setup build |
| `linux/` | Install, start, and restore scripts, plus distribution archive build |
| `tools/` | Shared asset synchronization, compatibility checks, and regression tools |
| `docs/` | User guides, development references, and release history |

## Maintaining documentation

Chinese and English versions use matching sections and steps with language links at the top. `README.md` is the default Chinese page, `README.zh-CN.md` matches it, and `README.en.md` is the English page. Short documents and documents included in standalone packages may contain both languages in one file.

Base updates on current code and release assets. Keep installation and usage steps in platform guides, with theme formats and motion settings in their shared guides. Historical changes live in `docs/releases/` and platform `CHANGELOG.md` files.

## Links

- [Download and usage](../README.en.md)
- [Platforms and development](./platforms.en.md)
- [Theme management and format](./theme-management.en.md)
- [Motion settings](./theme-motion.en.md)
- [Background creation](./reference-background-prompt-guide.en.md)
- [Release process](./releases/README.md)

Based on [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin). See [LICENSE](../LICENSE) and the [asset notice](../macos/NOTICE.md).
