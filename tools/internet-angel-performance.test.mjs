import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const source = await readFile(new URL("../runtime/internet-angel-extension.js", import.meta.url), "utf8");
const enabledSource = source.replace("__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__", "true");

// Default tests require only Node. The optional browser benchmark uses an
// isolated, synthetic page; it never connects to a running Codex or profile.
// PowerShell example (paths refer to your own installed dependencies/browser):
// $env:DREAM_SKIN_BROWSER_PERF='1'
// $env:PLAYWRIGHT_MODULE_PATH='<node_modules>/playwright'
// $env:DREAM_SKIN_BROWSER_EXECUTABLE='<Chrome or Edge executable>'
// $env:DREAM_SKIN_PERF_BASELINE_REF='<commit before the performance fix>'
// node --test tools/internet-angel-performance.test.mjs
function fixture() {
  let clock = 0;
  let nextId = 0;
  const timers = new Map();
  const frames = new Map();
  const listeners = new Map();
  const observers = [];
  const nodes = [];
  let containerTextReads = 0;
  const node = (tagName, text, children = []) => {
    const attributes = new Map();
    const element = {
      nodeType: 1, tagName, children, childElementCount: children.length,
      parentElement: null,
      get textContent() {
        if (tagName !== "BUTTON" && children.length) containerTextReads += 1;
        return text;
      },
      getAttribute(name) { return attributes.get(name) ?? null; },
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); },
      matches(selector) { return selector === "button" && tagName === "BUTTON"; },
      closest(selector) {
        let current = this;
        while (current) {
          if (current.matches(selector)) return current;
          current = current.parentElement;
        }
        return null;
      },
      querySelector() { return null; },
      querySelectorAll(selector) { return selector === "button" ? children.filter((child) => child.tagName === "BUTTON") : []; },
    };
    for (const child of children) child.parentElement = element;
    nodes.push(element);
    return element;
  };
  const leaf = node("SPAN", "A long ordinary conversation ".repeat(100));
  let nested = leaf;
  for (let index = 0; index < 100; index += 1) nested = node("DIV", leaf.textContent, [nested]);
  const label = node("SPAN", "3 selected text fragments");
  const selected = node("BUTTON", label.textContent, [label]);
  const document = {
    body: {},
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === "button, div, span") return nodes;
      if (selector === "button, [role=button]") return [selected];
      if (selector === "body div, body section, body aside") return nodes.filter((item) => item.tagName === "DIV");
      if (selector === "[data-angel-component]") return nodes.filter((item) => item.getAttribute("data-angel-component") !== null);
      return [];
    },
  };
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() {}
  }
  const window = {
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
    requestAnimationFrame(callback) { const id = ++nextId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  vm.runInNewContext(enabledSource, {
    document, window, MutationObserver: Observer,
    innerWidth: 1280,
    performance: { now: () => clock },
    setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { callback, at: clock + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  const advance = (milliseconds) => {
    clock += milliseconds;
    for (const [id, pending] of [...timers]) {
      if (pending.at > clock) continue;
      timers.delete(id);
      pending.callback();
    }
    for (const [id, callback] of [...frames]) { frames.delete(id); callback(clock); }
  };
  return {
    selected, listeners, timers, frames, advance,
    state: window.__CODEX_INTERNET_ANGEL_EXTENSION_STATE__,
    mutate() { observers[0].callback([{ type: "attributes", attributeName: "data-ds-part" }]); },
    get containerTextReads() { return containerTextReads; },
  };
}

test("nested conversation containers are never read as selection captions or toast content", () => {
  const probe = fixture();
  assert.equal(probe.containerTextReads, 0, "avoid repeatedly flattening the conversation ancestors");
  assert.equal(probe.selected.getAttribute("data-angel-component"), "selected-fragment", "nested button captions still classify");
  probe.state.refresh();
  assert.equal(probe.containerTextReads, 0, "repeat classification must preserve bounded text reads");
});

test("continuous structural mutations coalesce without starving later classifications", () => {
  const probe = fixture();
  const initial = probe.state.metrics.classifyRuns;
  for (let tick = 0; tick < 60; tick += 1) {
    probe.mutate();
    probe.advance(16);
  }
  const runs = probe.state.metrics.classifyRuns - initial;
  assert.ok(runs >= 6 && runs <= 8, `expected 6–8 refreshes over 960 ms, received ${runs}`);
  assert.ok(probe.timers.size + probe.frames.size <= 1, "a burst owns at most one pending refresh");
  const beforeFinal = probe.state.metrics.classifyRuns;
  probe.advance(150);
  assert.equal(probe.state.metrics.classifyRuns, beforeFinal + 1, "the last pending mutation eventually refreshes");
});

test("IME composition suspends pending and new refreshes, then refreshes once", () => {
  const probe = fixture();
  probe.mutate();
  const initial = probe.state.metrics.classifyRuns;
  probe.listeners.get("compositionstart")();
  for (let index = 0; index < 20; index += 1) { probe.mutate(); probe.advance(16); }
  assert.equal(probe.state.metrics.classifyRuns, initial);
  assert.equal(probe.timers.size + probe.frames.size, 0);
  probe.listeners.get("compositionend")();
  probe.advance(150);
  assert.equal(probe.state.metrics.classifyRuns, initial + 1);
  probe.state.cleanup();
  assert.equal(probe.timers.size + probe.frames.size, 0);
});

test("isolated Chromium long-chat benchmark and positive UI fixtures", {
  skip: process.env.DREAM_SKIN_BROWSER_PERF !== "1" ? "opt in with DREAM_SKIN_BROWSER_PERF=1 and installed Playwright/Chromium" : false,
}, async (context) => {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.DREAM_SKIN_BROWSER_EXECUTABLE ? { executablePath: process.env.DREAM_SKIN_BROWSER_EXECUTABLE } : {}),
  });
  try {
    // Keep the comparison stable after this fix is committed or merged.
    const baselineRef = process.env.DREAM_SKIN_PERF_BASELINE_REF || "v1.5.20";
    const baseline = execFileSync("git", ["show", `${baselineRef}:runtime/internet-angel-extension.js`], {
      cwd: projectRoot, encoding: "utf8", maxBuffer: 2 * 1024 * 1024,
    });
    const run = async (script, description) => {
      const page = await browser.newPage();
      try {
        await page.setContent('<main class="main-surface"><div id="chat"></div></main><div id="portals"></div>');
        await page.evaluate(() => {
          const chat = document.getElementById("chat");
          for (let message = 0; message < 160; message += 1) {
            let parent = chat;
            for (let depth = 0; depth < 40; depth += 1) {
              const wrapper = document.createElement("div");
              wrapper.dataset.perfContainer = "true";
              parent.appendChild(wrapper);
              parent = wrapper;
            }
            const leaf = document.createElement("span");
            leaf.textContent = "Synthetic ordinary assistant output. ".repeat(64);
            parent.appendChild(leaf);
          }
          const nativeText = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
          window.__perfProbe = { ancestorReads: 0, textCharacters: 0 };
          Object.defineProperty(Node.prototype, "textContent", {
            configurable: true,
            get() {
              const value = nativeText.get.call(this);
              if (this.nodeType === 1 && this.hasAttribute("data-perf-container")) {
                window.__perfProbe.ancestorReads += 1;
                window.__perfProbe.textCharacters += value.length;
              }
              return value;
            },
            set(value) { nativeText.set.call(this, value); },
          });
        });
        await page.evaluate(script.replace("__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__", "true"));
        const result = await page.evaluate(() => {
          const state = window.__CODEX_INTERNET_ANGEL_EXTENSION_STATE__;
          const durations = [];
          for (let index = 0; index < 7; index += 1) {
            state.refresh();
            durations.push(state.metrics.lastClassifyMs);
          }
          durations.sort((left, right) => left - right);
          return { ...window.__perfProbe, medianClassifyMs: durations[3], classifyRuns: state.metrics.classifyRuns };
        });
        context.diagnostic(`${description}: ${JSON.stringify(result)}`);
        if (description === "current") {
          assert.equal(result.ancestorReads, 0, "real DOM chat ancestors must not be flattened for unrelated UI labels");
          await page.evaluate(() => {
            const portals = document.getElementById("portals");
            portals.innerHTML = '<button id="selected"><span><span>3 selected text fragments</span></span></button>' +
              '<div data-sonner-toast><aside class="rounded-2xl" id="toast"><div>Rate limit reset opportunity</div><button>View reset</button></aside></div>';
          });
          await page.waitForFunction(() =>
            document.getElementById("toast").getAttribute("data-angel-component") === "system-toast",
          );
          assert.equal(await page.locator("#selected").getAttribute("data-angel-component"), "selected-fragment");
          assert.equal(await page.locator("#toast").getAttribute("data-angel-component"), "system-toast");
        }
        return result;
      } finally { await page.close(); }
    };
    const before = await run(baseline, `${baselineRef} baseline`);
    const after = await run(source, "current");
    context.diagnostic(`Synthetic classifier median speedup: ${(before.medianClassifyMs / Math.max(after.medianClassifyMs, 0.001)).toFixed(2)}x; timing is informational, deterministic DOM-read assertions decide pass/fail.`);
  } finally { await browser.close(); }
});
