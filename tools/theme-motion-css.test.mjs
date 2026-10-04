import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Static safety contracts complement the controller and cloud-browser tests.
// They inspect the real CSS; they do not pretend to match a synthetic DOM.
const root = new URL("../", import.meta.url);
const read = (file) => readFileSync(new URL(file, root), "utf8");
const css = read("runtime/theme-motion.css").replace(/\/\*[\s\S]*?\*\//g, "");
const leafRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, body]) => ({ selector: selector.trim(), body }));

test("the effective mode overrides the obsolete inline standard token", () => {
  for (const mode of ["off", "subtle", "full"]) {
    const rule = leafRules.find(({ selector }) => selector === `html:root[data-dream-motion="${mode}"]`);
    assert.ok(rule, `missing ${mode} root token`);
    assert.match(rule.body, new RegExp(`--ds-theme-motion-level:\\s*${mode}\\s*!important`));
  }
  assert.match(css, /@layer dreamskin-accessibility\s*\{/);
});

test("native composer pseudo-elements and content geometry are not motion surfaces", () => {
  for (const { selector, body } of leafRules) {
    if (!selector.startsWith("html")) continue;
    assert.doesNotMatch(selector, /(?:main\b|\.thread-scroll-container\b|\[data-sticky\]|data-app-shell-main-content-top-fade)/,
      "Motion must not bind to content or migrated fade hosts");
    if (/composer(?:"|\b)/.test(selector) && !selector.includes("composer-action")) {
      assert.doesNotMatch(selector, /::(?:before|after)/, "The native composer owns its pseudo-elements");
    }
    if (/\b(?:transform|translate|scale|rotate)\s*:/.test(body)) {
      assert.ok(selector.includes("data-dream-motion-owned")
        || selector.includes("chevron")
        || selector.includes('data-dream-motion-interactions="off"'),
      `Unexpected native geometry animation: ${selector}`);
    }
  }
  assert.doesNotMatch(css, /\bwill-change\s*:/, "No permanent compositor promotion");
});

test("three full-mode timelines are bounded by role, route, state and pause", () => {
  const loops = leafRules.filter(({ body }) => /animation\s*:[^;]*\binfinite\b/.test(body));
  assert.equal(loops.length, 3, "Home has only status, character and ambient channels");
  for (const { selector, body } of loops) {
    assert.ok(selector.includes('[data-dream-motion="full"]'));
    assert.ok(selector.includes('[data-dream-motion-paused="false"]'));
    assert.ok(selector.includes("[data-dream-motion-owned]"));
    if (selector.includes('[data-dream-motion-role="status"]')) {
      assert.ok(selector.includes('[data-dream-motion-state="busy"]'));
      assert.ok(selector.includes('[data-dream-motion-status="on"]'));
    } else {
      assert.ok(selector.includes('[data-dream-motion-route="home"]'), "Task routes have only one continuing status animation");
    }
    assert.doesNotMatch(body, /(?:filter|box-shadow|backdrop-filter)\s*:/);
  }
  for (const { selector, body } of leafRules.filter(({ selector }) => /^(?:from|to|[\d%, ]+)$/.test(selector))) {
    assert.doesNotMatch(body, /(?:filter|box-shadow|backdrop-filter|background-position|height|width)\s*:/,
      `Keyframes must not continuously repaint expensive native surfaces: ${selector}`);
  }
});

test("off and paused rules stop only identified skin effects", () => {
  for (const { selector, body } of leafRules.filter(({ selector }) => selector.startsWith("html"))) {
    if (!/animation\s*:\s*none/.test(body)) continue;
    assert.ok(/data-dream-motion-owned|data-dream-motion-enter|data-dream-motion-feedback|#codex-dream-skin-chrome/.test(selector),
      `A native spinner could be disabled by ${selector}`);
    assert.doesNotMatch(selector, /html:root(?:\[[^\]]+\])+\s+\*(?:::before|::after)?\s*(?:,|$)/);
  }
  assert.match(css, /data-dream-motion="off"/);
  assert.match(css, /data-dream-motion-paused="true"/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.ok(css.includes(".dream-subagent-row-live"), "Retire the legacy Linux filter/shadow pulse too");
});

test("skin reduction no longer changes all native animation durations", () => {
  for (const file of [
    "runtime/dream-skin.css", "runtime/internet-angel-extension.css",
    "windows/assets/dream-skin.css", "linux/assets/dream-skin.css",
  ]) {
    const source = read(file).replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(source,
      /html(?:\.[\w-]+|\[[^\]]+\])*\s+\*(?:::before|::after)?\s*(?:,\s*html[^{}]+)?\s*\{[^{}]*\banimation-(?:duration|iteration-count)\s*:/,
      `${file} must preserve native progress indicators with reduced motion`);
  }
});

test("feedback has no visibility dependency and the old background stays behind content", () => {
  for (const { selector, body } of leafRules) {
    if (selector.startsWith("html") && selector.includes("data-dream-motion-enter")) {
      assert.doesNotMatch(body, /\b(?:opacity|visibility|display|position|transform|translate|scale|height|width)\s*:/,
        "Entry feedback may paint an edge but cannot hide or reposition native content");
    }
  }
  const snapshot = leafRules.find(({ selector, body }) => selector.endsWith('[data-dream-motion-role="theme-transition"]')
    && body.includes("position: fixed"));
  assert.ok(snapshot);
  assert.match(snapshot.body, /z-index:\s*-1\s*;/);
  const fade = leafRules.find(({ body }) => /animation:\s*dream-motion-theme-fade/.test(body));
  assert.ok(fade.selector.includes('[data-dream-motion-feedback="theme-transition"]'), "Do not fade the prepared snapshot before handoff");
  assert.match(css, /pointer-events:\s*none\s*!important/);
});
