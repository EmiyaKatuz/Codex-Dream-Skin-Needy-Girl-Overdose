import assert from 'node:assert/strict';
import {mkdtemp, realpath, rm, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {loadPayload} from '../windows/scripts/injector.mjs';
import {readMotionSettings} from '../windows/assets/motion-settings.mjs';

// This suite deliberately loads the shipped Windows payload, including its
// cascade and material-specific sheets. DOM/controller mocks cannot detect a
// running CSS timeline whose painted property is overridden by !important.
// CI runs this on Windows and Linux; it is not an official Codex/Electron test.
const options = {skip: process.env.DREAM_SKIN_MOTION_BROWSER !== '1'
  ? 'opt in with DREAM_SKIN_MOTION_BROWSER=1 and installed Playwright/Chromium' : false};
const owned = '[data-dream-motion-owned]';
const role = (name) => `${owned}[data-dream-motion-role="${name}"]`;
const settings = (mode = 'full', effects = {}) => ({schemaVersion:1, mode,
  effects:{interactions:true, status:true, character:true, ambient:true, themeTransition:true, ...effects}});
const fixture = `<!doctype html><html><head><title>Dream Skin motion playback fixture</title>
  <style>@keyframes native-fixture-spin {to {transform:rotate(360deg)}}
  body {margin:0;min-height:100vh;}
  #fixture-face-control.fixture-control-hidden {visibility:hidden;}
  #native-spinner {animation:native-fixture-spin 1s linear infinite;width:16px;height:16px}</style>
  </head><body><main class="main-surface" data-app-shell-main-surface="true" style="position:fixed;inset:0">
  <section data-testid="home-icon" style="position:absolute;left:320px;top:150px;width:200px;height:80px">Home fixture</section>
  <section class="composer-surface-chrome" style="position:absolute;left:320px;top:500px;width:400px;height:100px">
  <textarea aria-label="Prompt">Native prompt fixture</textarea><svg id="native-spinner" viewBox="0 0 16 16"><path d="M8 1L8 5"/></svg>
  </section></main></body></html>`;

async function launch(t, material = 'system', platform = 'windows') {
  const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  // Windows runners may expose TEMP with an 8.3 alias. The production reader
  // deliberately rejects redirected/noncanonical ancestors, so hand it the
  // canonical spelling of our own fixture directory rather than weakening it.
  const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'dream-motion-browser-')));
  t.after(() => rm(directory, {recursive:true, force:true}));
  const browser = await chromium.launch({headless:true,
    ...(process.env.DREAM_SKIN_BROWSER_EXECUTABLE ? {executablePath:process.env.DREAM_SKIN_BROWSER_EXECUTABLE} : {})});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport:{width:1280,height:800}, reducedMotion:'no-preference'});
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'the assembled renderer must not throw'));
  // Every resource needed by the real payload is bundled/data/blob. Tests must
  // never depend on a live account or let a fixture issue external requests.
  await page.route(/^https?:/, (route) => route.abort());
  await page.setContent(fixture);
  const preferences = path.join(directory, 'motion.json');
  const install = async (value = settings()) => {
    await writeFile(preferences, JSON.stringify(value));
    assert.deepEqual(await readMotionSettings(preferences), value,
      'the fixture preferences must pass the same strict reader used by the injector');
    const loaded = platform === 'windows'
      ? await loadPayload(undefined, null, material, {motionSettingsPath:preferences})
      : await (await import(`../${platform}/scripts/injector.mjs`)).loadPayload(undefined, {motionSettingsPath:preferences});
    assert.equal(loaded.motionSettingsRejected, false, 'fixture preferences must not fall back to motion off');
    assert.deepEqual(loaded.motionSettings, value, 'the assembled payload must use the requested fixture preferences');
    await page.evaluate(loaded.payload);
    await page.waitForFunction(() => window.__CODEX_DREAM_SKIN_MOTION_STATE__);
    const actual = await page.evaluate(() => ({mode:window.__CODEX_DREAM_SKIN_MOTION_STATE__.inspect().mode,
      reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}));
    const expected = actual.reduced || value.mode === 'off' ? 'off' : value.mode === 'full' ? 'full' : 'subtle';
    assert.equal(actual.mode, expected, 'the renderer must resolve the requested mode before playback assertions');
    return loaded;
  };
  await install();
  await page.waitForFunction(() => document.documentElement.getAttribute('data-dream-motion-paused') === 'false');
  return {page, install};
}

async function feedbackTargets(page) {
  return page.evaluate(async () => {
    document.querySelector('#feedback-fixture')?.remove();
    const container = document.createElement('section');
    container.id = 'feedback-fixture';
    container.innerHTML = `<section id="feedback-permission" role="alertdialog" aria-modal="true" data-state="open">Approve fixture command?</section>
      <section data-content-search-unit-key="feedback-file-batch"><section id="feedback-edit" class="dream-edited-card">Fixture file change</section></section>
      <section id="feedback-menu" role="menu" data-state="open"><button role="menuitem">Fixture action</button></section>`;
    document.querySelector('main').appendChild(container);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return Object.fromEntries(['permission', 'edit', 'menu'].map((name) => {
      const node = document.querySelector(`#feedback-${name}`);
      return [name, {entry:node.getAttribute('data-dream-motion-enter'), animation:getComputedStyle(node).animationName}];
    }));
  });
}

