# Codex Dream Skin · Linux

[中文](#中文) · [English](#english)

## 中文

为 Linux 上的 Codex Desktop 提供超天酱 / INTERNET ANGEL 主题。当前主要适配社区维护的 AUR [`openai-codex-desktop`](https://aur.archlinux.org/packages/openai-codex-desktop) 包。

### 安装

需要 Node.js 20+、`bash`、`curl`、`tar` 和 `pgrep`。完全退出 Codex，在仓库根目录运行：

```bash
./linux/scripts/install-dream-skin-linux.sh
```

安装后，从桌面的 OpenAI Codex 图标启动主题。安装器会设置当前用户的 `Codex.desktop` 和 `codex://` 链接入口；GNOME 若仍使用旧的固定图标，注销并重新登录一次。

| 内容 | 位置 |
| --- | --- |
| 主题引擎 | `~/.codex/codex-dream-skin-linux` |
| 主题、配置和日志 | `${XDG_STATE_HOME:-~/.local/state}/CodexDreamSkin` |
| 桌面入口 | `${XDG_DATA_HOME:-~/.local/share}/applications/Codex.desktop` |

自定义安装路径可通过 `CODEX_APP_BIN` 指定启动程序，`CODEX_APP_PROCESS_BIN` 指定实际运行程序。安装脚本支持 `--no-launch` 和 `--port 9341`。更新时退出 Codex，拉取新版仓库后重新安装；个人主题和偏好会保留。

### 启动、验证与恢复

```bash
~/.codex/codex-dream-skin-linux/scripts/start-dream-skin-linux.sh
~/.codex/codex-dream-skin-linux/scripts/verify-dream-skin-linux.sh
~/.codex/codex-dream-skin-linux/scripts/restore-dream-skin-linux.sh
```

恢复会移除当前窗口的主题、停止记录中的注入进程，并删除 Dream Skin 创建的桌面入口。

### 动效与性能

```bash
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --get
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --set-mode subtle
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --set-effect ambient off
```

模式为 `system`（默认）、`off`、`subtle`、`full`；五类效果为 `interactions`、`status`、`character`、`ambient`、`themeTransition`，分别接受 `on` 或 `off`。偏好保存在状态目录的 `motion.json`，切换主题时保留；配置损坏时会报告错误并保留原文件。

`theme.json` 中的 `performanceMode: low/full` 控制渲染效果，内置主题使用 `full`；`low` 可减少装饰和模糊。Wayland 使用 OpenGL/ANGLE 合成路径，X11 使用 Codex 默认 GPU 后端。

### 构建发行归档

```bash
./linux/scripts/build-release.sh
```

生成 `linux/release/CodexDreamSkin-Linux-v<version>.tar.gz` 和 `.sha256` 校验文件。解压后运行归档中的 `scripts/install-dream-skin-linux.sh`。

### 运行方式

主题通过 `127.0.0.1` 上的 CDP 注入已识别的 Codex 页面。引擎接受 `app://` 页面及社区包的 `localhost:5175` 页面，并检查 Codex 界面标记。CDP 的访问范围与使用建议见仓库中的 `SECURITY.md`。

## English

The INTERNET ANGEL theme for Codex Desktop on Linux. Current compatibility work primarily targets the community-maintained AUR [`openai-codex-desktop`](https://aur.archlinux.org/packages/openai-codex-desktop) package.

### Install

Requires Node.js 20+, `bash`, `curl`, `tar`, and `pgrep`. Fully quit Codex, then run from the repository root:

```bash
./linux/scripts/install-dream-skin-linux.sh
```

After installation, launch the theme from the OpenAI Codex desktop icon. The installer configures the current user's `Codex.desktop` and `codex://` handler. If GNOME keeps an old pinned launcher, log out and back in once.

| Content | Location |
| --- | --- |
| Theme engine | `~/.codex/codex-dream-skin-linux` |
| Themes, preferences, and logs | `${XDG_STATE_HOME:-~/.local/state}/CodexDreamSkin` |
| Desktop entry | `${XDG_DATA_HOME:-~/.local/share}/applications/Codex.desktop` |

For a custom Codex installation, set `CODEX_APP_BIN` to its launcher and `CODEX_APP_PROCESS_BIN` to the actual application executable. The installer accepts `--no-launch` and `--port 9341`. To update, quit Codex, pull the latest repository, and run the installer again. Personal themes and preferences are preserved.

### Start, verify, and restore

```bash
~/.codex/codex-dream-skin-linux/scripts/start-dream-skin-linux.sh
~/.codex/codex-dream-skin-linux/scripts/verify-dream-skin-linux.sh
~/.codex/codex-dream-skin-linux/scripts/restore-dream-skin-linux.sh
```

Restore removes the current window's theme, stops the recorded injector process, and removes the desktop entry created by Dream Skin.

### Motion and performance

```bash
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --get
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --set-mode subtle
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --set-effect ambient off
```

Modes are `system` (default), `off`, `subtle`, and `full`. The five effects are `interactions`, `status`, `character`, `ambient`, and `themeTransition`, each accepting `on` or `off`. Preferences live in the state directory's `motion.json` and persist across theme changes. Invalid configurations produce an error and retain the original file.

The `performanceMode: low/full` field in `theme.json` controls rendering effects; the bundled theme uses `full`. Choose `low` to reduce decorations and blur. Wayland uses OpenGL/ANGLE composition; X11 uses the Codex default GPU backend.

### Build a release archive

```bash
./linux/scripts/build-release.sh
```

Produces `linux/release/CodexDreamSkin-Linux-v<version>.tar.gz` and a `.sha256` checksum file. Extract the archive and run its `scripts/install-dream-skin-linux.sh`.

### Runtime

The engine applies the theme to verified Codex pages through CDP at `127.0.0.1`. It accepts `app://` pages and the community package's `localhost:5175` renderer, then checks Codex interface markers. See the repository's `SECURITY.md` for CDP access scope and operating guidance.
