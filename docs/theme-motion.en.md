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
| Character | `character` | P-chan pixel cat and blinking for the bundled wallpaper character |
| Ambient | `ambient` | Stars, parallax, and home-screen decorations |
| Theme transition | `themeTransition` | Background fades when conditions allow |

With the bundled INTERNET ANGEL theme, choose **Full** and enable character motion to show blinking on the home screen. Custom backgrounds use their own images. Task feedback follows recognized native state events.

## P-chan expressions and poses

P-chan has eight pixel frames with state-specific eyes, mouth, front paws and tail. Running and streaming use different poses. Frames keep the same 48×56 reservation; the character avoids nearby content, controls and settings panels and hides when space is insufficient.

| State | Expression and posture |
| --- | --- |
| Waiting/unknown | Shiny eyes and a small frown, lowered paws and a curled tail |
| Idle | Resting eyes, relaxed paws and a tucked tail |
| Running | Focused eyes, paws forward and an upright tail |
| Streaming | Focused eyes and an open mouth, one raised paw and a nod on first output |
| Needs attention | Wide eyes and a surprised mouth, paws near the cheeks and a straight tail |
| Completed | Smile, raised paws and a heart with one celebration cue |
| Failed | Drooping ears, resting eyes and tears, lowered paws and tail |
| Cancelled | Closed eyes and a neutral mouth, tucked paws and a tail wrapped around the body |

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
