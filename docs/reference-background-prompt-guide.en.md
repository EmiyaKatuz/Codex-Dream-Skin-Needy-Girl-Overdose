# Custom background guide

[中文](./reference-background-prompt-guide.md) · [English](./reference-background-prompt-guide.en.md)

Create artwork that fits the Codex interface, then export a theme ZIP through DreamSkin Studio.

## Turn generated artwork into an importable theme

1. Generate a `2560 × 1440`, 16:9 background with a content area on the left and the main subject on the right.
2. Import a JPEG, PNG, or static WebP into [DreamSkin Studio](https://dreamskin.cc/en/studio), up to **10 MiB**. Adjust colors and preview light and dark appearances, Home, tasks, and different window widths.
3. Fill in the theme name, author, platforms, and asset sources. Export a ZIP containing `manifest.json`, `theme.json`, non-empty `theme.css`, and exactly one background image. The CSS must pass Safe CSS validation.
4. On macOS, choose Theme → Import theme ZIP from the menu bar. On Windows, choose Import theme ZIP from the tray. After import, select the theme from Saved themes to apply it.

Theme colors and client preferences control background transparency. Let the runtime draw text, controls, and interface overlays; keep the background artwork complete and opaque.

## Bundled theme and custom assets

| Content | Source location |
| --- | --- |
| Bundled INTERNET ANGEL theme | `macos/presets/preset-internet-angel-default/` |
| Windows theme and background | `windows/assets/theme.json`, `windows/assets/dream-reference.jpg` |
| Asset license notes | `macos/NOTICE.md` |

The bundled background is a `2560 × 1440` JPEG. Custom assets can be your own photos, illustrations, or generated images. Include the relevant license and asset sources when distributing a theme.

## Canvas and composition

Select `2560 × 1440` in the generator's size settings. If unavailable, generate a 16:9 landscape image, then resize proportionally or crop it.

| Area | Suggested range | Composition |
| --- | --- | --- |
| Native content | `x=0%–52%` | Low detail and contrast with subtle texture |
| Transition | `x=45%–62%` | Continuous environment, lighting, and perspective |
| Main subject | `x=62%–88%`, `y=16%–72%` | Keep the face, hands, and essential props here |
| Portrait placement | Face `y=20%–52%`; hands `y=30%–70%` | Allow for window cropping and the composer below |
| Edges | At least `8%` around critical details | Use extensible scenery around the canvas |

Backgrounds fill the window with `cover`, so different aspect ratios crop the edges. Retain midtone detail and subject definition under both light and dark interfaces.

For a right-side subject, this `theme.json` configuration is a useful starting point:

```json
{
  "appearance": "auto",
  "art": {
    "focusX": 0.72,
    "focusY": 0.45,
    "safeArea": "left",
    "taskMode": "ambient"
  }
}
```

`safeArea: "left"` reserves space for native content and prioritizes the right-side subject in narrow windows.

## Environment template

Replace the bracketed fields with concrete scenery, materials, lighting, and colors.

```text
Create one 2560×1440, 16:9, opaque desktop wallpaper.
Scene: [environment, season, and main objects]. Medium: [photography, watercolor, or digital illustration].
Materials: [3–5 visible materials]. Lighting: [direction, softness, and time of day].
Palette: [4–6 colors].

Keep x=0%–52% as continuous low-detail, low-contrast scenery.
Concentrate the focal detail within x=62%–88%, y=16%–72%,
with at least 8% padding around all critical details.
Use one perspective and a natural transition across the canvas.
Retain midtone texture beneath light and dark interface overlays.
Output wallpaper artwork only, without interface controls, text, logos, or watermarks.
```

## Portrait template

```text
Create one 2560×1440, 16:9, opaque desktop wallpaper.
Place one original adult character on the right: [hair, clothing, pose, and expression].
Scene: [environment and props]. Materials: [fabric, plants, glass, or other surfaces].
Style: [photography or illustration medium]. Lighting: [key and ambient light]. Palette: [colors].

Continue the same environment through x=0%–52% with soft detail and contrast.
Keep the complete face, hands, and essential props within x=62%–88%, y=16%–72%;
face y=20%–52%, hands y=30%–70%, with at least 8% padding around critical details.
Use natural anatomy, coherent lighting, and a continuous background.
Output wallpaper artwork only, without interface controls, text, logos, or watermarks.
```

## Use reference images

State each image's role in the prompt, following the actual upload order:

| Reference | Role |
| --- | --- |
| Interface screenshot | Extract palette, lighting, atmosphere, and broad composition; rebuild the full background scene |
| Environment or material image | Extract scenery, surface texture, depth, and lighting |
| Licensed portrait reference | Preserve the subject's appearance and natural proportions |

For example, when uploading an interface image followed by a portrait, append:

```text
Image 1 provides palette, lighting, and composition references for a new continuous background scene.
Image 2 provides the subject's appearance; place the subject naturally in the right-side safe area.
```

## Transparency and local management

Background transparency uses the theme's saved local preference first, then the author's color alpha, with **30% transparency** as the fallback. For example, `rgba(17, 19, 24, 0.7)` is 70% opaque, or 30% transparent.

Adjust it through the macOS Theme menu or the Windows native manager. The slider ranges from 0–100%; Follow theme restores the author's setting. Switch to another theme before deleting one, then confirm moving it to Trash or Recycle Bin.

See [local theme management](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/theme-management.en.md) for details.

## Check before export

- Verify the image dimensions, aspect ratio, and file size.
- Preview `cover` cropping at 16:9, 16:10, 4:3, and ultrawide ratios, keeping the subject intact.
- Check readable text and natural background transitions in light and dark appearances.
- Keep the image as background artwork; include complete metadata, CSS, and the background in the theme ZIP.

See [background prompt ideas](./background-generation-prompts.md#english) for more palettes and scenes.
