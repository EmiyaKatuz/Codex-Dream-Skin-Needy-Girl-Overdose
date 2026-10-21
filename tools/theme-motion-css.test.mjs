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

test("shared full-mode timelines are bounded by role, route, state and pause", () => {
  const loops = leafRules.filter(({ body }) => /animation\s*:[^;]*\binfinite\b/.test(body));
  assert.equal(loops.length, 11, "Shared motion is bounded to five base timelines and six compact legacy details");
  for (const { selector, body } of loops) {
    assert.ok(selector.includes('[data-dream-motion="full"]'));
    assert.ok(selector.includes('[data-dream-motion-paused="false"]'));
    assert.ok(selector.includes("[data-dream-motion-owned]"));
    if (selector.includes('[data-dream-motion-role="status"]')) {
      assert.ok(selector.includes('[data-dream-motion-state="busy"]'));
      assert.ok(selector.includes('[data-dream-motion-state="streaming"]'), "Streaming reuses the existing status channel");
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

test("shared eyelids halve the interval while preserving original half/closed gesture durations", () => {
  const legacy = read("windows/assets/dream-skin.css");
  const frames = (sheet, name) => sheet.match(new RegExp(`@keyframes ${name}\\s*\\{((?:[^{}]|\\{[^{}]*\\})*)\\}`))?.[1].replace(/\s/g, "");
  const points = (frames) => [...frames.matchAll(/([\d%,.]+)\{opacity:([01]);\}/g)]
    .flatMap((match) => match[1].split(",").map((value) => [parseFloat(value), Number(match[2])]))
    .filter(([time]) => time > 0 && time < 100).sort((a, b) => a[0] - b[0]);
  for (const [original, shared] of [["dream-choten-blink-half", "dream-motion-wallpaper-blink-half"],
    ["dream-choten-blink-closed", "dream-motion-wallpaper-blink"]]) {
    assert.ok(frames(legacy, original));
    const originalDuration = Number(legacy.match(new RegExp(`animation:\\s*${original} ([\\d.]+)s`))?.[1]);
    const rule = leafRules.find(({body}) => body.includes(`animation: ${shared} `));
    const sharedDuration = Number(rule.body.match(/animation:\s*\S+ ([\d.]+)s/)?.[1]);
    assert.equal(sharedDuration, originalDuration / 2, "the interval must be exactly 50% shorter");
    const before = points(frames(legacy, original)), after = points(frames(css, shared));
    assert.equal(after.length, before.length);
    assert.ok(after.length > 1);
    for (let index = 0; index < before.length; index += 1) {
      assert.equal(after[index][1], before[index][1]);
      if (index === 0) continue;
      assert.ok(Math.abs((after[index][0] - after[index - 1][0]) * sharedDuration
        - (before[index][0] - before[index - 1][0]) * originalDuration) < .00001,
      "half and closed phases must retain their original durations");
    }
    assert.match(rule.body, /5\.7s steps\(1, end\) infinite/);
    assert.match(rule.body, /animation-play-state:\s*paused/);
  }
});

test("off and paused rules stop only identified skin effects", () => {
  for (const { selector, body } of leafRules.filter(({ selector }) => selector.startsWith("html"))) {
    if (!/animation\s*:\s*none/.test(body)) continue;
    assert.ok(/data-dream-motion-owned|data-dream-motion-enter|data-dream-motion-feedback|data-dream-motion-press|#codex-dream-skin-chrome/.test(selector),
      `A native spinner could be disabled by ${selector}`);
    assert.doesNotMatch(selector, /html:root(?:\[[^\]]+\])+\s+\*(?:::before|::after)?\s*(?:,|$)/);
  }
  assert.match(css, /data-dream-motion="off"/);
  assert.match(css, /data-dream-motion-paused="true"/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.ok(css.includes(".dream-subagent-row-live"), "Retire the legacy Linux filter/shadow pulse too");
});

test("native feedback outlines stay inside their bounds and never add row loops", () => {
  const focus = leafRules.find(({ selector }) => selector.endsWith(":focus-within"));
  assert.ok(focus);
  assert.match(focus.body, /outline-offset:\s*-2px\s*;/);
  const rowRules = leafRules.filter(({ selector }) => /data-dream-motion-(?:agent|item)-state/.test(selector));
  assert.ok(rowRules.length > 0);
  for (const { selector, body } of rowRules) {
    assert.doesNotMatch(body, /\b(?:transform|translate|scale|height|width|position|overflow)\s*:/);
    assert.doesNotMatch(body, /\binfinite\b/);
    if (!/animation\s*:\s*dream-motion-/.test(body)) continue;
    assert.ok(selector.includes('[data-dream-motion-paused="false"]'));
    assert.ok(selector.includes('[data-dream-motion-status="on"]'));
    assert.ok(selector.includes('[data-dream-motion-feedback="completed"]'));
    assert.match(body, /outline-offset:\s*-2px\s*;/);
  }
});

test("icon feedback only targets marked SVGs and moves at most one pixel", () => {
  const icon = leafRules.find(({ body }) => /animation:\s*dream-motion-icon-press/.test(body));
  assert.ok(icon);
  assert.ok(icon.selector.endsWith('svg[data-dream-motion-press="icon"]'));
  assert.ok(icon.selector.includes('[data-dream-motion-interactions="on"]'));
  assert.ok(icon.selector.includes('[data-dream-motion-paused="false"]'));
  assert.match(icon.body, /140ms[^;]*\s1\s*;/);
  const animation = css.match(/@keyframes dream-motion-icon-press\s*\{((?:[^{}]|\{[^{}]*\})*)\}/)?.[1];
  assert.ok(animation);
  for (const [, y] of animation.matchAll(/translate:\s*0\s+(-?[\d.]+)(?:px)?/g)) assert.ok(Math.abs(Number(y)) <= 1);
  assert.doesNotMatch(animation, /\b(?:scale|transform|rotate|height|width)\s*:/);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\[data-dream-motion-press\][^{]*\{[^}]*animation:\s*none\s*!important/);
});

test("card staggering is capped at four and ambient parallax is paint-only and clamped", () => {
  const delays = leafRules.filter(({ body }) => /animation-delay\s*:/.test(body));
  assert.equal(delays.length, 3);
  for (let index = 1; index <= 3; index += 1) {
    const entry = delays.find(({ selector }) => selector.includes(`[data-dream-motion-index="${index}"]`));
    assert.ok(entry);
    assert.ok(entry.selector.includes('[data-dream-motion-enter="home-card"]'));
    assert.ok(entry.selector.includes('[data-dream-motion-enter="project-card"]'));
    assert.match(entry.body, new RegExp(`animation-delay:\\s*${index * 25}ms`));
  }
  const ambient = leafRules.find(({ selector, body }) => selector.endsWith('[data-dream-motion-role="ambient"]') && body.includes("position: fixed"));
  assert.ok(ambient);
  assert.match(ambient.body, /translate:\s*clamp\(-3px, var\(--dream-motion-parallax-x, 0px\), 3px\) clamp\(-2px, var\(--dream-motion-parallax-y, 0px\), 2px\)/);
  assert.doesNotMatch(ambient.body, /\b(?:filter|backdrop-filter|will-change)\s*:/);
});

test("character shapes remain inside the skin-owned badge and finite states stop with reduced motion", () => {
  const shapes = leafRules.filter(({ selector }) => selector.includes("data-dream-motion-part"));
  assert.ok(shapes.length > 0);
  for (const { selector, body } of shapes) {
    assert.ok(selector.includes("[data-dream-motion-owned]"));
    assert.ok(selector.includes('[data-dream-motion-role="character"]'));
    assert.doesNotMatch(body, /\b(?:animation|position|transform|translate|scale)\s*:/);
  }
  const nod = leafRules.filter(({ body }) => /animation:\s*dream-motion-nod/.test(body));
  assert.ok(nod.length > 0);
  for (const { selector, body } of nod) {
    assert.ok(selector.includes('[data-dream-motion-feedback='));
    assert.ok(selector.includes('[data-dream-motion-paused="false"]'));
    assert.match(body, /280ms[^;]*\s1\s*;/);
  }
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\[data-dream-motion-feedback\][\s\S]*animation:\s*none\s*!important/);
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
