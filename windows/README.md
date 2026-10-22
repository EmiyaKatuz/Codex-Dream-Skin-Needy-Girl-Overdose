# Codex Dream Skin for Windows

[中文](README.md) · [English](README.en.md)

为 Codex Desktop 加载超天酱 / INTERNET ANGEL 主题，支持背景替换、主题保存、动态效果和外观恢复。主题通过本机 CDP 加载，侧栏、任务和输入框使用 Codex 原生控件。

## 运行要求

- Windows 10 或更高版本，x64。
- 从 Microsoft Store 安装、注册到当前用户且已成功启动过的官方 `OpenAI.Codex`。
- Windows PowerShell 5.1 或更高版本。
- Release 安装器包含 Node.js；源码安装需要 Node.js 22+ 和 .NET SDK 8+。

## Release 安装

从 [Releases](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest) 下载 Setup.exe 和 `SHA256SUMS.txt`，核对摘要后运行安装器。安装按当前用户进行。首次安装、SmartScreen 提示、更新与卸载见 [Windows 安装指南](../docs/install-windows.md)。

打开 **Codex Dream Skin** 进入原生主题管理器；右键托盘图标可应用主题、切换已保存主题或恢复外观。双击托盘图标也可打开管理器。

## 源码安装

先退出 Codex 和 Dream Skin 托盘。在仓库根目录运行：

```powershell
node .\tools\build-theme-manager.mjs
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\install-dream-skin.ps1
```

安装器会校验官方 Store 包和运行时、备份受管外观配置，并初始化主题库。默认创建以下入口：

| 入口 | 用途 |
| --- | --- |
| `Codex Dream Skin` | 打开原生主题管理器和托盘 |
| `Codex Dream Skin - Tray` | 打开托盘控制 |
| `Codex Dream Skin - Restore` | 恢复官方外观并关闭受管 CDP 会话 |

默认从端口 `9335` 开始寻找空闲端口。安装命令可加 `-Port 9444` 指定端口，有效范围为 `1024–65535`。脚本使用 `RemoteSigned` 策略，并在部署时校验受管运行时摘要。

更新源码后，退出 Codex 和托盘，再运行上述构建与安装命令。安装会保留个人主题、图片和设置。

## 启动与验证

右键托盘图标选择应用主题，或从仓库根目录运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\start-dream-skin.ps1 -PromptRestart
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\verify-dream-skin.ps1 `
  -ScreenshotPath "$env:TEMP\codex-dream-skin.png"
```

Codex 正在运行时，启动器会询问是否重启。验证脚本检查 CDP 身份、皮肤版本、原生控件和装饰层；截图用于检查溢出和对比度。交互验收项见 [QA 清单](references/qa-inventory.md)。

## 主题与动态效果

托盘提供背景替换、ZIP 导入、保存与切换主题、动态效果、暂停、重新应用和恢复入口。首次安装包含超天酱 JPEG 主题。

原生管理器可调整当前主题的背景透明度，并将非活动主题移到回收站。操作说明见 [主题管理器](theme-manager/README.md)。

- 背景支持 PNG、JPEG、WebP，上限 10 MiB、单边 16384 像素、总计 5000 万像素。
- 通过“导入主题 ZIP…”加入主题库，再从“已保存主题”选择应用。格式和限制见 [主题管理](../docs/theme-management.md)。
- 动态效果提供跟随系统、关闭、轻量、完整四档及五类开关，见 [动态效果](../docs/theme-motion.md)。
- DreamSkin.cc 的“一键换肤”会先显示确认框，再下载并校验对应主题。需要启动或重启 Codex 时，请先保存输入；客户端会先确认当前可见主题，以建立回滚基线。

## Acrylic 窗口材质

Windows 11 22621+ 且系统“透明效果”开启时，可选择 Desktop Acrylic。设置在下次 Dream Skin 启动时生效：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\manage-window-effects.ps1 -Set Acrylic
```

使用 `-Status` 查看设置，使用 `-Set System` 恢复系统材质。

## 官方快捷方式自动接管

该功能默认关闭。以下命令启用当前用户监控器，并保护启用时已经打开的 Codex 会话：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\manage-auto-launch-dream-skin.ps1 -Enable -ProtectCurrentSession
```

当前会话结束后，新启动的普通 Codex 会话会经过三秒宽限，再交给 Dream Skin 启动器。接管会关闭原会话；正常关闭等待 15 秒后，剩余的已验证进程可能被强制停止，请先保存输入。

同一 Windows 用户最多拥有一个监控器和一个实时受管会话，快速用户切换和 RDP 也适用。使用 `-Status` 查看状态，使用 `-Disable` 停止监控并移除启动项。

## 恢复

右键托盘图标选择恢复，或运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\scripts\restore-dream-skin.ps1 `
  -RestoreBaseTheme -PromptRestart
```

加 `-Uninstall` 同时删除源码安装创建的快捷方式。`-RecoverConfigBackup` 会先保存当前配置，再恢复安装前的完整 `config.toml`，适用于普通外观恢复无法解决的配置损坏。

结束调试会话需完整恢复并重启，或退出全部 Codex 进程后从官方入口打开。暂停主题会保留调试会话。CDP 的本机访问说明见 [SECURITY.md](../SECURITY.md)。

## 文件与日志

| 用途 | 路径 |
| --- | --- |
| 运行时 | `%LOCALAPPDATA%\CodexDreamSkin\engine` |
| 当前主题 | `%LOCALAPPDATA%\CodexDreamSkin\active-theme` |
| 主题库 | `%LOCALAPPDATA%\CodexDreamSkin\themes` |
| 图片归档 | `%LOCALAPPDATA%\CodexDreamSkin\images` |
| 会话状态 | `%LOCALAPPDATA%\CodexDreamSkin\state.json` |
| 日志 | `%LOCALAPPDATA%\CodexDreamSkin\injector.log`、`injector-error.log`、`verify.log` |
| Codex 配置 | `%USERPROFILE%\.codex\config.toml` |

## 排错与开发

| 情况 | 处理 |
| --- | --- |
| 源码安装找不到 Node.js | 用 `node --version` 确认 22+，重新打开 PowerShell |
| 找不到 Store 包 | 用 `Get-AppxPackage -Name OpenAI.Codex` 检查当前用户的安装 |
| 管理器缺失 | 重新构建管理器并安装，或重新运行 Release Setup |
| 指定端口被占用 | 选择其他空闲端口 |
| Codex 更新后主题失效 | 更新并重新安装 Dream Skin，再从托盘应用主题 |
| 找不到 CDP 端点 | 从托盘应用主题后重试，并保留启动与验证日志 |

运行时兼容性与恢复细节见 [运行说明](references/runtime-notes.md)，平台路径见 [平台参考](../docs/platforms.md)。提交 [Bug](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/issues/new/choose) 时附系统、Codex 与 Dream Skin 版本、复现步骤和已去除凭据及私人内容的日志。

在仓库根目录运行回归检查：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\windows\tests\run-tests.ps1
node .\tools\internet-angel-extension.test.mjs
node .\windows\scripts\injector.mjs --check-payload
```

原生管理器的构建与测试见 [开发说明](theme-manager/README.md)，维护约束见 [SKILL.md](SKILL.md)。
