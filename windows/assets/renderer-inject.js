((cssText, artDataUrl, rawConfig, sidebarScrollQuietEnabled) => {
  const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";
  const rendererLocation = typeof location === "undefined" ? window.location : location;
  const routeSearch = typeof URLSearchParams === "function"
    ? new URLSearchParams(String(rendererLocation?.search || ""))
    : null;
  const initialRoute = routeSearch?.get("initialRoute") || "";
  if (rendererLocation?.protocol === "app:" && (
    String(rendererLocation.pathname || "").endsWith("/avatar-overlay-composition-surface.html") ||
    initialRoute === "/avatar-overlay" || initialRoute.startsWith("/avatar-overlay/")
  )) {
    window[STATE_KEY]?.cleanup?.();
    window.__CODEX_DREAM_SKIN_DISABLED__ = true;
    return;
  }
  const STYLE_ID = "codex-dream-skin-style";
  const DIFFS_THEME_STYLE_ID = "codex-dream-skin-diffs-theme";
  const PART_ATTR = "data-ds-part";
  const composerBorderRestores = new Map();
  const composerBorderBridges = [
    "border-color", "border-top-color", "border-right-color", "border-bottom-color",
    "border-left-color", "border-width", "border-top-width", "border-right-width",
    "border-bottom-width", "border-left-width", "border-style", "border-top-style",
    "border-right-style", "border-bottom-style", "border-left-style",
  ].map((property) => ({ property, variable: `--ds-community-composer-${property}` }))
    .filter(({ variable }) => cssText.includes(`${variable}:`));
  const FLOATING_SIDEBAR_SELECTOR = '[data-testid="app-shell-floating-left-panel"]';
  const INTERNET_ANGEL_THEME_IDS = new Set([
    "preset-internet-angel",
    "preset-internet-angel-default",
  ]);
  const isInternetAngelTheme = INTERNET_ANGEL_THEME_IDS.has(String(rawConfig?.id || "").trim());
  const STYLE_REVISION = "11";
  const SKIN_VERSION = __DREAM_SKIN_VERSION_JSON__;
  const PAYLOAD_REVISION = __DREAM_SKIN_PAYLOAD_REVISION_JSON__;
  const SHELL_MAIN_SELECTOR = 'main:is(.main-surface, [data-app-shell-main-surface], [class*="_MainContentSurface_"])';
  const HEADER_TINT_SELECTOR = 'header:is(.app-header-tint, [data-app-shell-header-edge-scroll], [data-app-shell-application-menu-bar], [class*="_Header_"])';
  const SIDEBAR_SELECTOR = 'aside.app-shell-left-panel, [data-testid="app-shell-floating-left-panel"]';
  const SIDEBAR_SCROLL_SELECTOR = ':is(aside.app-shell-left-panel, [data-testid="app-shell-floating-left-panel"]) [data-app-action-sidebar-scroll]';
  const SIDEBAR_SCROLL_QUIET_CLASS = "dream-sidebar-scroll-quiet";
  const SETTINGS_CONTENT_SELECTOR = '[class~="scrollbar-stable"][class~="flex-1"][class~="overflow-y-auto"][class~="p-panel"]';
  const MESSAGE_SELECTOR = ':is([data-message-author-role], [data-local-conversation-user-anchor], [data-local-conversation-final-assistant])';
  const COMPOSER_SELECTOR = ':is(.composer-surface-chrome, [class*="_ComposerLayoutRoot_"], [data-composer-surface-variant][data-composer-radius-variant])';
  const COMPOSER_TOOLBAR_SELECTOR = ':is(.composer-surface-chrome [class*="_footer_"], [class*="_ComposerLayoutRoot_"] [class*="_ComposerLayoutFooter_"], [class*="_ComposerLayoutRoot_"] [data-composer-footer-responsive], [data-composer-surface-variant][data-composer-radius-variant] [data-composer-footer-responsive])';
  const CHROME_ID = "codex-dream-skin-chrome";
  const FALLBACK_PRESETS_ID = "codex-dream-skin-presets";
  const HOME_SUGGESTIONS_SELECTOR = [
    ".group\\/home-suggestions",
    '[data-feature="home-suggestions"]',
    '[data-testid*="home-suggestion" i]',
  ].join(", ");
  const STABLE_HOME_SUGGESTIONS_SELECTOR = [
    ".group\\/home-suggestions",
    '[data-feature="home-suggestions"]',
    '[data-testid="home-suggestions"]',
  ].join(", ");
  const NATIVE_SUGGESTIONS_ROOT_CLASS = "dream-native-suggestions-root";
  const SIDEBAR_CHROME_ID = "codex-dream-sidebar-ornaments";
  const SIDE_WORKSPACE_BRAND_ID = "codex-dream-side-workspace-brand";
  const NEW_TASK_CLASS = "dream-new-task-button";
  const SIDEBAR_ACTIVE_ITEM_CLASS = "dream-sidebar-listitem-active";
  const ROOT_CLASSES = [
    "codex-dream-skin",
    "dream-theme-light",
    "dream-theme-dark",
    "dream-art-wide",
    "dream-art-standard",
    "dream-focus-left",
    "dream-focus-center",
    "dream-focus-right",
    "dream-safe-left",
    "dream-safe-center",
    "dream-safe-right",
    "dream-safe-none",
    "dream-task-ambient",
    "dream-task-banner",
    "dream-task-full",
    "dream-task-off",
    "dream-choten-art",
    "dream-reduced-motion",
    "dream-settings-active",
    "dream-presets-ready",
    "dream-system-toast-active",
  ];
  const ROUTE_CLASSES = [
    "dream-route-home",
    "dream-route-task",
    "dream-route-sites",
    "dream-route-pulls",
    "dream-route-scheduled",
    "dream-route-plugins",
    "dream-route-settings",
    "dream-route-utility",
  ];
  const PRESET_CLASSES = [
    "dream-codex-preset",
    "dream-preset-explore",
    "dream-preset-build",
    "dream-preset-review",
    "dream-preset-fix",
  ];
  const ROOT_PROPERTIES = [
    "--dream-art",
    "--dream-art-position",
    "--dream-focus-x",
    "--dream-focus-y",
    "--dream-accent",
    "--dream-accent-ink",
    "--ds-on-accent",
    "--dream-image-luma",
  ];
  const HOME_UTILITY_CLASS = "dream-home-utility";
  const SYSTEM_TOAST_CLASS = "dream-system-toast";
  const CHANGES_SHELL_CLASS = "dream-changes-shell";
  const CHANGES_CLIP_HOST_CLASS = "dream-changes-clip-host";
  const PANEL_CLASSES = [
    "dream-terminal-panel",
    "dream-side-workspace",
    "dream-side-chat-panel",
    "dream-summary-panel",
  ];
  const HOME_PANEL_STATE_CLASSES = [
    "dream-home-side-open",
    "dream-home-bottom-open",
    "dream-home-dual-panel",
  ];
  const EDITED_CARD_CLASSES = [
    "dream-edited-card",
    "dream-edited-card-header",
    "dream-edited-card-icon",
    "dream-edited-card-title",
    "dream-edited-card-stats",
    "dream-edited-card-actions",
    "dream-edited-card-undo",
    "dream-edited-card-review",
  ];
  const INTERACTION_CLASSES = [
    "dream-selection-actions",
    "dream-selection-action",
    "dream-selected-fragment",
    "dream-optional-comment",
    "dream-optional-comment-input",
    ...EDITED_CARD_CLASSES,
  ];
  const TURN_NAV_CLASSES = [
    "dream-turn-nav-rail",
    "dream-turn-nav-row",
    "dream-turn-nav-marker",
    "dream-turn-nav-marker-active",
    "dream-turn-preview-tooltip",
    "dream-turn-preview-surface",
    "dream-turn-preview-title",
    "dream-turn-preview-excerpt",
  ];
  const SETTINGS_CLASSES = [
    "dream-settings-sidebar",
    "dream-settings-nav",
    "dream-settings-search",
    "dream-settings-content",
    "dream-settings-surface",
    "dream-settings-row",
    "dream-settings-control",
    "dream-settings-input",
    "dream-settings-segment-group",
    "dream-settings-segment",
    "dream-settings-menu",
    "dream-settings-app-row",
    "dream-settings-app-main",
  ];
  const SUBAGENT_CLASSES = [
    "dream-subagent-frame",
    "dream-subagent-shell",
    "dream-subagent-toolbar",
    "dream-subagent-panel",
    "dream-subagent-scroller",
    "dream-subagent-section",
    "dream-subagent-section-live",
    "dream-subagent-section-archive",
    "dream-subagent-list",
    "dream-subagent-row",
    "dream-subagent-row-live",
    "dream-subagent-row-archive",
    "dream-subagent-more",
  ];
  const COMPOSER_UI_CLASSES = [
    "dream-composer-palette",
    "dream-composer-palette-scroll",
    "dream-composer-palette-heading",
    "dream-composer-palette-item",
    "dream-composer-context-strip",
    "dream-active-goal-strip",
    "dream-goal-progress-group",
    "dream-goal-step",
    "dream-goal-mode-trigger",
  ];
  const installToken = {};
  const DOM_REFRESH_DEBOUNCE_MS = 1500;
  const INTERACTION_QUIET_MS = 320;
  const NAVIGATION_CONFIRM_DELAY_MS = 360;
  const SIDEBAR_SCROLL_QUIET_MS = 96;
  const FALLBACK_REFRESH_MS = 60000;
  const ENSURE_ERROR_LOG_INTERVAL_MS = 30000;
  const NATIVE_PRESET_MIN_COUNT = 2;
  let samplingNativeShell = false;
  let observer = null;
  let resizeObserver = null;
  let resizeTargets = new Set();
  let activeHomeSurface = null;
  let activeHomeSuggestionRoot = null;
  const resizeTargetSizes = new WeakMap();
  const geometryScheduler = { frame: null, settleTimer: null };
  window.__CODEX_DREAM_SKIN_DISABLED__ = false;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value)));
  const luminance = (red, green, blue) => {
    const linear = [red, green, blue].map((value) => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
  };
  const parseRgbColor = (value) => {
    if (!value || value === "transparent") return null;
    const hex = String(value).trim().match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hex) {
      const digits = hex[1];
      const rgbHex = digits.length <= 4
        ? digits.slice(0, 3).split("").map((digit) => `${digit}${digit}`).join("")
        : digits.slice(0, 6);
      const alphaHex = digits.length === 4
        ? `${digits[3]}${digits[3]}`
        : digits.length === 8 ? digits.slice(6, 8) : "ff";
      const number = Number.parseInt(rgbHex, 16);
      return {
        r: number >> 16,
        g: (number >> 8) & 255,
        b: number & 255,
        alpha: Number.parseInt(alphaHex, 16) / 255,
      };
    }
    const match = String(value).trim().match(
      /^rgba?\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:(?:\s*,\s*|\s*\/\s*)([\d.]+%?))?\s*\)$/i,
    );
    if (!match) return null;
    const alpha = match[4] === undefined
      ? 1
      : String(match[4]).endsWith("%") ? Number.parseFloat(match[4]) / 100 : Number(match[4]);
    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
      alpha: clamp(alpha),
    };
  };
  const compositeColor = (value, background, alphaOverride = null) => {
    const foreground = parseRgbColor(value);
    if (!foreground) return null;
    const alpha = clamp(alphaOverride ?? foreground.alpha ?? 1);
    return {
      r: clamp(foreground.r / 255) * 255 * alpha + background.r * (1 - alpha),
      g: clamp(foreground.g / 255) * 255 * alpha + background.g * (1 - alpha),
      b: clamp(foreground.b / 255) * 255 * alpha + background.b * (1 - alpha),
    };
  };
  const readableAccentInk = (accent, panel) => {
    const panelColor = parseRgbColor(panel);
    if (!parseRgbColor(accent) || !panelColor) return null;
    const values = [0, 255].map((backdrop) => {
      const surface = compositeColor(
        panel,
        { r: backdrop, g: backdrop, b: backdrop },
        .94,
      );
      const renderedAccent = compositeColor(accent, surface);
      return luminance(renderedAccent.r, renderedAccent.g, renderedAccent.b);
    });
    const whiteContrast = Math.min(...values.map((value) => 1.05 / (value + .05)));
    const blackContrast = Math.min(...values.map((value) => (value + .05) / .05));
    return whiteContrast >= blackContrast ? "rgb(255 255 255)" : "rgb(0 0 0)";
  };
  const defaultProfile = {
    appearance: "dark",
    accent: [108, 131, 142],
    focusX: .5,
    focusY: .5,
    aspect: 1.6,
    luma: .32,
    safeArea: "center",
  };

  const normalizeConfig = (value) => {
    const config = value && typeof value === "object" ? value : {};
    const art = config.art && typeof config.art === "object" ? config.art : {};
    const hasNumber = (candidate) =>
      (typeof candidate === "number" || (typeof candidate === "string" && candidate.trim() !== "")) &&
      Number.isFinite(Number(candidate));
    const explicitColorKeys = Array.isArray(config.explicitColorKeys)
      ? new Set(config.explicitColorKeys)
      : null;
    const colorsAccentIsExplicit = typeof config?.colors?.accent === "string" &&
      (explicitColorKeys?.has("accent") ||
        (!explicitColorKeys && config.colorMode === "explicit"));
    const colorsPanelIsExplicit = typeof config?.colors?.panel === "string" &&
      (explicitColorKeys?.has("panel") ||
        (!explicitColorKeys && config.colorMode === "explicit"));
    const requestedAccent = colorsAccentIsExplicit
      ? config.colors.accent.trim()
      : (typeof config?.palette?.accent === "string" ? config.palette.accent.trim() : "");
    const requestedPanel = colorsPanelIsExplicit ? config.colors.panel.trim() : "";
    const safeColor = /^(?:#[\da-f]{3,8}|(?:rgb|hsl|oklch|oklab)\([^;{}]{1,96}\))$/i;
    const safeAccent = safeColor.test(requestedAccent)
      ? requestedAccent
      : null;
    const safePanel = safeColor.test(requestedPanel) ? requestedPanel : null;
    const appearance = ["auto", "light", "dark"].includes(config.appearance)
      ? config.appearance
      : "auto";
    const safeArea = ["auto", "left", "right", "center", "none"].includes(art.safeArea)
      ? art.safeArea
      : "auto";
    const taskMode = ["auto", "ambient", "banner", "full", "off"].includes(art.taskMode)
      ? art.taskMode
      : "auto";
    const metadataRatio = Number(config?.artMetadata?.ratio);
    const themeId = typeof config.id === "string" ? config.id.trim().toLowerCase() : "";
    return {
      appearance,
      safeArea,
      taskMode,
      themeId,
      chotenArt: /(?:internet-angel|choten)/i.test(themeId),
      focusX: hasNumber(art.focusX) ? clamp(art.focusX) : null,
      focusY: hasNumber(art.focusY) ? clamp(art.focusY) : null,
      accent: safeAccent,
      panel: safePanel,
      initialAspect: Number.isFinite(metadataRatio) && metadataRatio > 0 ? metadataRatio : null,
    };
  };

  const clearSidebarScrollQuiet = (state) => {
    if (!state) return;
    if (state.timer !== null && state.timer !== undefined) clearTimeout(state.timer);
    state.timer = null;
    state.target?.classList?.remove?.(SIDEBAR_SCROLL_QUIET_CLASS);
    state.target = null;
  };

  const previous = window[STATE_KEY];
  if (previous?.observer) previous.observer.disconnect();
  if (previous?.resizeObserver) previous.resizeObserver.disconnect();
  if (previous?.timer) clearInterval(previous.timer);
  if (previous?.scheduler?.timeout) clearTimeout(previous.scheduler.timeout);
  if (previous?.scheduler?.navigationTimer) clearTimeout(previous.scheduler.navigationTimer);
  if (previous?.scheduler?.navigationConfirmTimer) clearTimeout(previous.scheduler.navigationConfirmTimer);
  if (previous?.scheduler?.frame) window.cancelAnimationFrame?.(previous.scheduler.frame);
  if (previous?.geometryScheduler?.frame) {
    window.cancelAnimationFrame?.(previous.geometryScheduler.frame);
  }
  if (previous?.geometryScheduler?.settleTimer) {
    clearTimeout(previous.geometryScheduler.settleTimer);
  }
  if (previous?.resizeHandler) window.removeEventListener("resize", previous.resizeHandler);
  if (previous?.navigationHandler) {
    window.removeEventListener("popstate", previous.navigationHandler);
    document.removeEventListener("click", previous.navigationHandler, true);
  }
  if (previous?.interactionHandler) {
    document.removeEventListener("compositionstart", previous.interactionHandler, true);
    document.removeEventListener("compositionend", previous.interactionHandler, true);
    document.removeEventListener("beforeinput", previous.interactionHandler, true);
    document.removeEventListener("wheel", previous.interactionHandler, true);
    document.removeEventListener("scroll", previous.interactionHandler, true);
  }
  if (previous?.sidebarScrollHandler) {
    document.removeEventListener("wheel", previous.sidebarScrollHandler, true);
    document.removeEventListener("scroll", previous.sidebarScrollHandler, true);
  }
  clearSidebarScrollQuiet(previous?.sidebarScrollQuiet);
  previous?.motionQuery?.removeEventListener?.("change", previous.motionHandler);
  if (previous?.artUrl) URL.revokeObjectURL(previous.artUrl);
  document.documentElement?.classList?.remove?.("dream-preview-blink", "dream-preview-blink-half");
  const artUrl = (() => {
    const comma = artDataUrl.indexOf(",");
    const binary = atob(artDataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const mime = /^data:([^;,]+)/.exec(artDataUrl)?.[1] || "image/png";
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  })();
  const config = normalizeConfig(rawConfig);
  const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  let profile = {
    ...defaultProfile,
    aspect: config.initialAspect ?? defaultProfile.aspect,
  };
  let artGeometryReady = Boolean(config.initialAspect);
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    existingStyle.textContent = cssText;
    existingStyle.dataset.dreamVersion = STYLE_REVISION;
  }

  const analyzeArt = () => new Promise((resolve) => {
    if (typeof Image !== "function") {
      resolve(defaultProfile);
      return;
    }
    const image = new Image();
    image.onload = () => {
      try {
        const width = 48;
        const height = Math.max(12, Math.round(width * image.naturalHeight / image.naturalWidth));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext?.("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas is unavailable");
        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        let count = 0;
        let totalRed = 0;
        let totalGreen = 0;
        let totalBlue = 0;
        let totalBrightness = 0;
        const samples = [];
        const sampleMap = new Array(width * height);
        for (let offset = 0; offset < pixels.length; offset += 4) {
          if (pixels[offset + 3] < 96) continue;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const light = (.2126 * red + .7152 * green + .0722 * blue) / 255;
          const sample = { red, green, blue, light, index: offset / 4 };
          samples.push(sample);
          sampleMap[sample.index] = sample;
          totalRed += red;
          totalGreen += green;
          totalBlue += blue;
          totalBrightness += light;
          count += 1;
        }
        if (!count) throw new Error("Image contains no opaque pixels");
        const average = [totalRed / count, totalGreen / count, totalBlue / count];
        const averageBrightness = totalBrightness / count;
        const information = (start, end) => {
          let total = 0;
          let totalSquared = 0;
          let edges = 0;
          let edgeCount = 0;
          let sampleCount = 0;
          for (let y = 0; y < height; y += 1) {
            for (let x = start; x < end; x += 1) {
              const sample = sampleMap[y * width + x];
              if (!sample) continue;
              total += sample.light;
              totalSquared += sample.light * sample.light;
              sampleCount += 1;
              const previousSample = x > start ? sampleMap[y * width + x - 1] : null;
              const above = y > 0 ? sampleMap[(y - 1) * width + x] : null;
              if (previousSample) { edges += Math.abs(sample.light - previousSample.light); edgeCount += 1; }
              if (above) { edges += Math.abs(sample.light - above.light); edgeCount += 1; }
            }
          }
          const mean = sampleCount ? total / sampleCount : 0;
          const variance = sampleCount ? Math.max(0, totalSquared / sampleCount - mean * mean) : 1;
          return Math.sqrt(variance) * .58 + (edgeCount ? edges / edgeCount : 1) * .42;
        };
        const zoneWidth = Math.max(1, Math.floor(width * .38));
        const leftInformation = information(0, zoneWidth);
        const rightInformation = information(width - zoneWidth, width);
        let safeArea = "center";
        if (leftInformation < rightInformation * .86) safeArea = "left";
        else if (rightInformation < leftInformation * .86) safeArea = "right";
        let focusWeight = 0;
        let focusX = 0;
        let focusY = 0;
        let accentWeight = 0;
        let accent = [0, 0, 0];
        for (const sample of samples) {
          const x = sample.index % width;
          const y = Math.floor(sample.index / width);
          const difference = Math.sqrt(
            (sample.red - average[0]) ** 2 +
            (sample.green - average[1]) ** 2 +
            (sample.blue - average[2]) ** 2,
          ) / 441.7;
          const saliency = .03 + difference ** 1.35;
          focusX += (x / Math.max(1, width - 1)) * saliency;
          focusY += (y / Math.max(1, height - 1)) * saliency;
          focusWeight += saliency;
          const max = Math.max(sample.red, sample.green, sample.blue);
          const min = Math.min(sample.red, sample.green, sample.blue);
          const saturation = max ? (max - min) / max : 0;
          const usableLight = 1 - Math.min(1, Math.abs(sample.light - .46) / .54);
          const weight = saturation ** 2 * (.15 + usableLight);
          accent[0] += sample.red * weight;
          accent[1] += sample.green * weight;
          accent[2] += sample.blue * weight;
          accentWeight += weight;
        }
        const resolvedAccent = accentWeight > 1
          ? accent.map((channel) => Math.round(channel / accentWeight))
          : average.map((channel) => Math.round(channel));
        let resolvedFocusX = clamp(focusX / focusWeight);
        if (safeArea === "left") resolvedFocusX = Math.max(.64, resolvedFocusX);
        if (safeArea === "right") resolvedFocusX = Math.min(.36, resolvedFocusX);
        resolve({
          appearance: averageBrightness >= .58 ? "light" : "dark",
          accent: resolvedAccent,
          focusX: resolvedFocusX,
          focusY: clamp(focusY / focusWeight),
          aspect: image.naturalWidth / Math.max(1, image.naturalHeight),
          luma: clamp(averageBrightness),
          safeArea,
        });
      } catch {
        resolve(defaultProfile);
      }
    };
    image.onerror = () => resolve(defaultProfile);
    image.src = artUrl;
  });

  const detectShellAppearance = () => {
    const root = document.documentElement;
    const body = document.body;
    const appearanceFromClasses = (classes) => {
      const normalized = `${classes || ""}`
        .toLowerCase()
        .replace(/\bdream-theme-(?:dark|light)\b/g, "");
      if (/\belectron-light\b|\btheme-light\b|\bappearance-light\b|\blight\b/.test(normalized)) {
        return "light";
      }
      if (/\belectron-dark\b|\btheme-dark\b|\bappearance-dark\b|\bdark\b/.test(normalized)) {
        return "dark";
      }
      return null;
    };
    const rootAppearance = appearanceFromClasses(root?.className);
    if (rootAppearance) return rootAppearance;

    const dataTheme = (
      root?.getAttribute?.("data-theme") ||
      root?.getAttribute?.("data-appearance") ||
      root?.getAttribute?.("data-color-mode") ||
      body?.getAttribute?.("data-theme") ||
      body?.getAttribute?.("data-appearance") ||
      ""
    ).toLowerCase();
    if (dataTheme.includes("light")) return "light";
    if (dataTheme.includes("dark")) return "dark";
    const bodyAppearance = appearanceFromClasses(body?.className);
    if (bodyAppearance) return bodyAppearance;

    try {
      const hadSkin = root?.classList?.contains?.("codex-dream-skin");
      const savedSkinClasses = hadSkin
        ? ROOT_CLASSES.filter((className) => root.classList.contains(className))
        : [];
      samplingNativeShell = true;
      if (hadSkin) root.classList.remove(...ROOT_CLASSES);
      try {
        const colorScheme = getComputedStyle(root).colorScheme || "";
        if (colorScheme.includes("dark") && !colorScheme.includes("light")) return "dark";
        if (colorScheme.includes("light") && !colorScheme.includes("dark")) return "light";
      } finally {
        if (hadSkin) root.classList.add(...savedSkinClasses);
        observer?.takeRecords?.();
        samplingNativeShell = false;
      }
    } catch {
      samplingNativeShell = false;
    }
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {}
    return "light";
  };

  const clearSkinDom = () => {
    for (const node of [...composerBorderRestores.keys()]) restoreComposerBorders(node);
    const root = document.documentElement;
    if (resizeObserver) {
      for (const target of resizeTargets) {
        try { resizeObserver.unobserve(target); } catch {}
      }
    }
    resizeTargets.clear();
    root?.removeAttribute("data-dream-skin");
    root?.removeAttribute("data-dream-theme");
    root?.removeAttribute("data-dream-route");
    root?.classList.remove(...ROOT_CLASSES);
    root?.classList.remove("dream-preview-blink", "dream-preview-blink-half");
    root?.classList.remove(...HOME_PANEL_STATE_CLASSES);
    for (const property of ROOT_PROPERTIES) root?.style.removeProperty(property);
    document.querySelectorAll(".dream-home").forEach((node) => node.classList.remove("dream-home"));
    document.querySelectorAll(".dream-task").forEach((node) => node.classList.remove("dream-task"));
    document.querySelectorAll(".dream-home-shell").forEach((node) => node.classList.remove("dream-home-shell"));
    document.querySelectorAll(`.${ROUTE_CLASSES.join(", .")}`).forEach((node) => node.classList.remove(...ROUTE_CLASSES));
    document.querySelectorAll(".dream-permission-banner").forEach((node) => node.classList.remove("dream-permission-banner"));
    document.querySelectorAll(`.${SIDEBAR_ACTIVE_ITEM_CLASS}`).forEach((node) => {
      node.classList.remove(SIDEBAR_ACTIVE_ITEM_CLASS);
    });
    document.querySelectorAll(`.${PRESET_CLASSES.join(", .")}`).forEach((node) => node.classList.remove(...PRESET_CLASSES));
    document.querySelectorAll(`.${NATIVE_SUGGESTIONS_ROOT_CLASS}`).forEach((node) => {
      node.classList.remove(NATIVE_SUGGESTIONS_ROOT_CLASS);
    });
    document.querySelectorAll(".dream-changes-pill").forEach((node) => node.classList.remove("dream-changes-pill"));
    document.querySelectorAll(`.${CHANGES_SHELL_CLASS}`).forEach((node) => node.classList.remove(CHANGES_SHELL_CLASS));
    document.querySelectorAll(`.${CHANGES_CLIP_HOST_CLASS}`).forEach((node) => node.classList.remove(CHANGES_CLIP_HOST_CLASS));
    document.querySelectorAll(`.${SYSTEM_TOAST_CLASS}`).forEach((node) => node.classList.remove(SYSTEM_TOAST_CLASS));
    document.querySelectorAll(`.${PANEL_CLASSES.filter((name) => name !== "dream-summary-panel").join(", .")}`).forEach((node) => {
      node.style?.removeProperty?.("--dream-summary-safe-height");
      node.classList.remove(...PANEL_CLASSES.filter((name) => name !== "dream-summary-panel"));
    });
    const transientInteractionClasses = INTERACTION_CLASSES.filter((name) => !EDITED_CARD_CLASSES.includes(name));
    document.querySelectorAll(`.${transientInteractionClasses.join(", .")}`).forEach((node) => {
      node.classList.remove(...transientInteractionClasses);
    });
    document.querySelectorAll(`.${TURN_NAV_CLASSES.join(", .")}`).forEach((node) => {
      node.classList.remove(...TURN_NAV_CLASSES);
    });
    document.querySelectorAll(`.${SETTINGS_CLASSES.join(", .")}`).forEach((node) => {
      node.classList.remove(...SETTINGS_CLASSES);
    });
    document.querySelectorAll(`.${SUBAGENT_CLASSES.join(", .")}`).forEach((node) => {
      node.classList.remove(...SUBAGENT_CLASSES);
    });
    document.querySelectorAll(`.${COMPOSER_UI_CLASSES.join(", .")}`).forEach((node) => {
      node.classList.remove(...COMPOSER_UI_CLASSES);
    });
    document.querySelectorAll(`.${HOME_UTILITY_CLASS}`).forEach((node) => node.classList.remove(HOME_UTILITY_CLASS));
    document.querySelectorAll(`.${HOME_PANEL_STATE_CLASSES.join(", .")}`).forEach((node) => {
      node.classList.remove(...HOME_PANEL_STATE_CLASSES);
    });
    document.querySelectorAll(`#${SIDE_WORKSPACE_BRAND_ID}, .dream-side-workspace-brand`).forEach((node) => node.remove());
    document.querySelectorAll(`[${PART_ATTR}]`).forEach((node) => node.removeAttribute(PART_ATTR));
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(CHROME_ID)?.remove();
    document.getElementById(FALLBACK_PRESETS_ID)?.remove();
    document.getElementById(SIDEBAR_CHROME_ID)?.remove();
    document.getElementById(SIDE_WORKSPACE_BRAND_ID)?.remove();
    activeHomeSurface = null;
    activeHomeSuggestionRoot = null;
  };

  const applyProfile = (root) => {
    const focusX = config.focusX ?? profile.focusX;
    const focusY = config.focusY ?? profile.focusY;
    const appearance = config.appearance === "auto" ? detectShellAppearance() : config.appearance;
    const focus = focusX < .4 ? "left" : focusX > .6 ? "right" : "center";
    const safeArea = config.safeArea === "auto" ? (profile.safeArea ||
      (focus === "left" ? "right" : focus === "right" ? "left" : "center")) : config.safeArea;
    const taskMode = config.taskMode === "auto"
      ? profile.aspect >= 2.25 ? "banner" : "ambient"
      : config.taskMode;
    const accent = config.accent || `rgb(${profile.accent.join(" ")})`;
    const explicitAccentInk = config.accent
      ? readableAccentInk(
        config.accent,
        config.panel || (appearance === "light" ? "rgb(248 248 250)" : "rgb(31 33 40)"),
      )
      : null;
    const accentInk = explicitAccentInk ||
      (luminance(...profile.accent) > .42 ? "rgb(26 24 28)" : "rgb(250 248 251)");
    root.classList.toggle("dream-theme-light", appearance === "light");
    root.classList.toggle("dream-theme-dark", appearance === "dark");
    root.classList.toggle("dream-art-wide", profile.aspect >= 1.75);
    root.classList.toggle("dream-art-standard", profile.aspect < 1.75);
    root.classList.toggle("dream-choten-art", config.chotenArt);
    root.classList.toggle("dream-reduced-motion", Boolean(motionQuery?.matches));
    for (const value of ["left", "center", "right"]) {
      root.classList.toggle(`dream-focus-${value}`, focus === value);
    }
    for (const value of ["left", "center", "right", "none"]) {
      root.classList.toggle(`dream-safe-${value}`, safeArea === value);
    }
    for (const value of ["ambient", "banner", "full", "off"]) {
      root.classList.toggle(`dream-task-${value}`, taskMode === value);
    }
    root.style.setProperty("--dream-art", `url("${artUrl}")`);
    root.style.setProperty("--dream-art-position", `${Math.round(focusX * 100)}% ${Math.round(focusY * 100)}%`);
    root.style.setProperty("--dream-focus-x", String(focusX));
    root.style.setProperty("--dream-focus-y", String(focusY));
    root.style.setProperty("--dream-accent", accent);
    root.style.setProperty("--dream-accent-ink", accentInk);
    if (explicitAccentInk) root.style.setProperty("--ds-on-accent", explicitAccentInk);
    else root.style.removeProperty("--ds-on-accent");
    root.style.setProperty("--dream-image-luma", profile.luma.toFixed(3));
  };

  /* The Choten preset keeps the raster artwork untouched and composites a
     tiny pixel eyelid layer over the two eyes. Measuring the same fixed-cover
     transform as the body background keeps the blink registered through
     sidebar collapse, maximization and ordinary window resizing. */
  const CHOTEN_ART_GEOMETRY = {
    blink: { x: .582, y: .351, width: .132, height: .107 },
    face: { x: .649, y: .346, size: .238 },
  };
  const CHOTEN_GEOMETRY_PROPERTIES = [
    "--dream-blink-left", "--dream-blink-top", "--dream-blink-width", "--dream-blink-height",
    "--dream-face-x", "--dream-face-y", "--dream-face-size",
  ];
  const updateChotenArtGeometry = (chrome, mainBox) => {
    if (!chrome || !mainBox || !config.chotenArt || !artGeometryReady) {
      chrome?.classList?.remove?.("dream-art-motion-ready");
      for (const property of CHOTEN_GEOMETRY_PROPERTIES) chrome?.style?.removeProperty?.(property);
      return;
    }
    const viewportWidth = Math.max(1, document.documentElement?.clientWidth || window.innerWidth || mainBox.right || 1);
    const viewportHeight = Math.max(1, document.documentElement?.clientHeight || window.innerHeight || mainBox.bottom || 1);
    const aspect = Math.max(.4, Number(profile.aspect) || defaultProfile.aspect);
    const imageHeight = Math.max(viewportHeight, viewportWidth / aspect);
    const imageWidth = imageHeight * aspect;
    const focusX = config.focusX ?? profile.focusX;
    const focusY = config.focusY ?? profile.focusY;
    const imageLeft = (viewportWidth - imageWidth) * focusX;
    const imageTop = (viewportHeight - imageHeight) * focusY;
    const blink = CHOTEN_ART_GEOMETRY.blink;
    const blinkLeft = imageLeft + imageWidth * blink.x - mainBox.left;
    const blinkTop = imageTop + imageHeight * blink.y - mainBox.top;
    const blinkWidth = imageWidth * blink.width;
    const blinkHeight = imageHeight * blink.height;
    const face = CHOTEN_ART_GEOMETRY.face;
    const faceX = imageLeft + imageWidth * face.x - mainBox.left;
    const faceY = imageTop + imageHeight * face.y - mainBox.top;
    const faceSize = Math.min(320, Math.max(190, imageHeight * face.size));
    chrome.style.setProperty("--dream-blink-left", `${blinkLeft.toFixed(2)}px`);
    chrome.style.setProperty("--dream-blink-top", `${blinkTop.toFixed(2)}px`);
    chrome.style.setProperty("--dream-blink-width", `${blinkWidth.toFixed(2)}px`);
    chrome.style.setProperty("--dream-blink-height", `${blinkHeight.toFixed(2)}px`);
    chrome.style.setProperty("--dream-face-x", `${faceX.toFixed(2)}px`);
    chrome.style.setProperty("--dream-face-y", `${faceY.toFixed(2)}px`);
    chrome.style.setProperty("--dream-face-size", `${faceSize.toFixed(2)}px`);
    const intersectsStage = blinkLeft + blinkWidth > 0
      && blinkTop + blinkHeight > 0
      && blinkLeft < mainBox.width
      && blinkTop < mainBox.height;
    chrome.classList.toggle("dream-art-motion-ready", intersectsStage);
  };

  const fallbackPresetDefinitions = [
    {
      className: "dream-preset-explore",
      channel: "01 // EXPLORE",
      title: "\u63a2\u7d22\u5e76\u7406\u89e3\u4ee3\u7801",
      detail: "READ / MAP / TRACE",
      prompt: "\u63a2\u7d22\u5e76\u7406\u89e3\u5f53\u524d\u9879\u76ee\u7684\u4ee3\u7801\u7ed3\u6784\u3001\u5173\u952e\u6a21\u5757\u4e0e\u8fd0\u884c\u6d41\u7a0b\u3002",
      icon: '<path d="M5 18l3.4-1 7.7-7.7-2.4-2.4L6 14.6 5 18Z"/><path d="m12.8 7.8 2.4 2.4M16 5l3 3M7.7 15.3l1 1"/>'
    },
    {
      className: "dream-preset-build",
      channel: "02 // BUILD",
      title: "\u6784\u5efa\u65b0\u529f\u80fd\u3001\u5e94\u7528\u6216\u5de5\u5177",
      detail: "MAKE / SHIP / GROW",
      prompt: "\u6784\u5efa\u4e00\u4e2a\u65b0\u529f\u80fd\u3001\u5e94\u7528\u6216\u5de5\u5177\uff1a",
      icon: '<path d="m14.5 5.5 4 4-8.8 8.8H5.7v-4l8.8-8.8Z"/><path d="m12.5 7.5 4 4M4 20h16"/>'
    },
    {
      className: "dream-preset-review",
      channel: "03 // REVIEW",
      title: "\u5ba1\u67e5\u4ee3\u7801\u5e76\u63d0\u51fa\u4fee\u6539\u5efa\u8bae",
      detail: "SCAN / CHECK / SIGNAL",
      prompt: "\u5ba1\u67e5\u5f53\u524d\u4ee3\u7801\uff0c\u5e76\u63d0\u51fa\u5177\u4f53\u3001\u53ef\u6267\u884c\u7684\u4fee\u6539\u5efa\u8bae\u3002",
      icon: '<path d="M20 11a8 8 0 1 1-2.3-5.7"/><path d="M20 4v7h-7M8.5 12l2.2 2.2 4.8-5"/>'
    },
    {
      className: "dream-preset-fix",
      channel: "04 // RECOVER",
      title: "\u4fee\u590d\u95ee\u9898\u548c\u5931\u8d25",
      detail: "DEBUG / HEAL / RETRY",
      prompt: "\u5b9a\u4f4d\u5e76\u4fee\u590d\u5f53\u524d\u9879\u76ee\u4e2d\u7684\u95ee\u9898\u3001\u9519\u8bef\u6216\u5931\u8d25\u3002",
      icon: '<path d="M8 8a4 4 0 0 1 8 0v8a4 4 0 0 1-8 0V8Z"/><path d="M4 13h4m8 0h4M6 7l2 2m10-2-2 2M9 4l1.2 2m4.6-2L14 6M9.5 13h5"/>'
    },
  ];

  const writePresetToComposer = (prompt) => {
    const composer = document.querySelector(`.dream-home ${COMPOSER_SELECTOR}`);
    const editor = composer?.querySelector(
      '.ProseMirror[contenteditable="true"], [contenteditable="true"]',
    );
    if (!editor) return false;
    editor.focus();
    let inserted = false;
    try {
      const selection = window.getSelection?.();
      const range = document.createRange?.();
      if (selection && range) {
        range.selectNodeContents(editor);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      inserted = Boolean(document.execCommand?.("insertText", false, prompt));
    } catch {}
    if (!inserted || !(editor.textContent || "").includes(prompt)) {
      const paragraph = document.createElement("p");
      paragraph.textContent = prompt;
      editor.replaceChildren(paragraph);
      try {
        editor.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: prompt,
        }));
      } catch {
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    editor.focus();
    return true;
  };

  const ensureFallbackPresets = (home, nativePresetCount) => {
    let deck = document.getElementById(FALLBACK_PRESETS_ID);
    if (!home) {
      deck?.remove();
      document.documentElement?.classList?.remove?.("dream-presets-ready");
      return null;
    }
    if (!deck || deck.parentElement !== home) {
      deck?.remove();
      deck = document.createElement("section");
      deck.id = FALLBACK_PRESETS_ID;
      deck.className = "dream-presets-deck";
      deck.setAttribute("aria-label", "New task presets");
      deck.setAttribute("data-dream-ready", "false");
      const heading = document.createElement("div");
      heading.className = "dream-presets-heading";
      heading.setAttribute("aria-hidden", "true");
      heading.innerHTML = '<span>&hearts; ANGEL COMMAND DECK</span><b>4 CHANNELS ONLINE</b>';
      deck.appendChild(heading);
      const grid = document.createElement("div");
      grid.className = "dream-presets-grid";
      fallbackPresetDefinitions.forEach((preset) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `dream-codex-preset dream-generated-preset ${preset.className}`;
        button.setAttribute("aria-label", preset.title);
        button.innerHTML = `
          <span class="dream-preset-channel" aria-hidden="true">${preset.channel}</span>
          <span class="dream-preset-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${preset.icon}</svg><i>&hearts;</i></span>
          <strong>${preset.title}</strong>
          <small>${preset.detail}</small>
          <em aria-hidden="true">LIVE</em>`;
        button.addEventListener("click", () => writePresetToComposer(preset.prompt));
        grid.appendChild(button);
      });
      deck.appendChild(grid);
      home.appendChild(deck);
    }
    const ready = nativePresetCount < NATIVE_PRESET_MIN_COUNT;
    deck.setAttribute("data-dream-ready", String(ready));
    document.documentElement?.classList?.toggle?.("dream-presets-ready", ready);
    if (ready) deck.removeAttribute?.("hidden");
    else deck.setAttribute("hidden", "");
    deck.setAttribute("aria-hidden", String(!ready));
    [...(deck.querySelectorAll?.("button.dream-generated-preset") || [])].forEach((button, index) => {
      const preset = fallbackPresetDefinitions[index];
      if (!preset) return;
      button.classList.add("dream-codex-preset", "dream-generated-preset", preset.className);
    });
    return deck;
  };

  const ensureSidebarOrnaments = (sidebar, settingsRoute) => {
    let ornaments = document.getElementById(SIDEBAR_CHROME_ID);
    if (!sidebar || settingsRoute || typeof sidebar.appendChild !== "function") {
      ornaments?.remove();
      return null;
    }
    if (!ornaments || ornaments.parentElement !== sidebar) {
      ornaments?.remove();
      ornaments = document.createElement("div");
      ornaments.id = SIDEBAR_CHROME_ID;
      ornaments.setAttribute("aria-hidden", "true");
      ornaments.innerHTML = `
        <i class="dream-sidebar-signal"></i>
        <i class="dream-sidebar-halo"></i>
        <i class="dream-sidebar-pixels"></i>
        <span class="dream-sidebar-online"><b>&hearts;</b> CHOTEN LINK / ONLINE</span>
        <span class="dream-sidebar-packet">AFFECTION 9999+</span>`;
      sidebar.appendChild(ornaments);
    }
    return ornaments;
  };

  const ensureSideWorkspaceBrand = (workspace) => {
    const existing = [...document.querySelectorAll(`#${SIDE_WORKSPACE_BRAND_ID}, .dream-side-workspace-brand`)];
    for (const node of existing) {
      if (!workspace || node.parentElement !== workspace) node.remove();
    }
    if (!workspace) return null;
    let brand = existing.find((node) => node.parentElement === workspace) || null;
    if (!brand) {
      brand = document.createElement("div");
      brand.id = SIDE_WORKSPACE_BRAND_ID;
      brand.className = "dream-side-workspace-brand";
      brand.setAttribute("aria-hidden", "true");
      brand.innerHTML = `
        <span><b>&hearts;</b> CHOTEN LINK</span>
        <i><b></b><b></b><b></b><b></b></i>
        <em>ONLINE 9999+</em>`;
      workspace.appendChild(brand);
    }
    return brand;
  };

  const syncChromeGeometry = (chrome, shellMain, home) => {
    if (!chrome || !shellMain) return;
    const mainBox = shellMain.getBoundingClientRect?.();
    const composerBox = home?.querySelector?.(COMPOSER_SELECTOR)?.getBoundingClientRect?.();
    if (mainBox?.width > 0 && mainBox?.height > 0) {
      const setGeometryProperty = (property, value) => {
        if (chrome.style?.getPropertyValue?.(property) !== value) {
          chrome.style?.setProperty?.(property, value);
        }
      };
      setGeometryProperty("--dream-main-left", `${Math.round(mainBox.left)}px`);
      setGeometryProperty("--dream-main-top", `${Math.round(mainBox.top)}px`);
      setGeometryProperty("--dream-main-width", `${Math.round(mainBox.width)}px`);
      setGeometryProperty("--dream-main-height", `${Math.round(mainBox.height)}px`);
      updateChotenArtGeometry(chrome, mainBox);
      if (composerBox?.width > 0 && composerBox?.height > 0) {
        setGeometryProperty("--dream-composer-left", `${Math.round(composerBox.left - mainBox.left)}px`);
        setGeometryProperty("--dream-composer-right", `${Math.round(mainBox.right - composerBox.right)}px`);
        setGeometryProperty("--dream-composer-top", `${Math.round(composerBox.top - mainBox.top)}px`);
      }
    }
    chrome.classList.toggle("dream-home-shell", Boolean(home));
  };

  const all = (selector) => {
    try { return [...document.querySelectorAll(selector)]; } catch { return []; }
  };
  const allWithin = (root, selector) => {
    if (!root) return [];
    const matches = [];
    try {
      if (root.matches?.(selector)) matches.push(root);
      for (const node of root.querySelectorAll?.(selector) || []) {
        if (!matches.includes(node)) matches.push(node);
      }
    } catch {}
    return matches;
  };
  const isRenderedElement = (node) => {
    if (!node || node.isConnected === false) return false;
    const box = node.getBoundingClientRect?.() || { x: 0, y: 0, width: 0, height: 0 };
    if (!(box.width > 0 && box.height > 0)) return false;
    let style = null;
    try { style = getComputedStyle(node); } catch {}
    const opacity = Number.parseFloat(style?.opacity);
    if (style?.display === "none" || style?.visibility === "hidden" ||
      style?.visibility === "collapse" || style?.contentVisibility === "hidden" ||
      (Number.isFinite(opacity) && opacity <= .05)) return false;
    try {
      if (typeof node.checkVisibility === "function" && !node.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
      })) return false;
    } catch {}
    const x = Number.isFinite(box.x) ? box.x : Number(box.left || 0);
    const y = Number.isFinite(box.y) ? box.y : Number(box.top || 0);
    const right = Number.isFinite(box.right) ? box.right : x + box.width;
    const bottom = Number.isFinite(box.bottom) ? box.bottom : y + box.height;
    const viewportWidth = Number(window.innerWidth || document.documentElement?.clientWidth || 0);
    const viewportHeight = Number(window.innerHeight || document.documentElement?.clientHeight || 0);
    return right > 0 && bottom > 0 && x < viewportWidth && y < viewportHeight;
  };
  const findHomeSuggestionRoot = (home) => {
    if (!home) return null;
    const unsafeRootSelector = [
      COMPOSER_SELECTOR,
      '[data-ds-part="composer"]',
      '[class*="ComposerLayoutRoot" i]',
      '[class*="terminal-panel" i]',
      '[data-feature="game-source"]',
      '[data-testid="home-icon"]',
    ].join(", ");
    const hasHomeHeading = (candidate) => allWithin(candidate, 'h1, h2, [role="heading"]')
      .some((heading) => /^(我们该构建什么|what should we build)\s*[？?]?$/i
        .test((heading.textContent || "").trim()));
    const isSafeRoot = (candidate) => Boolean(
      candidate && candidate !== home && !candidate.matches?.(unsafeRootSelector) &&
      !candidate.querySelector?.(unsafeRootSelector) && !hasHomeHeading(candidate),
    );
    const stableRoots = allWithin(home, STABLE_HOME_SUGGESTIONS_SELECTOR)
      .filter((node) => !node.closest?.(`#${FALLBACK_PRESETS_ID}`));
    const stableRoot = stableRoots.find((node) => isRenderedElement(node) && isSafeRoot(node));
    if (stableRoot) return stableRoot;
    const signals = allWithin(home, HOME_SUGGESTIONS_SELECTOR)
      .filter((node) => node !== home && !node.closest?.(`#${FALLBACK_PRESETS_ID}`))
      .filter(isRenderedElement);
    if (!signals.length) return null;
    const containerSignal = signals.find((node) => {
      const testId = String(node.getAttribute?.("data-testid") || "");
      const semanticContainer = /^home-suggestions?(?:$|[-_](?:grid|list|cards|deck|container|root))$/i
        .test(testId);
      const descendantSignals = allWithin(node, HOME_SUGGESTIONS_SELECTOR)
        .filter((candidate) => candidate !== node);
      return isSafeRoot(node) && (semanticContainer || descendantSignals.length >= 2 ||
        homeSuggestionButtons(node).length >= 2);
    });
    if (containerSignal) return containerSignal;
    const firstSignal = signals[0];
    let commonRoot = firstSignal.matches?.("button")
      ? firstSignal.parentElement
      : firstSignal.parentElement || firstSignal;
    while (commonRoot && commonRoot !== home &&
      !signals.every((node) => commonRoot.contains?.(node))) {
      commonRoot = commonRoot.parentElement;
    }
    if (isSafeRoot(commonRoot)) return commonRoot;
    const leafRoot = firstSignal.matches?.("button")
      ? firstSignal.parentElement || firstSignal
      : firstSignal;
    return isSafeRoot(leafRoot) ? leafRoot : null;
  };
  const homeSuggestionButtons = (root) => {
    if (!root) return [];
    const buttons = [];
    if (root.matches?.("button")) buttons.push(root);
    for (const button of root.querySelectorAll?.("button") || []) {
      if (!buttons.includes(button)) buttons.push(button);
    }
    return buttons;
  };
  const genericInputs = () => all(
    'textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [data-placeholder]',
  )
    .filter((node) => !node.closest?.('[role="dialog"], [aria-modal="true"]'))
    .filter((node) => node.closest?.('[class*="ComposerLayout" i]') ||
      node.matches?.('textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'))
    .filter(isRenderedElement);
  const composerOwnerSelector =
    '[data-testid*="composer" i], [data-testid*="prompt" i], ' +
    '[class*="composer" i], [class*="prompt" i], [class*="terminal-panel" i]';
  const genericComposerRootSelector =
    '[class*="ComposerLayoutRoot" i], [class*="terminal-panel" i]';
  const genericComposerRejectSelector = [
    '[data-composer-footer-responsive]',
    '[class*="ComposerLayoutFooter" i]',
    '[class*="ComposerLayoutToolbar" i]',
    '[class*="ComposerLayoutEditor" i]',
    '[class*="composer-footer" i]',
    '[class*="composer-toolbar" i]',
    '[class*="composer-editor" i]',
  ].join(", ");
  const resolvedMain = () => {
    const exact = all(SHELL_MAIN_SELECTOR)[0];
    if (exact) return exact;
    for (const input of genericInputs()) {
      const main = input.closest?.('main, [role="main"]');
      if (main && typeof main.setAttribute === "function") return main;
    }
    return all('main, [role="main"]')
      .find((node) => !node.closest?.('[role="dialog"], [aria-modal="true"]')) ?? null;
  };
  const findGenericComposers = () => {
    const main = resolvedMain();
    const owners = new Set();
    const canonicalComposers = all(COMPOSER_SELECTOR);
    const inputs = genericInputs().filter((input) =>
      !canonicalComposers.some((composer) => composer.contains?.(input)));
    const isValidOwner = (owner, input) => Boolean(
      owner && input && owner !== input && owner.contains?.(input) && isRenderedElement(owner) &&
      !owner.matches?.(genericComposerRejectSelector) &&
      !owner.closest?.('[role="dialog"], [aria-modal="true"]') &&
      (!main || main.contains?.(owner) || owner.closest?.("aside")),
    );
    for (const input of inputs) {
      if (main && !main.contains?.(input) &&
        !input.closest?.('aside, [class*="ComposerLayout" i]')) continue;
      let owner = input.closest?.(genericComposerRootSelector) ||
        input.closest?.(composerOwnerSelector);
      while (owner) {
        const next = owner.parentElement?.closest?.(composerOwnerSelector);
        if (!next || next === owner) break;
        if (next.matches?.(genericComposerRejectSelector)) break;
        owner = next;
      }
      if (isValidOwner(owner, input)) owners.add(owner);
    }
    for (const node of all(genericComposerRootSelector)) {
      const input = inputs.find((candidate) => node.contains?.(candidate));
      if (isValidOwner(node, input)) owners.add(node);
    }
    return [...owners];
  };
  const safeCssPartNodes = new Set();
  const restoreComposerBorders = (node) => {
    const saved = composerBorderRestores.get(node);
    if (!saved) return;
    for (const [property, { value, priority }] of saved) {
      if (value) node.style.setProperty(property, value, priority);
      else node.style.removeProperty(property);
    }
    composerBorderRestores.delete(node);
  };
  const refreshComposerBorders = (nodes) => {
    const desired = new Set(composerBorderBridges.length ? nodes : []);
    for (const node of composerBorderRestores.keys()) {
      if (!desired.has(node)) restoreComposerBorders(node);
    }
    for (const node of desired) {
      if (!node?.style || composerBorderRestores.has(node)) continue;
      const saved = new Map();
      for (const { property, variable } of composerBorderBridges) {
        saved.set(property, {
          value: node.style.getPropertyValue(property),
          priority: node.style.getPropertyPriority(property),
        });
        node.style.setProperty(property, `var(${variable})`, "important");
      }
      composerBorderRestores.set(node, saved);
    }
  };
  const resolvedMessageNode = (node) => node?.hasAttribute?.("data-local-conversation-user-anchor")
    ? node.querySelector?.('[class*="max-w-"][class*="rounded-2xl"][class*="text-start"]') ?? node
    : node;
  const pruneDisconnectedSafeCssParts = () => {
    let pruned = 0;
    for (const node of [...safeCssPartNodes]) {
      if (node?.isConnected !== false) continue;
      node.removeAttribute?.(PART_ATTR);
      safeCssPartNodes.delete(node);
      pruned += 1;
    }
    rendererMetrics.safePartPruneCount += pruned;
    return pruned;
  };
  const refreshSafeCssParts = () => {
    rendererMetrics.safePartRefreshCount += 1;
    const desired = new Map();
    const add = (part, nodes) => {
      for (const node of nodes || []) {
        if (node && typeof node.setAttribute === "function" && !desired.has(node)) {
          desired.set(node, part);
        }
      }
    };
    const fallbackSidebar = () => {
      if (all(SIDEBAR_SELECTOR).length) return [];
      const main = resolvedMain();
      const mainParent = main?.parentElement;
      if (!main || !mainParent) return [];
      const candidate = all('aside, nav[aria-label]')
        .filter((node) => !main.contains?.(node))
        .filter((node) => !node.closest?.('[role="dialog"], [aria-modal="true"]'))
        .find((node) => node.parentElement === mainParent
          || node.parentElement?.parentElement === mainParent
          || node.parentElement === mainParent.parentElement);
      return candidate ? [candidate] : [];
    };
    const fallbackComposer = () => {
      return findGenericComposers() || [];
    };
    add("root", [document.documentElement]);
    add("sidebar", [...all(SIDEBAR_SELECTOR), ...fallbackSidebar()]);
    add("header", all(HEADER_TINT_SELECTOR));
    add("home", all('[role="main"]:has([data-testid="home-icon"])').filter(isRenderedElement));
    add("main", [...all(SHELL_MAIN_SELECTOR), ...(!all(SHELL_MAIN_SELECTOR).length ? [resolvedMain()].filter(Boolean) : [])]);
    add("project-list", all(".group\\/project-selector"));
    add("thread", all(".thread-scroll-container"));
    add("message", all(MESSAGE_SELECTOR).map(resolvedMessageNode));
    const composerNodes = [...all(COMPOSER_SELECTOR), ...fallbackComposer()];
    add("composer", composerNodes);
    add("composer-toolbar", all(COMPOSER_TOOLBAR_SELECTOR));
    add("dialog", all('[role="dialog"]'));
    const homeHero = [
      ...all('[data-feature="game-source"]'),
      ...all('[data-testid="home-icon"]').map((node) => node.parentElement).filter(Boolean),
    ].find(isRenderedElement);
    add("home-hero", homeHero ? [homeHero] : []);

    for (const node of safeCssPartNodes) {
      if (!desired.has(node)) node.removeAttribute?.(PART_ATTR);
    }
    safeCssPartNodes.clear();
    for (const [node, part] of desired) {
      if (node.getAttribute?.(PART_ATTR) !== part) node.setAttribute(PART_ATTR, part);
      safeCssPartNodes.add(node);
    }
    refreshComposerBorders(composerNodes);
  };

  const incrementalSafePartRules = [
    ["message", MESSAGE_SELECTOR],
    ["composer-toolbar", COMPOSER_TOOLBAR_SELECTOR],
    ["composer", COMPOSER_SELECTOR],
    ["thread", ".thread-scroll-container"],
    ["dialog", '[role="dialog"]'],
    ["header", HEADER_TINT_SELECTOR],
    ["sidebar", SIDEBAR_SELECTOR],
    ["main", SHELL_MAIN_SELECTOR],
    ["project-list", ".group\\/project-selector"],
  ];
  const incrementalSafePartSelector = incrementalSafePartRules
    .map(([, selector]) => selector).join(", ");
  const themeDiffsContainers = (hosts = all("diffs-container")) => {
    for (const host of hosts) {
      const root = host?.shadowRoot;
      if (!root) continue;
      const surface = "color-mix(in oklab, var(--dream-surface) 94%, var(--dream-accent) 5%)";
      const surfaceRaised = "color-mix(in oklab, var(--dream-surface-raised) 94%, var(--dream-accent) 6%)";
      const fg = "var(--dream-text)";
      const mutedFg = "color-mix(in oklab, var(--dream-text) 76%, var(--dream-accent))";
      const setStyle = (element, property, value) => {
        element?.style?.setProperty(property, value, "important");
      };
      const setAll = (selector, property, value) => {
        for (const element of root.querySelectorAll(selector)) setStyle(element, property, value);
      };
      setStyle(host, "--diffs-bg", surface);
      setStyle(host, "--diffs-fg", fg);
      setStyle(host, "--diffs-bg-context", surfaceRaised);
      setStyle(host, "background-color", surface);
      setStyle(host, "color", fg);
      setAll("[data-file]", "--diffs-bg", surface);
      setAll("[data-file]", "--diffs-fg", fg);
      setAll("[data-file]", "--codex-diffs-surface", surface);
      setAll("[data-file]", "--codex-diffs-context-surface", surfaceRaised);
      setAll("[data-file]", "--codex-diffs-header-surface", surfaceRaised);
      setAll("[data-file]", "--codex-diffs-separator-surface", surfaceRaised);
      setAll("[data-file]", "--codex-diffs-hover-surface", surfaceRaised);
      setAll("[data-file]", "background-color", surface);
      setAll(
        "pre, code, [data-content], [data-gutter], [data-column-number], [data-gutter-buffer], [data-diffs-header], [data-file-info]",
        "background-color",
        surface,
      );
      setAll("pre, code, [data-content], [data-line]", "color", fg);
      setAll("[data-line] span, [data-line-number-content], [data-column-number]", "color", mutedFg);
      setAll("[data-line] span", "background-color", "transparent");
      setAll("[data-file]", "scrollbar-color", "color-mix(in oklab, var(--angel-cyan) 52%, transparent) transparent");
      let themeStyle = root.querySelector(`style[data-dream-skin="${DIFFS_THEME_STYLE_ID}"]`);
      if (!themeStyle) {
        themeStyle = document.createElement("style");
        themeStyle.setAttribute("data-dream-skin", DIFFS_THEME_STYLE_ID);
        root.appendChild(themeStyle);
      }
      if (themeStyle.dataset.dreamRevision !== STYLE_REVISION) {
        themeStyle.textContent = [
          "[data-code]::-webkit-scrollbar { width: 10px !important; height: 10px !important; }",
          "[data-code]::-webkit-scrollbar-track { background: transparent !important; }",
          "[data-code]::-webkit-scrollbar-thumb { background: color-mix(in oklab, var(--angel-cyan) 52%, transparent) !important; border-radius: 6px !important; }",
          "::selection { background: color-mix(in oklab, var(--angel-pink) 38%, transparent) !important; }",
        ].join("\n");
        themeStyle.dataset.dreamRevision = STYLE_REVISION;
      }
    }
  };
  const classifySafeCssParts = (records) => {
    const roots = records
      .flatMap((record) => [...(record.addedNodes || [])])
      .filter((node) => node?.nodeType === 1 && !isInjectedNode(node));
    if (!roots.length) return false;
    const diffHosts = new Set();
    for (const root of roots) {
      if (root.matches?.("diffs-container")) diffHosts.add(root);
      for (const host of root.querySelectorAll?.("diffs-container") || []) diffHosts.add(host);
    }
    if (diffHosts.size) themeDiffsContainers(diffHosts);
    pruneDisconnectedSafeCssParts();
    const matches = new Set();
    for (const root of roots) {
      if (root.matches?.(incrementalSafePartSelector)) matches.add(root);
      for (const node of root.querySelectorAll?.(incrementalSafePartSelector) || []) {
        matches.add(node);
      }
    }
    for (const node of matches) {
      const match = incrementalSafePartRules.find(([, selector]) => node.matches?.(selector));
      if (!match) continue;
      const [part] = match;
      const target = part === "message" ? resolvedMessageNode(node) : node;
      if (target.getAttribute?.(PART_ATTR) !== part) target.setAttribute?.(PART_ATTR, part);
      safeCssPartNodes.add(target);
    }
    return matches.size > 0;
  };

  const ensure = () => {
    if (window.__CODEX_DREAM_SKIN_DISABLED__) return;
    const root = document.documentElement;
    if (!root || !document.body) return;

    // Main Codex shell is the content surface. The left rail is optional: Codex
    // removes or rebuilds aside.app-shell-left-panel while collapsing/expanding
    // it, and clearing the skin there flashes native colors over the active theme.
    // True auxiliary windows (pets, blank targets) still have no main surface, so
    // they continue to clear residual skin state.
    const shellMain = document.querySelector(SHELL_MAIN_SELECTOR) ||
      document.querySelector("main") ||
      document.querySelector('[role="main"]');
    const shellSidebar = document.querySelector("aside.app-shell-left-panel");
    if (!shellMain) {
      clearSkinDom();
      return;
    }

    root.setAttribute("data-dream-skin", "active");
    root.setAttribute("data-dream-theme", isInternetAngelTheme ? "internet-angel" : "standard");
    root.classList.add("codex-dream-skin");
    applyProfile(root);
    refreshSafeCssParts();
    themeDiffsContainers();

    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || root).appendChild(style);
    }
    if (style.dataset.dreamVersion !== STYLE_REVISION) {
      style.textContent = cssText;
      style.dataset.dreamVersion = STYLE_REVISION;
    }
    const activeState = window[STATE_KEY];
    if (activeState?.installToken === installToken) activeState.styleNode = style;

    const routeMains = [...document.querySelectorAll('[role="main"]')];
    if (!routeMains.length) routeMains.push(shellMain);
    const settingsNav = document.querySelector('nav:has([data-settings-panel-slug])');
    const settingsSidebar = settingsNav?.closest?.(SIDEBAR_SELECTOR)
      || settingsNav?.parentElement
      || null;
    const settingsContent = settingsSidebar?.parentElement
      ?.querySelector?.(SETTINGS_CONTENT_SELECTOR)
      ?.parentElement || null;
    const homeSignals = [
      ...allWithin(shellMain, '[data-testid="home-icon"]'),
      ...allWithin(shellMain, '[data-feature="game-source"]'),
      ...allWithin(shellMain, HOME_SUGGESTIONS_SELECTOR),
    ];
    const homeMarker = [...new Set(homeSignals)].find(isRenderedElement) || null;
    const semanticHome = homeMarker?.closest?.('[role="main"]') || null;
    const homeHeading = [...(shellMain.querySelectorAll?.('h1, h2, [role="heading"]') || [])]
      .find((candidate) => isRenderedElement(candidate) &&
        /^(我们该构建什么|what should we build)\s*[？?]?$/i.test((candidate.textContent || "").trim()));
    const home = [
      semanticHome,
      homeMarker ? shellMain : null,
      homeHeading?.closest?.('[role="main"]'),
      homeHeading ? shellMain : null,
    ].find((candidate) => candidate && isRenderedElement(candidate)) || null;
    activeHomeSurface = home;
    if (resizeObserver) {
      const nextResizeTargets = new Set([shellMain, home].filter(Boolean));
      for (const target of resizeTargets) {
        if (!nextResizeTargets.has(target)) resizeObserver.unobserve(target);
      }
      for (const target of nextResizeTargets) {
        if (!resizeTargets.has(target)) resizeObserver.observe(target);
      }
      resizeTargets = nextResizeTargets;
    }
    const selectedCandidates = [...(shellSidebar?.querySelectorAll?.(
      '[aria-current="page"], [aria-selected="true"], [data-state="active"], [class~="bg-token-list-hover-background"]'
    ) || [])];
    const selectedControl = selectedCandidates.find((candidate) => {
      const box = candidate.getBoundingClientRect?.() || { width: 0, height: 0 };
      return box.width > 0 && box.height > 0;
    });
    const selectedListItem = selectedControl?.closest?.('[role="listitem"]') || null;
    for (const candidate of document.querySelectorAll(`.${SIDEBAR_ACTIVE_ITEM_CLASS}`)) {
      if (candidate !== selectedListItem) candidate.classList.remove(SIDEBAR_ACTIVE_ITEM_CLASS);
    }
    selectedListItem?.classList.add(SIDEBAR_ACTIVE_ITEM_CLASS);
    const selectedText = (selectedControl?.textContent || "").trim().toLowerCase();
    const headingText = [...(shellMain.querySelectorAll?.('h1, h2, [role="heading"]') || [])]
      .map((candidate) => (candidate.textContent || "").trim())
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    let route = "task";
    if (settingsNav) route = "settings";
    else if (home) route = "home";
    else if (/^站点$|\bsites?\b/m.test(headingText)) route = "sites";
    else if (/pull\s*requests?/.test(headingText)) route = "pulls";
    else if (/已安排的任务|scheduled\s+tasks?/.test(headingText)) route = "scheduled";
    else if (/^插件$|^plugins?$/m.test(headingText)) route = "plugins";
    else if (/站点|\bsites?\b/.test(selectedText)) route = "sites";
    else if (/拉取请求|pull\s*requests?/.test(selectedText)) route = "pulls";
    else if (/已安排|scheduled/.test(selectedText)) route = "scheduled";
    else if (/插件|plugins?/.test(selectedText)) route = "plugins";
    const routeClass = `dream-route-${route}`;
    const utilityRoute = ["sites", "pulls", "scheduled", "plugins"].includes(route);

    if (root.getAttribute("data-dream-route") !== route) {
      root.setAttribute("data-dream-route", route);
    }
    for (const className of ROUTE_CLASSES) {
      const enabled = className === routeClass ||
        (className === "dream-route-utility" && utilityRoute);
      shellMain.classList.toggle(className, enabled);
    }
    for (const candidate of routeMains) {
      candidate.classList.toggle("dream-home", candidate === home);
      candidate.classList.toggle("dream-task", route === "task" && candidate !== home);
    }
    if (!routeMains.includes(shellMain)) {
      const hasSemanticTaskMain = routeMains.some((candidate) => candidate !== home);
      shellMain.classList.toggle("dream-task", route === "task" && !hasSemanticTaskMain);
    }
    const utilityBars = new Set(home ? home.querySelectorAll('[class*="_homeUtilityBar_"]') : []);
    for (const candidate of document.querySelectorAll(`.${HOME_UTILITY_CLASS}`)) {
      if (!utilityBars.has(candidate)) candidate.classList.remove(HOME_UTILITY_CLASS);
    }
    for (const candidate of utilityBars) candidate.classList.add(HOME_UTILITY_CLASS);
    shellMain.classList.toggle("dream-home-shell", Boolean(home));
    root.classList.toggle("dream-settings-active", Boolean(settingsNav));

    for (const candidate of document.querySelectorAll(`.${NEW_TASK_CLASS}`)) {
      candidate.classList.remove(NEW_TASK_CLASS);
    }
    const newTaskButton = [...(shellSidebar?.querySelectorAll?.('button, [role="button"]') || [])]
      .find((candidate) => /^(?:\u65b0\u5efa\u4efb\u52a1|new task)$/i.test((candidate.textContent || "").trim()));
    newTaskButton?.classList.add(NEW_TASK_CLASS);

    for (const candidate of document.querySelectorAll(`.${SETTINGS_CLASSES.join(", .")}`)) {
      candidate.classList.remove(...SETTINGS_CLASSES);
    }
    for (const candidate of document.querySelectorAll(`.${TURN_NAV_CLASSES.join(", .")}`)) {
      candidate.classList.remove(...TURN_NAV_CLASSES);
    }
    for (const candidate of document.querySelectorAll(`.${SUBAGENT_CLASSES.join(", .")}`)) {
      candidate.classList.remove(...SUBAGENT_CLASSES);
    }
    settingsSidebar?.classList.add("dream-settings-sidebar");
    ensureSidebarOrnaments(shellSidebar, Boolean(settingsNav));
    settingsNav?.classList.add("dream-settings-nav");
    const settingsSearch = settingsNav?.querySelector?.('[role="searchbox"]')?.closest?.('div[class~="rounded-lg"]')
      || settingsNav?.querySelector?.('[role="searchbox"]');
    settingsSearch?.classList.add("dream-settings-search");
    settingsContent?.classList.add("dream-settings-content");
    const settingsSurfaces = [...(settingsContent?.querySelectorAll?.(
      'div[class~="flex"][class~="flex-col"][class~="overflow-hidden"][class~="rounded-2xl"]',
    ) || [])].filter((surface) => {
      const box = surface.getBoundingClientRect?.() || { width: 0, height: 0 };
      return box.width >= 360 && box.height >= 44 && surface.childElementCount > 0;
    });
    for (const surface of settingsSurfaces) {
      surface.classList.add("dream-settings-surface");
      for (const row of [...(surface.children || [])].filter((candidate) => {
        if (candidate.tagName !== "DIV") return false;
        const box = candidate.getBoundingClientRect?.() || { width: 0, height: 0 };
        return box.width >= 280 && box.height >= 36;
      })) {
        row.classList.add("dream-settings-row");
      }
    }
    for (const control of settingsContent?.querySelectorAll?.(
      'button, input, textarea, [contenteditable="true"], [role="radiogroup"], [role="slider"]',
    ) || []) {
      control.classList.add("dream-settings-control");
      if (control.matches?.('input, textarea, [contenteditable="true"]')) {
        control.classList.add("dream-settings-input");
      }
      if (control.matches?.('[role="radiogroup"]')) {
        control.classList.add("dream-settings-segment-group");
        for (const segment of control.querySelectorAll?.('button, [role="radio"]') || []) {
          segment.classList.add("dream-settings-segment");
        }
      }
    }
    for (const group of settingsContent?.querySelectorAll?.(
      'div[class~="rounded-lg"]:has(> button + button), div[class~="rounded-xl"]:has(> button + button)',
    ) || []) {
      const box = group.getBoundingClientRect?.() || { width: 0, height: 0 };
      if (box.width > 52 && box.width < 520 && box.height >= 24 && box.height <= 64) {
        group.classList.add("dream-settings-segment-group");
        for (const segment of group.querySelectorAll?.(':scope > button') || []) {
          segment.classList.add("dream-settings-segment", "dream-settings-control");
        }
      }
    }
    const pressedGroups = new Set();
    for (const segment of settingsContent?.querySelectorAll?.('button[aria-pressed]') || []) {
      const group = segment.parentElement;
      const siblings = [...(group?.children || [])].filter((candidate) => candidate.matches?.('button[aria-pressed]'));
      if (siblings.length < 2) continue;
      pressedGroups.add(group);
      segment.classList.add("dream-settings-segment", "dream-settings-control");
    }
    for (const group of pressedGroups) group?.classList.add("dream-settings-segment-group");
    for (const surface of settingsSurfaces) {
      const appSelector = 'button[class~="appearance-none"][class~="bg-transparent"][class~="p-0"][class~="text-left"]';
      if (!surface.querySelector?.(appSelector)) continue;
      for (const row of [...(surface.children || [])].filter((candidate) => candidate.classList?.contains("dream-settings-row"))) {
        row.classList.add("dream-settings-app-row");
        const appMain = [...(row.children || [])].find((candidate) => candidate.matches?.(appSelector));
        appMain?.classList.add("dream-settings-app-main");
      }
    }
    for (const trigger of settingsContent?.querySelectorAll?.(
      'button[aria-haspopup][aria-controls]',
    ) || []) {
      const menuId = trigger.getAttribute("aria-controls");
      const menu = menuId ? document.getElementById(menuId) : null;
      if (menu) menu.classList.add("dream-settings-menu");
    }

    for (const row of document.querySelectorAll('button[class*="navigation-row"]')) {
      row.classList.add("dream-turn-nav-row");
      (row.closest?.(".vertical-scroll-fade-mask") || row.parentElement)
        ?.classList.add("dream-turn-nav-rail");
      const marker = row.querySelector?.('[class*="_marker_"]')
        || row.firstElementChild?.firstElementChild
        || row.firstElementChild;
      marker?.classList.add("dream-turn-nav-marker");
      marker?.classList.toggle(
        "dream-turn-nav-marker-active",
        marker.classList.contains("opacity-60") || marker.getAttribute("aria-current") === "true",
      );
    }
    for (const previewSurface of document.querySelectorAll(
      '[role="tooltip"] div[class~="w-80"][class*="bg-token-dropdown-background"]',
    )) {
      const tooltip = previewSurface.closest?.('[role="tooltip"]');
      tooltip?.classList.add("dream-turn-preview-tooltip");
      previewSurface.classList.add("dream-turn-preview-surface");
      previewSurface.querySelector?.('[class~="font-medium"]')?.classList.add("dream-turn-preview-title");
      previewSurface.querySelector?.('[class*="_preview_"]')?.classList.add("dream-turn-preview-excerpt");
    }

    for (const candidate of document.querySelectorAll(`.${COMPOSER_UI_CLASSES.join(", .")}`)) {
      candidate.classList.remove(...COMPOSER_UI_CLASSES);
    }
    const paletteScroll = [...document.querySelectorAll(
      'div.vertical-scroll-fade-mask[class~="overflow-y-auto"]',
    )].find((candidate) => candidate.parentElement?.matches?.(
      'div[class~="border-token-border"][class*="bg-token-dropdown-background"][class~="relative"][class~="overflow-hidden"][class~="rounded-2xl"][class~="p-1"]',
    ));
    const composerPalette = paletteScroll?.parentElement || null;
    composerPalette?.classList.add("dream-composer-palette");
    paletteScroll?.classList.add("dream-composer-palette-scroll");
    for (const heading of paletteScroll?.querySelectorAll?.('[class~="sticky"][class~="top-0"][class~="z-10"]') || []) {
      heading.classList.add("dream-composer-palette-heading");
    }
    for (const item of paletteScroll?.querySelectorAll?.(
      'button[class~="w-full"][class~="shrink-0"][class~="rounded-lg"][class~="text-left"]',
    ) || []) {
      item.classList.add("dream-composer-palette-item");
    }

    const stickyComposerArea = shellMain.querySelector?.('[class~="sticky"][class~="bottom-0"]');
    const contextStrips = [...(stickyComposerArea?.querySelectorAll?.(
      'div[class~="relative"][class~="min-w-0"][class~="overflow-clip"][class~="border-x"][class~="border-t"]',
    ) || [])];
    contextStrips.forEach((strip) => strip.classList.add("dream-composer-context-strip"));
    const activeGoalPattern = /^(?:\u8fdb\u884c\u4e2d\u7684\u76ee\u6807|active goal)$/i;
    const activeGoalLabel = [...(stickyComposerArea?.querySelectorAll?.("span") || [])]
      .find((candidate) => activeGoalPattern.test((candidate.textContent || "").trim()));
    const activeGoalStrip = activeGoalLabel?.closest?.(".dream-composer-context-strip") || null;
    activeGoalStrip?.classList.add("dream-active-goal-strip");

    const goalStepPattern = /^(?:\u7b2c\s*\d+\s*\/\s*\d+\s*\u6b65|step\s*\d+\s*\/\s*\d+)$/i;
    const goalStepLabel = [...(stickyComposerArea?.querySelectorAll?.("span") || [])]
      .find((candidate) => goalStepPattern.test((candidate.textContent || "").trim()));
    const goalStepControl = goalStepLabel?.closest?.('span[class~="inline-flex"]') || goalStepLabel?.parentElement || null;
    const goalProgressGroup = goalStepControl?.closest?.('div[class~="rounded-3xl"][class~="items-center"]') || null;
    goalStepControl?.classList.add("dream-goal-step");
    goalProgressGroup?.classList.add("dream-goal-progress-group");
    const goalModePattern = /^(?:\u76ee\u6807|goal)$/i;
    const goalModeButton = [...(document.querySelectorAll(`${COMPOSER_SELECTOR} button`) || [])]
      .find((button) => /\u76ee\u6807|goal/i.test(button.getAttribute("aria-label") || "")
        || goalModePattern.test((button.textContent || "").trim()));
    goalModeButton?.classList.add("dream-goal-mode-trigger");

    /* The collaboration view is portal-like right-panel content with no
       stable product id. Its utility-class structure is language-independent,
       so use that for first-paint-safe classification and keep text out of the
       selector entirely. */
    const subagentScroller = [...document.querySelectorAll(
      '[role="tabpanel"] > [class~="h-full"][class~="min-h-0"][class~="overflow-y-auto"][class~="px-3"][class~="py-5"]',
    )].find((candidate) => [...candidate.querySelectorAll?.(':scope > section') || []]
      .some((section) => section.querySelector?.(
        ':scope > [class~="relative"][class~="z-10"] > button[class~="items-start"][class~="w-full"]',
      )));
    const subagentPanel = subagentScroller?.parentElement?.matches?.('[role="tabpanel"]')
      ? subagentScroller.parentElement
      : null;
    const subagentShell = subagentPanel?.parentElement || null;
    const subagentToolbar = subagentPanel?.previousElementSibling?.matches?.('[class~="h-toolbar"]')
      ? subagentPanel.previousElementSibling
      : null;
    const subagentFrame = subagentShell?.closest?.('[class~="border-l"][class~="bg-token-main-surface-primary"]')
      || null;
    subagentFrame?.classList.add("dream-subagent-frame");
    subagentShell?.classList.add("dream-subagent-shell");
    subagentToolbar?.classList.add("dream-subagent-toolbar");
    subagentPanel?.classList.add("dream-subagent-panel");
    subagentScroller?.classList.add("dream-subagent-scroller");
    const subagentSections = [...subagentScroller?.querySelectorAll?.(':scope > section') || []];
    subagentSections.forEach((section, sectionIndex) => {
      const archived = section.matches?.('[class~="mt-6"]') || sectionIndex > 0;
      section.classList.add(
        "dream-subagent-section",
        archived ? "dream-subagent-section-archive" : "dream-subagent-section-live",
      );
      const list = section.querySelector?.(':scope > [class~="relative"][class~="z-10"]');
      list?.classList.add("dream-subagent-list");
      for (const row of list?.querySelectorAll?.(':scope > button[class~="items-start"][class~="w-full"]') || []) {
        row.classList.add(
          "dream-subagent-row",
          archived ? "dream-subagent-row-archive" : "dream-subagent-row-live",
        );
      }
      for (const more of section.querySelectorAll?.(':scope > button:not([class~="items-start"])') || []) {
        more.classList.add("dream-subagent-more");
      }
    });

    const priorPermissionBanners = document.querySelectorAll(".dream-permission-banner");
    for (const candidate of priorPermissionBanners) candidate.classList.remove("dream-permission-banner");
    const shellPermissionText = shellMain.textContent || "";
    const permissionBanner = /Full access is on|瀹屽叏璁块棶/.test(shellPermissionText)
      && /Hide from this session|闅愯棌/.test(shellPermissionText)
      ? [...(shellMain.querySelectorAll?.("div, section, aside") || [])]
      .filter((candidate) => {
        const text = (candidate.textContent || "").trim();
        if (!/Full access is on|完全访问/.test(text) || !/Hide from this session|隐藏/.test(text)) return false;
        const box = candidate.getBoundingClientRect?.() || { width: 0, height: 0 };
        return box.width > 280 && box.height >= 44 && box.height < 180;
      })
      .sort((left, right) => {
        const a = left.getBoundingClientRect?.() || { width: 0, height: 0 };
        const b = right.getBoundingClientRect?.() || { width: 0, height: 0 };
        return (a.width * a.height) - (b.width * b.height);
      })[0]
      : null;
    permissionBanner?.classList.add("dream-permission-banner");

    document.querySelectorAll(`.${SYSTEM_TOAST_CLASS}`).forEach((node) => node.classList.remove(SYSTEM_TOAST_CLASS));
    const resetToast = [...document.querySelectorAll(
      '[data-sonner-toast], [role="alert"], body > aside, body > div > aside',
    )]
      .filter((candidate) => {
        const text = (candidate.textContent || "").trim();
        if (!/速率限制重置机会|rate limit reset opportunity/i.test(text)) return false;
        const action = [...candidate.querySelectorAll("button")]
          .some((button) => /查看重置次数|view (?:reset|redemption)/i.test((button.textContent || "").trim()));
        if (!action) return false;
        const box = candidate.getBoundingClientRect?.() || { width: 0, height: 0 };
        return box.width > 320 && box.height >= 48 && box.height < 220;
      })
      .sort((left, right) => {
        const a = left.getBoundingClientRect?.() || { width: 0, height: 0 };
        const b = right.getBoundingClientRect?.() || { width: 0, height: 0 };
        return (a.width * a.height) - (b.width * b.height);
      })[0];
    const resetToastSurface = resetToast?.matches?.('aside[class~="rounded-2xl"]')
      ? resetToast
      : resetToast?.querySelector?.('aside[class~="rounded-2xl"]') || resetToast;
    resetToastSurface?.classList.add(SYSTEM_TOAST_CLASS);
    root.classList.toggle("dream-system-toast-active", Boolean(resetToastSurface));

    document.querySelectorAll(`.${PANEL_CLASSES.join(", .")}`).forEach((node) => {
      node.style?.removeProperty?.("--dream-summary-safe-height");
      node.classList.remove(...PANEL_CLASSES);
    });
    document.querySelectorAll(`.${INTERACTION_CLASSES.join(", .")}`).forEach((node) => {
      node.classList.remove(...INTERACTION_CLASSES);
    });

    const terminalRoot = document.querySelector(".xterm")
      ?.closest?.('[class*="contain:layout_paint"]')
      || document.querySelector(".xterm")?.closest?.('[role="tabpanel"]')
      || document.querySelector('[class*="contain:layout_paint"]:has(> [class~="h-toolbar-pane"] [role="tablist"])')
      || document.querySelector('[class*="contain:layout_paint"]:has([role="tablist"] [role="tab"])');
    terminalRoot?.classList.add("dream-terminal-panel");

    /* Text labels are used only for a handful of portal/panel fallbacks. Test
       text first and measure the few matches so streaming output does not force
       style/layout reads for every element in the document on each refresh. */
    const textCandidates = [...document.querySelectorAll(
      'body button, body [role="button"], body [role="tab"], body [role="heading"], body label, body span, body p',
    )]
      .filter((node) => !node.matches?.("span, p") || node.childElementCount === 0)
      .map((node) => ({ node, text: (node.textContent || "").trim() }))
      .filter(({ text }) => text && text.length <= 64);
    const textMeasurements = new Map();
    const measureTextCandidate = (candidate) => {
      if (textMeasurements.has(candidate)) return textMeasurements.get(candidate);
      const box = candidate.getBoundingClientRect?.() || { width: 0, height: 0 };
      const style = getComputedStyle(candidate);
      const measurement = {
        visible: box.width > 0 && box.height > 0
          && style.visibility !== "hidden" && Number(style.opacity || 1) > .05,
      };
      textMeasurements.set(candidate, measurement);
      return measurement;
    };
    const exactVisibleTextMatches = (pattern) => textCandidates
      .filter(({ text }) => pattern.test(text))
      .filter(({ node }) => measureTextCandidate(node).visible)
      .sort((left, right) => left.node.childElementCount - right.node.childElementCount)
      .map(({ node }) => node);
    const exactVisibleText = (pattern) => exactVisibleTextMatches(pattern)[0];

    const sideLauncher = exactVisibleText(/^(?:\u4fa7\u8fb9\u4efb\u52a1|side tasks)$/i);
    const browserMarkers = exactVisibleTextMatches(/^(?:\u6d4f\u89c8\u5668|browser)$/i);
    const terminalMarkers = exactVisibleTextMatches(/^(?:\u7ec8\u7aef|terminal)$/i);
    const shellBox = shellMain.getBoundingClientRect?.() || { left: 0, width: 0 };
    const isRightDockedSurface = (candidate) => {
      if (!candidate || candidate === terminalRoot) return false;
      const box = candidate.getBoundingClientRect?.() || { left: 0, width: 0, height: 0 };
      const right = Number.isFinite(box.right) ? box.right : box.left + box.width;
      const shellRight = Number.isFinite(shellBox.right) ? shellBox.right : shellBox.left + shellBox.width;
      const style = getComputedStyle(candidate);
      return box.width >= 180
        && box.height >= 140
        && box.left >= shellBox.left + (shellBox.width * .32)
        && right >= shellBox.left + (shellBox.width * .72)
        && right <= shellRight + 24
        && style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) > .05;
    };
    const structuralSideWorkspace = [...document.querySelectorAll(
      '[class*="contain:layout_paint"], [class*="bg-token-main-surface-primary"]',
    )]
      .filter((candidate) => isRightDockedSurface(candidate)
        && browserMarkers.some((marker) => candidate.contains?.(marker))
        && terminalMarkers.some((marker) => candidate.contains?.(marker)))
      .sort((left, right) => {
        const a = left.getBoundingClientRect?.() || { width: 0, height: 0 };
        const b = right.getBoundingClientRect?.() || { width: 0, height: 0 };
        return (a.width * a.height) - (b.width * b.height);
      })[0];
    const semanticSideWorkspace = sideLauncher?.closest?.('[class*="contain:layout_paint"]')
      || sideLauncher?.closest?.('[class*="bg-token-main-surface-primary"]');
    const sideWorkspace = structuralSideWorkspace
      || (isRightDockedSurface(semanticSideWorkspace) ? semanticSideWorkspace : null);
    sideWorkspace?.classList.add("dream-side-workspace");
    ensureSideWorkspaceBrand(sideWorkspace);

    const isVisiblePanel = (candidate, minimumHeight) => {
      if (!candidate) return false;
      const box = candidate.getBoundingClientRect?.() || { width: 0, height: 0 };
      const style = getComputedStyle(candidate);
      return box.width >= 160
        && box.height >= minimumHeight
        && style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity || 1) > .05;
    };
    const sideOpen = Boolean(home && isVisiblePanel(sideWorkspace, 140));
    const bottomOpen = Boolean(home && isVisiblePanel(terminalRoot, 64));
    const panelStateTargets = new Set([root, shellMain, home].filter(Boolean));
    document.querySelectorAll(`.${HOME_PANEL_STATE_CLASSES.join(", .")}`).forEach((candidate) => {
      if (!panelStateTargets.has(candidate)) candidate.classList.remove(...HOME_PANEL_STATE_CLASSES);
    });
    for (const target of panelStateTargets) {
      target.classList.toggle("dream-home-side-open", sideOpen);
      target.classList.toggle("dream-home-bottom-open", bottomOpen);
      target.classList.toggle("dream-home-dual-panel", sideOpen && bottomOpen);
    }

    const sideChatAside = [...document.querySelectorAll(`${SHELL_MAIN_SELECTOR} aside`)]
      .find((candidate) => candidate.querySelector?.(".thread-scroll-container")
        && candidate.querySelector?.(COMPOSER_SELECTOR));
    const sideChatPanel = sideChatAside?.querySelector?.(':scope > [class*="contain:layout_paint"]')
      || sideChatAside?.querySelector?.('[class*="contain:layout_paint"]')
      || sideChatAside?.firstElementChild;
    sideChatPanel?.classList.add("dream-side-chat-panel");

    const outputLabel = exactVisibleText(/^(?:\u8f93\u51fa|output)$/i);
    const summaryPanel = outputLabel?.closest?.('[class*="rounded-3xl"][class*="bg-token-dropdown-background"]')
      || outputLabel?.closest?.('[class*="bg-token-dropdown-background"]');
    document.querySelectorAll(".dream-summary-panel").forEach((node) => {
      if (node !== summaryPanel) {
        node.style?.removeProperty?.("--dream-summary-safe-height");
        node.classList.remove("dream-summary-panel");
      }
    });
    summaryPanel?.classList.add("dream-summary-panel");

    const selectionLabelPattern = /^(?:\u6dfb\u52a0\u5230\u4efb\u52a1|add to task|\u66f4\u591a\u8be6\u60c5|more details|\u5728\u4fa7\u8fb9\u804a\u5929\u4e2d\u63d0\u95ee|ask in sidebar chat)$/i;
    const selectionButtons = [...new Set([...document.querySelectorAll("button, [role=button]")]
      .filter((candidate) => {
        if (!selectionLabelPattern.test((candidate.textContent || "").trim())) return false;
        const box = candidate.getBoundingClientRect?.() || { width: 0, height: 0 };
        const style = getComputedStyle(candidate);
        return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && Number(style.opacity || 1) > .05;
      }))];
    for (const button of selectionButtons) button.classList.add("dream-selection-action");
    let selectionActions = selectionButtons[0]?.parentElement || null;
    while (selectionActions && !selectionButtons.every((button) => selectionActions.contains(button))) {
      selectionActions = selectionActions.parentElement;
    }
    while (selectionActions && selectionActions !== document.body) {
      const box = selectionActions.getBoundingClientRect?.() || { width: 0, height: 0 };
      if (box.width >= 120 && box.width < 720 && box.height >= 24 && box.height < 104) break;
      selectionActions = selectionActions.parentElement;
    }
    selectionActions?.classList.add("dream-selection-actions");

    const selectedFragmentText = [...document.querySelectorAll("button, span")]
      .filter((candidate) => {
        if (candidate.matches?.("span") && candidate.childElementCount !== 0) return false;
        const text = (candidate.textContent || "").trim();
        if (!/^\d+\s*(?:\u4e2a)?\s*(?:\u5df2\u9009\u6587\u672c\u7247\u6bb5|selected text (?:fragment|snippet)s?)$/i.test(text)) return false;
        const box = candidate.getBoundingClientRect?.() || { width: 0, height: 0 };
        return box.width > 40 && box.width < 360 && box.height > 16 && box.height < 72;
      })
      .sort((left, right) => {
        const a = left.getBoundingClientRect?.() || { width: 0, height: 0 };
        const b = right.getBoundingClientRect?.() || { width: 0, height: 0 };
        return (a.width * a.height) - (b.width * b.height);
      })[0];
    const selectedFragment = selectedFragmentText?.closest?.("button")
      || selectedFragmentText?.closest?.('[class*="rounded"]')
      || selectedFragmentText;
    selectedFragment?.classList.add("dream-selected-fragment");

    const optionalCommentInput = [...document.querySelectorAll('input, textarea, [contenteditable="true"]')]
      .find((candidate) => /\u6dfb\u52a0\u53ef\u9009\u8bc4\u8bba|optional comment/i
        .test(candidate.getAttribute?.("placeholder") || candidate.getAttribute?.("data-placeholder") || ""));
    optionalCommentInput?.classList.add("dream-optional-comment-input");
    let optionalComment = optionalCommentInput?.parentElement || null;
    while (optionalComment && optionalComment !== document.body) {
      const box = optionalComment.getBoundingClientRect?.() || { width: 0, height: 0 };
      if (box.width >= 120 && box.width < 720 && box.height >= 32 && box.height < 104) break;
      optionalComment = optionalComment.parentElement;
    }
    optionalComment?.classList.add("dream-optional-comment");

    const editedTitlePattern = /^(?:\u5df2\u7f16\u8f91|edited)(?:\s+|[:\uff1a]\s*)\S/i;
    const undoPattern = /^(?:\u64a4\u9500|undo)$/i;
    const reviewPattern = /^(?:\u5ba1\u6838|review)$/i;
    for (const editedHeader of document.querySelectorAll('[class*="group/turn-diff-header"]')) {
      const editedTitle = [...editedHeader.querySelectorAll('span[class~="font-medium"][class*="text-token-foreground"]')]
        .find((candidate) => candidate.childElementCount === 0
          && editedTitlePattern.test((candidate.textContent || "").trim()));
      if (!editedTitle) continue;

      const directCard = editedHeader.parentElement;
      const editedCard = directCard?.matches?.('[class*="--thread-resource-card-row-padding-x:"]')
        ? directCard
        : editedHeader.closest?.('[class*="rounded-lg"][class*="bg-token-dropdown-background"]');
      const editedStats = editedCard?.querySelector?.(".turn-diff-default-subtitle");
      if (!editedCard || !editedStats) continue;

      const editedButtons = [...editedCard.querySelectorAll("button, [role=button]")];
      const undoButton = editedButtons.find((button) => undoPattern.test((button.textContent || "").trim()));
      const reviewButton = editedButtons.find((button) => reviewPattern.test((button.textContent || "").trim()));
      if (!undoButton || !reviewButton) continue;

      const editedIcon = editedHeader.querySelector?.('[class~="size-10"][class~="rounded-lg"]:has(> svg)');
      let editedActions = undoButton.parentElement;
      while (editedActions && editedActions !== editedCard && !editedActions.contains(reviewButton)) {
        editedActions = editedActions.parentElement;
      }

      editedCard.classList.add("dream-edited-card");
      editedHeader.classList.add("dream-edited-card-header");
      editedIcon?.classList.add("dream-edited-card-icon");
      editedTitle.classList.add("dream-edited-card-title");
      editedStats?.classList.add("dream-edited-card-stats");
      if (editedActions && editedActions !== editedCard) editedActions.classList.add("dream-edited-card-actions");
      undoButton.classList.add("dream-edited-card-undo");
      reviewButton.classList.add("dream-edited-card-review");
    }

    for (const candidate of document.querySelectorAll(`.${PRESET_CLASSES.join(", .")}`)) {
      candidate.classList.remove(...PRESET_CLASSES);
    }
    const presetPatterns = [
      ["dream-preset-explore", /\u63a2\u7d22\u5e76\u7406\u89e3\u4ee3\u7801|explore and understand code/i],
      ["dream-preset-build", /\u6784\u5efa\u65b0\u529f\u80fd\u3001\u5e94\u7528\u6216\u5de5\u5177|build (?:a )?new (?:feature|app|tool)/i],
      ["dream-preset-review", /\u5ba1\u67e5\u4ee3\u7801\u5e76\u63d0\u51fa\u4fee\u6539\u5efa\u8bae|review code/i],
      ["dream-preset-fix", /\u4fee\u590d\u95ee\u9898\u548c\u5931\u8d25|fix (?:issues|problems|failures)/i],
    ];
    /* Release our own fallback visibility before measuring the native deck.
       This happens inside one JS task, so native responsive hiding—not our
       managed class—decides which deck is visible without a painted blank. */
    root.classList.remove("dream-presets-ready");
    for (const candidate of document.querySelectorAll(`.${NATIVE_SUGGESTIONS_ROOT_CLASS}`)) {
      candidate.classList.remove(NATIVE_SUGGESTIONS_ROOT_CLASS);
    }
    const primedFallbackDeck = document.getElementById(FALLBACK_PRESETS_ID);
    if (primedFallbackDeck) {
      primedFallbackDeck.setAttribute("data-dream-ready", "false");
      primedFallbackDeck.setAttribute("hidden", "");
      primedFallbackDeck.setAttribute("aria-hidden", "true");
    }
    const nativeSuggestionRoot = findHomeSuggestionRoot(home);
    nativeSuggestionRoot?.classList.add(NATIVE_SUGGESTIONS_ROOT_CLASS);
    activeHomeSuggestionRoot = nativeSuggestionRoot;
    const matchedNativePresets = new Set();
    for (const button of home?.querySelectorAll?.("button") || []) {
      if (button.closest?.(`#${FALLBACK_PRESETS_ID}`)) continue;
      const text = (button.textContent || "").trim();
      const match = presetPatterns.find(([, pattern]) => pattern.test(text));
      if (!match) continue;
      button.classList.add("dream-codex-preset", match[0]);
      if (isRenderedElement(button)) matchedNativePresets.add(button);
    }
    const structuralPresetButtons = homeSuggestionButtons(nativeSuggestionRoot)
      .filter((button) => !button.closest?.(`#${FALLBACK_PRESETS_ID}`))
      .slice(0, fallbackPresetDefinitions.length);
    structuralPresetButtons.forEach((button, index) => {
      button.classList.add("dream-codex-preset", fallbackPresetDefinitions[index].className);
      if (isRenderedElement(button)) matchedNativePresets.add(button);
    });
    ensureFallbackPresets(home, matchedNativePresets.size);
    if (!home) {
      document.getElementById(FALLBACK_PRESETS_ID)?.remove();
    }

    const changedText = [...(shellMain.querySelectorAll?.("button") || [])]
      .filter((candidate) => {
        const text = (candidate.textContent || "").trim();
        const box = candidate.getBoundingClientRect?.() || { width: 0, height: 0 };
        return /(个文件已更改|files? changed)/i.test(text)
          && /\+\d+/.test(text) && /-\d+/.test(text)
          && text.length < 100 && box.width > 80 && box.width < 420 && box.height > 18 && box.height < 90;
      })
      .sort((left, right) => {
        const a = left.getBoundingClientRect?.() || { width: 0, height: 0 };
        const b = right.getBoundingClientRect?.() || { width: 0, height: 0 };
        return (a.width * a.height) - (b.width * b.height);
      })[0];
    const changedButton = changedText?.matches?.("button")
      ? changedText
      : [...(changedText?.querySelectorAll?.("button") || [])]
        .find((button) => /(?:files? changed|\u4e2a\u6587\u4ef6\u5df2\u66f4\u6539)/i.test((button.textContent || "").trim()));
    const changedPill = changedButton
      || changedText?.closest?.("button")
      || changedText?.closest?.('[class*="rounded-3xl"][class*="border"]')
      || changedText?.parentElement;
    const changedBarrier = changedPill?.parentElement?.closest?.(':not(button)[class*="rounded-3xl"][class*="border"]') || null;
    const changedClipHost = changedPill?.parentElement?.closest?.(
      ':not(button)[class~="overflow-hidden"][class~="rounded-3xl"]',
    ) || null;
    document.querySelectorAll(".dream-changes-pill").forEach((node) => {
      if (node !== changedPill) node.classList.remove("dream-changes-pill");
    });
    document.querySelectorAll(`.${CHANGES_SHELL_CLASS}`).forEach((node) => {
      if (node !== changedBarrier) node.classList.remove(CHANGES_SHELL_CLASS);
    });
    document.querySelectorAll(`.${CHANGES_CLIP_HOST_CLASS}`).forEach((node) => {
      if (node !== changedClipHost) node.classList.remove(CHANGES_CLIP_HOST_CLASS);
    });
    changedPill?.classList.add("dream-changes-pill");
    if (changedBarrier && changedBarrier !== changedPill) changedBarrier.classList.add(CHANGES_SHELL_CLASS);
    if (changedClipHost && changedClipHost !== changedPill) changedClipHost.classList.add(CHANGES_CLIP_HOST_CLASS);

    if (summaryPanel) {
      const composerBarrier = document.querySelector(COMPOSER_SELECTOR);
      const barrier = changedBarrier || composerBarrier;
      const panelBox = summaryPanel.getBoundingClientRect?.();
      const barrierBox = barrier?.getBoundingClientRect?.();
      if (panelBox && barrierBox && panelBox.top < barrierBox.top) {
        const safeHeight = Math.max(128, Math.floor(barrierBox.top - panelBox.top - 12));
        summaryPanel.style?.setProperty?.("--dream-summary-safe-height", `${safeHeight}px`);
      }
    }

    let chrome = document.getElementById(CHROME_ID);
    if (!chrome || chrome.parentElement !== document.body) {
      chrome?.remove();
      chrome = document.createElement("div");
      chrome.id = CHROME_ID;
      chrome.setAttribute("aria-hidden", "true");
      document.body.appendChild(chrome);
    }
    const ornamentsIntact = chrome.dataset.dreamOrnaments === "7"
      && (typeof chrome.querySelector !== "function"
        || (chrome.querySelector(".dream-angel-blink") && chrome.querySelector(".dream-angel-live-ticker")));
    if (!ornamentsIntact) {
      chrome.innerHTML = `
        <div class="dream-angel-stage">
          <i class="dream-angel-frame"></i>
          <i class="dream-angel-face-orbit"><b></b></i>
          <div class="dream-angel-blink">
            <svg viewBox="0 0 220 104" aria-hidden="true" focusable="false" shape-rendering="crispEdges">
              <g class="dream-blink-frame dream-blink-half">
                <g class="dream-blink-eye dream-blink-eye-left">
                  <path class="dream-blink-pixel-skin" d="M23 27H47V29H55V31H59V33H63V35H67V39H69V43H71V47H73V49H69V47H63V49H57V51H47V49H39V47H33V45H29V43H25V39H21V35H19V31H17V29H21V27Z"/>
                  <g class="dream-blink-pixel-lid">
                    <rect x="19" y="31" width="4" height="4"/><rect x="23" y="35" width="6" height="4"/><rect x="29" y="39" width="6" height="4"/><rect x="35" y="43" width="6" height="4"/><rect x="41" y="47" width="8" height="4"/><rect x="49" y="49" width="8" height="4"/><rect x="57" y="51" width="6" height="4"/><rect x="63" y="49" width="6" height="4"/><rect x="69" y="47" width="4" height="4"/>
                  </g>
                </g>
                <g class="dream-blink-eye dream-blink-eye-right">
                  <path class="dream-blink-pixel-skin" d="M151 33H173V35H181V37H187V39H191V41H195V43H199V45H201V49H197V47H189V49H181V51H173V53H159V51H151V49H143V47H137V45H131V43H127V41H129V39H133V37H143V35H151Z"/>
                  <g class="dream-blink-pixel-lid">
                    <rect x="127" y="41" width="4" height="4"/><rect x="131" y="43" width="6" height="4"/><rect x="137" y="45" width="6" height="4"/><rect x="143" y="47" width="8" height="4"/><rect x="151" y="49" width="8" height="4"/><rect x="159" y="51" width="14" height="4"/><rect x="173" y="53" width="8" height="4"/><rect x="181" y="51" width="8" height="4"/><rect x="189" y="49" width="8" height="4"/><rect x="197" y="47" width="4" height="4"/>
                  </g>
                </g>
              </g>
              <g class="dream-blink-frame dream-blink-closed">
                <g class="dream-blink-eye dream-blink-eye-left">
                  <path class="dream-blink-pixel-skin" d="M23 27H47V29H55V31H59V33H63V35H67V39H69V43H71V47H73V61H71V67H69V71H67V75H65V79H61V81H55V79H51V75H47V71H43V67H39V63H35V59H33V55H31V51H29V47H27V43H23V39H21V35H19V31H17V29H21V27Z"/>
                  <g class="dream-blink-pixel-lid">
                    <rect x="19" y="39" width="4" height="4"/><rect x="23" y="43" width="6" height="4"/><rect x="29" y="47" width="6" height="4"/><rect x="35" y="51" width="6" height="4"/><rect x="41" y="55" width="8" height="4"/><rect x="49" y="59" width="8" height="4"/><rect x="57" y="61" width="6" height="4"/><rect x="63" y="59" width="6" height="4"/><rect x="69" y="55" width="4" height="4"/>
                  </g>
                </g>
                <g class="dream-blink-eye dream-blink-eye-right">
                  <path class="dream-blink-pixel-skin" d="M151 33H173V35H181V37H187V39H191V41H195V43H199V45H201V49H199V57H199V61H197V65H195V69H193V73H189V77H185V81H181V83H177V85H163V83H157V81H153V77H147V73H141V69H139V65H137V61H133V57H133V53H131V49H129V45H127V41H127V39H129V37H133V35H143V33Z"/>
                  <g class="dream-blink-pixel-lid">
                    <rect x="127" y="47" width="4" height="4"/><rect x="131" y="49" width="6" height="4"/><rect x="137" y="53" width="6" height="4"/><rect x="143" y="57" width="8" height="4"/><rect x="151" y="61" width="8" height="4"/><rect x="159" y="65" width="18" height="4"/><rect x="177" y="63" width="8" height="4"/><rect x="185" y="59" width="8" height="4"/><rect x="193" y="55" width="8" height="4"/>
                  </g>
                </g>
              </g>
            </svg>
          </div>
          <i class="dream-angel-halo"></i>
          <div class="dream-angel-live-ticker"><b>&hearts; LIVE CHAT</b><span><i>CHOTEN ONLINE 9999+</i><i>BLESS YOUR CODE</i><i>INTERNET ANGEL FOREVER</i><i>&#25512; +1 +1 +1</i></span></div>
          <div class="dream-angel-id-chip"><b>KANGEL.SYS</b><span>STREAM ID 01</span><i>ONLINE</i></div>
          <div class="dream-angel-telemetry">
            <div data-meter="love"><span>&hearts; AFFECTION</span><b><i></i></b><em>9999+</em></div>
            <div data-meter="stress"><span>! STRESS</span><b><i></i></b><em>082</em></div>
            <div data-meter="dark"><span>&#9673; DARK</span><b><i></i></b><em>066</em></div>
          </div>
          <div class="dream-angel-chat-rain">
            <i>&hearts;</i><i>&#31070;</i><i>+1</i><i>!!!</i><i>&#25512;</i>
          </div>
          <i class="dream-angel-signal-wave"></i>
          <div class="dream-angel-dose-strip"><i></i><i></i><i></i><b>+ DOSE 03</b></div>
          <div class="dream-angel-window-stack"><i></i><i></i><b>CHAT OVERLOAD</b><em>9999+</em></div>
          <div class="dream-angel-reaction-deck"><i>&hearts; KAWAII</i><i>&#31070; ANGEL</i><i>+1 LOVE</i></div>
          <div class="dream-angel-heartbeat"><b>LOVE SIGNAL</b><span></span><em>98%</em></div>
          <div class="dream-angel-now-playing"><span>&#9835; NOW PLAYING</span><b>INTERNET OVERDOSE</b><i></i></div>
          <i class="dream-angel-spark-field"></i>
          <div class="dream-angel-webcam-card"><i></i><b>KANGEL CAM / 01</b><em>&hearts;</em></div>
        </div>`;
      chrome.dataset.dreamOrnaments = "7";
    }
    syncChromeGeometry(chrome, shellMain, home);
  };

  const scheduler = {
    frame: null,
    timeout: null,
    navigationTimer: null,
    navigationConfirmTimer: null,
    dueAt: 0,
    lastRunAt: -Infinity,
    running: false,
    pending: false,
  };
  const rendererMetrics = {
    ensureCount: 0,
    ensureTotalMs: 0,
    ensureLastMs: 0,
    ensureMaxMs: 0,
    observerBatches: 0,
    observerRecords: 0,
    safePartRefreshCount: 0,
    safePartPruneCount: 0,
    fallbackProbeCount: 0,
    fallbackEnsureCount: 0,
  };
  let compositionDepth = 0;
  const sidebarScrollQuiet = { target: null, timer: null };
  let lastInteractionAt = -Infinity;
  let lastEnsureErrorLogAt = -Infinity;
  const schedulerNow = () => {
    try {
      if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now();
      }
    } catch {}
    return Date.now();
  };
  const observeRendererStructure = () => {
    if (!observer) return;
    observer.disconnect();
    const root = document.documentElement;
    const body = document.body;
    const shellMain = document.querySelector(SHELL_MAIN_SELECTOR) || document.querySelector("main");
    const attributeOptions = {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["class", "data-theme", "data-appearance", "data-color-mode"],
    };
    if (root) observer.observe(root, attributeOptions);
    if (body) observer.observe(body, { ...attributeOptions, childList: true });
    if (shellMain) observer.observe(shellMain, { childList: true });
    const suggestionRoot = activeHomeSuggestionRoot?.isConnected === false
      ? null
      : activeHomeSuggestionRoot;
    if (suggestionRoot) {
      observer.observe(suggestionRoot, { childList: true, subtree: true });
      let parent = suggestionRoot.parentElement;
      while (parent && parent !== activeHomeSurface && activeHomeSurface?.contains?.(parent)) {
        observer.observe(parent, { childList: true });
        parent = parent.parentElement;
      }
      if (activeHomeSurface && activeHomeSurface !== suggestionRoot) {
        observer.observe(activeHomeSurface, { childList: true });
      }
    } else if (activeHomeSurface && activeHomeSurface.isConnected !== false && (
      activeHomeSurface !== shellMain ||
      root?.classList?.contains?.("dream-presets-ready")
    )) {
      /* While fallback cards are active and the native deck has not mounted,
         watch the active Home subtree even when Home is the shell itself.
         Once a stable deck exists, the observer narrows back to that root. */
      observer.observe(activeHomeSurface, { childList: true, subtree: true });
    }
  };
  const runEnsureSafely = () => {
    if (scheduler.running) {
      scheduler.pending = true;
      return false;
    }
    const startedAt = schedulerNow();
    scheduler.running = true;
    rendererMetrics.ensureCount += 1;
    observer?.disconnect();
    try {
      ensure();
      return true;
    } catch (error) {
      if (startedAt - lastEnsureErrorLogAt >= ENSURE_ERROR_LOG_INTERVAL_MS) {
        lastEnsureErrorLogAt = startedAt;
        try {
          if (typeof console !== "undefined") {
            console.error?.(`[dream-skin] renderer refresh failed: ${error?.message || String(error)}`);
          }
        } catch {}
      }
      return false;
    } finally {
      const finishedAt = schedulerNow();
      const duration = Math.max(0, finishedAt - startedAt);
      rendererMetrics.ensureLastMs = duration;
      rendererMetrics.ensureTotalMs += duration;
      rendererMetrics.ensureMaxMs = Math.max(rendererMetrics.ensureMaxMs, duration);
      scheduler.lastRunAt = finishedAt;
      scheduler.running = false;
      observer?.takeRecords?.();
      observeRendererStructure();
      if (scheduler.pending) {
        scheduler.pending = false;
        scheduleEnsure(DOM_REFRESH_DEBOUNCE_MS);
      }
    }
  };

  const cleanup = () => {
    const state = window[STATE_KEY];
    if (state?.installToken !== installToken) return false;
    window.__CODEX_DREAM_SKIN_DISABLED__ = true;
    clearSkinDom();
    state?.observer?.disconnect();
    state?.resizeObserver?.disconnect();
    if (state?.timer) clearInterval(state.timer);
    if (state?.scheduler?.timeout) clearTimeout(state.scheduler.timeout);
    if (state?.scheduler?.navigationTimer) clearTimeout(state.scheduler.navigationTimer);
    if (state?.scheduler?.navigationConfirmTimer) clearTimeout(state.scheduler.navigationConfirmTimer);
    if (state?.scheduler?.frame) window.cancelAnimationFrame?.(state.scheduler.frame);
    if (state?.geometryScheduler?.frame) {
      window.cancelAnimationFrame?.(state.geometryScheduler.frame);
    }
    if (state?.geometryScheduler?.settleTimer) {
      clearTimeout(state.geometryScheduler.settleTimer);
    }
    if (state?.resizeHandler) window.removeEventListener("resize", state.resizeHandler);
    if (state?.navigationHandler) {
      window.removeEventListener("popstate", state.navigationHandler);
      document.removeEventListener("click", state.navigationHandler, true);
    }
    if (state?.interactionHandler) {
      document.removeEventListener("compositionstart", state.interactionHandler, true);
      document.removeEventListener("compositionend", state.interactionHandler, true);
      document.removeEventListener("beforeinput", state.interactionHandler, true);
      document.removeEventListener("wheel", state.interactionHandler, true);
      document.removeEventListener("scroll", state.interactionHandler, true);
    }
    if (state?.sidebarScrollHandler) {
      document.removeEventListener("wheel", state.sidebarScrollHandler, true);
      document.removeEventListener("scroll", state.sidebarScrollHandler, true);
    }
    clearSidebarScrollQuiet(state?.sidebarScrollQuiet);
    state?.motionQuery?.removeEventListener?.("change", state.motionHandler);
    if (state?.artUrl) URL.revokeObjectURL(state.artUrl);
    delete window[STATE_KEY];
    return true;
  };

  const scheduleEnsure = (settleMs = 0) => {
    if (scheduler.running) {
      scheduler.pending = true;
      return;
    }
    const now = schedulerNow();
    const quietUntil = Number.isFinite(lastInteractionAt)
      ? lastInteractionAt + INTERACTION_QUIET_MS
      : now;
    const dueAt = Math.max(now + Math.max(0, settleMs), quietUntil);
    const delay = Math.max(0, dueAt - now);
    if (scheduler.frame) {
      window.cancelAnimationFrame?.(scheduler.frame);
      scheduler.frame = null;
    }
    if (scheduler.timeout) clearTimeout(scheduler.timeout);
    scheduler.timeout = null;
    scheduler.dueAt = 0;
    const runEnsure = () => {
      scheduler.frame = null;
      scheduler.timeout = null;
      scheduler.dueAt = 0;
      runEnsureSafely();
    };
    const queueFrame = () => {
      scheduler.timeout = null;
      scheduler.dueAt = 0;
      if (compositionDepth > 0 || schedulerNow() < lastInteractionAt + INTERACTION_QUIET_MS) {
        scheduleEnsure(INTERACTION_QUIET_MS);
        return;
      }
      if (typeof window.requestAnimationFrame === "function") {
        scheduler.frame = window.requestAnimationFrame(runEnsure);
      } else {
        scheduler.timeout = setTimeout(runEnsure, 0);
      }
    };
    if (delay > 1) {
      scheduler.dueAt = dueAt;
      scheduler.timeout = setTimeout(queueFrame, delay);
    } else queueFrame();
  };
  const withoutManagedClasses = (value) => String(value || "")
    .split(/\s+/)
    .filter((className) => className && className !== "codex-dream-skin" && !className.startsWith("dream-"))
    .sort()
    .join(" ");
  const isInjectedNode = (node) => node?.nodeType === 1 && [
    CHROME_ID,
    FALLBACK_PRESETS_ID,
    SIDEBAR_CHROME_ID,
    SIDE_WORKSPACE_BRAND_ID,
    "chatgpt-dream-skin-operation",
  ].includes(node.id);
  const shellTopologySelector = [
    SHELL_MAIN_SELECTOR,
    "main",
    '[role="main"]',
    "header",
    SIDEBAR_SELECTOR,
    "nav",
    '[role="tabpanel"]',
    '[role="dialog"]',
    '[role="menu"]',
    '[role="listbox"]',
    '[class*="contain:layout_paint"]',
  ].join(", ");
  const hasNativeStructuralNode = (record) =>
    [...(record.addedNodes || []), ...(record.removedNodes || [])]
      .some((node) => node?.nodeType === 1 && !isInjectedNode(node)
        && (node.matches?.(shellTopologySelector) || node.querySelector?.(shellTopologySelector)));
  const hasFloatingSidebarNode = (record) =>
    [...(record.addedNodes || []), ...(record.removedNodes || [])]
      .some((node) => node?.nodeType === 1 && !isInjectedNode(node) && (
        node.matches?.(FLOATING_SIDEBAR_SELECTOR) || node.querySelector?.(FLOATING_SIDEBAR_SELECTOR)
      ));
  const classifyRuntimeSurfaces = (records) => {
    const roots = records
      .flatMap((record) => [...(record.addedNodes || [])])
      .filter((node) => node?.nodeType === 1 && !isInjectedNode(node));
    if (!roots.length) return false;
    const runtimeSurfaceHintSelector = [
      '[role="tooltip"]',
      '[data-radix-tooltip-content]',
      '[role="tooltip"] div[class~="w-80"][class*="bg-token-dropdown-background"]',
      'div.vertical-scroll-fade-mask[class~="overflow-y-auto"]',
      '[role="menu"]',
      '[role="listbox"]',
      '[data-radix-menu-content]',
      'input[placeholder*="optional comment" i]',
      'textarea[placeholder*="optional comment" i]',
      '.xterm',
      '[data-sonner-toast]',
      '[role="alert"]',
      '[class*="group/summary-panel-item"]',
    ].join(", ");
    const hasRuntimeSurface = roots.some((root) =>
      root.matches?.(runtimeSurfaceHintSelector) || root.querySelector?.(runtimeSurfaceHintSelector));
    if (!hasRuntimeSurface) return false;
    const select = (selector) => {
      const matches = new Set();
      for (const root of roots) {
        if (root.matches?.(selector)) matches.add(root);
        for (const node of root.querySelectorAll?.(selector) || []) matches.add(node);
      }
      return [...matches];
    };

    for (const previewSurface of select(
      '[role="tooltip"] div[class~="w-80"][class*="bg-token-dropdown-background"]',
    )) {
      previewSurface.closest?.('[role="tooltip"]')?.classList.add("dream-turn-preview-tooltip");
      previewSurface.classList.add("dream-turn-preview-surface");
      previewSurface.querySelector?.('[class~="font-medium"]')?.classList.add("dream-turn-preview-title");
      previewSurface.querySelector?.('[class*="_preview_"]')?.classList.add("dream-turn-preview-excerpt");
    }

    for (const paletteScroll of select(
      'div.vertical-scroll-fade-mask[class~="overflow-y-auto"]',
    )) {
      const palette = paletteScroll.parentElement?.matches?.(
        'div[class~="border-token-border"][class*="bg-token-dropdown-background"]' +
        '[class~="relative"][class~="overflow-hidden"][class~="rounded-2xl"][class~="p-1"]',
      ) ? paletteScroll.parentElement : null;
      if (!palette) continue;
      palette.classList.add("dream-composer-palette");
      paletteScroll.classList.add("dream-composer-palette-scroll");
      for (const heading of paletteScroll.querySelectorAll?.(
        '[class~="sticky"][class~="top-0"][class~="z-10"]',
      ) || []) heading.classList.add("dream-composer-palette-heading");
      for (const item of paletteScroll.querySelectorAll?.(
        'button[class~="w-full"][class~="shrink-0"][class~="rounded-lg"][class~="text-left"]',
      ) || []) item.classList.add("dream-composer-palette-item");
    }

    if (document.documentElement.classList.contains("dream-settings-active")) {
      for (const menu of select(
        '[role="menu"], [role="listbox"], [data-radix-menu-content], [data-slot="menu-content"]',
      )) menu.classList.add("dream-settings-menu");
    }

    const selectionPattern = /^(?:\u6dfb\u52a0\u5230\u4efb\u52a1|add to task|\u66f4\u591a\u8be6\u60c5|more details|\u5728\u4fa7\u8fb9\u804a\u5929\u4e2d\u63d0\u95ee|ask in sidebar chat)$/i;
    const selectionButtons = select('button, [role="button"]')
      .filter((button) => selectionPattern.test((button.textContent || "").trim()));
    if (selectionButtons.length) {
      selectionButtons.forEach((button) => button.classList.add("dream-selection-action"));
      let actions = selectionButtons[0].parentElement;
      while (actions && actions !== document.body
        && !selectionButtons.every((button) => actions.contains(button))) {
        actions = actions.parentElement;
      }
      actions?.classList.add("dream-selection-actions");
    }

    for (const input of select(
      'input[placeholder*="optional comment" i], textarea[placeholder*="optional comment" i], ' +
      'input[placeholder*="\u53ef\u9009\u8bc4\u8bba"], textarea[placeholder*="\u53ef\u9009\u8bc4\u8bba"]',
    )) {
      input.classList.add("dream-optional-comment-input");
      input.parentElement?.classList.add("dream-optional-comment");
    }

    for (const panel of select(
      '[class*="rounded-3xl"][class*="bg-token-dropdown-background"]' +
      ':has(> [class*="overflow-y-auto"] [class*="group/summary-panel-item"])',
    )) panel.classList.add("dream-summary-panel");

    for (const terminal of select(".xterm")) {
      const terminalRoot = terminal.closest?.('[class*="contain:layout_paint"]')
        || terminal.closest?.('[role="tabpanel"]');
      terminalRoot?.classList.add("dream-terminal-panel");
    }

    const toastPattern = /\u901f\u7387\u9650\u5236\u91cd\u7f6e\u673a\u4f1a|rate limit reset opportunity/i;
    const toastActionPattern = /\u67e5\u770b\u91cd\u7f6e\u6b21\u6570|view (?:reset|redemption)/i;
    const toast = select("div, section, aside").find((candidate) =>
      toastPattern.test((candidate.textContent || "").trim())
      && [...candidate.querySelectorAll?.("button") || []]
        .some((button) => toastActionPattern.test((button.textContent || "").trim())));
    const toastSurface = toast?.matches?.('aside[class~="rounded-2xl"]')
      ? toast
      : toast?.querySelector?.('aside[class~="rounded-2xl"]') || toast;
    toastSurface?.classList.add(SYSTEM_TOAST_CLASS);
    if (toastSurface) document.documentElement.classList.add("dream-system-toast-active");
    return true;
  };
  const resizeHandler = (event) => {
    if (event?.type === "resize") {
      if (geometryScheduler.settleTimer) clearTimeout(geometryScheduler.settleTimer);
      geometryScheduler.settleTimer = setTimeout(() => {
        geometryScheduler.settleTimer = null;
        scheduleEnsure();
      }, 300);
    }
    if (geometryScheduler.frame) return;
    const sync = () => {
      geometryScheduler.frame = null;
      const shellMain = document.querySelector(SHELL_MAIN_SELECTOR) || document.querySelector("main");
      const home = shellMain?.classList?.contains?.("dream-home-shell")
        ? document.querySelector('[role="main"].dream-home') || shellMain
        : null;
      syncChromeGeometry(document.getElementById(CHROME_ID), shellMain, home);
    };
    if (typeof window.requestAnimationFrame === "function") {
      geometryScheduler.frame = window.requestAnimationFrame(sync);
    } else {
      sync();
    }
  };
  const motionHandler = () => scheduleEnsure(100);
  const scheduleNavigationRefresh = () => {
    if (scheduler.navigationTimer) clearTimeout(scheduler.navigationTimer);
    if (scheduler.navigationConfirmTimer) clearTimeout(scheduler.navigationConfirmTimer);
    scheduler.navigationTimer = setTimeout(() => {
      scheduler.navigationTimer = null;
      scheduleEnsure(64);
    }, 48);
    scheduler.navigationConfirmTimer = setTimeout(() => {
      scheduler.navigationConfirmTimer = null;
      scheduleEnsure();
    }, NAVIGATION_CONFIRM_DELAY_MS);
  };
  const navigationHandler = (event) => {
    if (event?.type === "popstate") {
      scheduleNavigationRefresh();
      return;
    }
    const target = event?.target?.closest?.(
      'a[href], [role="link"], [role="tab"], [role="menuitem"], ' +
      '[data-settings-panel-slug], [data-app-action-sidebar-thread-row], ' +
      '[data-app-action-sidebar-select-project], button[aria-controls], ' +
      ':is(aside.app-shell-left-panel, [data-testid="app-shell-floating-left-panel"]) ' +
      'button.sidebar-item:not([aria-haspopup])',
    );
    if (target) scheduleNavigationRefresh();
  };
  const interactionHandler = (event) => {
    const target = event?.target?.nodeType === 1
      ? event.target
      : event?.target?.parentElement;
    if (!target?.closest?.(
      `${COMPOSER_SELECTOR}, [contenteditable="true"], textarea, input`,
    )) return;

    const hadScheduledWork = Boolean(
      scheduler.running || scheduler.pending || scheduler.frame || scheduler.timeout ||
      scheduler.navigationTimer || scheduler.navigationConfirmTimer,
    );
    if (event?.type === "compositionstart") compositionDepth += 1;
    if (event?.type === "compositionend") compositionDepth = Math.max(0, compositionDepth - 1);
    lastInteractionAt = schedulerNow();
    if (hadScheduledWork) scheduleEnsure(INTERACTION_QUIET_MS);
  };
  const sidebarScrollHandler = (event) => {
    const target = event?.target?.nodeType === 1
      ? event.target
      : event?.target?.parentElement;
    const surface = sidebarScrollQuietEnabled
      ? (event?.type === "scroll"
        ? (target?.matches?.(SIDEBAR_SCROLL_SELECTOR) ? target : null)
        : target?.closest?.(SIDEBAR_SCROLL_SELECTOR))
      : null;
    if (sidebarScrollQuietEnabled && surface) {
      if (sidebarScrollQuiet.target && sidebarScrollQuiet.target !== surface) {
        sidebarScrollQuiet.target.classList?.remove?.(SIDEBAR_SCROLL_QUIET_CLASS);
      }
      if (sidebarScrollQuiet.timer !== null) clearTimeout(sidebarScrollQuiet.timer);
      if (!surface.classList?.contains?.(SIDEBAR_SCROLL_QUIET_CLASS)) {
        surface.classList?.add?.(SIDEBAR_SCROLL_QUIET_CLASS);
      }
      sidebarScrollQuiet.target = surface;
      sidebarScrollQuiet.timer = setTimeout(() => {
        if (sidebarScrollQuiet.target !== surface) return;
        surface.classList?.remove?.(SIDEBAR_SCROLL_QUIET_CLASS);
        sidebarScrollQuiet.target = null;
        sidebarScrollQuiet.timer = null;
      }, SIDEBAR_SCROLL_QUIET_MS);
    }

    const hadScheduledWork = Boolean(
      scheduler.running || scheduler.pending || scheduler.frame || scheduler.timeout ||
      scheduler.navigationTimer || scheduler.navigationConfirmTimer,
    );
    if (!hadScheduledWork) return;
    const scrollingSurface = surface || target?.closest?.(
      `${SIDEBAR_SELECTOR}, .thread-scroll-container, [class~="overflow-y-auto"]`,
    );
    if (!scrollingSurface) return;
    lastInteractionAt = schedulerNow();
    scheduleEnsure(INTERACTION_QUIET_MS);
  };
  window.addEventListener("resize", resizeHandler, { passive: true });
  motionQuery?.addEventListener?.("change", motionHandler);
  window.addEventListener("popstate", navigationHandler);
  document.addEventListener("click", navigationHandler, true);
  document.addEventListener("compositionstart", interactionHandler, true);
  document.addEventListener("compositionend", interactionHandler, true);
  document.addEventListener("beforeinput", interactionHandler, true);
  document.addEventListener("wheel", sidebarScrollHandler, { capture: true, passive: true });
  document.addEventListener("scroll", sidebarScrollHandler, { capture: true, passive: true });
  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver((entries) => {
      let geometryChanged = false;
      for (const entry of entries) {
        const width = Math.round(entry.contentRect?.width || 0);
        const height = Math.round(entry.contentRect?.height || 0);
        const signature = `${width}x${height}`;
        if (resizeTargetSizes.get(entry.target) === signature) continue;
        resizeTargetSizes.set(entry.target, signature);
        geometryChanged = true;
      }
      if (geometryChanged) resizeHandler();
    });
  }
  observer = new MutationObserver((records) => {
    if (samplingNativeShell) return;
    rendererMetrics.observerBatches += 1;
    rendererMetrics.observerRecords += records.length;
    classifySafeCssParts(records);
    classifyRuntimeSurfaces(records);
    if (records.some(hasFloatingSidebarNode)) refreshSafeCssParts();
    const hasShellChange = records.some((record) => {
      if (record.type === "childList") return hasNativeStructuralNode(record);
      if (record.attributeName !== "class") return true;
      return withoutManagedClasses(record.oldValue) !==
        withoutManagedClasses(record.target?.getAttribute?.("class"));
    });
    const hasGenericComposerNode = records.some((record) =>
      [...(record.addedNodes || [])].some((node) =>
        node?.nodeType === 1 && (
          node.matches?.(
            'textarea, [contenteditable="true"], [role="textbox"], ' +
            '[class*="ComposerLayoutRoot" i], [class*="terminal-panel" i]',
          ) ||
          node.querySelector?.(
            'textarea, [contenteditable="true"], [role="textbox"], ' +
            '[class*="ComposerLayoutRoot" i], [class*="terminal-panel" i]',
          )
        )
      )
    );
    const hasHomeSuggestionChange = records.some((record) => {
      if (record.type !== "childList") return false;
      if (activeHomeSuggestionRoot && (
        record.target === activeHomeSuggestionRoot ||
        activeHomeSuggestionRoot.contains?.(record.target)
      )) return true;
      return [...(record.addedNodes || []), ...(record.removedNodes || [])]
        .some((node) => node?.nodeType === 1 && !isInjectedNode(node) && (
          node.matches?.(`${HOME_SUGGESTIONS_SELECTOR}, .${NATIVE_SUGGESTIONS_ROOT_CLASS}`) ||
          node.querySelector?.(`${HOME_SUGGESTIONS_SELECTOR}, .${NATIVE_SUGGESTIONS_ROOT_CLASS}`)
        ));
    });
    if (hasShellChange || hasGenericComposerNode || hasHomeSuggestionChange) {
      scheduleEnsure(hasHomeSuggestionChange ? 64 : DOM_REFRESH_DEBOUNCE_MS);
    }
  });
  observeRendererStructure();
  const fallbackProbe = () => {
    rendererMetrics.fallbackProbeCount += 1;
    pruneDisconnectedSafeCssParts();
    const root = document.documentElement;
    const style = document.getElementById(STYLE_ID);
    const shellMain = document.querySelector(SHELL_MAIN_SELECTOR) ||
      document.querySelector("main") ||
      document.querySelector('[role="main"]');
    if (!root?.classList?.contains("codex-dream-skin") ||
      root.getAttribute?.("data-dream-skin") !== "active" ||
      !style?.isConnected ||
      style.dataset?.dreamVersion !== STYLE_REVISION ||
      !shellMain) {
      rendererMetrics.fallbackEnsureCount += 1;
      scheduleEnsure(DOM_REFRESH_DEBOUNCE_MS);
    }
  };
  const timer = setInterval(fallbackProbe, FALLBACK_REFRESH_MS);
  const missingL1 = [
    ...(!document.querySelector(SHELL_MAIN_SELECTOR) ? ["shell-main"] : []),
    ...(!document.querySelector(SIDEBAR_SELECTOR) ? ["left-panel"] : []),
    ...(!document.querySelector(HEADER_TINT_SELECTOR) ? ["header-tint"] : []),
  ];
  const scope = {
    level: missingL1.length ? "L0" : "L1",
    baseState: "fork-windows",
    missingL1,
  };
  const runtimeState = {
    ensure: runEnsureSafely, cleanup, observer, resizeObserver, timer, scheduler, geometryScheduler,
    resizeHandler, navigationHandler, interactionHandler, sidebarScrollHandler, sidebarScrollQuiet,
    motionQuery, motionHandler,
    artUrl, profile, config, installToken, version: SKIN_VERSION,
    sidebarScrollQuietEnabled: Boolean(sidebarScrollQuietEnabled),
    themeId: config.themeId,
    revision: PAYLOAD_REVISION,
    styleMode: "style",
    styleNode: null,
    metrics: rendererMetrics,
    scope,
  };
  window[STATE_KEY] = runtimeState;
  runEnsureSafely();
  runtimeState.styleNode = document.getElementById(STYLE_ID);
  analyzeArt().then((result) => {
    const state = window[STATE_KEY];
    if (state?.installToken !== installToken || window.__CODEX_DREAM_SKIN_DISABLED__) return;
    profile = result;
    artGeometryReady = true;
    state.profile = result;
    applyProfile(document.documentElement);
    resizeHandler();
  });
  return { installed: true, version: SKIN_VERSION, revision: PAYLOAD_REVISION, adaptive: true };
})(__DREAM_CSS_JSON__, __DREAM_ART_JSON__, __DREAM_THEME_JSON__, __DREAM_SIDEBAR_SCROLL_QUIET_ENABLED_JSON__)
