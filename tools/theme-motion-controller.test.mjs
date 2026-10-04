import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const source = await fs.readFile(new URL("../runtime/theme-motion.js", import.meta.url), "utf8");
const KEY = "__CODEX_DREAM_SKIN_MOTION_STATE__";
const OWNED = "data-dream-motion-owned";
const imageData = "data:image/png;base64,AAAA";
const configuration = (mode = "system", overrides = {}) => ({
  settings: { schemaVersion: 1, mode, effects: {
    interactions: true, status: true, character: true, ambient: true, themeTransition: true,
  } },
  themeId: "preset-internet-angel", themeRevision: "revision-1", platform: "macos",
  artKey: "art-one", artMetadata: { width: 800, height: 600 }, ...overrides,
});

class Target {
  listeners = new Map();
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  dispatch(type, event = {}) { for (const handler of [...(this.listeners.get(type) || [])]) handler(event); }
  listenerCount() { return [...this.listeners.values()].reduce((sum, entries) => sum + entries.size, 0); }
}

function fixture({ home = false, bodyless = false, reduced = false } = {}) {
  const document = new Target();
  const observers = [];
  const intersections = [];
  const frames = new Map();
  const timers = new Map();
  const images = [];
  const canvases = [];
  const imageBehaviors = new Map();
  let now = 1000;
  let nextId = 0;
  let styleReads = 0;
  let layoutReads = 0;
  class Element extends Target {
    constructor(tag = "div", attributes = {}) {
      super();
      this.tagName = tag.toUpperCase();
      this.nodeType = 1;
      this.attributes = new Map(Object.entries(attributes));
      this.children = [];
      this.parentElement = null;
      this.textContent = "";
      this.rect = { width: 600, height: 400 };
      this.computed = {};
      const styles = new Map();
      this.style = { setProperty: (name, value) => styles.set(name, value),
        getPropertyValue: (name) => styles.get(name) || "" };
    }
    get className() { return this.getAttribute("class") || ""; }
    get firstElementChild() { return this.children[0] || null; }
    get nextElementSibling() {
      const siblings = this.parentElement?.children || [];
      return siblings[siblings.indexOf(this) + 1] || null;
    }
    get childElementCount() { return this.children.length; }
    get hidden() { return this.hasAttribute("hidden"); }
    get isConnected() { return this === document.documentElement || Boolean(this.parentElement?.isConnected); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(node) { node.remove(); this.children.push(node); node.parentElement = this; return node; }
    remove() {
      if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((node) => node !== this);
      this.parentElement = null;
    }
    contains(node) { for (let current = node; current; current = current.parentElement) if (current === this) return true; return false; }
    matches(selector) {
      // Ordinary tag, class and attribute matching, independent of controller selectors.
      return selector.split(",").some((part) => {
        const attributes = [...part.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];
        if (!attributes.every(([, name, value]) => value === undefined ? this.hasAttribute(name) : this.getAttribute(name) === value)) return false;
        const rest = part.replace(/\[[^\]]+\]/g, "").trim();
        if (!rest) return attributes.length > 0;
        if (/^\.[\w-]+$/.test(rest)) return this.className.split(/\s+/).includes(rest.slice(1));
        return /^[a-z]+$/i.test(rest) && this.tagName.toLowerCase() === rest.toLowerCase();
      });
    }
    closest(selector) { for (let current = this; current; current = current.parentElement) if (current.matches(selector)) return current; return null; }
    querySelectorAll(selector) {
      const results = [];
      const visit = (node) => { if (node.matches(selector)) results.push(node); node.children.forEach(visit); };
      this.children.forEach(visit);
      return results;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    getClientRects() { layoutReads += 1; return this.isConnected && !this.hidden && this.rect.width && this.rect.height ? [this.rect] : []; }
    getContext() { return { drawImage: (...args) => { this.drawn = args; } }; }
  }
  document.documentElement = new Element("html", { "data-dream-skin": "active", "data-dream-theme": "internet-angel" });
  const body = new Element("body");
  document.body = bodyless ? null : body;
  if (!bodyless) document.documentElement.appendChild(body);
  document.hidden = false;
  document.createElement = (tag) => { const node = new Element(tag); if (tag === "canvas") canvases.push(node); return node; };
  document.querySelector = (selector) => document.documentElement.querySelector(selector);
  document.querySelectorAll = (selector) => document.documentElement.querySelectorAll(selector);
  const main = body.appendChild(new Element("main", { "data-ds-part": "main" }));
  const surface = main.appendChild(new Element("section", { "data-ds-part": home ? "home" : "thread" }));
  const composer = surface.appendChild(new Element("section", { "data-ds-part": "composer" }));
  const media = new Target();
  media.matches = reduced;
  const global = new Target();
  Object.assign(global, {
    document, location: { protocol: "app:", pathname: "/index.html", search: "?initialRoute=%2Ftask%2Fone", hash: "" },
    URLSearchParams, innerWidth: 1280, innerHeight: 800,
    Date: { now: () => now },
    getComputedStyle(node) { styleReads += 1; return { display: "block", visibility: "visible", opacity: "1", animationName: "none", ...node.computed }; },
    matchMedia: () => media,
    requestAnimationFrame(callback) { const id = ++nextId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    navigation: new Target(),
    MutationObserver: class {
      constructor(callback) { this.callback = callback; this.targets = []; this.disconnected = false; observers.push(this); }
      observe(target, options) { this.targets.push({ target, options }); }
      disconnect() { this.disconnected = true; }
    },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; this.targets = new Set(); this.disconnected = false; intersections.push(this); }
      observe(node) { this.targets.add(node); }
      unobserve(node) { this.targets.delete(node); }
      disconnect() { this.targets.clear(); this.disconnected = true; }
    },
    Image: class {
      naturalWidth = 800;
      naturalHeight = 600;
      constructor() { images.push(this); }
      decode() {
        const behavior = imageBehaviors.get(this.src);
        if (behavior === "error") return Promise.reject(new Error("fixture image decode failed"));
        if (behavior === "hang") return new Promise(() => {});
        if (behavior?.width) { this.naturalWidth = behavior.width; this.naturalHeight = behavior.height; }
        return Promise.resolve();
      }
    },
    __CODEX_DREAM_SKIN_STATE__: { artUrl: "blob:app://old-art" },
  });
  global.window = global;
  const context = vm.createContext(global);
  const mutate = (records) => {
    for (const observer of observers.filter((entry) => !entry.disconnected)) {
      const relevant = records.filter((record) => observer.targets.some(({ target, options }) =>
        (record.target === target || (options.subtree && target.contains(record.target)))
        && (record.type === "attributes" ? options.attributes && options.attributeFilter.includes(record.attributeName) : options.childList)));
      if (relevant.length) observer.callback(relevant);
    }
  };
  const result = {
    document, root: document.documentElement, body, main, surface, composer, global, media, images, canvases,
    frames, timers, observers, intersections, imageBehaviors,
    get state() { return global[KEY]; },
    get reads() { return { style: styleReads, layout: layoutReads }; },
    install(config = configuration()) { vm.runInContext(source.replace("__DREAM_SKIN_MOTION_CONFIG_JSON__", () => JSON.stringify(config)), context); return this.state; },
    node(tag, attrs = {}) { return new Element(tag, attrs); },
    add(node, parent = surface) { parent.appendChild(node); mutate([{ type: "childList", target: parent, addedNodes: [node], removedNodes: [] }]); return node; },
    attribute(node, name, value) { if (value === null) node.removeAttribute(name); else node.setAttribute(name, value); mutate([{ type: "attributes", target: node, attributeName: name }]); },
    mutate,
    flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback()); },
    advance(duration) {
      const target = now + duration;
      let remaining = 100;
      while (true) {
        const next = [...timers].filter(([, entry]) => entry.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        assert.ok(remaining-- > 0, "controller timers must settle");
        now = next[1].at; timers.delete(next[0]); next[1].callback();
      }
      now = target;
    },
    intersect(node, value) {
      for (const observer of intersections.filter((entry) => !entry.disconnected && entry.targets.has(node))) observer.callback([{ target: node, isIntersecting: value }]);
      this.flush();
    },
    showBody() { document.body = body; document.documentElement.appendChild(body); document.dispatch("DOMContentLoaded"); },
  };
  return result;
}