for (const [platform, material] of [['windows', 'system'], ['windows', 'acrylic'], ['macos', 'system'], ['linux', 'system']]) {
  test(`${platform} ${material}: P-chan paints distinct task poses within the existing decoration bounds`, options, async (t) => {
    const {page, install} = await launch(t, material, platform);
    await install(settings('subtle'));
    const character = page.locator(role('character'));
    const before = await page.locator('textarea').boundingBox();
    const frames = new Map();
    for (const [index, state] of ['unknown', 'idle', 'busy', 'streaming', 'needs-attention', 'completed', 'failed', 'cancelled'].entries()) {
      const pose = await page.evaluate(({index, state}) => {
        const controller = window.__CODEX_DREAM_SKIN_MOTION_STATE__;
        const identity = {schemaVersion:1, taskId:'pose-fixture', runId:`pose-${index}`, routeEpoch:controller.inspect().routeEpoch};
        const bound = controller.bindTask(identity);
        const active = controller.reportTaskState({...identity, revision:0, state:'busy'});
        const accepted = controller.reportTaskState({...identity, revision:1, state});
        const node = document.querySelector('[data-dream-motion-role="character"]');
        for (const animation of node.getAnimations({subtree:true})) { animation.pause(); animation.currentTime = 0; }
        const svg = node.querySelector('svg'), box = svg.getBoundingClientRect(), style = getComputedStyle(node);
        const visiblePoses = [...svg.querySelectorAll('[data-dream-motion-pose]')]
          .filter((group) => getComputedStyle(group).display !== 'none').map((group) => group.dataset.dreamMotionPose);
        const shapes = [...svg.querySelectorAll('path')].filter((part) => !part.closest('[data-dream-motion-pose]')
          || getComputedStyle(part.parentElement).display !== 'none');
        return {bound, active, accepted, state:node.dataset.dreamMotionState, mascot:svg.dataset.dreamMotionMascot,
          visiblePoses, visible:style.visibility, pointer:style.pointerEvents, width:box.width, height:box.height,
          bounded:shapes.every((part) => {const b = part.getBoundingClientRect();
            return b.left >= box.left && b.top >= box.top && b.right <= box.right && b.bottom <= box.bottom;})};
      }, {index, state});
      assert.ok(pose.bound && pose.active && pose.accepted, 'each pose must come from an accepted task-state report');
      assert.equal(pose.state, state); assert.equal(pose.mascot, 'p-chan');
      assert.deepEqual(pose.visiblePoses, [state], 'exactly one matching expression and posture frame must be painted');
      assert.equal(pose.visible, 'visible'); assert.equal(pose.pointer, 'none');
      assert.equal(pose.width, 48); assert.equal(pose.height, 56); assert.equal(pose.bounded, true);
      frames.set(state, await character.screenshot());
    }
    for (const state of ['idle', 'busy', 'needs-attention', 'completed']) {
      assert.ok(!frames.get('unknown').equals(frames.get(state)), `${state} must visibly change P-chan's expression`);
    }
    assert.equal(new Set([...frames.values()].map((frame) => frame.toString('base64'))).size, 8,
      'all eight task states must have visually distinct expression and posture frames');
    assert.deepEqual(await page.locator('textarea').boundingBox(), before, 'changing the mascot cannot move the native composer');
    // Native settings content can have empty non-scrolling descendants. Those
    // pixels still belong to the panel even when no text/control is hit.
    await page.setContent(`<!doctype html><html><head><title>Settings placement fixture</title></head><body>
      <main data-app-shell-main-surface style="position:fixed;inset:0">
      <div class="scrollbar-stable flex-1 overflow-y-auto p-panel" style="position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;z-index:100"><div style="height:100%"></div></div>
      </main></body></html>`);
    await install(settings('subtle'));
    assert.equal(await page.locator('.p-panel').evaluate((node) => {
      const box = node.getBoundingClientRect();
      return box.left <= 0 && box.top <= 0 && box.right >= innerWidth && box.bottom >= innerHeight;
    }), true, 'the fixture settings panel must fill the viewport on every platform');
    assert.equal(await character.evaluate((node) => getComputedStyle(node).visibility), 'hidden',
      'the character must withdraw when every placement belongs to a settings panel');
    await install(settings('full', {character:false}));
    assert.equal(await character.count(), 0, 'the character switch must remove P-chan');
  });

  test(`${platform} ${material}: light settings inputs retain contrast during keyboard interaction`, options, async (t) => {
    const {page, install} = await launch(t, material, platform);
    await page.emulateMedia({colorScheme:'light'});
    await page.evaluate(() => {
      const panel = document.createElement('section');
      panel.innerHTML = `<aside><nav><button data-settings-panel-slug="general-settings" aria-current="page">General</button>
        <button data-settings-panel-slug="appearance">Appearance</button></nav></aside>
        <section><div class="scrollbar-stable flex-1 overflow-y-auto p-panel"><h1>Appearance</h1>
        <label>Theme name <input id="fixture-setting-input" type="text" value="INTERNET ANGEL" placeholder="Theme name"></label></div></section>`;
      document.querySelector('main').appendChild(panel);
    });
    await install(settings('subtle'));
    const input = page.locator('#fixture-setting-input');
    await input.fill('Keyboard feedback');
    assert.equal(await input.inputValue(), 'Keyboard feedback');
    // Read the painted inner-right pixel, away from text, caret and borders.
    // Acrylic's translucent input must be measured over its actual ancestors.
    const painted = await input.screenshot();
    const contrast = await input.evaluate(async (node, screenshot) => {
      const style = getComputedStyle(node), canvas = document.createElement('canvas');
      const image = new Image(); image.src = screenshot; await image.decode();
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const paintedBackground = [...context.getImageData(canvas.width - 8, Math.floor(canvas.height / 2), 1, 1).data].slice(0, 3);
      const rgb = (color) => {
        context.fillStyle = '#fff'; context.fillRect(0, 0, 1, 1);
        context.fillStyle = color; context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      const luminance = (channels) => channels.map((channel) => {
        const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
      }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      const background = luminance(paintedBackground), foreground = luminance(rgb(style.color));
      return {ratio:(Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05),
        background:style.backgroundColor, component:node.getAttribute('data-angel-component')};
    }, `data:image/png;base64,${painted.toString('base64')}`);
    assert.ok(contrast.ratio >= 4.5, `settings input contrast must reach 4.5:1: ${JSON.stringify(contrast)}`);
    if (contrast.component === 'settings-input') assert.equal(contrast.background, 'rgb(23, 19, 45)');
  });

  test(`${platform} ${material}: status and interaction entry feedback have independent switches`, options, async (t) => {
    const {page, install} = await launch(t, material, platform);
    await install(settings('subtle', {interactions:false}));
    const statusOnly = await feedbackTargets(page);
    assert.deepEqual(statusOnly.permission, {entry:'permission', animation:'dream-motion-highlight'});
    assert.deepEqual(statusOnly.edit, {entry:'edited-card', animation:'dream-motion-highlight'});
    assert.deepEqual(statusOnly.menu, {entry:null, animation:'none'});
    await page.locator('#feedback-fixture').evaluate((node) => node.remove());
    await install(settings('subtle', {status:false}));
    const interactionsOnly = await feedbackTargets(page);
    assert.deepEqual(interactionsOnly.permission, {entry:null, animation:'none'});
    assert.deepEqual(interactionsOnly.edit, {entry:null, animation:'none'});
    assert.deepEqual(interactionsOnly.menu, {entry:'menu', animation:'dream-motion-highlight'});
  });

  test(`${platform} ${material}: reused menus, edit batches and nested disclosures retain real feedback`, options, async (t) => {
    const {page, install} = await launch(t, material, platform);
    await page.evaluate(() => {
      const container = document.createElement('section');
      container.id = 'lifecycle-fixture';
      container.innerHTML = `<button id="fixture-menu-toggle">Toggle fixture menu</button>
        <section id="fixture-reused-menu" role="menu" data-state="closed" hidden><button role="menuitem">Fixture menu item</button></section>
        <section id="fixture-edit-batch" data-content-search-unit-key="historical"><section id="fixture-reused-edit" class="[--thread-resource-card-row-padding-x:16px]">
        <header class="group/turn-diff-header"><span class="font-medium text-token-foreground">Edited fixture.js</span></header>
        <span class="turn-diff-default-subtitle">+1 -0</span><button>Undo</button><button>Review</button></section></section>
        <section data-local-conversation-item-target-ids="fixture-tool"><section class="group/activity-header">
        <button id="fixture-disclosure" aria-expanded="false"><svg data-lucide="chevron-right" width="16" height="16" viewBox="0 0 16 16"><path d="M5 2L11 8L5 14"/></svg>Show details</button>
        </section><pre id="fixture-output" hidden>Readonly fixture output</pre></section>`;
      document.querySelector('main').appendChild(container);
      document.querySelector('#fixture-menu-toggle').onclick = () => {
        const menu = document.querySelector('#fixture-reused-menu');
        menu.hidden = !menu.hidden; menu.dataset.state = menu.hidden ? 'closed' : 'open';
      };
      document.querySelector('#fixture-disclosure').onclick = (event) => {
        const button = event.currentTarget, open = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(open)); document.querySelector('#fixture-output').hidden = !open;
      };
    });
    await install(settings('subtle'));
    for (let opening = 0; opening < 2; opening += 1) {
      await page.locator('#fixture-menu-toggle').click();
      await page.waitForFunction(() => document.querySelector('#fixture-reused-menu').getAttribute('data-dream-motion-enter') === 'menu');
      assert.equal(await page.locator('#fixture-reused-menu').evaluate((node) => getComputedStyle(node).animationName), 'dream-motion-highlight');
      await page.locator('#fixture-menu-toggle').click();
      await page.waitForFunction(() => !document.querySelector('#fixture-reused-menu').hasAttribute('data-dream-motion-enter'));
      await page.waitForFunction(() => !window.__CODEX_DREAM_SKIN_MOTION_STATE__.inspect().paused);
    }
    const edited = await page.evaluate(async () => {
      const node = document.querySelector('#fixture-reused-edit'), before = node.getBoundingClientRect().toJSON();
      document.querySelector('#fixture-edit-batch').setAttribute('data-content-search-unit-key', 'new-result');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return {entry:node.getAttribute('data-dream-motion-enter'), animation:getComputedStyle(node).animationName,
        before, after:node.getBoundingClientRect().toJSON()};
    });
    assert.equal(edited.entry, 'edited-card'); assert.equal(edited.animation, 'dream-motion-highlight');
    assert.deepEqual(edited.before, edited.after, 'a new batch cannot move or resize native content');
    await page.locator('#fixture-disclosure').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !window.__CODEX_DREAM_SKIN_MOTION_STATE__.inspect().paused);
    await page.waitForFunction(() => document.querySelector('#fixture-disclosure').getAttribute('data-dream-motion-feedback') === 'expanded');
    assert.equal(await page.locator('#fixture-output').isVisible(), true, 'keyboard activation must keep the original disclosure action');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#fixture-disclosure svg')).rotate === '90deg');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#fixture-output').isVisible(), false);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#fixture-disclosure svg')).rotate === 'none');
  });
}

