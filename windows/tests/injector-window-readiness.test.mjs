import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { SKIN_VERSION, verifySession } from "../scripts/injector.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const startPath = path.resolve(here, "../scripts/start-dream-skin.ps1");
const expectedVersion = (await fs.readFile(path.resolve(here, "../VERSION"), "utf8")).trim();
test("exported injector version matches VERSION", () => {
  assert.equal(SKIN_VERSION, expectedVersion);
});
const win32WindowEvidence = {
  source: "win32-hwnd",
  processId: 4120,
  hwnd: "918273645",
  width: 1280,
  height: 800,
};

const selectors = {
  shell: 'main:is(.main-surface, [data-app-shell-main-surface], [class*="_MainContentSurface_"])',
  sidebar: "aside.app-shell-left-panel",
  header: 'header:is(.app-header-tint, [data-app-shell-header-edge-scroll], [data-app-shell-application-menu-bar], [class*="_Header_"])',
  composer: ':is(.composer-surface-chrome, [class*="_ComposerLayoutRoot_"], [data-composer-surface-variant][data-composer-radius-variant])',
  homeIcon: '[data-testid="home-icon"]',
  home: '[role="main"]:has([data-testid="home-icon"])',
  settings: '[data-settings-panel-slug="general-settings"]',
  legacySettings: 'input[name="appearance-theme"]',
  gameSource: '[data-feature="game-source"]',
  suggestions: ".group\\/home-suggestions",
  themePreview: '[data-testid="theme-preview"]',
};

function makeRect(width = 800, height = 600, x = 0, y = 0) {
  return { x, y, width, height, right: x + width, bottom: y + height };
}

