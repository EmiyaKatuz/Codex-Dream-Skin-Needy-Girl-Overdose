// Trusted renderer motion only. Theme ZIPs never provide executable effects.
(() => {
  const suppliedConfig = __DREAM_SKIN_MOTION_CONFIG_JSON__;
  const KEY = "__CODEX_DREAM_SKIN_MOTION_STATE__";
  const install = () => {
  const OWNED = "data-dream-motion-owned";
  const PREFIX = "data-dream-motion-";
  const EFFECTS = ["interactions", "status", "character", "ambient", "themeTransition"];
  const STATES = new Set(["unknown", "idle", "busy", "streaming", "needs-attention", "completed", "failed", "cancelled"]);
  const TERMINAL = new Set(["completed", "failed", "cancelled"]);
  const ACTIVE = new Set(["busy", "streaming", "needs-attention"]);
  const MAX_NODES = 256;
  const MAX_SCAN_NODES = 768;
  const MAX_SEEN = 128;
  const MAX_FEEDBACK = 8;
  const MAX_ART_PIXELS = 4_000_000; // Two RGBA images <= 32 MB, before browser overhead.
  const MAX_SNAPSHOT_PIXELS = 2_000_000;
  const SELECTORS = {
    home: '[data-ds-part="home"], .dream-home, [data-testid="home-icon"]',
    thread: '[data-ds-part="thread"], .thread-scroll-container',
    anchor: '[data-ds-part="main"], [data-app-shell-main-surface], main',
    local: '[data-ds-part="composer"], [data-ds-part="thread"], [data-angel-component="composer"], [data-angel-component="activity"], .composer-surface-chrome, .dream-activity, .thread-scroll-container',
    dialog: '[role="dialog"][aria-modal="true"]',
    permission: '[role="alertdialog"], [data-angel-component="permission"], .dream-permission',
    activity: '[data-angel-component="activity-header"], .dream-activity-header',
    edited: '[data-angel-component="edited-card"], .dream-edited-card',
    menu: '[data-angel-component="composer-palette"], [data-angel-component="settings-menu"], .dream-composer-palette, [role="menu"], [role="listbox"]',
    projectCard: '[data-app-action-sidebar-project-row][data-app-action-sidebar-project-id]',
    agent: '[data-app-action-sidebar-thread-row][data-app-action-sidebar-thread-kind="local"][data-app-action-sidebar-thread-id], [data-angel-component="subagent-row"], .dream-subagent-row, [data-dream-motion-agent-id]',
    item: '[data-local-conversation-item-target-ids]',
    homeCard: '.angel-preset-card, .dream-generated-preset, .dream-codex-preset, [data-testid="home-suggestion"]',
  };
  const TRACK = [...Object.values(SELECTORS), '[aria-busy]'].join(", ");
  const safeCall = (callback, fallback = null) => { try { return callback(); } catch { return fallback; } };
  const record = (value) => value && typeof value === "object" && !Array.isArray(value);
  const exactKeys = (value, required, optional = []) => record(value)
    && required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
  const id = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
  const metadata = (value) => exactKeys(value, ["width", "height"])
    && [value.width, value.height].every((size) => Number.isSafeInteger(size) && size > 0 && size <= 16384);
  const validConfig = (value) => exactKeys(value, ["settings", "themeId", "themeRevision", "platform"], ["artKey", "artMetadata"])
    && id(value.themeId) && id(value.themeRevision)
    && ["macos", "windows", "linux"].includes(value.platform)
    && (value.artKey === undefined || id(value.artKey))
    && (value.artMetadata === undefined || metadata(value.artMetadata))
    && exactKeys(value.settings, ["schemaVersion", "mode", "effects"])
    && value.settings.schemaVersion === 1
    && ["system", "off", "subtle", "full"].includes(value.settings.mode)
    && exactKeys(value.settings.effects, EFFECTS)
    && EFFECTS.every((key) => typeof value.settings.effects[key] === "boolean");
  const root = document.documentElement;
  const previous = globalThis[KEY];
  const routeKey = () => `${location.pathname || ""}\n${location.search || ""}\n${location.hash || ""}`;
  const pet = safeCall(() => String(location.pathname || "").endsWith("/avatar-overlay-composition-surface.html")
    || /^\/avatar-overlay(?:\/|$)/.test(new URLSearchParams(location.search || "").get("initialRoute") || ""), true);
  const valid = validConfig(suppliedConfig);
  const handoff = valid && !pet && root?.getAttribute("data-dream-skin") === "active"
    ? safeCall(() => previous?.handoff?.(suppliedConfig)) : null;
  safeCall(() => previous?.cleanup?.());
  if (!valid || pet || !root || root.getAttribute("data-dream-skin") !== "active" || !document.body) return;
  const config = suppliedConfig;
  let alive = true;
  let state;
  let frame = null;
  let composition = 0;
  let compositionDirty = false;
  let navigating = false;
  let route = "other";
  let currentRouteKey = routeKey();
  let routeEpoch = handoff?.session?.routeKey === currentRouteKey ? handoff.session.routeEpoch : 1;
  let task = handoff?.session?.routeKey === currentRouteKey ? handoff.session.task : null;
  let motionState = task?.state || "unknown";
  let mode = "off";
  let paused = false;
  let anchor = null;
  let anchorVisible = true;
  let statusNode = null;
  let characterNode = null;
  let backgroundCharacterNode = null;
  let backgroundSceneNode = null;
  let ambientNode = null;
  let snapshot = null;
  let generation = 0;
  let homeIndex = 0;
  let projectIndex = 0;
  let scrollTimer = null;
  let scrolling = false;
  let pointerFrame = null;
  let pointer = null;
  const owned = new Set();
  const listeners = [];
  const timers = new Set();
  const pendingImages = new Set();
  const tracked = new Map();
  const feedback = new Map();
  const seen = new Set(handoff?.session?.routeKey === currentRouteKey ? handoff.session.seen : []);
  const seenNodes = new WeakSet();
  const media = safeCall(() => window.matchMedia("(prefers-reduced-motion: reduce)"));
  const transparencyMedia = safeCall(() => window.matchMedia("(prefers-reduced-transparency: reduce)"));
  const forcedColorsMedia = safeCall(() => window.matchMedia("(forced-colors: active)"));
  const metrics = { scans: 0, visitedNodes: 0, refreshes: 0, stateChanges: 0, feedbacks: 0,
    ignoredMutations: 0, droppedNodes: 0, snapshotsPrepared: 0, snapshotsSkipped: 0 };
  const matches = (node, selector) => safeCall(() => node.matches(selector), false);
  const query = (node, selector) => safeCall(() => node.querySelector(selector));
  const active = () => alive && globalThis[KEY] === state;
  const attr = (node, name, value) => {
    if (node?.getAttribute(name) !== value) node?.setAttribute(name, value);
  };
  const later = (callback, delay) => {
    const timer = setTimeout(() => { timers.delete(timer); if (active()) callback(); }, delay);
    timers.add(timer);
    return timer;
  };
  const cancelTimer = (timer) => { clearTimeout(timer); timers.delete(timer); };
  const visible = (node) => node?.isConnected !== false && !node?.hidden
    && !node?.closest?.('[hidden]')
    // Owned decorations are intentionally aria-hidden; that does not make
    // their visual feedback invisible. Native hidden subtrees still opt out.
    && !(node?.hasAttribute(OWNED)
      ? node.parentElement?.closest?.('[aria-hidden="true"]')
      : node?.closest?.('[aria-hidden="true"]'))
    && safeCall(() => node.getClientRects().length > 0, false)
    && safeCall(() => {
      const style = getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    }, false);
  const effectiveMode = (value = config) => media?.matches || value.settings.mode === "off"
    ? "off" : value.settings.mode === "full" ? "full" : "subtle";
  const remember = (key) => {
    if (seen.has(key)) return false;
    if (seen.size >= MAX_SEEN) return false; // Saturation disables repeats instead of evicting history.
    seen.add(key);
    return true;
  };
  const makeOwned = (role, tag = "span") => {
    const node = document.createElement(tag);
    node.setAttribute(OWNED, "");
    node.setAttribute("data-dream-motion-role", role);
    node.setAttribute("aria-hidden", "true");
    node.style.setProperty("pointer-events", "none");
    owned.add(node);
    document.body.appendChild(node);
    return node;
  };
  const clearNodeFeedback = (node) => {
    const entries = feedback.get(node);
    if (entries) for (const [name, timer] of entries) { cancelTimer(timer); node.removeAttribute(name); }
    feedback.delete(node);
  };
  const removeOwned = (node) => { if (node) { clearNodeFeedback(node); node.remove(); owned.delete(node); } return null; };
  const clearFeedback = () => {
    for (const [node, entries] of feedback) {
      for (const [name, timer] of entries) { cancelTimer(timer); node.removeAttribute(name); }
    }
    feedback.clear();
  };
  const signal = (node, kind, value, duration = 500, effect = "status") => {
    if (!node || paused || mode === "off" || !config.settings.effects[effect]
      || !visible(node) || (!feedback.has(node) && feedback.size >= MAX_FEEDBACK)) return;
    // An existing native entrance animation owns its timing and transform.
    if (!node.hasAttribute(OWNED) && safeCall(() => getComputedStyle(node).animationName, "unknown") !== "none") return;
    const name = `${PREFIX}${kind}`;
    const entries = feedback.get(node) || new Map();
    if (entries.has(name)) cancelTimer(entries.get(name));
    attr(node, name, value);
    entries.set(name, later(() => {
      node.removeAttribute(name);
      entries.delete(name);
      if (!entries.size) feedback.delete(node);
    }, duration));
    feedback.set(node, entries);
    metrics.feedbacks += 1;
  };
  const cancelSnapshot = () => {
    if (snapshot?.timer) cancelTimer(snapshot.timer);
    if (snapshot?.node) removeOwned(snapshot.node);
    snapshot = null;
    generation += 1;
    for (const cancel of [...pendingImages]) cancel();
  };
  const isCurrentDialog = (node) => matches(node, '[role="alertdialog"]')
    && node.getAttribute("aria-modal") === "true"
    && node.getAttribute("data-state") === "open" && tracked.get(node)?.visible
    && !node.closest?.('[hidden], [aria-hidden="true"]');
  const entryKey = (node) => {
    const owner = node.closest?.('[data-content-search-unit-key], [data-local-conversation-item-target-ids]');
    const key = owner?.getAttribute("data-content-search-unit-key")
      || owner?.getAttribute("data-local-conversation-item-target-ids");
    return typeof key === "string" && key.length > 0 && key.length <= 256 ? `edited:${key}` : null;
  };
  const trackNode = (node, initial = false) => {
    if (!node || node.nodeType !== 1 || node.hasAttribute(OWNED) || node.closest?.(`[${OWNED}]`)) return false;
    metrics.visitedNodes += 1;
    if (!tracked.has(node)) {
      if (tracked.size >= MAX_NODES) { metrics.droppedNodes += 1; return false; }
      tracked.set(node, { agentKey: null, itemKey: null, initial, entered: false, expanded: node.getAttribute("aria-expanded"), visible: visible(node) });
      intersection?.observe(node);
    } else {
      tracked.get(node).visible = visible(node);
    }
    return true;
  };
  const scan = (node, initial = false) => {
    if (!node || node.nodeType !== 1 || node.hasAttribute(OWNED) || node.closest?.(`[${OWNED}]`)) return false;
    metrics.scans += 1;
    let changed = false;
    let remaining = MAX_SCAN_NODES;
    if (node === document.body) {
      // Current controls often follow thousands of historical message nodes.
      // Seed a few semantic anchors before the bounded history walk so a long
      // transcript cannot crowd an already-busy composer out of the budget.
      for (const selector of [
        '[data-ds-part="composer"], [data-angel-component="composer"], .composer-surface-chrome',
        '[role="alertdialog"][aria-modal="true"][data-state="open"]',
        SELECTORS.anchor, SELECTORS.home, SELECTORS.thread,
      ]) {
        const priority = query(node, selector);
        if (priority && !tracked.has(priority)) {
          changed = trackNode(priority, initial) || changed;
          remaining -= 1;
        }
      }
    }
    const pending = [node];
    // Walk a bounded number of element nodes; querySelectorAll would first
    // materialize an unbounded historical conversation before applying a cap.
    while (pending.length && remaining-- > 0) {
      const candidate = pending.pop();
      if (candidate.hasAttribute(OWNED)) continue;
      if (matches(candidate, TRACK)) changed = trackNode(candidate, initial) || changed;
      const children = [];
      for (let child = candidate.firstElementChild; child && children.length < remaining; child = child.nextElementSibling) {
        children.push(child);
      }
      for (let index = children.length - 1; index >= 0 && pending.length < MAX_SCAN_NODES; index -= 1) pending.push(children[index]);
    }
    return changed;
  };
  const pixelCharacter = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 28");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const shapes = {
      hair: "M5 3h14v2h2v17h-5V8H8v14H3V5h2z", face: "M7 6h10v11H7z",
      fringe: "M6 4h12v5h-3V7h-2v3h-2V7H9v3H6z", ribbon: "M2 6h4v4H2zm16 0h4v4h-4z",
      body: "M7 18h10v8H7z", collar: "M7 18h10v2h-3l-2 3-2-3H7z",
      arms: "M5 19h2v6H5zm12 0h2v6h-2z", eyes: "M9 11h2v2H9zm4 0h2v2h-2z",
      smile: "M10 15h4v1h-4z", focus: "M9 11h2v1H9zm4 0h2v1h-2z",
      surprise: "M11 14h2v3h-2z", rest: "M8 12h3v1H8zm5 0h3v1h-3z",
      heart: "M19 17h2v1h1v2h-1v1h-1v-1h-1z",
    };
    for (const [part, path] of Object.entries(shapes)) {
      const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
      node.setAttribute("data-dream-motion-part", part); node.setAttribute("d", path); svg.appendChild(node);
    }
    return svg;
  };
  // These eyelids are registered to the bundled JPEG, not to a theme name.
  // Replacing its image must never paint a face onto unrelated artwork.
  const hasCharacterArtwork = () => config.artKey === "4858200d0c5714091d3d"
    && config.artMetadata?.width === 2560 && config.artMetadata?.height === 1440;
  const wallpaperCharacter = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 220 104");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    // Preserve v1.3.4's hand-authored half/closed pixel frames. Their original
    // gesture now shares the controller's verified projection and lifecycle.
    const frames = { half: [
      ["#b5a8d3", "M23 27H47V29H55V31H59V33H63V35H67V39H69V43H71V47H73V49H69V47H63V49H57V51H47V49H39V47H33V45H29V43H25V39H21V35H19V31H17V29H21V27Z"],
      ["#b5a8d3", "M151 33H173V35H181V37H187V39H191V41H195V43H199V45H201V49H197V47H189V49H181V51H173V53H159V51H151V49H143V47H137V45H131V43H127V41H129V39H133V37H143V35H151Z"],
      ["#281277", "M19 31h4v4h-4zM23 35h6v4h-6zM29 39h6v4h-6zM35 43h6v4h-6zM41 47h8v4h-8zM49 49h8v4h-8zM57 51h6v4h-6zM63 49h6v4h-6zM69 47h4v4h-4zM127 41h4v4h-4zM131 43h6v4h-6zM137 45h6v4h-6zM143 47h8v4h-8zM151 49h8v4h-8zM159 51h14v4h-14zM173 53h8v4h-8zM181 51h8v4h-8zM189 49h8v4h-8zM197 47h4v4h-4z"],
    ], closed: [
      ["#b5a8d3", "M23 27H47V29H55V31H59V33H63V35H67V39H69V43H71V47H73V61H71V67H69V71H67V75H65V79H61V81H55V79H51V75H47V71H43V67H39V63H35V59H33V55H31V51H29V47H27V43H23V39H21V35H19V31H17V29H21V27Z"],
      ["#b5a8d3", "M151 33H173V35H181V37H187V39H191V41H195V43H199V45H201V49H199V57H199V61H197V65H195V69H193V73H189V77H185V81H181V83H177V85H163V83H157V81H153V77H147V73H141V69H139V65H137V61H133V57H133V53H131V49H129V45H127V41H127V39H129V37H133V35H143V33Z"],
      ["#281277", "M19 39h4v4h-4zM23 43h6v4h-6zM29 47h6v4h-6zM35 51h6v4h-6zM41 55h8v4h-8zM49 59h8v4h-8zM57 61h6v4h-6zM63 59h6v4h-6zM69 55h4v4h-4zM127 47h4v4h-4zM131 49h6v4h-6zM137 53h6v4h-6zM143 57h8v4h-8zM151 61h8v4h-8zM159 65h18v4h-18zM177 63h8v4h-8zM185 59h8v4h-8zM193 55h8v4h-8z"],
    ] };
    for (const [name, paths] of Object.entries(frames)) {
      const frame = document.createElementNS("http://www.w3.org/2000/svg", "g");
      frame.setAttribute("data-dream-motion-eyelid", name);
      for (const [fill, d] of paths) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", fill); path.setAttribute("d", d); frame.appendChild(path);
      }
      svg.appendChild(frame);
    }
    return svg;
  };
  const hideDecorations = () => {
    for (const node of [statusNode, characterNode, ambientNode, backgroundCharacterNode, backgroundSceneNode]) node?.style.setProperty("visibility", "hidden");
    if (backgroundCharacterNode) attr(backgroundCharacterNode, `${PREFIX}art-visible`, "false");
    root.removeAttribute(`${PREFIX}wallpaper`);
  };
  const placeDecorations = () => {
    hideDecorations();
    if (paused || scrolling || mode === "off" || !document.elementFromPoint) return;
    if ([...tracked].some(([node, item]) => item.visible && matches(node, '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')
      && node.getAttribute("data-state") !== "closed")) return;
    let samples = 0;
    const checked = new Map();
    const occupied = [];
    const free = (x, y, width, height, limit) => {
      if (x < 8 || y < 8 || x + width > innerWidth - 8 || y + height > innerHeight - 8) return false;
      if (occupied.some((rect) => x < rect.x + rect.width && x + width > rect.x
        && y < rect.y + rect.height && y + height > rect.y)) return false;
      for (let dx = 0; dx <= width; dx += 6) for (let dy = 0; dy <= height; dy += 6) {
        if (samples >= limit) return false;
        samples += 1;
        const hit = document.elementFromPoint(x + dx, y + dy);
        if (!hit) return false;
        if (hit.closest?.(`[${OWNED}]`)) continue;
        if (!checked.has(hit)) {
          let text = false;
          let children = 0;
          for (const node of hit.childNodes || []) {
            if (++children > 32 || (node.nodeType === 3 && node.textContent?.trim())) { text = true; break; }
          }
          const blocked = hit.closest?.('button, a, input, textarea, select, [contenteditable="true"], [role="button"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], svg, img, canvas, [data-ds-part="composer"], [data-angel-component="composer"], .composer-surface-chrome, [data-local-conversation-item-target-ids], [data-app-action-timeline-scroll], [data-app-shell-pane-frame], pre, code, diffs-container, [data-angel-component="activity"], .dream-activity, .dream-soul-hud')
            || text
            || /auto|scroll/.test(safeCall(() => getComputedStyle(hit).overflowY, ""));
          checked.set(hit, !blocked);
        }
        if (!checked.get(hit)) return false;
      }
      return true;
    };
    if (backgroundCharacterNode) {
      let style = safeCall(() => getComputedStyle(document.body));
      const source = artSource();
      let opacity = 1;
      let stack = 0;
      let registered = source && style?.backgroundImage === `url("${source}")`
        && style.backgroundAttachment === "fixed";
      // Windows Acrylic paints the same image inside a fixed translucent
      // body pseudo-element. The wallpaper and eyelids must blend together
      // BEFORE this opacity; two separate translucent layers leave ghost eyes.
      if (!registered && config.platform === "windows" && source && style?.backgroundImage === "none") {
        const layer = safeCall(() => getComputedStyle(document.body, "::before"));
        const alpha = Number(layer?.opacity);
        if (layer?.display !== "none" && layer?.position === "fixed" && ["left", "right", "top", "bottom"].every((key) => layer[key] === "0px")
          && layer.backgroundImage?.endsWith(`, url("${source}")`)
          && (layer.backgroundImage.match(/url\(/g) || []).length === 1
          && Number.isFinite(alpha) && alpha > 0 && alpha <= 1) {
          style = layer; opacity = alpha; stack = -1; registered = true;
        }
      }
      const lastLayer = (value) => typeof value === "string" ? value.split(",").at(-1).trim() : "";
      const percent = (value) => /^-?\d+(?:\.\d+)?%$/.test(value || "") ? Number.parseFloat(value) / 100 : null;
      const focusX = percent(lastLayer(style?.backgroundPositionX));
      const focusY = percent(lastLayer(style?.backgroundPositionY));
      // Other layered/custom backgrounds have no registered projection.
      if (registered && lastLayer(style?.backgroundSize) === "cover"
        && focusX !== null && focusY !== null) {
        const viewportWidth = root.clientWidth || innerWidth;
        const viewportHeight = root.clientHeight || innerHeight;
        const scale = Math.max(viewportWidth / 2560, viewportHeight / 1440);
        const width = 2560 * scale, height = 1440 * scale;
        const x = (viewportWidth - width) * focusX + width * .582;
        const y = (viewportHeight - height) * focusY + height * .351;
        const w = width * .132, h = height * .107;
        // Keep the same 6px collision grid as other decorations. At extremely
        // large sizes an exhausted budget hides the eyes instead of leaving
        // gaps wide enough to miss a small native control.
        const eyes = [[17, 27, 58, 56], [125, 31, 78, 56]].map(([ex, ey, ew, eh]) => ({
          x: x + ex / 220 * w, y: y + ey / 104 * h, width: ew / 220 * w, height: eh / 104 * h,
        }));
        const reserved = (statusNode || characterNode ? 182 : 0) + (ambientNode ? 247 : 0);
        const eyeBudget = 1600 - reserved;
        const eyeSamples = eyes.reduce((sum, eye) => sum + (Math.floor(eye.width / 6) + 1) * (Math.floor(eye.height / 6) + 1), 0);
        if (eyeSamples <= eyeBudget && eyes.every((eye) => free(eye.x, eye.y, eye.width, eye.height, eyeBudget))) {
          for (const [name, value] of [["left", x], ["top", y], ["width", w], ["height", h]]) {
            backgroundCharacterNode.style.setProperty(name, `${value.toFixed(2)}px`);
          }
          if (stack === -1) {
            backgroundSceneNode ||= makeOwned("background-scene");
            if (backgroundCharacterNode.parentElement !== backgroundSceneNode) backgroundSceneNode.appendChild(backgroundCharacterNode);
            for (const [name, value] of [["background-image", style.backgroundImage],
              ["background-position-x", style.backgroundPositionX], ["background-position-y", style.backgroundPositionY],
              ["background-size", style.backgroundSize], ["background-repeat", style.backgroundRepeat || "no-repeat"],
              ["opacity", String(opacity)], ["visibility", "visible"]]) backgroundSceneNode.style.setProperty(name, value);
            attr(root, `${PREFIX}wallpaper`, "acrylic");
          } else if (backgroundSceneNode) {
            document.body.appendChild(backgroundCharacterNode);
            backgroundSceneNode = removeOwned(backgroundSceneNode);
          }
          backgroundCharacterNode.style.setProperty("visibility", "visible");
          attr(backgroundCharacterNode, `${PREFIX}art-visible`, "true");
          occupied.push(...eyes);
        }
      }
    }
    const findPlacement = (preferred, width, height, limit = 1600) => {
      // Sidebars and diff panes can occupy every viewport edge. Check a small
      // interior grid as well, with the same content exclusions and budget.
      const interior = [0.5, 0.25, 0.75].flatMap((fx) => [0.25, 0.5, 0.75].map((fy) => [
        Math.round(8 + Math.max(0, innerWidth - width - 16) * fx),
        Math.round(8 + Math.max(0, innerHeight - height - 16) * fy),
      ]));
      for (const [x, y] of [...preferred, ...interior]) {
        if (samples >= limit) break;
        if (!free(x, y, width, height, limit)) continue;
        occupied.push({ x, y, width, height });
        return [x, y];
      }
      return null;
    };
    if (statusNode || characterNode) {
      // Reserve enough of the shared 1600 samples for an ambient rectangle.
      const placement = findPlacement([[innerWidth - 92, innerHeight - 92], [innerWidth - 92, 68],
        [innerWidth - 92, Math.floor(innerHeight / 2) - 4], [12, innerHeight - 92]], 80, 76, ambientNode ? 1353 : 1600);
      if (placement) {
        const [x, y] = placement;
        for (const [node, left, top] of [[statusNode, x + 4, y + 44], [characterNode, x + 28, y + 4]]) {
          if (node) { node.style.setProperty("left", `${left}px`); node.style.setProperty("top", `${top}px`); node.style.setProperty("right", "auto"); node.style.setProperty("bottom", "auto"); node.style.setProperty("visibility", "visible"); }
        }
      }
    }
    if (ambientNode) {
      const placement = findPlacement([[innerWidth - 172, 92]], 76, 112);
      if (placement) {
        ambientNode.style.setProperty("left", `${placement[0] + 4}px`); ambientNode.style.setProperty("top", `${placement[1] + 4}px`);
        ambientNode.style.setProperty("right", "auto"); ambientNode.style.setProperty("bottom", "auto");
        ambientNode.style.setProperty("visibility", "visible");
      }
    }
  };
  const reconcileOwned = () => {
    if (mode === "off") {
      statusNode = removeOwned(statusNode);
      characterNode = removeOwned(characterNode);
      backgroundCharacterNode = removeOwned(backgroundCharacterNode);
      backgroundSceneNode = removeOwned(backgroundSceneNode);
      ambientNode = removeOwned(ambientNode);
      return;
    }
    if (config.settings.effects.status) statusNode ||= makeOwned("status");
    else statusNode = removeOwned(statusNode);
    const builtin = ["preset-internet-angel", "preset-internet-angel-default"].includes(config.themeId);
    if (builtin && config.settings.effects.character) {
      if (!characterNode) { characterNode = makeOwned("character"); characterNode.appendChild(pixelCharacter()); }
    }
    else characterNode = removeOwned(characterNode);
    if (builtin && hasCharacterArtwork() && config.settings.effects.character && mode === "full" && route === "home") {
      if (!backgroundCharacterNode) {
        backgroundCharacterNode = makeOwned("background-character");
        backgroundCharacterNode.appendChild(wallpaperCharacter());
      }
    } else {
      backgroundCharacterNode = removeOwned(backgroundCharacterNode);
      backgroundSceneNode = removeOwned(backgroundSceneNode);
    }
    if (mode === "full" && route === "home" && config.settings.effects.ambient
      && innerWidth >= 960 && innerHeight >= 640) {
      if (!ambientNode) {
        ambientNode = makeOwned("ambient");
        for (let index = 0; index < 3; index += 1) {
          const star = document.createElement("span");
          star.setAttribute(OWNED, "");
          star.setAttribute("data-dream-motion-index", String(index));
          star.setAttribute("aria-hidden", "true");
          star.textContent = "✦";
          ambientNode.appendChild(star);
        }
      }
    } else ambientNode = removeOwned(ambientNode);
    for (const node of [statusNode, characterNode].filter(Boolean)) attr(node, `${PREFIX}state`, motionState);
  };
  const refresh = () => {
    if (!active()) return;
    if (root.getAttribute("data-dream-skin") !== "active") { cleanup(); return; }
    if (!navigating && currentRouteKey !== routeKey()) resetRoute(false);
    metrics.refreshes += 1;
    mode = effectiveMode();
    // Codex can replace its main surface while the old anchor is offscreen.
    // Repair that binding before the paused early return can retain it forever.
    // IME composition still defers every scan and style/layout measurement.
    if (!composition) {
      for (const node of tracked.keys()) {
        if (node.isConnected !== false) continue;
        clearNodeFeedback(node); clearBinding(node); tracked.delete(node); intersection?.unobserve(node);
      }
      const nextAnchor = [...tracked.keys()].find((node) => matches(node, SELECTORS.anchor))
        || query(document.body, SELECTORS.anchor) || document.body;
      if (nextAnchor !== anchor) {
        if (anchor && !tracked.has(anchor)) intersection?.unobserve(anchor);
        // An added surface may have hit the tracking limit before detached
        // nodes were pruned. Reuse the bounded scan now that space is available.
        if (nextAnchor !== document.body && !tracked.has(nextAnchor)) scan(nextAnchor);
        anchor = nextAnchor;
        anchorVisible = tracked.get(anchor)?.visible ?? visible(anchor);
        intersection?.observe(anchor);
      }
    }
    paused = Boolean(document.hidden || composition || navigating || !anchorVisible || scrolling);
    if (paused) {
      attr(root, "data-dream-motion", mode);
      attr(root, `${PREFIX}paused`, "true");
      clearFeedback();
      cancelSnapshot();
      hideDecorations();
      return;
    }
    route = "other";
    let busy = false;
    let attention = false;
    for (const [node, item] of tracked) {
      if (matches(node, SELECTORS.home)) route = "home";
      else if (route === "other" && matches(node, SELECTORS.thread)) route = "thread";
      if (isCurrentDialog(node)) attention = true;
      if (node.getAttribute("aria-busy") === "true" && node.closest?.(SELECTORS.local)
        && item.visible && !node.closest?.('[hidden], [aria-hidden="true"]')) busy = true;
    }
    const nextState = attention || task?.state === "needs-attention" ? "needs-attention" : TERMINAL.has(task?.state) ? task.state : task?.state === "streaming" ? "streaming" : busy ? "busy" : task?.state || "unknown";
    if (motionState !== nextState) { motionState = nextState; metrics.stateChanges += 1; }
    attr(root, "data-dream-motion", mode);
    attr(root, `${PREFIX}paused`, String(paused));
    attr(root, `${PREFIX}state`, motionState);
    attr(root, `${PREFIX}route`, route);
    for (const effect of EFFECTS) {
      const name = effect === "themeTransition" ? "theme-transition" : effect;
      const enabled = mode !== "off" && config.settings.effects[effect]
        && (effect !== "ambient" || mode === "full");
      attr(root, `${PREFIX}${name}`, enabled ? "on" : "off");
    }
    if (paused || mode === "off") { clearFeedback(); cancelSnapshot(); }
    reconcileOwned();
    placeDecorations();
    for (const [node, item] of tracked) {
      bindNodeState(node, item);
      const expanded = node.getAttribute("aria-expanded");
      if (matches(node, SELECTORS.activity) && item.expanded === "false" && expanded === "true") {
        signal(node, "feedback", "expanded", 220, "interactions");
      }
      item.expanded = expanded;
      const projectId = matches(node, SELECTORS.projectCard) ? node.getAttribute("data-app-action-sidebar-project-id") : null;
      if (projectId !== item.projectId) { clearNodeFeedback(node); node.removeAttribute(`${PREFIX}index`); item.entered = false; item.projectId = projectId; }
      if (item.entered || !item.visible) continue;
      item.entered = true;
      if (projectId && projectId.length <= 512 && !/[\x00-\x1f\x7f-\x9f]/.test(projectId) && projectIndex < 4 && remember(`project:${projectId}`)) {
        attr(node, `${PREFIX}index`, String(projectIndex++)); signal(node, "enter", "project-card", 340, "interactions");
      }
      if (matches(node, SELECTORS.homeCard) && route === "home" && homeIndex < 4) {
        const index = homeIndex++;
        if (remember(`home:${index}`)) {
          attr(node, `${PREFIX}index`, String(index));
          signal(node, "enter", "home-card", 350, "interactions");
        }
      } else if (!item.initial && !seenNodes.has(node)) {
        if (isCurrentDialog(node)) signal(node, "enter", "permission", 500);
        else if (matches(node, SELECTORS.menu) && node.getAttribute("data-state") !== "closed") signal(node, "enter", "menu", 180, "interactions");
        else if (matches(node, SELECTORS.edited)) {
          const key = entryKey(node);
          if (key && remember(key)) signal(node, "enter", "edited-card", 350);
        }
      }
      if (matches(node, SELECTORS.edited)) { const key = entryKey(node); if (key) remember(key); }
      seenNodes.add(node);
    }
  };
  const schedule = () => {
    if (!active() || frame !== null || composition) return;
    if (typeof window.requestAnimationFrame !== "function") { refresh(); return; }
    frame = window.requestAnimationFrame(() => { frame = null; refresh(); });
  };
  const resetRoute = (wait = true) => {
    routeEpoch += 1;
    currentRouteKey = routeKey();
    navigating = wait;
    task = null;
    for (const node of tracked.keys()) clearBinding(node);
    motionState = "unknown";
    clearFeedback();
    cancelSnapshot();
    for (const item of tracked.values()) item.initial = true;
    refresh();
  };
  const intersection = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
    if (!active()) return;
    for (const entry of entries) {
      if (entry.target === anchor) anchorVisible = entry.isIntersecting;
      const item = tracked.get(entry.target);
      if (item) item.visible = entry.isIntersecting;
    }
    schedule();
  }) : null;
  const observer = typeof MutationObserver === "function" ? new MutationObserver((records) => {
    if (!active()) return;
    let changed = false;
    if (root.getAttribute("data-dream-skin") !== "active") { cleanup(); return; }
    if (composition) {
      compositionDirty ||= records.some((mutation) => !mutation.target?.closest?.(`[${OWNED}]`));
      return;
    }
    for (const mutation of records) {
      if (mutation.target === root) { changed = true; continue; }
      if (mutation.target?.closest?.(`[${OWNED}]`)) continue;
      if (mutation.type === "attributes" && ["class", "style"].includes(mutation.attributeName)) {
        if (backgroundCharacterNode) changed = true;
        continue; // Geometry invalidation never widens state/identity scans.
      }
      // A newly mounted/removed native leaf or a visibility change can cover
      // the eyes without being a task-state anchor. Recheck placement once
      // per frame while the wallpaper layer exists; do not widen DOM scans.
      if (backgroundCharacterNode && (mutation.type === "attributes"
        || [...(mutation.addedNodes || []), ...(mutation.removedNodes || [])]
          .some((node) => node.nodeType === 3 || (node.nodeType === 1 && !node.hasAttribute(OWNED))))) changed = true;
      if (mutation.type === "attributes") {
        if (!tracked.has(mutation.target) && !matches(mutation.target, TRACK)) continue;
        trackNode(mutation.target);
        changed = true;
      } else {
        for (const node of mutation.addedNodes || []) {
          if (node.nodeType !== 1 || node.hasAttribute(OWNED) || (!matches(node, TRACK) && !node.childElementCount)) continue;
          changed = scan(node) || changed;
        }
        for (const node of mutation.removedNodes || []) {
          if (node.nodeType === 1 && (tracked.has(node) || node.childElementCount)) changed = true;
        }
      }
    }
    if (changed) schedule();
    else metrics.ignoredMutations += records.length;
  }) : null;
  const listen = (target, type, callback, capture = false) => {
    if (!target?.addEventListener) return;
    target.addEventListener(type, callback, capture);
    listeners.push([target, type, callback, capture]);
  };
  const taskShape = (value, report = false) => exactKeys(value,
    ["schemaVersion", "taskId", "runId", "routeEpoch", ...(report ? ["revision", "state"] : [])])
    && value.schemaVersion === 1 && id(value.taskId) && id(value.runId)
    && value.routeEpoch === routeEpoch && currentRouteKey === routeKey() && !navigating
    && (!report || (Number.isSafeInteger(value.revision) && value.revision >= 0 && STATES.has(value.state)));
  const bindTask = (value) => {
    if (!active() || !taskShape(value)) return false;
    if (task?.taskId === value.taskId && task.runId === value.runId) return true;
    clearFeedback();
    for (const node of tracked.keys()) clearBinding(node);
    task = { taskId: value.taskId, runId: value.runId, revision: -1, state: "unknown", wasActive: false, terminal: false,
      phase: "busy", approvalRequests: new Set(), approvalOverflow: false, agents: new Map(), items: new Map() };
    refresh();
    return true;
  };
  const reportTaskState = (value) => {
    if (!active() || !taskShape(value, true) || !task || task.taskId !== value.taskId
      || task.runId !== value.runId || value.revision <= task.revision || task.terminal) return false;
    const celebrate = TERMINAL.has(value.state) && task.wasActive;
    task.revision = value.revision;
    task.state = value.state;
    task.wasActive ||= ACTIVE.has(value.state);
    task.terminal = TERMINAL.has(value.state);
    refresh();
    if (celebrate && !paused && remember(`terminal:${task.taskId}:${task.runId}`)) {
      signal(statusNode, "feedback", value.state);
      signal(characterNode, "feedback", value.state, 500, "character");
      if (!visible(statusNode) && !visible(characterNode)) {
        const composer = [...tracked.keys()].find((node) => matches(node, '[data-ds-part="composer"], [data-angel-component="composer"], .composer-surface-chrome'));
        signal(composer, "feedback", value.state);
      }
    }
    return true;
  };
  // Read only the preload's structured app-server events. No commands, log text,
  // user messages or inferred button disappearance are used as task outcomes.
  const nativeAvailable = () => typeof window.electronBridge?.sendMessageFromView === "function"
    && (location.protocol === "app:" || (location.protocol === "http:"
      && ["localhost", "127.0.0.1"].includes(location.hostname) && location.port === "5175"));
  const nativeRoute = () => {
    const initial = new URLSearchParams(location.search || "").get("initialRoute");
    const value = initial && ["/", "/index.html"].includes(location.pathname)
      ? initial : `${location.pathname || ""}${location.search || ""}`;
    const parsed = safeCall(() => new URL(value, "http://localhost"));
    const match = parsed?.pathname.match(/^\/local\/([^/]+)$/);
    const threadId = match && safeCall(() => decodeURIComponent(match[1]));
    const hostId = parsed?.searchParams.get("hostId") || "local";
    return id(threadId) && id(hostId) ? { threadId, hostId } : null;
  };
  const clearBinding = (node) => {
    clearNodeFeedback(node);
    node.removeAttribute(`${PREFIX}agent-state`); node.removeAttribute(`${PREFIX}item-state`);
    const entry = tracked.get(node);
    if (entry) { entry.agentKey = null; entry.itemKey = null; }
  };
  const agentIdentity = (node) => {
    if (!task) return null;
    if (matches(node, '[data-app-action-sidebar-thread-row]')) {
      const raw = node.getAttribute("data-app-action-sidebar-thread-id");
      if (node.getAttribute("data-app-action-sidebar-thread-kind") !== "local" || !raw?.startsWith("local:")
        || node.getAttribute("data-app-action-sidebar-thread-host-id") !== task.nativeHost) return null;
      return id(raw.slice(6)) ? raw.slice(6) : null;
    }
    const explicit = node.getAttribute("data-dream-motion-agent-id");
    if (id(explicit)) return explicit;
    const link = matches(node, "a") ? node : query(node, "a[href]");
    const parsed = safeCall(() => new URL(link?.getAttribute("href"), "http://localhost"));
    if (!parsed || parsed.origin !== "http://localhost") return null;
    const match = parsed.pathname.match(/^\/local\/([^/]+)$/);
    const target = match && safeCall(() => decodeURIComponent(match[1]));
    return id(target) && (parsed.searchParams.get("hostId") || "local") === task.nativeHost ? target : null;
  };
  const bindNodeState = (node, entry) => {
    const agentId = matches(node, SELECTORS.agent) ? agentIdentity(node) : null;
    const agent = agentId && task?.agents.get(agentId);
    const agentKey = agent ? `${task.runId}:${agentId}:${agent.nativeRun || "snapshot"}` : null;
    if (entry.agentKey !== agentKey) { clearNodeFeedback(node); node.removeAttribute(`${PREFIX}agent-state`); entry.agentKey = agentKey; }
    if (agent) {
      attr(node, `${PREFIX}agent-state`, agent.state);
      if (agent.terminal && agent.wasActive && remember(`agent:${task.taskId}:${agentKey}`)) signal(node, "feedback", agent.state, 420);
    }
    const raw = matches(node, SELECTORS.item) ? node.getAttribute("data-local-conversation-item-target-ids") : null;
    const ids = typeof raw === "string" && raw.length <= 1024 ? raw.split(" ").slice(0, 16)
      .map((value) => safeCall(() => decodeURIComponent(value))).filter(id) : [];
    // Native activity groups can represent several command/file items. A
    // completed first item must not hide another item that is still running.
    const items = ids.filter((value) => task?.items.has(value));
    const states = items.map((value) => task.items.get(value));
    const unfinished = states.filter((value) => !value.terminal);
    const itemState = unfinished.length
      ? ["needs-attention", "streaming", "busy", "unknown"].find((value) => unfinished.some((item) => item.state === value))
      : ["failed", "cancelled", "completed"].find((value) => states.some((item) => item.state === value));
    const item = itemState ? { state: itemState, terminal: unfinished.length === 0, wasActive: states.some((value) => value.wasActive) } : null;
    const itemKey = item ? `${task.runId}:${[...new Set(items)].sort().join(",")}` : null;
    if (entry.itemKey !== itemKey) { clearNodeFeedback(node); node.removeAttribute(`${PREFIX}item-state`); entry.itemKey = itemKey; }
    if (item) {
      attr(node, `${PREFIX}item-state`, item.state);
      if (item.terminal && item.wasActive && remember(`item:${task.taskId}:${itemKey}`)) signal(node, "feedback", item.state, 420);
    }
  };
  const reportAgentState = (value) => {
    if (!active() || !exactKeys(value, ["schemaVersion", "taskId", "runId", "routeEpoch", "agentId", "revision", "state"])
      || !taskShape({ schemaVersion: value.schemaVersion, taskId: value.taskId, runId: value.runId,
        routeEpoch: value.routeEpoch, revision: value.revision, state: value.state }, true)
      || !id(value.agentId) || !task || task.terminal || task.taskId !== value.taskId || task.runId !== value.runId) return false;
    const old = task.agents.get(value.agentId);
    if ((!old && task.agents.size >= 32) || old?.terminal || (old && value.revision <= old.revision)) return false;
    task.agents.set(value.agentId, { state: value.state, revision: value.revision,
      nativeRun: old?.nativeRun, wasActive: Boolean(old?.wasActive || ACTIVE.has(value.state)), terminal: TERMINAL.has(value.state) });
    refresh();
    return true;
  };
  const nativeMessage = (event) => {
    if (!active() || !nativeAvailable() || navigating || currentRouteKey !== routeKey()) return;
    // Electron's isolated preload uses a MessageEvent with null source / empty
    // origin. Same-window events must have exactly the current origin.
    if (event.source != null && event.source !== window) return;
    if (event.source === window && event.origin !== location.origin) return;
    if (event.source == null && event.origin && event.origin !== location.origin) return;
    const envelope = event.data;
    if (!record(envelope) || !["mcp-notification", "mcp-request"].includes(envelope.type) || !id(envelope.hostId)) return;
    const message = envelope.type === "mcp-request" ? envelope.request : envelope;
    if (!record(message) || typeof message.method !== "string" || !record(message.params)) return;
    const params = message.params;
    const current = nativeRoute();
    if (!current || current.hostId !== envelope.hostId) return;
    const threadId = params.threadId;
    const runId = params.turnId || params.turn?.id;
    const binding = () => ({ schemaVersion: 1, taskId: current.threadId, runId: task.runId, routeEpoch });
    const emit = (next) => {
      if (!task || task.terminal) return;
      if (ACTIVE.has(next) && next !== "needs-attention") task.phase = next;
      const value = ACTIVE.has(next) && (task.approvalRequests.size || task.approvalOverflow) ? "needs-attention" : next;
      if (task.state !== value) reportTaskState({ ...binding(), state: value, revision: task.revision + 1 });
    };
    const child = task?.nativeHost === envelope.hostId && id(threadId) && task.agents.get(threadId);
    if (threadId !== current.threadId) {
      if (!child || !id(runId) || task.terminal || envelope.type !== "mcp-notification") return;
      if (message.method === "turn/started" && params.turn?.status === "inProgress") {
        if (child.nativeRun === runId) return;
        task.agents.set(threadId, { nativeRun: runId, state: "busy", revision: 0, wasActive: true, terminal: false }); refresh();
      } else if (child.nativeRun === runId && !child.terminal) {
        let next = message.method === "item/agentMessage/delta" ? "streaming"
          : message.method === "turn/completed" ? ({ completed: "completed", failed: "failed", interrupted: "cancelled" })[params.turn?.status] : null;
        if (next && next !== child.state) reportAgentState({ ...binding(), agentId: threadId, state: next, revision: child.revision + 1 });
      }
      return;
    }
    if (message.method === "turn/started" && envelope.type === "mcp-notification") {
      if (!id(runId) || params.turn?.status !== "inProgress") return;
      if (task?.nativeHost === envelope.hostId && task.runId === runId) return;
      if (!bindTask({ schemaVersion: 1, taskId: threadId, runId, routeEpoch })) return;
      task.nativeHost = envelope.hostId; emit("busy"); return;
    }
    if (!task || task.nativeHost !== envelope.hostId || task.taskId !== threadId || task.terminal) return;
    if (message.method === "serverRequest/resolved" && envelope.type === "mcp-notification") {
      const key = typeof params.requestId === "string" || Number.isSafeInteger(params.requestId) ? String(params.requestId) : null;
      if (key === null || !task.approvalRequests.delete(key)) return;
      emit(task.phase); return;
    }
    if (!id(runId) || runId !== task.runId) return;
    if (envelope.type === "mcp-request") {
      if (!["item/commandExecution/requestApproval", "item/fileChange/requestApproval", "item/tool/requestUserInput", "item/permissions/requestApproval"].includes(message.method)) return;
      const key = typeof message.id === "string" && message.id.length <= 128 || Number.isSafeInteger(message.id) ? String(message.id) : null;
      if (key === null) return;
      if (task.approvalRequests.size < 32) task.approvalRequests.add(key); else if (!task.approvalRequests.has(key)) task.approvalOverflow = true;
      emit("needs-attention"); return;
    }
    if (message.method === "item/agentMessage/delta") {
      const first = task.phase !== "streaming"; emit("streaming");
      if (first && remember(`streaming:${task.taskId}:${task.runId}`)) signal(characterNode, "feedback", "streaming", 300, "character");
    } else if (message.method === "turn/completed") {
      const next = ({ completed: "completed", failed: "failed", interrupted: "cancelled" })[params.turn?.status];
      if (next) { task.approvalRequests.clear(); task.approvalOverflow = false; emit(next); }
    } else if (["item/started", "item/completed"].includes(message.method) && record(params.item)) {
      const item = params.item;
      if (item.type === "collabAgentToolCall" && record(item.agentsStates)) {
        let count = 0;
        for (const agentId in item.agentsStates) {
          if (!Object.hasOwn(item.agentsStates, agentId)) continue;
          if (++count > 32) break;
          const value = item.agentsStates[agentId];
          const next = ({ pendingInit: "busy", running: "busy", completed: "completed", errored: "failed", shutdown: "cancelled" })[value?.status];
          if (!id(agentId) || !next) continue;
          const old = task.agents.get(agentId);
          reportAgentState({ ...binding(), agentId, state: next, revision: (old?.revision ?? -1) + 1 });
        }
      } else if (id(item.id) && ["commandExecution", "fileChange", "mcpToolCall", "dynamicToolCall", "webSearch"].includes(item.type)) {
        const old = task.items.get(item.id);
        if ((!old && task.items.size >= 64) || old?.terminal) return;
        // WebSearch has no status field in the native ThreadItem shape. Its
        // item/completed notification marks completedItemIds[id] in the host
        // reducer; unlike command/file tools it cannot carry failed/declined.
        const next = message.method === "item/started" ? "busy"
          : item.type === "webSearch" && item.status === undefined ? "completed"
          : ({ completed: "completed", failed: "failed", declined: "cancelled" })[item.status];
        if (!next) return;
        task.items.set(item.id, { state: next, terminal: TERMINAL.has(next), wasActive: Boolean(old?.wasActive || ACTIVE.has(next)) }); refresh();
      }
    }
  };
  const artSource = () => {
    const value = globalThis.__CODEX_DREAM_SKIN_STATE__?.artUrl;
    return typeof value === "string" && value.startsWith("blob:") ? value : null;
  };
  const decode = (source, limit = 220) => new Promise((resolve) => {
    if (!source || typeof Image !== "function") { resolve({ image: null, reason: "unavailable" }); return; }
    const image = new Image();
    let settled = false;
    let timer;
    const finish = (value, reason) => {
      if (settled) return;
      settled = true;
      cancelTimer(timer);
      pendingImages.delete(cancel);
      image.onload = null;
      image.onerror = null;
      if (!value) image.src = "";
      resolve({ image: value, reason });
    };
    const cancel = () => finish(null, "cancelled");
    pendingImages.add(cancel);
    timer = later(() => finish(null, "timeout"), limit);
    image.onload = () => finish(image, "loaded");
    image.onerror = () => finish(null, "error");
    try {
      image.src = source;
      if (typeof image.decode === "function") image.decode().then(() => finish(image, "loaded"), () => finish(null, "error"));
    } catch { finish(null, "error"); }
  });
  const prepareThemeTransition = async (nextConfig, nextArtDataUrl = null) => {
    cancelSnapshot();
    const started = Date.now();
    const skip = () => { metrics.snapshotsSkipped += 1; return false; };
    if (!active() || !validConfig(nextConfig) || !config.artKey || !nextConfig.artKey
      || config.artKey === nextConfig.artKey || !metadata(config.artMetadata) || !metadata(nextConfig.artMetadata)
      || Math.max(config.artMetadata.width * config.artMetadata.height,
        nextConfig.artMetadata.width * nextConfig.artMetadata.height) > MAX_ART_PIXELS) return skip();
    const source = artSource();
    // Only a confirmed full-window background is copied. Composed pseudo-layers,
    // image crops and arbitrary native surfaces deliberately use a direct switch.
    const bodyStyle = safeCall(() => getComputedStyle(document.body));
    const canSnapshot = !paused && mode !== "off" && effectiveMode(nextConfig) !== "off"
      && config.settings.effects.themeTransition && nextConfig.settings.effects.themeTransition
      && source && bodyStyle?.backgroundImage?.includes(source) && bodyStyle.backgroundAttachment === "fixed";
    if (nextArtDataUrl !== null && (typeof nextArtDataUrl !== "string" || nextArtDataUrl.length > 14_000_000
      || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(nextArtDataUrl))) {
      const error = new Error("The next theme background could not be decoded.");
      error.code = "DREAM_SKIN_IMAGE_DECODE_FAILED";
      throw error;
    }
    const ticket = generation;
    const [nextImage, previousImage] = await Promise.all([
      nextArtDataUrl === null ? Promise.resolve(null) : decode(nextArtDataUrl),
      canSnapshot ? decode(source) : Promise.resolve(null),
    ]);
    if (nextImage?.reason === "error") {
      const error = new Error("The next theme background could not be decoded.");
      error.code = "DREAM_SKIN_IMAGE_DECODE_FAILED";
      throw error; // The injector retains the old renderer on this explicit rejection.
    }
    if (!canSnapshot || (nextImage && !nextImage.image)) return skip();
    const image = previousImage?.image;
    if (!active() || ticket !== generation || paused || !image || Date.now() - started >= 250
      || image.naturalWidth * image.naturalHeight > MAX_ART_PIXELS) return skip();
    const scale = Math.min(1, Math.sqrt(MAX_SNAPSHOT_PIXELS / (image.naturalWidth * image.naturalHeight)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext?.("2d");
    if (!context || !safeCall(() => { context.drawImage(image, 0, 0, canvas.width, canvas.height); return true; }, false)
      || Date.now() - started >= 250) return skip();
    canvas.setAttribute(OWNED, "");
    canvas.setAttribute("data-dream-motion-role", "theme-transition");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.setProperty("pointer-events", "none");
    canvas.style.setProperty("object-fit", "cover");
    canvas.style.setProperty("object-position", bodyStyle.backgroundPosition || "50% 50%");
    document.body.appendChild(canvas);
    owned.add(canvas);
    snapshot = { node: canvas, artKey: nextConfig.artKey, decodedNext: nextImage?.image || null,
      timer: later(cancelSnapshot, 850) };
    metrics.snapshotsPrepared += 1;
    return true;
  };
  const acceptTransition = async (entry) => {
    if (!entry?.node || entry.artKey !== config.artKey) { entry?.node?.remove(); return; }
    owned.add(entry.node);
    snapshot = { ...entry, timer: later(cancelSnapshot, 600) };
    const ticket = generation;
    const result = entry.decodedNext ? { image: entry.decodedNext } : await decode(artSource());
    entry.decodedNext = null;
    if (!active() || !snapshot || ticket !== generation || paused || mode === "off" || !result.image) {
      cancelSnapshot(); return;
    }
    attr(entry.node, `${PREFIX}feedback`, "theme-transition");
    cancelTimer(snapshot.timer);
    snapshot.timer = later(cancelSnapshot, 280);
  };
  function cleanup() {
    if (!alive) return;
    cancelSnapshot();
    alive = false;
    clearFeedback();
    if (frame !== null) window.cancelAnimationFrame?.(frame);
    if (pointerFrame !== null) window.cancelAnimationFrame?.(pointerFrame);
    frame = null;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    observer?.disconnect();
    intersection?.disconnect();
    for (const [target, type, callback, capture] of listeners) target.removeEventListener?.(type, callback, capture);
    listeners.length = 0;
    for (const node of owned) node.remove();
    owned.clear();
    for (const node of tracked.keys()) { node.removeAttribute(`${PREFIX}index`); clearBinding(node); }
    tracked.clear();
    for (const name of ["data-dream-motion", ...["paused", "state", "route", "interactions", "status", "character", "ambient", "theme-transition", "wallpaper"].map((name) => PREFIX + name)]) root.removeAttribute(name);
    if (globalThis[KEY] === state) delete globalThis[KEY];
  }
  state = {
    cleanup, prepareThemeTransition, bindTask, reportTaskState, reportAgentState, metrics,
    inspect: () => ({ mode, paused, state: motionState, route, routeEpoch, taskBound: Boolean(task),
      trackedNodes: tracked.size, ownedNodes: owned.size, pendingImages: pendingImages.size,
      timers: timers.size, feedbackNodes: feedback.size, nativeTerminalAdapter: nativeAvailable(), agentCount: task?.agents.size || 0, itemCount: task?.items.size || 0 }),
    handoff(nextConfig) {
      let transition = null;
      if (snapshot && validConfig(nextConfig) && snapshot.artKey === nextConfig.artKey
        && effectiveMode(nextConfig) !== "off" && nextConfig.settings.effects.themeTransition) {
        cancelTimer(snapshot.timer);
        transition = { node: snapshot.node, artKey: snapshot.artKey, decodedNext: snapshot.decodedNext };
        owned.delete(snapshot.node);
        snapshot = null;
      }
      return { transition, session: { routeKey: currentRouteKey, routeEpoch,
        task: task ? { ...task } : null, seen: [...seen] } };
    },
  };
  globalThis[KEY] = state;
  scan(document.body, true);
  refresh();
  observer?.observe(root, { attributes: true, attributeFilter: ["data-dream-skin", "data-dream-theme"] });
  observer?.observe(document.body, { subtree: true, childList: true, attributes: true,
    attributeFilter: ["class", "style", "data-ds-part", "data-angel-component", "aria-busy", "aria-expanded", "aria-modal", "data-state", "hidden", "aria-hidden", "href", "data-dream-motion-agent-id", "data-local-conversation-item-target-ids", "data-app-action-sidebar-project-id", "data-app-action-sidebar-thread-id", "data-app-action-sidebar-thread-host-id", "data-app-action-sidebar-thread-kind"] });
  listen(media, "change", refresh);
  listen(transparencyMedia, "change", refresh);
  listen(forcedColorsMedia, "change", refresh);
  listen(document, "visibilitychange", refresh);
  listen(window, "resize", schedule);
  listen(window, "message", nativeMessage);
  listen(document, "scroll", () => {
    scrolling = true; paused = true; attr(root, `${PREFIX}paused`, "true"); hideDecorations();
    if (scrollTimer !== null) cancelTimer(scrollTimer);
    scrollTimer = later(() => { scrollTimer = null; scrolling = false; schedule(); }, 120);
  }, true);
  listen(window, "pointermove", (event) => {
    if (mode !== "full" || paused || scrolling || composition || route !== "home" || !ambientNode || event.pointerType === "touch") return;
    pointer = { x: Math.max(-3, Math.min(3, (event.clientX / innerWidth - .5) * 6)), y: Math.max(-2, Math.min(2, (event.clientY / innerHeight - .5) * 4)) };
    if (pointerFrame === null) pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = null;
      if (!active() || paused || scrolling || composition || !ambientNode || !pointer) return;
      ambientNode.style.setProperty("--dream-motion-parallax-x", `${pointer.x.toFixed(2)}px`);
      ambientNode.style.setProperty("--dream-motion-parallax-y", `${pointer.y.toFixed(2)}px`);
    });
  });
  listen(document, "pointerdown", (event) => {
    if (paused || composition || mode === "off" || !config.settings.effects.interactions) return;
    const button = event.target?.closest?.('button, [role="button"]');
    if (!button || button.disabled || button.getAttribute("aria-disabled") === "true" || !button.closest?.(SELECTORS.local)
      || safeCall(() => getComputedStyle(button).animationName, "unknown") !== "none") return;
    signal(button, "press", "edge", 180, "interactions");
    const icon = query(button, "svg");
    if (!icon || !visible(icon)) return;
    const box = safeCall(() => icon.getBoundingClientRect());
    const bounds = safeCall(() => button.getBoundingClientRect());
    const styles = safeCall(() => getComputedStyle(icon));
    if (box && bounds && styles?.animationName === "none" && (!styles.transform || styles.transform === "none")
      && box.width <= 32 && box.height <= 32 && box.width > 0 && box.height > 0
      && box.left >= bounds.left + 2 && box.top >= bounds.top + 2 && box.right <= bounds.right - 2 && box.bottom <= bounds.bottom - 2) {
      signal(icon, "press", "icon", 180, "interactions");
    }
  });
  listen(window, "compositionstart", () => { composition += 1; refresh(); });
  listen(window, "compositionend", () => {
    composition = Math.max(0, composition - 1);
    if (!composition && compositionDirty) { compositionDirty = false; scan(document.body); }
    refresh();
  });
  listen(window, "popstate", () => resetRoute(false));
  listen(window, "hashchange", () => resetRoute(false));
  listen(window.navigation, "navigate", () => resetRoute(true));
  const finishNavigation = () => { navigating = false; currentRouteKey = routeKey(); scan(document.body, true); refresh(); };
  listen(window.navigation, "navigatesuccess", finishNavigation);
  listen(window.navigation, "navigateerror", finishNavigation);
  if (handoff?.transition) acceptTransition(handoff.transition);
  };
  if (document.body) install();
  else {
    safeCallPrevious();
    let waiting = true;
    const pending = {
      cleanup() {
        waiting = false;
        document.removeEventListener?.("DOMContentLoaded", ready);
        if (globalThis[KEY] === pending) delete globalThis[KEY];
      },
      prepareThemeTransition: async () => false,
      inspect: () => ({ pendingBody: waiting }),
    };
    function ready() {
      if (!waiting || globalThis[KEY] !== pending) return;
      pending.cleanup();
      install();
    }
    globalThis[KEY] = pending;
    document.addEventListener?.("DOMContentLoaded", ready, { once: true });
  }
  function safeCallPrevious() { try { globalThis[KEY]?.cleanup?.(); } catch {} }
})();