async function paintedSample(page, selector, name, properties, pseudo = null) {
  return page.locator(selector).first().evaluate((node, {name, properties, pseudo}) => {
    const animation = node.getAnimations({subtree:true}).find((entry) => entry.animationName === name);
    const style = getComputedStyle(node, pseudo);
    const rect = node.getBoundingClientRect();
    return {time:animation?.currentTime, state:animation?.playState,
      visible:style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0,
      paint:properties.map((property) => style.getPropertyValue(property))};
  }, {name, properties, pseudo});
}

async function assertPlaying(page, selector, name, properties, pseudo = null, initialSample = null) {
  const before = initialSample || await paintedSample(page, selector, name, properties, pseudo);
  let after;
  const deadline = Date.now() + 1600;
  do {
    await page.waitForTimeout(80);
    after = await paintedSample(page, selector, name, properties, pseudo);
    if (after.time > before.time + 40 && JSON.stringify(after.paint) !== JSON.stringify(before.paint)) break;
  } while (Date.now() < deadline);
  assert.equal(before.visible && after.visible, true, `${name} must have a visible target`);
  assert.equal(before.state, 'running', `${name} must have a running timeline`);
  assert.equal(after.state, 'running', `${name} must remain running`);
  assert.ok(after.time > before.time + 40, `${name} currentTime must advance: ${before.time} -> ${after.time}`);
  assert.notDeepEqual(after.paint, before.paint, `${name} must change its rendered property, not just its clock`);
}

