# Codex Dream Skin · 超天酱动态主题

<p align="center">
  <a href="./README.en.md">English</a>
</p>

<p align="center">
  <strong>为 Codex Desktop 制作的超天酱 / INTERNET ANGEL 沉浸式动态主题。</strong><br>
  三端共享覆盖层 · 原生控件换肤 · 动态状态表现 · 本地主题管理
</p>

<p align="center">
  <img src="windows/assets/dream-reference.jpg" alt="超天酱 INTERNET ANGEL 主题背景" width="900">
</p>

> 当前版本：`1.5.19`。Windows、macOS 与 Linux 共用超天酱组件识别、覆盖层和动画运行时。

本项目是基于 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 持续开发的独立 fork，主要维护超天酱视觉、跨平台一致性、启动兼容性与安全边界。

## 功能

- 超天酱主题覆盖首页、侧栏、任务、输入区、设置、终端、权限、差异、子代理与状态提示等界面。
- Windows、macOS 与 Linux 从 [`runtime/`](./runtime/) 同步同一套组件分类、专属覆盖层和动画；切换主题时会清理旧监听器与标记。
- 支持预置主题、本地图片、主题 ZIP、Safe CSS、主题保存与切换。
- Windows 提供 Setup、托盘、开始菜单、桌面快捷方式、更新检查、暂停与恢复入口。
- macOS 提供 DMG 与菜单栏 App；Linux 提供脚本安装和发行归档。
- 主题运行时使用本机回环 CDP，不改动官方 Codex 二进制、应用签名、`WindowsApps` 权限或 `app.asar`。

## 安装

### Windows Release

1. 从 [Latest Release](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest) 下载 `CodexDreamSkin-Setup-vX.Y.Z.exe` 与 `SHA256SUMS.txt`。
2. 核对 Setup.exe 的 SHA-256。
3. 运行安装器，然后从开始菜单启动 `Codex Dream Skin`。

Release Setup 内置固定版本并经过哈希校验的 Node.js 运行时，普通用户无需另行安装 Node.js。当前安装包尚未进行代码签名；请核对下载来源与校验值后处理 SmartScreen 提示。完整更新、主题导入、恢复和卸载步骤见 [Windows 安装指南](./docs/install-windows.md)。

若安装器无法验证官方 Store 包，请确认 Codex 来自 Microsoft Store、注册在当前 Windows 用户下，并已成功启动过。验证范围包含 Store 签名、开发模式、包清单、`app\ChatGPT.exe` 与 AUMID。

### Windows 源码安装

需要 Node.js 22 或更高版本，以及 Windows PowerShell 5.1 或 PowerShell 7：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\install-dream-skin.ps1
```

运行时与主题数据位于 `%LOCALAPPDATA%\CodexDreamSkin`。安装器会创建 `Codex Dream Skin`、`Codex Dream Skin - Tray` 和 `Codex Dream Skin - Restore` 桌面快捷方式。

### macOS

从 [Latest Release](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest) 下载 `CodexDreamSkin-vX.Y.Z.dmg`，将 App 拖入 Applications 后启动。DMG 已包含运行时。当前构建采用 ad-hoc 签名；首次启动请按照系统图形界面完成安全确认。详见 [macOS 安装指南](./docs/install-macos.md)。

### Linux

目前主要验证 AUR [`openai-codex-desktop`](https://aur.archlinux.org/packages/openai-codex-desktop)，需要 Node.js 20 或更高版本：

```bash
./linux/scripts/install-dream-skin-linux.sh
```

验证、恢复、发行归档与自定义路径见 [Linux 说明](./linux/README.md)。

## 更新与恢复

- Release 用户：退出 Codex 与托盘，核对新版校验值后覆盖安装。
- 源码用户：拉取本 fork 后再次运行对应安装脚本。
- Windows 用户可运行 `Codex Dream Skin - Restore` 恢复官方外观。
- 主题、导入图片和配置备份会保存在受管数据目录中。

## 技术与安全

- CDP 仅接受回环地址、受校验的 Browser ID、页面 Target ID 与 WebSocket 路径。
- Windows 优先使用 `Browser.getWindowForTarget` 与窗口边界确认可见原生窗口。
- Codex 未暴露 CDP `Browser.WindowID` 时，兼容路径只接受 Win32 HWND：启动器通过 `EnumWindows` 验证 HWND 可见、未最小化、尺寸达标，并再次核对窗口进程属于已验证的官方 `ChatGPT.exe`。
- 页面 DOM 可见性、视口和界面结构继续作为独立硬条件；这些信号不会单独通过原生窗口校验。
- 图片、ZIP、路径、符号链接、Safe CSS、运行时哈希和进程身份均设有边界检查。格式限制见 [Windows 安装指南](./docs/install-windows.md)。
- 回环地址不等于认证；CDP 风险窗口和安全操作建议见 [`SECURITY.md`](./SECURITY.md)。

## 开发与验证

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\tests\run-tests.ps1
node .\tools\internet-angel-extension.test.mjs
node .\windows\scripts\injector.mjs --check-payload
```

macOS 回归入口为 `./macos/tests/run-tests.sh`。平台结构与主题格式见 [`docs/platforms.md`](./docs/platforms.md)，历史更新记录见 [`windows/CHANGELOG.md`](./windows/CHANGELOG.md)。

## 未来计划

- 会加入更多动画，以显示不同状态下的差分（思考、输出等）
- 会随 Codex Desktop 主版本及原始项目更新作长期维护
- 更多的杂项修复

## 许可与声明

- 非 OpenAI 官方产品；Codex 及相关权利归其权利人
- 本主题/皮肤中所涉及的 IP 素材与商标权利归其权利人
- 本项目采用 MIT 许可；详见 [`LICENSE`](./LICENSE) 与 [`macos/NOTICE.md`](./macos/NOTICE.md)

## 致谢

- 原始项目：[Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)
- Gothic Void Crusade 主题贡献者：[@seansong-ideogram](https://github.com/seansong-ideogram)