test("policy validates settings and honors user off and system reduce", () => {
  for (const [requested, reduced, expected] of [["system", false, "subtle"], ["subtle", false, "subtle"], ["full", false, "full"], ["off", false, "off"], ["full", true, "off"]]) {
    const page = fixture({ home: true, reduced });
    page.install(configuration(requested));
    assert.equal(page.root.getAttribute("data-dream-motion"), expected);
    assert.equal(page.root.getAttribute("data-dream-motion-state"), "unknown");
    assert.equal(page.state.inspect().ownedNodes, expected === "full" ? 3 : expected === "subtle" ? 2 : 0);
    page.state.cleanup();
  }
  for (const bad of [configuration("dance"), configuration("full", { settings: { schemaVersion: 9 } }), { ...configuration(), unexpected: true }]) {
    const page = fixture(); page.install(bad);
    assert.equal(page.state, undefined);
    assert.equal(page.root.getAttribute("data-dream-motion"), null);
  }
});

test("effect toggles and custom images never inherit built-in character coordinates", () => {
  const page = fixture({ home: true });
  const config = configuration("full", { themeId: "custom-landscape" });
  config.settings.effects.status = false;
  config.settings.effects.ambient = false;
  page.install(config);
  assert.equal(page.state.inspect().ownedNodes, 0);
  assert.equal(page.root.getAttribute("data-dream-motion-status"), "off");
  page.state.cleanup();
});

