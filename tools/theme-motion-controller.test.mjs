import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
      this.rect = { left: 0, top: 0, width: 600, height: 400, right: 600, bottom: 400 };
      this.computed = {};
      const styles = new Map();
      this.style = { setProperty: (name, value) => styles.set(name, value),
        getPropertyValue: (name) => styles.get(name) || "" };
    }
    get childNodes() { return this.children; }
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
    getBoundingClientRect() { layoutReads += 1; return this.rect; }
    getClientRects() { layoutReads += 1; return this.isConnected && !this.hidden && this.rect.width && this.rect.height ? [this.rect] : []; }
    getContext() { return { drawImage: (...args) => { this.drawn = args; } }; }
  }
  document.documentElement = new Element("html", { "data-dream-skin": "active", "data-dream-theme": "internet-angel" });
  const body = new Element("body");
  document.body = bodyless ? null : body;
  if (!bodyless) document.documentElement.appendChild(body);
  document.hidden = false;
  document.createElement = (tag) => { const node = new Element(tag); if (tag === "canvas") canvases.push(node); return node; };
  document.createElementNS = (namespace, tag) => document.createElement(tag);
  document.elementFromPoint = () => main;
  document.querySelector = (selector) => document.documentElement.querySelector(selector);
  document.querySelectorAll = (selector) => document.documentElement.querySelectorAll(selector);
  const main = body.appendChild(new Element("main", { "data-ds-part": "main" }));
  const surface = main.appendChild(new Element("section", { "data-ds-part": home ? "home" : "thread" }));
  const composer = surface.appendChild(new Element("section", { "data-ds-part": "composer" }));
  const media = new Target();
  media.matches = reduced;
  const transparency = new Target(); transparency.matches = false;
  const forcedColors = new Target(); forcedColors.matches = false;
  const global = new Target();
  Object.assign(global, {
    document, location: { protocol: "app:", pathname: "/index.html", search: "?initialRoute=%2Ftask%2Fone", hash: "" },
    URL, URLSearchParams, innerWidth: 1280, innerHeight: 800,
    Date: { now: () => now },
    getComputedStyle(node, pseudo) { styleReads += 1; return { display: "block", visibility: node.style.getPropertyValue("visibility") || "visible", opacity: "1", animationName: "none", ...(pseudo ? node.pseudoComputed?.[pseudo] : node.computed) }; },
    matchMedia: (query) => query.includes("reduced-transparency") ? transparency : query.includes("forced-colors") ? forcedColors : media,
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
    document, root: document.documentElement, body, main, surface, composer, global, media, transparency, forcedColors, images, canvases,
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

test("a replaced main anchor resumes motion after the detached anchor pauses it", () => {
  const page = fixture({ home: true }); page.install(configuration("full"));
  page.intersect(page.main, false);
  assert.equal(page.state.inspect().paused, true);
  const replacement = page.node("main", { "data-ds-part": "main" });
  replacement.appendChild(page.surface);
  page.main.remove();
  page.add(replacement, page.body);
  page.mutate([{ type: "childList", target: page.body, addedNodes: [], removedNodes: [page.main] }]);
  page.flush();
  assert.equal(page.state.inspect().paused, false, "a removed anchor must not keep its visible replacement paused");
  assert.equal(page.state.inspect().ownedNodes, 3);
  assert.equal(page.intersections[0].targets.has(page.main), false);
  assert.equal(page.intersections[0].targets.has(replacement), true);
  page.intersect(replacement, false);
  assert.equal(page.state.inspect().paused, true, "a live anchor outside the viewport must still pause motion");
  page.intersections[0].callback([{ target: page.main, isIntersecting: true }]); page.flush();
  assert.equal(page.state.inspect().paused, true, "late entries for the retired anchor cannot resume the new anchor");
  page.intersect(replacement, true);
  assert.equal(page.state.inspect().paused, false);
  page.state.cleanup();
});

test("anchor removal can fall back to the body and bind a later main without retaining the old observer", () => {
  const page = fixture({ home: true }); page.install(configuration("full"));
  page.intersect(page.main, false);
  page.main.remove();
  page.mutate([{ type: "childList", target: page.body, addedNodes: [], removedNodes: [page.main] }]);
  page.flush();
  assert.equal(page.state.inspect().paused, false);
  assert.equal(page.intersections[0].targets.has(page.main), false);
  assert.equal(page.intersections[0].targets.has(page.body), true);
  const replacement = page.node("main", { "data-ds-part": "main" });
  page.add(replacement, page.body); page.flush();
  assert.equal(page.intersections[0].targets.has(replacement), true);
  assert.equal(page.intersections[0].targets.has(page.body), false);
  page.intersect(page.body, false);
  assert.equal(page.state.inspect().paused, false);
  page.state.cleanup();
});

test("main replacement during IME waits for composition end before reading layout or resuming", () => {
  const page = fixture({ home: true }); page.install(configuration("full"));
  page.intersect(page.main, false);
  page.global.dispatch("compositionstart");
  const reads = page.reads;
  const replacement = page.node("main", { "data-ds-part": "main" });
  replacement.appendChild(page.surface);
  page.main.remove();
  page.add(replacement, page.body);
  page.global.dispatch("resize"); page.flush();
  assert.deepEqual(page.reads, reads, "anchor recovery must not read styles or layout while composing");
  assert.equal(page.state.inspect().paused, true);
  page.global.dispatch("compositionend");
  assert.equal(page.state.inspect().paused, false);
  assert.equal(page.intersections[0].targets.has(page.main), false);
  assert.equal(page.intersections[0].targets.has(replacement), true);
  page.state.cleanup();
});

test("a replacement anchor retains an offscreen result observed before it becomes the anchor", () => {
  const page = fixture({ home: true }); page.install(configuration("full"));
  const replacement = page.node("main", { "data-ds-part": "main" });
  page.add(replacement, page.body); page.flush();
  page.intersect(replacement, false);
  page.intersect(page.main, false);
  replacement.appendChild(page.surface);
  page.main.remove();
  page.mutate([{ type: "childList", target: page.body, addedNodes: [], removedNodes: [page.main] }]);
  page.flush();
  assert.equal(page.state.inspect().paused, true, "an already observed offscreen main must not resume prematurely");
  assert.equal(page.intersections[0].targets.has(replacement), true);
  page.intersect(replacement, true);
  assert.equal(page.state.inspect().paused, false);
  page.state.cleanup();
});

test("a full tracking budget does not prevent recovery when the entire main surface is replaced", () => {
  const page = fixture({ home: true });
  for (let index = 0; index < 280; index += 1) page.surface.appendChild(page.node("button", { "aria-busy": "false" }));
  page.install(configuration("full"));
  assert.equal(page.state.inspect().trackedNodes, 256);
  page.intersect(page.main, false);
  const replacement = page.node("main", { "data-ds-part": "main" });
  const home = page.node("section", { "data-ds-part": "home" });
  replacement.appendChild(home);
  page.main.remove();
  page.body.appendChild(replacement);
  page.mutate([{ type: "childList", target: page.body, addedNodes: [replacement], removedNodes: [page.main] }]);
  page.flush();
  assert.equal(page.state.inspect().paused, false);
  assert.equal(page.state.inspect().route, "home");
  assert.equal(page.state.inspect().trackedNodes, 2);
  assert.equal(page.intersections[0].targets.has(replacement), true);
  assert.equal(page.intersections[0].targets.has(page.main), false);
  page.intersect(replacement, false);
  assert.equal(page.state.inspect().paused, true);
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

test("force-mounted menus animate each opening but never replay an already-open initial menu", () => {
  const page = fixture();
  const menu = page.add(page.node("section", { role: "menu", "data-state": "closed", hidden: "" }));
  const existing = page.add(page.node("section", { role: "menu", "data-state": "open" }));
  page.install();
  assert.equal(existing.getAttribute("data-dream-motion-enter"), null);
  page.attribute(menu, "hidden", null); page.attribute(menu, "data-state", "open"); page.flush();
  assert.equal(menu.getAttribute("data-dream-motion-enter"), "menu");
  page.attribute(menu, "data-state", "closed"); page.flush();
  assert.equal(menu.getAttribute("data-dream-motion-enter"), null, "closing cancels feedback immediately");
  page.attribute(menu, "data-state", "open"); page.flush();
  assert.equal(menu.getAttribute("data-dream-motion-enter"), "menu");
  page.advance(181); page.attribute(menu, "aria-expanded", "true"); page.flush();
  assert.equal(menu.getAttribute("data-dream-motion-enter"), null, "an unchanged open state does not restart feedback");
  page.state.cleanup();
});

test("recycled edit batches animate only unseen identities and retain no stale feedback", () => {
  for (const identity of ["data-content-search-unit-key", "data-local-conversation-item-target-ids"]) {
    const page = fixture();
    const unit = page.add(page.node("section", { [identity]: "historical-batch" }));
    const edited = page.add(page.node("section", { "data-angel-component": "edited-card" }), unit);
    page.install();
    assert.equal(edited.getAttribute("data-dream-motion-enter"), null);
    page.attribute(unit, identity, "new-batch"); page.flush();
    assert.equal(edited.getAttribute("data-dream-motion-enter"), "edited-card");
    page.attribute(unit, identity, "historical-batch"); page.flush();
    assert.equal(edited.getAttribute("data-dream-motion-enter"), null);
    page.attribute(unit, identity, "new-batch"); page.flush();
    assert.equal(edited.getAttribute("data-dream-motion-enter"), null, "virtualized remounts must not replay results");
    page.attribute(unit, identity, "next-batch"); page.flush();
    assert.equal(edited.getAttribute("data-dream-motion-enter"), "edited-card");
    page.state.cleanup();
  }
});

test("an initially hidden permission dialog gets one status cue per explicit opening", () => {
  const page = fixture();
  const prompt = page.add(page.node("section", { role: "alertdialog", "aria-modal": "true", "data-state": "closed", hidden: "" }));
  page.install();
  page.attribute(prompt, "hidden", null); page.attribute(prompt, "data-state", "open"); page.flush();
  assert.equal(prompt.getAttribute("data-dream-motion-enter"), "permission");
  assert.equal(page.state.inspect().state, "needs-attention");
  page.attribute(prompt, "data-state", "closed"); page.flush();
  assert.equal(prompt.getAttribute("data-dream-motion-enter"), null);
  page.attribute(prompt, "data-state", "open"); page.flush();
  assert.equal(prompt.getAttribute("data-dream-motion-enter"), "permission");
  page.advance(501); page.attribute(prompt, "aria-expanded", "true"); page.flush();
  assert.equal(prompt.getAttribute("data-dream-motion-enter"), null);
  page.state.cleanup();
});

test("Home presets deduplicate stable identities and anonymous native cards use one bounded batch", () => {
  const page = fixture({ home: true }); page.install();
  const card = (identity) => page.node("button", { class: "angel-preset-card", "data-dream-preset-id": identity });
  const first = page.add(card("explore")); page.flush();
  assert.equal(first.getAttribute("data-dream-motion-enter"), "home-card");
  first.remove();
  const remount = page.add(card("explore")); page.flush();
  assert.equal(remount.getAttribute("data-dream-motion-enter"), null);
  const second = page.add(card("build")); page.flush();
  assert.equal(second.getAttribute("data-dream-motion-index"), "1", "duplicates must not consume the four-card budget");
  page.state.cleanup();
  const native = fixture({ home: true }); native.install();
  const cards = Array.from({ length: 5 }, () => native.add(native.node("button", { "data-testid": "home-suggestion" })));
  native.flush();
  assert.equal(cards.filter((node) => node.getAttribute("data-dream-motion-enter")).length, 4);
  native.state.cleanup();
  const single = fixture({ home: true }); single.install();
  const original = single.add(single.node("button", { "data-testid": "home-suggestion" })); single.flush();
  assert.equal(original.getAttribute("data-dream-motion-enter"), "home-card");
  original.remove();
  const recycled = single.add(single.node("button", { "data-testid": "home-suggestion" })); single.flush();
  assert.equal(recycled.getAttribute("data-dream-motion-enter"), null, "unknown native identities must not replay on remount");
  single.state.cleanup();
});

test("skin press feedback does not suppress disclosure feedback while native animations retain ownership", () => {
  const page = fixture(); page.install();
  const button = page.add(page.node("button", { "data-angel-component": "activity-header", "aria-expanded": "false" })); page.flush();
  page.document.dispatch("pointerdown", { target: button });
  assert.equal(button.getAttribute("data-dream-motion-press"), "edge");
  button.computed.animationName = "dream-motion-highlight";
  page.attribute(button, "aria-expanded", "true"); page.flush();
  assert.equal(button.getAttribute("data-dream-motion-feedback"), "expanded");
  page.advance(501); button.computed.animationName = "native-popover";
  page.attribute(button, "aria-expanded", "false"); page.flush();
  page.attribute(button, "aria-expanded", "true"); page.flush();
  assert.equal(button.getAttribute("data-dream-motion-feedback"), null);
  page.state.cleanup();
});

test("keyboard actions share press feedback in sidebars and settings without repeat or IME replay", () => {
  for (const component of ["sidebar-control", "sidebar-new-task", "settings-control", "settings-segment", "environment-action"]) {
    const page = fixture(); page.install();
    const button = page.add(page.node("button", { "data-angel-component": component }), page.body);
    const icon = button.appendChild(page.node("svg"));
    button.rect = { left: 0, top: 0, width: 40, height: 40, right: 40, bottom: 40 };
    icon.rect = { left: 8, top: 8, width: 24, height: 24, right: 32, bottom: 32 };
    for (const key of ["Enter", " "]) {
      page.document.dispatch("keydown", { target: button, key });
      assert.equal(icon.getAttribute("data-dream-motion-press"), "icon");
      page.advance(181);
      page.document.dispatch("keydown", { target: button, key, repeat: true });
      assert.equal(icon.getAttribute("data-dream-motion-press"), null);
      page.document.dispatch("keydown", { target: button, key, isComposing: true });
      assert.equal(icon.getAttribute("data-dream-motion-press"), null);
    }
    button.setAttribute("disabled", ""); button.disabled = true;
    page.document.dispatch("keydown", { target: button, key: "Enter" });
    assert.equal(icon.getAttribute("data-dream-motion-press"), null);
    page.state.cleanup();
  }
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

function nativeFixture({ host = "local", home = false, route = null } = {}) {
  const page = fixture({ home });
  Object.assign(page.global.location, { protocol: "app:", origin: "app://-", hostname: "-", port: "",
    pathname: "/index.html", search: `?initialRoute=${encodeURIComponent(route || `/local/parent?hostId=${host}`)}` });
  page.global.electronBridge = { sendMessageFromView() { throw new Error("motion must never send a command"); } };
  page.notify = (method, params, options = {}) => page.global.dispatch("message", {
    source: null, origin: "", data: { type: "mcp-notification", hostId: host, method, params }, ...options,
  });
  page.request = (requestId, method = "item/commandExecution/requestApproval", extra = {}) => page.global.dispatch("message", {
    source: null, origin: "", data: { type: "mcp-request", hostId: host,
      request: { id: requestId, method, params: { threadId: "parent", turnId: "run-1", ...extra } } },
  });
  page.start = (run = "run-1", thread = "parent") => page.notify("turn/started", { threadId: thread, turn: { id: run, status: "inProgress" } });
  page.delta = (run = "run-1", thread = "parent") => page.notify("item/agentMessage/delta", { threadId: thread, turnId: run, itemId: "answer", delta: "fixture" });
  page.finish = (status = "completed", run = "run-1", thread = "parent") => page.notify("turn/completed", { threadId: thread, turn: { id: run, status } });
  page.agents = (states) => page.notify("item/started", { threadId: "parent", turnId: "run-1", item: { id: "collab", type: "collabAgentToolCall", agentsStates: states } });
  page.tool = (status, itemId = "tool-1") => page.notify(status === "inProgress" ? "item/started" : "item/completed", {
    threadId: "parent", turnId: "run-1", item: { id: itemId, type: "commandExecution", status },
  });
  page.install(configuration(home ? "full" : "subtle"));
  return page;
}
const motionRole = (page, role) => page.document.querySelector(`[data-dream-motion-role="${role}"]`);

const wallpaperConfig = (mode = "full", overrides = {}) => configuration(mode, {
  artKey: "4858200d0c5714091d3d", artMetadata: { width: 2560, height: 1440 }, ...overrides,
});
function wallpaperFixture() {
  const page = fixture({ home: true });
  page.body.computed = { backgroundImage: 'url("blob:app://old-art")', backgroundAttachment: "fixed",
    backgroundSize: "cover", backgroundPositionX: "72%", backgroundPositionY: "42%" };
  return page;
}

test("shared half/closed eyelids preserve the legacy pixel artwork", async () => {
  const legacy = await fs.readFile(new URL("../windows/assets/renderer-inject.js", import.meta.url), "utf8");
  const page = wallpaperFixture(); page.install(wallpaperConfig());
  const art = motionRole(page, "background-character");
  assert.equal(art.querySelectorAll("[data-dream-motion-eyelid]").length, 2);
  for (const name of ["half", "closed"]) {
    const start = legacy.indexOf(`<g class="dream-blink-frame dream-blink-${name}">`);
    const end = name === "half" ? legacy.indexOf('<g class="dream-blink-frame dream-blink-closed">', start) : legacy.indexOf("</svg>", start);
    assert.ok(start > 0 && end > start);
    const original = legacy.slice(start, end);
    const frame = art.querySelector(`[data-dream-motion-eyelid="${name}"]`);
    const paths = frame.querySelectorAll("path");
    assert.deepEqual(paths.slice(0, 2).map((path) => path.getAttribute("d")),
      [...original.matchAll(/<path class="dream-blink-pixel-skin" d="([^"]+)"/g)].map((match) => match[1]));
    const originalPixels = [...original.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)]
      .map((match) => match.slice(1));
    const sharedPixels = [...paths[2].getAttribute("d").matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-\d+z/g)]
      .map((match) => match.slice(1));
    assert.ok(originalPixels.length > 0);
    assert.deepEqual(sharedPixels, originalPixels, `${name} eyelashes retain every original pixel rectangle`);
  }
  page.state.cleanup();
});

test("wallpaper eyelids are bound to the shipped JPEG and follow its fixed-cover geometry on each platform", async () => {
  const bytes = await fs.readFile(new URL("../windows/assets/dream-reference.jpg", import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex").slice(0, 20), wallpaperConfig().artKey);
  for (const platform of ["windows", "macos", "linux"]) {
    const page = wallpaperFixture(); page.install(wallpaperConfig("full", { platform }));
    const art = motionRole(page, "background-character");
    assert.ok(art?.querySelector("[data-dream-motion-eyelid]"));
    assert.equal(art.getAttribute("data-dream-motion-art-visible"), "true");
    assert.equal(art.style.getPropertyValue("left"), "725.33px");
    assert.equal(art.style.getPropertyValue("top"), "280.80px");
    assert.equal(art.style.getPropertyValue("width"), "187.73px");
    assert.equal(art.style.getPropertyValue("height"), "85.60px");
    page.global.innerWidth = 1920; page.global.innerHeight = 1080;
    page.global.dispatch("resize"); page.flush();
    assert.equal(art.style.getPropertyValue("left"), "1117.44px");
    assert.equal(art.style.getPropertyValue("top"), "379.08px");
    page.state.cleanup(); assert.equal(art.isConnected, false);
  }
});

test("wallpaper animation is opt-in and does not attach to replaced images or non-home routes", () => {
  for (const config of [wallpaperConfig("system"), wallpaperConfig("subtle"), wallpaperConfig("off"),
    wallpaperConfig("full", { artKey: "custom-art" }), wallpaperConfig("full", { themeId: "custom" }),
    wallpaperConfig("full", { artMetadata: { width: 800, height: 600 } })]) {
    const page = wallpaperFixture(); page.install(config);
    assert.equal(motionRole(page, "background-character"), null); page.state.cleanup();
  }
  const page = fixture(); page.install(wallpaperConfig());
  assert.equal(motionRole(page, "background-character"), null); page.state.cleanup();
  const disabled = wallpaperFixture(); const config = wallpaperConfig(); config.settings.effects.character = false;
  disabled.install(config); assert.equal(motionRole(disabled, "background-character"), null); disabled.state.cleanup();
});

test("Windows Acrylic eyelids match the translucent fixed pseudo-wallpaper below native glass", () => {
  const page = wallpaperFixture(); page.body.computed.backgroundImage = "none";
  page.body.pseudoComputed = { "::before": { position: "fixed", left: "0px", right: "0px", top: "0px", bottom: "0px",
    backgroundImage: 'linear-gradient(135deg, rgb(10 8 38 / .14), transparent), url("blob:app://old-art")',
    backgroundPositionX: "50%, 72%", backgroundPositionY: "50%, 42%", backgroundSize: "cover, cover", opacity: ".18" } };
  page.install(wallpaperConfig("full", { platform: "windows" }));
  const art = motionRole(page, "background-character");
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "true");
  assert.equal(art.style.getPropertyValue("left"), "725.33px");
  assert.equal(art.style.getPropertyValue("top"), "280.80px");
  const scene = motionRole(page, "background-scene");
  assert.equal(art.parentElement, scene, "image and eyelids must be in the same opacity group");
  assert.equal(art.style.getPropertyValue("opacity"), "", "eyelids occlude the original irises before alpha blending");
  assert.equal(scene.style.getPropertyValue("opacity"), "0.18");
  assert.equal(scene.style.getPropertyValue("background-image"), page.body.pseudoComputed["::before"].backgroundImage);
  assert.equal(page.document.documentElement.getAttribute("data-dream-motion-wallpaper"), "acrylic");
  page.body.pseudoComputed["::before"].left = "12px";
  page.global.dispatch("resize"); page.flush();
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "false", "unregistered pseudo geometry must fail closed");
  assert.equal(scene.style.getPropertyValue("visibility"), "hidden");
  assert.equal(page.document.documentElement.getAttribute("data-dream-motion-wallpaper"), null, "restore the original pseudo wallpaper when not animating");
  page.state.cleanup();
  assert.equal(scene.isConnected, false);
  assert.equal(page.document.documentElement.getAttribute("data-dream-motion-wallpaper"), null);
});

test("opaque Acrylic fallback follows transparency media without disabling motion", () => {
  for (const feature of ["transparency", "forcedColors"]) {
    const page = wallpaperFixture(); page.body.computed.backgroundImage = "none";
    page.body.pseudoComputed = { "::before": { position: "fixed", display: "block",
      left: "0px", right: "0px", top: "0px", bottom: "0px", opacity: ".18",
      backgroundImage: 'linear-gradient(135deg, black, transparent), url("blob:app://old-art")',
      backgroundPositionX: "50%, 72%", backgroundPositionY: "50%, 42%", backgroundSize: "cover, cover" } };
    page.install(wallpaperConfig("full", { platform: "windows" }));
    const art = motionRole(page, "background-character");
    assert.ok(motionRole(page, "background-scene"));
    page.body.computed.backgroundImage = 'url("blob:app://old-art")';
    page.body.pseudoComputed["::before"].display = "none";
    page[feature].matches = true; page[feature].dispatch("change");
    assert.equal(page.state.inspect().mode, "full");
    assert.equal(art.getAttribute("data-dream-motion-art-visible"), "true");
    assert.equal(motionRole(page, "background-scene"), null);
    page.body.computed.backgroundImage = "none"; page.body.pseudoComputed["::before"].display = "block";
    page[feature].matches = false; page[feature].dispatch("change");
    assert.equal(art.getAttribute("data-dream-motion-art-visible"), "true");
    assert.ok(motionRole(page, "background-scene"), "returning to transparency restores one composed scene");
    page.state.cleanup(); assert.equal(page[feature].listenerCount(), 0);
  }
});

test("wallpaper eyelids hide under controls, unknown projections, IME and scroll, then recover", () => {
  const page = wallpaperFixture(); page.install(wallpaperConfig());
  const art = motionRole(page, "background-character");
  const obstacle = page.add(page.node("button"));
  page.document.elementFromPoint = () => obstacle;
  page.global.dispatch("resize"); page.flush();
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "false");
  page.document.elementFromPoint = () => page.main;
  page.body.computed.backgroundSize = "contain";
  page.global.dispatch("resize"); page.flush();
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "false");
  page.body.computed.backgroundSize = "cover";
  page.global.dispatch("resize"); page.flush();
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "true");
  page.global.dispatch("compositionstart"); const reads = page.reads;
  page.global.dispatch("resize"); page.flush(); assert.deepEqual(page.reads, reads);
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "false");
  page.global.dispatch("compositionend");
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "true");
  page.document.dispatch("scroll"); assert.equal(art.getAttribute("data-dream-motion-art-visible"), "false");
  page.advance(121); page.flush(); assert.equal(art.getAttribute("data-dream-motion-art-visible"), "true");
  page.state.cleanup();
});

