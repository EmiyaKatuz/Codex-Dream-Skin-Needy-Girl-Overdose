import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { cssPredicateManifest, cacheableCssPredicateManifest, createCssPredicateCache } from "./css-predicate-cache.mjs";

test("unique predicates have stable markers without changing source CSS", () => {
  const source = "main:has(*) {} main:not(:has(*)) {} body:has(.home) {}";
  const manifest = cssPredicateManifest(source);
  assert.deepEqual(manifest.map(({ selector, attribute }) => ({ selector, attribute })), [
    { selector: ":has(*)", attribute: "data-dream-has-0" },
    { selector: ":has(.home)", attribute: "data-dream-has-1" },
  ]);
  assert.equal(manifest[0].replacement, ":is(:where([data-dream-has-0]), :is(* *):not(*))");
  assert.equal(source, "main:has(*) {} main:not(:has(*)) {} body:has(.home) {}");
});

test("specificity carrier retains ID, class, type and nested functional arguments", () => {
  for (const argument of ["*", "#home", ".home", "main", ":is(#home, .home) > article:not(.hidden)"]) {
    const [predicate] = cssPredicateManifest(`body:has(${argument}) { color: red; }`);
    assert.equal(predicate.replacement,
      `:is(:where([data-dream-has-0]), :is(* ${argument}):not(*))`);
    // Added *, :where(marker), and :not(*) all contribute zero specificity;
    // :is(argument) uses the same maximum branch specificity as :has(argument).
    assert.ok(!predicate.replacement.includes(":has("));
  }
});

test("relative lists split only on top-level commas", () => {
  const argument = '> [data-label="a,b)"]:is(.a, .b), + section, ~ aside';
  const [predicate] = cssPredicateManifest(`main:has(${argument}) {}`);
  assert.equal(predicate.replacement,
    ':is(:where([data-dream-has-0]), :is(* > [data-label="a,b)"]:is(.a, .b), * + section, * ~ aside):not(*))');
  assert.deepEqual(predicate.branches, [
    { selector: '[data-label="a,b)"]:is(.a, .b)', relation: "child" },
    { selector: "section", relation: "adjacent" },
    { selector: "aside", relation: "sibling" },
  ]);
  const [escaped] = cssPredicateManifest('main:has(.a\\,b, [data-x="a\\\"b,c"]) {}');
  assert.ok(escaped.replacement.includes('* .a\\,b, * [data-x="a\\\"b,c"]'));
});

test("comments and strings do not create executable predicates", () => {
  assert.deepEqual(cssPredicateManifest('/* :has(.fake) */ a { content: ":has(.fake)"; }'), []);
  const [predicate] = cssPredicateManifest('a:has(/* comma, */ > .real) {}');
  assert.equal(predicate.selector, ':has(/* comma, */ > .real)');
  assert.deepEqual(predicate.branches, [{ selector: ".real", relation: "child" }]);
});

test("leaf query metadata preserves complex chains and descendant relations", () => {
  const [predicate] = cssPredicateManifest('a:has(> section > .leaf, + aside .leaf, ~ article > .leaf, main .leaf) {}');
  assert.deepEqual(predicate.branches, [
    { selector: "section > .leaf", relation: "child" },
    { selector: "aside .leaf", relation: "adjacent" },
    { selector: "article > .leaf", relation: "sibling" },
    { selector: "main .leaf", relation: "descendant" },
  ]);
});

test("malformed or nested predicates fail compilation", () => {
  for (const source of ["a:has(", "a:has() {}", "a:has(.a,) {}", "a:has(>.a, +) {}",
    "a:has([x) {}", "a:has(.a { color:red; }", 'a:has([x="unterminated]) {}',
    "a:has(:is(.a, :has(.b))) {}", "/* unterminated"]) {
    assert.throws(() => cssPredicateManifest(source), undefined, source);
  }
});

