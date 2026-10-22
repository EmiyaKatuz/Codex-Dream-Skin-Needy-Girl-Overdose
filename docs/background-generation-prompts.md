# 背景创作提示词 · Background prompts

[中文](#中文) · [English](#english)

## 中文

为超天酱主题或自定义主题制作背景。完整的构图、参考图和 ZIP 导出步骤见[制作指南](./reference-background-prompt-guide.md)。

### 基础提示词

复制基础提示词，再追加下方一种场景。生成器尺寸同步设为 `2560 × 1440`。

```text
制作一张 2560×1440、16:9、不透明的桌面背景。
左侧 x=0%–52% 为低细节、低对比的连续环境，主视觉集中在右侧。
关键内容位于 x=62%–88%、y=16%–72%，距画布边缘至少 8%。
全画面使用统一光线和透视，保留适合明暗界面的中间调与细微纹理。
仅输出背景画面，不含界面控件、文字、标志或水印。
```

### 粉紫像素舞台

适合延续当前主题的粉紫色板与像素风格。

```text
像素插画，珍珠白、樱粉、浅紫和青蓝色板。
右侧是一座小型虚拟舞台，使用像素星光、丝带和柔和灯带；
左侧延续浅紫夜空与稀疏星点，明暗层次柔和。
像素边缘清晰，装饰集中在舞台附近。
```

### 柔光人物

适合照片或原创人物插画。使用人物参考时，在提示词中说明对应图片编号和外观用途。

```text
一位原创成年角色位于右侧，穿着浅紫与奶油白服装，姿态自然放松。
背景为薄纱、磨砂玻璃和少量花瓣组成的室内空间，左侧延续同一环境。
窗边柔光从左上方照入，色板为奶油白、淡粉、浅紫和少量深蓝。
脸部与双手完整落在安全区内，保留自然比例和材质细节。
```

### 蓝紫夜景

适合以景观为主体的深色主题。

```text
数字插画，蓝紫夜空下的安静城市天台。
右侧放置玻璃温室、少量植物和青蓝灯光，远处城市灯火形成低密度散景。
左侧是连续的天空与柔和云层，暗部保留细微纹理。
色板为深蓝、灰紫、青蓝和暖白，最高亮度集中在右侧温室附近。
```

### 生成与使用

1. 按 16:9、16:10、4:3 和超宽窗口预览，检查人物与主要道具的裁切。
2. 在明暗界面下检查内容区可读性。
3. 将最大 **10 MiB** 的 JPEG、PNG 或静态 WebP 导入 Studio，调整配色并导出完整主题 ZIP。

内置主题背景位于 `macos/presets/preset-internet-angel-default/dream-reference.jpg`；Windows 对应文件为 `windows/assets/dream-reference.jpg`。素材说明见 `macos/NOTICE.md`。

## English

Create backgrounds for the INTERNET ANGEL theme or a custom theme. See the [creation guide](./reference-background-prompt-guide.en.md) for composition, references, and ZIP export steps.

### Base prompt

Copy the base prompt, then append one scene below. Set the generator's image size to `2560 × 1440` as well.

```text
Create one 2560×1440, 16:9, opaque desktop wallpaper.
Keep x=0%–52% as continuous low-detail, low-contrast scenery, with the main subject on the right.
Keep critical details within x=62%–88%, y=16%–72%, at least 8% from the canvas edges.
Use coherent lighting and perspective across the scene, with midtones and subtle texture
that work beneath light and dark interfaces.
Output wallpaper artwork only, without interface controls, text, logos, or watermarks.
```

### Pink and violet pixel stage

Continues the current theme's pink and violet palette and pixel style.

```text
Pixel illustration in pearl white, sakura pink, pale violet, and cyan.
Place a small virtual stage on the right, with pixel stars, ribbons, and soft light strips.
Continue a pale-violet night sky with sparse stars through the left side, using gentle tonal layers.
Keep crisp pixel edges and concentrate decoration around the stage.
```

### Soft-lit portrait

Suitable for photography or original character illustrations. When using a portrait reference, state its image number and appearance role in the prompt.

```text
Place one original adult character on the right, wearing pale-violet and cream clothing in a relaxed pose.
Create an indoor setting with sheer fabric, frosted glass, and a few petals, continuing the same environment on the left.
Soft window light enters from the upper left. Use cream, pale pink, violet, and restrained deep-blue accents.
Keep the complete face and both hands inside the safe area, with natural proportions and material detail.
```

### Blue and violet nightscape

Suitable for dark themes centered on scenery.

```text
Digital illustration of a quiet city rooftop under a blue-violet night sky.
Place a glass greenhouse, a few plants, and cyan lighting on the right, with sparse distant city bokeh.
Continue the sky and soft clouds through the left side, retaining subtle shadow texture.
Use deep blue, gray-violet, cyan, and warm white, concentrating the brightest light around the greenhouse.
```

### Generate and use

1. Preview at 16:9, 16:10, 4:3, and ultrawide ratios to check cropping of people and essential props.
2. Check content readability beneath light and dark interfaces.
3. Import a JPEG, PNG, or static WebP up to **10 MiB** into Studio, adjust colors, and export a complete theme ZIP.

The bundled background is `macos/presets/preset-internet-angel-default/dream-reference.jpg`; the Windows counterpart is `windows/assets/dream-reference.jpg`. See `macos/NOTICE.md` for asset notes.
