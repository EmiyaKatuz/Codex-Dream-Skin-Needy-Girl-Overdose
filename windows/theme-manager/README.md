# Windows 原生主题管理器

[中文](README.md) · [English](README.en.md)

从桌面、开始菜单打开 **Codex Dream Skin**，或双击托盘图标进入管理器。重复打开会激活已有窗口。

## 使用

- 调整当前主题的背景透明度，范围为 0–100%。
- 选择“跟随主题”恢复作者设置；主题未设置时采用 30%。偏好保存在 `theme-preferences.json`。
- 选中非活动主题，点击“移到回收站…”并确认，即可删除本地主题目录。删除活动主题前先从托盘切换主题。原始 ZIP、活动快照和恢复文件会保留。

管理器与运行时共用每用户的 Operation、ThemeImport 互斥锁，并校验目录身份及路径。

## 构建与检查

构建需要 .NET SDK 8+ 和 Node.js。发布产物为包含 .NET 运行时的 `win-x64` 单文件程序。在仓库根目录运行：

```sh
dotnet run --project windows/theme-manager/Tests/DreamSkin.ThemeManager.Tests.csproj -c Release
node tools/build-theme-manager.mjs
```

产物位于 `windows/assets/theme-manager/DreamSkin.ThemeManager.exe`，由 Windows 安装器打包。若 SDK 未加入 PATH，可将 `DOTNET` 设置为其可执行文件的绝对路径。

在 Windows 测试用户会话中运行原生集成检查：

```sh
dotnet run --project windows/theme-manager/NativeTests/DreamSkin.ThemeManager.NativeTests.csproj -c Release
```

普通测试覆盖偏好保留、透明度优先级、原子写入和删除边界。原生测试覆盖互斥锁竞争与真实回收站操作；生成的隔离测试目录会留在该测试用户的回收站。

手动验收覆盖安装后快捷方式、键盘操作、显示缩放、Codex 中的 0/100% 透明度与“跟随主题”、外部主题切换、取消或确认删除，以及从回收站恢复。
