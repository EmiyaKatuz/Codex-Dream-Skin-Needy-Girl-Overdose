# 统一动效系统

本功能为待发布的开发变更，不包含在已发布的 v1.5.20 安装包中。

此实现对应[动效路线图](theme-animation-roadmap-2026-10-03.md)的首轮客户端范围：统一偏好与生命周期、微交互、有限状态反馈、角色符号与背景过渡。动效来自受信的共享运行时；主题 ZIP 的三文件合同和 Safe CSS 白名单保持不变。

## 使用方式

- macOS：菜单栏 → 主题 → 动态效果。
- Windows：托盘 → 动态效果。
- Linux：`bash linux/scripts/motion-settings-linux.sh --set-mode subtle`。安装后的同名脚本位于安装目录的 `scripts/` 下。

三端提供 `system`（跟随系统）、`off`（关闭）、`subtle`（轻量）、`full`（完整），以及交互反馈、任务状态、角色、背景氛围、主题切换五个开关。设置生效不需要重启 Codex；运行中的 injector 检测到偏好变化后重新应用共享配置。

| 模式 | 行为 |
| --- | --- |
| 跟随系统 | 默认轻量；系统要求减少动态效果时关闭动效 |
| 关闭 | 关闭主题动效，保留主题和原生交互 |
| 轻量 | 短交互与一次反馈，无持续角色或氛围循环 |
| 完整 | 首页最多三个持续装饰通道；任务页最多一个状态通道 |

系统的减少动态效果设置优先于完整模式。页面隐藏、装饰锚点离屏、导航切换及输入法组合期间暂停；窄窗口取消背景氛围。关闭主题动效不会禁用 Codex 自己的加载图标。Linux 旧 `performanceMode` 继续控制原有布局/渲染降级，新增动效统一由上述偏好控制；默认跟随系统不再自动启动旧的所有装饰循环。

Linux 也可以单独关闭效果或读取配置：

```bash
bash linux/scripts/motion-settings-linux.sh --set-effect ambient off
bash linux/scripts/motion-settings-linux.sh --get
```

共享工具 `assets/motion-settings.mjs` 提供相同的 `--get`、`--set-mode`、`--set-effect` 命令。原生菜单通过经过验证的 Node 入口调用该工具，不直接修改 `theme.json`。

## 偏好存储

| 平台 | 文件 |
| --- | --- |
| macOS | `~/Library/Application Support/CodexDreamSkinStudio/motion.json` |
| Windows | `%LOCALAPPDATA%\CodexDreamSkin\motion.json` |
| Linux | `${XDG_STATE_HOME:-~/.local/state}/CodexDreamSkin/motion.json` |

完整配置如下；不接受其他字段或缺失字段：

```json
{
  "schemaVersion": 1,
  "mode": "system",
  "effects": {
    "interactions": true,
    "status": true,
    "character": true,
    "ambient": true,
    "themeTransition": true
  }
}
```

文件缺失时使用默认设置。非法 JSON、未知字段、链接或超过 16 KiB 的文件会被拒绝；injector 将动效降为关闭，仍允许正常应用与恢复皮肤。菜单会显示配置不可用，不覆盖损坏文件。读写工具检查路径与文件身份，写入使用独占临时文件及原子替换，并拒绝覆盖并发变化。

## 路线图覆盖

| 路线图编号 | 实现 |
| --- | --- |
| 01–03 | 输入框聚焦边缘、按钮按下反馈、侧栏/终端/设置选项的选中边缘过渡；不移动内容宿主 |
| 04–05 | 新出现菜单与首页卡的短边缘反馈，首页首批卡数量受限；保留原生菜单定位和进出场 |
| 06 | 明确打开的模态确认提示给予一次注意反馈；普通历史权限卡不等同于待确认 |
| 07–09 | 忙碌、待确认的局部语义适配；完整的显式状态接口与终态去重，缺证据的原生终态适配关闭 |
| 10–11 | 已识别展开箭头和新编辑卡反馈；编辑卡要求稳定的原生条目标识，重挂载不重播 |
| 12 | 停用旧的逐行子代理持续发光；逐子代理执行状态尚无经过验证的生产者，维持静态 |
| 13 | 对满足尺寸和图层条件的固定背景做解码后短淡化；无法确认的布局直接切换 |
| 14–15 | 已知内置 Internet Angel 主题增加随状态变化的独立角色符号；完整模式首页三个星点共用一个低频通道 |
| 16–17 | 设置微交互、原生四档/五开关；菜单栏和托盘使用皮肤工具自身操作的真实 busy 状态 |