test("wallpaper hit testing stays bounded at maximized display sizes", () => {
  const page = wallpaperFixture(); page.global.innerWidth = 3840; page.global.innerHeight = 2160;
  let hits = 0; page.document.elementFromPoint = () => { hits += 1; return page.main; };
  page.install(wallpaperConfig());
  assert.equal(motionRole(page, "background-character").getAttribute("data-dream-motion-art-visible"), "true");
  for (const role of ["status", "character", "ambient"]) {
    assert.equal(motionRole(page, role).style.getPropertyValue("visibility"), "visible");
  }
  assert.ok(hits <= 1600); page.state.cleanup();
});

test("new native leaf controls and visibility changes recheck wallpaper without widening scans", () => {
  const page = wallpaperFixture(); page.install(wallpaperConfig());
  const art = motionRole(page, "background-character"); const scans = page.state.metrics.scans;
  const button = page.add(page.node("button")); page.document.elementFromPoint = () => button;
  page.mutate([{ type: "childList", target: page.main, addedNodes: [button], removedNodes: [] }]); page.flush();
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "false");
  assert.equal(page.state.metrics.scans, scans);
  page.document.elementFromPoint = () => page.main; page.attribute(button, "hidden", ""); page.flush();
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "true");
  button.removeAttribute("hidden"); page.document.elementFromPoint = () => button;
  page.mutate([{ type: "attributes", target: button, attributeName: "hidden" }]); page.flush();
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "false");
  button.remove(); page.document.elementFromPoint = () => page.main;
  page.mutate([{ type: "childList", target: page.main, addedNodes: [], removedNodes: [button] }]); page.flush();
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "true"); page.state.cleanup();
});

