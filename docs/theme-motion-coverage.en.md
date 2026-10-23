# Motion roadmap coverage

[中文](./theme-motion-coverage.md) · [English](./theme-motion-coverage.en.md)

This page maps the 17 client effects in the [original roadmap](./theme-animation-roadmap-2026-10-03.md) to their implementation. See [motion settings](./theme-motion.en.md) for controls. The original analysis describes an earlier baseline; this table records current behavior.

## Effect checklist

| ID | Implemented effect | Trigger and boundary |
| --- | --- | --- |
| 01 | Composer focus edge and release transition | Paints an inward edge without changing the caret, IME or native dimensions |
| 02 | Button press and 1px static-icon rebound | Pointer, Enter and Space in recognized composer, sidebar, settings and environment controls; excludes repeated keys, IME, disabled controls and native animations |
| 03 | Sidebar, terminal tab and settings selection edges | Uses explicit selection attributes without moving rows or scroll areas |
| 04 | Brief menu and command-palette edges | Handles newly mounted and persistent menus on opening; closing clears feedback while native placement and animation remain in control |
| 05 | Staggered home suggestions, presets and project edges | At most four initial cards, 25ms apart; presets and projects use stable identities, unidentified native suggestions receive only their initial batch to avoid virtualization replay; Acrylic Home cards stay in normal flow above the composer and Send button |
| 06 | Attention feedback for new permission prompts | Native requests drive attention state; explicitly open modal prompts receive one edge cue, including reused dialogs; historical cards do not imply requests |
| 07 | Running-task signal | Uses trusted native events or explicit local busy semantics; full mode permits a local signal loop |
| 08 | Streaming signal and character nod | The first output in a run triggers feedback without restarting per token |
| 09 | Completion, failure and cancellation feedback | Deduplicates task/run/revision identities; cancellation settles calmly and historical tasks do not replay |
| 10 | Tool state, disclosure edge and known-chevron transition | Supports nested disclosure buttons in classified headers and native activity headers; press feedback no longer suppresses expansion feedback; code remains stable |
| 11 | File-change batch edge | Initial history stays static; a new stable batch may reuse its DOM, while returning or remounted old batches do not replay |
| 12 | Subagent state and terminal feedback | Requires exact host/thread/run identities; no continuous per-row glow |
| 13 | Background crossfade | Transfers a bounded old-image snapshot after the new image decodes; oversized or composite backgrounds switch directly, while decode errors retain the old theme |
| 14 | P-chan pixel-character poses and bundled wallpaper blinking | The pink cat retains its 48×56 reservation with distinct eyes, mouth, paws and tail for eight states; wallpaper eyes require the verified bundled image and projection, never arbitrary user photos |
| 15 | Stars, compact broadcast details and minimal parallax | Full-mode Home only when space permits; horizontal ±3px and vertical ±2px parallax; decorations avoid text, code, panels and controls |
| 16 | Settings/tool selection and disclosure feedback | Reuses explicit selection, keyboard presses and nested disclosures; light-mode inputs pair paper text with a dark violet surface without resizing native switches |
| 17 | Native theme-operation busy feedback | macOS indicator/static icon and a memory-only static pink/cyan Windows hourglass; restores afterward, follows mode/status preferences and represents theme-tool operations only |

## Shared policy

All platforms share `system`, `off`, `subtle` and `full`, plus five independent effect switches. Permissions, file changes and terminal task feedback belong to `status`; menus, card entrance and presses belong to `interactions`. Disabling interactions does not disable task-state cues.

Reduced motion, hidden pages, IME, scrolling, navigation and theme switching have pause or cleanup paths. Effects do not hide or scale native content or take over menu positioning. Decorations remain noninteractive and withdraw when space is insufficient. Missing state or identity evidence produces a static fallback.

External Studio integration, arbitrary author keyframes, multi-image/video packages and new wallpaper expression artwork require separate format or asset work. They are not prerequisites for these 17 client effects. Theme ZIP and Safe CSS contracts remain strict.

## Code and regression coverage

- [Shared controller](../runtime/theme-motion.js) and [styles](../runtime/theme-motion.css): lifecycle, state, identity, interaction and decoration.
- [Controller tests](../tools/theme-motion-controller.test.mjs): persistent menus/permission prompts, reused result batches, home identities, keyboard input, native events and cleanup.
- [CSS tests](../tools/theme-motion-css.test.mjs): inward edges, geometry and animation scope, reduced motion and preserved native loading indicators.
- [Assembled-payload browser tests](../tools/motion-playback.browser.test.mjs): independent switches, painted P-chan task poses and bounds, real menu clicks, batch updates and keyboard disclosures in Windows system/Acrylic, macOS and Linux payloads, alongside wallpaper, pixel-paint and pause/resume checks and uncovered Windows Home controls.
- [Windows native tray tests](../windows/tests/tray-motion.tests.ps1): busy-icon creation/reuse, preferences, invalid configuration, restoration and resource cleanup.

Browser checks run in cloud Chromium with real assembled payloads and controlled DOM fixtures, blocked external requests and no accounts. They inspect screenshots, hit targets, geometry and page errors. They do not establish full Electron, online-model, native-file-picker or platform GPU validation. Repository CI covers Windows PowerShell and macOS native builds.
