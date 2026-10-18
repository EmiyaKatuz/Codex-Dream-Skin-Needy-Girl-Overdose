import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import {
  loadPayload as loadWindowsPayload,
  usesInternetAngelExtension as usesWindowsExtension,
} from "../windows/scripts/injector.mjs";
import {
  loadPayload as loadMacosPayload,
  usesInternetAngelExtension as usesMacosExtension,
} from "../macos/scripts/injector.mjs";
import {
  loadPayload as loadLinuxPayload,
  usesInternetAngelExtension as usesLinuxExtension,
} from "../linux/scripts/injector.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceCss = await fs.readFile(
  path.join(projectRoot, "runtime", "internet-angel-extension.css"),
  "utf8",
);
const sourceScript = await fs.readFile(
  path.join(projectRoot, "runtime", "internet-angel-extension.js"),
  "utf8",
);
const windowsRendererScript = await fs.readFile(
  path.join(projectRoot, "windows", "assets", "renderer-inject.js"),
  "utf8",
);
const windowsPatchScript = await fs.readFile(
  path.join(projectRoot, "windows", "scripts", "patch-dream-skin.ps1"),
  "utf8",
);
const gitAttributes = await fs.readFile(path.join(projectRoot, ".gitattributes"), "utf8");

function extractRendererCss(payload) {
  const marker = "((cssText, artDataUrl,";
  const start = payload.indexOf("/* dream-skin:renderer:start */");
  const end = payload.indexOf("/* dream-skin:renderer:end */");
  assert.ok(start >= 0 && end > start, "payload must delimit its canonical renderer");
  const rendererPayload = payload.slice(start + "/* dream-skin:renderer:start */".length, end);
  const at = rendererPayload.indexOf(marker);
  assert.notEqual(at, -1, "payload must keep the canonical renderer IIFE signature");
  const bodyAt = rendererPayload.indexOf("=> {", at);
  assert.notEqual(bodyAt, -1, "renderer IIFE must keep a block body");
  const bodyStart = bodyAt + "=> {".length;
  const probe = `${rendererPayload.slice(0, bodyStart)}\nreturn cssText;\n${rendererPayload.slice(bodyStart)}`;
  const art = payload.match(/const __dreamSkinMotionArt = (.*);/);
  assert.ok(art, "payload must include its shared art value once");
  return vm.runInNewContext(probe, {
    __dreamSkinMotionArt: JSON.parse(art[1]),
  }, { timeout: 10_000 });
}

function makeLateDiffRootFixture() {
  const timers = new Map();
  let nextTimer = 0;
  let resolveDefinition;
  const definition = new Promise((resolve) => { resolveDefinition = resolve; });
  const host = { isConnected: true, shadowRoot: null };
  const shadowRoot = {
    children: [],
    appendChild(node) {
      node.parentNode = this;
      this.children.push(node);
      return node;
    },
    querySelector(selector) {
      if (selector !== 'style[data-internet-angel-diff-theme]') return null;
      return this.children.find((node) =>
        node.getAttribute("data-internet-angel-diff-theme") !== null) || null;
    },
  };
  const document = {
    body: {},
    createElement(tagName) {
      assert.equal(tagName, "style");
      const attributes = new Map();
      return {
        parentNode: null,
        textContent: "",
        get isConnected() { return Boolean(this.parentNode && host.isConnected); },
        getAttribute(name) { return attributes.get(name) ?? null; },
        setAttribute(name, value) { attributes.set(name, String(value)); },
        remove() {
          if (!this.parentNode) return;
          this.parentNode.children = this.parentNode.children.filter((node) => node !== this);
          this.parentNode = null;
        },
      };
    },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll(selector) { return selector === "diffs-container" ? [host] : []; },
  };
  class MockMutationObserver {
    observe() {}
    disconnect() {}
  }
  const window = {
    addEventListener() {},
    removeEventListener() {},
  };
  vm.runInNewContext(
    sourceScript.replace("__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__", "true"),
    {
      clearTimeout(id) { timers.delete(id); },
      customElements: {
        whenDefined(name) {
          assert.equal(name, "diffs-container");
          return definition;
        },
      },
      document,
      innerWidth: 1280,
      MutationObserver: MockMutationObserver,
      setTimeout(callback) {
        const id = ++nextTimer;
        timers.set(id, callback);
        return id;
      },
      window,
    },
    { timeout: 10_000 },
  );
  return {
    attachDiffRoot() {
      host.shadowRoot = shadowRoot;
    },
    defineDiffElement() {
      resolveDefinition();
    },
    flushTimers() {
      let count = 0;
      while (timers.size) {
        assert.ok(count++ < 20, "Diff root retries must remain bounded");
        const [id, callback] = timers.entries().next().value;
        timers.delete(id);
        callback();
      }
    },
    get timerCount() { return timers.size; },
    shadowRoot,
    state: window.__CODEX_INTERNET_ANGEL_EXTENSION_STATE__,
  };
}