test("wallpaper collision checks retain a dense grid around small controls on 4K displays", () => {
  const page = wallpaperFixture(); page.global.innerWidth = 3840; page.global.innerHeight = 2160;
  const button = page.add(page.node("button"));
  page.document.elementFromPoint = (x, y) => x >= 2281 && x <= 2297 && y >= 826 && y <= 842 ? button : page.main;
  page.install(wallpaperConfig());
  assert.equal(motionRole(page, "background-character").getAttribute("data-dream-motion-art-visible"), "false");
  page.state.cleanup();
});

test("oversized eyelid grids preserve the existing decoration placement budget", () => {
  for (const [width, height] of [[5120, 1440], [7680, 4320]]) {
    const page = wallpaperFixture(); page.global.innerWidth = width; page.global.innerHeight = height;
    let hits = 0; page.document.elementFromPoint = () => { hits += 1; return page.main; };
    page.install(wallpaperConfig());
    assert.equal(motionRole(page, "background-character").getAttribute("data-dream-motion-art-visible"), "false");
    for (const role of ["status", "character", "ambient"]) {
      assert.equal(motionRole(page, role).style.getPropertyValue("visibility"), "visible");
    }
    assert.ok(hits <= 1600); page.state.cleanup();
  }
});

test("native class/style movement rechecks eyes once per frame without widening scans", () => {
  const page = wallpaperFixture(); page.install(wallpaperConfig());
  const art = motionRole(page, "background-character"), button = page.add(page.node("button")); page.flush();
  const scans = page.state.metrics.scans, refreshes = page.state.metrics.refreshes;
  page.document.elementFromPoint = () => button;
  for (let i = 0; i < 50; i++) page.attribute(button, "style", `left:${i}px`);
  assert.equal(page.frames.size, 1); page.flush();
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "false");
  assert.equal(page.state.metrics.refreshes, refreshes + 1); assert.equal(page.state.metrics.scans, scans);
  page.document.elementFromPoint = () => page.main; page.attribute(button, "class", "outside-face"); page.flush();
  assert.equal(art.getAttribute("data-dream-motion-art-visible"), "true");
  page.global.dispatch("compositionstart"); const reads = page.reads;
  page.attribute(button, "style", "left:900px"); page.flush(); assert.deepEqual(page.reads, reads);
  page.global.dispatch("compositionend"); page.state.cleanup();
});
const agentRow = (page, id = "child", host = "local") => page.add(page.node("button", {
  "data-app-action-sidebar-thread-row": "", "data-app-action-sidebar-thread-kind": "local",
  "data-app-action-sidebar-thread-id": `local:${id}`, "data-app-action-sidebar-thread-host-id": host,
}));

