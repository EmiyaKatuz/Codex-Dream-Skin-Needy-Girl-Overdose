import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { SKIN_VERSION, verifySession, waitForVerifiedSession } from "../scripts/injector.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const selectorContract = JSON.parse(fs.readFileSync(
  path.resolve(here, "../assets/selectors.json"),
  "utf8",
));
const selectorFor = (key) => selectorContract.selectors.find((entry) => entry.key === key)?.selector;
const selectors = {
  shell: selectorFor("shell-main"),
  sidebar: selectorFor("left-panel"),
  composer: selectorFor("composer-chrome"),
  home: selectorFor("home-route"),
  homeIcon: selectorFor("home-icon"),
  gameSource: selectorFor("game-source"),
  suggestions: selectorFor("home-suggestions"),
  settings: selectorFor("appearance-radio"),
  themePreview: '[data-testid="theme-preview"]',
};
const environmentSelector = 'div:is([class*="bg-token-dropdown-background"], [class~="bg-surface-elevated-secondary"])[class~="rounded-3xl"]';
for (const [key, selector] of Object.entries(selectors)) {
  assert.equal(typeof selector, "string", `missing selector fixture: ${key}`);
}

function makeRect(width = 800, height = 600, x = 0, y = 0) {
  return { x, y, width, height, right: x + width, bottom: y + height };
}

function makeElement({
  rect = makeRect(),
  style = {},
  beforeStyle = {},
  checkVisibility = true,
  isConnected = true,
  attributes = {},
  children = [],
  firstElementChild = children[0] ?? null,
  closest = () => null,
  querySelector = () => null,
  querySelectorAll = () => [],
} = {}) {
  return {
    isConnected,
    classList: [],
    childNodes: [],
    children,
    firstElementChild,
    textContent: "",
    _style: {
      display: "block",
      visibility: "visible",
      contentVisibility: "visible",
      opacity: "1",
      color: "rgb(0, 0, 0)",
      ...style,
    },
    _beforeStyle: { backgroundImage: "none", ...beforeStyle },
    getBoundingClientRect: () => rect,
    getAttribute: (name) => attributes[name] ?? null,
    checkVisibility: () => checkVisibility,
    closest,
    querySelector,
    querySelectorAll,
  };
}

function makeDomFixture({
  scope = { level: "L1", baseState: "thread", missingL1: [] },
  shell = makeElement(),
  sidebar = makeElement(),
  composer = makeElement(),
  shellCandidates = [shell],
  sidebarCandidates = [sidebar],
  composerCandidates = [composer],
  environmentCandidates = [],
  homeCandidates = [],
  homeIconCandidates = [],
  gameSourceCandidates = [],
  suggestionCandidates = [],
  settings = null,
  themeId = "fixture-theme",
  shellAppearance = "dark",
  visibilityState = "visible",
  viewportWidth = 1280,
  viewportHeight = 800,
} = {}) {
  const styleNode = {};
  const documentElement = {
    scrollWidth: viewportWidth,
    clientWidth: viewportWidth,
    scrollHeight: viewportHeight,
    clientHeight: viewportHeight,
    getAttribute: (name) => {
      if (name === "data-dream-skin") return "active";
      if (name === "data-dream-shell") return shellAppearance;
      return null;
    },
  };
  const document = {
    documentElement,
    adoptedStyleSheets: [],
    visibilityState,
    querySelector(selector) {
      if (selector === selectors.shell) return shellCandidates[0] ?? null;
      if (selector === selectors.sidebar) return sidebarCandidates[0] ?? null;
      if (selector === selectors.composer) return composerCandidates[0] ?? null;
      if (selector === environmentSelector) return environmentCandidates[0] ?? null;
      if (selector === selectors.settings || selector === selectors.themePreview) return settings;
      if (selector === selectors.home) return homeCandidates[0] ?? null;
      if (selector === selectors.homeIcon) return homeIconCandidates[0] ?? null;
      if (selector === selectors.gameSource) return gameSourceCandidates[0] ?? null;
      if (selector === selectors.suggestions) return suggestionCandidates[0] ?? null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === selectors.shell) return shellCandidates;
      if (selector === selectors.sidebar) return sidebarCandidates;
      if (selector === selectors.composer) return composerCandidates;
      if (selector === environmentSelector) return environmentCandidates;
      if (selector === selectors.home) return homeCandidates;
      if (selector === selectors.homeIcon) return homeIconCandidates;
      if (selector === selectors.gameSource) return gameSourceCandidates;
      if (selector === selectors.suggestions) return suggestionCandidates;
      if (selector === selectors.settings || selector === selectors.themePreview) {
        return settings ? [settings] : [];
      }
      return [];
    },
    getElementById: (id) => id === "codex-dream-skin-style" ? styleNode : null,
  };
  const window = {
    __CODEX_DREAM_SKIN_STATE__: {
      version: SKIN_VERSION,
      themeId,
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
    getComputedStyle: (node, pseudo) => pseudo === "::before"
      ? node?._beforeStyle ?? {}
      : node?._style ?? {},
  };
}

