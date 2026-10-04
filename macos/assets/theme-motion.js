// Trusted renderer motion only. Theme ZIPs never provide executable effects.
(() => {
  const suppliedConfig = __DREAM_SKIN_MOTION_CONFIG_JSON__;
  const KEY = "__CODEX_DREAM_SKIN_MOTION_STATE__";
  const install = () => {
  const OWNED = "data-dream-motion-owned";
  const PREFIX = "data-dream-motion-";
  const EFFECTS = ["interactions", "status", "character", "ambient", "themeTransition"];
  const STATES = new Set(["unknown", "idle", "busy", "needs-attention", "completed", "failed", "cancelled"]);
  const TERMINAL = new Set(["completed", "failed", "cancelled"]);
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
    permission: '[role="alertdialog"], [data-angel-component="permission"], .dream-permission',
    activity: '[data-angel-component="activity-header"], .dream-activity-header',
    edited: '[data-angel-component="edited-card"], .dream-edited-card',
    menu: '[data-angel-component="composer-palette"], [data-angel-component="settings-menu"], .dream-composer-palette, [role="menu"], [role="listbox"]',
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
  let ambientNode = null;
  let snapshot = null;
  let generation = 0;
  let homeIndex = 0;
  const owned = new Set();
  const listeners = [];
  const timers = new Set();
  const pendingImages = new Set();
  const tracked = new Map();
  const feedback = new Map();
  const seen = new Set(handoff?.session?.routeKey === currentRouteKey ? handoff.session.seen : []);
  const seenNodes = new WeakSet();
  const media = safeCall(() => window.matchMedia("(prefers-reduced-motion: reduce)"));
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
  const removeOwned = (node) => { if (node) { node.remove(); owned.delete(node); } return null; };
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
      tracked.set(node, { initial, entered: false, expanded: node.getAttribute("aria-expanded"), visible: visible(node) });
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
  const reconcileOwned = () => {
    if (mode === "off") {
      statusNode = removeOwned(statusNode);
      characterNode = removeOwned(characterNode);
      ambientNode = removeOwned(ambientNode);
      return;
    }
    if (config.settings.effects.status) statusNode ||= makeOwned("status");
    else statusNode = removeOwned(statusNode);
    const builtin = ["preset-internet-angel", "preset-internet-angel-default"].includes(config.themeId);
    if (builtin && config.settings.effects.character) characterNode ||= makeOwned("character");
    else characterNode = removeOwned(characterNode);
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
    if (characterNode) {
      const face = { unknown: "✧", idle: "♥", busy: "✦", "needs-attention": "!", completed: "♥", failed: "!", cancelled: "·" }[motionState];
      if (characterNode.textContent !== face) characterNode.textContent = face;
    }
  };
  const refresh = () => {
    if (!active()) return;
    if (root.getAttribute("data-dream-skin") !== "active") { cleanup(); return; }
    if (!navigating && currentRouteKey !== routeKey()) resetRoute(false);
    metrics.refreshes += 1;
    mode = effectiveMode();
    paused = Boolean(document.hidden || composition || navigating || !anchorVisible);
    if (paused) {
      attr(root, "data-dream-motion", mode);
      attr(root, `${PREFIX}paused`, "true");
      clearFeedback();
      cancelSnapshot();
      return;
    }
    route = "other";
    let busy = false;
    let attention = false;
    for (const [node, item] of tracked) {
      if (node.isConnected === false) { tracked.delete(node); intersection?.unobserve(node); continue; }
      if (matches(node, SELECTORS.home)) route = "home";
      else if (route === "other" && matches(node, SELECTORS.thread)) route = "thread";
      if (isCurrentDialog(node)) attention = true;
      if (node.getAttribute("aria-busy") === "true" && node.closest?.(SELECTORS.local)
        && item.visible && !node.closest?.('[hidden], [aria-hidden="true"]')) busy = true;
    }
    const nextState = attention ? "needs-attention" : busy ? "busy" : task?.state || "unknown";
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
    for (const [node, item] of tracked) {
      const expanded = node.getAttribute("aria-expanded");
      if (matches(node, SELECTORS.activity) && item.expanded === "false" && expanded === "true") {
        signal(node, "feedback", "expanded", 220, "interactions");
      }
      item.expanded = expanded;
      if (item.entered || !item.visible) continue;
      item.entered = true;
      if (matches(node, SELECTORS.homeCard) && route === "home" && homeIndex < 4) {
        const index = homeIndex++;
        if (remember(`home:${index}`)) {
          attr(node, `${PREFIX}index`, String(index));
          signal(node, "enter", "home-card", 260, "interactions");
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
    const nextAnchor = [...tracked.keys()].find((node) => matches(node, SELECTORS.anchor)) || document.body;
    if (nextAnchor !== anchor) { anchor = nextAnchor; anchorVisible = visible(anchor); intersection?.observe(anchor); }
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
  const listen = (target, type, callback) => {
    if (!target?.addEventListener) return;
    target.addEventListener(type, callback);
    listeners.push([target, type, callback]);
  };
  const taskShape = (value, report = false) => exactKeys(value,
    ["schemaVersion", "taskId", "runId", "routeEpoch", ...(report ? ["revision", "state"] : [])])
    && value.schemaVersion === 1 && id(value.taskId) && id(value.runId)
    && value.routeEpoch === routeEpoch && currentRouteKey === routeKey() && !navigating
    && (!report || (Number.isSafeInteger(value.revision) && value.revision >= 0 && STATES.has(value.state)));
  const bindTask = (value) => {
    if (!active() || !taskShape(value)) return false;
    if (task?.taskId === value.taskId && task.runId === value.runId) return true;
    task = { taskId: value.taskId, runId: value.runId, revision: -1, state: "unknown", wasActive: false, terminal: false };
    refresh();
    return true;
  };
  const reportTaskState = (value) => {
    if (!active() || !taskShape(value, true) || !task || task.taskId !== value.taskId
      || task.runId !== value.runId || value.revision <= task.revision || task.terminal) return false;
    const celebrate = TERMINAL.has(value.state) && task.wasActive;
    task.revision = value.revision;
    task.state = value.state;
    task.wasActive ||= ["busy", "needs-attention"].includes(value.state);
    task.terminal = TERMINAL.has(value.state);
    refresh();
    if (celebrate && remember(`terminal:${task.taskId}:${task.runId}`)) {
      signal(statusNode, "feedback", value.state);
      signal(characterNode, "feedback", value.state, 500, "character");
    }
    return true;
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
    frame = null;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    observer?.disconnect();
    intersection?.disconnect();
    for (const [target, type, callback] of listeners) target.removeEventListener?.(type, callback);
    listeners.length = 0;
    for (const node of owned) node.remove();
    owned.clear();
    for (const node of tracked.keys()) node.removeAttribute(`${PREFIX}index`);
    tracked.clear();
    for (const name of ["data-dream-motion", ...["paused", "state", "route", "interactions", "status", "character", "ambient", "theme-transition"].map((name) => PREFIX + name)]) root.removeAttribute(name);
    if (globalThis[KEY] === state) delete globalThis[KEY];
  }
  state = {
    cleanup, prepareThemeTransition, bindTask, reportTaskState, metrics,
    inspect: () => ({ mode, paused, state: motionState, route, routeEpoch, taskBound: Boolean(task),
      trackedNodes: tracked.size, ownedNodes: owned.size, pendingImages: pendingImages.size,
      timers: timers.size, feedbackNodes: feedback.size, nativeTerminalAdapter: false }),
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
    attributeFilter: ["data-ds-part", "data-angel-component", "aria-busy", "aria-expanded", "aria-modal", "data-state", "hidden", "aria-hidden"] });
  listen(media, "change", refresh);
  listen(document, "visibilitychange", refresh);
  listen(window, "resize", schedule);
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
