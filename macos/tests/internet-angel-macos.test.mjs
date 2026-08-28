import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { usesInternetAngelExtension } from "../scripts/injector.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const macosRoot = path.resolve(here, "..");
const injectorPath = path.join(macosRoot, "scripts", "injector.mjs");
const doctorPath = path.join(macosRoot, "scripts", "doctor-macos.sh");
const appDelegatePath = path.join(
  macosRoot,
  "menubar-app",
  "Sources",
  "CodexDreamSkinMenuBar",
  "AppDelegate.swift",
);
const overlayCssPath = path.join(macosRoot, "assets", "internet-angel-extension.css");
const overlayScriptPath = path.join(macosRoot, "assets", "internet-angel-extension.js");
const runtimeOverlayScriptPath = path.join(macosRoot, "..", "runtime", "internet-angel-extension.js");
const windowsRoot = path.resolve(macosRoot, "..", "windows");
const shellSelector = 'main:is(.main-surface, [data-app-shell-main-surface], [class*="_MainContentSurface_"])';
const composerSelector = ':is(.composer-surface-chrome, [data-composer-surface-variant], [data-ds-part="composer"])';
const composerFooterSelector = ':is([class*="_footer_"], [data-composer-footer-responsive])';
const assistantMarkdownSelector = '[data-markdown-text-style="assistant-message"]';