test("native events require the proven preload bridge, origin, route and host", () => {
  const page = nativeFixture();
  page.notify("turn/started", { threadId: "parent", turn: { id: "run-1", status: "inProgress" } }, { source: {}, origin: "https://outside.invalid" });
  assert.equal(page.state.inspect().taskBound, false);
  page.notify("turn/started", { threadId: "parent", turn: { id: "run-1", status: "inProgress" } }, { source: page.global, origin: "https://outside.invalid" });
  assert.equal(page.state.inspect().taskBound, false);
  page.start("run-1", "other"); assert.equal(page.state.inspect().taskBound, false);
  page.global.electronBridge = undefined; page.start(); assert.equal(page.state.inspect().taskBound, false);
  page.global.electronBridge = { sendMessageFromView() {} };
  page.global.location.protocol = "https:"; page.start(); assert.equal(page.state.inspect().taskBound, false);
  page.global.location.protocol = "app:"; page.start(); assert.equal(page.state.inspect().state, "busy");
  page.finish(); assert.equal(page.state.inspect().state, "completed");
  page.state.cleanup();
});

test("offline native adapter accepts only localhost port 5175 and the exact host query", () => {
  const page = nativeFixture({ host: "remote-1" });
  Object.assign(page.global.location, { protocol: "http:", hostname: "localhost", port: "5174" });
  page.start(); assert.equal(page.state.inspect().taskBound, false);
  page.global.location.port = "5175"; page.start(); assert.equal(page.state.inspect().state, "busy");
  page.notify("turn/completed", { threadId: "parent", turn: { id: "run-1", status: "completed" } }, {
    data: { type: "mcp-notification", hostId: "local", method: "turn/completed", params: { threadId: "parent", turn: { id: "run-1", status: "completed" } } },
  });
  assert.equal(page.state.inspect().state, "busy");
  page.finish(); assert.equal(page.state.inspect().state, "completed"); page.state.cleanup();
});

