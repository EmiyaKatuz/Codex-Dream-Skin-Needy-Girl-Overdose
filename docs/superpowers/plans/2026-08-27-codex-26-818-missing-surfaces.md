# Codex 26.818 局部样式兼容实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复延迟环境面板和 Codex 26.818 输入区双层黑色渐隐。

**Architecture:** 复用现有 Internet Angel 动态分类器，不新增观察器。共享基础 CSS 负责 macOS，fork 独立的 Windows 基础 CSS 使用同一组完整工具类签名；现有同步脚本继续生成平台资产。

**Tech Stack:** JavaScript、Node.js `assert`、CSS、现有运行时同步脚本。

**Spec:** `docs/superpowers/specs/2026-08-27-codex-26-818-missing-surfaces-design.md`

## Global Constraints

- 不合并上游 `v1.5.16` 的其他改动。
- 不修改主题包、安装器、版本号或发布配置。
- 不新增依赖或第二套 DOM 观察器。
- 未取得可信 CDP 证据时不得宣称实机修复。

---

### Task 1: 锁定双端渐隐回归

**Files:**

- Modify: `tools/renderer-runtime.test.mjs`
- Modify: `windows/tests/renderer-inject.test.mjs`

**Interfaces:**

- Consumes: macOS 生成后的 `assets/dream-skin.css` 和 Windows 独立的 `assets/dream-skin.css`。
- Produces: 两端都必须包含两种完整 Codex 26.818 渐隐签名的静态契约。

- [ ] **Step 1: 添加 macOS 失败断言**

在 `runRendererRuntimeTest()` 的 Composer CSS 契约附近加入：

```js
assert.match(css,
  /\[class~="h-full"\]\[class~="bg-gradient-to-t"\]\[class~="from-surface"\]\[class~="via-surface"\]/,
  "The current 148px sticky composer fade must be removed by its full utility signature.");
assert.match(css,
  /\[class~="h-7"\]\[class~="bg-gradient-to-t"\]\[class~="from-surface"\]\[class~="to-transparent"\]/,
  "The current 28px composer-top fade must be removed by its full utility signature.");
```

- [ ] **Step 2: 添加 Windows 失败断言**

在 Windows 基础 CSS 契约附近加入同样两条 `assert.match(css, ...)`。

- [ ] **Step 3: 运行红测**

Run: `node macos/tests/renderer-inject.test.mjs`

Expected: FAIL，提示缺少 `148px sticky composer fade`。

Run: `node windows/tests/renderer-inject.test.mjs`

Expected: FAIL，提示缺少同一渐隐签名。

### Task 2: 添加最小双端 CSS 修复

**Files:**

- Modify: `runtime/dream-skin.css`
- Modify: `macos/assets/dream-skin.css`（由同步工具生成）
- Modify: `windows/assets/dream-skin.css`

**Interfaces:**

- Consumes: Codex 26.818 两个渐隐节点的完整工具类签名。
- Produces: 仅在非首页主区域清除这两个渐隐节点的背景。

- [ ] **Step 1: 修改共享基础 CSS**

在旧输入区渐隐规则前加入：

```css
html[data-dream-skin="active"] __DREAM_SELECTOR_SHELL_MAIN__:not(:has(__DREAM_SELECTOR_HOME_ROUTE_CSS__))
  [class~="pointer-events-none"][class~="bottom-0"][class~="h-full"][class~="bg-gradient-to-t"][class~="from-surface"][class~="via-surface"],
html[data-dream-skin="active"] __DREAM_SELECTOR_SHELL_MAIN__:not(:has(__DREAM_SELECTOR_HOME_ROUTE_CSS__))
  [class~="pointer-events-none"][class~="-bottom-1"][class~="h-7"][class~="bg-gradient-to-t"][class~="from-surface"][class~="to-transparent"] {
  background: transparent !important;
  background-image: none !important;
}
```

- [ ] **Step 2: 修改 Windows 基础 CSS**

使用 `html.codex-dream-skin` 和现有 `$SHELL_MAIN_SELECTOR` 对应的具体选择器加入同一限定规则，不触碰通用渐变。

- [ ] **Step 3: 同步生成 macOS 资产**

Run: `node tools/sync-runtime-assets.mjs`

Expected: `macos/assets/dream-skin.css` 更新，Windows 独立基础 CSS 保持手工改动。

- [ ] **Step 4: 运行绿测**