async function assertPseudoPaints(page, target, selector, pseudo) {
  await page.evaluate(() => {
    window.__fixtureRunningAnimations = document.getAnimations().filter((entry) => entry.playState === 'running');
    for (const animation of window.__fixtureRunningAnimations) animation.pause();
  });
  let hidden;
  try {
    const visible = await page.locator(target).screenshot();
    hidden = await page.addStyleTag({content:`${selector}${pseudo} {visibility:hidden!important;}`});
    const absent = await page.locator(target).screenshot();
    assert.ok(!visible.equals(absent), `${selector}${pseudo} must paint actual pixels above the wallpaper`);
  } finally {
    if (hidden) await hidden.evaluate((node) => node.remove());
    await page.evaluate(() => {
      for (const animation of window.__fixtureRunningAnimations) animation.play();
      delete window.__fixtureRunningAnimations;
    });
  }
}

async function beginTask(page) {
  assert.equal(await page.evaluate(() => {
    const motion = window.__CODEX_DREAM_SKIN_MOTION_STATE__;
    const task = {schemaVersion:1, taskId:'fixture-task', runId:'fixture-run', routeEpoch:motion.inspect().routeEpoch};
    return motion.bindTask(task) && motion.reportTaskState({...task, revision:1, state:'busy'});
  }), true);
}

async function assertNoSkinTimelines(page) {
  assert.deepEqual(await page.evaluate(() => document.getAnimations()
    .filter((animation) => /^(dream-|angel-)/.test(animation.animationName || ''))
    .filter((animation) => animation.playState === 'running')
    .map((animation) => animation.animationName)), []);
  await assertPlaying(page, '#native-spinner', 'native-fixture-spin', ['transform']);
}