test("streaming feedback is one shot and per-token deltas do not refresh or scan", () => {
  const page = nativeFixture(); page.start(); page.delta();
  assert.equal(page.state.inspect().state, "streaming");
  assert.equal(motionRole(page, "character").getAttribute("data-dream-motion-feedback"), "streaming");
  const metrics = { ...page.state.metrics };
  for (let i = 0; i < 500; i++) page.delta();
  assert.equal(page.state.metrics.refreshes, metrics.refreshes);
  assert.equal(page.state.metrics.scans, metrics.scans);
  assert.equal(page.state.metrics.feedbacks, metrics.feedbacks); page.state.cleanup();
});

test("terminal events correlate run identities, retain exact outcomes and suppress replay", () => {
  for (const [native, expected] of [["completed", "completed"], ["failed", "failed"], ["interrupted", "cancelled"]]) {
    const page = nativeFixture(); page.start(); page.finish(native, "wrong-run");
    assert.equal(page.state.inspect().state, "busy"); page.finish(native);
    assert.equal(page.state.inspect().state, expected);
    const feedbacks = page.state.metrics.feedbacks; page.finish(native); assert.equal(page.state.metrics.feedbacks, feedbacks);
    page.install(configuration()); assert.equal(page.state.inspect().state, expected);
    assert.equal(motionRole(page, "status").getAttribute("data-dream-motion-feedback"), null);
    page.state.cleanup();
  }
});

test("parallel approvals remain pending until every exact request resolves", () => {
  const page = nativeFixture(); page.start(); page.request("request-a"); page.request("request-b");
  page.notify("serverRequest/resolved", { threadId: "parent", requestId: "unknown" });
  page.notify("serverRequest/resolved", { threadId: "parent", requestId: "request-a" });
  assert.equal(page.state.inspect().state, "needs-attention");
  page.notify("serverRequest/resolved", { threadId: "parent", requestId: "request-b" });
  assert.equal(page.state.inspect().state, "busy"); page.state.cleanup();
});

test("streaming cannot dismiss a pending approval and resolves to the latest phase", () => {
  const page = nativeFixture(); page.start(); page.request(7); page.delta();
  assert.equal(page.state.inspect().state, "needs-attention");
  page.notify("serverRequest/resolved", { threadId: "parent", requestId: 7 });
  assert.equal(page.state.inspect().state, "streaming"); page.state.cleanup();
});

test("approval overflow stays attentive until a correlated terminal event", () => {
  const page = nativeFixture(); page.start();
  for (let i = 0; i < 40; i++) page.request(i);
  for (let i = 0; i < 40; i++) page.notify("serverRequest/resolved", { threadId: "parent", requestId: i });
  assert.equal(page.state.inspect().state, "needs-attention");
  page.finish("failed"); assert.equal(page.state.inspect().state, "failed"); page.state.cleanup();
});

