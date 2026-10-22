# Native Windows theme manager

[中文](README.md) · [English](README.en.md)

Open **Codex Dream Skin** from the desktop or Start menu, or double-click its tray icon. Repeated launches activate the existing window.

## Use

- Adjust the current theme's background transparency from 0–100%.
- Choose **Follow theme** to restore the author's setting, with 30% as the fallback. Preferences are stored in `theme-preferences.json`.
- Select an inactive theme, choose **Move to Recycle Bin…**, and confirm to remove its local directory. Switch away from an active theme through the tray before deleting it. Source ZIPs, active snapshots, and recovery files are preserved.

The manager shares per-user Operation and ThemeImport mutexes with the runtime and validates directory identity and paths.

## Build and checks

Building requires .NET SDK 8+ and Node.js. The published `win-x64` single-file executable includes its .NET runtime. Run from the repository root:

```sh
dotnet run --project windows/theme-manager/Tests/DreamSkin.ThemeManager.Tests.csproj -c Release
node tools/build-theme-manager.mjs
```

The output is `windows/assets/theme-manager/DreamSkin.ThemeManager.exe`, which the Windows installer packages. If the SDK is outside PATH, set `DOTNET` to its absolute executable path.

Run native integration checks in the Windows test user's session:

```sh
dotnet run --project windows/theme-manager/NativeTests/DreamSkin.ThemeManager.NativeTests.csproj -c Release
```

Standard tests cover preference preservation, transparency precedence, atomic writes, and deletion boundaries. Native tests cover mutex contention and real Recycle Bin operations; the generated isolated fixture remains in the test user's Recycle Bin.

Manual acceptance covers packaged shortcuts, keyboard controls, display scaling, 0/100% transparency and **Follow theme** in Codex, external theme changes, cancelling or confirming deletion, and restoration from the Recycle Bin.