async function assertAcrylicComposition(page, active) {
  const composition = await page.evaluate(() => {
    const character = document.querySelector('[data-dream-motion-role="background-character"]');
    const scene = character?.parentElement;
    const pseudo = getComputedStyle(document.body, '::before');
    const paints = (style) => style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0
      && style.backgroundImage !== 'none';
    return {marker:document.documentElement.getAttribute('data-dream-motion-wallpaper'),
      parentRole:scene?.getAttribute('data-dream-motion-role'),
      characterOpacity:character && Number(getComputedStyle(character).opacity),
      sceneOpacity:scene && Number(getComputedStyle(scene).opacity),
      scenes:[...document.querySelectorAll('[data-dream-motion-role="background-scene"]')]
        .map((node) => paints(getComputedStyle(node))),
      pseudoPaints:paints(pseudo)};
  });
  if (active) {
    assert.equal(composition.marker, 'acrylic');
    assert.equal(composition.parentRole, 'background-scene', 'the eye patch must composite inside the wallpaper layer');
    assert.equal(composition.characterOpacity, 1, 'eye pixels must replace the original iris before transparency is applied');
    assert.equal(composition.sceneOpacity, .18, 'wallpaper and eye patch share the configured Acrylic opacity');
    assert.deepEqual(composition.scenes, [true], 'only one owned wallpaper scene may paint');
    assert.equal(composition.pseudoPaints, false, 'the original wallpaper must not show through the replacement scene');
  } else {
    assert.notEqual(composition.marker, 'acrylic');
    assert.equal(composition.pseudoPaints, true, 'withdrawing motion must restore the original Acrylic wallpaper');
    assert.equal(composition.scenes.some(Boolean), false, 'the replacement scene must stop painting when withdrawn');
  }
}

async function assertWallpaperBlinkPaints(page, material, acrylicScene = true) {
  const eyelid = `${role('background-character')} [data-dream-motion-eyelid="closed"]`;
  await page.waitForFunction(() => document.querySelector('[data-dream-motion-role="background-character"]')
    ?.getAttribute('data-dream-motion-art-visible') === 'true');
  if (material === 'acrylic' && acrylicScene) await assertAcrylicComposition(page, true);
  // Hold unrelated decoration timelines still while comparing the actual
  // composited eye region. A CSS property changing behind an opaque native
  // panel must fail this pixel comparison.
  await page.evaluate(() => {for (const animation of document.getAnimations()) animation.pause();});
  const seekBlink = async (time) => page.locator(role('background-character')).evaluate(async (node, time) => {
    const animations = node.getAnimations({subtree:true}).filter((entry) => /^dream-motion-wallpaper-blink(?:-half)?$/.test(entry.animationName));
    if (animations.length !== 2) throw new Error('The inherited blink requires both half and closed frame timelines');
    await Promise.all(animations.map((animation) => animation.ready));
    for (const animation of animations) animation.currentTime = time;
  }, time);
  await seekBlink(0);
  const evidence = process.env.DREAM_SKIN_MOTION_EVIDENCE;
  const open = await page.locator(role('background-character')).screenshot(evidence ? {path:path.join(evidence, `${material}-wallpaper-open.png`)} : {});
  if (evidence) await page.screenshot({path:path.join(evidence, `${material}-wallpaper-open-scene.png`)});
  // Keep the inherited short gesture with a halved 5.7s interval: half at
  // 87..87.6%, closed at 87.8..90.2%, then half again at 90.4..91%.
  // Seek both frame animations together so an
  // independently frozen frame cannot accidentally satisfy the pixel proof.
  await seekBlink(4975);
  const half = await page.locator(role('background-character')).screenshot(evidence ? {path:path.join(evidence, `${material}-wallpaper-half.png`)} : {});
  if (evidence) await page.screenshot({path:path.join(evidence, `${material}-wallpaper-half-scene.png`)});
  await seekBlink(5073);
  const closed = await page.locator(role('background-character')).screenshot(evidence ? {path:path.join(evidence, `${material}-wallpaper-closed.png`)} : {});
  if (evidence) await page.screenshot({path:path.join(evidence, `${material}-wallpaper-closed-scene.png`)});
  assert.ok(!open.equals(closed), 'the actual wallpaper eye pixels must change between open and closed frames');
  assert.ok(!open.equals(half), 'the inherited half-closed frame must visibly change the original eyes');
  assert.ok(!half.equals(closed), 'the half-closed and fully closed frames must paint distinct eye shapes');
  await seekBlink(5175);
  const reopening = await page.locator(role('background-character')).screenshot();
  assert.ok(reopening.equals(half), 'the inherited opening half-frame must match its closing half-frame');
  const before = await page.locator(role('background-character')).evaluate((node) => {
    const animations = node.getAnimations({subtree:true}).filter((entry) => /^dream-motion-wallpaper-blink(?:-half)?$/.test(entry.animationName));
    for (const animation of animations) animation.currentTime = 5073;
    const animation = animations.find((entry) => entry.animationName === 'dream-motion-wallpaper-blink');
    const paint = [getComputedStyle(node.querySelector('[data-dream-motion-eyelid="closed"]')).opacity];
    for (const timeline of animations) timeline.play();
    return {time:animation.currentTime, state:animation.playState, visible:true, paint};
  });
  await assertPlaying(page, eyelid, 'dream-motion-wallpaper-blink', ['opacity'], null, before);
}