test("native sidebar rows bind exact child ids and exact host ids without list order", () => {
  const page = nativeFixture({ host: "remote-1" });
  const correct = agentRow(page, "child", "remote-1");
  const wrong = agentRow(page, "child", "local");
  const other = agentRow(page, "other", "remote-1"); page.flush();
  page.start(); page.agents({ child: { status: "running" } });
  assert.equal(correct.getAttribute("data-dream-motion-agent-state"), "busy");
  assert.equal(wrong.getAttribute("data-dream-motion-agent-state"), null);
  assert.equal(other.getAttribute("data-dream-motion-agent-state"), null);
  page.start("child-run", "child"); page.finish("completed", "child-run", "child");
  assert.equal(correct.getAttribute("data-dream-motion-agent-state"), "completed");
  assert.equal(page.state.inspect().state, "busy", "child completion must never complete the parent"); page.state.cleanup();
});

test("recycled agent rows clear both stale state and its feedback timer", () => {
  const page = nativeFixture(); const row = agentRow(page); page.flush(); page.start();
  page.agents({ child: { status: "running" } }); page.start("child-run", "child"); page.finish("completed", "child-run", "child");
  assert.equal(row.getAttribute("data-dream-motion-feedback"), "completed");
  page.attribute(row, "data-app-action-sidebar-thread-id", "local:unknown"); page.flush();
  assert.equal(row.getAttribute("data-dream-motion-agent-state"), null);
  assert.equal(row.getAttribute("data-dream-motion-feedback"), null);
  assert.equal(page.state.inspect().feedbackNodes, 0); page.state.cleanup();
});

test("sidebar kind and host mutations revoke an existing child binding", () => {
  const page = nativeFixture(); const row = agentRow(page); page.flush(); page.start(); page.agents({ child: { status: "running" } });
  page.attribute(row, "data-app-action-sidebar-thread-kind", "cloud"); page.flush(); assert.equal(row.getAttribute("data-dream-motion-agent-state"), null);
  page.attribute(row, "data-app-action-sidebar-thread-kind", "local"); page.flush(); assert.equal(row.getAttribute("data-dream-motion-agent-state"), "busy");
  page.attribute(row, "data-app-action-sidebar-thread-host-id", "other"); page.flush(); assert.equal(row.getAttribute("data-dream-motion-agent-state"), null); page.state.cleanup();
});

test("child snapshots retain their native run and a second run can celebrate once", () => {
  const page = nativeFixture(); const row = agentRow(page); page.flush(); page.start(); page.agents({ child: { status: "running" } });
  page.start("child-run-1", "child"); page.agents({ child: { status: "running" } }); page.delta("child-run-1", "child");
  assert.equal(row.getAttribute("data-dream-motion-agent-state"), "streaming"); page.finish("completed", "child-run-1", "child");
  assert.equal(row.getAttribute("data-dream-motion-feedback"), "completed"); page.advance(500);
  page.start("child-run-2", "child"); page.finish("completed", "child-run-1", "child");
  assert.equal(row.getAttribute("data-dream-motion-agent-state"), "busy");
  page.finish("completed", "child-run-2", "child"); assert.equal(row.getAttribute("data-dream-motion-feedback"), "completed"); page.state.cleanup();
});

test("encoded item ids bind exact tool outcomes and recycling clears stale timers", () => {
  const page = nativeFixture(); const row = page.add(page.node("div", { "data-local-conversation-item-target-ids": "tool%3A1" })); page.flush(); page.start();
  page.tool("inProgress", "tool:1"); assert.equal(row.getAttribute("data-dream-motion-item-state"), "busy");
  page.tool("completed", "tool:1"); assert.equal(row.getAttribute("data-dream-motion-feedback"), "completed");
  page.attribute(row, "data-local-conversation-item-target-ids", "unknown"); page.flush();
  assert.equal(row.getAttribute("data-dream-motion-item-state"), null); assert.equal(row.getAttribute("data-dream-motion-feedback"), null);
  assert.equal(page.state.inspect().feedbackNodes, 0); page.state.cleanup();
});

test("agent and tool state maps have bounded identities", () => {
  const page = nativeFixture(); page.start();
  for (let i = 0; i < 100; i++) { page.agents({ [`child-${i}`]: { status: "running" } }); page.tool("inProgress", `tool-${i}`); }
  assert.equal(page.state.inspect().agentCount, 32); assert.equal(page.state.inspect().itemCount, 64); page.state.cleanup();
});

test("ambient collision checks still run when both status and character are disabled", () => {
  const page = fixture({ home: true }); const obstacle = page.add(page.node("button")); page.document.elementFromPoint = () => obstacle;
  const config = configuration("full"); config.settings.effects.status = false; config.settings.effects.character = false; page.install(config);
  assert.equal(motionRole(page, "ambient").style.getPropertyValue("visibility"), "hidden"); page.state.cleanup();
});

test("collision safety hides decorations and terminal feedback falls back inside composer", () => {
  const page = nativeFixture(); page.document.elementFromPoint = () => page.composer;
  page.start(); assert.equal(motionRole(page, "status").style.getPropertyValue("visibility"), "hidden");
  page.finish(); assert.equal(page.composer.getAttribute("data-dream-motion-feedback"), "completed"); page.state.cleanup();
});

test("scroll hides immediately without layout and performs one idle placement", () => {
  const page = nativeFixture({ home: true });
  const reads = page.reads; const refreshes = page.state.metrics.refreshes;
  for (let i = 0; i < 20; i++) page.document.dispatch("scroll");
  assert.deepEqual(page.reads, reads); assert.equal(motionRole(page, "status").style.getPropertyValue("visibility"), "hidden");
  assert.equal(page.timers.size, 1); page.advance(119); page.flush(); assert.equal(page.state.metrics.refreshes, refreshes);
  page.advance(1); page.flush(); assert.equal(page.state.metrics.refreshes, refreshes + 1); page.state.cleanup();
});

test("native events, pointer movement and scroll perform no layout during IME", () => {
  const page = nativeFixture({ home: true }); page.start(); page.global.dispatch("compositionstart");
  const reads = page.reads; page.delta(); page.request("approval"); page.finish();
  page.global.dispatch("pointermove", { clientX: 100, clientY: 200, pointerType: "mouse" });
  page.document.dispatch("pointerdown", { target: page.composer }); page.document.dispatch("scroll"); page.advance(121); page.flush();
  assert.deepEqual(page.reads, reads); page.global.dispatch("compositionend"); page.state.cleanup();
});

