# 项目概览

[中文](./PROJECT.md) · [English](./PROJECT.en.md)

Codex Dream Skin 为 Codex Desktop 提供超天酱 / INTERNET ANGEL 主题。当前版本为 **1.8.0**，支持 Windows、macOS 和 Linux。

## 功能与运行方式

主题覆盖首页、侧栏、对话、输入框、设置和终端，提供统一动效。macOS 和 Windows 还支持自定义背景、主题 ZIP、主题保存与切换，以及背景透明度设置。

平台启动器通过本机回环 CDP 连接 Codex，向已验证的界面加载共享样式和装饰层。平台脚本负责启动、配置、状态管理和恢复；共享源位于 `runtime/`。

## 目录

| 目录 | 内容 |
| --- | --- |
| `runtime/` | 共享样式、界面适配、动效、主题校验与偏好工具 |
| `macos/` | 菜单栏 App、脚本、内置主题与 DMG 构建 |
| `windows/` | 托盘、原生主题管理器、PowerShell 脚本与 Setup 构建 |
| `linux/` | 安装、启动、恢复脚本与发行归档构建 |
| `tools/` | 共享资产同步、兼容性检查与回归工具 |
| `docs/` | 使用指南、开发参考与版本记录 |

## 文档维护

中文与英文使用相同的章节和操作步骤，顶部互链。`README.md` 为默认中文首页，`README.zh-CN.md` 与其保持一致，`README.en.md` 为英文首页。短文档和独立打包文档可在同一文件中提供两种语言。

更新文档时以当前代码和发布资产为依据；安装与使用步骤放在平台指南，主题格式和动效设置集中维护。历史更新保存在 `docs/releases/` 和平台 `CHANGELOG.md`。

## 入口

- [下载与使用](../README.md)
- [平台与开发](./platforms.md)
- [主题管理与格式](./theme-management.md)
- [动效设置](./theme-motion.md)
- [背景图制作](./reference-background-prompt-guide.md)
- [发布流程](./releases/README.md)

项目基于 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 开发。许可见 [LICENSE](../LICENSE)，素材说明见 [NOTICE](../macos/NOTICE.md)。
