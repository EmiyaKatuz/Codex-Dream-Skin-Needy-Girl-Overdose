import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { test } from "node:test";
import { buildMotionPayload, readMotionPreferences, watchMotionPreferences } from "../runtime/motion-payload.mjs";
import { DEFAULT_MOTION_SETTINGS, normalizeMotionSettings, writeMotionSettings } from "../runtime/motion-settings.mjs";

const defaults = () => normalizeMotionSettings(DEFAULT_MOTION_SETTINGS);
const registryKey = "__CODEX_DREAM_SKIN_MOTION_STATE__";
const injectionKey = "__CODEX_DREAM_SKIN_MOTION_INJECTION__";
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
async function fixture(t) {
  const temporaryRoot = await fs.realpath(os.tmpdir());
  const root = await fs.mkdtemp(path.join(temporaryRoot, "dream-motion-payload-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, file: path.join(root, "preferences", "motion.json") };
}
function composed(label, extra = {}) {
  return buildMotionPayload({
    basePayload: `events.push(${JSON.stringify(`${label}:base`)})`,
    extensionPayload: `events.push(${JSON.stringify(`${label}:extension`)})`,
    motionTemplate: `captured.push(__DREAM_SKIN_MOTION_CONFIG_JSON__); events.push(${JSON.stringify(`${label}:motion`)})`,
    config: { label }, ...extra,
  });
}
const context = (previous) => vm.createContext({
  window: previous ? { [registryKey]: previous } : {}, events: [], captured: [],
});

test("missing preferences use defaults while invalid preferences fail safely to off", async (t) => {
  const { file } = await fixture(t);
  const missing = await readMotionPreferences(file);
  assert.deepEqual(missing.settings, defaults());
  assert.equal(missing.rejected, false);
  await fs.mkdir(path.dirname(file));
  await fs.writeFile(file, '{"schemaVersion":2}');
  const invalid = await readMotionPreferences(file);
  assert.equal(invalid.settings.mode, "off");
  assert.equal(invalid.rejected, true);
  assert.notEqual(invalid.signature, missing.signature);
  await fs.unlink(file);
  await writeMotionSettings({ ...defaults(), mode: "off" }, file);
  const explicitOff = await readMotionPreferences(file);
  assert.equal(explicitOff.rejected, false);
  assert.equal(explicitOff.signature, invalid.signature);
});

test("first injection applies renderer, extension, and motion before yielding", async () => {
  const page = context();
  const result = vm.runInContext(composed("first"), page);
  assert.deepEqual(page.events, ["first:base", "first:extension", "first:motion"]);
  assert.equal(await result, true);
});

test("handoff waits for preparation and only the newest injection may apply", async () => {
  const handoffs = [];
  const page = context({ prepareThemeTransition() { const wait = deferred(); handoffs.push(wait); return wait.promise; } });
  const older = vm.runInContext(composed("old"), page);
  const newer = vm.runInContext(composed("new"), page);
  assert.deepEqual(page.events, []);
  handoffs[1].resolve();
  assert.equal(await newer, true);
  handoffs[0].resolve();
  assert.equal(await older, false);
  assert.deepEqual(page.events, ["new:base", "new:extension", "new:motion"]);
});

test("pause invalidates pending injection without resurrecting the previous skin", async () => {
  const wait = deferred();
  const page = context({ prepareThemeTransition() { return wait.promise; } });
  const pending = vm.runInContext(composed("paused"), page);
  delete page.window[injectionKey];
  wait.resolve();
  assert.equal(await pending, false);
  assert.deepEqual(page.events, []);
});

test("ordinary handoff errors retain a usable synchronous renderer fallback", async () => {
  const page = context({ prepareThemeTransition() { throw new Error("snapshot unavailable"); } });
  assert.equal(await vm.runInContext(composed("fallback"), page), true);
  assert.deepEqual(page.events, ["fallback:base", "fallback:extension", "fallback:motion"]);
});

test("handoff receives the next image source without interpreting dollar sequences", async () => {
  let received;
  const page = context({ prepareThemeTransition(config, source) { received = { config, source }; } });
  const artDataUrl = "data:image/png;base64,literal$$$&$`$'";
  await vm.runInContext(composed("image", { artDataUrl }), page);
  assert.equal(received.source, artDataUrl);
  assert.equal(received.config.label, "image");
});

test("a typed image decode failure preserves the old skin and rejects the replacement", async () => {
  const page = context({ prepareThemeTransition() {
    throw Object.assign(new Error("next image failed to decode"), { code: "DREAM_SKIN_IMAGE_DECODE_FAILED" });
  } });
  page.events.push("old skin remains");
  await assert.rejects(vm.runInContext(composed("bad image", { artDataUrl: "data:image/png;base64,invalid" }), page),
    { code: "DREAM_SKIN_IMAGE_DECODE_FAILED" });
  assert.deepEqual(page.events, ["old skin remains"]);
});

test("configuration dollar sequences are inserted as literal JSON", async () => {
  const page = context();
  const config = { themeId: "literal$$-$&-$`-$'", nested: { text: "quote\" slash\\ newline\n$&" } };
  await vm.runInContext(composed("literal", { config }), page);
  assert.deepEqual(JSON.parse(JSON.stringify(page.captured[0])), config);
  assert.deepEqual(page.events, ["literal:base", "literal:extension", "literal:motion"]);
});

function manualInterval(t) {
  let tick;
  let unref = 0;
  let cleared = 0;
  const timer = { unref() { unref += 1; } };
  t.mock.method(globalThis, "setInterval", (callback) => { tick = callback; return timer; });
  t.mock.method(globalThis, "clearInterval", (handle) => { assert.equal(handle, timer); cleared += 1; });
  return { tick: () => tick(), counts: () => ({ unref, cleared }) };
}

test("preference watcher coalesces unchanged values and stops cleanly", async (t) => {
  const { file } = await fixture(t);
  const initial = await readMotionPreferences(file);
  const clock = manualInterval(t);
  let notifications = 0;
  const stop = watchMotionPreferences(() => { notifications += 1; }, { filePath: file, initialSignature: initial.signature });
  await clock.tick();
  assert.equal(notifications, 0);
  await writeMotionSettings({ ...defaults(), mode: "subtle" }, file);
  await clock.tick();
  await clock.tick();
  assert.equal(notifications, 1);
  await fs.writeFile(file, '{"broken":true}');
  await clock.tick();
  await clock.tick();
  assert.equal(notifications, 2, "invalid preferences cause one transition to safe off");
  stop();
  await fs.unlink(file);
  await clock.tick();
  assert.equal(notifications, 2);
  assert.deepEqual(clock.counts(), { unref: 1, cleared: 1 });
});

test("watcher allows only one read in flight and closing suppresses late notification", async (t) => {
  const { file } = await fixture(t);
  await writeMotionSettings(defaults(), file);
  const initial = await readMotionPreferences(file);
  await writeMotionSettings({ ...defaults(), mode: "full" }, file);
  const clock = manualInterval(t);
  const gate = deferred();
  const opened = deferred();
  const nativeOpen = fs.open.bind(fs);
  let reads = 0;
  t.mock.method(fs, "open", async (...args) => {
    reads += 1;
    opened.resolve();
    await gate.promise;
    return nativeOpen(...args);
  });
  let notifications = 0;
  const stop = watchMotionPreferences(() => { notifications += 1; }, { filePath: file, initialSignature: initial.signature });
  const pending = clock.tick();
  await opened.promise;
  await clock.tick();
  assert.equal(reads, 1);
  stop();
  gate.resolve();
  await pending;
  assert.equal(notifications, 0);
  assert.deepEqual(clock.counts(), { unref: 1, cleared: 1 });
});

async function makeTheme(t) {
  const state = await fixture(t);
  const themeDir = path.join(state.root, "theme");
  await fs.mkdir(themeDir);
  await fs.copyFile(new URL("../windows/assets/dream-reference.jpg", import.meta.url), path.join(themeDir, "background.jpg"));
  await fs.writeFile(path.join(themeDir, "theme.json"), JSON.stringify({
    schemaVersion: 1, id: "preset-internet-angel-default", name: "Payload $$ $& $` $'", image: "background.jpg", appearance: "auto",
  }));
  const artDataUrl = `data:image/jpeg;base64,${(await fs.readFile(path.join(themeDir, "background.jpg"))).toString("base64")}`;
  return { ...state, themeDir, artDataUrl };
}
async function platformLoader(platform) {
  const { loadPayload } = await import(`../${platform}/scripts/injector.mjs`);
  return (directory, file, material = "system") => platform === "windows"
    ? loadPayload(directory, null, material, { motionSettingsPath: file })
    : loadPayload(directory, { motionSettingsPath: file });
}

// Execute the shipped controller using the configuration produced by each
// real loadPayload. Keep DOM behavior minimal here: full interaction/layout
// coverage belongs to the renderer/browser tests.
async function runBuiltController(platform, payload) {
  const declaration = payload.match(/const suppliedConfig = ([^\n]+);/);
  assert.ok(declaration, "built payload must initialize the shared motion controller");
  const config = JSON.parse(declaration[1]);
  const template = await fs.readFile(new URL(`../${platform}/assets/theme-motion.js`, import.meta.url), "utf8");
  const node = () => {
    const attributes = new Map();
    return {
      nodeType: 1, childElementCount: 0, isConnected: true, children: [],
      style: { setProperty() {} },
      getAttribute: (key) => attributes.get(key) ?? null,
      hasAttribute: (key) => attributes.has(key),
      setAttribute(key, value) { attributes.set(key, String(value)); },
      removeAttribute(key) { attributes.delete(key); },
      querySelectorAll() { return []; }, querySelector() { return null; },
      closest() { return null; }, matches() { return false; },
      getClientRects() { return [{}]; },
      appendChild(child) { this.children.push(child); child.parent = this; },
      remove() { if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this); },
      addEventListener() {}, removeEventListener() {},
    };
  };
  const root = node();
  root.setAttribute("data-dream-skin", "active");
  const document = { ...node(), documentElement: root, body: node(), createElement: node, hidden: false };
  const sandbox = {
    document, location: { pathname: "/thread", search: "", hash: "" }, URLSearchParams,
    innerWidth: 1280, innerHeight: 800, setTimeout, clearTimeout,
    getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {}, removeEventListener() {},
  };
  sandbox.window = sandbox;
  vm.runInNewContext(template.replace("__DREAM_SKIN_MOTION_CONFIG_JSON__", () => JSON.stringify(config)), sandbox);
  const controller = sandbox[registryKey];
  assert.ok(controller, "real payload metadata must satisfy the renderer controller contract");
  const mode = controller.inspect().mode;
  controller.cleanup();
  assert.equal(sandbox[registryKey], undefined);
  assert.equal(document.body.children.length, 0);
  return { mode, config };
}

for (const platform of ["macos", "windows", "linux"]) {
  test(`${platform}: real payload revisions follow mode/effects and invalid settings do not block a valid theme`, async (t) => {
    const { themeDir, file, artDataUrl } = await makeTheme(t);
    const load = await platformLoader(platform);
    const initial = await load(themeDir, file);
    assert.deepEqual(initial.motionSettings, defaults());
    assert.equal(initial.motionSettingsRejected, false);
    assert.equal(initial.payload.split(artDataUrl).length - 1, 1,
      "the renderer and transition must share one embedded image source");
    assert.equal((await runBuiltController(platform, initial.payload)).mode, "subtle");
    await writeMotionSettings({ ...defaults(), mode: "full" }, file);
    const full = await load(themeDir, file);
    assert.notEqual(full.revision, initial.revision);
    const fullRuntime = await runBuiltController(platform, full.payload);
    assert.equal(fullRuntime.mode, "full");
    assert.deepEqual(fullRuntime.config.artMetadata, {
      width: full.theme.artMetadata.width, height: full.theme.artMetadata.height,
    });
    await writeMotionSettings({ ...defaults(), mode: "full", effects: { ...defaults().effects, ambient: false } }, file);
    const noAmbient = await load(themeDir, file);
    assert.notEqual(noAmbient.revision, full.revision);
    assert.equal(noAmbient.motionSettings.effects.ambient, false);
    assert.equal((await runBuiltController(platform, noAmbient.payload)).config.settings.effects.ambient, false);
    assert.equal((await load(themeDir, file)).revision, noAmbient.revision);
    await fs.writeFile(file, '{"mode":"full"}');
    const rejected = await load(themeDir, file);
    assert.equal(rejected.motionSettingsRejected, true);
    assert.equal(rejected.motionSettings.mode, "off");
    assert.equal((await runBuiltController(platform, rejected.payload)).mode, "off");
    assert.equal(rejected.theme.name, "Payload $$ $& $` $'");
    new vm.Script(rejected.payload);
  });
}

test("Windows Acrylic keeps motion enabled with the legacy classifier disabled", async (t) => {
  const { themeDir, file, artDataUrl } = await makeTheme(t);
  const load = await platformLoader("windows");
  await writeMotionSettings({ ...defaults(), mode: "full" }, file);
  const acrylic = await load(themeDir, file, "acrylic");
  assert.equal(acrylic.acrylicOverlay, true);
  assert.equal(acrylic.internetAngelClassifier, false);
  assert.equal(acrylic.payload.split(artDataUrl).length - 1, 1);
  assert.equal((await runBuiltController("windows", acrylic.payload)).mode, "full");
  const system = await load(themeDir, file);
  assert.equal(system.internetAngelClassifier, true);
  assert.notEqual(system.revision, acrylic.revision);
});