test("hidden, offscreen and IME suspend feedback without scanning token changes", () => {
  const page = fixture(); page.install();
  const before = { ...page.state.metrics };
  for (let index = 0; index < 500; index += 1) page.mutate([{ type: "childList", target: page.surface, addedNodes: [{ nodeType: 3 }], removedNodes: [] }]);
  page.flush();
  assert.equal(page.state.metrics.scans, before.scans);
  assert.equal(page.state.metrics.refreshes, before.refreshes);
  const paragraph = page.node("p"); paragraph.appendChild(page.node("span"));
  page.add(paragraph); page.flush();
  assert.equal(page.state.metrics.refreshes, before.refreshes, "ordinary nested prose must not schedule a reclassification");
  page.global.dispatch("compositionstart");
  const composingScans = page.state.metrics.scans;
  const reads = page.reads;
  page.add(page.node("section", { "data-angel-component": "activity-header", "aria-expanded": "false" }));
  assert.equal(page.state.metrics.scans, composingScans);
  assert.deepEqual(page.reads, reads);
  page.global.dispatch("compositionend");
  assert.equal(page.state.metrics.scans, composingScans + 1);
  page.document.hidden = true; page.document.dispatch("visibilitychange");
  assert.equal(page.root.getAttribute("data-dream-motion-paused"), "true");
  page.document.hidden = false; page.document.dispatch("visibilitychange");
  page.intersect(page.main, false);
  assert.equal(page.root.getAttribute("data-dream-motion-paused"), "true");
  page.intersect(page.main, true);
  assert.equal(page.root.getAttribute("data-dream-motion-paused"), "false");
  page.state.cleanup();
});

test("only local busy semantics and an explicitly open modal alertdialog affect native state", () => {
  const page = fixture(); page.install();
  const unrelated = page.add(page.node("button", { "aria-busy": "true" }), page.body); page.flush();
  assert.equal(page.state.inspect().state, "unknown");
  page.attribute(page.composer, "aria-busy", "true"); page.flush();
  assert.equal(page.state.inspect().state, "busy");
  page.attribute(page.composer, "aria-busy", "false"); page.flush();
  assert.equal(page.state.inspect().state, "unknown", "a disappearing busy signal cannot imply success");
  const history = page.add(page.node("section", { "data-angel-component": "permission" })); page.flush();
  assert.equal(history.getAttribute("data-dream-motion-enter"), null);
  const prompt = page.add(page.node("section", { role: "alertdialog", "aria-modal": "true", "data-state": "open" })); page.flush();
  assert.equal(page.state.inspect().state, "needs-attention");
  assert.equal(prompt.getAttribute("data-dream-motion-enter"), "permission");
  page.attribute(prompt, "data-state", "closed"); page.flush();
  assert.equal(page.state.inspect().state, "unknown");
  assert.equal(unrelated.getAttribute("data-dream-motion-state"), null);
  page.state.cleanup();
});