function makeSession({
  dom = makeDomFixture(),
  evaluateErrors = [],
  nativeResponse = {
    windowId: 41,
    bounds: { width: 1280, height: 800, windowState: "normal" },
  },
} = {}) {
  let evaluateCount = 0;
  return {
    target: { id: "page-main" },
    get evaluateCount() { return evaluateCount; },
    async evaluate(expression) {
      const error = evaluateErrors[evaluateCount];
      evaluateCount += 1;
      if (error) throw error;
      return vm.runInNewContext(expression, dom);
    },
    async send(method, params) {
      assert.equal(method, "Browser.getWindowForTarget");
      assert.deepEqual(params, { targetId: "page-main" });
      return nativeResponse;
    },
  };
}

async function verify({
  expectedThemeId = "fixture-theme",
  expectedRevision = "fixture-revision",
  ...overrides
} = {}) {
  return verifySession(
    makeSession(overrides),
    expectedThemeId,
    expectedRevision,
  );
}

test("visible L1 renderer passes exact macOS verification", async () => {
  const result = await verify();
  assert.equal(result.pass, true);
  assert.equal(result.shell.visible, true);
  assert.equal(result.sidebar.visible, true);
  assert.equal(result.composer.visible, true);
});

test("Light Internet Angel accepts its adaptive Environment surface", async () => {
  const toggle = makeElement();
  const action = makeElement();
  const environment = makeElement({
    rect: makeRect(300, 420, 960, 60),
    style: {
      backgroundColor: "rgb(241, 240, 242)",
      backgroundImage: "none",
      borderWidth: "1px",
    },
    beforeStyle: { backgroundImage: "linear-gradient(rgb(99, 244, 255), rgb(255, 69, 200))" },
    attributes: { "data-angel-component": "environment" },
    querySelector: (selector) => selector === 'button[class~="group/section-toggle"]' ? toggle : null,
    querySelectorAll: (selector) => selector === "button" ? [toggle, action] : [],
  });
  const result = await verify({
    expectedThemeId: "preset-internet-angel",
    dom: makeDomFixture({
      environmentCandidates: [environment],
      shellAppearance: "light",
      themeId: "preset-internet-angel",
    }),
  });
  assert.equal(result.environment.visible, true);
  assert.equal(result.angelCoverage.environment, true);
  assert.equal(result.pass, true);

  const darkResult = await verify({
    expectedThemeId: "preset-internet-angel",
    dom: makeDomFixture({
      environmentCandidates: [environment],
      themeId: "preset-internet-angel",
    }),
  });
  assert.equal(darkResult.angelCoverage.environment, false);

  environment._beforeStyle.backgroundImage = "none";
  const unaccentedResult = await verify({
    expectedThemeId: "preset-internet-angel",
    dom: makeDomFixture({
      environmentCandidates: [environment],
      shellAppearance: "light",
      themeId: "preset-internet-angel",
    }),
  });
  assert.equal(unaccentedResult.angelCoverage.environment, false);
});

