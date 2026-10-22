# 平台与开发

[中文](./platforms.md) · [English](./platforms.en.md)

## 平台支持

| 项目 | Windows | macOS | Linux |
| --- | --- | --- | --- |
| 安装方式 | Setup.exe、源码脚本 | DMG、源码脚本 | 源码脚本、tar.gz 归档 |
| 控制入口 | 系统托盘、原生主题管理器 | 菜单栏 App | shell 命令 |
| Codex 来源 | Microsoft Store `OpenAI.Codex` | 官方 Codex App | 主要适配 AUR `openai-codex-desktop` |
| 运行时 | Setup 内置 Node.js；源码需要 Node.js 22+ | 使用 Codex 内置 Node.js | Node.js 20+ |
| 自定义背景与保存主题 | 支持 | 支持 | 使用当前配置 |
| 主题 ZIP 导入与透明度菜单 | 支持 | 支持 | — |
| 动效设置与恢复 | 支持 | 支持 | 支持 |

Windows 调试会话使用独立的受管 profile，首次使用时可能需要重新登录 Codex。Linux 可通过 `CODEX_APP_BIN` 指定自定义可执行文件路径。

安装与平台命令：[Windows](../windows/README.md) · [macOS](../macos/README.md) · [Linux](../linux/README.md)。

## 默认路径

| 平台 | 安装后引擎 | 用户数据与日志 |
| --- | --- | --- |
| Windows | `%LOCALAPPDATA%\CodexDreamSkin\engine` | `%LOCALAPPDATA%\CodexDreamSkin` |
| macOS | `~/.codex/codex-dream-skin-studio` | `~/Library/Application Support/CodexDreamSkinStudio` |
| Linux | `~/.codex/codex-dream-skin-linux` | `${XDG_STATE_HOME:-~/.local/state}/CodexDreamSkin` |

Windows 的受管 profile 位于数据目录中的 `cdp-profile/`；macOS 和 Windows 的已保存主题位于各自数据目录中的 `themes/`。

## 共享运行时

三端通过本机回环 CDP 向已验证的 Codex 界面加载样式和装饰层。`runtime/` 是共享源，平台脚本负责应用发现、启动、配置与恢复。

修改共享样式或脚本后，从仓库根目录同步资产：

```bash
node tools/sync-runtime-assets.mjs
node tools/sync-runtime-assets.mjs --check
```

主题格式与图片配置见[主题管理](./theme-management.md)，动效偏好见[动效设置](./theme-motion.md)，CDP 与路径校验见[安全说明](../SECURITY.md)。

## 开发检查

跨平台 Node 检查建议使用 Node.js 22。以下命令从仓库根目录运行：

```bash
node --test macos/tests/*.test.mjs windows/tests/*.test.mjs tools/*.test.mjs
node tools/sync-runtime-assets.mjs --check
node tools/check-selector-provenance.mjs
node macos/scripts/injector.mjs --check-payload
node windows/scripts/injector.mjs --check-payload
node linux/scripts/injector.mjs --check-payload
```

原生构建与测试使用对应平台环境：

- Windows：PowerShell 5.1 / 7；源码安装前需使用 .NET SDK 8+ [构建主题管理器](../windows/theme-manager/README.md)。
- macOS：`./macos/tests/run-tests.sh`；菜单栏 App 与 DMG 构建见 [macOS 说明](../macos/README.md)。
- Linux：归档构建与桌面验证见 [Linux 说明](../linux/README.md)。

发布步骤见[发布流程](./releases/README.md)，版本历史见[更新记录](../windows/CHANGELOG.md)。