function makeElement({
  rect = makeRect(),
  style = {},
  visible = true,
  text = "",
  children = [],
} = {}) {
  const element = {
    isConnected: true,
    textContent: text,
    _style: {
      display: "block",
      visibility: "visible",
      contentVisibility: "visible",
      opacity: "1",
      color: "rgb(240, 240, 240)",
      ...style,
    },
    childNodes: text ? [{ nodeType: 3, textContent: text }] : [],
    children,
    getBoundingClientRect: () => rect,
    checkVisibility: () => visible,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  return element;
}

function makeSuggestionButton({
  rect = makeRect(220, 80, 40, 300),
  color = "rgb(210, 210, 210)",
  labelColor = color,
  text = "Suggestion",
} = {}) {
  const label = makeElement({
    rect: makeRect(180, 24, rect.x + 12, rect.y + 12),
    style: { color: labelColor },
    text,
  });
  return {
    ...makeElement({ rect, style: { color } }),
    getBoundingClientRect: () => rect,
    querySelectorAll: () => [label],
  };
}

function makeHome(options = {}) {
  const home = makeElement(options);
  const hero = makeElement(options.hero ?? {});
  home.firstElementChild = { firstElementChild: { firstElementChild: hero } };
  const rawSuggestions = options.suggestions ?? null;
  const suggestions = rawSuggestions
    ? Object.assign(makeElement({ rect: makeRect(760, 140, 90, 270) }), rawSuggestions)
    : null;
  const isSuggestionSelector = (selector) => selector === selectors.suggestions ||
    selector.includes("home-suggestion") || selector.includes("dream-native-suggestions-root");
  home.querySelector = (selector) => isSuggestionSelector(selector) ? suggestions : null;
  home.querySelectorAll = (selector) => isSuggestionSelector(selector) && suggestions ? [suggestions] : [];
  return home;
}

function makeDomFixture({
  scope = { level: "L1", baseState: "thread", missingL1: [] },
  shell = makeElement(),
  sidebar = makeElement(),
  header = makeElement(),
  composer = makeElement(),
  home = null,
  homeSignal = null,
  genericMain = null,
  genericInput = null,
  settings = null,
  visibilityState = "visible",
  hidden = false,
  viewportWidth = 1280,
  viewportHeight = 800,
  scrollWidth = viewportWidth,
  scrollHeight = viewportHeight,
  forkClassNodes = [],
} = {}) {
  let homeSignals = Array.isArray(homeSignal)
    ? homeSignal.filter(Boolean)
    : [homeSignal].filter(Boolean);
  if (!homeSignals.length && home) {
    homeSignals = [{
      ...makeElement({ rect: makeRect(36, 36, 60, 60) }),
      closest: (selector) => selector === '[role="main"]' ? home : null,
    }];
  }
  const styleNode = {};
  const documentElement = {
    scrollWidth,
    clientWidth: viewportWidth,
    scrollHeight,
    clientHeight: viewportHeight,
    getAttribute: (name) => name === "data-dream-skin" ? "active" : null,
  };
  const document = {
    documentElement,
    adoptedStyleSheets: [],
    visibilityState,
    hidden,
    querySelector(selector) {
      if (selector === selectors.shell) return shell;
      if (selector === selectors.sidebar) return sidebar;
      if (selector === selectors.header) return header;
      if (selector === selectors.composer) return composer;
      if (selector === selectors.homeIcon) return null;
      if (selector === selectors.home) return home;
      if (selector === selectors.gameSource || selector === selectors.suggestions) {
        return homeSignals[0] ?? null;
      }
      if (selector === '[data-ds-part="main"], [data-ds-part="home"]') return genericMain ?? home;
      if (selector === '[data-ds-part="composer"]') return genericInput;
      if (selector === selectors.settings || selector === selectors.legacySettings ||
        selector === selectors.themePreview) return settings;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[class]") return forkClassNodes;
      if (selector === selectors.shell) return shell ? [shell] : [];
      if (selector === selectors.sidebar) return sidebar ? [sidebar] : [];
      if (selector === selectors.header) return header ? [header] : [];
      if (selector === selectors.composer) return composer ? [composer] : [];
      if (selector === selectors.home) return home ? [home] : [];
      if (selector === '[data-ds-part="main"], [data-ds-part="home"]') {
        return genericMain ? [genericMain] : [];
      }
      if (selector === '[data-ds-part="composer"]') return genericInput ? [genericInput] : [];
      if (selector === selectors.homeIcon || selector === selectors.gameSource ||
        selector === selectors.suggestions || selector.includes("home-suggestion")) {
        return homeSignals;
      }
      return [];
    },
    getElementById: (id) => id === "codex-dream-skin-style" ? styleNode : null,
  };
  const window = {
    __CODEX_DREAM_SKIN_STATE__: {
      version: expectedVersion,
      themeId: "fixture-theme",
      revision: "fixture-revision",
      styleMode: "style",
      styleNode,
      scope,
    },
  };
  return {
    document,
    window,
    innerWidth: viewportWidth,
    innerHeight: viewportHeight,
    getComputedStyle: (node) => node?._style ?? {},
  };
}

function makeSession({
  dom = makeDomFixture(),
  bindingError = null,
  windowId = 41,
  bindingBounds = { width: 1280, height: 800, windowState: "normal" },
  currentBounds = null,
  boundsError = null,
} = {}) {
  const calls = [];
  return {
    calls,
    async send(method, params) {
      calls.push({ method, params });
      if (method === "Browser.getWindowForTarget") {
        if (bindingError) throw bindingError;
        return { windowId, bounds: bindingBounds };
      }
      if (method === "Browser.getWindowBounds") {
        if (boundsError) throw boundsError;
        return { bounds: currentBounds ?? bindingBounds };
      }
      throw new Error(`Unexpected CDP method: ${method}`);
    },
    async evaluate(expression) {
      return vm.runInNewContext(expression, dom);
    },
  };
}

async function verify(overrides = {}, nativeFallback = null, allowHiddenDocument = false) {
  const session = makeSession(overrides);
  const result = await verifySession(
    session,
    "page-main",
    "fixture-theme",
    "fixture-revision",
    nativeFallback,
    allowHiddenDocument,
  );
  return { result, session };
}

test("normal L1 renderer requires and records the exact target window binding", async () => {
  const { result, session } = await verify();
  assert.equal(result.pass, true);
  assert.deepEqual({ ...result.readiness }, {
    windowPass: true,
    documentPass: true,
    viewportPass: true,
    structurePass: true,
    nativeWindowPass: true,
    fallbackWindowPass: false,
    hiddenDocumentAllowed: false,
    hiddenDocumentPass: false,
    effectiveDocumentPass: true,
  });
  assert.deepEqual(session.calls, [
    { method: "Browser.getWindowForTarget", params: { targetId: "page-main" } },
    { method: "Browser.getWindowBounds", params: { windowId: 41 } },
  ]);
});

test("collapsed-sidebar L1 renderer accepts the native header and composer pair", async () => {
  const collapsed = await verify({
    dom: makeDomFixture({ sidebar: null }),
  });
  assert.equal(collapsed.result.pass, true);
  assert.equal(collapsed.result.readiness.structurePass, true);

  const missingComposer = await verify({
    dom: makeDomFixture({ sidebar: null, composer: null }),
  });
  assert.equal(missingComposer.result.pass, false);
  assert.equal(missingComposer.result.readiness.structurePass, false);
});

test("fork-owned dream classes do not invalidate renderer readiness", async () => {
  const forkMarker = { classList: ["dream-home", "dream-presets-ready"] };
  const verified = await verify({
    dom: makeDomFixture({ forkClassNodes: [forkMarker] }),
  });
  assert.equal(verified.result.businessClassPollution, 1);
  assert.equal(verified.result.pass, true);
});

test("visible settings and home anchors are the only L0 structure exceptions", async () => {
  const settings = await verify({
    dom: makeDomFixture({
      scope: { level: "L0", baseState: "settings" },
      shell: null,
      sidebar: null,
      settings: makeElement({ rect: makeRect(480, 320, 80, 60) }),
    }),
  });
  assert.equal(settings.result.pass, true);

  const home = await verify({
    dom: makeDomFixture({
      scope: {
        level: "L0",
        baseState: "home",
        missingL1: ["left-panel"],
      },
      shell: null,
      sidebar: null,
      home: makeHome({ rect: makeRect(900, 650, 20, 20) }),
    }),
  });
  assert.equal(home.result.pass, true);
  assert.equal(home.result.readiness.structurePass, true);

  const fallbackHome = makeHome({ rect: makeRect(900, 650, 20, 20) });
  const lateHomeIconSignal = {
    ...makeElement({ rect: makeRect(36, 36, 80, 70) }),
    closest: (selector) => selector === '[role="main"]' ? fallbackHome : null,
  };
  const lateHomeIcon = await verify({
    dom: makeDomFixture({
      scope: { level: "L0", baseState: "home" },
      shell: null,
      sidebar: null,
      home: null,
      homeSignal: lateHomeIconSignal,
    }),
  });
  assert.equal(lateHomeIcon.result.homePresent, true);
  assert.equal(lateHomeIcon.result.pass, true);
  assert.equal(lateHomeIcon.result.readiness.structurePass, true);

  const noAnchor = await verify({
    dom: makeDomFixture({
      scope: { level: "L0", baseState: "settings" },
      shell: null,
      sidebar: null,
    }),
  });
  assert.equal(noAnchor.result.pass, false);
  assert.equal(noAnchor.result.readiness.structurePass, false);

  const generic = await verify({
    dom: makeDomFixture({
      shell: null,
      sidebar: null,
      home: null,
      genericMain: makeElement({ rect: makeRect(900, 650, 20, 20) }),
      genericInput: makeElement({ rect: makeRect(620, 80, 180, 620) }),
    }),
  });
  assert.equal(generic.result.pass, true);
  assert.equal(generic.result.readiness.structurePass, true);

  const genericL0 = await verify({
    dom: makeDomFixture({
      scope: {
        level: "L0",
        baseState: "thread",
        missingL1: ["shell-main", "left-panel", "header-tint"],
      },
      shell: null,
      sidebar: null,
      home: null,
      genericMain: makeElement({ rect: makeRect(900, 650, 20, 20) }),
      genericInput: makeElement({ rect: makeRect(620, 80, 180, 620) }),
    }),
  });
  assert.equal(genericL0.result.pass, false,
    "Generic app parts must not turn an L0 thread with missing shell/header anchors into visible success.");
  assert.equal(genericL0.result.readiness.structurePass, false);

  const falseHome = await verify({
    dom: makeDomFixture({
      scope: { level: "L1", baseState: "home", missingL1: [] },
      home: null,
      homeSignal: null,
      genericMain: makeElement({ rect: makeRect(900, 650, 20, 20) }),
      genericInput: makeElement({ rect: makeRect(620, 80, 180, 620) }),
    }),
  });
  assert.equal(falseHome.result.homePresent, false);
  assert.equal(falseHome.result.pass, false,
    "A renderer that claims Home must expose a real Home identity signal.");
});

test("home verification skips stale hidden signals and scans every current candidate", async () => {
  const staleHome = makeHome({ rect: makeRect(900, 650, 20, 20) });
  const currentHome = makeHome({ rect: makeRect(920, 660, 30, 25) });
  const hiddenSignal = {
    ...makeElement({
      rect: makeRect(0, 0, -100, -100),
      style: { display: "none" },
      visible: false,
    }),
    closest: (selector) => selector === '[role="main"]' ? staleHome : null,
  };
  const visibleSignal = {
    ...makeElement({ rect: makeRect(240, 84, 80, 260) }),
    closest: (selector) => selector === '[role="main"]' ? currentHome : null,
  };

  const hiddenOnly = await verify({
    dom: makeDomFixture({
      scope: { level: "L1", baseState: "home", missingL1: [] },
      home: null,
      homeSignal: [hiddenSignal],
    }),
  });
  assert.equal(hiddenOnly.result.homePresent, false,
    "A stale hidden Home signal must not satisfy a runtime that claims the Home route.");
  assert.equal(hiddenOnly.result.pass, false);

  const laterVisible = await verify({
    dom: makeDomFixture({
      scope: { level: "L1", baseState: "home", missingL1: [] },
      home: null,
      homeSignal: [hiddenSignal, visibleSignal],
    }),
  });
  assert.equal(laterVisible.result.homePresent, true,
    "The verifier must scan past the first hidden broad match to a later visible Home signal.");
  assert.deepEqual({ ...laterVisible.result.homeSurface }, {
    x: 30,
    y: 25,
    width: 920,
    height: 660,
    visible: true,
  });
  assert.equal(laterVisible.result.pass, true);

  const opacityBoundarySignal = {
    ...makeElement({
      rect: makeRect(240, 84, 80, 260),
      style: { opacity: "0.05" },
    }),
    closest: (selector) => selector === '[role="main"]' ? currentHome : null,
  };
  const opacityAboveBoundarySignal = {
    ...makeElement({
      rect: makeRect(240, 84, 80, 260),
      style: { opacity: "0.051" },
    }),
    closest: (selector) => selector === '[role="main"]' ? currentHome : null,
  };
  const boundaryHidden = await verify({
    dom: makeDomFixture({
      scope: { level: "L1", baseState: "home", missingL1: [] },
      home: null,
      homeSignal: [opacityBoundarySignal],
    }),
  });
  assert.equal(boundaryHidden.result.homePresent, false,
    "Opacity 0.05 must remain below the shared rendered-element threshold.");
  const boundaryVisible = await verify({
    dom: makeDomFixture({
      scope: { level: "L1", baseState: "home", missingL1: [] },
      home: null,
      homeSignal: [opacityAboveBoundarySignal],
    }),
  });
  assert.equal(boundaryVisible.result.homePresent, true,
    "Opacity just above 0.05 must remain a visible Home identity signal.");
});

test("home verification matches macOS and does not require a fixed suggestion-card count", async () => {
  const oneSuggestion = {
    querySelectorAll: (selector) => selector === "button"
      ? [makeSuggestionButton({ text: "One real card" })]
      : [],
  };
  const homeWithOneSuggestion = await verify({
    dom: makeDomFixture({
      home: makeHome({
        rect: makeRect(900, 650, 20, 20),
        hero: { rect: makeRect(800, 260, 40, 60) },
        suggestions: oneSuggestion,
      }),
    }),
  });
  assert.equal(homeWithOneSuggestion.result.homePresent, true);
  assert.equal(homeWithOneSuggestion.result.visibleCardCount, 1);
  assert.equal(homeWithOneSuggestion.result.pass, true);

  const mismatchedSuggestion = {
    querySelectorAll: (selector) => selector === "button"
      ? [makeSuggestionButton({
        text: "Hidden by mismatched text color",
        color: "rgb(210, 210, 210)",
        labelColor: "rgb(10, 10, 10)",
      })]
      : [],
  };
  const badHome = await verify({
    dom: makeDomFixture({
      home: makeHome({
        rect: makeRect(900, 650, 20, 20),
        hero: { rect: makeRect(800, 260, 40, 60) },
        suggestions: mismatchedSuggestion,
      }),
    }),
  });
  assert.equal(badHome.result.suggestionLabelColorsMatch, false);
  assert.equal(badHome.result.pass, false);
});

test("uninformative Browser window replies require verified Win32 HWND evidence", async () => {
  for (const [label, bindingError] of [
    ["window-not-found", new Error("No window with given target found (-32000)")],
    ["window-not-found-by-code", Object.assign(new Error("Browser window not found"), {
      cdpCode: -32000,
    })],
    ["domain-unsupported", new Error("'Browser.getWindowForTarget' wasn't found (-32601)")],
    ["domain-unsupported-by-code", Object.assign(new Error("Protocol method unavailable"), {
      cdpCode: -32601,
    })],
    ["domain-unsupported-prose", new Error("Method not found (-32601)")],
  ]) {
    const withoutHwnd = await verify({ bindingError });
    assert.equal(withoutHwnd.result.pass, false, `${label}: DOM-only fallback must fail`);
    assert.equal(withoutHwnd.result.readiness.windowPass, false, label);
    assert.equal(withoutHwnd.result.readiness.fallbackWindowPass, false, label);

    const visible = await verify({ bindingError }, win32WindowEvidence);
    assert.equal(visible.result.pass, true, label);
    assert.equal(visible.result.nativeWindow.unsupported, true, label);
    assert.equal(visible.result.nativeWindow.source, "win32-hwnd", label);
    assert.equal(visible.result.nativeWindow.hwnd, win32WindowEvidence.hwnd, label);
    assert.equal(visible.result.nativeWindow.processId, win32WindowEvidence.processId, label);
    assert.equal(visible.result.readiness.windowPass, true, label);
    assert.equal(visible.result.readiness.nativeWindowPass, false, label);
    assert.equal(visible.result.readiness.fallbackWindowPass, true, label);
    const hidden = await verify({
      bindingError,
      dom: makeDomFixture({ visibilityState: "hidden", hidden: true }),
    }, win32WindowEvidence);
    assert.equal(hidden.result.pass, false, `${label}: hidden documents must still fail`);
    assert.equal(hidden.result.readiness.documentPass, false, label);

    const tiny = await verify({
      bindingError,
      dom: makeDomFixture({ viewportWidth: 319, viewportHeight: 239 }),
    }, win32WindowEvidence);
    assert.equal(tiny.result.pass, false, `${label}: tiny viewports must still fail`);
    assert.equal(tiny.result.readiness.viewportPass, false, label);

    const noStructure = await verify({
      bindingError,
      dom: makeDomFixture({ shell: null, sidebar: null }),
    }, win32WindowEvidence);
    assert.equal(noStructure.result.pass, false, `${label}: missing L1 structure must still fail`);
    assert.equal(noStructure.result.readiness.structurePass, false, label);
  }
});

test("native-window errors retain useful classifications", async () => {
  const notFound = await verify({
    bindingError: new Error("No window with given target found (-32000)"),
  });
  assert.equal(notFound.result.nativeWindow.reason, "browser-window-not-found");

  const unsupported = await verify({
    bindingError: new Error("'Browser.getWindowForTarget' wasn't found (-32601)"),
  });
  assert.equal(unsupported.result.nativeWindow.reason, "browser-window-api-unavailable");
});
test("unclassified window failures and invalid bindings still fail closed", async () => {
  for (const bindingError of [
    new Error("CDP socket closed"),
    new Error("CDP command timed out: Browser.getWindowForTarget"),
    Object.assign(new Error("Internal server error (-32000)"), { cdpCode: -32000 }),
    Object.assign(new Error("Internal error (-32603)"), { cdpCode: -32603 }),
  ]) {
    const result = await verify({ bindingError });
    assert.equal(result.result.pass, false, bindingError.message);
    assert.equal(result.result.nativeWindow.reason, "target-window-unavailable", bindingError.message);
    assert.notEqual(result.result.nativeWindow.unsupported, true, bindingError.message);
    assert.equal(result.result.readiness.windowPass, false, bindingError.message);
  }
  const zeroWindowId = await verify({ windowId: 0 });
  assert.equal(zeroWindowId.result.pass, false);
  assert.equal(zeroWindowId.result.nativeWindow.reason, "invalid-window-binding");
  assert.equal(zeroWindowId.session.calls.length, 1,
    "An invalid target binding must not be reused for a bounds query.");
});

test("window-bounds failures never fall back to renderer evidence", async () => {
  for (const [label, boundsError] of [
    ["window-not-found", Object.assign(new Error("Browser window not found"), {
      cdpCode: -32000,
    })],
    ["domain-unsupported", Object.assign(new Error("Protocol method unavailable"), {
      cdpCode: -32601,
    })],
    ["transport", new Error("CDP socket closed")],
  ]) {
    const { result, session } = await verify({ boundsError });
    assert.equal(result.pass, false, label);
    assert.deepEqual({ ...result.nativeWindow }, {
      pass: false,
      bound: true,
      windowId: 41,
      reason: "window-bounds-unavailable",
    }, label);
    assert.equal(result.readiness.windowPass, false, label);
    assert.deepEqual(session.calls, [
      { method: "Browser.getWindowForTarget", params: { targetId: "page-main" } },
      { method: "Browser.getWindowBounds", params: { windowId: 41 } },
    ], label);
  }
});

test("minimized and undersized native windows fail closed", async () => {
  const minimized = await verify({
    currentBounds: { width: 1280, height: 800, windowState: "minimized" },
  });
  assert.equal(minimized.result.pass, false);
  assert.equal(minimized.result.nativeWindow.reason, "window-not-visible");

  const zeroArea = await verify({
    currentBounds: { width: 0, height: 800, windowState: "normal" },
  });
  assert.equal(zeroArea.result.pass, false);
  assert.equal(zeroArea.result.nativeWindow.reason, "window-bounds-too-small");

  const onePixel = await verify({
    currentBounds: { width: 1, height: 1, windowState: "normal" },
  });
  assert.equal(onePixel.result.pass, false);
  assert.equal(onePixel.result.nativeWindow.reason, "window-bounds-too-small");
});

test("hidden documents and unreasonable viewports cannot pass", async () => {
  const hidden = await verify({ dom: makeDomFixture({ visibilityState: "hidden", hidden: true }) });
  assert.equal(hidden.result.pass, false);
  assert.equal(hidden.result.readiness.documentPass, false);

  const tiny = await verify({
    dom: makeDomFixture({ viewportWidth: 319, viewportHeight: 239 }),
  });
  assert.equal(tiny.result.pass, false);
  assert.equal(tiny.result.readiness.viewportPass, false);
});

test("startup-only hidden-document allowance still requires exact native and renderer readiness", async () => {
  const bindingError = new Error("No window with given target found (-32000)");
  const hiddenDom = makeDomFixture({ visibilityState: "hidden", hidden: true });
  const allowed = await verify({ bindingError, dom: hiddenDom }, win32WindowEvidence, true);
  assert.equal(allowed.result.pass, true);
  assert.equal(allowed.result.documentVisibility, "hidden");
  assert.equal(allowed.result.readiness.documentPass, false);
  assert.equal(allowed.result.readiness.hiddenDocumentAllowed, true);
  assert.equal(allowed.result.readiness.hiddenDocumentPass, true);
  assert.equal(allowed.result.readiness.effectiveDocumentPass, true);
  assert.equal(allowed.result.readiness.fallbackWindowPass, true);

  const noNative = await verify({ bindingError, dom: hiddenDom }, null, true);
  assert.equal(noNative.result.pass, false);
  assert.equal(noNative.result.readiness.windowPass, false);

  const noStructure = await verify({
    bindingError,
    dom: makeDomFixture({
      visibilityState: "hidden",
      hidden: true,
      shell: null,
      sidebar: null,
    }),
  }, win32WindowEvidence, true);
  assert.equal(noStructure.result.pass, false);
  assert.equal(noStructure.result.readiness.structurePass, false);

  const tiny = await verify({
    bindingError,
    dom: makeDomFixture({
      visibilityState: "hidden",
      hidden: true,
      viewportWidth: 319,
      viewportHeight: 239,
    }),
  }, win32WindowEvidence, true);
  assert.equal(tiny.result.pass, false);
  assert.equal(tiny.result.readiness.viewportPass, false);

  for (const dom of [
    makeDomFixture({ visibilityState: "prerender", hidden: true }),
    makeDomFixture({ visibilityState: "hidden", hidden: false }),
  ]) {
    const inconsistent = await verify({ bindingError, dom }, win32WindowEvidence, true);
    assert.equal(inconsistent.result.pass, false);
    assert.equal(inconsistent.result.readiness.hiddenDocumentPass, false);
  }
});

test("horizontal document overflow cannot be reported as a verified skin", async () => {
  const boundary = await verify({
    dom: makeDomFixture({ scrollWidth: 1280 }),
  });
  assert.equal(boundary.result.documentOverflow.x, false);
  assert.equal(boundary.result.pass, true, "Equal document and viewport widths are not overflow.");

  const horizontal = await verify({
    dom: makeDomFixture({ scrollWidth: 1281 }),
  });
  assert.equal(horizontal.result.documentOverflow.x, true);
  assert.equal(horizontal.result.pass, false);

  const verticalOnly = await verify({
    dom: makeDomFixture({ scrollHeight: 1600 }),
  });
  assert.equal(verticalOnly.result.documentOverflow.y, true);
  assert.equal(verticalOnly.result.documentOverflow.x, false);
  assert.equal(verticalOnly.result.pass, true, "Vertical scrolling is expected for long conversations.");
});

test("zero-size and CSS-hidden shell anchors cannot satisfy L1", async () => {
  const zeroRect = await verify({
    dom: makeDomFixture({ shell: makeElement({ rect: makeRect(0, 0) }) }),
  });
  assert.equal(zeroRect.result.pass, false);
  assert.equal(zeroRect.result.readiness.structurePass, false);

  const displayNone = await verify({
    dom: makeDomFixture({ shell: makeElement({ style: { display: "none" } }) }),
  });
  assert.equal(displayNone.result.pass, false);
  assert.equal(displayNone.result.readiness.structurePass, false);

  const unknownScope = await verify({
    dom: makeDomFixture({ scope: null }),
  });
  assert.equal(unknownScope.result.pass, false);
  assert.equal(unknownScope.result.readiness.structurePass, false);
});

test("start cannot announce active after renderer verification exhausts its deadline", async () => {
  const source = await fs.readFile(startPath, "utf8");
  const verifyStart = source.indexOf("$verifyDeadline =");
  const successBreak = source.indexOf("if ($verify.ExitCode -eq 0) { break }", verifyStart);
  const failureThrow = source.indexOf('throw "Dream Skin verification failed.', successBreak);
  const startupCatch = source.indexOf("$startupError = $_", failureThrow);
  const stateCleanup = source.indexOf("Remove-Item -LiteralPath $StatePath", startupCatch);
  const rethrow = source.indexOf("throw $startupError", stateCleanup);
  const activeMessage = source.indexOf('Write-Host "Codex Dream Skin is active', rethrow);
  assert.ok(verifyStart >= 0 && successBreak > verifyStart,
    "Startup must only leave the verify loop on a zero injector exit code.");
  assert.ok(failureThrow > successBreak && startupCatch > failureThrow,
    "A nonzero verify result must reach the startup rollback after its bounded retry window.");
  assert.ok(stateCleanup > startupCatch && rethrow > stateCleanup && activeMessage > rethrow,
    "Verification failure must clear transient state and rethrow before the active message.");
});