角色符号是独立装饰，不修改壁纸人物表情，不把眼部定位套到用户图片。新表情素材、多图主题包、视频壁纸、任意作者 keyframes 及外部 Studio 协议仍属于路线图明确列出的后续范围。

## 状态证据与接入

`runtime/theme-motion.js` 默认状态为 `unknown`。内置适配只接收局部 composer/thread/activity 的显式 `aria-busy="true"`，以及可见、`aria-modal="true"`、`data-state="open"` 的 `role="alertdialog"`。这些是有条件的语义适配，不构成“所有 Codex 版本均提供这些属性”的声明。

目前没有经过官方客户端 DOM/事件验证的完成、失败、取消或逐子代理状态生产者。因此不会根据文案、输出停顿、停止按钮消失、归档列表位置或计时器宣布成功，也不会逐 token 再做打字动画。

受信的未来原生适配器可使用以下接口；主题包不能注入适配代码：

```js
const motion = window.__CODEX_DREAM_SKIN_MOTION_STATE__;
const identity = {
  schemaVersion: 1,
  taskId: "native-task-id",
  runId: "native-run-id",
  routeEpoch: motion.inspect().routeEpoch
};
motion.bindTask(identity);
motion.reportTaskState({ ...identity, revision: 1, state: "busy" });
motion.reportTaskState({ ...identity, revision: 2, state: "completed" });
```

支持 `unknown / idle / busy / needs-attention / completed / failed / cancelled`。身份与当前路由绑定，revision 必须递增。只在同一执行曾进入忙碌/待确认后给一次终态反馈；首次看到历史终态不庆祝，热重注入不重播，导航撤销绑定。`inspect().nativeTerminalAdapter` 为 `false`，避免把接口 fixture 当成已接入官方任务事件。

## 生命周期与开销

- 共享控制器、CSS、偏好工具和 payload 组合器经 `tools/sync-runtime-assets.mjs` 同步到三端；Windows Acrylic 不因此重新开启旧的全量分类器。
- 使用受限结构/属性观察，不订阅 `characterData`；复用现有部件标记。追踪节点、去重记录、一次反馈数量均有上限，不在输出文字变化时重扫全文。
- 新增装饰带 `data-dream-motion-owned`、`aria-hidden` 和 `pointer-events: none`。不为 main/thread/sticky 加整体 transform，不把内容显示依赖于动画结束。
- 全部旧装饰循环由统一策略接管。持续效果只使用小装饰上的 opacity/transform，不循环改变 filter、backdrop-filter 或大片阴影。
- 壁纸交接只复制已确认的固定 body 背景，单张图不超过 400 万像素，快照不超过 200 万像素，准备预算 250ms。预算内的新图会在替换 renderer 前预解码；明确解码失败会拒绝替换并保留旧皮肤。组合伪元素背景、超时、超过预算或无法确认图层时跳过淡化，沿用直接切换。旧图层处于内容下方并有清理超时；不修改原生堆叠顺序来强制淡化。
- 皮肤暂停/恢复、排除的 Pet 窗口与热重注入统一撤销观察器、监听器、rAF、计时器、反馈标记和临时图层；后来的注入或暂停会作废正在准备的交接。

## 验证范围

当前便携 Node 回归共 253 项：250 通过、3 项平台条件跳过；包含 12 项控制器、16 项偏好、14 项 payload 和 6 项 CSS 合同回归。

策略、状态与生命周期使用 Node fixtures；各平台完整 payload 在云端 Chromium 合成界面中检查布局、原生 spinner、输入与选择、滚动、减少动态效果、权限语义、重注入和流式输出预算。macOS Swift、Windows PowerShell 5.1/7 与安装包由对应平台 CI 验证。

浏览器 fixture 不等于官方 Codex 客户端实机验证，也不代表各平台 GPU 性能测量。没有操作用户本地客户端；缺少可靠来源的原生终态与子代理适配继续关闭。
