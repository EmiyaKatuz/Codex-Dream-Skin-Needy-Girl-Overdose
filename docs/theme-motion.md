# 动效设置

[中文](./theme-motion.md) · [English](./theme-motion.en.md)

Windows、macOS 和 Linux 共享动效设置，保存后自动生效。

## 设置入口

- macOS：菜单栏 → **主题 → 动态效果**。
- Windows：托盘 → **动态效果**。
- Linux：运行安装目录中的 `scripts/motion-settings-linux.sh`。

## 模式

| 模式 | 配置值 | 效果 |
| --- | --- | --- |
| 跟随系统 | `system` | 默认轻量，系统要求减少动态效果时关闭 |
| 关闭 | `off` | 关闭主题动效 |
| 轻量 | `subtle` | 短交互和单次状态反馈 |
| 完整 | `full` | 首页角色、星点、壁纸人物及适合当前布局的装饰；任务页保留局部反馈 |

系统减少动态效果设置优先于所有模式。装饰会在滚动、输入法组合、页面隐藏或空间不足时暂停或隐藏。

## 效果开关

| 效果 | 配置字段 | 内容 |
| --- | --- | --- |
| 交互反馈 | `interactions` | 按钮、菜单、输入框和项目行反馈 |
| 任务状态 | `status` | 任务、工具和已识别子代理的状态反馈 |
| 角色动态 | `character` | 像素角色和内置壁纸人物眨眼 |
| 背景氛围 | `ambient` | 星点、视差和首页装饰 |
| 主题切换 | `themeTransition` | 符合条件的背景淡化过渡 |

使用内置超天酱主题时，选择「完整」并开启角色动态，即可在首页显示人物眨眼。自定义背景使用各自的图片。任务反馈依据已识别的原生状态事件显示。

## Linux 命令

```bash
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --set-mode full
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --set-effect character on
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --set-effect ambient off
~/.codex/codex-dream-skin-linux/scripts/motion-settings-linux.sh --get
```

Linux 的 `performanceMode` 控制布局和渲染质量，动效由本页设置控制。

## 配置文件

| 平台 | 路径 |
| --- | --- |
| macOS | `~/Library/Application Support/CodexDreamSkinStudio/motion.json` |
| Windows | `%LOCALAPPDATA%\CodexDreamSkin\motion.json` |
| Linux | `${XDG_STATE_HOME:-~/.local/state}/CodexDreamSkin/motion.json` |

默认配置如下，模式和五个开关均为必填字段：

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

优先使用菜单或命令保存设置。配置文件最大 16 KiB；读取失败时显示配置错误并关闭主题动效。文件缺失时使用默认值。

开发检查见[平台与开发](./platforms.md)，主题操作见[主题管理](./theme-management.md)。
