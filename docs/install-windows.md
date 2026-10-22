# Windows 安装与更新

[中文](install-windows.md) · [English](install-windows.en.md)

适用于 Windows 10+ x64。Release 安装器包含所需运行时，按当前用户安装。

## 首次安装

1. 从 Microsoft Store 安装官方 `OpenAI.Codex`，成功启动一次后退出。
2. 从 [Releases](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest) 下载 `CodexDreamSkin-Setup-vX.Y.Z.exe` 和 `SHA256SUMS.txt`，核对安装包的 SHA-256。
3. 双击安装器并完成向导。
4. 从开始菜单打开 **Codex Dream Skin**，右键托盘图标选择应用主题。Codex 已运行时，按提示保存输入并确认重启。

### SmartScreen 提示

当前安装包尚未代码签名，下载后可能显示“Windows 已保护你的电脑”。核对文件名、仓库来源和 SHA-256 后，选择“更多信息 → 仍要运行”。组织策略限制运行时，请联系管理员或使用组织批准的分发方式，并保持系统防护开启。

安装器按当前用户运行；遇到意外的管理员密码提示时，取消并核对下载来源。

## 日常使用

| 入口 | 操作 |
| --- | --- |
| 开始菜单或桌面的 Codex Dream Skin | 打开原生主题管理器 |
| 双击托盘图标 | 打开同一管理器 |
| 右键托盘图标 | 应用主题、换图、导入 ZIP、保存与切换主题、动态效果、暂停和恢复 |

管理器支持当前主题的背景透明度设置，以及将非活动主题移到回收站。主题、图片和设置位于 `%LOCALAPPDATA%\CodexDreamSkin`。

导入时选择“导入主题 ZIP…”，成功后从“已保存主题”选择应用。包格式、图片大小和手动目录操作见 [主题管理](theme-management.md)，动画选项见 [动态效果](theme-motion.md)。

## 更新

1. 下载新版 Setup.exe 和 `SHA256SUMS.txt`，核对摘要。
2. 退出 Dream Skin 托盘并关闭 Codex。
3. 运行新版安装器，覆盖现有安装。
4. 重新打开 Codex Dream Skin，从托盘应用主题。

更新保留活动主题、主题库、图片和配置备份。新下载的安装包可能再次触发 SmartScreen。

托盘的“检查更新”在点击时访问 GitHub Releases，并打开下载入口；下载与安装由用户完成。

## 恢复与卸载

右键托盘图标选择恢复，按提示关闭并重新打开 Codex，即可恢复官方外观并结束调试会话。暂停皮肤会保留调试会话，CDP 的本机访问说明见 [SECURITY.md](../SECURITY.md)。

在“设置 → 应用 → 已安装的应用”卸载 Codex Dream Skin。卸载器先恢复外观并关闭受管会话；恢复失败时会停止并保留运行文件供重试。主题和图片默认保留。确认已备份且不再需要后，可手动删除 `%LOCALAPPDATA%\CodexDreamSkin`。

## 常见问题

| 情况 | 处理 |
| --- | --- |
| SmartScreen 没有“仍要运行” | 联系管理员或改用组织批准的分发渠道；报告问题时附 Windows 版本、提示内容和安装包摘要 |
| 提示找不到 Node.js 或管理器 | 重新运行最新 Release Setup，并保留安装日志 |
| 官方 Store 包缺失或身份无法验证 | 确认 Codex 来自 Microsoft Store、注册在当前用户下，并已成功启动一次 |
| `config.toml` 语法报错 | 备份后修正提示的 TOML 语法；合法多行数组受支持 |
| Codex 更新后主题失效 | 退出托盘、重新运行最新 Setup，再从托盘应用主题 |

源码安装、端口与 Acrylic 设置见 [Windows 开发与使用说明](../windows/README.md)。提交 [Bug](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/issues/new/choose) 时，请附版本、复现步骤和已去除凭据及私人内容的日志。