test("CSS-hidden, detached, and offscreen anchors cannot satisfy L1", async () => {
  const cases = [
    ["display none", makeElement({ style: { display: "none" } })],
    ["visibility hidden", makeElement({ style: { visibility: "hidden" } })],
    ["visibility collapse", makeElement({ style: { visibility: "collapse" } })],
    ["content-visibility hidden", makeElement({ style: { contentVisibility: "hidden" } })],
    ["opacity zero", makeElement({ style: { opacity: "0" } })],
    ["opacity threshold", makeElement({ style: { opacity: ".05" } })],
    ["checkVisibility false", makeElement({ checkVisibility: false })],
    ["detached", makeElement({ isConnected: false })],
    ["offscreen right", makeElement({ rect: makeRect(200, 200, 1280, 20) })],
    ["offscreen left", makeElement({ rect: makeRect(200, 200, -200, 20) })],
    ["offscreen below", makeElement({ rect: makeRect(200, 200, 20, 800) })],
  ];

  for (const [label, shell] of cases) {
    const result = await verify({ dom: makeDomFixture({ shell }) });
    assert.equal(result.pass, false, label);
    assert.equal(result.checks.structurePass, false, label);
    assert.equal(result.shell?.visible ?? false, false, label);
  }
});

test("visibility scans past stale candidates and accepts opacity above the shared threshold", async () => {
  const hidden = makeElement({ style: { opacity: ".05" } });
  const visible = makeElement({ style: { opacity: ".051" } });
  const result = await verify({
    dom: makeDomFixture({
      shellCandidates: [hidden, visible],
      sidebarCandidates: [hidden, visible],
      composerCandidates: [hidden, visible],
    }),
  });
  assert.equal(result.pass, true);
  assert.equal(result.shell.visible, true);
  assert.equal(result.sidebar.visible, true);
  assert.equal(result.composer.visible, true);
});

test("visible Home with a hidden signal cannot bypass the Internet Angel deck gate", async () => {
  const hero = makeElement({ rect: makeRect(900, 620, 200, 80) });
  let home;
  const hiddenHomeIcon = makeElement({
    style: { display: "none" },
    closest: () => home,
  });
  home = makeElement({
    rect: makeRect(1000, 700, 160, 40),
    children: [hero],
    firstElementChild: hero,
  });
  const result = await verify({
    expectedThemeId: "preset-internet-angel",
    dom: makeDomFixture({
      scope: { level: "L1", baseState: "home", missingL1: [] },
      themeId: "preset-internet-angel",
      homeCandidates: [home],
      homeIconCandidates: [hiddenHomeIcon],
    }),
  });
  assert.equal(result.homePresent, true);
  assert.equal(result.homeRoute, true);
  assert.equal(result.angelDeckReady, false);
  assert.equal(result.checks.angelDeckPass, false);
  assert.equal(result.pass, false);
});

test("transient Runtime.evaluate failures are retried inside the bounded deadline", async () => {
  const session = makeSession({
    evaluateErrors: [new Error("Execution context was destroyed during navigation")],
  });
  const result = await waitForVerifiedSession(
    session,
    100,
    "fixture-theme",
    "fixture-revision",
    1,
  );
  assert.equal(result.pass, true);
  assert.equal(session.evaluateCount, 2);
});

test("verification rethrows the last transient error when no sample succeeds", async () => {
  const session = makeSession();
  session.evaluate = async () => {
    throw new Error("Execution context stayed unavailable");
  };
  await assert.rejects(
    waitForVerifiedSession(session, 15, "fixture-theme", "fixture-revision", 1),
    /Execution context stayed unavailable/,
  );
});