for (const material of ['system', 'acrylic']) {
  test(`Windows ${material}: modern Home presets leave the composer and Send control uncovered`, options, async (t) => {
    const {page, install} = await launch(t, material);
    await page.setContent(`<!doctype html><html><head><title>Modern Home layout fixture</title><style>
      html,body{margin:0;width:100%;height:100%}*{box-sizing:border-box}
      main{display:flex;height:100vh;min-width:0;position:fixed;inset:0}
      .fixture-home{display:flex;flex:1;min-height:0;flex-direction:column;align-items:center;justify-content:center;overflow:auto}
      .fixture-home>div{width:100%;display:flex;flex-direction:column;align-items:center}
      .composer-surface-chrome{width:calc(100% - 48px);padding:12px}
      textarea{display:block;width:100%;height:58px}footer{display:flex;justify-content:flex-end}
      </style></head><body><main class="main-surface" data-app-shell-main-surface="true">
      <div role="main" class="fixture-home"><div class="group/home-composer-layout"><span data-testid="home-icon">◇</span>
      <h1>What will you build today?</h1><section class="composer-surface-chrome"><textarea id="home-prompt" aria-label="Prompt"></textarea>
      <footer data-composer-footer-responsive><button id="home-send">Send</button></footer></section></div></div></main></body></html>`);
    await install(settings());
    for (const viewport of [{width:1366,height:900}, {width:520,height:780}, {width:760,height:600}]) {
      await page.setViewportSize(viewport); await page.waitForTimeout(220);
      const geometry = await page.evaluate(() => {
        const deck = document.querySelector('#codex-dream-skin-presets').getBoundingClientRect();
        const composer = document.querySelector('.composer-surface-chrome').getBoundingClientRect();
        return {separated:deck.bottom <= composer.top, controls:['home-prompt', 'home-send'].map((id) => {
          const node = document.getElementById(id), box = node.getBoundingClientRect();
          const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
          return {id, inView:box.x >= 0 && box.y >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
            hit:hit === node || node.contains(hit)};
        })};
      });
      assert.equal(geometry.separated, true, `Home presets must stay above the composer at ${JSON.stringify(viewport)}`);
      assert.ok(geometry.controls.every((control) => control.inView && control.hit), JSON.stringify(geometry.controls));
      await page.locator('#home-prompt').fill('Uncovered native composer');
      assert.equal(await page.locator('#home-prompt').inputValue(), 'Uncovered native composer');
    }
  });

  test(`Windows ${material}: background character paints animated eyelids after resize and reinjection`, options, async (t) => {
    const {page, install} = await launch(t, material);
    let previousBox;
    const height = material === 'acrylic' ? 720 : 800;
    for (const viewport of [{width:1280,height}, {width:1440,height}]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      await assertWallpaperBlinkPaints(page, material);
      const box = await page.locator(role('background-character')).boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height,
        'the registered face overlay must stay inside the visible wallpaper');
      if (previousBox) assert.notDeepEqual(box, previousBox, 'resizing must reproject the eyelids with the wallpaper');
      previousBox = box;
    }
    // In this fixture the real generated command cards cover the face at the
    // taller size. Eye overlays must withdraw rather than paint over buttons.
    await page.setViewportSize({width:1600,height:1000});
    await page.waitForFunction(() => document.querySelector('[data-dream-motion-role="background-character"]')
      ?.getAttribute('data-dream-motion-art-visible') === 'false');
    assert.equal(await page.locator(`${role('background-character')} [data-dream-motion-eyelid="closed"]`)
      .evaluate((node) => getComputedStyle(node).animationPlayState), 'paused');
    if (material === 'acrylic') await assertAcrylicComposition(page, false);
    await page.setViewportSize({width:1280,height});
    await assertWallpaperBlinkPaints(page, material);
    await page.locator(role('background-character')).evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      const blocker = document.createElement('button');
      blocker.id = 'fixture-face-control';
      blocker.setAttribute('aria-label', 'Native control over the wallpaper face');
      Object.assign(blocker.style, {position:'fixed', zIndex:'99', left:`${bounds.left}px`, top:`${bounds.top}px`,
        width:`${bounds.width}px`, height:`${bounds.height}px`});
      document.body.append(blocker);
    });
    await page.waitForFunction(() => document.querySelector('[data-dream-motion-role="background-character"]')
      ?.getAttribute('data-dream-motion-art-visible') === 'false');
    if (material === 'acrylic') await assertAcrylicComposition(page, false);
    await page.locator('#fixture-face-control').evaluate((node) => {node.hidden = true;});
    await page.waitForFunction(() => document.querySelector('[data-dream-motion-role="background-character"]')
      ?.getAttribute('data-dream-motion-art-visible') === 'true');
    await page.locator('#fixture-face-control').evaluate((node) => {node.style.left = '-10000px'; node.hidden = false;});
    await page.waitForFunction(() => document.querySelector('[data-dream-motion-role="background-character"]')
      ?.getAttribute('data-dream-motion-art-visible') === 'true');
    await page.locator('#fixture-face-control').evaluate((node) => {
      node.style.left = `${document.querySelector('[data-dream-motion-role="background-character"]').getBoundingClientRect().left}px`;
    });
    await page.waitForFunction(() => document.querySelector('[data-dream-motion-role="background-character"]')
      ?.getAttribute('data-dream-motion-art-visible') === 'false');
    await page.locator('#fixture-face-control').evaluate((node) => node.classList.add('fixture-control-hidden'));
    await page.waitForFunction(() => document.querySelector('[data-dream-motion-role="background-character"]')
      ?.getAttribute('data-dream-motion-art-visible') === 'true');
    await page.locator('#fixture-face-control').evaluate((node) => node.classList.remove('fixture-control-hidden'));
    await page.waitForFunction(() => document.querySelector('[data-dream-motion-role="background-character"]')
      ?.getAttribute('data-dream-motion-art-visible') === 'false');
    await page.locator('#fixture-face-control').evaluate((node) => node.remove());
    const oldLayer = await page.locator(role('background-character')).elementHandle();
    await install(settings());
    assert.equal(await oldLayer.evaluate((node) => node.isConnected), false, 'reinjection removes the previous eye layer');
    assert.equal(await page.locator(role('background-character')).count(), 1, 'reinjection creates only one eye layer');
    await assertWallpaperBlinkPaints(page, material);
    if (material === 'acrylic') {
      await page.locator('textarea').evaluate((node) => node.dispatchEvent(new CompositionEvent('compositionstart', {bubbles:true})));
      await assertAcrylicComposition(page, false);
      await page.locator('textarea').evaluate((node) => node.dispatchEvent(new CompositionEvent('compositionend', {bubbles:true})));
      await page.waitForFunction(() => document.querySelector('[data-dream-motion-role="background-character"]')
        ?.getAttribute('data-dream-motion-art-visible') === 'true');
      await assertAcrylicComposition(page, true);
    }
    for (const value of [settings('off'), settings('subtle'), settings('full', {character:false})]) {
      await install(value);
      assert.equal(await page.locator(role('background-character')).count(), 0, 'disabled character modes must remove the eye layer');
      if (material === 'acrylic') await assertAcrylicComposition(page, false);
    }
  });

  test(`Windows ${material}: legacy home decorations play through the complete CSS cascade`, options, async (t) => {
    const {page, install} = await launch(t, material);
    await page.setViewportSize({width:1600,height:1000});
    const chrome = '#codex-dream-skin-chrome';
    await page.waitForFunction(() => document.querySelector('#codex-dream-skin-chrome').getBoundingClientRect().width > 1500);
    await page.waitForTimeout(500); // Resize observers finish changing legacy art eligibility.
    await assertPlaying(page, `${chrome} .dream-angel-live-ticker > span`, 'dream-angel-ticker', ['transform']);
    await assertPlaying(page, `${chrome} .dream-angel-now-playing`, 'dream-record-spin', ['rotate'], '::after');
    await assertPlaying(page, `${chrome} .dream-angel-now-playing > i`, 'dream-equalizer', ['transform']);
    await install(settings('full', {character:false}));
    assert.equal(await page.locator(`${chrome} .dream-angel-face-orbit`).evaluate((node) => getComputedStyle(node).display), 'none');
    assert.equal(await page.locator(`${chrome} .dream-angel-face-orbit`).evaluate((node) => getComputedStyle(node, '::before').animationName), 'none');
    await assertPlaying(page, `${chrome} .dream-angel-now-playing`, 'dream-record-spin', ['rotate'], '::after');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(() => document.documentElement.getAttribute('data-dream-motion') === 'off');
    await assertNoSkinTimelines(page);
  });

  test(`Windows ${material}: existing bounded motion paints changing frames`, options, async (t) => {
    const {page} = await launch(t, material);
    await assertPlaying(page, role('character'), 'dream-motion-character', ['translate']);
    await assertPlaying(page, role('ambient'), 'dream-motion-ambient', ['opacity']);
    await assertPlaying(page, role('ambient'), 'dream-signal-pulse', ['opacity', 'translate'], '::before');
    await assertPlaying(page, `${role('ambient')} > [data-dream-motion-index="1"]`,
      'dream-chat-drift', ['opacity', 'translate'], '::after');
    await assertPlaying(page, `${role('ambient')} > [data-dream-motion-index="0"]`,
      'dream-record-spin', ['rotate'], '::before');
    await assertPlaying(page, `${role('ambient')} > [data-dream-motion-index="0"]`,
      'dream-equalizer', ['transform'], '::after');
    await assertPlaying(page, role('ambient'), 'dream-heartbeat-scan', ['opacity'], '::after');
    await assertPlaying(page, role('character'), 'dream-angel-orbit-spin', ['rotate'], '::before');
    for (const [selector, pseudo] of [[role('ambient'), '::before'], [role('ambient'), '::after'],
      [`${role('ambient')} > [data-dream-motion-index="0"]`, '::before'],
      [`${role('ambient')} > [data-dream-motion-index="0"]`, '::after'],
      [`${role('ambient')} > [data-dream-motion-index="1"]`, '::after']]) {
      await assertPseudoPaints(page, role('ambient'), selector, pseudo);
    }
    await assertPseudoPaints(page, role('character'), role('character'), '::before');
    assert.equal(await page.evaluate(() => {
      const ambient = document.querySelector('[data-dream-motion-role="ambient"]');
      const bounds = ambient.getBoundingClientRect();
      const within = (node, pseudo, maxScale = 1, rotating = false) => {
        const box = node.getBoundingClientRect(), style = getComputedStyle(node, pseudo);
        const width = parseFloat(style.width), height = parseFloat(style.height);
        const x = box.left - bounds.left + parseFloat(style.left), y = box.top - bounds.top + parseFloat(style.top);
        if (rotating) {
          const radius = Math.hypot(width, height) / 2;
          return x + width / 2 - radius >= 0 && y + height / 2 - radius >= 0
            && x + width / 2 + radius <= bounds.width && y + height / 2 + radius <= bounds.height;
        }
        return x >= 0 && y - (maxScale - 1) * height >= 0
          && x + width <= bounds.width && y + height <= bounds.height;
      };
      const star = ambient.querySelector('[data-dream-motion-index="0"]');
      return within(ambient, '::before') && within(ambient, '::after')
        && within(star, '::before', 1, true) && within(star, '::after', 1.5);
    }), true, 'migrated broadcast animations fit inside the existing collision-checked envelope throughout playback');
    if (process.env.DREAM_SKIN_MOTION_EVIDENCE) {
      await page.locator(role('ambient')).screenshot({path:path.join(process.env.DREAM_SKIN_MOTION_EVIDENCE, `${material}-compact-broadcast.png`)});
      await page.screenshot({path:path.join(process.env.DREAM_SKIN_MOTION_EVIDENCE, `${material}-compact-broadcast-scene.png`)});
    }
    await beginTask(page);
    await assertPlaying(page, role('status'), 'dream-motion-signal', ['opacity', 'scale'], '::after');
    await assertPlaying(page, '#native-spinner', 'native-fixture-spin', ['transform']);
  });

  test(`Windows ${material}: preferences, reduced motion, IME and visibility stop and resume playback`, options, async (t) => {
    const {page, install} = await launch(t, material);
    for (const mode of ['off', 'subtle']) {
      await install(settings(mode));
      await page.waitForTimeout(420); // Let permitted one-shot entry feedback finish in subtle mode.
      await assertNoSkinTimelines(page);
    }
    await install(settings());
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(() => document.documentElement.getAttribute('data-dream-motion') === 'off');
    await assertNoSkinTimelines(page);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(() => document.documentElement.getAttribute('data-dream-motion') === 'full');
    await assertPlaying(page, role('character'), 'dream-motion-character', ['translate']);

    await page.locator('textarea').evaluate((node) => node.dispatchEvent(new CompositionEvent('compositionstart', {bubbles:true, data:'中'})));
    assert.equal(await page.evaluate(() => window.__CODEX_DREAM_SKIN_MOTION_STATE__.inspect().paused), true);
    await assertNoSkinTimelines(page);
    await page.locator('textarea').evaluate((node) => node.dispatchEvent(new CompositionEvent('compositionend', {bubbles:true, data:'中文'})));
    await assertPlaying(page, role('character'), 'dream-motion-character', ['translate']);

    // Drive the controller's visibility lifecycle without assuming how a
    // particular headless browser maps tabs to an OS foreground window.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {configurable:true, get:() => true});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await assertNoSkinTimelines(page);
    await page.evaluate(() => {delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));});
    await assertPlaying(page, role('character'), 'dream-motion-character', ['translate']);
  });
}

