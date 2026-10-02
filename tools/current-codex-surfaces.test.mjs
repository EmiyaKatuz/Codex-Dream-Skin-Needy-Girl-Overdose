import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Static regressions for the DOM changes reported in upstream #421 and
// PRs #416/#417/#418/#420 (Codex 26.924). These inspect shipped CSS and its
// selector contract, including conditional rules; they do not simulate CSS
// selector matching and are not evidence of a live Codex rendering check.
const root = new URL("../", import.meta.url);
const cssFiles = [
  "runtime/dream-skin.css",
  "macos/assets/dream-skin.css",
  "windows/assets/dream-skin.css",
  "linux/assets/dream-skin.css",
];
const contracts = [
  "tools/selectors.json",
  "macos/assets/selectors.json",
  "windows/assets/selectors.json",
  "linux/assets/selectors.json",
];

// Read the existing flat style rules inside @media/@container/@layer without
// confusing commas in :is(), semicolons in URLs, or punctuation in strings
// with rule boundaries. CSS nesting is deliberately rejected, so adding it
// cannot silently hide declarations from this whole-stylesheet inspection.
function* delimiters(source, wanted) {
  let quote = "";
  let parentheses = 0;
  let brackets = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      index += 1;
    } else if (quote) {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      assert.notEqual(end, -1, "unterminated CSS comment");
      index = end + 1;
    } else if (char === "(") {
      parentheses += 1;
    } else if (char === ")") {
      parentheses -= 1;
    } else if (char === "[") {
      brackets += 1;
    } else if (char === "]") {
      brackets -= 1;
    } else if (!parentheses && !brackets && wanted.includes(char)) {
      yield { index, char };
    }
  }
  assert.equal(quote, "", "unterminated CSS string");
  assert.equal(parentheses, 0, "unbalanced CSS parentheses");
  assert.equal(brackets, 0, "unbalanced CSS brackets");
}

function splitTopLevel(source, separator) {
  const parts = [];
  let start = 0;
  for (const { index } of delimiters(source, separator)) {
    parts.push(source.slice(start, index).trim());
    start = index + 1;
  }
  parts.push(source.slice(start).trim());
  return parts.filter(Boolean);
}

