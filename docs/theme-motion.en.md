# Motion settings

[中文](./theme-motion.md) · [English](./theme-motion.en.md)

Windows, macOS, and Linux share motion settings. Saved changes take effect automatically.

## Controls

- macOS: menu bar → **Theme → Motion**.
- Windows: tray → **Motion**.
- Linux: run `scripts/motion-settings-linux.sh` from the installed engine.

## Modes

| Mode | Value | Behavior |
| --- | --- | --- |
| System | `system` | Subtle by default; turns off when the system requests reduced motion |
| Off | `off` | Turns off theme motion |
| Subtle | `subtle` | Short interactions and single state feedback |
| Full | `full` | Home-screen characters, stars, wallpaper character, and decorations suited to the layout; local feedback on task pages |

System reduced-motion settings take priority in all modes. Decorations pause or hide during scrolling, IME composition, hidden pages, or limited space.

## Effect switches

| Effect | Field | Contents |
| --- | --- | --- |
| Interactions | `interactions` | Button, menu, composer, and project-row feedback |
| Task status | `status` | Task, tool, and identified subagent state feedback |
| Character | `character` | Pixel character and blinking for the bundled wallpaper character |
| Ambient | `ambient` | Stars, parallax, and home-screen decorations |
| Theme transition | `themeTransition` | Background fades when conditions allow |

With the bundled INTERNET ANGEL theme, choose **Full** and enable character motion to show blinking on the home screen. Custom backgrounds use their own images. Task feedback follows recognized native state events.

## Linux commands

```bash
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --set-mode full
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --set-effect character on
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --set-effect ambient off
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --get
```

Linux `performanceMode` controls layout and rendering quality; these settings control motion.

## Configuration file

| Platform | Path |
| --- | --- |
| macOS | `~/Library/Application Support/CodexDreamSkinStudio/motion.json` |
| Windows | `%LOCALAPPDATA%\CodexDreamSkin\motion.json` |
| Linux | `${XDG_STATE_HOME:-~/.local/state}/CodexDreamSkin/motion.json` |

Default configuration; the mode and all five effect fields are required:

```json
{
  "schemaVersion": 1,
  "mode": "system",
  "effects": {
    "interactions": true,
    "status": true,
    "character": true,
    "ambient": true,
    "themeTransition": true
  }
}
```

Use menus or commands to save settings. The file limit is 16 KiB. A read failure reports a configuration error and disables theme motion; a missing file uses defaults.

See [roadmap coverage](./theme-motion-coverage.en.md) for individual effects and verification boundaries, [platforms and development](./platforms.en.md) for development checks, and [theme management](./theme-management.en.md) for theme controls.
