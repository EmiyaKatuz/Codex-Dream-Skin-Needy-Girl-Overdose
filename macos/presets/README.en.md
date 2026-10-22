# Bundled themes

[中文](README.md) · [macOS guide](../README.en.md)

The bundled preset is **INTERNET ANGEL**, enabled on first install. The installer copies it to `~/Library/Application Support/CodexDreamSkinStudio/themes/`, where it is available from **Saved themes** in the menu bar.

## Current preset

```text
preset-internet-angel-default/
├── theme.json
└── dream-reference.jpg
```

The background is a `2560 × 1440` JPEG. Theme files are byte-identical to the Windows default. Upgrades preserve personal themes and preferences, and archive recognized, unchanged retired presets under `retired-themes/`. See [NOTICE.md](../NOTICE.md) for artwork terms.

Switch to the bundled theme:

```bash
~/.codex/codex-dream-skin-studio/scripts/switch-theme-macos.sh \
  --id preset-internet-angel-default
```

## Create a theme

New themes contain non-empty `theme.json`, non-empty `theme.css`, and one background image referenced by the JSON. See [theme management](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/theme-management.en.md) for ZIP and Studio manifest formats. The current bundled preset retains its existing two-file format.

Use lowercase letters and hyphens for theme IDs. Presets proposed for bundling use the same `preset-<slug>` for the directory and ID. Installation and packaging scripts explicitly list bundled themes; adding a preset also requires updating those entries and their tests.

- Use PNG, JPEG, or WebP, up to 10 MiB, 16384 pixels per edge, and 50 megapixels.
- Use `2560 × 1440` artwork, with the subject at roughly 58%–88% of the width and calm, low-contrast space across the left 50%–58%.
- Set `appearance` to `auto`, `light`, or `dark`. `auto` follows Codex appearance and requires checks in both modes. Declare the corresponding fixed mode for single-mode artwork.
- Use original, authorized, or redistributable images, and include their source and license. Record and review third-party assets according to [NOTICE.md](../NOTICE.md).

See the [background prompt guide](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/reference-background-prompt-guide.en.md) for composition templates.

## theme.json fields

| Field | Purpose |
| --- | --- |
| `schemaVersion` / `id` / `image` | Version, theme identity, and the background filename in this directory |
| `name` / `tagline` / `quote` | Home theme name, subtitle, and quote |
| `brandSubtitle` / `statusText` | Brand label and status text |
| `projectPrefix` / `projectLabel` | Project entry text |
| `promoTitle` / `promoSub` / `promoUrl` | Optional promotional information |
| `appearance` | Appearance mode |
| `art.focusX` / `art.focusY` | `0..1`, the subject's position |
| `art.safeArea` | `auto`, `left`, `right`, `center`, `none` |
| `art.taskMode` | `auto`, `ambient`, `banner`, `full`, `off` |

Explicit `art` fields take precedence over automatic image analysis. `colors` supports these keys:

| Key | Purpose |
| --- | --- |
| `background` | Background base color |
| `panel` / `panelAlt` | Sidebar, cards, composer, and tool panels |
| `accent` / `accentAlt` | Icons, focus borders, and theme title |
| `secondary` / `highlight` | Secondary accents and highlights |
| `text` / `muted` | Body and secondary text |
| `line` | Dividers |

Use registered Safe CSS parts in `theme.css`. For example, adjust the home title and subtitle:

```css
[data-ds-part="home-hero"] {
  font-size: 18px;
  color: #f5e7d0;
}
```

Font size accepts `12–20px`. The subtitle inherits the size and color and retains 76% opacity.

## Verification

Run from the macOS engine directory (`macos/` in the source checkout):

```bash
node scripts/injector.mjs --check-payload \
  --theme-dir presets/preset-internet-angel-default
./tests/run-tests.sh
```

Use your theme directory as `--theme-dir` when checking a custom theme. Include screenshots of Home, composer suggestions, the task page, and side panels with a contribution. Include light and dark results for `auto` themes.