function readRules(source) {
  const stack = [];
  const rules = [];
  let start = 0;
  for (const { index, char } of delimiters(source, "{};")) {
    if (char === "{") {
      const parent = stack.at(-1);
      if (parent) {
        assert.ok(parent.selector.startsWith("@"),
          `Update the CSS scanner before using nested style rules: ${parent.selector}`);
        parent.hasChildren = true;
      }
      const selector = source.slice(start, index).replace(/\/\*[\s\S]*?\*\//g, "").trim();
      stack.push({ selector, bodyStart: index + 1, hasChildren: false });
      start = index + 1;
    } else if (char === "}") {
      const rule = stack.pop();
      assert.ok(rule, "unexpected CSS closing brace");
      if (!rule.hasChildren && !rule.selector.startsWith("@")) {
        const body = source.slice(rule.bodyStart, index).replace(/\/\*[\s\S]*?\*\//g, "");
        const declarations = splitTopLevel(body, ";").map((declaration) => {
          const match = declaration.match(/^([\w-]+)\s*:\s*([\s\S]+)$/);
          assert.ok(match, `unrecognized CSS declaration: ${declaration}`);
          return { property: match[1].toLowerCase(), value: match[2].trim() };
        });
        for (const selector of splitTopLevel(rule.selector, ",")) {
          rules.push({ selector: selector.replace(/\s+/g, " "), declarations });
        }
      }
      start = index + 1;
    } else if (!stack.length) {
      start = index + 1;
    }
  }
  assert.equal(stack.length, 0, "unclosed CSS rule");
  return rules;
}

function assertPaintOnly(rule) {
  assert.deepEqual([...new Set(rule.declarations.map(({ property }) => property))].sort(),
    ["background", "background-image"],
    `Native surface compatibility must only clear paint, not alter geometry or visibility: ${rule.selector}`);
  for (const { property, value } of rule.declarations) {
    assert.match(value, property === "background"
      ? /^transparent\s*!important$/i
      : /^none\s*!important$/i,
    `Native paint must be removed without introducing a new surface: ${rule.selector}`);
  }
}

function assertWideSkinScope(selector) {
  assert.match(selector,
    /^html(?:\[data-dream-skin="active"\]\[data-dream-art-wide="true"\]|\.codex-dream-skin\.dream-art-wide)(?=[\s:.\[])/,
    "Native surface clearing must remain scoped to the active wide-art skin");
}

function requiredRules(rules, predicate, description) {
  const found = rules.filter(({ selector }) => predicate(selector));
  assert.ok(found.length > 0, `Missing ${description}`);
  return found;
}

const homeFirstChild = /(?:__DREAM_SELECTOR_HOME_ROUTE__|\.dream-home|\[role="main"\]:has\(\[data-testid="home-icon"\]\))\s*>\s*div:first-child\b/;
const composerLayoutGuard = ':not([class~="group/home-composer-layout"])';
const bgSurface = /(?:\.bg-surface\b|\[class~="bg-surface"\])/;
const paneFrame = "[data-app-shell-pane-frame]";
const focusArea = "[data-app-shell-focus-area]";
const protectedPaneSurfaces = [
  '[role="dialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  "[data-radix-popper-content-wrapper]",
  "form",
  '[data-ds-part="card"]',
];
const composerFadeTokens = [
  "pointer-events-none", "inset-x-0", "-top-8", "bottom-0", "z-0",
  "bg-gradient-to-t", "from-surface", "via-surface",
];

for (const file of contracts) {
  test(`top-fade contract avoids the attribute that migrated onto content hosts: ${file}`, () => {
    const contract = JSON.parse(readFileSync(new URL(file, root), "utf8"));
    const topFade = contract.selectors.find(({ key }) => key === "main-content-top-fade");
    assert.ok(topFade, "top-fade selector contract must remain available");
    assert.ok(topFade.selector.includes(".app-shell-main-content-top-fade"));
    assert.ok(topFade.selector.includes('[class*="_MainContentTopFade_"]'));
    assert.doesNotMatch(topFade.selector, /\[\s*data-app-shell-main-content-top-fade\b/,
      "Codex 26.924 also puts this attribute on content columns; it no longer identifies a decorative fade");
  });
}

for (const file of cssFiles) {
  const rules = readRules(readFileSync(new URL(file, root), "utf8"));

  test(`top fades only lose paint, including later conditional overrides: ${file}`, () => {
    for (const { selector } of rules) {
      assert.doesNotMatch(selector, /\[\s*data-app-shell-main-content-top-fade\b/,
        "A later override must not reuse the migrated content-host attribute");
    }
    for (const rule of requiredRules(rules,
      (selector) => /MAIN_CONTENT_TOP_FADE|app-shell-main-content-top-fade|_MainContentTopFade_/.test(selector),
      "legacy and CSS-module top-fade rules")) {
      assertPaintOnly(rule);
    }
  });

  test(`legacy Home first-child styles exclude the current composer layout everywhere: ${file}`, () => {
    for (const { selector } of requiredRules(rules,
      (selector) => homeFirstChild.test(selector), "legacy Home rules")) {
      const match = selector.match(homeFirstChild);
      assert.ok(selector.slice(match.index + match[0].length).startsWith(composerLayoutGuard),
        `The first Home child must exclude group/home-composer-layout before applying hero styles: ${selector}`);
    }
  });

  test(`PageSurfaceLayout loses its white paint without changing its size: ${file}`, () => {
    for (const rule of requiredRules(rules,
      (selector) => selector.includes("_PageSurfaceLayout_"), "PageSurfaceLayout paint reset")) {
      assertWideSkinScope(rule.selector);
      assert.match(rule.selector, /body\s*>\s*div\s*>\s*\[class\*="_PageSurfaceLayout_"\]$/,
        "Only the direct native page wrapper should lose its surface");
      assertPaintOnly(rule);
    }
  });

  test(`Projects only clears the immediate focus-area surface: ${file}`, () => {
    for (const rule of requiredRules(rules,
      (selector) => selector.includes(focusArea) && bgSurface.test(selector),
      "Projects focus-area surface reset")) {
      assertWideSkinScope(rule.selector);
      assert.match(rule.selector,
        /\[data-app-shell-focus-area\]\s*>\s*(?:\.bg-surface|\[class~="bg-surface"\])$/,
        "Projects card descendants must keep their own backgrounds");
      assertPaintOnly(rule);
    }
  });

  test(`PR pane reset protects menus, dialogs, form controls, and cards: ${file}`, () => {
    const paneRules = requiredRules(rules, (selector) => selector.includes(paneFrame), "PR pane-frame reset");
    assert.ok(paneRules.some(({ selector }) => selector.endsWith(paneFrame)), "PR frame needs its own paint reset");
    assert.ok(paneRules.some(({ selector }) => bgSurface.test(selector)), "PR nested surface needs its own paint reset");
    for (const rule of paneRules) {
      assertWideSkinScope(rule.selector);
      assertPaintOnly(rule);
      const child = rule.selector.slice(rule.selector.indexOf(paneFrame) + paneFrame.length).trim();
      if (!child) continue;
      assert.match(child, /^(?:\.bg-surface|\[class~="bg-surface"\]):not\(:where\([\s\S]*\)\)$/,
        "PR surface reset must stay on native background elements with protected descendants excluded");
      const exclusions = splitTopLevel(child.slice(child.indexOf(":where(") + ":where(".length, -2), ",");
      for (const surface of protectedPaneSurfaces) {
        assert.ok(exclusions.includes(surface), `Keep ${surface} readable in a PR pane`);
        assert.ok(exclusions.includes(`${surface} *`), `Keep descendants of ${surface} readable in a PR pane`);
      }
    }
    // Check the entire file, so a new broad reset cannot bypass the guarded
    // rule above and quietly clear an unrelated menu or card's background.
    for (const rule of rules.filter(({ selector, declarations }) => bgSurface.test(selector)
      && declarations.some(({ property, value }) => property === "background" && /^transparent\b/i.test(value)))) {
      assert.ok(rule.selector.includes(focusArea) || rule.selector.includes(paneFrame),
        `Unscoped bg-surface clearing would remove functional card paint: ${rule.selector}`);
    }
  });

  test(`Customize clears only the sticky pseudo-element outside the composer: ${file}`, () => {
    for (const rule of requiredRules(rules,
      (selector) => selector.includes("[data-sticky]"), "Customize sticky paint reset")) {
      assertWideSkinScope(rule.selector);
      assert.match(rule.selector,
        /\[data-app-shell-focus-area\]\s+\[data-sticky\]:not\(:has\(\[data-codex-composer-root\]\)\)::before$/,
        "The sticky host, native blur, and composer must retain their native behavior");
      assertPaintOnly(rule);
    }
  });

  test(`26.924 composer fade requires all eight utility tokens and retains its geometry: ${file}`, () => {
    for (const rule of requiredRules(rules,
      (selector) => selector.includes('"-top-8"') && selector.includes("bg-gradient-to-t"),
      "26.924 sticky composer fade reset")) {
      assertWideSkinScope(rule.selector);
      const signature = rule.selector.match(/(?:\[class~="[^"]+"\])+$/)?.[0];
      assert.ok(signature, "Fade utility tokens must identify one element, without widening to descendants");
      const tokens = [...signature.matchAll(/\[class~="([^"]+)"\]/g)].map((match) => match[1]);
      assert.deepEqual(tokens.sort(), [...composerFadeTokens].sort(),
        "Partial gradient matching can clear unrelated content decoration");
      assertPaintOnly(rule);
    }
  });
}
