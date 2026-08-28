# Codex 26.818 局部样式兼容设计

## 目标

修复 Internet Angel 主题在新版 Codex 任务页中的两个局部缺口：延迟挂载的环境信息面板没有获得专属样式，以及输入框后方的两层原生渐隐仍显示为黑色底板。

## 范围

- 保留现有 `data-angel-component` 分类和共享运行时架构。
- 用现有动态重新分类逻辑覆盖延迟挂载的环境信息面板，不新增第二套观察器。
- 在共享基础 CSS 中精确清除 Codex 26.818 的两种输入区渐隐层。
- 通过现有同步工具从共享基础 CSS 生成 macOS 副本，并在 fork 独立维护的 Windows 基础 CSS 中加入同一精确规则。Internet Angel 分类器继续由共享源生成三端副本。
- 不合并上游 `v1.5.16` 的其他改动，不修改主题包、安装器、版本号或发布配置。

## 实现

环境面板继续使用现有结构与语义信号识别。回归测试需要证明面板在初始分类后延迟挂载时仍会被标记，且相似弹层不会被误判。

底部渐隐只匹配非首页主区域内 Codex 26.818 的完整工具类签名：高度为主输入区的 `from-surface via-surface` 渐隐和输入区顶部的 `from-surface to-transparent` 渐隐。两者都清除 `background` 和 `background-image`，不扩大到通用渐变元素。

## 验证

- 先增加会失败的共享运行时断言，再添加最小 CSS 改动。
- 运行共享 renderer、Internet Angel、macOS 与 Windows renderer 和运行时同步检查。
- 运行 `git diff --check` 与相关 JavaScript 语法检查。
- 只有可信 CDP 会话可用时才做热注入与截图验证；否则明确保留实机验证缺口。

## Codex 26.820 变更胶囊补充

Codex 26.820 将文件增删统计类名从 `git-decoration-added/deleted` 改为 `text-codex-git-added/deleted`。现有 `classifyChanges()` 继续负责识别和标记，不新增分类器或 CSS。候选按钮必须同时具备兼容后的 added 与 deleted 子节点、现有中英文“文件已更改”语义，以及现有圆角边框外壳，避免仅凭文本误标普通按钮。

测试同时保留旧 DOM fixture，并新增 26.820 fixture。红测必须证明新版胶囊不会被旧选择器识别；绿测必须证明新旧胶囊都获得 `changes-shell`、`changes-clip-host` 和 `changes-pill` 标记。
