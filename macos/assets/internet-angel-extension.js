(() => {
  const enabled = __INTERNET_ANGEL_EXTENSION_ENABLED_JSON__;
  const registryKey = "__CODEX_INTERNET_ANGEL_EXTENSION_STATE__";
  const componentAttribute = "data-angel-component";
  const selectors = {
    shell: 'main:is(.main-surface, [data-app-shell-main-surface], [class*="_MainContentSurface_"])',
    composer: ':is(.composer-surface-chrome, [data-composer-surface-variant], [data-ds-part="composer"])',
    composerFooter: ':is([class*="_footer_"], [data-composer-footer-responsive])',
    stickyComposer: 'main:is(.main-surface, [data-app-shell-main-surface], [class*="_MainContentSurface_"]) [class~="sticky"][class~="bottom-0"]',
    contextStrip: 'div[class~="relative"][class~="min-w-0"][class~="overflow-clip"][class~="border-x"][class~="border-t"]',
    environmentPanel: 'div:is([class*="bg-token-dropdown-background"], [class~="bg-surface-elevated-secondary"])[class~="rounded-3xl"]',
    environmentToggle: 'button[class~="group/section-toggle"]',
    environmentGit: '[data-testid*="git"], [aria-label*="git" i], [class*="git-"]',
    changesAdded: ':is([class*="git-decoration-added"], [class*="text-codex-git-added"])',
    changesDeleted: ':is([class*="git-decoration-deleted"], [class*="text-codex-git-deleted"])',
    workspace: '[class*="contain:layout_paint"], [class~="bg-token-main-surface-primary"]',
    workspaceEvidence: '[role="tablist"], [role="tabpanel"], .xterm, .thread-scroll-container',
    sidebar: 'aside.app-shell-left-panel, [data-testid="app-shell-floating-left-panel"], [data-ds-part="sidebar"]',
    paletteScroll: 'div.vertical-scroll-fade-mask[class~="overflow-y-auto"]',
    paletteHeading: '[class~="sticky"][class~="top-0"][class~="z-10"]',
    paletteItem: 'button[class~="w-full"][class~="shrink-0"][class~="rounded-lg"][class~="text-left"]',
    turnRow: 'button[class*="navigation-row"]',
    assistantMessage: '[data-markdown-text-style="assistant-message"]',
    settingsNav: 'nav:has([data-settings-panel-slug])',
    settingsContent: '[class~="scrollbar-stable"][class~="flex-1"][class~="overflow-y-auto"][class~="p-panel"]',
  };
  const mutationHintSelector = [
    selectors.composer,
    `${selectors.composer} ${selectors.composerFooter}`,
    `${selectors.stickyComposer} ${selectors.contextStrip}`,
    `${selectors.environmentPanel} button`,
    `${selectors.environmentPanel} :is(${selectors.environmentGit})`,
    selectors.environmentGit,
    selectors.workspaceEvidence,
    `:is(${selectors.sidebar})`,
    `:is(${selectors.sidebar}) :is(button, [role="button"])`,
    selectors.paletteScroll,
    `${selectors.paletteScroll} ${selectors.paletteHeading}`,
    `${selectors.paletteScroll} ${selectors.paletteItem}`,
    selectors.turnRow,
    'button[class*="navigation-row"] [class*="_marker_"]',
    '[role="tooltip"] div[class~="w-80"][class*="bg-token-dropdown-background"]',
    'button[class*="absolute"][class~="z-30"][class~="h-8"][class~="w-8"][class~="rounded-full"]',
    selectors.settingsNav,
    selectors.settingsContent,
    `${selectors.settingsContent} :is(button, input, textarea, [contenteditable="true"], [role="radiogroup"], [role="slider"])`,
    '[role="menu"]',
    '[role="listbox"]',
    '[data-sonner-toast]',
    '[data-testid*="permission"] button',
    '[data-testid*="approval"] button',
    '[role="alert"] button',
    '[data-user-message-bubble="true"]',
    '[data-content-search-unit-key$=":user"]',
    '[data-content-search-unit-key$=":assistant"]',
    '[data-response-annotation-target]',
    selectors.assistantMessage,
    '[class*="group/activity-header"]',
    '[class*="group/command"]',
    '[class*="group/output"]',
    selectors.changesAdded,
    selectors.changesDeleted,
    '.xterm',
    ':is([class*="contain:layout_paint"], [role="tabpanel"]) [class~="h-toolbar-pane"]',
    '[class*="group/summary-panel-item"]',
    '.thread-scroll-container',
    'input[placeholder*="optional comment" i]',
    'textarea[placeholder*="optional comment" i]',
    '[contenteditable="true"][data-placeholder*="optional comment" i]',
    'input[placeholder*="\u6dfb\u52a0\u53ef\u9009\u8bc4\u8bba"]',
    'textarea[placeholder*="\u6dfb\u52a0\u53ef\u9009\u8bc4\u8bba"]',
    '[contenteditable="true"][data-placeholder*="\u6dfb\u52a0\u53ef\u9009\u8bc4\u8bba"]',
    '[class*="group/turn-diff-header"]',
    '.turn-diff-default-subtitle',
    '.thread-diff-virtualized',
    '[role="tabpanel"] > [class~="h-full"][class~="min-h-0"][class~="overflow-y-auto"][class~="px-3"][class~="py-5"]',
    '[role="tabpanel"] button[class~="items-start"][class~="w-full"]',
    'diffs-container',
    `[${componentAttribute}]`,
  ].join(", ");
  const previous = window[registryKey];
  previous?.cleanup?.();

  const clearMarks = () => {
    for (const node of document.querySelectorAll(`[${componentAttribute}]`)) {
      node.removeAttribute(componentAttribute);
    }
  };
  clearMarks();
  delete window[registryKey];
  if (!enabled) return;

  const observers = [];
  const listeners = [];
  let refreshTimer = null;
  let refreshFrame = null;
  let diffRootTimer = null;
  let state = null;
  let activeMarks = null;
  let compositionDepth = 0;
  let refreshPendingAfterComposition = false;
  const diffRootRetryLimit = 12;
  let diffRootAttempts = new WeakMap();
  const diffThemeAttribute = "data-internet-angel-diff-theme";
  const attachShadowHookKey = "__CODEX_INTERNET_ANGEL_ATTACH_SHADOW_HOOK__";
  const ownedDiffStyles = new Set();
  const diffRootObservers = new Map();
  let restoreAttachShadow = null;
  const diffSurface = "color-mix(in oklab, var(--angel-adaptive-surface) 94%, var(--angel-adaptive-accent) 5%)";
  const diffSurfaceRaised = "color-mix(in oklab, var(--angel-adaptive-surface-raised) 94%, var(--angel-adaptive-accent) 6%)";
  const diffThemeCss = `
:host {
  --diffs-bg: ${diffSurface} !important;
  --diffs-fg: var(--angel-adaptive-text) !important;
  --diffs-bg-context: ${diffSurfaceRaised} !important;
  color: var(--angel-adaptive-text) !important;
  background-color: ${diffSurface} !important;
}
[data-file] {
  --diffs-bg: ${diffSurface} !important;
  --diffs-fg: var(--angel-adaptive-text) !important;
  --codex-diffs-surface: ${diffSurface} !important;
  --codex-diffs-context-surface: ${diffSurfaceRaised} !important;
  --codex-diffs-header-surface: ${diffSurfaceRaised} !important;
  --codex-diffs-separator-surface: ${diffSurfaceRaised} !important;
  --codex-diffs-hover-surface: ${diffSurfaceRaised} !important;
  color: var(--angel-adaptive-text) !important;
  background-color: ${diffSurface} !important;
  scrollbar-color: color-mix(in oklab, var(--angel-cyan) 52%, transparent) transparent;
}
:is(pre, code, [data-content], [data-gutter], [data-column-number], [data-gutter-buffer], [data-diffs-header], [data-file-info]) {
  background-color: ${diffSurface} !important;
}
:is(pre, code, [data-content], [data-line]) { color: var(--angel-adaptive-text) !important; }
:is([data-line] span, [data-line-number-content], [data-column-number]) {
  color: color-mix(in oklab, var(--angel-adaptive-text) 76%, var(--angel-adaptive-accent)) !important;
}
[data-line] span { background-color: transparent !important; }
[data-code]::-webkit-scrollbar { width: 10px !important; height: 10px !important; }
[data-code]::-webkit-scrollbar-track { background: transparent !important; }
[data-code]::-webkit-scrollbar-thumb {
  background: color-mix(in oklab, var(--angel-cyan) 52%, transparent) !important;
  border-radius: 6px !important;
}
::selection { background: color-mix(in oklab, var(--angel-pink) 38%, transparent) !important; }
`;
  const metrics = {
    classifyRuns: 0,
    scheduleRequests: 0,
    suppressedDuringComposition: 0,
    markVisits: 0,
    attributeWrites: 0,
    attributeRemovals: 0,
    totalClassifyMs: 0,
    lastClassifyMs: 0,
  };

  const mark = (node, component) => {
    if (!node?.setAttribute) return node;
    activeMarks?.add(node);
    metrics.markVisits += 1;
    if (node.getAttribute?.(componentAttribute) !== component) {
      node.setAttribute(componentAttribute, component);
      metrics.attributeWrites += 1;
    }
    return node;
  };

  const pruneDiffStyles = () => {
    for (const style of ownedDiffStyles) {
      if (style.isConnected === false) {
        style.remove?.();
        ownedDiffStyles.delete(style);
      }
    }
  };

  const syncDiffRoot = (host, root) => {
    if (!root || host?.isConnected === false || host.shadowRoot !== root) return;
    pruneDiffStyles();
    let style = root.querySelector?.(`style[${diffThemeAttribute}]`);
    if (!style) {
      style = document.createElement("style");
      style.setAttribute(diffThemeAttribute, "");
      root.appendChild(style);
    }
    if (style.textContent !== diffThemeCss) style.textContent = diffThemeCss;
    ownedDiffStyles.add(style);
    if (diffRootObservers.has(root) || typeof MutationObserver !== "function") return;
    const observer = new MutationObserver(() => {
      if (window[registryKey] === state) syncDiffRoot(host, root);
    });
    observer.observe(root, { childList: true });
    diffRootObservers.set(root, { host, observer });
  };

  const syncDiffsContainers = (resetAttempts = false) => {
    pruneDiffStyles();
    for (const [root, entry] of diffRootObservers) {
      if (entry.host?.isConnected !== false && entry.host.shadowRoot === root) continue;
      entry.observer.disconnect();
      diffRootObservers.delete(root);
    }
    if (typeof document.createElement !== "function") return;
    let needsRetry = false;
    for (const host of document.querySelectorAll("diffs-container")) {
      if (resetAttempts) diffRootAttempts.delete(host);
      const root = host?.shadowRoot;
      if (!root) {
        const attempts = diffRootAttempts.get(host) || 0;
        if (attempts < diffRootRetryLimit) {
          diffRootAttempts.set(host, attempts + 1);
          needsRetry = true;
        }
        continue;
      }
      diffRootAttempts.delete(host);
      syncDiffRoot(host, root);
    }
    if (needsRetry && diffRootTimer === null) {
      diffRootTimer = setTimeout(() => {
        diffRootTimer = null;
        if (window[registryKey] === state) syncDiffsContainers();
      }, 120);
    } else if (!needsRetry && diffRootTimer !== null) {
      clearTimeout(diffRootTimer);
      diffRootTimer = null;
    }
  };

  const installAttachShadowHook = () => {
    const prototype = globalThis.Element?.prototype;
    let original = prototype?.attachShadow;
    if (!prototype || typeof original !== "function") return;
    const inheritedHook = original[attachShadowHookKey];
    if (inheritedHook?.active === false && typeof inheritedHook.original === "function") {
      original = inheritedHook.original;
    }
    const hookState = { active: true, original };
    const hooked = function (...args) {
      const root = Reflect.apply(original, this, args);
      if (hookState.active && window[registryKey] === state
        && this.matches?.("diffs-container") && this.shadowRoot === root) {
        syncDiffRoot(this, root);
      }
      return root;
    };
    hooked[attachShadowHookKey] = hookState;
    prototype.attachShadow = hooked;
    if (prototype.attachShadow !== hooked) {
      hookState.active = false;
      return;
    }
    restoreAttachShadow = () => {
      hookState.active = false;
      if (prototype.attachShadow === hooked) prototype.attachShadow = original;
      restoreAttachShadow = null;
    };
  };

  const classText = (node) => typeof node?.className === "string"
    ? node.className
    : node?.getAttribute?.("class") || "";
  const textOf = (node) => (node?.textContent || "").trim();
  const labelOf = (node) => [
    node?.getAttribute?.("aria-label"),
    node?.getAttribute?.("title"),
    textOf(node),
  ].filter(Boolean).join(" ");
  const commonAncestor = (left, right, boundary) => {
    if (!left || !right) return null;
    if (left.parentElement && left.parentElement === right.parentElement) return left.parentElement;
    let candidate = left.parentElement;
    while (candidate && candidate !== boundary) {
      if (candidate.contains?.(right)) return candidate;
      candidate = candidate.parentElement;
    }
    return null;
  };

  const classifySidebar = () => {
    for (const sidebar of document.querySelectorAll(selectors.sidebar)) {
      mark(sidebar, "sidebar");
      const controls = [...(sidebar.querySelectorAll?.("button, [role=button]") || [])];
      const profile = controls.find((node) => /open profile menu|profile menu|account menu|\u4e2a\u4eba\u8d44\u6599|\u8d26\u6237\u83dc\u5355/i.test(labelOf(node)));
      const help = controls.find((node) => /open help menu|help menu|\u5e2e\u52a9\u83dc\u5355/i.test(labelOf(node)));
      const footer = commonAncestor(profile, help, sidebar);
      if (footer && footer !== sidebar) mark(footer, "sidebar-footer");
      for (const control of controls) {
        const label = labelOf(control);
        const classes = classText(control);
        if (control === profile) mark(control, "sidebar-profile");
        else if (control === help) mark(control, "sidebar-help");
        else if (classes.includes("group/section-toggle")) mark(control, "sidebar-section");
        else if (/^(?:new (?:chat|task)|\u65b0\u5efa(?:\u804a\u5929|\u4efb\u52a1))$/i.test(textOf(control))) {
          mark(control, "sidebar-new-task");
        } else if (/switch mode|current mode|search|\u5207\u6362\u6a21\u5f0f|\u641c\u7d22/i.test(label)) {
          mark(control, "sidebar-control");
        } else {
          mark(control, "sidebar-row");
        }
      }
    }
  };

  const classifyComposerPalette = () => {
    for (const scroll of document.querySelectorAll(selectors.paletteScroll)) {
      const palette = scroll.parentElement;
      const classes = classText(palette);
      if (!palette || !classes.includes("border-token-border")
        || !classes.includes("bg-token-dropdown-background")
        || !classes.includes("overflow-hidden") || !classes.includes("rounded-2xl")) continue;
      mark(palette, "composer-palette");
      mark(scroll, "composer-palette-scroll");
      for (const heading of scroll.querySelectorAll?.(selectors.paletteHeading) || []) {
        mark(heading, "composer-palette-heading");
      }
      for (const item of scroll.querySelectorAll?.(selectors.paletteItem) || []) {
        mark(item, "composer-palette-item");
      }
    }
  };

  const classifyTurnNavigation = () => {
    for (const row of document.querySelectorAll(selectors.turnRow)) {
      mark(row.parentElement, "turn-nav-rail");
      mark(row, "turn-nav-row");
      const marker = row.querySelector?.('[class*="_marker_"]')
        || row.firstElementChild?.firstElementChild
        || row.firstElementChild;
      if (!marker) continue;
      const active = classText(marker).split(/\s+/).includes("opacity-60")
        || marker.getAttribute?.("aria-current") === "true";
      mark(marker, active ? "turn-nav-marker-active" : "turn-nav-marker");
    }
    for (const previewSurface of document.querySelectorAll(
      '[role="tooltip"] div[class~="w-80"][class*="bg-token-dropdown-background"]',
    )) {
      mark(previewSurface.closest?.('[role="tooltip"]'), "turn-preview");
      mark(previewSurface, "turn-preview-surface");
      mark(previewSurface.querySelector?.('[class~="font-medium"]'), "turn-preview-title");
      mark(previewSurface.querySelector?.('[class*="_preview_"]'), "turn-preview-excerpt");
    }
    for (const button of document.querySelectorAll(
      'button[aria-label], button[class*="absolute"][class~="rounded-full"]',
    )) {
      const label = labelOf(button);
      const classes = classText(button);
      const semantic = /scroll.*bottom|bottom.*scroll|latest message|\u6eda\u52a8\u5230\u5e95\u90e8|\u6700\u65b0\u6d88\u606f/i.test(label);
      const structural = classes.includes("absolute") && classes.includes("z-30")
        && classes.includes("h-8") && classes.includes("w-8") && classes.includes("rounded-full");
      if (semantic || structural) mark(button, "scroll-bottom");
    }
  };

  const classifySettings = () => {
    const nav = document.querySelector(selectors.settingsNav);
    if (!nav) return;
    const sidebar = nav.closest?.(selectors.sidebar) || nav.parentElement;
    const content = sidebar?.parentElement
      ?.querySelector?.(selectors.settingsContent)
      ?.parentElement;
    mark(sidebar, "settings-sidebar");
    mark(nav, "settings-nav");
    const search = nav.querySelector?.('[role="searchbox"]');
    mark(search?.closest?.('div[class~="rounded-lg"]') || search, "settings-search");
    mark(content, "settings-content");
    const appMains = new Set();
    const surfaces = [...(content?.querySelectorAll?.(
      'div[class~="flex"][class~="flex-col"][class~="overflow-hidden"][class~="rounded-2xl"]',
    ) || [])].filter((surface) => {
      const box = surface.getBoundingClientRect?.() || { width: 0, height: 0 };
      return box.width >= 320 && box.height >= 44 && (surface.childElementCount || 0) > 0;
    });
    for (const surface of surfaces) {
      mark(surface, "settings-surface");
      for (const row of surface.children || []) {
        const box = row.getBoundingClientRect?.() || { width: 0, height: 0 };
        if ((row.tagName === "DIV" || !row.tagName) && box.width >= 260 && box.height >= 36) {
          mark(row, "settings-row");
        }
      }
      const appSelector = 'button[class~="appearance-none"][class~="bg-transparent"][class~="p-0"][class~="text-left"]';
      if (surface.querySelector?.(appSelector)) {
        for (const row of surface.children || []) {
          const appMain = row.querySelector?.(appSelector);
          if (!appMain) continue;
          appMains.add(appMain);
          mark(row, "settings-app-row");
        }
      }
    }
    for (const control of content?.querySelectorAll?.(
      'button, input, textarea, [contenteditable="true"], [role="radiogroup"], [role="slider"]',
    ) || []) {
      if (appMains.has(control)) mark(control, "settings-app-main");
      else if (control.matches?.('input, textarea, [contenteditable="true"]')) mark(control, "settings-input");
      else if (control.matches?.('[role="radiogroup"]')) {
        mark(control, "settings-segment-group");
        for (const segment of control.querySelectorAll?.('button, [role="radio"]') || []) {
          mark(segment, "settings-segment");
        }
      } else mark(control, "settings-control");
    }
    for (const group of content?.querySelectorAll?.(
      'div[class~="rounded-lg"]:has(> button + button), div[class~="rounded-xl"]:has(> button + button)',
    ) || []) {
      const box = group.getBoundingClientRect?.() || { width: 0, height: 0 };
      if (box.width <= 52 || box.width >= 520 || box.height < 24 || box.height > 64) continue;
      mark(group, "settings-segment-group");
      for (const segment of group.querySelectorAll?.(':scope > button') || []) mark(segment, "settings-segment");
    }
    for (const trigger of content?.querySelectorAll?.('button[aria-haspopup][aria-controls]') || []) {
      const menu = document.getElementById?.(trigger.getAttribute?.("aria-controls"));
      mark(menu, "settings-menu");
    }
    for (const menu of document.querySelectorAll('[role="menu"], [role="listbox"]')) {
      mark(menu, "settings-menu");
    }
  };

  const classifyComposer = () => {
    for (const composer of document.querySelectorAll(selectors.composer)) {
      mark(composer, "composer");
      mark(composer.querySelector?.(selectors.composerFooter), "composer-footer");
      mark(composer.querySelector?.('[contenteditable="true"]'), "composer-input");
      for (const button of composer.querySelectorAll?.("button") || []) {
        mark(button, "composer-action");
      }
    }
  };

  const classifyComposerContext = () => {
    const goalStepPattern = /^(?:\u7b2c\s*\d+\s*\/\s*\d+\s*\u6b65|step\s*\d+\s*\/\s*\d+)$/i;
    const activeGoalPattern = /^(?:\u8fdb\u884c\u4e2d\u7684\u76ee\u6807|active goal)$/i;
    for (const sticky of document.querySelectorAll(selectors.stickyComposer)) {
      for (const strip of sticky.querySelectorAll?.(selectors.contextStrip) || []) {
        mark(strip, "context-strip");
      }
      const labels = [...(sticky.querySelectorAll?.("span") || [])];
      const activeGoalLabel = labels.find((node) => activeGoalPattern.test((node.textContent || "").trim()));
      const activeGoalStrip = activeGoalLabel?.closest?.(selectors.contextStrip);
      if (activeGoalStrip) mark(activeGoalStrip, "active-goal-strip");
      const stepLabel = labels.find((node) => goalStepPattern.test((node.textContent || "").trim()));
      const step = stepLabel?.closest?.('span[class~="inline-flex"]') || stepLabel?.parentElement || null;
      const progress = step?.closest?.('div[class~="rounded-3xl"][class~="items-center"]') || null;
      mark(step, "goal-step");
      mark(progress, "goal-progress");
    }
    const goalModePattern = /^(?:\u76ee\u6807|goal)$/i;
    const goalMode = [...document.querySelectorAll(selectors.composer)]
      .flatMap((composer) => [...(composer.querySelectorAll?.("button") || [])])
      .find((button) => /\u76ee\u6807|goal/i.test(button.getAttribute?.("aria-label") || "")
        || goalModePattern.test(textOf(button)));
    mark(goalMode, "goal-mode-trigger");
  };

  const classifyEnvironment = () => {
    for (const panel of document.querySelectorAll(selectors.environmentPanel)) {
      const toggles = [...(panel.querySelectorAll?.(selectors.environmentToggle) || [])];
      const buttons = [...(panel.querySelectorAll?.("button") || [])];
      const floatingHost = panel.closest?.('[class~="absolute"][class~="z-40"]');
      const popoverHost = panel.closest?.('[data-radix-popper-content-wrapper]');
      const box = panel.getBoundingClientRect?.() || { left: 0, width: 0, height: 0, right: 0 };
      const right = Number.isFinite(box.right) ? box.right : box.left + box.width;
      const edgeTolerance = popoverHost ? 160 : 64;
      const rightFloating = box.width >= 240 && box.width <= 520 && box.height >= 96
        && box.height <= 760 && right >= innerWidth - edgeTolerance;
      const structuralGitSignal = Boolean(panel.querySelector?.(selectors.environmentGit));
      const text = (panel.textContent || "").trim().slice(0, 1200);
      const semanticSignals = [
        /environment|\u73af\u5883/i,
        /changes?|\u66f4\u6539/i,
        /local|branch|commit|compare|\u5206\u652f|\u63d0\u4ea4|\u6bd4\u8f83/i,
      ].filter((pattern) => pattern.test(text)).length;
      if ((!floatingHost && !popoverHost) || !toggles.length || buttons.length < 2 || !rightFloating
        || (!structuralGitSignal && semanticSignals < 2)) continue;
      mark(panel, "environment");
      for (const toggle of toggles) {
        mark(toggle, "environment-header");
        if (toggle.parentElement && toggle.parentElement !== panel) {
          mark(toggle.parentElement, "environment-section");
        }
      }
      for (const button of buttons) {
        if (!toggles.includes(button)) mark(button, "environment-action");
      }
    }
  };

  const classifyChanges = () => {
    const changedPattern = /(?:\d+\s+files?\s+changed|files?\s+changed|\u4e2a\u6587\u4ef6\u5df2\u66f4\u6539|\u5df2\u66f4\u6539\s*\d+\s*\u4e2a\u6587\u4ef6)/i;
    const candidates = [...document.querySelectorAll(
      `button:has(${selectors.changesAdded}):has(${selectors.changesDeleted})`,
    )].filter((button) => changedPattern.test(textOf(button)));
    for (const pill of candidates) {
      const wrapper = pill.parentElement;
      const shell = wrapper?.closest?.(':not(button)[class*="rounded-3xl"][class*="border"]') || null;
      const clipHost = wrapper?.closest?.(
        ':not(button)[class~="overflow-hidden"][class~="rounded-3xl"]',
      ) || null;
      mark(shell, "changes-shell");
      mark(clipHost, "changes-clip-host");
      mark(pill, "changes-pill");
    }
  };

  const classifyWorkspaces = () => {
    const candidates = [...document.querySelectorAll(selectors.workspace)].filter((candidate) => {
      const evidence = candidate.querySelector?.(selectors.workspaceEvidence);
      if (!evidence) return false;
      const box = candidate.getBoundingClientRect?.() || { left: 0, width: 0, height: 0, right: 0 };
      const inRightAside = candidate.closest?.("aside")
        && !candidate.closest?.(selectors.sidebar);
      if (inRightAside) return box.height >= 180;
      const right = Number.isFinite(box.right) ? box.right : box.left + box.width;
      return box.width >= 260 && box.height >= 180
        && box.left >= innerWidth * .45 && right >= innerWidth - 48 && right <= innerWidth + 16;
    });
    candidates.sort((left, right) => {
      const a = left.getBoundingClientRect?.() || { width: 0, height: 0 };
      const b = right.getBoundingClientRect?.() || { width: 0, height: 0 };
      return (a.width * a.height) - (b.width * b.height);
    });
    mark(candidates[0], "side-workspace");
  };

  const classifyPermissions = () => {
    for (const candidate of document.querySelectorAll(
      '[data-testid*="permission"], [data-testid*="approval"], [role="alert"]',
    )) {
      const text = (candidate.textContent || "").trim();
      const actions = candidate.querySelectorAll?.("button") || [];
      if (actions.length && /access|permission|approval|\u8bbf\u95ee|\u6743\u9650|\u6279\u51c6/i.test(text)) {
        mark(candidate, "permission");
      }
    }
  };

  const classifyConversation = () => {
    for (const bubble of document.querySelectorAll('[data-user-message-bubble="true"]')) {
      mark(bubble, "message-user");
    }
    for (const message of document.querySelectorAll(selectors.assistantMessage)) {
      mark(message, "message-assistant");
    }
    for (const unit of document.querySelectorAll('[data-content-search-unit-key$=":user"]')) {
      for (const action of unit.querySelectorAll?.(
        '[class*="flex-row-reverse"][class*="items-center"] button[aria-label]',
      ) || []) {
        mark(action, "message-action");
      }
    }
    for (const unit of document.querySelectorAll('[data-content-search-unit-key$=":assistant"]')) {
      const message = unit.querySelector?.('[data-response-annotation-target]') || unit.firstElementChild;
      mark(message, "message-assistant");
      for (const action of message?.querySelectorAll?.(
        ':scope > [class*="items-center"][class*="h-5"] button[aria-label]',
      ) || []) {
        mark(action, "message-action");
      }
    }
    const activities = new Set();
    for (const header of document.querySelectorAll('[class*="group/activity-header"]')) {
      let activity = header.parentElement;
      while (activity && activity !== document.body
        && activity.getAttribute?.("data-local-conversation-item-target-ids") === null) {
        activity = activity.parentElement;
      }
      if (!activity || activity === document.body) {
        activity = header.closest?.(
          'div[class~="text-size-chat"][class~="relative"][class~="overflow-visible"]',
        ) || header.parentElement;
      }
      if (activity) activities.add(activity);
    }
    for (const activity of activities) {
      const headers = [...(activity.querySelectorAll?.('[class*="group/activity-header"]') || [])];
      const commands = [...(activity.querySelectorAll?.('[class*="group/command"]') || [])];
      const outputs = [...(activity.querySelectorAll?.('[class*="group/output"]') || [])];
      if (!headers.length && !commands.length && !outputs.length) continue;
      mark(activity, "activity");
      headers.forEach((header) => mark(header, "activity-header"));
      commands.forEach((command) => mark(command, "activity-command"));
      outputs.forEach((output) => mark(output, "activity-output"));
      for (const output of outputs) {
        let detail = output.parentElement;
        while (detail && detail !== activity
          && !detail.querySelector?.('[class*="group/command"]')) detail = detail.parentElement;
        if (!detail || detail === activity) detail = commonAncestor(commands[0], output, activity);
        if (detail && detail !== activity) mark(detail, "activity-detail");
      }
    }
  };

  const classifyAuxiliarySurfaces = () => {
    const terminal = document.querySelector(".xterm");
    const terminalPanel = terminal?.closest?.('[class*="contain:layout_paint"]')
      || terminal?.closest?.('[role="tabpanel"]')
      || document.querySelector(
        '[class*="contain:layout_paint"]:has(> [class~="h-toolbar-pane"] [role="tablist"])',
      );
    mark(terminalPanel, "terminal-panel");
    const terminalToolbar = terminalPanel?.querySelector?.('[class~="h-toolbar-pane"]')
      || terminalPanel?.querySelector?.('[role="tablist"]')?.parentElement;
    mark(terminalToolbar, "terminal-toolbar");
    for (const tab of terminalPanel?.querySelectorAll?.('[role="tab"]') || []) mark(tab, "terminal-tab");

    for (const summary of document.querySelectorAll(
      '[class*="rounded-3xl"][class*="bg-token-dropdown-background"]:has(> [class*="overflow-y-auto"] [class*="group/summary-panel-item"])',
    )) {
      if (activeMarks?.has(summary)
        && summary.getAttribute?.(componentAttribute) === "environment") continue;
      mark(summary, "summary-panel");
    }

    for (const aside of document.querySelectorAll(`${selectors.shell} aside`)) {
      if (!aside.querySelector?.(".thread-scroll-container") || !aside.querySelector?.(selectors.composer)) continue;
      mark(aside.querySelector?.(':scope > [class*="contain:layout_paint"]')
        || aside.querySelector?.('[class*="contain:layout_paint"]')
        || aside.firstElementChild, "side-chat");
    }
  };

  const classifySelectionAndDiffs = () => {
    const selectionPattern = /^(?:\u6dfb\u52a0\u5230\u4efb\u52a1|add to task|\u66f4\u591a\u8be6\u60c5|more details|\u5728\u4fa7\u8fb9\u804a\u5929\u4e2d\u63d0\u95ee|ask in sidebar chat)$/i;
    const selectionButtons = [...document.querySelectorAll("button, [role=button]")]
      .filter((button) => selectionPattern.test(textOf(button)));
    for (const button of selectionButtons) mark(button, "selection-action");
    if (selectionButtons.length) {
      let actions = selectionButtons[0].parentElement;
      while (actions && actions !== document.body
        && !selectionButtons.every((button) => actions.contains?.(button))) {
        actions = actions.parentElement;
      }
      if (actions && actions !== document.body) mark(actions, "selection-actions");
    }

    const selectedPattern = /^\d+\s*(?:\u4e2a)?\s*(?:\u5df2\u9009\u6587\u672c\u7247\u6bb5|selected text (?:fragment|snippet)s?)$/i;
    const selectedLabel = [...document.querySelectorAll("button, div, span")]
      .find((node) => selectedPattern.test(textOf(node)));
    mark(selectedLabel?.closest?.("button") || selectedLabel?.closest?.('[class*="rounded"]') || selectedLabel,
      "selected-fragment");

    const optionalInput = [...document.querySelectorAll('input, textarea, [contenteditable="true"]')]
      .find((node) => /\u6dfb\u52a0\u53ef\u9009\u8bc4\u8bba|optional comment/i.test(
        node.getAttribute?.("placeholder") || node.getAttribute?.("data-placeholder") || "",
      ));
    mark(optionalInput, "optional-comment-input");
    if (optionalInput) {
      let frame = optionalInput.parentElement;
      while (frame && frame !== document.body) {
        const box = frame.getBoundingClientRect?.() || { width: 0, height: 0 };
        if (box.width >= 120 && box.width < 720 && box.height >= 32 && box.height < 104) break;
        frame = frame.parentElement;
      }
      if (frame && frame !== document.body) mark(frame, "optional-comment");
    }

    const editedTitlePattern = /^(?:\u5df2\u7f16\u8f91|edited)(?:\s+|[:\uff1a]\s*)\S/i;
    const undoPattern = /^(?:\u64a4\u9500|undo)$/i;
    const reviewPattern = /^(?:\u5ba1\u6838|review)$/i;
    for (const header of document.querySelectorAll('[class*="group/turn-diff-header"]')) {
      const title = [...(header.querySelectorAll?.('span[class~="font-medium"][class*="text-token-foreground"]') || [])]
        .find((node) => editedTitlePattern.test(textOf(node)));
      const card = header.parentElement?.matches?.('[class*="--thread-resource-card-row-padding-x:"]')
        ? header.parentElement
        : header.closest?.('[class*="rounded-lg"][class*="bg-token-dropdown-background"]');
      const stats = card?.querySelector?.(".turn-diff-default-subtitle");
      const buttons = [...(card?.querySelectorAll?.("button, [role=button]") || [])];
      const undo = buttons.find((button) => undoPattern.test(textOf(button)));
      const review = buttons.find((button) => reviewPattern.test(textOf(button)));
      if (!title || !card || !stats || !undo || !review) continue;
      const icon = header.querySelector?.('[class~="size-10"][class~="rounded-lg"]:has(> svg)');
      const actions = commonAncestor(undo, review, card);
      const files = card.querySelector?.(
        ':scope > [class~="flex"][class~="flex-col"][class~="border-t"]',
      ) || card.querySelector?.(".thread-diff-virtualized")?.parentElement;
      mark(card, "edited-card");
      mark(header, "edited-card-header");
      mark(icon, "edited-card-icon");
      mark(title, "edited-card-title");
      mark(stats, "edited-card-stats");
      if (actions && actions !== card) mark(actions, "edited-card-actions");
      mark(undo, "edited-card-undo");
      mark(review, "edited-card-review");
      mark(files, "edited-card-files");
      for (const row of files?.querySelectorAll?.(".thread-diff-virtualized") || []) {
        const button = row.querySelector?.("button");
        mark(button || row, "edited-card-file-row");
        mark(button?.querySelector?.('[class~="min-w-0"][class~="flex-1"][class~="items-center"]'),
          "edited-card-file-path");
        mark(button?.querySelector?.('[class~="tabular-nums"]'), "edited-card-file-stats");
      }
      for (const more of files?.querySelectorAll?.(":scope > button") || []) {
        mark(more, "edited-card-more");
      }
    }
  };

  const classifySubagents = () => {
    const scroller = [...document.querySelectorAll(
      '[role="tabpanel"] > [class~="h-full"][class~="min-h-0"][class~="overflow-y-auto"][class~="px-3"][class~="py-5"]',
    )].find((candidate) => [...(candidate.querySelectorAll?.(':scope > section') || [])]
      .some((section) => section.querySelector?.(
        ':scope > [class~="relative"][class~="z-10"] > button[class~="items-start"][class~="w-full"]',
      )));
    if (!scroller) return;
    const panel = scroller.parentElement?.matches?.('[role="tabpanel"]') ? scroller.parentElement : null;
    const shell = panel?.parentElement;
    const toolbar = panel?.previousElementSibling?.matches?.('[class~="h-toolbar"]')
      ? panel.previousElementSibling : null;
    const frame = shell?.closest?.('[class~="border-l"][class~="bg-token-main-surface-primary"]');
    mark(frame || shell, "subagent-frame");
    mark(toolbar, "subagent-toolbar");
    mark(panel, "subagent-panel");
    mark(scroller, "subagent-scroller");
    const sections = [...(scroller.querySelectorAll?.(':scope > section') || [])];
    sections.forEach((section, index) => {
      const archived = classText(section).split(/\s+/).includes("mt-6") || index > 0;
      mark(section, archived ? "subagent-section-archive" : "subagent-section");
      const list = section.querySelector?.(':scope > [class~="relative"][class~="z-10"]');
      mark(list, "subagent-list");
      for (const row of list?.querySelectorAll?.(':scope > button[class~="items-start"][class~="w-full"]') || []) {
        mark(row, archived ? "subagent-row-archive" : "subagent-row");
      }
      for (const more of section.querySelectorAll?.(':scope > button:not([class~="items-start"])') || []) {
        mark(more, "subagent-more");
      }
    });
  };

  const classifySystemToasts = () => {
    const toastPattern = /\u901f\u7387\u9650\u5236\u91cd\u7f6e\u673a\u4f1a|rate limit reset opportunity/i;
    const actionPattern = /\u67e5\u770b\u91cd\u7f6e\u6b21\u6570|view (?:reset|redemption)/i;
    for (const candidate of document.querySelectorAll("body div, body section, body aside")) {
      if (!toastPattern.test(textOf(candidate))) continue;
      const action = [...(candidate.querySelectorAll?.("button") || [])]
        .some((button) => actionPattern.test(textOf(button)));
      if (!action) continue;
      mark(candidate.matches?.('aside[class~="rounded-2xl"]')
        ? candidate
        : candidate.querySelector?.('aside[class~="rounded-2xl"]') || candidate, "system-toast");
      break;
    }
  };

  const classify = () => {
    const startedAt = typeof globalThis.performance?.now === "function"
      ? globalThis.performance.now() : Date.now();
    const currentMarks = new Set();
    activeMarks = currentMarks;
    try {
      classifySidebar();
      classifyComposer();
      syncDiffsContainers();
      classifyComposerPalette();
      classifyComposerContext();
      classifyEnvironment();
      classifyChanges();
      classifyWorkspaces();
      classifyPermissions();
      classifyConversation();
      classifyTurnNavigation();
      classifySettings();
      classifyAuxiliarySurfaces();
      classifySelectionAndDiffs();
      classifySubagents();
      classifySystemToasts();
    } finally {
      activeMarks = null;
      for (const node of document.querySelectorAll(`[${componentAttribute}]`)) {
        if (currentMarks.has(node)) continue;
        node.removeAttribute(componentAttribute);
        metrics.attributeRemovals += 1;
      }
      const finishedAt = typeof globalThis.performance?.now === "function"
        ? globalThis.performance.now() : Date.now();
      metrics.classifyRuns += 1;
      metrics.lastClassifyMs = Math.max(0, finishedAt - startedAt);
      metrics.totalClassifyMs += metrics.lastClassifyMs;
    }
  };

  const scheduleRefresh = () => {
    metrics.scheduleRequests += 1;
    if (compositionDepth > 0) {
      refreshPendingAfterComposition = true;
      metrics.suppressedDuringComposition += 1;
      return;
    }
    if (refreshTimer !== null || refreshFrame !== null) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      classify();
    }, 120);
  };

  const scheduleFrameRefresh = () => {
    metrics.scheduleRequests += 1;
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = null;
    if (compositionDepth > 0) {
      refreshPendingAfterComposition = true;
      metrics.suppressedDuringComposition += 1;
      return;
    }
    if (refreshFrame !== null) return;
    if (typeof window.requestAnimationFrame !== "function") {
      classify();
      return;
    }
    refreshFrame = window.requestAnimationFrame(() => {
      refreshFrame = null;
      classify();
    });
  };

  const compositionStarted = () => {
    compositionDepth += 1;
    if (refreshTimer !== null || refreshFrame !== null) refreshPendingAfterComposition = true;
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = null;
    if (refreshFrame !== null) window.cancelAnimationFrame?.(refreshFrame);
    refreshFrame = null;
  };

  const compositionEnded = () => {
    compositionDepth = Math.max(0, compositionDepth - 1);
    if (compositionDepth !== 0 || !refreshPendingAfterComposition) return;
    refreshPendingAfterComposition = false;
    scheduleFrameRefresh();
  };

  const refreshAfterClick = (event) => {
    const target = event?.target?.closest?.(
      'a[href], button, [role="button"], [role="menuitem"], [role="tab"], ' +
      '[data-settings-panel-slug], [aria-expanded], [aria-haspopup]',
    );
    if (target) scheduleRefresh();
  };

  const hasMutationHint = (node) => node?.nodeType === 1
    && (node.matches?.(mutationHintSelector) || node.querySelector?.(mutationHintSelector));

  const refreshAfterMutation = (records) => {
    for (const record of records) {
      if (record.type === "attributes") {
        scheduleFrameRefresh();
        return;
      }
      const changedNodes = [...(record.addedNodes || []), ...(record.removedNodes || [])];
      if (!changedNodes.some(hasMutationHint)) continue;
      scheduleFrameRefresh();
      return;
    }
  };

  function installObservers() {
    if (!document.body || observers.length) return;
    const observer = new MutationObserver(refreshAfterMutation);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-ds-part"],
      childList: true,
      subtree: true,
    });
    observers.push(observer);
  }

  const addListener = (target, type, callback = scheduleRefresh) => {
    if (!target?.addEventListener) return;
    target.addEventListener(type, callback);
    listeners.push([target, type, callback]);
  };

  const cleanup = () => {
    restoreAttachShadow?.();
    if (diffRootTimer !== null) clearTimeout(diffRootTimer);
    diffRootTimer = null;
    diffRootAttempts = new WeakMap();
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = null;
    if (refreshFrame !== null) window.cancelAnimationFrame?.(refreshFrame);
    refreshFrame = null;
    compositionDepth = 0;
    refreshPendingAfterComposition = false;
    activeMarks = null;
    for (const observer of observers) observer.disconnect();
    observers.length = 0;
    for (const { observer } of diffRootObservers.values()) observer.disconnect();
    diffRootObservers.clear();
    for (const [target, type, callback] of listeners) target.removeEventListener?.(type, callback);
    listeners.length = 0;
    for (const style of ownedDiffStyles) style.remove?.();
    ownedDiffStyles.clear();
    clearMarks();
    if (window[registryKey] === state) delete window[registryKey];
  };

  state = { cleanup, observers, refresh: classify, syncDiffsContainers, metrics };
  window[registryKey] = state;
  installAttachShadowHook();
  globalThis.customElements?.whenDefined?.("diffs-container").then(() => {
    window[registryKey]?.syncDiffsContainers?.(true);
  });
  classify();
  installObservers();
  addListener(window.navigation, "navigate");
  addListener(window, "popstate");
  addListener(window, "hashchange");
  addListener(window, "click", refreshAfterClick);
  addListener(window, "resize", scheduleFrameRefresh);
  addListener(window, "compositionstart", compositionStarted);
  addListener(window, "compositionend", compositionEnded);
})();