async function isFile(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

assert.equal(usesInternetAngelExtension({ id: "preset-internet-angel" }), true);
assert.equal(usesInternetAngelExtension({ id: "preset-internet-angel-default" }), true);
assert.equal(usesInternetAngelExtension({ id: "preset-gothic-void-crusade" }), false);
assert.equal(usesInternetAngelExtension({ id: "custom-internet-angel-copy" }), false);
assert.equal(usesInternetAngelExtension({ id: "custom-1", name: "INTERNET ANGEL" }), false);

assert.equal(await isFile(overlayCssPath), true, "The macOS Angel CSS overlay must be packaged.");
assert.equal(await isFile(overlayScriptPath), true, "The macOS Angel lifecycle must be packaged.");

const injectorSource = await fs.readFile(injectorPath, "utf8");
const doctorSource = await fs.readFile(doctorPath, "utf8");
const appDelegateSource = await fs.readFile(appDelegatePath, "utf8");
const overlayCss = await fs.readFile(overlayCssPath, "utf8");
const overlayScript = await fs.readFile(overlayScriptPath, "utf8");
const runtimeOverlayScript = await fs.readFile(runtimeOverlayScriptPath, "utf8");
const baseCss = await fs.readFile(path.join(macosRoot, "assets", "dream-skin.css"), "utf8");
const runtimeCss = await fs.readFile(path.join(macosRoot, "..", "runtime", "dream-skin.css"), "utf8");
const windowsRenderer = await fs.readFile(path.join(windowsRoot, "assets", "renderer-inject.js"), "utf8");
const windowsCss = await fs.readFile(path.join(windowsRoot, "assets", "dream-skin.css"), "utf8");

function assertCssRule(selectorFragments, declarationPattern, message, css = overlayCss) {
  const rules = css.match(/[^{}]+\{[^{}]*\}/g) || [];
  assert.ok(rules.some((rule) => {
    const boundary = rule.indexOf("{");
    const selector = rule.slice(0, boundary);
    const declarations = rule.slice(boundary + 1);
    return selectorFragments.every((fragment) => selector.includes(fragment))
      && declarationPattern.test(declarations);
  }), message);
}

for (const assetName of ["internet-angel-extension.css", "internet-angel-extension.js"]) {
  assert.match(injectorSource, new RegExp(assetName.replaceAll(".", "\\.")));
  assert.match(appDelegateSource, new RegExp(assetName.replaceAll(".", "\\.")));
  assert.match(doctorSource, new RegExp(assetName.replaceAll(".", "\\.")));
}
assert.match(injectorSource, /internetAngelExtension/);
assert.match(
  injectorSource,
  /\.update\(internetAngelTemplate\)/,
  "Overlay lifecycle changes must invalidate the injected payload revision.",
);
assert.match(
  injectorSource,
  /`\$\{basePayload\};\\n\$\{internetAngelTemplate/,
  "The base and overlay IIFEs must be separated before renderer evaluation.",
);

for (const component of [
  "composer",
  "composer-footer",
  "context-strip",
  "goal-progress",
  "goal-step",
  "goal-mode-trigger",
  "environment",
  "environment-section",
  "environment-header",
  "environment-action",
  "changes-shell",
  "changes-clip-host",
  "changes-pill",
  "side-workspace",
  "sidebar",
  "sidebar-control",
  "sidebar-new-task",
  "sidebar-section",
  "sidebar-row",
  "sidebar-footer",
  "sidebar-profile",
  "sidebar-help",
  "composer-palette",
  "composer-palette-scroll",
  "composer-palette-heading",
  "composer-palette-item",
  "turn-nav-rail",
  "turn-nav-row",
  "turn-nav-marker",
  "turn-nav-marker-active",
  "turn-preview",
  "turn-preview-surface",
  "scroll-bottom",
  "settings-sidebar",
  "settings-nav",
  "settings-search",
  "settings-content",
  "settings-surface",
  "settings-row",
  "settings-control",
  "settings-input",
  "settings-segment-group",
  "settings-segment",
  "settings-menu",
  "settings-app-row",
  "settings-app-main",
  "terminal-panel",
  "terminal-toolbar",
  "terminal-tab",
  "summary-panel",
  "message-user",
  "message-assistant",
  "message-action",
  "activity",
  "activity-header",
  "activity-detail",
  "activity-command",
  "activity-output",
  "side-chat",
  "selection-actions",
  "selection-action",
  "selected-fragment",
  "optional-comment",
  "optional-comment-input",
  "edited-card",
  "edited-card-header",
  "edited-card-icon",
  "edited-card-actions",
  "edited-card-undo",
  "edited-card-review",
  "edited-card-files",
  "edited-card-file-row",
  "edited-card-file-path",
  "edited-card-file-stats",
  "edited-card-more",
  "system-toast",
  "subagent-frame",
  "subagent-toolbar",
  "subagent-section",
  "subagent-row",
]) {
  assert.match(overlayCss, new RegExp(`data-angel-component=["']${component}["']`));
}
for (const selector of [
  '[data-message-author-role="user"]',
  '[role="dialog"]',
  '[role="menu"]',
  '[role="listbox"]',
]) {
  assert.ok(overlayCss.includes(selector), `Missing Angel surface styling for ${selector}`);
}
assert.match(overlayCss, /@media \(max-width:/);
assert.match(overlayCss, /prefers-reduced-motion: reduce/);
assertCssRule(
  ['button[class*="navigation-row"]'],
  /background:\s*transparent\s*!important/,
  "Turn rows must have a first-paint structural fallback.",
);
assertCssRule(
  ['button[class*="navigation-row"]', '[class*="_marker_"]'],
  /width:\s*10px\s*!important/,
  "Turn markers must use the themed idle width before JavaScript classification.",
);
assertCssRule(
  ['button[class*="navigation-row"]', '[class*="_marker_"]', ":hover", ":focus-visible"],
  /width:\s*28px\s*!important/,
  "Structural turn markers must retain the themed hover and focus state.",
);
assertCssRule(
  ['button[class*="navigation-row"]', '[class*="_marker_"].opacity-60', '[aria-current="true"]'],
  /width:\s*18px\s*!important/,
  "Structural turn markers must retain both existing active-state signals.",
);
const structuralTurnActiveIndex = overlayCss.indexOf(
  'button[class*="navigation-row"] [class*="_marker_"].opacity-60',
);
const structuralTurnHoverIndex = overlayCss.indexOf(
  '):is(:hover, :focus-visible) :is(',
);
assert.notEqual(structuralTurnActiveIndex, -1, "The structural turn active rule must remain present.");
assert.notEqual(structuralTurnHoverIndex, -1, "The structural turn hover rule must remain present.");
assert.ok(
  structuralTurnActiveIndex < structuralTurnHoverIndex,
  "Turn marker hover styling must follow active styling so hover retains priority.",
);
assert.ok(
  overlayCss.includes('div[class~="border-token-border"][class*="bg-token-dropdown-background"]'),
  "The Add palette needs a theme-gated structural first-frame fallback before lifecycle classification.",
);
assert.ok(
  overlayCss.includes('[data-angel-component="settings-content"] [role="switch"]'),
  "Settings switches need the Windows cyan/pink track and thumb instead of the native blue state.",
);
assert.ok(
  overlayCss.includes(
    `[data-dream-art-wide="true"]:not(:has(${shellSelector} [role="main"])) ${shellSelector} .composer-surface-chrome[data-angel-component="composer"]`,
  ),
  "Task composer styling must outrank the canonical immersive reset without widening theme scope.",
);
assert.ok(
  overlayCss.includes(
    `[data-dream-art-wide="true"]:not(:has(${shellSelector} [role="main"])) ${shellSelector} [data-composer-surface-variant][data-angel-component="composer"]`,
  ),
  "The Codex 26.730 composer must receive the same immersive Internet Angel override.",
);
assertCssRule(
  [
    'html[data-dream-skin="active"] [data-ds-part="composer"]',
    'aside:not(__DREAM_SELECTOR_LEFT_PANEL__):not([data-testid="app-shell-floating-left-panel"]):not([role="dialog"])',
    '[class*="_ComposerLayoutRoot_"]',
  ],
  /color:\s*var\(--ds-text\)\s*!important[\s\S]*background:[\s\S]*var\(--ds-panel-2\)[\s\S]*border:[\s\S]*var\(--ds-line\)[\s\S]*box-shadow:/,
  "macOS must paint the generic and right-panel Composer on the first frame like Windows.",
  runtimeCss,
);
assertCssRule(
  [
    'html[data-dream-skin="active"]:has([data-angel-component="side-workspace"])',
    '__DREAM_SELECTOR_SHELL_MAIN__:not(:has(__DREAM_SELECTOR_HOME_ROUTE_CSS__))',
    '> __DREAM_SELECTOR_HEADER_TINT__::after',
  ],
  /content:\s*none/,
  "A mounted side workspace must suppress task-header status chrome before it overlaps native tabs.",
  runtimeCss,
);
assertCssRule(
  [
    'aside:not(__DREAM_SELECTOR_LEFT_PANEL__):not([data-testid="app-shell-floating-left-panel"])',
    '[class*="_ComposerLayoutRoot_"]:has(',
    'textarea',
    '[contenteditable="true"]',
    '[role="textbox"]',
  ],
  /background:/,
  "The first-frame structural fallback must require an editable input and exclude both left sidebars.",
  runtimeCss,
);
assertCssRule(
  [
    'html[data-dream-skin="active"] [data-ds-part="composer"]',
    'aside:not(__DREAM_SELECTOR_LEFT_PANEL__):not([data-testid="app-shell-floating-left-panel"]):not([role="dialog"])',
    '[class*="_ComposerLayoutRoot_"]',
    '[class*="_ComposerLayoutFooter_"]',
    '[class*="_RichTextInput_"]',
    '[class*="_ComposerLayoutBody_"]',
    '[class*="_ComposerLayoutAttachments_"]',
    '[class*="rounded-2xl"]',
  ],
  /background:\s*transparent\s*!important[\s\S]*border:\s*0\s*!important[\s\S]*border-radius:\s*0\s*!important[\s\S]*box-shadow:\s*none\s*!important/,
  "macOS must clear the same nested native Composer frames as Windows.",
  runtimeCss,
);
assert.match(overlayCss, /outline:\s*2px solid var\(--angel-blue\)\s*!important/);
assertCssRule(
  [
    'html[data-dream-skin="active"][data-dream-theme="internet-angel"] :where(',
    '[data-radix-tooltip-content]',
    '[data-slot="tooltip-content"]',
  ],
  /z-index:\s*10000\s*!important[\s\S]*max-width:\s*min\(320px, calc\(100vw - 24px\)\)\s*!important[\s\S]*padding:\s*6px 10px\s*!important[\s\S]*color:\s*color-mix\(in oklab, var\(--angel-cyan\) 34%, var\(--ds-text\)\)\s*!important[\s\S]*border:\s*1\.25px solid var\(--angel-cyan\)\s*!important[\s\S]*border-radius:\s*8\.75px\s*!important[\s\S]*background:[\s\S]*var\(--ds-panel-2\)[\s\S]*font-weight:\s*650\s*!important[\s\S]*overflow-wrap:\s*anywhere/,
  "Dark macOS role-less Radix and slot portals must retain the Windows base surface.",
  baseCss,
);
assertCssRule(
  [
    'html[data-dream-skin="active"][data-dream-theme="internet-angel"] :where(',
    '[data-radix-tooltip-content]',
    '[data-slot="tooltip-content"]',
    ') > svg',
  ],
  /color:\s*var\(--ds-panel-2\)\s*!important[\s\S]*fill:\s*var\(--ds-panel-2\)\s*!important/,
  "Dark macOS role-less portal arrows must match the Windows raised surface.",
  baseCss,
);
const rolelessTooltipOverlayRules = (overlayCss.match(/[^{}]+\{[^{}]*\}/g) || [])
  .filter((rule) => /\[data-(?:radix-tooltip-content|slot="tooltip-content")\]/.test(rule.slice(0, rule.indexOf("{"))));
assert.ok(rolelessTooltipOverlayRules.length > 0);
assert.ok(
  rolelessTooltipOverlayRules.every((rule) => rule.includes(':is(.dream-theme-light, [data-dream-shell="light"])')),
  "The shared extension must not replace the Dark role-less Windows base surface.",
);
assertCssRule(
  ['[role="menu"]::before', '[role="listbox"]::before'],
  /height:\s*3px[\s\S]*linear-gradient\(90deg, var\(--angel-cyan\)/,
  "macOS menus must retain the Windows Internet Angel accent strip.",
);
assertCssRule(
  ['[role="menu"] [role="separator"]'],
  /height:\s*1px\s*!important[\s\S]*linear-gradient\(90deg/,
  "macOS menu separators must retain the Windows cyan/pink gradient.",
);
assertCssRule(
  ['[role="menu"] kbd', '[role="menuitem"] [class*="shortcut"]'],
  /color:\s*var\(--angel-adaptive-muted\)\s*!important[\s\S]*font-family:\s*var\(--angel-font-mono\)\s*!important/,
  "macOS menu shortcuts must retain the Windows muted monospace treatment.",
);
assertCssRule(
  ['_MainContentFrame_', '[class~="sticky"]', '[class~="z-30"]::after'],
  /background-image:\s*linear-gradient\(to bottom, transparent,[\s\S]*var\(--angel-adaptive-surface\)/,
  "Projects and PR sticky headers must retain the Windows trailing fade.",
);
for (const [selectorFragments, declarationPattern] of [
  [['[data-dream-theme="internet-angel"]', '[data-angel-component="composer"]'], /background:/],
  [['[data-dream-theme="internet-angel"]', '[data-angel-component="composer"]',
    '_ComposerLayoutFooter_', '_RichTextInput_', '_ComposerLayoutBody_', '_ComposerLayoutAttachments_'],
  /background:\s*transparent\s*!important/],
  [['[data-dream-theme="internet-angel"]', '_MainContentFrame_', 'bg-token-main-surface-primary'], /background:/],
  [['[data-dream-theme="internet-angel"]', '[data-angel-component="side-workspace"]', 'file-diff'], /background:/],
  [['[data-dream-theme="internet-angel"]', '[data-angel-component="side-workspace"]', 'file-diff', '> div'],
  /background:\s*transparent\s*!important/],
  [['[data-dream-theme="internet-angel"]', '[data-angel-component="side-workspace"]', 'file-diff', 'codeBlock'],
  /background:/],
]) {
  assertCssRule(
    selectorFragments,
    declarationPattern,
    `Missing shared macOS parity rule for ${selectorFragments.join(" ")}`,
    overlayCss,
  );
}
assertCssRule(
  [
    ':is(.dream-theme-light, [data-dream-shell="light"])',
    '[data-radix-menu-content]',
    '[role="menuitem"]',
    ':not(:is(:hover, :focus, [data-highlighted], [aria-selected="true"]))',
    ':not([data-angel-component="settings-menu"] *)',
  ],
  /color:\s*color-mix\(in srgb, var\(--angel-adaptive-text\) 90%, var\(--angel-cyan\)\)\s*!important/,
  "Idle items on Light-mode Radix surfaces must use adaptive text without overriding highlighted items.",
);
assert.doesNotMatch(
  overlayCss,
  /\[class\*="_MainContentFrame_"\]\s+input(?=\s*\{|::placeholder)/,
  "MainContentFrame parity must not repaint every native input type.",
);
assert.doesNotMatch(
  baseCss,
  /\[data-dream-theme="internet-angel"\][^{]+\[data-ds-part="composer"\]/,
  "Internet Angel composer parity must live in the shared extension, not macOS base CSS.",
);
assert.doesNotMatch(
  baseCss,
  /\[data-dream-theme="internet-angel"\][^{]+_MainContentFrame_/,
  "Projects and PR parity must live in the shared extension, not macOS base CSS.",
);
assert.ok(
  overlayScript.includes('[data-testid="app-shell-floating-left-panel"]'),
  "The collapsed hover sidebar must enter the same Internet Angel component lifecycle as the fixed sidebar.",
);
assert.match(
  baseCss,
  /\[data-testid="app-shell-floating-left-panel"\][^{]*\{[^}]*background(?:-image)?:[^;}]*var\(--dream-skin-art\)/,
  "Floating sidebar paint must draw the theme art directly instead of dimming through the main surface.",
);
assert.match(
  baseCss,
  /html\[data-dream-skin="active"\]\[data-dream-theme="internet-angel"\][^{]+\[data-testid="app-shell-floating-left-panel"\][^{]*\{[^}]*background-size:[^;}]*max\(100vw,\s*177\.7778vh\)\s+max\(56\.25vw,\s*100vh\)/,
  "Floating Internet Angel art must use viewport-sized 16:9 cover coordinates without affecting other themes.",
);
assert.match(
  baseCss,
  /\[data-testid="app-shell-floating-left-panel"\][^{]*button\[class~="group\/section-toggle"\]::before\s*\{[^}]*content:\s*"♥"/,
  "Floating sidebar sections must keep the fixed sidebar's safe Internet Angel ornaments.",
);
assert.match(
  baseCss,
  /:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) button\[aria-label\^="切换模式"\]\s*\{[^}]*color:\s*var\(--ds-accent\)\s*!important/,
  "The floating Codex mode switch must reuse the fixed sidebar's theme accent.",
);
assert.match(
  baseCss,
  /:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) button\[aria-label\^="切换模式"\]::after\s*\{[^}]*content:\s*" ·"/,
  "The floating Codex mode switch must keep the fixed sidebar's themed suffix.",
);
assert.match(
  baseCss,
  /:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) \[class\*="text-token-input-placeholder-foreground"\]\s*\{[^}]*color:\s*rgb\(var\(--ds-muted-rgb\) \/ \.92\)\s*!important/,
  "The floating mode arrow must reuse the fixed sidebar's specific muted tint.",
);
assert.match(
  baseCss,
  /\[data-dream-theme="internet-angel"\][^{]*:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) :is\(button, a\)\s*\{[^}]*border-radius:\s*3px 10px 3px 10px\s*!important/,
  "Floating Internet Angel controls must keep the fixed sidebar's corner shape.",
);
assert.match(
  baseCss,
  /:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) :is\(button, a\)\s*\{[^}]*color:\s*var\(--ds-text\)\s*!important[^}]*transition:/,
  "Floating sidebar controls must reuse the fixed sidebar's base theme colors.",
);
assert.match(
  baseCss,
  /:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) \[class\*="text-token-foreground"\]\s*\{[^}]*color:\s*var\(--ds-text\)\s*!important/,
  "Floating sidebar foreground text must reuse the fixed sidebar's theme color.",
);
assert.match(
  baseCss,
  /:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) svg\s*\{[^}]*color:\s*rgb\(var\(--ds-muted-rgb\) \/ \.96\)\s*!important/,
  "Floating sidebar icons must reuse the fixed sidebar's theme tint.",
);
assert.match(
  baseCss,
  /:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) :is\(button, a\):hover\s*\{[^}]*background:\s*rgb\(var\(--ds-accent-rgb\) \/ \.09\)\s*!important/,
  "Floating sidebar hover controls must reuse the fixed sidebar's theme paint.",
);
assert.match(
  baseCss,
  /:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) :is\(button, a\):hover svg\s*\{[^}]*color:\s*var\(--ds-accent\)\s*!important/,
  "Floating sidebar hover icons must reuse the fixed sidebar's theme tint.",
);
assert.match(
  baseCss,
  /:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) :is\(\[class~="bg-token-list-hover-background"\], \[aria-current="page"\]\)\s*\{[^}]*background:\s*rgb\(var\(--ds-accent-rgb\) \/ \.12\)\s*!important/,
  "Floating selected rows must reuse the fixed sidebar's base selection paint.",
);
assert.match(
  baseCss,
  /:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) \[aria-current="page"\] svg\s*\{[^}]*color:\s*var\(--ds-accent\)\s*!important/,
  "Floating current-page icons must reuse the fixed sidebar's base highlight.",
);
assert.match(
  baseCss,
  /\[data-dream-theme="internet-angel"\][^{]*:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) :is\(\[class~="bg-token-list-hover-background"\], \[aria-current="page"\]\)\s*\{[^}]*box-shadow:[^}]*var\(--angel-pink\)/,
  "Floating selected rows must reuse the fixed Internet Angel selection plate.",
);
assert.match(
  baseCss,
  /\[data-dream-theme="internet-angel"\][^{]*:is\(aside\.app-shell-left-panel, \[data-testid="app-shell-floating-left-panel"\]\) :is\(\[class~="bg-token-list-hover-background"\], \[aria-current="page"\]\) svg\s*\{[^}]*filter:\s*drop-shadow/,
  "Floating selected-row icons must reuse the fixed Internet Angel highlight.",
);
assert.match(
  overlayCss,
  /\[data-angel-component=["']sidebar-row["']\][\s\S]*?background:\s*transparent\s*!important/,
  "Ordinary sidebar rows must stay transparent at rest like the Windows skin.",
);
assert.ok(
  overlayCss.includes('[class~="bg-token-list-hover-background"]'),
  "The native selected sidebar class must receive the Windows cyan/pink selection plate.",
);
assert.ok(
  overlayCss.includes('button[data-angel-component="sidebar-row"]'),
  "Only real sidebar buttons may receive the Windows hover plate; expanded folder rows are not selected.",
);
assert.match(
  overlayCss,
  /\[data-angel-component=["']sidebar-row["']\]\s*\{[\s\S]*?overflow-y:\s*clip\s*!important/,
  "Themed fixed-height sidebar rows must not become nested vertical scroll containers.",
);
const sideWorkspaceRule = overlayCss.match(
  /\[data-angel-component=["']side-workspace["']\]\s*\{([^}]*)\}/,
)?.[1] || "";
assert.notEqual(sideWorkspaceRule, "", "The side workspace paint rule must remain present.");
assertCssRule(
  ['html:root', '[data-angel-component="side-workspace"]'],
  /background:\s*[\s\S]*!important/,
  "Explicit workspace paint must outrank the base token-surface transparency rule.",
);
assert.match(
  sideWorkspaceRule,
  /linear-gradient\(155deg/,
  "The restored parity skin must retain the first version's side-workspace gradient.",
);
assert.doesNotMatch(
  sideWorkspaceRule,
  /position\s*:/,
  "The side workspace skin must preserve the native positioning contract.",
);
assert.doesNotMatch(
  overlayCss,
  /\[data-angel-component=["']side-workspace["']\]::before/,
  "Workspace decoration must be paint-only and must not require a positioned pseudo-element.",
);
assert.ok(
  overlayCss.includes('button:has([class*="git-decoration-added"]):has([class*="git-decoration-deleted"])'),
  "The compact changed-files pill needs the same first-frame structural fallback as Windows.",
);
assert.doesNotMatch(
  `${overlayScript}\n${overlayCss}`,
  /--angel-environment-shift-x/,
  "The theme layer must not retain a stale horizontal correction after the native portal reflows.",
);
assert.ok(
  overlayCss.includes("max-width: calc(100vw - 32px)"),
  "The Environment/Sources portal must fit narrow macOS windows.",
);
assert.doesNotMatch(overlayScript, /classList\.(?:add|remove|toggle)/);
assert.match(overlayScript, /subtree\s*:\s*true/);

const windowsToMacosParity = [
  ["composer-palette", "composer-palette"],
  ["composer-context-strip", "context-strip"],
  ["active-goal-strip", "active-goal-strip"],
  ["goal-progress-group", "goal-progress"],
  ["goal-step", "goal-step"],
  ["goal-mode-trigger", "goal-mode-trigger"],
  ["changes-shell", "changes-shell"],
  ["changes-clip-host", "changes-clip-host"],
  ["changes-pill", "changes-pill"],
  ["permission-banner", "permission"],
  ["terminal-panel", "terminal-panel"],
  ["side-workspace", "side-workspace"],
  ["side-chat-panel", "side-chat"],
  ["summary-panel", "summary-panel"],
  ["selection-actions", "selection-actions"],
  ["selection-action", "selection-action"],
  ["selected-fragment", "selected-fragment"],
  ["optional-comment", "optional-comment"],
  ["optional-comment-input", "optional-comment-input"],
  ["edited-card", "edited-card"],
  ["edited-card-header", "edited-card-header"],
  ["edited-card-icon", "edited-card-icon"],
  ["edited-card-actions", "edited-card-actions"],
  ["edited-card-undo", "edited-card-undo"],
  ["edited-card-review", "edited-card-review"],
  ["turn-nav-rail", "turn-nav-rail"],
  ["turn-nav-row", "turn-nav-row"],
  ["turn-nav-marker", "turn-nav-marker"],
  ["turn-preview-tooltip", "turn-preview"],
  ["turn-preview-surface", "turn-preview-surface"],
  ["settings-sidebar", "settings-sidebar"],
  ["settings-content", "settings-content"],
  ["settings-app-row", "settings-app-row"],
  ["settings-app-main", "settings-app-main"],
  ["subagent-frame", "subagent-frame"],
  ["subagent-toolbar", "subagent-toolbar"],
  ["subagent-section", "subagent-section"],
  ["subagent-row", "subagent-row"],
  ["system-toast", "system-toast"],
];
for (const [windowsComponent, macosComponent] of windowsToMacosParity) {
  assert.ok(
    `${windowsRenderer}\n${windowsCss}`.includes(`dream-${windowsComponent}`),
    `Windows parity source no longer exposes dream-${windowsComponent}.`,
  );
  assert.ok(
    overlayScript.includes(`"${macosComponent}"`),
    `macOS lifecycle does not classify the Windows ${windowsComponent} equivalent.`,
  );
  assert.match(
    overlayCss,
    new RegExp(`data-angel-component=["']${macosComponent}["']`),
    `macOS CSS does not skin the Windows ${windowsComponent} equivalent.`,
  );
}

function splitSelectorList(selector) {
  const selectors = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < selector.length; index += 1) {
    if (selector[index] === "(") depth += 1;
    else if (selector[index] === ")") depth -= 1;
    else if (selector[index] === "," && depth === 0) {
      selectors.push(selector.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(selector.slice(start).trim());
  return selectors;
}

class FixtureNode {
  constructor({ className = "", matches = [], rect = {}, text = "" } = {}) {
    this.attributes = new Map();
    this.className = className;
    this.isConnected = true;
    this.matchSelectors = new Set(matches);
    this.nodeType = 1;
    this.parentElement = null;
    this.queryChildren = new Set();
    this.queries = new Map();
    this.closestNodes = new Map();
    this.rect = { left: 0, top: 0, width: 0, height: 0, ...rect };
    this.textContent = text;
  }

  addQuery(selector, nodes) {
    const values = Array.isArray(nodes) ? nodes : [nodes];
    this.queries.set(selector, values);
    for (const node of values) {
      this.queryChildren.add(node);
      if (!node.parentElement) node.parentElement = this;
    }
    return this;
  }

  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    if (this.queries.has(selector)) return this.queries.get(selector);
    const matches = [];
    const visit = (node) => {
      if (node.matches(selector)) matches.push(node);
      for (const child of node.queryChildren) visit(child);
    };
    for (const child of this.queryChildren) visit(child);
    return matches;
  }
  matches(selector) {
    const alternatives = splitSelectorList(selector);
    if (alternatives.includes("[data-angel-component]")
      && this.attributes.has("data-angel-component")) return true;
    return alternatives.some((alternative) => this.matchSelectors.has(alternative));
  }
  closest(selector) { return this.closestNodes.get(selector) || null; }
  getBoundingClientRect() {
    return {
      ...this.rect,
      right: this.rect.left + this.rect.width,
      bottom: this.rect.top + this.rect.height,
    };
  }
}

function makeOverlayFixture({
  delayedDiffRoot = false,
  delayedPublicComposer = false,
  delayedWorkspaceEvidence = false,
  modernComposer = false,
  publicComposerOnly = false,
  publicSidebarOnly = false,
} = {}) {
  const nodes = [];
  class OverlayFixtureNode extends FixtureNode {
    attachShadow() {
      this.shadowRoot = this.pendingShadowRoot;
      return this.shadowRoot;
    }
  }
  const nativeAttachShadow = OverlayFixtureNode.prototype.attachShadow;
  const makeNode = (options) => {
    const node = new OverlayFixtureNode(options);
    nodes.push(node);
    return node;
  };
  const composer = makeNode({
    className: modernComposer || publicComposerOnly || delayedPublicComposer
      ? "_ComposerLayoutRoot_fixture"
      : "composer-surface-chrome",
  });
  if (modernComposer) composer.setAttribute("data-composer-surface-variant", "default");
  if (publicComposerOnly) composer.setAttribute("data-ds-part", "composer");
  const composerFooter = makeNode({
    className: modernComposer || publicComposerOnly ? "flex items-center" : "_footer_fixture",
  });
  if (modernComposer || publicComposerOnly) {
    composerFooter.setAttribute("data-composer-footer-responsive", "true");
  }
  const editor = makeNode();
  const send = makeNode();
  const goalMode = makeNode({ text: "Goal" });
  goalMode.setAttribute("aria-label", "Goal mode");
  composer
    .addQuery(composerFooterSelector, composerFooter)
    .addQuery('[contenteditable="true"]', editor)
    .addQuery("button", [send, goalMode]);

  const sticky = makeNode();
  const contextStrip = makeNode();
  const goalLabel = makeNode({ text: "Step 1 / 6" });
  const goalStep = makeNode({ className: "inline-flex" });
  const goalProgress = makeNode({ className: "rounded-3xl items-center" });
  goalLabel.closestNodes.set('span[class~="inline-flex"]', goalStep);
  goalStep.closestNodes.set('div[class~="rounded-3xl"][class~="items-center"]', goalProgress);
  sticky
    .addQuery('div[class~="relative"][class~="min-w-0"][class~="overflow-clip"][class~="border-x"][class~="border-t"]', contextStrip)
    .addQuery("span", goalLabel);

  const environmentHost = makeNode({ className: "absolute pointer-events-none z-40" });
  const environment = makeNode({
    className: "relative rounded-3xl bg-token-dropdown-background",
    rect: { left: 1800, top: 58, width: 300, height: 199 },
    text: "Environment Changes Local main branch commit",
  });
  const environmentSection = makeNode();
  const environmentHeader = makeNode({ className: "group/section-toggle" });
  const environmentAction = makeNode();
  const sourcesSection = makeNode();
  const sourcesHeader = makeNode({ className: "group/section-toggle", text: "Sources" });
  const sourcesAction = makeNode({ text: "View all" });
  const environmentGitSelector = '[data-testid*="git"], [aria-label*="git" i], [class*="git-"]';
  const gitSignal = makeNode();
  environmentHeader.parentElement = environmentSection;
  sourcesHeader.parentElement = sourcesSection;
  environment.closestNodes.set('[class~="absolute"][class~="z-40"]', environmentHost);
  environment
    .addQuery('button[class~="group/section-toggle"]', [environmentHeader, sourcesHeader])
    .addQuery("button", [environmentHeader, environmentAction, sourcesHeader, sourcesAction])
    .addQuery(environmentGitSelector, gitSignal);

  const structuralEnvironment = makeNode({
    className: "relative rounded-3xl bg-surface-elevated-secondary",
    rect: { left: 1378, top: 58, width: 300, height: 199 },
    text: "Tools",
  });
  const structuralEnvironmentSection = makeNode();
  const structuralEnvironmentHeader = makeNode({ className: "group/section-toggle", text: "Tools" });
  const structuralEnvironmentAction = makeNode({ text: "Open" });
  const structuralGitHost = makeNode();
  const structuralGitSignal = makeNode({ matches: ['[data-testid*="git"]'] });
  structuralGitSignal.setAttribute("data-testid", "git-status");
  structuralEnvironmentHeader.parentElement = structuralEnvironmentSection;
  structuralGitSignal.parentElement = structuralGitHost;
  structuralEnvironment.closestNodes.set('[class~="absolute"][class~="z-40"]', environmentHost);
  structuralEnvironment
    .addQuery('button[class~="group/section-toggle"]', structuralEnvironmentHeader)
    .addQuery("button", [structuralEnvironmentHeader, structuralEnvironmentAction])
    .addQuery(environmentGitSelector, structuralGitSignal);

  const radixEnvironmentHost = makeNode();
  radixEnvironmentHost.setAttribute("data-radix-popper-content-wrapper", "");
  const radixEnvironment = makeNode({
    className: "relative rounded-3xl bg-token-dropdown-background",
    rect: { left: 1300, top: 47, width: 300, height: 317 },
    text: "Environment Changes Local main branch commit Sources View all",
  });
  const radixEnvironmentSection = makeNode();
  const radixEnvironmentHeader = makeNode({ className: "group/section-toggle", text: "Environment" });
  const radixEnvironmentAction = makeNode({ text: "Changes" });
  const radixSourcesSection = makeNode();
  const radixSourcesHeader = makeNode({ className: "group/section-toggle", text: "Sources" });
  const radixSourcesAction = makeNode({ text: "View all" });
  const radixGitSignal = makeNode();
  radixEnvironmentHeader.parentElement = radixEnvironmentSection;
  radixSourcesHeader.parentElement = radixSourcesSection;
  radixEnvironment.closestNodes.set('[data-radix-popper-content-wrapper]', radixEnvironmentHost);
  radixEnvironment
    .addQuery('button[class~="group/section-toggle"]', [radixEnvironmentHeader, radixSourcesHeader])
    .addQuery("button", [
      radixEnvironmentHeader,
      radixEnvironmentAction,
      radixSourcesHeader,
      radixSourcesAction,
    ])
    .addQuery(environmentGitSelector, radixGitSignal);

  const lookalike = makeNode({
    className: "rounded-3xl bg-token-dropdown-background",
    rect: { left: 1400, top: 300, width: 278, height: 150 },
    text: "Environment",
  });
  lookalike.closestNodes.set('[class~="absolute"][class~="z-40"]', environmentHost);

  const workspaceOuter = makeNode({
    className: "absolute bg-token-main-surface-primary",
    rect: { left: 1220, top: 28, width: 458, height: 840 },
  });
  const workspace = makeNode({
    className: "contain:layout_paint bg-token-main-surface-primary",
    rect: { left: 1240, top: 48, width: 438, height: 820 },
  });
  const workspaceEvidence = makeNode({ matches: ['[role="tablist"]'] });
  const workspaceMutationRoot = makeNode();
  workspaceEvidence.setAttribute("role", "tablist");
  const workspaceEvidenceSelector = '[role="tablist"], [role="tabpanel"], .xterm, .thread-scroll-container';
  workspaceMutationRoot.addQuery(workspaceEvidenceSelector, workspaceEvidence);
  workspaceOuter.addQuery(workspaceEvidenceSelector, delayedWorkspaceEvidence ? [] : workspaceEvidence);
  workspace.addQuery(workspaceEvidenceSelector, delayedWorkspaceEvidence ? [] : workspaceEvidence);
  workspaceMutationRoot.isConnected = !delayedWorkspaceEvidence;
  workspace.parentElement = workspaceOuter;
  const workspaceAside = makeNode({ matches: ["aside"] });
  workspaceOuter.closestNodes.set("aside", workspaceAside);
  workspace.closestNodes.set("aside", workspaceAside);
  const leftWorkspace = makeNode({
    className: "bg-token-main-surface-primary",
    rect: { left: 0, top: 48, width: 220, height: 820 },
  });
  leftWorkspace.addQuery(workspaceEvidenceSelector, workspaceEvidence);
  const workspaceToolbar = makeNode({
    className: "contain:layout_paint",
    rect: { left: 1240, top: 48, width: 205, height: 46 },
  });
  workspaceToolbar.addQuery(
    workspaceEvidenceSelector,
    delayedWorkspaceEvidence ? [] : workspaceEvidence,
  );
  workspaceToolbar.closestNodes.set("aside", workspaceAside);

  const makeSidebarControls = () => {
    const mode = makeNode();
    mode.setAttribute("aria-label", "Switch mode, current mode: Codex");
    const search = makeNode();
    search.setAttribute("aria-label", "Search");
    const newTask = makeNode({ text: "New chat" });
    const section = makeNode({ className: "group/section-toggle", text: "Projects" });
    const row = makeNode({ text: "Codex-Dream-Skin" });
    row.setAttribute("aria-current", "page");
    const footer = makeNode();
    const profile = makeNode({ text: "OpenAI" });
    profile.setAttribute("aria-label", "Open profile menu");
    const help = makeNode();
    help.setAttribute("aria-label", "Open help menu");
    profile.parentElement = footer;
    help.parentElement = footer;
    const buttons = [mode, search, newTask, section, row, profile, help];
    return { buttons, footer, help, mode, newTask, nodes: [footer, ...buttons], profile, row, search, section };
  };

  const stableSidebarSelector = 'aside.app-shell-left-panel, [data-testid="app-shell-floating-left-panel"]';
  const sidebarSelector = `${stableSidebarSelector}, [data-ds-part="sidebar"]`;
  const settingsNavSelector = 'nav:has([data-settings-panel-slug])';
  const settingsContentSelector = '[class~="scrollbar-stable"][class~="flex-1"][class~="overflow-y-auto"][class~="p-panel"]';
  const sidebar = makeNode({
    className: publicSidebarOnly ? "flex min-h-0 flex-col" : "app-shell-left-panel",
  });
  if (publicSidebarOnly) sidebar.setAttribute("data-ds-part", "sidebar");
  leftWorkspace.closestNodes.set("aside", sidebar);
  leftWorkspace.closestNodes.set(sidebarSelector, sidebar);
  leftWorkspace.closestNodes.set(stableSidebarSelector, sidebar);
  const sidebarControls = makeSidebarControls();
  sidebar.addQuery("button, [role=button]", sidebarControls.buttons);
  const floatingSidebar = makeNode({
    className: "flex h-full min-h-0 flex-col overflow-hidden",
    matches: [`:is(${stableSidebarSelector})`, `:is(${sidebarSelector})`],
  });
  floatingSidebar.setAttribute("data-testid", "app-shell-floating-left-panel");
  const floatingSidebarControls = makeSidebarControls();
  floatingSidebar.addQuery("button, [role=button]", floatingSidebarControls.buttons);
  const fixedSidebarNodes = [sidebar, ...sidebarControls.nodes];
  const floatingSidebarNodes = [floatingSidebar, ...floatingSidebarControls.nodes];
  for (const node of floatingSidebarNodes) node.isConnected = false;

  const settingsLayout = makeNode();
  const settingsSidebar = makeNode({ className: "app-shell-left-panel" });
  const settingsNav = makeNode();
  const settingsContent = makeNode();
  const settingsScroll = makeNode({ className: "flex-1 scrollbar-stable overflow-y-auto p-panel" });
  const unrelatedSettingsContent = makeNode();
  const unrelatedSettingsScroll = makeNode({ className: "flex-1 scrollbar-stable overflow-y-auto p-panel" });
  settingsSidebar.parentElement = settingsLayout;
  settingsNav.parentElement = settingsSidebar;
  settingsNav.closestNodes.set(sidebarSelector, settingsSidebar);
  settingsNav.closestNodes.set(stableSidebarSelector, settingsSidebar);
  settingsScroll.parentElement = settingsContent;
  settingsContent.parentElement = settingsLayout;
  unrelatedSettingsScroll.parentElement = unrelatedSettingsContent;
  settingsLayout.addQuery(settingsContentSelector, settingsScroll);

  const palette = makeNode({ className: "border-token-border bg-token-dropdown-background/90 relative overflow-hidden rounded-2xl p-1" });
  const paletteScroll = makeNode({ className: "vertical-scroll-fade-mask overflow-y-auto" });
  const paletteHeading = makeNode({ className: "sticky top-0 z-10", text: "Add" });
  const paletteItem = makeNode({ className: "w-full shrink-0 rounded-lg text-left", text: "Add files" });
  paletteScroll.parentElement = palette;
  paletteScroll
    .addQuery('[class~="sticky"][class~="top-0"][class~="z-10"]', paletteHeading)
    .addQuery('button[class~="w-full"][class~="shrink-0"][class~="rounded-lg"][class~="text-left"]', paletteItem);

  const turnRail = makeNode();
  const turnRow = makeNode({ className: "navigation-row" });
  const turnMarker = makeNode({ className: "marker opacity-60" });
  turnRow.parentElement = turnRail;
  turnRow.addQuery('[class*="_marker_"]', turnMarker);

  const summaryPanel = makeNode({ className: "rounded-3xl bg-token-dropdown-background" });
  const userUnit = makeNode();
  userUnit.setAttribute("data-content-search-unit-key", "turn:0:user");
  const userBubble = makeNode({ className: "rounded-2xl", text: "User message" });
  const userMessageAction = makeNode();
  userMessageAction.setAttribute("aria-label", "Copy message");
  userUnit
    .addQuery('[data-user-message-bubble="true"]', userBubble)
    .addQuery('[class*="flex-row-reverse"][class*="items-center"] button[aria-label]', userMessageAction);
  const assistantUnit = makeNode();
  assistantUnit.setAttribute("data-content-search-unit-key", "turn:3:assistant");
  const assistantMessage = makeNode({ className: "group flex min-w-0 flex-col" });
  assistantMessage.setAttribute("data-response-annotation-target", "message-3");
  const assistantMessageAction = makeNode();
  assistantMessageAction.setAttribute("aria-label", "Copy response");
  assistantMessage.addQuery(
    ':scope > [class*="items-center"][class*="h-5"] button[aria-label]',
    assistantMessageAction,
  );
  assistantUnit.addQuery('[data-response-annotation-target]', assistantMessage);
  const currentAssistantMessage = makeNode({ matches: [assistantMarkdownSelector] });
  currentAssistantMessage.setAttribute("data-markdown-text-style", "assistant-message");

  const activity = makeNode();
  activity.setAttribute("data-local-conversation-item-target-ids", "exec-1");
  const activityHeader = makeNode({ className: "group/activity-header" });
  const activityDetail = makeNode({ className: "flex flex-col overflow-clip" });
  const activityCommand = makeNode({ className: "group/command" });
  const activityOutput = makeNode({ className: "group/output" });
  activityHeader.parentElement = activity;
  activityCommand.parentElement = activityDetail;
  activityOutput.parentElement = activityDetail;
  activityDetail.parentElement = activity;
  activity
    .addQuery('[class*="group/activity-header"]', activityHeader)
    .addQuery('[class*="group/command"]', activityCommand)
    .addQuery('[class*="group/output"]', activityOutput);
  const streamingActivity = makeNode({ className: "min-w-0 text-size-chat relative overflow-visible" });
  const streamingActivityHeader = makeNode({ className: "group/activity-header", text: "Ran command" });
  streamingActivityHeader.parentElement = streamingActivity;
  streamingActivityHeader.closestNodes.set(
    'div[class~="text-size-chat"][class~="relative"][class~="overflow-visible"]',
    streamingActivity,
  );
  streamingActivity.addQuery('[class*="group/activity-header"]', streamingActivityHeader);

  const editedCard = makeNode({
    className: "rounded-lg bg-token-dropdown-background [--thread-resource-card-row-padding-x:0.75rem]",
  });
  const editedHeader = makeNode({ className: "group/turn-diff-header" });
  const editedIcon = makeNode({ className: "size-10 rounded-lg" });
  const editedTitle = makeNode({ className: "font-medium text-token-foreground", text: "Edited 8 files" });
  const editedStats = makeNode({ className: "turn-diff-default-subtitle", text: "+1,319 -18" });
  const editedActions = makeNode({ className: "pointer-events-auto flex items-center gap-2" });
  const editedUndo = makeNode({ text: "Undo" });
  const editedReview = makeNode({ text: "Review" });
  const editedFiles = makeNode({ className: "flex flex-col border-t" });
  const editedFileRow = makeNode({ className: "thread-diff-virtualized" });
  const editedFileButton = makeNode();
  const editedFilePath = makeNode({ className: "flex min-w-0 flex-1 items-center", text: "macos/assets/internet-angel-macos.css" });
  const editedFileStats = makeNode({ className: "inline-flex tabular-nums", text: "+66 -0" });
  const editedMore = makeNode({ text: "Show 5 more files" });
  editedHeader.parentElement = editedCard;
  editedHeader.closestNodes.set('[class*="rounded-lg"][class*="bg-token-dropdown-background"]', editedCard);
  editedHeader
    .addQuery('span[class~="font-medium"][class*="text-token-foreground"]', editedTitle)
    .addQuery('[class~="size-10"][class~="rounded-lg"]:has(> svg)', editedIcon);
  editedUndo.parentElement = editedActions;
  editedReview.parentElement = editedActions;
  editedActions.parentElement = editedHeader;
  editedCard
    .addQuery(".turn-diff-default-subtitle", editedStats)
    .addQuery("button, [role=button]", [editedUndo, editedReview])
    .addQuery(':scope > [class~="flex"][class~="flex-col"][class~="border-t"]', editedFiles);
  editedFiles
    .addQuery(".thread-diff-virtualized", editedFileRow)
    .addQuery(":scope > button", editedMore);
  editedFileRow.addQuery("button", editedFileButton);
  editedFileButton
    .addQuery('[class~="min-w-0"][class~="flex-1"][class~="items-center"]', editedFilePath)
    .addQuery('[class~="tabular-nums"]', editedFileStats);

  const changesClipHost = makeNode({ className: "relative overflow-hidden rounded-3xl" });
  const changesShell = makeNode({ className: "rounded-3xl border-token-border" });
  const changesWrapper = makeNode();
  const changesPill = makeNode({ text: "4 files changed +526 -12" });
  const changesAdded = makeNode({ className: "git-decoration-added", text: "+526" });
  const changesDeleted = makeNode({ className: "git-decoration-deleted", text: "-12" });
  changesPill.parentElement = changesWrapper;
  changesPill
    .addQuery('[class*="git-decoration-added"]', changesAdded)
    .addQuery('[class*="git-decoration-deleted"]', changesDeleted);
  changesWrapper.closestNodes.set(':not(button)[class*="rounded-3xl"][class*="border"]', changesShell);
  changesWrapper.closestNodes.set(
    ':not(button)[class~="overflow-hidden"][class~="rounded-3xl"]',
    changesClipHost,
  );

  const modernChangesClipHost = makeNode({ className: "relative overflow-hidden rounded-3xl" });
  const modernChangesShell = makeNode({ className: "rounded-3xl border-border/80" });
  const modernChangesWrapper = makeNode();
  const modernChangesPill = makeNode({ text: "1 个文件已更改 +152 -0" });
  const modernChangesAddedSelector = '[class*="text-codex-git-added"]';
  const modernChangesDeletedSelector = '[class*="text-codex-git-deleted"]';
  const modernChangesAdded = makeNode({
    className: "text-codex-git-added",
    matches: [modernChangesAddedSelector],
    text: "+152",
  });
  const modernChangesDeleted = makeNode({
    className: "text-codex-git-deleted",
    matches: [modernChangesDeletedSelector],
    text: "-0",
  });
  modernChangesPill.parentElement = modernChangesWrapper;
  modernChangesPill
    .addQuery(modernChangesAddedSelector, modernChangesAdded)
    .addQuery(modernChangesDeletedSelector, modernChangesDeleted);
  modernChangesWrapper.closestNodes.set(
    ':not(button)[class*="rounded-3xl"][class*="border"]',
    modernChangesShell,
  );
  modernChangesWrapper.closestNodes.set(
    ':not(button)[class~="overflow-hidden"][class~="rounded-3xl"]',
    modernChangesClipHost,
  );

  const systemToast = makeNode({
    matches: ["[data-sonner-toast]"],
    text: "Rate limit reset opportunity",
  });
  const systemToastAction = makeNode({ text: "View reset" });
  systemToast.setAttribute("data-sonner-toast", "");
  systemToast.addQuery("button", systemToastAction);
  systemToast.isConnected = false;
  systemToastAction.isConnected = false;

  const diffThemeAttribute = "data-internet-angel-diff-theme";
  const shadowMutationCallbacks = [];
  const queueShadowMutation = (record) => {
    for (const observer of observers) {
      if (observer.target !== diffShadowRoot || observer.disconnected) continue;
      shadowMutationCallbacks.push(() => observer.callback([record]));
    }
  };
  const diffShadowRoot = {
    children: [],
    appendChild(node) {
      node.parentNode = this;
      this.children.push(node);
      queueShadowMutation({ type: "childList", target: this, addedNodes: [node], removedNodes: [] });
      return node;
    },
    querySelector(selector) {
      if (selector !== `style[${diffThemeAttribute}]`) return null;
      return this.children.find((node) => node.getAttribute?.(diffThemeAttribute) !== null) || null;
    },
    replaceChildren(...children) {
      const removedNodes = this.children;
      for (const node of removedNodes) node.parentNode = null;
      this.children = children;
      for (const node of children) node.parentNode = this;
      queueShadowMutation({ type: "childList", target: this, addedNodes: children, removedNodes });
    },
  };
  const diffsHost = makeNode({ matches: ["diffs-container"] });
  diffsHost.pendingShadowRoot = diffShadowRoot;
  diffsHost.shadowRoot = delayedDiffRoot ? null : diffShadowRoot;

  const shell = makeNode();
  const body = makeNode();
  sidebar.parentElement = body;
  const documentQueries = new Map([
    [composerSelector, delayedPublicComposer ? [] : [composer]],
    [`${shellSelector} [class~="sticky"][class~="bottom-0"]`, [sticky]],
    ['div[class*="bg-token-dropdown-background"][class~="rounded-3xl"]', [
      environment,
      radixEnvironment,
      lookalike,
    ]],
    ['div:is([class*="bg-token-dropdown-background"], [class~="bg-surface-elevated-secondary"])[class~="rounded-3xl"]', [
      environment,
      structuralEnvironment,
      radixEnvironment,
      lookalike,
    ]],
    ['[class*="contain:layout_paint"], [class~="bg-token-main-surface-primary"]', [
      workspaceOuter,
      workspace,
      workspaceToolbar,
      leftWorkspace,
    ]],
    ['[class*="rounded-3xl"][class*="bg-token-dropdown-background"]:has(> [class*="overflow-y-auto"] [class*="group/summary-panel-item"])', [
      environment,
      radixEnvironment,
      summaryPanel,
    ]],
    ['[data-user-message-bubble="true"]', [userBubble]],
    ['[data-content-search-unit-key$=":user"]', [userUnit]],
    ['[data-content-search-unit-key$=":assistant"]', [assistantUnit]],
    [assistantMarkdownSelector, [currentAssistantMessage]],
    ['[data-local-conversation-item-target-ids]', [activity]],
    ['[class*="group/activity-header"]', [activityHeader, streamingActivityHeader]],
    ['[class*="group/turn-diff-header"]', [editedHeader]],
    ['button:has([class*="git-decoration-added"]):has([class*="git-decoration-deleted"])', [changesPill]],
    ['button:has(:is([class*="git-decoration-added"], [class*="text-codex-git-added"])):has(:is([class*="git-decoration-deleted"], [class*="text-codex-git-deleted"]))', [
      changesPill,
      modernChangesPill,
    ]],
    [stableSidebarSelector, publicSidebarOnly ? [] : [sidebar]],
    [sidebarSelector, [sidebar]],
    ['div.vertical-scroll-fade-mask[class~="overflow-y-auto"]', [paletteScroll]],
    ['button[class*="navigation-row"]', [turnRow]],
    [settingsNavSelector, [settingsNav]],
    [settingsContentSelector, [unrelatedSettingsScroll, settingsScroll]],
    ["diffs-container", [diffsHost]],
    ["body div, body section, body aside", []],
  ]);
  const document = {
    body,
    createElement(tagName) {
      assert.equal(tagName, "style");
      const attributes = new Map();
      return {
        parentNode: null,
        textContent: "",
        get isConnected() { return Boolean(this.parentNode && diffsHost.isConnected); },
        getAttribute(name) { return attributes.get(name) ?? null; },
        setAttribute(name, value) { attributes.set(name, String(value)); },
        remove() {
          if (!this.parentNode) return;
          this.parentNode.children = this.parentNode.children.filter((node) => node !== this);
          this.parentNode = null;
        },
      };
    },
    querySelector(selector) {
      if (selector === shellSelector) return shell;
      return (documentQueries.get(selector) || [])[0] || null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-angel-component]") {
        return nodes.filter((node) => node.isConnected && node.attributes.has("data-angel-component"));
      }
      return (documentQueries.get(selector) || []).filter((node) => node.isConnected);
    },
  };
  const observers = [];
  class MockMutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target, options) { this.target = target; this.options = options; }
    disconnect() { this.disconnected = true; }
  }
  const listeners = new Map();
  const navigation = {
    addEventListener(type, callback) { listeners.set(`navigation:${type}`, callback); },
    removeEventListener(type) { listeners.delete(`navigation:${type}`); },
  };
  let nextTimer = 0;
  const timers = new Map();
  let nextFrame = 0;
  const frames = new Map();
  const window = {
    navigation,
    addEventListener(type, callback) { listeners.set(type, callback); },
    cancelAnimationFrame(id) { frames.delete(id); },
    removeEventListener(type) { listeners.delete(type); },
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
  };
  const notifyBodyMutation = (record) => {
    const observer = observers.find((candidate) => candidate.target === body);
    if (!observer) throw new Error("Body mutation observer was not installed");
    observer.callback([record]);
  };
  return {
    composer,
    composerFooter,
    context: {
      document,
      innerWidth: 1678,
      Element: OverlayFixtureNode,
      MutationObserver: MockMutationObserver,
      window,
      setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
      clearTimeout(id) { timers.delete(id); },
    },
    contextStrip,
    diffsHost,
    diffShadowRoot,
    editor,
    environment,
    environmentAction,
    environmentHeader,
    environmentSection,
    floatingSidebar,
    floatingSidebarFooter: floatingSidebarControls.footer,
    floatingSidebarHelp: floatingSidebarControls.help,
    floatingSidebarMode: floatingSidebarControls.mode,
    floatingSidebarNewTask: floatingSidebarControls.newTask,
    floatingSidebarProfile: floatingSidebarControls.profile,
    floatingSidebarRow: floatingSidebarControls.row,
    floatingSidebarSearch: floatingSidebarControls.search,
    floatingSidebarSection: floatingSidebarControls.section,
    frames,
    radixEnvironment,
    radixEnvironmentAction,
    radixEnvironmentHeader,
    radixEnvironmentSection,
    radixSourcesAction,
    radixSourcesHeader,
    radixSourcesSection,
    sourcesAction,
    sourcesHeader,
    sourcesSection,
    activity,
    activityCommand,
    activityDetail,
    activityHeader,
    activityOutput,
    assistantMessage,
    assistantMessageAction,
    currentAssistantMessage,
    editedActions,
    editedCard,
    editedFileButton,
    editedFilePath,
    editedFileRow,
    editedFileStats,
    editedFiles,
    editedHeader,
    editedIcon,
    editedMore,
    editedReview,
    editedStats,
    editedTitle,
    editedUndo,
    changesClipHost,
    changesPill,
    changesShell,
    modernChangesClipHost,
    modernChangesPill,
    modernChangesShell,
    goalProgress,
    goalStep,
    goalMode,
    listeners,
    leftWorkspace,
    lookalike,
    nodes,
    nativeAttachShadow,
    observers,
    send,
    sidebar,
    sidebarFooter: sidebarControls.footer,
    sidebarHelp: sidebarControls.help,
    sidebarMode: sidebarControls.mode,
    sidebarNewTask: sidebarControls.newTask,
    sidebarProfile: sidebarControls.profile,
    sidebarRow: sidebarControls.row,
    sidebarSearch: sidebarControls.search,
    sidebarSection: sidebarControls.section,
    settingsContent,
    settingsNav,
    settingsSidebar,
    unrelatedSettingsContent,
    summaryPanel,
    streamingActivity,
    streamingActivityHeader,
    structuralEnvironment,
    structuralGitHost,
    structuralGitSignal,
    systemToast,
    systemToastAction,
    palette,
    paletteHeading,
    paletteItem,
    paletteScroll,
    turnMarker,
    turnRail,
    turnRow,
    userBubble,
    userMessageAction,
    timers,
    bodyMutation(record) { notifyBodyMutation(record); },
    attachDiffRoot() { return diffsHost.attachShadow({ mode: "open" }); },
    detachDiffHost() { diffsHost.isConnected = false; },
    flushFrames() {
      const queued = [...frames.values()];
      frames.clear();
      for (const callback of queued) callback();
    },
    flushShadowMutations() {
      const queued = shadowMutationCallbacks.splice(0);
      for (const callback of queued) callback();
    },
    get shadowMutationCount() { return shadowMutationCallbacks.length; },
    flushTimers() {
      const queued = [...timers.values()];
      timers.clear();
      for (const { callback } of queued) callback();
    },
    mountWorkspaceEvidence() {
      workspaceMutationRoot.isConnected = true;
      workspaceEvidence.isConnected = true;
      workspaceOuter.addQuery(workspaceEvidenceSelector, workspaceEvidence);
      workspace.addQuery(workspaceEvidenceSelector, workspaceEvidence);
      notifyBodyMutation({
        type: "childList",
        target: workspace,
        addedNodes: [workspaceMutationRoot],
        removedNodes: [],
      });
    },
    mountSystemToast() {
      systemToast.isConnected = true;
      systemToastAction.isConnected = true;
      systemToast.parentElement = body;
      documentQueries.set("body div, body section, body aside", [systemToast]);
      notifyBodyMutation({
        type: "childList",
        target: body,
        addedNodes: [systemToast],
        removedNodes: [],
      });
    },
    publishComposerPart() {
      composer.setAttribute("data-ds-part", "composer");
      documentQueries.set(composerSelector, [composer]);
      notifyBodyMutation({
        type: "attributes",
        target: composer,
        attributeName: "data-ds-part",
        addedNodes: [],
        removedNodes: [],
      });
    },
    removeFixedSidebar() {
      documentQueries.set(sidebarSelector, []);
      documentQueries.set(stableSidebarSelector, []);
      for (const node of fixedSidebarNodes) node.isConnected = false;
      sidebar.parentElement = null;
      notifyBodyMutation({ type: "childList", target: body, addedNodes: [], removedNodes: [sidebar] });
    },
    mountFloatingSidebar() {
      for (const node of floatingSidebarNodes) node.isConnected = true;
      floatingSidebar.parentElement = body;
      documentQueries.set(sidebarSelector, [floatingSidebar]);
      documentQueries.set(stableSidebarSelector, [floatingSidebar]);
      notifyBodyMutation({ type: "childList", target: body, addedNodes: [floatingSidebar], removedNodes: [] });
    },
    mountFloatingSidebarAlongsideFixed() {
      for (const node of floatingSidebarNodes) node.isConnected = true;
      floatingSidebar.parentElement = body;
      documentQueries.set(sidebarSelector, [sidebar, floatingSidebar]);
      documentQueries.set(stableSidebarSelector, [sidebar, floatingSidebar]);
      notifyBodyMutation({ type: "childList", target: body, addedNodes: [floatingSidebar], removedNodes: [] });
    },
    removeWorkspaceEvidence() {
      workspaceOuter.addQuery(workspaceEvidenceSelector, []);
      workspace.addQuery(workspaceEvidenceSelector, []);
      workspaceMutationRoot.isConnected = false;
      workspaceEvidence.isConnected = false;
      notifyBodyMutation({
        type: "childList",
        target: workspace,
        addedNodes: [],
        removedNodes: [workspaceMutationRoot],
      });
    },
    removeStructuralEnvironmentGitEvidence() {
      structuralEnvironment.addQuery(environmentGitSelector, []);
      structuralGitSignal.isConnected = false;
      structuralGitSignal.parentElement = null;
      notifyBodyMutation({
        type: "childList",
        target: structuralGitHost,
        addedNodes: [],
        removedNodes: [structuralGitSignal],
      });
    },
    window,
    workspace,
    workspaceEvidence,
    workspaceMutationRoot,
    workspaceOuter,
    workspaceToolbar,
  };
}

const registryKey = "__CODEX_INTERNET_ANGEL_EXTENSION_STATE__";
const activateOverlayFixture = (options, source = overlayScript) => {
  const activeFixture = makeOverlayFixture(options);
  vm.runInNewContext(
    source.replace("__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__", "true"),
    activeFixture.context,
  );
  return activeFixture;
};
const cleanupOverlayFixture = (activeFixture, source = overlayScript) => vm.runInNewContext(
  source.replace("__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__", "false"),
  activeFixture.context,
);

const fixture = activateOverlayFixture();
const component = (node) => node.getAttribute("data-angel-component");
assert.equal(component(fixture.composer), "composer");
assert.equal(fixture.diffShadowRoot.children.length, 1,
  "The shared extension must theme the source viewer Shadow DOM.");
assert.match(fixture.diffShadowRoot.children[0].textContent, /--diffs-bg/);
assert.equal(component(fixture.composerFooter), "composer-footer");
assert.equal(component(fixture.editor), "composer-input");
assert.equal(component(fixture.send), "composer-action");
assert.equal(component(fixture.contextStrip), "context-strip");
assert.equal(component(fixture.goalStep), "goal-step");
assert.equal(component(fixture.goalProgress), "goal-progress");
assert.equal(component(fixture.goalMode), "goal-mode-trigger");

const modernComposerFixture = makeOverlayFixture({ modernComposer: true });
assert.equal(modernComposerFixture.composer.className.includes("composer-surface-chrome"), false,
  "The modern-only fixture must not accidentally retain the legacy composer class.");
assert.equal(modernComposerFixture.composerFooter.className.includes("_footer_"), false,
  "The modern-only fixture must not accidentally retain the legacy footer class.");
vm.runInNewContext(
  overlayScript.replace("__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__", "true"),
  modernComposerFixture.context,
);
assert.equal(component(modernComposerFixture.composer), "composer",
  "Codex 26.730 data-composer-surface-variant must enter the Internet Angel lifecycle.");
assert.equal(component(modernComposerFixture.composerFooter), "composer-footer",
  "Codex 26.730 data-composer-footer-responsive must avoid a native footer paint.");
assert.equal(component(modernComposerFixture.editor), "composer-input");
assert.equal(component(modernComposerFixture.send), "composer-action");
assert.equal(component(modernComposerFixture.goalMode), "goal-mode-trigger");

const publicComposerFixture = activateOverlayFixture({ publicComposerOnly: true });
assert.equal(
  component(publicComposerFixture.composer),
  "composer",
  "A validated generic composer exposed by the shared renderer must receive Angel styling.",
);

const delayedPublicComposer = activateOverlayFixture({ delayedPublicComposer: true });
assert.equal(component(delayedPublicComposer.composer), null);
delayedPublicComposer.publishComposerPart();
delayedPublicComposer.flushFrames();
assert.equal(
  component(delayedPublicComposer.composer),
  "composer",
  "The extension must react when the renderer publishes a generic composer part after mount.",
);

const publicSidebarFixture = activateOverlayFixture({ publicSidebarOnly: true });
assert.equal(publicSidebarFixture.sidebar.className.includes("app-shell-left-panel"), false);
assert.equal(
  component(publicSidebarFixture.sidebar),
  "sidebar",
  "A generic sidebar exposed through the public renderer part must stay isolated.",
);

const lateDiffFixture = activateOverlayFixture({ delayedDiffRoot: true }, runtimeOverlayScript);
assert.equal(lateDiffFixture.diffShadowRoot.children.length, 0);
for (let attempt = 0; attempt < 20 && lateDiffFixture.timers.size; attempt += 1) {
  lateDiffFixture.flushTimers();
}
assert.equal(lateDiffFixture.timers.size, 0, "The bounded legacy Shadow retry window must be exhausted.");
lateDiffFixture.attachDiffRoot();
assert.equal(
  lateDiffFixture.diffShadowRoot.children.length,
  1,
  "A diffs-container attaching Shadow DOM after the retry window must receive the shared style.",
);
lateDiffFixture.diffShadowRoot.replaceChildren();
lateDiffFixture.flushShadowMutations();
assert.equal(
  lateDiffFixture.diffShadowRoot.children.length,
  1,
  "Replacing a live diff root must restore its renderer-owned stylesheet.",
);
lateDiffFixture.flushShadowMutations();
assert.equal(lateDiffFixture.shadowMutationCount, 0, "Style restoration must settle without a loop.");
assert.notEqual(lateDiffFixture.context.Element.prototype.attachShadow, lateDiffFixture.nativeAttachShadow);
cleanupOverlayFixture(lateDiffFixture, runtimeOverlayScript);
assert.equal(
  lateDiffFixture.context.Element.prototype.attachShadow,
  lateDiffFixture.nativeAttachShadow,
  "Theme cleanup must restore the attachShadow implementation it wrapped.",
);
lateDiffFixture.diffShadowRoot.replaceChildren();
lateDiffFixture.flushShadowMutations();
assert.equal(
  lateDiffFixture.diffShadowRoot.children.length,
  0,
  "A cleaned-up Shadow observer must not recreate theme styles.",
);

const replacedDiffFixture = activateOverlayFixture({}, runtimeOverlayScript);
const replacedState = replacedDiffFixture.context.window[registryKey];
const replacedRootObserver = replacedDiffFixture.observers.find(
  (observer) => observer.target === replacedDiffFixture.diffShadowRoot,
);
assert.ok(replacedRootObserver, "The active diff root must have a lifecycle observer.");
vm.runInNewContext(
  runtimeOverlayScript.replace("__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__", "true"),
  replacedDiffFixture.context,
);
assert.notEqual(replacedDiffFixture.context.window[registryKey], replacedState);
assert.equal(replacedRootObserver.disconnected, true, "Replacement must disconnect the old root observer.");
assert.equal(replacedDiffFixture.diffShadowRoot.children.length, 1, "Replacement must keep one current style.");
cleanupOverlayFixture(replacedDiffFixture, runtimeOverlayScript);
assert.equal(replacedDiffFixture.context.Element.prototype.attachShadow, replacedDiffFixture.nativeAttachShadow);
assert.equal(replacedDiffFixture.diffShadowRoot.children.length, 0);

const detachedDiffFixture = activateOverlayFixture();
detachedDiffFixture.detachDiffHost();
detachedDiffFixture.window[registryKey].refresh();
assert.equal(
  detachedDiffFixture.diffShadowRoot.children.length,
  0,
  "A detached diff host must not retain a renderer-owned stylesheet.",
);
cleanupOverlayFixture(detachedDiffFixture);
detachedDiffFixture.diffsHost.isConnected = true;
assert.equal(detachedDiffFixture.diffShadowRoot.children.length, 0);
assert.equal(component(fixture.environment), "environment");
assert.equal(component(fixture.environmentSection), "environment-section");
assert.equal(component(fixture.environmentHeader), "environment-header");
assert.equal(component(fixture.environmentAction), "environment-action");
assert.equal(component(fixture.sourcesSection), "environment-section");
assert.equal(component(fixture.sourcesHeader), "environment-header");
assert.equal(component(fixture.sourcesAction), "environment-action");
assert.equal(component(fixture.radixEnvironment), "environment");
assert.equal(component(fixture.radixEnvironmentSection), "environment-section");
assert.equal(component(fixture.radixEnvironmentHeader), "environment-header");
assert.equal(component(fixture.radixEnvironmentAction), "environment-action");
assert.equal(component(fixture.radixSourcesSection), "environment-section");
assert.equal(component(fixture.radixSourcesHeader), "environment-header");
assert.equal(component(fixture.radixSourcesAction), "environment-action");
assert.equal(component(fixture.changesShell), "changes-shell");
assert.equal(component(fixture.changesClipHost), "changes-clip-host");
assert.equal(component(fixture.changesPill), "changes-pill");
assert.equal(component(fixture.modernChangesShell), "changes-shell");
assert.equal(component(fixture.modernChangesClipHost), "changes-clip-host");
assert.equal(
  component(fixture.modernChangesPill),
  "changes-pill",
  "Codex 26.820 change summaries must retain the existing changes component skin.",
);
assert.equal(
  component(fixture.workspace),
  "side-workspace",
  "The full-height right workspace must win over its compact toolbar descendants.",
);
assert.equal(
  component(fixture.workspaceOuter),
  null,
  "Only the innermost right-docked workspace surface may be themed.",
);
assert.equal(component(fixture.workspaceToolbar), null);
assert.equal(
  component(fixture.leftWorkspace),
  null,
  "A workspace-like surface inside the left sidebar must stay unmarked.",
);
assert.equal(component(fixture.sidebar), "sidebar");
assert.equal(component(fixture.sidebarMode), "sidebar-control");
assert.equal(component(fixture.sidebarSearch), "sidebar-control");
assert.equal(component(fixture.sidebarNewTask), "sidebar-new-task");
assert.equal(component(fixture.sidebarSection), "sidebar-section");
assert.equal(component(fixture.sidebarRow), "sidebar-row");
assert.equal(component(fixture.sidebarFooter), "sidebar-footer");
assert.equal(component(fixture.sidebarProfile), "sidebar-profile");
assert.equal(component(fixture.sidebarHelp), "sidebar-help");
assert.equal(component(fixture.settingsSidebar), "settings-sidebar");
assert.equal(component(fixture.settingsNav), "settings-nav");
assert.equal(component(fixture.settingsContent), "settings-content");
assert.equal(
  component(fixture.unrelatedSettingsContent),
  null,
  "Settings classification must stay inside the layout that owns the settings navigation.",
);
fixture.removeFixedSidebar();
fixture.flushFrames();
assert.equal(
  fixture.context.document.querySelector('aside.app-shell-left-panel, [data-testid="app-shell-floating-left-panel"]'),
  null,
  "The classifier must tolerate the empty interval after the fixed sidebar is removed.",
);
assert.equal(component(fixture.floatingSidebar), null, "The floating sidebar must not exist before its portal mounts.");
fixture.mountFloatingSidebar();
fixture.flushFrames();
assert.equal(component(fixture.floatingSidebar), "sidebar");
assert.equal(component(fixture.floatingSidebarMode), "sidebar-control");
assert.equal(component(fixture.floatingSidebarSearch), "sidebar-control");
assert.equal(component(fixture.floatingSidebarNewTask), "sidebar-new-task");
assert.equal(component(fixture.floatingSidebarSection), "sidebar-section");
assert.equal(component(fixture.floatingSidebarRow), "sidebar-row");
assert.equal(component(fixture.floatingSidebarFooter), "sidebar-footer");
assert.equal(component(fixture.floatingSidebarProfile), "sidebar-profile");
assert.equal(component(fixture.floatingSidebarHelp), "sidebar-help");

const overlappingSidebars = makeOverlayFixture();
vm.runInNewContext(
  overlayScript.replace("__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__", "true"),
  overlappingSidebars.context,
);
overlappingSidebars.mountFloatingSidebarAlongsideFixed();
overlappingSidebars.flushFrames();
assert.equal(component(overlappingSidebars.floatingSidebar), "sidebar",
  "The floating portal must be classified when the fixed sidebar still exists during transition");
assert.equal(component(fixture.palette), "composer-palette");
assert.equal(component(fixture.paletteScroll), "composer-palette-scroll");
assert.equal(component(fixture.paletteHeading), "composer-palette-heading");
assert.equal(component(fixture.paletteItem), "composer-palette-item");
assert.equal(component(fixture.turnRail), "turn-nav-rail");
assert.equal(component(fixture.turnRow), "turn-nav-row");
assert.equal(component(fixture.turnMarker), "turn-nav-marker-active");
assert.equal(component(fixture.summaryPanel), "summary-panel");
assert.equal(component(fixture.userBubble), "message-user");
assert.equal(component(fixture.assistantMessage), "message-assistant");
assert.equal(
  component(fixture.currentAssistantMessage),
  "message-assistant",
  "Current Codex assistant Markdown must not inherit the native dark-shell foreground in Light mode.",
);
assert.equal(component(fixture.userMessageAction), "message-action");
assert.equal(component(fixture.assistantMessageAction), "message-action");
assert.equal(component(fixture.activity), "activity");
assert.equal(component(fixture.activityHeader), "activity-header");
assert.equal(component(fixture.activityDetail), "activity-detail");
assert.equal(component(fixture.activityCommand), "activity-command");
assert.equal(component(fixture.activityOutput), "activity-output");
assert.equal(component(fixture.streamingActivity), "activity");
assert.equal(component(fixture.streamingActivityHeader), "activity-header");
assert.equal(component(fixture.editedCard), "edited-card");
assert.equal(component(fixture.editedHeader), "edited-card-header");
assert.equal(component(fixture.editedIcon), "edited-card-icon");
assert.equal(component(fixture.editedTitle), "edited-card-title");
assert.equal(component(fixture.editedStats), "edited-card-stats");
assert.equal(component(fixture.editedActions), "edited-card-actions");
assert.equal(component(fixture.editedUndo), "edited-card-undo");
assert.equal(component(fixture.editedReview), "edited-card-review");
assert.equal(component(fixture.editedFiles), "edited-card-files");
assert.equal(component(fixture.editedFileButton), "edited-card-file-row");
assert.equal(component(fixture.editedFilePath), "edited-card-file-path");
assert.equal(component(fixture.editedFileStats), "edited-card-file-stats");
assert.equal(component(fixture.editedMore), "edited-card-more");
assert.equal(component(fixture.lookalike), null, "An incomplete Environment lookalike must stay native.");
const bodyObservers = fixture.observers.filter(
  (observer) => observer.target === fixture.context.document.body,
);
assert.equal(bodyObservers.length, 1, "Only one observer may watch the document body.");
assert.equal(
  JSON.stringify(bodyObservers[0].options),
  JSON.stringify({
    attributes: true,
    attributeFilter: ["data-ds-part"],
    childList: true,
    subtree: true,
  }),
  "The body observer must limit attribute work to the renderer's public part contract.",
);
assert.equal(typeof fixture.listeners.get("click"), "function");
assert.equal(typeof fixture.listeners.get("resize"), "function");
assert.notEqual(
  fixture.listeners.get("resize"),
  fixture.listeners.get("click"),
  "Window resize must not share the mutation debounce that can retain stale portal coordinates.",
);
assert.equal(fixture.listeners.has("transitionend"), false);
assert.equal(typeof fixture.listeners.get("compositionstart"), "function");
assert.equal(typeof fixture.listeners.get("compositionend"), "function");

const delayedWorkspace = activateOverlayFixture({ delayedWorkspaceEvidence: true });
const delayedMetrics = delayedWorkspace.window[registryKey].metrics;
assert.equal(component(delayedWorkspace.workspace), null, "An empty workspace shell must stay unmarked.");
delayedWorkspace.listeners.get("click")({ target: { closest: () => ({}) } });
assert.equal(delayedWorkspace.timers.size, 1, "A click keeps the 120 ms navigation fallback.");
assert.equal([...delayedWorkspace.timers.values()][0].delay, 120);
delayedWorkspace.flushTimers();
assert.equal(component(delayedWorkspace.workspace), null);
assert.equal(delayedMetrics.classifyRuns, 2);
delayedWorkspace.mountWorkspaceEvidence();
assert.equal(component(delayedWorkspace.workspace), null, "Deep evidence must wait for the next frame.");
assert.equal(delayedWorkspace.frames.size, 1);
delayedWorkspace.flushFrames();
assert.equal(component(delayedWorkspace.workspace), "side-workspace");
assert.equal(delayedMetrics.classifyRuns, 3);
delayedWorkspace.removeWorkspaceEvidence();
assert.equal(component(delayedWorkspace.workspace), "side-workspace", "Removal reconciles on the frame boundary.");
delayedWorkspace.flushFrames();
assert.equal(component(delayedWorkspace.workspace), null);

const dynamicSystemToast = activateOverlayFixture();
const dynamicSystemToastMetrics = dynamicSystemToast.window[registryKey].metrics;
assert.equal(component(dynamicSystemToast.systemToast), null);
dynamicSystemToast.mountSystemToast();
assert.equal(
  dynamicSystemToast.frames.size,
  1,
  "A Sonner toast mount must schedule without a click or navigation fallback.",
);
assert.equal(component(dynamicSystemToast.systemToast), null);
dynamicSystemToast.flushFrames();
assert.equal(component(dynamicSystemToast.systemToast), "system-toast");
assert.equal(dynamicSystemToastMetrics.classifyRuns, 2);

const dynamicModernChanges = activateOverlayFixture();
dynamicModernChanges.bodyMutation({
  type: "childList",
  target: dynamicModernChanges.context.document.body,
  addedNodes: [dynamicModernChanges.modernChangesPill],
  removedNodes: [],
});
assert.equal(
  dynamicModernChanges.frames.size,
  1,
  "A Codex 26.820 change summary mount must schedule classification without a click fallback.",
);
dynamicModernChanges.flushFrames();

const detachedEnvironmentEvidence = activateOverlayFixture();
assert.equal(
  component(detachedEnvironmentEvidence.structuralEnvironment),
  "environment",
  "Codex 26.818 elevated Environment surfaces must retain the existing semantic classifier.",
);
assert.equal(component(detachedEnvironmentEvidence.structuralGitHost), null);
assert.equal(component(detachedEnvironmentEvidence.structuralGitSignal), null);
detachedEnvironmentEvidence.removeStructuralEnvironmentGitEvidence();
assert.equal(
  detachedEnvironmentEvidence.frames.size,
  1,
  "Detached Git evidence must schedule without consulting the mutation target.",
);
assert.equal(component(detachedEnvironmentEvidence.structuralEnvironment), "environment");
detachedEnvironmentEvidence.flushFrames();
assert.equal(component(detachedEnvironmentEvidence.structuralEnvironment), null);

const coalescedMutations = activateOverlayFixture({ delayedWorkspaceEvidence: true });
const coalescedMetrics = coalescedMutations.window[registryKey].metrics;
coalescedMutations.mountWorkspaceEvidence();
coalescedMutations.bodyMutation({
  type: "childList",
  target: coalescedMutations.workspace,
  addedNodes: [coalescedMutations.workspaceEvidence],
  removedNodes: [],
});
assert.equal(coalescedMutations.frames.size, 1, "Relevant mutations in one frame must coalesce.");
coalescedMutations.flushFrames();
assert.equal(coalescedMetrics.classifyRuns, 2, "A coalesced frame runs classify exactly once.");

const ignoredMutations = activateOverlayFixture({ delayedWorkspaceEvidence: true });
const ignoredMetrics = ignoredMutations.window[registryKey].metrics;
const ordinaryMessageChild = new FixtureNode({ className: "whitespace-pre-wrap" });
ordinaryMessageChild.parentElement = ignoredMutations.assistantMessage;
ignoredMutations.bodyMutation({
  type: "childList",
  target: ignoredMutations.context.document.body,
  addedNodes: [{ nodeType: 3, textContent: "streaming text" }],
  removedNodes: [],
});
ignoredMutations.bodyMutation({
  type: "childList",
  target: ignoredMutations.assistantMessage,
  addedNodes: [ordinaryMessageChild],
  removedNodes: [],
});
assert.equal(ignoredMutations.frames.size, 0, "Text and ordinary message content must not request a frame.");
assert.equal(ignoredMutations.timers.size, 0, "Text and ordinary message content must not request a timer.");
assert.equal(ignoredMetrics.classifyRuns, 1);

const currentAssistantMount = activateOverlayFixture({ delayedWorkspaceEvidence: true });
const mountedAssistantMessage = new FixtureNode({ matches: [assistantMarkdownSelector] });
currentAssistantMount.bodyMutation({
  type: "childList",
  target: currentAssistantMount.context.document.body,
  addedNodes: [mountedAssistantMessage],
  removedNodes: [],
});
assert.equal(
  currentAssistantMount.frames.size,
  1,
  "Mounting current assistant Markdown must schedule classification without observing streamed text.",
);

const frameBeatsTimer = activateOverlayFixture({ delayedWorkspaceEvidence: true });
const frameBeatsTimerMetrics = frameBeatsTimer.window[registryKey].metrics;
frameBeatsTimer.listeners.get("click")({ target: { closest: () => ({}) } });
assert.equal(frameBeatsTimer.timers.size, 1);
frameBeatsTimer.mountWorkspaceEvidence();
assert.equal(frameBeatsTimer.timers.size, 0, "A relevant frame refresh must cancel the slower click timer.");
assert.equal(frameBeatsTimer.frames.size, 1);
frameBeatsTimer.flushFrames();
assert.equal(frameBeatsTimerMetrics.classifyRuns, 2);
frameBeatsTimer.flushTimers();
assert.equal(frameBeatsTimerMetrics.classifyRuns, 2, "The cancelled timer must not classify again.");

const composing = activateOverlayFixture({ delayedWorkspaceEvidence: true });
composing.listeners.get("compositionstart")();
composing.mountWorkspaceEvidence();
assert.equal(composing.frames.size, 0, "Mutations during composition must not schedule a frame.");
assert.equal(composing.timers.size, 0);
composing.listeners.get("compositionend")();
assert.equal(composing.frames.size, 1, "compositionend must schedule exactly one frame.");
composing.flushFrames();
assert.equal(component(composing.workspace), "side-workspace");

const timerOnlyComposition = activateOverlayFixture({ delayedWorkspaceEvidence: true });
const timerOnlyCompositionMetrics = timerOnlyComposition.window[registryKey].metrics;
timerOnlyComposition.listeners.get("click")({ target: { closest: () => ({}) } });
assert.equal(timerOnlyComposition.timers.size, 1);
assert.equal([...timerOnlyComposition.timers.values()][0].delay, 120);
timerOnlyComposition.listeners.get("compositionstart")();
assert.equal(timerOnlyComposition.timers.size, 0, "compositionstart must cancel a pending timer.");
assert.equal(timerOnlyComposition.frames.size, 0);
timerOnlyComposition.listeners.get("compositionend")();
assert.equal(timerOnlyComposition.frames.size, 1, "The cancelled timer must defer exactly one frame.");
assert.equal(timerOnlyCompositionMetrics.classifyRuns, 1);
timerOnlyComposition.flushFrames();
assert.equal(timerOnlyCompositionMetrics.classifyRuns, 2);
assert.equal(timerOnlyComposition.frames.size, 0);

const compositionCancelsFrame = activateOverlayFixture({ delayedWorkspaceEvidence: true });
compositionCancelsFrame.mountWorkspaceEvidence();
assert.equal(compositionCancelsFrame.frames.size, 1);
compositionCancelsFrame.listeners.get("compositionstart")();
assert.equal(compositionCancelsFrame.frames.size, 0, "compositionstart must cancel a pending frame.");
compositionCancelsFrame.listeners.get("compositionend")();
assert.equal(compositionCancelsFrame.frames.size, 1);
compositionCancelsFrame.flushFrames();
assert.equal(component(compositionCancelsFrame.workspace), "side-workspace");

const dividerDrag = activateOverlayFixture();
dividerDrag.workspaceOuter.rect = { left: 1438, top: 28, width: 240, height: 840 };
dividerDrag.workspace.rect = { left: 1458, top: 48, width: 220, height: 820 };
dividerDrag.listeners.get("resize")();
dividerDrag.flushFrames();
assert.equal(
  component(dividerDrag.workspace),
  "side-workspace",
  "A right-aside workspace must stay themed below the legacy 260px threshold.",
);

dividerDrag.workspaceOuter.rect = { left: 678, top: 28, width: 1000, height: 840 };
dividerDrag.workspace.rect = { left: 698, top: 48, width: 980, height: 820 };
dividerDrag.listeners.get("resize")();
dividerDrag.flushFrames();
assert.equal(
  component(dividerDrag.workspace),
  "side-workspace",
  "A right-aside workspace must stay themed left of the legacy 45% threshold.",
);
assert.equal(component(dividerDrag.workspaceOuter), null);
assert.equal(component(dividerDrag.leftWorkspace), null);

const resized = activateOverlayFixture();
const resizedMetrics = resized.window[registryKey].metrics;
resized.listeners.get("resize")();
resized.listeners.get("resize")();
assert.equal(resized.frames.size, 1, "Resize refreshes must share the frame scheduler.");
resized.flushFrames();
assert.equal(resizedMetrics.classifyRuns, 2);

const assertCleaned = (activeFixture) => {
  assert.equal(activeFixture.frames.size, 0);
  assert.equal(activeFixture.timers.size, 0);
  assert.ok(activeFixture.observers.every((observer) => observer.disconnected === true));
  assert.equal(activeFixture.listeners.size, 0);
  assert.equal(activeFixture.diffShadowRoot.children.length, 0,
    "Theme switch cleanup must remove Shadow DOM diff styles.");
  assert.equal(
    activeFixture.nodes.some((node) => node.isConnected && component(node)),
    false,
    "Theme switch cleanup must remove marks from the connected document.",
  );
};
const cleanupFrame = activateOverlayFixture();
cleanupFrame.bodyMutation({
  type: "childList",
  target: cleanupFrame.workspace,
  addedNodes: [cleanupFrame.workspaceEvidence],
  removedNodes: [],
});
assert.equal(cleanupFrame.frames.size, 1);
cleanupOverlayFixture(cleanupFrame);
assertCleaned(cleanupFrame);

const cleanupTimer = activateOverlayFixture();
cleanupTimer.listeners.get("click")({ target: { closest: () => ({}) } });
assert.equal(cleanupTimer.timers.size, 1);
cleanupOverlayFixture(cleanupTimer);
assertCleaned(cleanupTimer);

cleanupOverlayFixture(fixture);
assert.equal(
  fixture.nodes.some((node) => node.isConnected && component(node)),
  false,
  "Theme switch cleanup must remove marks from the connected document.",
);
assert.ok(fixture.observers.every((observer) => observer.disconnected === true));
assert.equal(fixture.timers.size, 0);
assert.equal(fixture.listeners.has("click"), false);
assert.equal(fixture.listeners.has("resize"), false);
assert.equal(fixture.listeners.has("transitionend"), false);
assert.equal(fixture.listeners.has("compositionstart"), false);
assert.equal(fixture.listeners.has("compositionend"), false);

console.log("PASS: Internet Angel macOS overlay activation is exact and isolated.");
