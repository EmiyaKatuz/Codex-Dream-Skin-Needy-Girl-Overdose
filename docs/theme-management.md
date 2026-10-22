# 主题管理

[中文](./theme-management.md) · [English](./theme-management.en.md)

## 使用入口

| 平台 | 入口 |
| --- | --- |
| macOS | 菜单栏 → **主题** |
| Windows | 托盘负责切换、导入和保存；桌面或开始菜单打开 **Codex Dream Skin**，也可双击托盘图标，调整透明度和删除已保存主题 |

Linux 使用脚本与当前主题配置，命令见 [Linux 说明](../linux/README.md)。

## 更换、保存与导入

- **更换背景**：从菜单选择本地图片，再保存当前主题以便复用。建议使用 `2560 × 1440` 的 16:9 背景，制作方法见[背景图指南](./reference-background-prompt-guide.md)。
- **保存与切换**：保存当前主题后，从「已保存主题」选择使用。
- **导入 ZIP**：选择「导入主题 ZIP…」，导入完成后再从「已保存主题」中选择应用。

## 背景透明度

透明度为 0–100%：0% 不透明，100% 完全透明；作用于主题背景，文字和图标保持清晰。设置按主题保存，优先级为个人设置 → 作者指定的 alpha → 默认 30%。选择「跟随主题」清除当前主题的个人设置。

## 删除与恢复

先切换到其他主题，再删除已保存主题。确认后，主题目录会移入系统废纸篓或回收站；恢复目录并重新打开菜单或管理窗口即可重新使用。原始 ZIP、恢复备份和透明度偏好会保留。

## 主题 ZIP 格式

macOS 和 Windows 接受普通 `.zip` 文件，结构如下：

```text
my-theme/
├── manifest.json       # Studio 导出包
├── theme.json          # 非空主题配置
├── theme.css           # 非空 Safe CSS
└── background.jpg      # 唯一背景图，也可使用 .png 或 .webp
```

文件可直接位于 ZIP 根目录，或放在唯一一层主题目录中。本机简化包包含 `theme.json`、`theme.css` 与引用的背景图这三个文件；Studio 包另含 `manifest.json`，可附带 `LICENSE.txt` 和预留的 `manifest.sig`。当前客户端校验清单、内容和 SHA-256，`manifest.sig` 尚未用于签名验证。

| 项目 | 限制 |
| --- | --- |
| ZIP | 最大 32 MiB，最多 32 个条目，解压总量最大 64 MiB |
| 背景图 | 最大 10 MiB，单边最大 16384px，总像素最大 50MP |
| `theme.css` | 最大 256 KiB，通过共享 Safe CSS 校验，作用于登记的主题部件 |
| Studio 清单 | 平台、最低客户端版本、文件集合、大小与 SHA-256 均需匹配 |

导入器会在写入前检查路径、链接、嵌套归档和文件内容；Safe CSS 在导入和应用时复验。

## 配置示例

本机简化包的 `theme.json` 示例：

```json
{
  "schemaVersion": 1,
  "id": "my-theme",
  "name": "My theme",
  "image": "background.jpg",
  "appearance": "auto",
  "art": {
    "focusX": 0.72,
    "focusY": 0.45,
    "safeArea": "auto",
    "taskMode": "auto"
  }
}
```

| 字段 | 取值与含义 |
| --- | --- |
| `appearance` | `auto` 跟随外观，也可指定 `light` 或 `dark` |
| `art.focusX` / `art.focusY` | `0..1` 的图像焦点坐标，左上角为 `0,0` |
| `art.safeArea` | `auto`、`left`、`right`、`center`、`none`；首页内容安全区 |
| `art.taskMode` | `auto`、`ambient`、`banner`、`full`、`off`；任务页背景表现 |

`theme.css` 示例：

```css
[data-ds-part="home-hero"] {
  color: #c4b5fd;
}
```

完整可用部件、变量和属性见 [Safe CSS 策略](../runtime/safe-css-policy.json)。正式分发包可通过 [Studio](https://dreamskin.cc/studio) 导出。

## 手动放置主题

对可信且已解压的主题，可通过「打开主题文件夹」放入直接包含 `theme.json`、`theme.css` 和背景图的完整目录。该方式仅执行主题应用校验，归档校验由 ZIP 导入入口提供。

| 平台 | 已保存主题目录 |
| --- | --- |
| macOS | `~/Library/Application Support/CodexDreamSkinStudio/themes/` |
| Windows | `%LOCALAPPDATA%\CodexDreamSkin\themes\` |