test("bounded one-shot feedback preserves native animation and deduplicates stable edit identities", () => {
  const page = fixture(); page.install();
  const activity = page.add(page.node("button", { "data-angel-component": "activity-header", "aria-expanded": "false" })); page.flush();
  page.attribute(activity, "aria-expanded", "true"); page.flush();
  assert.equal(activity.getAttribute("data-dream-motion-feedback"), "expanded");
  const unit = page.node("section", { "data-content-search-unit-key": "batch-1:assistant" });
  const edited = unit.appendChild(page.node("section", { "data-angel-component": "edited-card" }));
  page.add(unit); page.flush();
  assert.equal(edited.getAttribute("data-dream-motion-enter"), "edited-card");
  page.advance(501);
  assert.equal(activity.getAttribute("data-dream-motion-feedback"), null);
  assert.equal(edited.getAttribute("data-dream-motion-enter"), null);
  const remount = page.node("section", { "data-content-search-unit-key": "batch-1:assistant" });
  const sameEdit = remount.appendChild(page.node("section", { "data-angel-component": "edited-card" }));
  page.add(remount); page.flush();
  assert.equal(sameEdit.getAttribute("data-dream-motion-enter"), null);
  const menu = page.node("section", { role: "menu" }); menu.computed.animationName = "native-popover";
  page.add(menu); page.flush();
  assert.equal(menu.getAttribute("data-dream-motion-enter"), null);
  page.state.cleanup();
});

test("explicit task events are bound to route, task, run and monotonic revision", () => {
  const page = fixture(); page.install();
  const binding = { schemaVersion: 1, taskId: "task-one", runId: "run-one", routeEpoch: page.state.inspect().routeEpoch };
  assert.equal(page.state.bindTask(binding), true);
  const report = (state, revision, overrides = {}) => page.state.reportTaskState({ ...binding, state, revision, ...overrides });
  assert.equal(report("busy", 1), true);
  assert.equal(report("completed", 1), false);
  assert.equal(report("completed", 2, { runId: "run-other" }), false);
  assert.equal(report("completed", 2, { extra: "untrusted" }), false);
  assert.equal(report("completed", 2), true);
  const status = page.document.querySelector('[data-dream-motion-role="status"]');
  assert.equal(status.getAttribute("data-dream-motion-feedback"), "completed");
  assert.equal(report("failed", 3), false, "a settled run cannot change terminal outcomes");
  page.install(configuration("subtle", { themeRevision: "revision-2" }));
  assert.equal(page.state.inspect().state, "completed");
  assert.equal(page.document.querySelector('[data-dream-motion-role="status"]').getAttribute("data-dream-motion-feedback"), null);
  page.global.location.search = "?initialRoute=%2Ftask%2Fother";
  page.global.dispatch("popstate");
  assert.equal(page.state.inspect().state, "unknown");
  assert.equal(report("busy", 4), false);
  const next = { ...binding, taskId: "task-other", routeEpoch: page.state.inspect().routeEpoch };
  assert.equal(page.state.bindTask(next), true);
  assert.equal(page.state.reportTaskState({ ...next, state: "completed", revision: 0 }), true);
  assert.equal(page.document.querySelector('[data-dream-motion-role="status"]').getAttribute("data-dream-motion-feedback"), null,
    "the first historical terminal snapshot must remain static");
  page.state.cleanup();
});

test("late body setup, reinjection and skin removal release every controller resource", () => {
  const page = fixture({ bodyless: true }); page.install();
  assert.equal(page.state.inspect().pendingBody, true);
  page.install();
  assert.equal(page.document.listeners.get("DOMContentLoaded").size, 1);
  page.showBody();
  assert.equal(page.state.inspect().mode, "subtle");
  for (let index = 0; index < 10; index += 1) page.install();
  assert.equal(page.state.inspect().ownedNodes, 2);
  assert.equal(page.observers.filter((observer) => !observer.disconnected).length, 1);
  page.attribute(page.root, "data-dream-skin", null); page.flush();
  assert.equal(page.state, undefined);
  assert.equal(page.document.querySelectorAll(`[${OWNED}]`).length, 0);
  assert.equal(page.timers.size, 0);
  assert.equal(page.global.listenerCount(), 0);
  assert.equal(page.media.listenerCount(), 0);
  assert.equal(page.global.navigation.listenerCount(), 0);
  const waiting = fixture({ bodyless: true }); waiting.install(); waiting.state.cleanup(); waiting.showBody();
  assert.equal(waiting.state, undefined, "a removed early payload must not revive on DOMContentLoaded");
});