test("project cards use bounded real path identities and avoid remount replays", () => {
  const page = fixture(); const attrs = { "data-app-action-sidebar-project-row": "", "data-app-action-sidebar-project-id": "/workspace/中文 项目" };
  const card = page.add(page.node("div", attrs)); page.install();
  assert.equal(card.getAttribute("data-dream-motion-enter"), "project-card"); page.advance(351);
  const repeat = page.add(page.node("div", attrs)); page.flush(); assert.equal(repeat.getAttribute("data-dream-motion-enter"), null);
  page.attribute(card, "data-app-action-sidebar-project-id", "C:\\Work\\Second Project"); page.flush(); assert.equal(card.getAttribute("data-dream-motion-enter"), "project-card");
  const invalid = page.add(page.node("div", { ...attrs, "data-app-action-sidebar-project-id": "x".repeat(513) })); page.flush(); assert.equal(invalid.getAttribute("data-dream-motion-enter"), null);
  page.state.cleanup();
});

test("standalone pixel character exposes state poses without mutating artwork", () => {
  const page = nativeFixture(); const character = motionRole(page, "character");
  assert.ok(character.querySelector("svg")); assert.equal(character.querySelectorAll("[data-dream-motion-part]").length, 13);
  page.start(); page.delta(); assert.equal(character.getAttribute("data-dream-motion-state"), "streaming");
  page.finish("failed"); assert.equal(character.getAttribute("data-dream-motion-state"), "failed");
  assert.equal(page.global.__CODEX_DREAM_SKIN_STATE__.artUrl, "blob:app://old-art"); page.state.cleanup();
});

test("action icon press stays inside its control and preserves native animations", () => {
  const page = fixture(); const button = page.add(page.node("button"), page.composer); const icon = button.appendChild(page.node("svg"));
  button.rect = { left: 0, top: 0, right: 40, bottom: 40, width: 40, height: 40 };
  icon.rect = { left: 8, top: 8, right: 32, bottom: 32, width: 24, height: 24 }; page.install();
  page.document.dispatch("pointerdown", { target: icon }); assert.equal(icon.getAttribute("data-dream-motion-press"), "icon"); page.advance(181);
  icon.computed.animationName = "native-spinner"; page.document.dispatch("pointerdown", { target: icon }); assert.equal(icon.getAttribute("data-dream-motion-press"), null); page.advance(181);
  icon.computed.animationName = "none"; icon.rect.left = 0; page.document.dispatch("pointerdown", { target: icon }); assert.equal(icon.getAttribute("data-dream-motion-press"), null); page.advance(181);
  button.computed.animationName = "native-button"; page.document.dispatch("pointerdown", { target: icon }); assert.equal(button.getAttribute("data-dream-motion-press"), null); page.state.cleanup();
});

test("minimal parallax is bounded, skips touch and cancels queued work on cleanup", () => {
  const page = nativeFixture({ home: true }); const stars = motionRole(page, "ambient");
  page.global.dispatch("pointermove", { clientX: 5000, clientY: -200, pointerType: "mouse" }); page.flush();
  assert.equal(stars.style.getPropertyValue("--dream-motion-parallax-x"), "3.00px"); assert.equal(stars.style.getPropertyValue("--dream-motion-parallax-y"), "-2.00px");
  page.global.dispatch("pointermove", { clientX: 0, clientY: 0, pointerType: "touch" }); assert.equal(page.frames.size, 0);
  page.global.dispatch("pointermove", { clientX: 0, clientY: 0, pointerType: "mouse" }); page.state.cleanup(); assert.equal(page.frames.size, 0); assert.equal(page.timers.size, 0);
});

test("a new parent run clears previous terminal feedback and route navigation revokes events", () => {
  const page = nativeFixture(); page.start(); page.finish(); assert.equal(motionRole(page, "status").getAttribute("data-dream-motion-feedback"), "completed");
  page.start("run-2"); assert.equal(motionRole(page, "status").getAttribute("data-dream-motion-feedback"), null);
  page.global.location.search = "?initialRoute=%2Flocal%2Fother"; page.global.dispatch("popstate"); page.finish("completed", "run-2"); assert.equal(page.state.inspect().state, "unknown"); page.state.cleanup();
});

function sidePanelPlacementScene() {
  const page = fixture({ home: true });
  page.global.innerWidth = 1354; page.global.innerHeight = 970;
  page.main.computed.visibility = "hidden";
  const pane = page.add(page.node("div", { "data-app-shell-pane-frame": "true" }), page.body);
  const header = pane.appendChild(page.node("div"));
  const diff = pane.appendChild(page.node("diffs-container"));
  const rail = page.add(page.node("div"), page.body); rail.computed.overflowY = "auto";
  const hit = (x, y) => x <= 45 ? rail : x >= 838 ? (y < 136 ? header : diff) : page.surface;
  return { page, hit };
}

function assertInteriorDecorations(page) {
  for (const role of ["status", "character", "ambient"]) {
    assert.equal(motionRole(page, role).style.getPropertyValue("visibility"), "visible", `${role} should find the free main area`);
  }
  const status = motionRole(page, "status"), ambient = motionRole(page, "ambient");
  const group = { x: parseFloat(status.style.getPropertyValue("left")) - 4,
    y: parseFloat(status.style.getPropertyValue("top")) - 44, width: 80, height: 76 };
  const stars = { x: parseFloat(ambient.style.getPropertyValue("left")) - 4,
    y: parseFloat(ambient.style.getPropertyValue("top")) - 4, width: 76, height: 112 };
  for (const rect of [group, stars]) {
    assert.ok(rect.x > 45 && rect.x + rect.width < 838, "decorations must stay outside the scrolling rail and diff pane");
    assert.ok(rect.y >= 8 && rect.y + rect.height <= 962, "the full sampled rectangle must fit inside the viewport");
  }
  assert.ok(group.x + group.width <= stars.x || stars.x + stars.width <= group.x
    || group.y + group.height <= stars.y || stars.y + stars.height <= group.y,
    "fallback star and character/status rectangles must not overlap");
}

test("decorations find an interior gap when the right diff pane and left scroll rail occupy the edges", () => {
  const { page, hit } = sidePanelPlacementScene(); page.document.elementFromPoint = hit;
  page.install(configuration("full")); page.intersect(page.main, true);
  assert.equal(page.state.inspect().paused, false);
  assertInteriorDecorations(page);
  page.state.cleanup();
});

test("placement rechecks new obstacles and hides when no interior gap remains", () => {
  const { page, hit } = sidePanelPlacementScene();
  page.install(configuration("full")); page.intersect(page.main, true);
  const initialLeft = motionRole(page, "character").style.getPropertyValue("left");
  page.document.elementFromPoint = hit; page.global.dispatch("resize"); page.flush();
  assertInteriorDecorations(page);
  assert.notEqual(motionRole(page, "character").style.getPropertyValue("left"), initialLeft);
  page.document.elementFromPoint = () => page.composer; page.global.dispatch("resize"); page.flush();
  for (const role of ["status", "character", "ambient"]) {
    assert.equal(motionRole(page, role).style.getPropertyValue("visibility"), "hidden");
  }
  page.state.cleanup();
});

