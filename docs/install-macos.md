# macOS 安装与更新

[English](install-macos.en.md) · [项目首页](../README.md)

## 首次安装

需要 macOS 13 或更新版本。先安装官方 Codex Desktop，启动一次后退出。

1. 从 [Releases](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest) 下载 `CodexDreamSkin-vX.Y.Z.dmg` 和 `SHA256SUMS.txt`，核对 DMG 的 SHA-256。
2. 打开 DMG，将 **Codex Dream Skin.app** 拖入 **Applications（应用程序）**。
3. 打开应用。若 macOS 拦截首次启动，进入 **系统设置 → 隐私与安全性 → 仍要打开**，按系统提示确认。
4. 应用会部署主题引擎；若提示 Codex 正在运行，先退出 Codex，再选择「安装 / 升级引擎」。完成后使用菜单栏图标操作。

当前应用采用 ad-hoc 签名，首次启动通过 macOS 图形界面确认。引擎使用官方 Codex 内置的 Node.js。

## 日常使用

菜单栏提供启动、暂停、恢复、换图、导入主题 ZIP 和已保存主题。

| 内容 | 位置 |
| --- | --- |
| 引擎 | `~/.codex/codex-dream-skin-studio` |
| 主题、图片和状态 | `~/Library/Application Support/CodexDreamSkinStudio` |

- **背景透明度**：「主题 → 背景透明度」，松开滑块后生效。0% 为不透明，100% 为完全透明；文字和图标保持可读。设置按主题保存，「跟随主题」采用作者设置，缺省值为 30%。
- **动态效果**：「主题 → 动态效果」选择跟随系统、关闭、轻量或完整；系统减少动态效果设置优先。详见 [动态效果](theme-motion.md)。
- **导入主题**：选择「导入主题 ZIP…」，导入后在「已保存的主题」中选择应用。包格式、限制和手动目录方式见 [主题管理](theme-management.md)。

## 从网站一键换肤

1. 在菜单栏应用当前主题，确认状态为 **Skin ON**，且没有「待应用」主题。
2. 在 DreamSkin.cc 选择支持一键换肤的主题，点击「一键应用到客户端」，允许浏览器打开 **Codex Dream Skin.app**。
3. 在客户端核对主题名、作者、包大小和 SHA-256，确认后继续。
4. 等待客户端完成下载、包校验和界面渲染验证，以客户端显示的结果为准。

客户端从固定的 DreamSkin.cc API 获取主题，并校验审核状态、兼容性、摘要、主题包、图片和 Safe CSS。缺少 `theme.css` 的旧主题可预览或下载，网页中的一键换肤按钮仅对兼容主题显示。

切换失败时，客户端尝试恢复并验证原主题。若提示状态未确认，请保留对话框给出的恢复快照路径，再从菜单栏选择已保存主题重试；恢复信息位于 `recovery/` 或提示的事务目录。可用快照及当前状态以客户端提示为准。

## 更新

1. 从 Releases 下载新版 DMG 并核对校验值。
2. 退出 Dream Skin 菜单栏应用，并按提示关闭 Codex。
3. 打开 DMG，将新版拖入 Applications，选择替换。
4. 重新打开应用；主题、图片和状态会保留。若系统再次拦截，按首次安装的步骤确认。

应用在启动约 15 秒后检查一次更新，之后每 24 小时检查一次。也可从「维护 → 立即检查更新」打开下载入口，由用户下载安装。

## 恢复与卸载

1. 从菜单栏选择「恢复原状并卸载」，完成官方外观恢复和 CDP 会话关闭。
2. 将 `/Applications/Codex Dream Skin.app` 移到废纸篓。
3. 如需删除主题和图片，先备份，再删除 `~/Library/Application Support/CodexDreamSkinStudio`。

CDP 会话说明见 [安全文档](../SECURITY.md)。

## 常见问题

| 情况 | 处理方式 |
| --- | --- |
| 找不到「仍要打开」 | 双击 Applications 中的应用后，重新进入「隐私与安全性」查看。系统安全设置保持开启。 |
| 更新后没有菜单栏图标 | 退出旧应用，重新启动 Applications 中的新版本，并按提示完成引擎升级。 |
| 使用源码安装或诊断命令 | 查看 [macOS 开发说明](../macos/README.md)。 |
