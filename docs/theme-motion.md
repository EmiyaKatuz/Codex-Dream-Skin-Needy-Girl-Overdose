# 统一动效系统

本功能为待发布的开发变更，不包含在已发布的 v1.5.20 安装包中。

此实现对应[动效路线图](theme-animation-roadmap-2026-10-03.md)的客户端范围：统一偏好与生命周期、微交互、任务/工具/子代理状态、独立角色姿态与背景过渡。动效来自受信的共享运行时；主题 ZIP 的三文件合同和 Safe CSS 白名单保持不变。

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

| 编号 | 实现与边界 |
| --- | --- |
| 01–03 | 输入框内侧聚焦边缘、按钮压入边框、留有空间的静态图标 1px 回弹，以及侧栏/终端/设置的选中边缘过渡 |
| 04–05 | 新菜单、首页卡和原生项目行的短边缘反馈；首批最多四项、错峰间隔 25ms，项目按稳定 ID 去重 |
| 06 | 新模态确认提示的一次注意反馈；原生权限请求按 ID 集合跟踪，全部解决后才恢复执行状态 |
| 07–09 | 执行、输出、完成、失败、取消驱动局部信号和一次角色反馈；输出不逐 token 重启动画 |
| 10–11 | 展开箭头、新编辑卡和有稳定 item ID 的工具状态/结果边缘反馈；代码与 diff 保持稳定 |
| 12 | 有明确身份的子代理行使用静态状态边缘与一次终态反馈，不恢复逐行持续发光；没有稳定身份的原生面板保持静态 |
| 13 | 符合尺寸和图层条件的固定背景解码后短淡化；无法确认时直接切换，明确解码失败保留旧主题 |
| 14–15 | 已知内置主题的独立像素矢量角色展示专注、惊讶、平静和完成爱心；首页三个星点共用一个低频通道，视差最多水平 3px、垂直 2px |
| 16–17 | 设置微交互、三端四档/五开关；菜单栏和托盘只反馈主题工具自身的真实 busy 状态 |

角色是独立装饰，不修改壁纸人物表情。壁纸差分素材、多图主题包、视频壁纸、任意作者 keyframes 及外部 Studio 协议仍属于原路线图的后续范围。

现代首页的主题命令卡参与正常布局，避免旧固定偏移压住标题和原生横幅；短窗口使用紧凑卡片，清除与标题留白配套的旧负间距。没有预留空间的旧壁纸坐标装饰在该首页停用。窄窗口的辅助面板放到对话下方，避免左右侧栏同时挤压输入框；各区域保留原生滚动。任务正文、审批卡和子代理摘要使用统一的深紫表面，提高亮色壁纸上的文字对比度。

## 状态证据与接入

默认状态为 `unknown`。DOM 回退只接受局部 composer/thread/activity 的显式 `aria-busy="true"`，以及可见、`aria-modal="true"`、`data-state="open"` 的 `role="alertdialog"`。不根据文案、停顿、停止按钮消失或归档位置推断结果。

原生桥接依据社区 Linux 包中上游 **26.930.41038** 与 **26.1002.52244** 的只读 preload/前端源码：

- 在有 `electronBridge.sendMessageFromView` 的 `app:` 或本机 `localhost/127.0.0.1:5175` 页面监听消息，不发送宿主命令、不读取聊天文本。拒绝其他窗口、来源、host、路由和旧 turn。
- `turn/started`、`item/agentMessage/delta`、`turn/completed` 提供执行、输出及终态；`interrupted` 对应取消。路由为 `/local/<threadId>`，查询参数 `hostId` 缺省为 `local`；启动用的 `initialRoute` 也按相同规则校验。
- `mcp-request` 的权限与输入请求按 request ID 跟踪，`serverRequest/resolved` 仅解决对应请求。并行输出不会清除待确认状态。
- `collabAgentToolCall.agentsStates` 与已知子线程 turn 事件提供子代理状态。原生侧栏行的 `data-app-action-sidebar-thread-id` 使用 `local:<threadId>`，还必须匹配 `data-app-action-sidebar-thread-host-id`。其他行须有明确 agent ID 或真实线程链接；输入框内只有点击闭包、没有稳定 DOM 身份的面板保持静态。状态跟踪限于当前父任务执行期间，父任务结束后停止接收子线程更新。
- 工具条目使用 `data-local-conversation-item-target-ids`；合并条目在所有已知工具结束前保持执行状态，不把首个工具完成误报为整组完成。无 `status` 字段的 `webSearch` 依据上游协议的 `item/completed` 结算。项目行使用 `data-app-action-sidebar-project-row` 与 `data-app-action-sidebar-project-id`。不用显示名称或列表顺序绑定身份。

受信的其他适配器可使用下列接口；主题包不能注入适配代码：

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

支持 `unknown / idle / busy / streaming / needs-attention / completed / failed / cancelled`。身份与当前路由绑定，revision 必须递增。同一执行曾进入活跃状态后才给一次终态反馈；历史终态不庆祝，热重注入不重播，导航撤销绑定。`reportAgentState` 额外要求 `agentId`。`inspect().nativeTerminalAdapter` 表示页面符合桥接条件，不表示真实后端任务已经验证。

## 生命周期与开销

- 共享控制器、CSS、偏好工具和 payload 组合器经 `tools/sync-runtime-assets.mjs` 同步到三端；Windows Acrylic 不因此重新开启旧的全量分类器。
- 使用受限结构/属性观察，不订阅 `characterData`；复用现有部件标记。追踪节点、去重记录、一次反馈数量均有上限，不在输出文字变化时重扫全文。
- 滚动时立即隐藏装饰，停止 120ms 后只定位一次；打开模态窗口或没有空位时保持隐藏。候选空位检查原生控件、文本、图片、代码、滚动区和旧 HUD，并排除整个对话时间线和辅助面板，避免遮住随后出现的长代码。星点避让包含完整高度和视差余量。输入法组合期间原生通知只更新状态数据、不测量布局。
- 新增装饰带 `data-dream-motion-owned`、`aria-hidden` 和 `pointer-events: none`。不为 main/thread/sticky 加整体 transform，不把内容显示依赖于动画结束。
- 全部旧装饰循环由统一策略接管。持续效果只使用小装饰上的 opacity/transform，不循环改变 filter、backdrop-filter 或大片阴影。
- 壁纸交接只复制已确认的固定 body 背景，单张图不超过 400 万像素，快照不超过 200 万像素，准备预算 250ms。预算内的新图会在替换 renderer 前预解码；明确解码失败会拒绝替换并保留旧皮肤。组合伪元素背景、超时、超过预算或无法确认图层时跳过淡化，沿用直接切换。旧图层处于内容下方并有清理超时；不修改原生堆叠顺序来强制淡化。
- 皮肤暂停/恢复、排除的 Pet 窗口与热重注入统一撤销观察器、监听器、rAF、计时器、反馈标记和临时图层；后来的注入或暂停会作废正在准备的交接。

## 验证范围

策略、状态与生命周期使用 Node 回归；共享资产同步、三端完整 payload 与平台 CI 分别验证。免登录视觉检查使用社区包中未修改的原版前端和隔离测试宿主，在云端 Chromium 渲染真实组件。宿主只提供受控数据，不使用账户、令牌或真实在线后端；不会把此结果称为已登录官方客户端验证，也不代表各平台 GPU 性能测量。

当前环境重建后的完整回归与逐屏截图验收正在进行，结果完成后记录于本节。历史环境截图不作为本次通过证据。此功能仍未发布到 v1.5.20 安装包。