test("DOM budgets bound tracking and do not materialize unbounded query results", () => {
  const page = fixture();
  for (let index = 0; index < 1500; index += 1) page.surface.appendChild(page.node("section", { "data-angel-component": "activity-header" }));
  page.install();
  assert.ok(page.state.inspect().trackedNodes <= 256);
  assert.ok(page.state.metrics.visitedNodes <= 768);
  page.state.cleanup();
});

test("an already-busy composer is retained after a large historical transcript", () => {
  const page = fixture();
  page.composer.remove();
  for (let index = 0; index < 1500; index += 1) {
    page.surface.appendChild(page.node("section", { "data-angel-component": "activity-header" }));
  }
  page.surface.appendChild(page.composer);
  page.composer.setAttribute("aria-busy", "true");
  page.install();
  assert.equal(page.state.inspect().state, "busy");
  assert.ok(page.state.inspect().trackedNodes <= 256);
  assert.ok(page.state.metrics.visitedNodes <= 768);
  page.state.cleanup();
});

test("crossfade preflight rejects a broken new image before replacing the old renderer", async () => {
  const page = fixture(); page.install();
  page.imageBehaviors.set(imageData, "error");
  const old = page.state;
  await assert.rejects(old.prepareThemeTransition(configuration("subtle", { artKey: "art-two" }), imageData),
    (error) => error.code === "DREAM_SKIN_IMAGE_DECODE_FAILED");
  assert.equal(page.state, old);
  assert.equal(page.global.__CODEX_DREAM_SKIN_STATE__.artUrl, "blob:app://old-art");
  assert.equal(page.canvases.length, 0);
  assert.equal(page.timers.size, 0);
  page.state.cleanup();
});

test("crossfade copies only bounded confirmed body artwork and transfers ownership once", async () => {
  const page = fixture(); page.body.computed = { backgroundImage: 'url("blob:app://old-art")', backgroundAttachment: "fixed", backgroundPosition: "60% 40%" };
  page.install();
  const next = configuration("subtle", { artKey: "art-two", themeRevision: "revision-2" });
  assert.equal(await page.state.prepareThemeTransition(next, imageData), true);
  const canvas = page.canvases[0];
  assert.ok(canvas.width * canvas.height <= 2_000_000);
  assert.equal(canvas.getAttribute("data-dream-motion-feedback"), null);
  page.global.__CODEX_DREAM_SKIN_STATE__.artUrl = "blob:app://new-art";
  page.install(next);
  await Promise.resolve();
  assert.equal(canvas.getAttribute("data-dream-motion-feedback"), "theme-transition");
  assert.equal(canvas.style.getPropertyValue("pointer-events"), "none");
  assert.equal(page.images.length, 2, "a predecoded next image is handed off without a second post-commit decode");
  page.advance(281);
  assert.equal(canvas.isConnected, false);
  page.state.cleanup();
});

test("crossfade timeout, unchanged artwork, oversized images and cleanup fail to a static switch", async () => {
  const page = fixture(); page.install();
  const next = configuration("subtle", { artKey: "art-two" });
  assert.equal(await page.state.prepareThemeTransition(configuration("full"), imageData), false);
  assert.equal(page.images.length, 0, "preference-only updates must never decode the same artwork");
  assert.equal(await page.state.prepareThemeTransition({ ...next, artMetadata: { width: 3000, height: 3000 } }, imageData), false);
  assert.equal(page.images.length, 0, "oversized images must not enter the transition decode budget");
  page.imageBehaviors.set(imageData, "hang");
  const timeout = page.state.prepareThemeTransition(next, imageData);
  page.advance(220);
  assert.equal(await timeout, false);
  assert.equal(page.timers.size, 0);
  const cancelled = page.state.prepareThemeTransition(next, imageData);
  page.state.cleanup();
  assert.equal(await cancelled, false);
  assert.equal(page.document.querySelectorAll(`[${OWNED}]`).length, 0);
});
