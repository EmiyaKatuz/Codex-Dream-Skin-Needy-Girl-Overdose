# Codex Dream Skin · macOS

[English](README.en.md) · [项目首页](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/README.md)

为 Codex Desktop 提供超天酱 / INTERNET ANGEL 主题、动态效果和本地主题管理。菜单栏支持换图、导入主题、调整透明度、暂停与恢复。

## 安装

需要 macOS 13 或更新版本，以及已启动过一次的官方 Codex Desktop。主题引擎使用官方 Codex 内置的 Node.js。

从 [Releases](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest) 下载 `CodexDreamSkin-vX.Y.Z.dmg`，将 **Codex Dream Skin.app** 拖入 Applications 后打开。首次启动、更新和卸载见 [macOS 安装指南](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/install-macos.md)。

## 从源码安装

在本目录运行；安装前先退出 Codex：

```bash
./scripts/install-dream-skin-macos.sh --no-launch
~/.codex/codex-dream-skin-studio/scripts/start-dream-skin-macos.sh
```

安装器创建启动、定制、验证和恢复四个桌面 `.command` 入口。安装位置：

| 内容 | 路径 |
| --- | --- |
| 引擎 | `~/.codex/codex-dream-skin-studio` |
| 主题、图片、状态和日志 | `~/Library/Application Support/CodexDreamSkinStudio` |
| 已保存主题 | `~/Library/Application Support/CodexDreamSkinStudio/themes` |
| 外观配置备份 | `~/Library/Application Support/CodexDreamSkinStudio/theme-backup.json` |

## 常用操作

菜单栏的「主题」菜单提供背景透明度和动态效果设置。透明度范围为 0–100%；「跟随主题」使用作者设置，缺省值为 30%。动态效果提供跟随系统、关闭、轻量和完整四档。详见 [主题管理](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/theme-management.md) 与 [动态效果](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/theme-motion.md)。

源码部署也可以运行：

```bash
~/.codex/codex-dream-skin-studio/scripts/verify-dream-skin-macos.sh
~/.codex/codex-dream-skin-studio/scripts/pause-dream-skin-macos.sh
~/.codex/codex-dream-skin-studio/scripts/restore-dream-skin-macos.sh --restore-base-theme --restart-codex
```

恢复命令会恢复界面并以普通模式重启 Codex，结束本次 CDP 调试会话。运行方式与本机调试端口说明见 [安全文档](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/SECURITY.md)。

## 图片与主题

内置「超天酱 · INTERNET ANGEL」JPEG 主题。安装时将预设复制到主题库；升级保留个人主题、导入图片和偏好，并把识别出的未修改旧预设归档到 `retired-themes/`。预设说明见 [内置主题](presets/README.md)。

- 菜单选择「导入主题 ZIP…」，导入后在「已保存的主题」中选择应用。格式要求见 [主题管理](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/theme-management.md)。
- 换图支持 PNG、JPEG、HEIC、TIFF 和 WebP；源文件上限 50 MiB，处理后的背景上限 10 MiB、单边 16384 像素、总计 5000 万像素。
- 推荐使用 `2560 × 1440` 纯背景图，主体靠右，左侧留出低对比空间。构图模板见 [背景提示词指南](../docs/reference-background-prompt-guide.md)。

调整本地图片的构图：

```bash
~/.codex/codex-dream-skin-studio/scripts/load-image-theme-macos.sh \
  --file "/path/to/background.jpg" \
  --appearance auto \
  --focus-x 0.72 --focus-y 0.45 \
  --safe-area left --task-mode banner
```

| 参数 | 可选值或用途 |
| --- | --- |
| `--appearance` | `auto` 跟随 Codex 外观；`light`、`dark` 固定模式 |
| `--focus-x` / `--focus-y` | `0..1`，背景主体位置 |
| `--safe-area` | `auto`、`left`、`right`、`center`、`none` |
| `--task-mode` | `auto`、`ambient`、`banner`、`full`、`off`，控制任务页背景 |

引擎在本机分析图片的亮度、配色和构图；显式主题字段优先于自动分析。配色定制可使用：

```bash
~/.codex/codex-dream-skin-studio/scripts/customize-theme-macos.sh \
  --image "/path/to/background.jpg" --name "My theme" \
  --accent "#ff45c8" --secondary "#36d7e8" --highlight "#642a8c"
```

## 开发与验证

在本目录运行：

```bash
node scripts/injector.mjs --check-payload
./tests/run-tests.sh
swift test --package-path menubar-app
./scripts/build-dmg.sh
```

DMG 输出到 `macos/release/`。原生构建和交互验收需要 macOS。跨平台结构见 [平台说明](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/platforms.md)。

## 许可

软件采用 [MIT 许可](LICENSE)。素材与运行时条款见 [NOTICE.md](NOTICE.md)。
