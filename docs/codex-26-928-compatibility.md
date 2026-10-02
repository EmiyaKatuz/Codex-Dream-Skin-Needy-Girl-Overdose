# Codex 26.924–26.928 元素兼容

本次修复针对 2026-10-02 可取得的稳定分支资料。Homebrew 的
[`chatgpt` cask](https://github.com/Homebrew/homebrew-cask/blob/main/Casks/c/chatgpt.rb)
记录版本 `26.928.40906`，应用标识仍为 `com.openai.codex`；Windows 的具体 DOM
证据来自 `26.928.2636.0` 和 `26.928.1915.0`。官方更新源在工作环境返回 HTTP 403，
因此这些版本记录不能替代对官方更新源或应用包的直接校验。

## Issue #29

本 fork 的 [Issue #29](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/issues/29)
报告 Windows 10 22H2、官方 Codex `26.927.11222` 与 Dream Skin `1.5.19` 在应用后聊天区白屏。
该症状与下面已复现的内容宿主被隐藏缺陷一致。本次提交将此前未发布的适配纳入仓库修复；
报告没有提供 DOM 或 Verify 日志，不能声称已确认报告者机器上的唯一原因。

## 元素变化与处理

| 元素变化 | 皮肤处理 | 证据 |
| --- | --- | --- |
| `data-app-shell-main-content-top-fade` 移到包裹消息和输入框的容器 | 装饰选择器去掉该属性分支；旧装饰类和 `_MainContentTopFade_` 只清背景，不设置 `display:none` | [#421](https://github.com/Fei-Away/Codex-Dream-Skin/issues/421)、[PR #416](https://github.com/Fei-Away/Codex-Dream-Skin/pull/416)、[PR #420](https://github.com/Fei-Away/Codex-Dream-Skin/pull/420) |
| 首页 first-child 改为 `group/home-composer-layout` | 所有旧版 first-child hero 尺寸、装饰和响应式覆盖排除新布局；原生布局负责输入框尺寸 | [PR #417](https://github.com/Fei-Away/Codex-Dream-Skin/pull/417) |
| `_PageSurfaceLayout_` 和新的 sticky composer fade 覆盖壁纸 | 仅匹配外层表面及完整八个工具类的渐隐层，清背景绘制 | [PR #417](https://github.com/Fei-Away/Codex-Dream-Skin/pull/417) |
| Projects、Pull Requests 和 Customize 各有独立不透明层 | 分别匹配 focus-area 直属表面、pane-frame 与内部表面、非 composer 的 sticky 伪元素；保护嵌套弹窗、菜单、列表、表单和公开 card 部件 | [PR #418](https://github.com/Fei-Away/Codex-Dream-Skin/pull/418) |
| Composer Root/Footer 可仅带 CSS Module 类 | 共享 Internet Angel 分类器增加 `_ComposerLayoutRoot_` / `_ComposerLayoutFooter_`，保留旧类、属性与公开部件回退 | 现有 `tools/selectors.json` 26.814+ 合同 |

以上报告属于 **reporter** 证据，未提升为本 fork 的实机确认。未合并上述 PR 中的
版本号、主题 schema 或透明输入框新选项。

## 资产与检查

共享扩展仍由 `runtime/internet-angel-extension.js` 生成三端副本；基础 CSS 沿用
当前架构：`runtime/dream-skin.css` 生成 macOS 副本，Windows/Linux 保留各自的
Internet Angel 样式并接受相同的兼容修复。选择器合同同步现在包含 Linux。

```bash
node tools/sync-runtime-assets.mjs --check
node --test tools/*.test.mjs macos/tests/*.test.mjs windows/tests/*.test.mjs
node tools/check-selector-provenance.mjs
node macos/scripts/injector.mjs --check-payload
node windows/scripts/injector.mjs --check-payload
node linux/scripts/injector.mjs --check-payload
```

新增 `tools/current-codex-surfaces.test.mjs` 扫描源和三端 CSS，覆盖条件规则中的
危险隐藏、旧 Home 尺寸、精确背景作用域与浮层保护。共享扩展的 VM 回归覆盖
仅模块类、hash 变化、延迟挂载、普通 footer 不误标及清理。

本轮 Node 回归 198 项通过，3 项因平台条件跳过；三端 payload、共享同步、
JavaScript/shell 语法与差异检查通过。

验证只在云端进行。云端 Chromium 151 的 19 个合成 DOM 场景通过，使用三端完整样式表，比较
修复前后的容器布局、输入交互、多尺寸首页、背景作用域，以及真实扩展脚本的
延迟分类和清理。它不是官方 Codex App 的实机验证；当前云端未安装该客户端，
也未验证 Windows 原生材质或 macOS 原生窗口。平台原生 PowerShell/Swift 检查由
对应 CI job 执行，结果见 [修复 PR #30](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/pull/30) 与版本准备 PR 的检查记录。

本修复纳入 `1.5.20`；安装包及发布状态以 [v1.5.20 Release](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/releases/tag/v1.5.20) 为准。