Run: `node macos/tests/renderer-inject.test.mjs`

Expected: PASS。

Run: `node windows/tests/renderer-inject.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交代码**

```bash
git add runtime/dream-skin.css macos/assets/dream-skin.css windows/assets/dream-skin.css \
  tools/renderer-runtime.test.mjs windows/tests/renderer-inject.test.mjs
git commit -m "fix: theme Codex 26.818 composer fades"
```

### Task 3: 验证、部署和实机边界

**Files:**

- Modify: `TASK_PROGRESS.md`

**Interfaces:**

- Consumes: Task 2 的双端 CSS 与现有动态环境面板分类器。
- Produces: 静态验证记录，以及在可信会话可用时的实机结果。

- [ ] **Step 1: 验证环境面板动态分类**

Run: `node macos/tests/internet-angel-macos.test.mjs`

Expected: PASS，包括单一 body observer、动态证据挂载和环境证据移除后的重新分类。

- [ ] **Step 2: 运行同步与语法检查**

Run: `node tools/sync-runtime-assets.mjs --check`

Expected: PASS。

Run: `node --check runtime/internet-angel-extension.js`

Expected: PASS。

Run: `git diff --check`

Expected: PASS。

- [ ] **Step 3: 运行双端相关回归**

Run: `./macos/tests/run-tests.sh`

Expected: macOS 可执行测试通过；缺少完整 Xcode 时仅保留脚本已有的明确 skip。

Windows PowerShell 和真实 Windows 视觉验证留给 CI 或 Windows 主机，不用 macOS 结果代替。

- [ ] **Step 4: 安全部署并验证**

先运行 `./macos/scripts/status-dream-skin-macos.sh --json --deep`。只有 Codex 未运行时才执行：

```bash
./macos/scripts/install-dream-skin-macos.sh --no-launchers --no-launch
```

部署后再次比较安装引擎版本与四个运行时资产摘要。仅在可信 CDP 会话可用时运行 verifier 和截图；不得主动重启已运行的 Codex。

- [ ] **Step 5: 更新进度并提交**

记录精确测试结果、部署状态和剩余实机缺口，然后提交 `TASK_PROGRESS.md`。

### Task 4: 兼容 Codex 26.820 文件变更胶囊

**Files:**

- Modify: `runtime/internet-angel-extension.js`
- Modify: `macos/tests/internet-angel-macos.test.mjs`
- Modify: `macos/assets/internet-angel-extension.js`（由同步工具生成）
- Modify: `windows/assets/internet-angel-extension.js`（由同步工具生成）
- Modify: `linux/assets/internet-angel-extension.js`（由同步工具生成）

**Interfaces:**

- Consumes: 旧 `git-decoration-added/deleted` 与新 `text-codex-git-added/deleted` 子节点。
- Produces: 兼容新旧 Codex 的 `changes-shell`、`changes-clip-host` 和 `changes-pill` 标记。

- [ ] **Step 1: 添加 26.820 失败 fixture**

复制现有变更胶囊 fixture，但只提供 `text-codex-git-added` 和 `text-codex-git-deleted` 子节点，并断言三个 `changes-*` 标记存在。

- [ ] **Step 2: 运行红测**

Run: `node macos/tests/internet-angel-macos.test.mjs`

Expected: FAIL，提示 26.820 胶囊缺少 `changes-pill`。

- [ ] **Step 3: 扩展现有分类器选择器**

在 `classifyChanges()` 内分别定义 added 与 deleted 兼容选择器，并用两者构造候选按钮查询；保留现有文本、外壳和裁剪宿主判断。

- [ ] **Step 4: 同步并运行绿测**

Run: `node tools/sync-runtime-assets.mjs`

Run: `node macos/tests/internet-angel-macos.test.mjs`

Expected: PASS，旧、新 fixture 都获得三个 `changes-*` 标记。

- [ ] **Step 5: 运行相关回归并提交**

Run: `node tools/internet-angel-extension.test.mjs`

Run: `node tools/sync-runtime-assets.mjs --check`

Run: `git diff --check`

```bash
git add runtime/internet-angel-extension.js macos/assets/internet-angel-extension.js \
  windows/assets/internet-angel-extension.js linux/assets/internet-angel-extension.js \
  macos/tests/internet-angel-macos.test.mjs TASK_PROGRESS.md
git commit -m "fix: classify Codex 26.820 change summary"
```
