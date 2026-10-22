# macOS 离线部署模板 · Offline deployment template

用于维护者提供的完整 `Codex 主题编辑器.zip`。将 ZIP、可选背景图和下方对应语言的提示词交给本机 Codex。日常安装使用 [Release DMG](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest)。

For a complete maintainer-provided `Codex 主题编辑器.zip`, give local Codex the ZIP, an optional background image, and the prompt in your preferred language below. Use the [Release DMG](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/latest) for everyday installation.

## 中文

```text
请在这台 Mac 上部署附件中的 Codex Dream Skin，使用本地安装包和项目脚本完成安装、验证与恢复准备。

1. 将完整 ZIP 解压到稳定的工作目录。根目录应有：
   - 安装 Codex 主题编辑器.command
   - 使用说明.txt
   - 给 Codex 的部署提示词.md
   - .codex-dream-skin-studio/（隐藏引擎目录，需保留完整）
   下文用 <ENGINE> 表示隐藏引擎的绝对路径。

2. 阅读 <ENGINE>/README.md、<ENGINE>/SKILL.md 和 <ENGINE>/references/qa-inventory.md，运行：
   "<ENGINE>/tests/run-tests.sh"
   根据实际结果处理失败项。确认官方 Codex 已启动过一次，~/.codex/config.toml 已存在。

3. 退出 Codex 后安装：
   "<ENGINE>/scripts/install-dream-skin-macos.sh" --no-launch
   引擎安装到 ~/.codex/codex-dream-skin-studio。

4. 有背景图附件时，运行：
   ~/.codex/codex-dream-skin-studio/scripts/customize-theme-macos.sh --image "<图片绝对路径>" --name "My theme" --no-apply
   名称与配色优先使用我提供的内容；没有图片时使用内置 INTERNET ANGEL 主题。

5. 本次部署包括通过项目脚本重启官方 Codex 一次，以启用本机回环 CDP：
   ~/.codex/codex-dream-skin-studio/scripts/start-dream-skin-macos.sh --restart-existing

6. 运行验收：
   ~/.codex/codex-dream-skin-studio/scripts/doctor-macos.sh --require-live
   ~/.codex/codex-dream-skin-studio/scripts/verify-dream-skin-macos.sh --reload --screenshot "<首页截图绝对路径>"
   检查 verify 的 pass 字段，再检查任务页的背景、正文、菜单、侧栏和输入框，并保存截图。

7. 核对桌面的四个入口：
   Codex Dream Skin.command
   Codex Dream Skin - Customize.command
   Codex Dream Skin - Verify.command
   Codex Dream Skin - Restore.command
   日志和状态在 ~/Library/Application Support/CodexDreamSkinStudio/。
   需要恢复时使用桌面 Restore，或运行：
   ~/.codex/codex-dream-skin-studio/scripts/restore-dream-skin-macos.sh --restore-base-theme --restart-codex

完成后汇报主题与 Codex 版本、主题名、安装路径、测试/doctor/verify 结果、首页和任务页截图路径、桌面入口及恢复方法。验证未通过的项目附具体原因和下一步。
```

## English

```text
Deploy the attached Codex Dream Skin on this Mac using the local package and project scripts. Complete installation, verification, and recovery preparation.

1. Extract the complete ZIP into a stable working directory. Its root should contain:
   - 安装 Codex 主题编辑器.command
   - 使用说明.txt
   - 给 Codex 的部署提示词.md
   - .codex-dream-skin-studio/ (keep this hidden engine directory complete)
   Use <ENGINE> below for the hidden engine's absolute path.

2. Read <ENGINE>/README.md, <ENGINE>/SKILL.md, and <ENGINE>/references/qa-inventory.md, then run:
   "<ENGINE>/tests/run-tests.sh"
   Address failures according to the results. Confirm official Codex has launched at least once and ~/.codex/config.toml exists.

3. Quit Codex and install:
   "<ENGINE>/scripts/install-dream-skin-macos.sh" --no-launch
   The engine is installed to ~/.codex/codex-dream-skin-studio.

4. If a background image is attached, run:
   ~/.codex/codex-dream-skin-studio/scripts/customize-theme-macos.sh --image "<absolute image path>" --name "My theme" --no-apply
   Use my supplied name and colors where provided. With no image, use the bundled INTERNET ANGEL theme.

5. This deployment includes restarting official Codex once through the project script to enable loopback CDP:
   ~/.codex/codex-dream-skin-studio/scripts/start-dream-skin-macos.sh --restart-existing

6. Run the acceptance checks:
   ~/.codex/codex-dream-skin-studio/scripts/doctor-macos.sh --require-live
   ~/.codex/codex-dream-skin-studio/scripts/verify-dream-skin-macos.sh --reload --screenshot "<absolute home screenshot path>"
   Check the verify pass field. Inspect the task-page background, body text, menus, sidebar, and composer, and save a screenshot.

7. Confirm all four desktop launchers exist:
   Codex Dream Skin.command
   Codex Dream Skin - Customize.command
   Codex Dream Skin - Verify.command
   Codex Dream Skin - Restore.command
   Logs and state are in ~/Library/Application Support/CodexDreamSkinStudio/.
   To restore, use the desktop Restore launcher or run:
   ~/.codex/codex-dream-skin-studio/scripts/restore-dream-skin-macos.sh --restore-base-theme --restart-codex

Report the theme and Codex versions, theme name, install path, test/doctor/verify results, Home and task screenshot paths, desktop launchers, and recovery steps. Include the specific cause and next action for any check that has not passed.
```
