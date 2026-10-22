# 内置主题

[English](README.en.md) · [macOS 说明](../README.md)

当前内置预设为「超天酱 · INTERNET ANGEL」，首次安装默认启用。安装器把该预设复制到 `~/Library/Application Support/CodexDreamSkinStudio/themes/`，可从菜单栏「已保存的主题」选择。

## 当前预设

```text
preset-internet-angel-default/
├── theme.json
└── dream-reference.jpg
```

背景为 `2560 × 1440` JPEG。主题文件与 Windows 默认主题保持字节一致。升级保留个人主题和偏好，并将识别出的未修改旧预设归档到 `retired-themes/`。素材条款见 [NOTICE.md](../NOTICE.md)。

切回内置主题：

```bash
~/.codex/codex-dream-skin-studio/scripts/switch-theme-macos.sh \
  --id preset-internet-angel-default
```

## 制作主题

新主题使用非空 `theme.json`、非空 `theme.css` 和 JSON 引用的一张背景图。ZIP 与 Studio manifest 格式见 [主题管理](https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/blob/main/docs/theme-management.md)。当前内置预设沿用已有的双文件格式。

主题 ID 使用小写英文和连字符；拟纳入内置预设的目录与 ID 使用相同的 `preset-<slug>`。当前安装与打包脚本显式列出内置主题，新增预设时需要同步更新这些入口和测试。

- 图片使用 PNG、JPEG 或 WebP，最大 10 MiB、单边 16384 像素、总计 5000 万像素。
- 推荐 `2560 × 1440`，主体放右侧约 58%–88%，左侧约 50%–58% 保持低对比留白。
- `appearance` 为 `auto`、`light` 或 `dark`。`auto` 跟随 Codex 外观，需分别检查浅色和深色界面；单一模式的图片声明对应模式。
- 使用原创、已授权或允许再分发的图片，并附来源和许可。第三方素材按 [NOTICE.md](../NOTICE.md) 记录与审核。

构图模板见 [背景提示词指南](../../docs/reference-background-prompt-guide.md)。

## theme.json 字段

| 字段 | 用途 |
| --- | --- |
| `schemaVersion` / `id` / `image` | 版本、主题身份和本目录中的背景文件名 |
| `name` / `tagline` / `quote` | 首页主题名、副标语和口号 |
| `brandSubtitle` / `statusText` | 品牌角标和状态文字 |
| `projectPrefix` / `projectLabel` | 项目入口文字 |
| `promoTitle` / `promoSub` / `promoUrl` | 可选宣传信息 |
| `appearance` | 外观模式 |
| `art.focusX` / `art.focusY` | `0..1`，背景主体位置 |
| `art.safeArea` | `auto`、`left`、`right`、`center`、`none` |
| `art.taskMode` | `auto`、`ambient`、`banner`、`full`、`off` |

显式 `art` 字段优先于图片自动分析。`colors` 支持以下颜色键：

| 键 | 用途 |
| --- | --- |
| `background` | 背景底色 |
| `panel` / `panelAlt` | 侧栏、卡片、输入框和工具面板 |
| `accent` / `accentAlt` | 图标、聚焦边框和主题标题 |
| `secondary` / `highlight` | 次强调色与高亮 |
| `text` / `muted` | 正文与次要文字 |
| `line` | 分隔线 |

`theme.css` 使用 Safe CSS 公开部件。例如，调整首页标题和副标语：

```css
[data-ds-part="home-hero"] {
  font-size: 18px;
  color: #f5e7d0;
}
```

字号允许 `12–20px`；副标语继承字号和颜色，并保留 76% 不透明度。

## 验证

在 macOS 引擎目录（源码中为 `macos/`）运行：

```bash
node scripts/injector.mjs --check-payload \
  --theme-dir presets/preset-internet-angel-default
./tests/run-tests.sh
```

检查自制主题时将 `--theme-dir` 换为对应目录。提交时附首页、输入框建议、任务页和侧面板截图；`auto` 主题同时提供浅色与深色结果。