test("current expanded platform CSS is supported and executable has predicates are fully replaced", async () => {
  const css = await fs.readFile(new URL("../macos/assets/dream-skin.css", import.meta.url), "utf8");
  const manifest = cssPredicateManifest(css);
  assert.ok(manifest.length > 0);
  let optimized = css;
  for (const { selector, replacement } of manifest) optimized = optimized.replaceAll(selector, replacement);
  assert.deepEqual(cssPredicateManifest(optimized), []);
  assert.equal(new Set(manifest.map(({ attribute }) => attribute)).size, manifest.length);
});

test("only observed route landmarks are cached; interactive and extension predicates remain native", () => {
  const css = 'html:has([role="main"]) {} nav:has([data-settings-panel-slug]) {}'
    + 'html:has([data-angel-component="side-workspace"]) {} div:has(button:hover) {}'
    + 'main:has([data-ds-part="main"]) {} button:has([aria-pressed="true"]) {}';
  assert.deepEqual(cacheableCssPredicateManifest(css).map(({ selector }) => selector), [
    ':has([role="main"])', ':has([data-settings-panel-slug])',
  ]);
});

function cacheFixture() {
  const nodes = [];
  const matches = new Map();
  const node = (parentElement = null) => {
    const attributes = new Map();
    const result = {
      parentElement, nodeType: 1,
      getAttribute: (name) => attributes.get(name) ?? null,
      setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: (name) => attributes.delete(name),
      matches: (selector) => selector === '[role="main"]'
        ? attributes.get('role') === 'main' : matches.get(selector)?.has(result) ?? false,
      closest: () => null,
    };
    nodes.push(result);
    return result;
  };
  const html = node();
  const body = node(html);
  const main = node(body);
  const leaves = [main];
  matches.set(':has([role="main"])', new Set([html, body]));
  const observers = [];
  const timers = new Map();
  let clockNow = 0;
  let nextTimer = 0;
  const context = {
    document: {
      documentElement: html,
      querySelectorAll(selector) {
        if (selector === '[role="main"]') return leaves;
        if (/^\[data-dream-has-\d+\]$/.test(selector)) {
          return nodes.filter((candidate) => candidate.getAttribute(selector.slice(1, -1)) !== null);
        }
        throw new Error(`Unexpected broad cache query: ${selector}`);
      },
    },
    performance: { now: () => clockNow },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe(target, options) { this.target = target; this.options = options; }
      disconnect() { this.disconnected = true; }
    },
    setTimeout(callback, delay) {
      const id = ++nextTimer;
      timers.set(id, { callback, delay, dueAt: clockNow + delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  const manifest = cacheableCssPredicateManifest('html:has([role="main"]) {}');
  const cache = vm.runInNewContext(`(${createCssPredicateCache.toString()})(document, ${JSON.stringify(manifest)})`, context);
  const advance = (milliseconds) => {
    clockNow += milliseconds;
    for (const [id, timer] of [...timers]) {
      if (timer.dueAt > clockNow) continue;
      timers.delete(id);
      timer.callback();
    }
  };
  return { cache, manifest, html, body, main, leaves, matches, observers, timers, advance };
}

test("light media gate follows actual root mode, avoids repeat writes and repairs replaced rules", () => {
  const { cache, html, matches } = cacheFixture();
  const marker = "(dream-skin-internet-angel-light)";
  let writes = 0;
  const mediaRule = () => {
    let value = `${marker}, all`;
    return { media: {
      get mediaText() { return value; },
      set mediaText(next) { writes += 1; value = next; },
    } };
  };
  const ordinary = { media: { mediaText: "(min-width: 500px)" } };
  const first = mediaRule();
  const sheet = { cssRules: [ordinary, first] };
  cache.syncLightRules(sheet);
  assert.equal(first.media.mediaText, marker);
  assert.equal(ordinary.media.mediaText, "(min-width: 500px)");
  cache.syncLightRules(sheet);
  assert.equal(writes, 1, "Unchanged mode must not invalidate stylesheet rules again.");
  matches.set('html:is(.dream-theme-light, [data-dream-shell="light"])', new Set([html]));
  cache.syncLightRules(sheet);
  assert.equal(first.media.mediaText, `${marker}, all`);
  matches.clear();
  const replacement = mediaRule();
  sheet.cssRules = [ordinary, replacement];
  cache.syncLightRules(sheet);
  assert.equal(replacement.media.mediaText, marker, "Stylesheet repair must discover the replacement block.");
  cache.syncLightRules({ get cssRules() { throw new Error("CSSOM unavailable"); } });
  cache.cleanup();
  assert.equal(replacement.media.mediaText, `${marker}, all`, "Cleanup restores ordinary selector-controlled CSS.");
  cache.syncLightRules(sheet);
  assert.equal(replacement.media.mediaText, `${marker}, all`, "Stopped runtimes must not change media again.");
});

test("route markers are idempotent and detached owners are restored on cleanup", () => {
  const fixture = cacheFixture();
  const { cache, html, body, leaves, matches, manifest } = fixture;
  const attribute = manifest[0].attribute;
  cache.refresh();
  assert.equal(html.getAttribute(attribute), "true");
  assert.equal(body.getAttribute(attribute), "true");
  assert.equal(cache.metrics.writes, 2);
  cache.refresh();
  assert.equal(cache.metrics.writes, 2, "Unchanged predicates must not write attributes again.");
  leaves.length = 0;
  matches.get(manifest[0].selector).clear();
  cache.refresh();
  assert.equal(html.getAttribute(attribute), null);
  assert.equal(body.getAttribute(attribute), null);
  leaves.push(fixture.main);
  matches.get(manifest[0].selector).add(body);
  cache.refresh();
  body.parentElement = null;
  cache.cleanup();
  assert.equal(body.getAttribute(attribute), null, "Detached predicate owners must be restored.");
  assert.equal(fixture.observers[0].disconnected, true);
});

test("bounded cache refresh ignores text and hover classes, tracks native landmarks, and cancels cleanly", () => {
  const fixture = cacheFixture();
  const { cache, observers, timers, main, body, advance } = fixture;
  cache.refresh();
  const observer = observers[0];
  observer.callback([{ type: "childList", addedNodes: [{ nodeType: 3 }], removedNodes: [] }]);
  observer.callback([{ type: "childList", addedNodes: Array.from({ length: 1000 }, () => ({
    nodeType: 1, matches: () => false, querySelector: () => null,
  })), removedNodes: [] }]);
  main.setAttribute("class", "hovered");
  observer.callback([{ type: "attributes", target: main, attributeName: "class", oldValue: "" }]);
  assert.equal(timers.size, 0);
  main.setAttribute("role", "main");
  observer.callback([{ type: "attributes", target: main, attributeName: "role", oldValue: null }]);
  observer.callback([{ type: "childList", addedNodes: [main], removedNodes: [], target: body }]);
  assert.equal(timers.size, 1, "Structural bursts retain one fixed deadline.");
  advance(119);
  assert.equal(cache.metrics.passes, 1);
  advance(1);
  assert.equal(cache.metrics.passes, 2);
  assert.equal(cache.metrics.writes, 2);
  main.setAttribute("class", "main-surface");
  observer.callback([{ type: "attributes", target: main, attributeName: "class", oldValue: "hovered" }]);
  assert.equal(timers.size, 1, "A native main surface class change must refresh cached predicates.");
  cache.cleanup();
  assert.equal(timers.size, 0);
  advance(120);
  assert.equal(cache.metrics.passes, 2);
  assert.equal(main.getAttribute("role"), "main", "Cleanup must preserve native attributes.");
});

test("removed wrappers containing a landmark still refresh without the original ancestor context", () => {
  const { cache, main, observers, timers, advance } = cacheFixture();
  cache.refresh();
  const wrapper = { nodeType: 1, matches: () => false, querySelector: () => main };
  observers[0].callback([{ type: 'childList', addedNodes: [], removedNodes: [wrapper] }]);
  assert.equal(timers.size, 1);
  advance(120);
  assert.equal(cache.metrics.passes, 2);
  cache.cleanup();
});
