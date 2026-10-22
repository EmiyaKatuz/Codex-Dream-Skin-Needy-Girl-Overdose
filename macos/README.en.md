# Codex Dream Skin · macOS

[中文](README.md) · [Project home](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/README.en.md)

An INTERNET ANGEL theme for Codex Desktop with motion effects and local theme management. The menu-bar app provides image selection, theme import, transparency, pause, and restore controls.

## Install

Requires macOS 13 or later and the official Codex Desktop app, launched at least once. The theme engine uses Node.js bundled with official Codex.

Download `CodexDreamSkin-vX.Y.Z.dmg` from [Releases](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest), move **Codex Dream Skin.app** to Applications, and open it. See the [macOS installation guide](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/install-macos.en.md) for first launch, updates, and uninstalling.

## Install from source

Run from this directory after quitting Codex:

```bash
./scripts/install-dream-skin-macos.sh --no-launch
~/.codex/codex-dream-skin-studio/scripts/start-dream-skin-macos.sh
```

The installer creates four desktop `.command` launchers: start, customize, verify, and restore. Installed locations:

| Content | Path |
| --- | --- |
| Engine | `~/.codex/codex-dream-skin-studio` |
| Themes, images, state, and logs | `~/Library/Application Support/CodexDreamSkinStudio` |
| Saved themes | `~/Library/Application Support/CodexDreamSkinStudio/themes` |
| Appearance configuration backup | `~/Library/Application Support/CodexDreamSkinStudio/theme-backup.json` |

## Daily use

The menu-bar **Theme** menu provides background transparency and motion settings. Transparency ranges from 0–100%; **Follow theme** uses the author's setting, with a 30% default. Motion modes are System, Off, Subtle, and Full. See [theme management](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/theme-management.en.md) and [motion effects](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/theme-motion.en.md).

Source installations also provide these commands:

```bash
~/.codex/codex-dream-skin-studio/scripts/verify-dream-skin-macos.sh
~/.codex/codex-dream-skin-studio/scripts/pause-dream-skin-macos.sh
~/.codex/codex-dream-skin-studio/scripts/restore-dream-skin-macos.sh --restore-base-theme --restart-codex
```

Restore removes the theme and restarts Codex normally, ending the CDP debugging session. See the [security documentation](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/SECURITY.md) for runtime behavior and the local debugging port.

## Images and themes

The bundled preset is the customized **INTERNET ANGEL** JPEG theme. Installation copies it into the theme library. Upgrades preserve personal themes, imported images, and preferences, and archive recognized, unchanged retired presets under `retired-themes/`. See [bundled themes](presets/README.en.md).

- Choose **Import theme ZIP…**, then select the imported theme under **Saved themes** to apply it. See [theme management](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/theme-management.en.md) for the format.
- Image selection supports PNG, JPEG, HEIC, TIFF, and WebP. Source files are limited to 50 MiB; prepared backgrounds to 10 MiB, 16384 pixels per edge, and 50 megapixels.
- Use `2560 × 1440` background artwork with the subject toward the right and calm space on the left. See the [background prompt guide](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/reference-background-prompt-guide.en.md) for composition templates.

Adjust a local image's composition:

```bash
~/.codex/codex-dream-skin-studio/scripts/load-image-theme-macos.sh \
  --file "/path/to/background.jpg" \
  --appearance auto \
  --focus-x 0.72 --focus-y 0.45 \
  --safe-area left --task-mode banner
```

| Option | Values or purpose |
| --- | --- |
| `--appearance` | `auto` follows Codex appearance; `light` and `dark` select a fixed mode |
| `--focus-x` / `--focus-y` | `0..1`, the subject's position |
| `--safe-area` | `auto`, `left`, `right`, `center`, `none` |
| `--task-mode` | `auto`, `ambient`, `banner`, `full`, `off`; controls task-page artwork |

The engine analyzes image brightness, palette, and composition locally. Explicit theme fields take precedence over automatic analysis. To customize the palette:

```bash
~/.codex/codex-dream-skin-studio/scripts/customize-theme-macos.sh \
  --image "/path/to/background.jpg" --name "My theme" \
  --accent "#ff45c8" --secondary "#36d7e8" --highlight "#642a8c"
```

## Development and verification

Run from this directory:

```bash
node scripts/injector.mjs --check-payload
./tests/run-tests.sh
swift test --package-path menubar-app
./scripts/build-dmg.sh
```

The DMG is written to `macos/release/`. Native builds and interaction checks require macOS. See [platforms](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/platforms.en.md) for the shared architecture.

## License

Software is licensed under [MIT](LICENSE). Artwork and runtime terms are in [NOTICE.md](NOTICE.md).