test("interior fallback performs no hit testing or layout reads during IME composition", () => {
  const { page, hit } = sidePanelPlacementScene(); let hits = 0;
  page.document.elementFromPoint = (x, y) => { hits += 1; return hit(x, y); };
  page.install(configuration("full")); page.intersect(page.main, true);
  page.global.dispatch("compositionstart");
  const reads = page.reads; hits = 0;
  page.global.dispatch("resize"); page.document.dispatch("scroll"); page.advance(121); page.flush();
  assert.equal(hits, 0); assert.deepEqual(page.reads, reads);
  page.global.dispatch("compositionend");
  assertInteriorDecorations(page);
  page.state.cleanup();
});

test("interior candidate search keeps the total hit-test budget at 1600", () => {
  const page = fixture({ home: true }); let hits = 0;
  page.document.elementFromPoint = () => ++hits % 182 === 181 ? page.composer : page.surface;
  page.install(configuration("full"));
  assert.ok(hits <= 1600, "additional candidates must share the existing global sample limit");
  for (const role of ["status", "character", "ambient"]) {
    assert.equal(motionRole(page, role).style.getPropertyValue("visibility"), "hidden");
  }
  page.state.cleanup();
});

test("interior fallback stays hidden without hit testing when even the decoration box cannot fit", () => {
  const page = fixture({ home: true }); let hits = 0;
  page.global.innerWidth = 90; page.global.innerHeight = 70;
  page.document.elementFromPoint = () => { hits += 1; return page.surface; };
  page.install(configuration("full"));
  for (const role of ["status", "character"]) assert.equal(motionRole(page, role).style.getPropertyValue("visibility"), "hidden");
  assert.equal(motionRole(page, "ambient"), null);
  assert.equal(hits, 0);
  page.state.cleanup();
});

test("ambient placement checks its full 104px height plus parallax margins", () => {
  const page = fixture({ home: true }); const obstacle = page.add(page.node("button"));
  // Only an 88px-high strip is clear; no alternative can fit all 112px.
  page.document.elementFromPoint = (x, y) => x >= 1108 && x <= 1184 && y >= 92 && y < 180 ? page.main : obstacle;
  page.install(configuration("full"));
  assert.equal(motionRole(page, "ambient").style.getPropertyValue("visibility"), "hidden"); page.state.cleanup();
});

test("decorations avoid empty native diff panes and timeline regions", () => {
  for (const attributes of [{ "data-app-shell-pane-frame": "true" }, { "data-app-action-timeline-scroll": "" }]) {
    const page = fixture({ home: true });
    const pane = page.add(page.node("div", attributes));
    const emptySpace = page.add(page.node("div"), pane);
    page.document.elementFromPoint = () => emptySpace;
    page.install(configuration("full"));
    for (const role of ["status", "character", "ambient"]) {
      assert.equal(motionRole(page, role).style.getPropertyValue("visibility"), "hidden");
    }
    page.state.cleanup();
  }
});

test("detaching a feedback row releases timers and cleanup removes scroll capture", () => {
  const page = nativeFixture(); const row = agentRow(page); page.flush(); page.start(); page.agents({ child: { status: "running" } });
  page.start("child-run", "child"); page.finish("completed", "child-run", "child");
  row.remove(); page.mutate([{ type: "childList", target: page.surface, addedNodes: [], removedNodes: [row] }]); page.flush();
  assert.equal(row.getAttribute("data-dream-motion-agent-state"), null); assert.equal(page.state.inspect().feedbackNodes, 0);
  page.document.dispatch("scroll"); page.state.cleanup(); assert.equal(page.timers.size, 0); assert.equal(page.document.listenerCount(), 0);
});

test("a native activity group remains busy while any known command or patch is active", () => {
  const page = nativeFixture(); const row = page.add(page.node("div", { "data-local-conversation-item-target-ids": "command-1 patch-1" })); page.flush(); page.start();
  page.tool("inProgress", "command-1"); page.tool("inProgress", "patch-1"); page.tool("completed", "command-1");
  assert.equal(row.getAttribute("data-dream-motion-item-state"), "busy"); assert.equal(row.getAttribute("data-dream-motion-feedback"), null);
  page.tool("completed", "patch-1"); assert.equal(row.getAttribute("data-dream-motion-item-state"), "completed"); assert.equal(row.getAttribute("data-dream-motion-feedback"), "completed");
  const feedbacks = page.state.metrics.feedbacks; page.advance(421);
  page.attribute(row, "data-local-conversation-item-target-ids", "patch-1 command-1"); page.flush();
  assert.equal(row.getAttribute("data-dream-motion-feedback"), null); assert.equal(page.state.metrics.feedbacks, feedbacks); page.state.cleanup();
});

test("settled grouped tool feedback prioritizes failures and cancellations", () => {
  for (const [status, expected] of [["failed", "failed"], ["declined", "cancelled"]]) {
    const page = nativeFixture(); const row = page.add(page.node("div", { "data-local-conversation-item-target-ids": "command-1 patch-1" })); page.flush(); page.start();
    page.tool("inProgress", "command-1"); page.tool("inProgress", "patch-1"); page.tool(status, "command-1");
    assert.equal(row.getAttribute("data-dream-motion-item-state"), "busy"); page.tool("completed", "patch-1");
    assert.equal(row.getAttribute("data-dream-motion-item-state"), expected); assert.equal(row.getAttribute("data-dream-motion-feedback"), expected); page.state.cleanup();
  }
});

test("native web search completes without a status field and only celebrates an observed run", () => {
  const page = nativeFixture(); const row = page.add(page.node("div", { "data-local-conversation-item-target-ids": "search-1" })); page.flush(); page.start();
  const params = { threadId: "parent", turnId: "run-1", item: { type: "webSearch", id: "search-1", query: "fixture search", action: { type: "search", query: "fixture search" } } };
  page.notify("item/started", params); assert.equal(row.getAttribute("data-dream-motion-item-state"), "busy");
  page.notify("item/completed", { ...params, turnId: "wrong-run" }); assert.equal(row.getAttribute("data-dream-motion-item-state"), "busy");
  page.notify("item/completed", params); assert.equal(row.getAttribute("data-dream-motion-item-state"), "completed"); assert.equal(row.getAttribute("data-dream-motion-feedback"), "completed");
  const feedbacks = page.state.metrics.feedbacks; page.advance(421); page.notify("item/completed", params);
  assert.equal(page.state.metrics.feedbacks, feedbacks); assert.equal(row.getAttribute("data-dream-motion-feedback"), null);
  page.attribute(row, "data-local-conversation-item-target-ids", "search-history"); page.flush();
  page.notify("item/completed", { ...params, item: { ...params.item, id: "search-history" } });
  assert.equal(row.getAttribute("data-dream-motion-item-state"), "completed"); assert.equal(row.getAttribute("data-dream-motion-feedback"), null);
  assert.equal(page.state.inspect().state, "busy", "a completed search must not complete its parent turn"); page.state.cleanup();
});