function makeAttachShadowLifecycleFixture() {
  const document = {
    body: {},
    createElement(tagName) {
      assert.equal(tagName, "style");
      const attributes = new Map();
      return {
        parentNode: null,
        textContent: "",
        get isConnected() { return Boolean(this.parentNode?.host?.isConnected); },
        getAttribute(name) { return attributes.get(name) ?? null; },
        setAttribute(name, value) { attributes.set(name, String(value)); },
        remove() {
          if (!this.parentNode) return;
          this.parentNode.children = this.parentNode.children.filter((node) => node !== this);
          this.parentNode = null;
        },
      };
    },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  class MockMutationObserver {
    observe() {}
    disconnect() {}
  }
  class MockElement {
    attachShadow() {
      const root = {
        host: this,
        children: [],
        appendChild(node) {
          node.parentNode = this;
          this.children.push(node);
          return node;
        },
        querySelector(selector) {
          if (selector !== 'style[data-internet-angel-diff-theme]') return null;
          return this.children.find((node) =>
            node.getAttribute("data-internet-angel-diff-theme") !== null) || null;
        },
      };
      this.shadowRoot = root;
      return root;
    }
  }
  const nativeAttachShadow = MockElement.prototype.attachShadow;
  const window = {
    addEventListener() {},
    removeEventListener() {},
  };
  const context = vm.createContext({
    clearTimeout() {},
    document,
    Element: MockElement,
    innerWidth: 1280,
    MutationObserver: MockMutationObserver,
    setTimeout() { return 1; },
    window,
  });
  const installTheme = () => vm.runInContext(
    sourceScript.replace("__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__", "true"),
    context,
    { timeout: 10_000 },
  );
  const makeDiffHost = () => {
    const host = new MockElement();
    host.isConnected = true;
    host.matches = (selector) => selector === "diffs-container";
    return host;
  };
  return {
    installTheme,
    makeDiffHost,
    nativeAttachShadow,
    prototype: MockElement.prototype,
    get state() { return window.__CODEX_INTERNET_ANGEL_EXTENSION_STATE__; },
  };
}

assert.match(sourceCss, /data-angel-component/);
assert.match(sourceCss, /prefers-reduced-motion:\s*reduce/);
assert.match(
  sourceCss,
  /:is\(\.dream-theme-light,\s*\[data-dream-shell=["']light["']\]\)/,
  "The shared light layer must recognize the canonical macOS shell attribute.",
);
for (const [alias, fallback] of [
  ["--angel-adaptive-text", "--ds-text"],
  ["--angel-adaptive-surface", "--ds-panel"],
  ["--angel-adaptive-surface-raised", "--ds-panel-2"],
  ["--angel-adaptive-line-soft", "--ds-line"],
  ["--angel-adaptive-accent", "--ds-green"],
]) {
  assert.match(
    sourceCss,
    new RegExp(`${alias}:[^;]+var\\(${fallback}\\)`),
    `${alias} must fall back to the canonical macOS ${fallback} token.`,
  );
}
for (const structure of [
  "_MainContentFrame_",
  "bg-token-input-background",
  "file-diff",
  "ComposerLayoutBody",
  "ComposerLayoutAttachments",
  "scroll-mt-4",
  "diffs-container",
]) {
  assert.ok(sourceCss.includes(structure), `Missing shared Internet Angel styling for ${structure}.`);
}
const sharedSurfaceStart = sourceCss.indexOf("/* Codex 26.730 surfaces shared");
const sharedSurfaceEnd = sourceCss.indexOf("/* Light mode uses adaptive text", sharedSurfaceStart);
assert.ok(sharedSurfaceStart >= 0 && sharedSurfaceEnd > sharedSurfaceStart);
const sharedSurfaceCss = sourceCss.slice(sharedSurfaceStart, sharedSurfaceEnd);
assert.doesNotMatch(
  sharedSurfaceCss,
  /\baside:not\(/,
  "Shared parity styling must not repaint arbitrary aside elements.",
);
assert.doesNotMatch(
  sharedSurfaceCss,
  /\[class\*=["']file-diff["']\]\s+div/,
  "Diff styling must not clear every descendant background.",
);
assert.doesNotMatch(
  sharedSurfaceCss,
  /\[class\*=["']rounded-2xl["']\]/,
  "Composer cleanup must target known inner frames instead of a radius utility.",
);
assert.match(
  sharedSurfaceCss,
  /\[data-angel-component=["']side-workspace["']\][\s\S]+\[class\*=["']file-diff["']\]\s*>\s*div/,
  "Recognized side workspaces must theme only the explicit file-diff wrapper.",
);
assert.match(
  sharedSurfaceCss,
  /_MainContentFrame_[\s\S]+bg-token-input-background[\s\S]+input/,
  "Projects and PR inputs must stay scoped to the known input shell.",
);
assert.doesNotMatch(
  sourceCss,
  /:is\(\.dream-theme-light,\s*\[data-dream-shell=["']light["']\]\)\s*\{[^}]*--angel-paper/,
  "Light mode must not turn the fixed dark-surface foreground token into dark adaptive text.",
);
assert.match(
  sourceCss,
  /Light-mode fixed dark surfaces[\s\S]{0,2200}\[data-angel-component=["']composer["']\][\s\S]{0,2200}color:\s*var\(--angel-paper\)/,
  "Fixed dark Internet Angel surfaces must retain their light foreground in Light mode.",
);
const lightModeStart = sourceCss.indexOf("/* Light mode uses adaptive text");
const fixedDarkStart = sourceCss.indexOf("/* Light-mode fixed dark surfaces", lightModeStart);
const fixedDarkEnd = sourceCss.indexOf("html.codex-dream-skin", fixedDarkStart);
assert.ok(lightModeStart >= 0 && fixedDarkStart > lightModeStart && fixedDarkEnd > fixedDarkStart);
const lightModeCss = sourceCss.slice(lightModeStart, fixedDarkEnd);
const fixedDarkCss = sourceCss.slice(fixedDarkStart, fixedDarkEnd);
const lightActivityHeaderStart = lightModeCss.indexOf('[data-angel-component="activity-header"] {');
assert.ok(
  lightActivityHeaderStart >= 0,
  "Light activity headers must remap Codex dark-shell conversation tokens.",
);
const lightActivityHeaderEnd = lightModeCss.indexOf("}", lightActivityHeaderStart);
const lightActivityHeaderCss = lightModeCss.slice(lightActivityHeaderStart, lightActivityHeaderEnd);
assert.ok(
  lightActivityHeaderCss.includes(
    "--color-token-conversation-body: var(--angel-adaptive-text)",
  ),
  "Light activity headers must replace the winning dark-shell conversation body token.",
);
assert.doesNotMatch(
  lightModeCss,
  /\[data-angel-component=["']activity(?:-command|-detail|-output)?["']\]\s*\{[^}]*--color-token-conversation-body/,
  "The Light token remap must not reach fixed-dark activity detail or output surfaces.",
);
assert.doesNotMatch(
  lightModeCss,
  /\[data-angel-component=["']message-assistant["']\]\s+:is\([^)]*\bblockquote\b[^)]*\)\s*\{[^}]*color:\s*var\(--angel-paper\)/,
  "Light assistant blockquotes must inherit adaptive text on their translucent surface.",
);
assert.doesNotMatch(
  lightModeCss,
  /\[data-angel-component\]\s+:is\(pre,\s*code,/,
  "Light inline code must not use the fixed-dark foreground reserved for opaque code surfaces.",
);
const fixedCodeSelector = '[data-angel-component] :is(pre, [class*="codeBlock"], [class*="font-vscode-editor"]) {';
const fixedCodeAt = lightModeCss.indexOf(fixedCodeSelector);
assert.ok(fixedCodeAt >= 0, "Opaque code blocks and editor surfaces must stay explicitly scoped.");
assert.ok(
  lightModeCss.slice(fixedCodeAt, lightModeCss.indexOf("}", fixedCodeAt))
    .includes("color: var(--angel-paper) !important"),
  "Opaque code blocks and editor surfaces must retain their fixed-dark foreground.",
);
assert.match(
  lightModeCss,
  /\[data-angel-component=["']message-assistant["']\]\s+:is\(code:not\(pre code\),\s*kbd\)\s*\{[^}]*color:\s*var\(--angel-adaptive-text\)/,
  "Light inline code must restore adaptive text over its translucent accent surface.",
);
const genericLightInputSelector = lightModeCss.match(/input:not\(\[type="checkbox"\]\)[^{]+\{/i)?.[0];
assert.ok(genericLightInputSelector, "The generic Light input surface must remain scoped.");
const genericLightPlaceholderSelector = lightModeCss.match(/input:not\(\[data-angel-component="settings-input"\]\)[^{]+::placeholder\s*\{/i)?.[0];
assert.ok(genericLightPlaceholderSelector, "The generic Light placeholder color must remain scoped.");
for (const selector of [genericLightInputSelector, genericLightPlaceholderSelector]) {
  assert.ok(
    selector.includes(':not([data-angel-component="settings-search"])'),
    "The generic Light input layer must exclude a Settings search marked directly on the input.",
  );
  assert.ok(
    selector.includes(':not([data-angel-component="settings-search"] input)'),
    "The generic Light input layer must exclude an input inside a marked Settings search wrapper.",
  );
}
assert.match(
  sourceCss,
  /\[data-angel-component=["']settings-input["']\]::placeholder\s*\{[^}]*color:\s*color-mix\(in srgb, var\(--angel-paper\) 72%, var\(--angel-violet\)\)\s*!important/,
  "Fixed-dark Settings placeholders must retain a readable muted foreground.",
);
assert.match(
  sourceCss,
  /\[data-angel-component=["']settings-search["']\] input\s*\{[^}]*color:\s*var\(--angel-paper\)\s*!important;[^}]*background:\s*transparent\s*!important/,
  "The fixed-dark Settings search must keep its inner input transparent and readable.",
);
assert.match(
  sourceCss,
  /\[data-angel-component=["']settings-search["']\] input::placeholder\s*\{[^}]*color:\s*color-mix\(in srgb, var\(--angel-paper\) 72%, var\(--angel-violet\)\)\s*!important/,
  "The fixed-dark Settings search placeholder must retain a readable muted foreground.",
);
assert.match(
  sourceCss,
  /\[data-angel-component=["']settings-search["']\]::placeholder,\s*html[^{}]+\[data-angel-component=["']settings-search["']\] input::placeholder\s*\{[^}]*color:\s*color-mix\(in srgb, var\(--angel-paper\) 72%, var\(--angel-violet\)\)\s*!important/,
  "A Settings search marked directly on the input must retain its muted placeholder.",
);
assert.match(
  sourceCss,
  /\[data-angel-component=["']settings-search["']\]\s*\{[^}]*border:\s*1px solid var\(--angel-cyan\)\s*!important;[^}]*background:\s*linear-gradient/,
  "A Settings search marked directly on the input must retain its fixed-dark search surface.",
);
for (const selector of [
  '[data-radix-popper-content-wrapper] > div:not([data-angel-component="settings-menu"])',
  '[data-radix-menu-content]:not([data-angel-component="settings-menu"])',
  '[data-radix-popover-content]:not([data-angel-component="settings-menu"])',
]) {
  assert.ok(
    lightModeCss.includes(selector),
    `The adaptive Light Radix surface must exclude fixed-dark Settings menus: ${selector}`,
  );
}
const fixedDarkDescendants = fixedDarkCss.indexOf(") :where(button, a, p, span, div, li, h1, h2, h3, h4, h5, h6, label, td, th) {");
const lightSelectedSideWorkspace = fixedDarkCss.indexOf(
  '[data-angel-component="side-workspace"] [aria-selected="true"],',
  fixedDarkDescendants,
);
assert.ok(
  fixedDarkDescendants >= 0 && lightSelectedSideWorkspace > fixedDarkDescendants,
  "Light fixed-dark fallbacks must restore the selected side-workspace state afterward.",
);
const fixedDarkStateCss = fixedDarkCss.slice(fixedDarkDescendants);
assert.ok(
  fixedDarkCss.slice(0, fixedDarkDescendants).includes('[data-angel-component="settings-search"]'),
  "A Settings search marked directly on the input must restore its light foreground in Light mode.",
);
const settingsDisabledAt = fixedDarkStateCss.indexOf('[data-angel-component="settings-content"]');
assert.ok(settingsDisabledAt >= 0, "Fixed-dark Settings must restore disabled controls after the descendant fallback.");
const settingsDisabledRule = fixedDarkStateCss.slice(
  settingsDisabledAt,
  fixedDarkStateCss.indexOf("}", settingsDisabledAt),
);
assert.ok(settingsDisabledRule.includes(":disabled"));
assert.ok(settingsDisabledRule.includes('[aria-disabled="true"]'));
assert.ok(
  settingsDisabledRule.includes("color: color-mix(in srgb, var(--angel-paper) 72%, var(--angel-violet)) !important"),
  "Disabled Settings controls must stay visibly muted on their fixed-dark surface.",
);
const fixedDarkCyanComponents = [
  "composer-palette-heading",
  "turn-preview-title",
  "edited-card-title",
  "edited-card-more",
  "subagent-more",
];
const fixedDarkCyanAt = fixedDarkStateCss.indexOf('[data-angel-component="composer-palette-heading"]');
assert.ok(fixedDarkCyanAt >= 0, "Fixed-dark semantic accent colors must be restored after the descendant fallback.");
const fixedDarkCyanRule = fixedDarkStateCss.slice(
  fixedDarkCyanAt,
  fixedDarkStateCss.indexOf("}", fixedDarkCyanAt),
);
for (const component of fixedDarkCyanComponents) {
  assert.equal(
    fixedDarkCyanRule.split(`[data-angel-component="${component}"]`).length - 1,
    2,
    `${component} and its text descendants must retain the cyan hierarchy in Light mode.`,
  );
}
assert.ok(fixedDarkCyanRule.includes("color: var(--angel-cyan) !important"));
for (const [component, color] of [
  ["turn-preview-excerpt", "rgb(236 229 255 / .78)"],
  ["edited-card-stats", "rgb(232 225 255 / .74)"],
  ["edited-card-file-path", "color-mix(in srgb, var(--angel-paper) 86%, var(--angel-cyan))"],
  ["edited-card-file-stats", "rgb(228 220 255 / .76)"],
]) {
  const at = fixedDarkStateCss.indexOf(`[data-angel-component="${component}"]`);
  assert.ok(at >= 0, `${component} must restore its muted hierarchy after the descendant fallback.`);
  const rule = fixedDarkStateCss.slice(at, fixedDarkStateCss.indexOf("}", at));
  assert.equal(rule.split(`[data-angel-component="${component}"]`).length - 1, 2);
  assert.ok(rule.includes(`color: ${color} !important`));
}
assert.ok(
  fixedDarkCss.slice(lightSelectedSideWorkspace, fixedDarkCss.indexOf("}", lightSelectedSideWorkspace))
    .includes("color: var(--angel-cyan) !important"),
  "Selected side-workspace tabs must retain the Windows cyan state in Light mode.",
);
assert.ok(
  fixedDarkCss.slice(lightSelectedSideWorkspace, fixedDarkCss.indexOf("}", lightSelectedSideWorkspace))
    .includes('[aria-selected="true"] :where(button, a, p, span, div, li, h1, h2, h3, h4, h5, h6, label, td, th)'),
  "Selected side-workspace descendants must not stay paper-white in Light mode.",
);
for (const component of ["turn-preview", "turn-preview-surface", "edited-card-files"]) {
  assert.ok(
    fixedDarkCss.includes(`[data-angel-component="${component}"]`),
    `${component} must keep light text on its fixed dark background in Light mode.`,
  );
}
const sideWorkspaceStart = sourceCss.indexOf('[data-angel-component="side-workspace"] {');
const sideWorkspaceEnd = sourceCss.indexOf("}", sideWorkspaceStart);
assert.ok(sideWorkspaceStart >= 0 && sideWorkspaceEnd > sideWorkspaceStart);
const sideWorkspaceCss = sourceCss.slice(sideWorkspaceStart, sideWorkspaceEnd);
for (const [alias, value] of [
  ["--angel-adaptive-text", "var(--angel-paper)"],
  ["--angel-adaptive-surface", "var(--angel-ink)"],
  ["--angel-adaptive-surface-raised", "var(--angel-surface-raised)"],
  ["--angel-adaptive-line-soft", "var(--angel-line-soft)"],
  ["--angel-adaptive-accent", "var(--angel-cyan)"],
]) {
  assert.ok(sideWorkspaceCss.includes(`${alias}: ${value}`));
}
assert.match(sideWorkspaceCss, /--angel-adaptive-muted:[^;]*var\(--angel-paper\)/);
for (const tooltipSelector of [
  '[role="tooltip"]:not([data-angel-component="turn-preview"])',
  '[data-radix-tooltip-content]:not([data-angel-component="turn-preview"])',
  '[data-slot="tooltip-content"]:not([data-angel-component="turn-preview"])',
]) {
  assert.ok(lightModeCss.includes(tooltipSelector));
}
assert.match(sourceScript, /__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__/);
assert.match(sourceScript, /__CODEX_INTERNET_ANGEL_EXTENSION_STATE__/);
assert.match(sourceScript, /diffs-container/);
assert.match(sourceScript, /shadowRoot/);
assert.match(
  sourceScript,
  /ownedDiffStyles[\s\S]+\.remove\?\.\(\)/,
  "Theme switches must remove renderer-owned Shadow DOM diff styles.",
);
assert.match(
  sourceScript,
  /style\.isConnected === false\)\s*\{\s*style\.remove\?\.\(\);\s*ownedDiffStyles\.delete\(style\)/,
  "Detached Shadow DOM diff styles must be removed before their strong reference is released.",
);
assert.doesNotMatch(
  sourceScript,
  /addListener\(window,\s*["']transitionend["']/,
  "visual transitions must not trigger a full-document reclassification",
);
assert.doesNotMatch(
  sourceScript,
  /const classify = \(\) => \{\s*clearMarks\(\);/,
  "classification must reconcile markers instead of clearing and rebuilding them",
);
assert.match(
  sourceScript,
  /node\.getAttribute\?\.\(componentAttribute\) !== component/,
  "classification must avoid unchanged marker writes",
);
assert.match(sourceScript, /compositionstart/);
assert.match(sourceScript, /compositionend/);
assert.match(
  sourceScript,
  /const mutationHintSelector = \[[\s\S]*?\]\.join\(["']*, ["']*\)/,
  "dynamic classification must use an explicit structural mutation allowlist",
);
assert.match(sourceScript, /new MutationObserver\(refreshAfterMutation\)/);
assert.match(sourceScript, /subtree\s*:\s*true/);
assert.doesNotMatch(sourceScript, /new MutationObserver\(scheduleRefresh\)/);
assert.doesNotMatch(sourceScript, /characterData\s*:\s*true/);
assert.match(sourceScript, /attributes\s*:\s*true/);
assert.match(
  sourceScript,
  /attributeFilter\s*:\s*\[\s*["']data-ds-part["']\s*\]/,
  "Attribute observation must stay limited to the renderer's public part contract.",
);
assert.match(
  sourceScript,
  /const hasMutationHint = \(node\) => node\?\.nodeType === 1\s*&& \(node\.matches\?\.\(mutationHintSelector\) \|\| node\.querySelector\?\.\(mutationHintSelector\)\);/,
  "mutation filtering must inspect only element roots and their descendants",
);
assert.match(
  sourceScript,
  /const refreshAfterMutation = \(records\) => \{[\s\S]*?record\.addedNodes[\s\S]*?record\.removedNodes[\s\S]*?if \(!changedNodes\.some\(hasMutationHint\)\) continue;\s*scheduleFrameRefresh\(\);/,
  "the observer must schedule a frame only for relevant added or removed nodes",
);

const lateDiffRoot = makeLateDiffRootFixture();
const initialClassifyRuns = lateDiffRoot.state.metrics.classifyRuns;
lateDiffRoot.flushTimers();
assert.equal(lateDiffRoot.timerCount, 0, "The initial Diff root retry budget must be exhausted.");
lateDiffRoot.defineDiffElement();
await Promise.resolve();
assert.equal(lateDiffRoot.timerCount, 1, "Definition must renew an exhausted root-only retry budget.");
lateDiffRoot.attachDiffRoot();
lateDiffRoot.flushTimers();
assert.equal(
  lateDiffRoot.shadowRoot.children.length,
  1,
  "A diffs-container defined after the old retry budget must still receive its style.",
);
assert.equal(
  lateDiffRoot.state.metrics.classifyRuns,
  initialClassifyRuns,
  "Waiting for a diff Shadow Root must not repeat full-document classification.",
);
const normalizeWindowsDiffFormula = (formula) => formula
  .replaceAll("--dream-surface-raised", "--angel-adaptive-surface-raised")
  .replaceAll("--dream-surface", "--angel-adaptive-surface")
  .replaceAll("--dream-accent", "--angel-adaptive-accent");
const windowsSurface = windowsRendererScript.match(/const surface = "([^"]+)";/)?.[1];
const windowsSurfaceRaised = windowsRendererScript.match(/const surfaceRaised = "([^"]+)";/)?.[1];
assert.ok(windowsSurface && windowsSurfaceRaised, "Windows must expose both Diff surface formulas.");
const installedDiffCss = lateDiffRoot.shadowRoot.children[0].textContent;
const sharedSurface = installedDiffCss.match(/--diffs-bg:\s*([^;]+?)\s*!important;/)?.[1];
const sharedSurfaceRaised = installedDiffCss.match(/--diffs-bg-context:\s*([^;]+?)\s*!important;/)?.[1];
assert.deepEqual(
  [sharedSurface, sharedSurfaceRaised],
  [windowsSurface, windowsSurfaceRaised].map(normalizeWindowsDiffFormula),
  "Shared Diff Shadow surfaces must preserve the existing Windows 94/5 and 94/6 mixes.",
);
const outerDiffHostCss = sourceCss.match(
  /html\[data-dream-skin="active"\]\[data-dream-theme="internet-angel"\]\s+diffs-container\s*\{([^}]+)\}/,
)?.[1];
assert.ok(outerDiffHostCss, "Shared CSS must expose the diffs-container host contract.");
const outerDiffValue = (property) => outerDiffHostCss
  .match(new RegExp(`${property}:\\s*([^;]+?)\\s*!important;`))?.[1];
for (const [alias, canonical] of [
  ["--angel-adaptive-text", "var(--dream-text, var(--ds-text))"],
  ["--angel-adaptive-surface", "var(--dream-surface, var(--ds-panel))"],
  ["--angel-adaptive-surface-raised", "var(--dream-surface-raised, var(--ds-panel-2))"],
  ["--angel-adaptive-accent", "var(--dream-accent, var(--ds-green))"],
]) {
  assert.ok(
    outerDiffHostCss.includes(`${alias}: ${canonical}`),
    `Diff ${alias} must resolve from the same adaptive Dream token used by Windows.`,
  );
}
assert.deepEqual(
  [
    outerDiffValue("--diffs-bg"),
    outerDiffValue("--diffs-bg-context"),
    outerDiffValue("background-color"),
  ],
  [windowsSurface, windowsSurfaceRaised, windowsSurface].map(normalizeWindowsDiffFormula),
  "The shared outer Diff host must use the same surface and context mixes as Windows.",
);
lateDiffRoot.state.cleanup();

const cleanedLateDiffRoot = makeLateDiffRootFixture();
assert.equal(cleanedLateDiffRoot.timerCount, 1);
cleanedLateDiffRoot.state.cleanup();
cleanedLateDiffRoot.defineDiffElement();
await Promise.resolve();
cleanedLateDiffRoot.attachDiffRoot();
cleanedLateDiffRoot.flushTimers();
assert.equal(
  cleanedLateDiffRoot.shadowRoot.children.length,
  0,
  "A late custom-element definition must not revive a cleaned extension.",
);

const missingDiffRoot = makeLateDiffRootFixture();
const missingRootClassifyRuns = missingDiffRoot.state.metrics.classifyRuns;
missingDiffRoot.defineDiffElement();
await Promise.resolve();
missingDiffRoot.flushTimers();
assert.equal(
  missingDiffRoot.timerCount,
  0,
  "A permanently missing Diff Shadow Root must exhaust its root-only retry budget.",
);
assert.equal(
  missingDiffRoot.state.metrics.classifyRuns,
  missingRootClassifyRuns,
  "Exhausting Diff root retries must not run full-document classification.",
);
missingDiffRoot.state.cleanup();

const attachShadowLifecycle = makeAttachShadowLifecycleFixture();
attachShadowLifecycle.installTheme();
const retainedThemeHook = attachShadowLifecycle.prototype.attachShadow;
let externalCalls = 0;
const externalWrapper = function (...args) {
  externalCalls += 1;
  return Reflect.apply(retainedThemeHook, this, args);
};
attachShadowLifecycle.prototype.attachShadow = externalWrapper;
attachShadowLifecycle.state.cleanup();
assert.equal(
  attachShadowLifecycle.prototype.attachShadow,
  externalWrapper,
  "Theme cleanup must not overwrite a later external attachShadow wrapper.",
);
const cleanedRoot = attachShadowLifecycle.makeDiffHost().attachShadow({ mode: "open" });
assert.equal(externalCalls, 1, "The external attachShadow wrapper must remain functional after cleanup.");
assert.equal(
  cleanedRoot.children.length,
  0,
  "An external wrapper retaining the cleaned theme hook must not revive Diff styling.",
);
attachShadowLifecycle.prototype.attachShadow = retainedThemeHook;
attachShadowLifecycle.installTheme();
const activeRoot = attachShadowLifecycle.makeDiffHost().attachShadow({ mode: "open" });
assert.equal(activeRoot.children.length, 1, "A later theme injection must still style new Diff roots.");
attachShadowLifecycle.state.cleanup();
assert.equal(
  attachShadowLifecycle.prototype.attachShadow,
  attachShadowLifecycle.nativeAttachShadow,
  "A later theme lifecycle must unwrap the inactive hook restored by the external wrapper.",
);

for (const platform of ["windows", "macos", "linux"]) {
  assert.match(
    gitAttributes,
    new RegExp(`^${platform}/assets/\\*\\* text eol=lf$`, "m"),
    `${platform} generated assets must stay LF on every checkout`,
  );
  assert.equal(
    await fs.readFile(
      path.join(projectRoot, platform, "assets", "internet-angel-extension.css"),
      "utf8",
    ),
    sourceCss,
    `${platform} CSS must be generated from the shared extension source`,
  );
  assert.equal(
    await fs.readFile(
      path.join(projectRoot, platform, "assets", "internet-angel-extension.js"),
      "utf8",
    ),
    sourceScript,
    `${platform} classifier must be generated from the shared extension source`,
  );
}

for (const platform of ["windows", "linux"]) {
  const [renderer, platformCss] = await Promise.all([
    fs.readFile(path.join(projectRoot, platform, "assets", "renderer-inject.js"), "utf8"),
    fs.readFile(path.join(projectRoot, platform, "assets", "dream-skin.css"), "utf8"),
  ]);
  assert.match(renderer, /"preset-internet-angel"[\s\S]{0,120}"preset-internet-angel-default"/,
    `${platform} renderer must use the same exact bundled theme IDs as its injector`);
  assert.match(renderer, /setAttribute\("data-dream-theme", isInternetAngelTheme \? "internet-angel" : "standard"\)/,
    `${platform} renderer must satisfy the shared extension CSS theme gate`);
  assert.match(renderer, /removeAttribute\("data-dream-theme"\)/,
    `${platform} renderer cleanup must remove the shared extension CSS theme gate`);
  const sidebarParents = ':is(aside.app-shell-left-panel, [data-testid="app-shell-floating-left-panel"])';
  for (const suffix of [
    "nav",
    "button",
    "button:hover",
    ':is(.dream-new-task-button, [data-angel-component="sidebar-new-task"])',
    'button[class~="group/section-toggle"]',
    '[role="list"] > [role="listitem"]',
  ]) {
    assert.ok(
      platformCss.includes(`html.codex-dream-skin ${sidebarParents} ${suffix}`),
      `${platform} must share its existing fixed-sidebar ${suffix} presentation with the floating sidebar`,
    );
  }
  assert.doesNotMatch(
    platformCss,
    /html\.codex-dream-skin aside\.app-shell-left-panel (?:nav|button|svg|\[class|\[role)/,
    `${platform} must not leave visual descendant rules scoped only to the fixed sidebar`,
  );
}

for (const predicate of [usesWindowsExtension, usesMacosExtension, usesLinuxExtension]) {
  assert.equal(predicate({ id: "preset-internet-angel" }), true);
  assert.equal(predicate({ id: "preset-internet-angel-default" }), true);
  assert.equal(predicate({ id: "custom-internet-angel-copy" }), false);
}

for (const [platform, loadPayload] of [
  ["windows", loadWindowsPayload],
  ["macos", loadMacosPayload],
  ["linux", loadLinuxPayload],
]) {
  const loaded = await loadPayload(
    path.join(projectRoot, "macos", "presets", "preset-internet-angel"),
  );
  assert.equal(loaded.internetAngelExtension, true, `${platform} must enable the shared extension`);
  assert.ok(
    extractRendererCss(loaded.payload).includes(sourceCss),
    `${platform} must pass the shared extension CSS to the renderer style IIFE`,
  );
  assert.match(loaded.payload, /__CODEX_INTERNET_ANGEL_EXTENSION_STATE__/);
  assert.doesNotMatch(loaded.payload, /__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__/);
}

const windowsPreset = path.join(
  projectRoot,
  "macos",
  "presets",
  "preset-internet-angel",
);
const windowsSystem = await loadWindowsPayload(windowsPreset, null, "system");
assert.equal(
  windowsSystem.internetAngelClassifier,
  true,
  "Windows System material must retain the legacy classifier for its extension CSS",
);
assert.match(windowsSystem.payload, /const enabled = true;/);

const windowsAcrylic = await loadWindowsPayload(windowsPreset, null, "acrylic");
assert.equal(windowsAcrylic.internetAngelExtension, true);
assert.equal(
  windowsAcrylic.internetAngelClassifier,
  false,
  "Windows Acrylic must use durable renderer classes without rescanning the full document",
);
assert.equal(windowsAcrylic.acrylicOverlay, true);
assert.match(windowsAcrylic.payload, /const enabled = false;/);
const acrylicCss = await fs.readFile(
  path.join(projectRoot, "windows", "assets", "internet-angel-acrylic.css"),
  "utf8",
);
assert.doesNotMatch(
  acrylicCss,
  /data-angel-component/,
  "Acrylic must not depend on markers from the disabled legacy classifier",
);
for (const durableClass of [
  "dream-settings-sidebar",
  "composer-surface-chrome",
  "dream-composer-context-strip",
  "dream-side-workspace",
  "dream-terminal-panel",
]) {
  assert.match(
    acrylicCss,
    new RegExp(`\\.${durableClass}(?:[\\s,):]|$)`),
    `Acrylic must consume the renderer's durable .${durableClass} class`,
  );
}
assert.match(
  acrylicCss,
  /:not\(#codex-dream-skin-web-blur\)\s+:is\([^)]*\[data-composer-surface-variant\][^)]*\)\s*\{[^}]*backdrop-filter:\s*none\s*!important/s,
  "Acrylic must disable Chromium blur on a modern-only Codex 26.730 composer.",
);
assert.match(
  acrylicCss,
  /:is\(\s*\[data-composer-footer-responsive\],[^)]*\)\s*\{[^}]*background:\s*transparent\s*!important[^}]*backdrop-filter:\s*none\s*!important/s,
  "Acrylic must keep the responsive composer footer transparent and free of nested blur.",
);
assert.match(
  windowsPatchScript,
  /extensionCssText\.Contains\('--angel-adaptive-text: var\(--dream-text, var\(--ds-text\)\)'\)/,
  "The Windows quick-fix guard must accept the current adaptive Light text contract.",
);
assert.match(
  windowsPatchScript,
  /extensionCssText\.Contains\('\[data-angel-component="edited-card-files"\],'\)/,
  "The Windows quick-fix guard must require the current fixed-dark edited-file surface contract.",
);

console.log("PASS: Internet Angel overlays and animations share one three-platform runtime.");
