# 统一动效系统

统一动效系统从 v1.6.0 起包含在 Windows / macOS 安装包及三端源码运行时中。

此实现对应[动效路线图](theme-animation-roadmap-2026-10-03.md)的客户端范围：统一偏好与生命周期、微交互、任务/工具/子代理状态、独立角色姿态与背景过渡。v1.8.0 进一步加入内置壁纸人物眨眼，并修复完整模式下旧装饰被无条件冻结的问题。动效来自受信的共享运行时；主题 ZIP 的三文件合同和 Safe CSS 白名单保持不变。

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
| 完整 | 首页播放角色、星点、内置壁纸人物及符合布局条件的旧装饰；任务页保留局部状态反馈 |

系统的减少动态效果设置优先于完整模式。页面隐藏、装饰锚点离屏、导航切换及输入法组合期间暂停；窄窗口取消背景氛围。窗口边缘被侧栏或差异面板占用时，装饰会继续检查有限的内部候选位置，并避开正文、控件与其他装饰；没有完整空位时保持隐藏。关闭主题动效不会禁用 Codex 自己的加载图标。Linux 旧 `performanceMode` 继续控制原有布局/渲染降级，新增动效统一由上述偏好控制；默认跟随系统不再自动启动旧的所有装饰循环。

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

独立像素角色继续显示任务状态。v1.8.0 将 v1.3.4 的半闭眼、闭眼像素帧并入共享眨眼层，保留「睁眼 → 半闭 → 闭眼 → 半闭 → 睁眼」序列；间隔从 11.4 秒缩短 50% 至 5.7 秒，半闭和闭眼各阶段持续时间保持原速。不改写壁纸文件；只在首页、完整模式和角色开关开启时播放，并按窗口尺寸同步位置。自定义背景不套用该人物图层。旧版独立播放器继续停用，避免重复绘制；像素素材已由新控制器接管。

旧版固定坐标装饰按当前布局重新适配。光环限制在已预留的角色区域内；唱片、均衡器、心电、信号波形和「+1」反应复用 68 × 104px 星点区域，其完整动画范围包含在原有避让包围盒中。光环跟随角色开关，其余效果跟随背景氛围开关；全部只在完整模式首页运行。窗口变窄、内容遮挡、滚动、输入法输入、页面隐藏或减少动态效果时沿用统一退让与暂停规则。持续效果仅改变小装饰的旋转、位移、缩放和透明度；不恢复旧的布局、滤镜或逐子代理持续发光循环。

Windows 托盘中的「角色反应」和 macOS 菜单栏中的「角色动态」控制这两类角色效果；Linux 可使用 `motion-settings-linux.sh --set-effect character off` 关闭。系统减少动态效果、关闭／轻量模式、页面隐藏与输入法组合时，壁纸人物动画停止。

旧跑马灯、轨道、reaction 与音乐装饰只在完整模式、背景氛围开启、首页和适合的布局条件下恢复播放；现代首页未预留位置的旧装饰仍保持隐藏。逐子代理的高开销持续发光继续关闭。壁纸差分素材、多图主题包、视频壁纸、任意作者 keyframes 及外部 Studio 协议仍属于原路线图的后续范围。

现代首页的主题命令卡参与正常布局，避免旧固定偏移压住标题和原生横幅；短窗口使用紧凑卡片，清除与标题留白配套的旧负间距。没有预留空间的旧壁纸坐标装饰在该首页停用。内容宽度不足 360px 时，原生横幅改为图标和文字纵排。窄窗口的辅助面板放到对话下方，避免左右侧栏同时挤压输入框；各区域保留原生滚动。新版顶栏保留原生固定定位，避免重复计算侧栏宽度造成按钮互相遮挡。

