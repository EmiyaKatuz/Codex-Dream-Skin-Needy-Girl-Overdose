# Theme management

[中文](./theme-management.md) · [English](./theme-management.en.md)

## Controls

| Platform | Entry point |
| --- | --- |
| macOS | Menu bar → **Theme** |
| Windows | Use the tray to switch, import, and save themes. Open **Codex Dream Skin** from the desktop or Start menu, or double-click the tray icon, to adjust transparency and delete saved themes |

Linux uses scripts and the current theme configuration. See the [Linux guide](../linux/README.md#english).

## Change, save, and import

- **Change background**: select a local image from the menu, then save the current theme for reuse. A `2560 × 1440` image in 16:9 is recommended; see the [background guide](./reference-background-prompt-guide.en.md).
- **Save and switch**: save the current theme, then select it under **Saved themes**.
- **Import ZIP**: choose **Import theme ZIP…**, then select the imported theme under **Saved themes** to apply it.

## Background transparency

Transparency ranges from 0% (opaque) to 100% (transparent) and affects theme backgrounds while keeping text and icons clear. Settings are saved per theme. Priority is personal setting → authored alpha → 30% default. **Follow theme** clears the current theme's personal setting.

## Delete and restore

Switch to another theme before deleting a saved theme. After confirmation, its directory moves to Trash or Recycle Bin. Restore the directory and reopen the menu or manager to use it again. Source ZIPs, recovery backups, and transparency preferences are retained.

## Theme ZIP format

macOS and Windows accept ordinary `.zip` files with this structure:

```text
my-theme/
├── manifest.json       # Studio export
├── theme.json          # Nonempty theme configuration
├── theme.css           # Nonempty Safe CSS
└── background.jpg      # One background; .png or .webp also supported
```

Files may sit at the ZIP root or inside one top-level theme directory. A local simplified package contains exactly `theme.json`, `theme.css`, and the referenced image. A Studio package adds `manifest.json` and may include `LICENSE.txt` and the reserved `manifest.sig`. The current client validates the manifest, content, and SHA-256; signature verification for `manifest.sig` is pending.

| Item | Limit |
| --- | --- |
| ZIP | 32 MiB compressed, 32 entries, 64 MiB expanded |
| Background | 10 MiB, 16384px per edge, 50MP total |
| `theme.css` | 256 KiB; passes shared Safe CSS validation and targets registered theme parts |
| Studio manifest | Platform, minimum client version, file set, sizes, and SHA-256 must match |

The importer checks paths, links, nested archives, and file content before writing. Safe CSS is validated during both import and application.

## Configuration example

Example `theme.json` for a local simplified package:

```json
{
  "schemaVersion": 1,
  "id": "my-theme",
  "name": "My theme",
  "image": "background.jpg",
  "appearance": "auto",
  "art": {
    "focusX": 0.72,
    "focusY": 0.45,
    "safeArea": "auto",
    "taskMode": "auto"
  }
}
```

| Field | Values and meaning |
| --- | --- |
| `appearance` | `auto` follows appearance; `light` or `dark` selects an override |
| `art.focusX` / `art.focusY` | Image focus coordinates in `0..1`; the top-left is `0,0` |
| `art.safeArea` | `auto`, `left`, `right`, `center`, `none`; home-screen content safe area |
| `art.taskMode` | `auto`, `ambient`, `banner`, `full`, `off`; task-page background behavior |

Example `theme.css`:

```css
[data-ds-part="home-hero"] {
  color: #c4b5fd;
}
```

See the [Safe CSS policy](../runtime/safe-css-policy.json) for registered parts, variables, and properties. Use [Studio](https://dreamskin.cc/studio) to export distribution packages.

## Place a theme manually

For a trusted, extracted theme, use **Open themes folder** and add a complete directory containing `theme.json`, `theme.css`, and its background directly. This route runs theme application checks; archive validation is provided by ZIP import.

| Platform | Saved themes directory |
| --- | --- |
| macOS | `~/Library/Application Support/CodexDreamSkinStudio/themes/` |
| Windows | `%LOCALAPPDATA%\CodexDreamSkin\themes\` |