test('Windows Acrylic: reduced transparency and forced colors keep opaque wallpaper blinking', options, async (t) => {
  const {page} = await launch(t, 'acrylic');
  await page.setViewportSize({width:1280,height:720});
  const cdp = await page.context().newCDPSession(page);
  for (const feature of ['prefers-reduced-transparency', 'forced-colors']) {
    await cdp.send('Emulation.setEmulatedMedia', {features:[
      {name:'prefers-reduced-motion', value:'no-preference'},
      {name:feature, value:feature === 'forced-colors' ? 'active' : 'reduce'},
    ]});
    await page.waitForFunction(() => getComputedStyle(document.body, '::before').display === 'none'
      && document.documentElement.getAttribute('data-dream-motion-wallpaper') !== 'acrylic'
      && !document.querySelector('[data-dream-motion-role="background-scene"]')
      && document.querySelector('[data-dream-motion-role="background-character"]')?.getAttribute('data-dream-motion-art-visible') === 'true');
    await assertWallpaperBlinkPaints(page, 'acrylic', false);
    const projection = await page.evaluate(() => {
      const body = getComputedStyle(document.body), pseudo = getComputedStyle(document.body, '::before');
      const box = document.body.getBoundingClientRect();
      return {attachment:body.backgroundAttachment, image:body.backgroundImage.slice(0, 12),
        box:[box.x, box.y, box.width, box.height], viewport:[innerWidth, innerHeight], pseudo:pseudo.display,
        marker:document.documentElement.getAttribute('data-dream-motion-wallpaper'),
        transparency:matchMedia('(prefers-reduced-transparency: reduce)').matches,
        forced:matchMedia('(forced-colors: active)').matches};
    });
    assert.equal(await page.locator(role('background-scene')).count(), 0, `opaque ${feature} fallback must use the body wallpaper: ${JSON.stringify(projection)}`);
    assert.equal(await page.evaluate(() => window.__CODEX_DREAM_SKIN_MOTION_STATE__.inspect().mode), 'full');
    await cdp.send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion', value:'no-preference'}]});
    await page.waitForFunction(() => document.documentElement.getAttribute('data-dream-motion-wallpaper') === 'acrylic');
    await assertAcrylicComposition(page, true);
  }
});
