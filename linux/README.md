# Codex Dream Skin for Linux

Linux engine for the official Codex Desktop app. It starts the official client with a loopback-only CDP port, injects the Choten / INTERNET ANGEL theme into the verified Codex renderer, and never modifies `app.asar` or the installed application files.

## Requirements

- Linux desktop with official Codex Desktop installed
- Node.js 20+
- `bash`, `curl`, `tar`, and `pgrep`

## Install from source

Close Codex first, then run:

```bash
./linux/scripts/install-dream-skin-linux.sh
```

The engine is copied to `~/.codex/codex-dream-skin-linux`; state, logs, and the active theme are kept in `${XDG_STATE_HOME:-~/.local/state}/CodexDreamSkin`.
The installer creates a user-level `Codex.desktop` override, refreshes the desktop-entry cache, and associates `codex://` links with it. The usual OpenAI Codex app icon then starts the themed CDP session. Fully quit Codex before installing; if GNOME still holds an old dock launcher after installation, log out and back in once so Shell reloads its launcher metadata. Restore removes only the marked entry.

## Daily commands

```bash
~/.codex/codex-dream-skin-linux/scripts/start-dream-skin-linux.sh
~/.codex/codex-dream-skin-linux/scripts/verify-dream-skin-linux.sh
~/.codex/codex-dream-skin-linux/scripts/restore-dream-skin-linux.sh
```

`restore` removes the live renderer payload and stops only the recorded injector process. It does not modify Codex configuration or binaries.

## Performance

### Motion preferences

Motion preferences are stored separately from themes in `${XDG_STATE_HOME:-~/.local/state}/CodexDreamSkin/motion.json`, so changing a theme preserves your choices. Use the installed script to read or update them:

```bash
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --get
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --set-mode subtle
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --set-effect ambient off
```

Modes are `system` (the default), `off`, `subtle`, and `full`. Individual effects are `interactions`, `status`, `character`, `ambient`, and `themeTransition`; each accepts `on` or `off`. Commands print the saved settings as JSON and preserve other preferences. They do not start Codex or install dependencies. Missing preferences use the defaults; an invalid configuration is reported rather than overwritten.

### Rendering performance

Linux retains the legacy `performanceMode: low/full` rendering option; the bundled theme uses `full`. Use the independent motion preferences above to control animation. DOM refresh is deliberately limited: newly mounted runtime surfaces are classified inside their added subtree without layout measurement, while verified navigation controls, shell-level structural mutations, appearance changes, and a 60-second safety fallback can trigger a delayed full scan; ordinary streamed text updates do not. CDP target events wake the watcher as soon as a runtime renderer window is created, while the 800ms target poll remains as a disconnect fallback. A temporary early observer applies the theme as soon as the new renderer shell appears and then disconnects. Renderer-owned route state replaces root-level relational selectors without changing theme output. Window resizing updates theme geometry once per animation frame, skips duplicate integer-pixel measurements, and runs one full reconciliation after the resize settles. Startup is non-blocking: the watcher waits for verified Codex shell markers, shows one application status, then keeps ordinary renderer maintenance silent. Existing `performanceMode: low` settings continue to reduce animated ornaments and blur.

On native Wayland sessions, the launcher disables Chromium's incompatible Vulkan surface path and keeps accelerated composition on the OpenGL/ANGLE fallback. X11 sessions retain the Codex default GPU backend.

## Build a distributable archive

```bash
./linux/scripts/build-release.sh
```

This produces `linux/release/CodexDreamSkin-Linux-v<version>.tar.gz` and a SHA-256 sidecar file. The archive is self-contained and can be unpacked anywhere before running the installer.

## Security boundary

- CDP binds to `127.0.0.1` only.
- The injector accepts only official `app://` targets or the Linux package's `localhost:5175` renderer, then verifies Codex DOM markers.
- Theme image validation limits artwork to 16 MiB, 16384 px per edge, and 50 megapixels.
- No API key, provider, account, or Codex config is read or modified.
