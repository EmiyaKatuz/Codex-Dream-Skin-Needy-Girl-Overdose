# macOS installation and updates

[中文](install-macos.md) · [Project home](../README.en.md)

## First install

Requires macOS 13 or later. Install official Codex Desktop, launch it once, and quit it.

1. Download `CodexDreamSkin-vX.Y.Z.dmg` and `SHA256SUMS.txt` from [Releases](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest), and verify the DMG's SHA-256.
2. Open the DMG and move **Codex Dream Skin.app** to **Applications**.
3. Open the app. If macOS blocks first launch, go to **System Settings → Privacy & Security → Open Anyway** and follow the system prompt.
4. The app deploys the theme engine. If Codex is running, quit it and choose **Install / upgrade engine**. Use the menu-bar icon after setup completes.

Current builds use ad-hoc signing; approve first launch through the macOS interface. The engine uses Node.js bundled with official Codex.

## Daily use

The menu bar provides start, pause, restore, image selection, theme ZIP import, and saved themes.

| Content | Location |
| --- | --- |
| Engine | `~/.codex/codex-dream-skin-studio` |
| Themes, images, and state | `~/Library/Application Support/CodexDreamSkinStudio` |

- **Background transparency**: choose **Theme → Background transparency**. Changes apply when you release the slider. 0% is opaque and 100% is fully transparent; text and icons stay readable. Settings are saved per theme. **Follow theme** uses the author's setting, with a 30% default.
- **Motion**: choose **Theme → Motion** and select System, Off, Subtle, or Full. The system reduced-motion setting takes precedence. See [motion effects](theme-motion.en.md).
- **Theme import**: choose **Import theme ZIP…**, then select the imported theme under **Saved themes** to apply it. See [theme management](theme-management.en.md) for package format, limits, and manual directory installation.

## Apply a theme from the website

1. Apply your current theme from the menu bar. Confirm the status is **Skin ON** with no pending theme.
2. On DreamSkin.cc, choose a compatible theme, click **Apply to client**, and allow the browser to open **Codex Dream Skin.app**.
3. Review the theme name, author, package size, and SHA-256 in the client, then confirm.
4. Wait for download, package checks, and renderer verification to complete. Follow the result shown by the client.

The client obtains themes from the fixed DreamSkin.cc API and checks review status, compatibility, digest, package contents, image, and Safe CSS. Older themes missing `theme.css` remain available for preview or download; the website shows one-click apply for compatible themes.

If switching fails, the client attempts to restore and verify the previous theme. If the status remains unconfirmed, preserve the recovery snapshot path shown in the dialog and retry a saved theme from the menu bar. Recovery data is kept under `recovery/` or the transaction directory shown in the message. Follow the client's message for available snapshots and current status.

## Update

1. Download the new DMG from Releases and verify its checksum.
2. Quit the Dream Skin menu-bar app and close Codex when prompted.
3. Open the DMG, move the new app to Applications, and choose Replace.
4. Reopen the app. Themes, images, and state are preserved. If macOS blocks launch again, follow the first-install approval steps.

The app checks for updates about 15 seconds after launch, then every 24 hours. You can also choose **Maintenance → Check for updates now** to open the download entry and install the update yourself.

## Restore and uninstall

1. Choose **Restore and uninstall** from the menu bar to restore the stock appearance and close the CDP session.
2. Move `/Applications/Codex Dream Skin.app` to the Trash.
3. To remove themes and images, back them up and delete `~/Library/Application Support/CodexDreamSkinStudio`.

See the [security documentation](../SECURITY.md) for CDP session details.

## Troubleshooting

| Situation | Action |
| --- | --- |
| Open Anyway is missing | Double-click the app in Applications, then reopen Privacy & Security. Keep system security settings enabled. |
| Menu-bar icon missing after an update | Quit the old app, open the new copy in Applications, and complete the engine upgrade when prompted. |
| Source installation or diagnostic commands | See the [macOS development guide](../macos/README.en.md). |