任务正文、输入区外围渐变和工具页面随浅色／深色模式调整底色；浅色编辑结果卡与正文保持深色文字。输入框、设置、审批卡和子代理摘要保留深紫表面与浅色文字，输入文字和占位符分别匹配这些表面。

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
- 全部旧装饰循环由统一策略接管，完整模式只在符合场景与开关条件时播放。新增持续效果只使用小装饰上的 opacity/transform，不循环改变 filter、backdrop-filter 或大片阴影。
- 壁纸交接只复制已确认的固定 body 背景，单张图不超过 400 万像素，快照不超过 200 万像素，准备预算 250ms。预算内的新图会在替换 renderer 前预解码；明确解码失败会拒绝替换并保留旧皮肤。组合伪元素背景、超时、超过预算或无法确认图层时跳过淡化，沿用直接切换。旧图层处于内容下方并有清理超时；不修改原生堆叠顺序来强制淡化。
- 皮肤暂停/恢复、排除的 Pet 窗口与热重注入统一撤销观察器、监听器、rAF、计时器、反馈标记和临时图层；后来的注入或暂停会作废正在准备的交接。

## 当前验证方式

策略、状态与生命周期使用 Node 回归；共享资产同步、三端完整 payload 与平台 CI 分别验证。v1.8.0 新增实际加载完整 Windows 系统／Acrylic payload 的浏览器播放回归，检查 `document.getAnimations()` 时间推进与渲染样式变化，并覆盖开关、减少动态效果、暂停和恢复。浏览器回归与 Windows 平台 CI 不等同于已登录官方 Electron 客户端、原生文件选择器或平台 GPU 的实机验收。

## v1.6.0 历史验证记录

以下记录对应 v1.6.0 的原版前端视觉验收，不是 v1.8.0 的新增验收结果。免登录视觉检查使用社区包中未修改的原版前端和隔离测试宿主，在云端 Chromium 渲染真实组件。宿主只提供受控数据，不使用账户、令牌或真实在线后端；不会把此结果称为已登录官方客户端验证，也不代表各平台 GPU 性能测量。

本轮云端验收使用 `appotry/codex-desktop-linux` 社区包 `20261008.328` 中的上游 `26.1002.52244` 前端；提取的 19,978 个原版文件通过完整性核验。验收未修改原版资源，也未登录账户。

| 检查 | 结果与范围 |
| --- | --- |
| Node 回归 | 285 项，282 通过、0 失败，3 项因 macOS 平台条件跳过；包含 40 项控制器、10 项动效 CSS 和 14 项 payload 用例 |
| 共享与平台入口 | 共享资产同步、选择器 provenance、macOS／Windows／Linux 完整 payload 检查通过；原生构建和平台测试由 PR CI 检查 |
| 主要页面 | 30 个截图场景：原版对照、首页、模型／权限菜单、任务与工具展开、审批、差异、个人菜单及六类设置页的宽／窄布局 |
| 动效与交互 | 10 个动效状态场景、6 个项目／子代理交互场景；检查减少动态效果、输入法组合暂停、恢复、完成及重注入 |
| 浅色与顶栏 | 9 个浅色场景、6 个顶栏／差异场景；通过原生 Appearance 切换浅色，实际点击聊天菜单、摘要及侧栏开关 |
| 边界与辅助页面 | 8 个短窗口／480px 场景、8 个定时任务／插件／Explore／只读终端场景；检查展开侧栏后的横幅，以及重新打开的最小窗口差异面板 |

最终接受 77 个截图场景（包含原版对照，不重复计算被后续修复替换的旧截图）。主页面、动效、交互与最终浅色任务使用 payload `ae900bc04c3077ca11cf`；其余定向回归覆盖此前已稳定且后续未受影响的规则。检查中未发现主题引入的控件遮挡或裁切，关键控件同时检查可见范围和实际命中。小窗口中超出视口的内容保留正常滚动，不以裁切整个内容区的方式隐藏问题。

此结论限于已检查的原版前端组件和受控宿主数据。Explore 的 GitHub 授权页保持离线检查状态；终端仅显示明确标注的固定测试文本，不启动 shell 或执行命令。外网和 WebSocket 被阻断，因此控制台保留预期的资源加载错误；已接受场景没有页面异常或交互失败。未验证 Electron 原生窗口、登录后在线后端、原生文件选择器或平台 GPU 性能。原版提取资源、宿主数据及截图只保存在本地验收目录，不随代码提交。上述实现随 v1.6.0 发布。
