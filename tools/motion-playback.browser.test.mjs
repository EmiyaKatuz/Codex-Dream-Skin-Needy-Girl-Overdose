import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {loadPayload} from '../windows/scripts/injector.mjs';

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
  #native-spinner {animation:native-fixture-spin 1s linear infinite;width:16px;height:16px}</style>
  </head><body><main class="main-surface" data-app-shell-main-surface="true" style="position:fixed;inset:0">
  <section data-testid="home-icon" style="position:absolute;left:320px;top:150px;width:200px;height:80px">Home fixture</section>
  <section class="composer-surface-chrome" style="position:absolute;left:320px;top:500px;width:400px;height:100px">
  <textarea aria-label="Prompt">Native prompt fixture</textarea><svg id="native-spinner" viewBox="0 0 16 16"><path d="M8 1L8 5"/></svg>
  </section></main></body></html>`;

async function launch(t, material = 'system') {
  const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'dream-motion-browser-'));
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
    const loaded = await loadPayload(undefined, null, material, {motionSettingsPath:preferences});
    await page.evaluate(loaded.payload);
    await page.waitForFunction(() => window.__CODEX_DREAM_SKIN_MOTION_STATE__);
    return loaded;
  };
  await install();
  await page.waitForFunction(() => document.documentElement.getAttribute('data-dream-motion-paused') === 'false');
  return {page, install};
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

async function assertWallpaperBlinkPaints(page, material) {
  const eyelid = `${role('background-character')} [data-dream-motion-eyelid]`;
  await page.waitForFunction(() => document.querySelector('[data-dream-motion-role="background-character"]')
    ?.getAttribute('data-dream-motion-art-visible') === 'true');
  if (material === 'acrylic') await assertAcrylicComposition(page, true);
  // Hold unrelated decoration timelines still while comparing the actual
  // composited eye region. A CSS property changing behind an opaque native
  // panel must fail this pixel comparison.
  await page.evaluate(() => {for (const animation of document.getAnimations()) animation.pause();});
  await page.locator(eyelid).evaluate(async (node) => {
    const animation = node.getAnimations().find((entry) => entry.animationName === 'dream-motion-wallpaper-blink');
    await animation.ready;
    animation.currentTime = 0;
  });
  const evidence = process.env.DREAM_SKIN_MOTION_EVIDENCE;
  const open = await page.locator(role('background-character')).screenshot(evidence ? {path:path.join(evidence, `${material}-wallpaper-open.png`)} : {});
  if (evidence) await page.screenshot({path:path.join(evidence, `${material}-wallpaper-open-scene.png`)});
  await page.locator(eyelid).evaluate((node) => {
    node.getAnimations().find((entry) => entry.animationName === 'dream-motion-wallpaper-blink').currentTime = 3000;
  });
  const closed = await page.locator(role('background-character')).screenshot(evidence ? {path:path.join(evidence, `${material}-wallpaper-closed.png`)} : {});
  if (evidence) await page.screenshot({path:path.join(evidence, `${material}-wallpaper-closed-scene.png`)});
  assert.ok(!open.equals(closed), 'the actual wallpaper eye pixels must change between open and closed frames');
  const before = await page.locator(eyelid).evaluate((node) => {
    const animation = node.getAnimations().find((entry) => entry.animationName === 'dream-motion-wallpaper-blink');
    animation.currentTime = 2980;
    const paint = [getComputedStyle(node).opacity];
    animation.play();
    return {time:animation.currentTime, state:animation.playState, visible:true, paint};
  });
  await assertPlaying(page, eyelid, 'dream-motion-wallpaper-blink', ['opacity'], null, before);
}

for (const material of ['system', 'acrylic']) {
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
    assert.equal(await page.locator(`${role('background-character')} [data-dream-motion-eyelid]`)
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
    const {page} = await launch(t, material);
    await page.setViewportSize({width:1600,height:1000});
    const chrome = '#codex-dream-skin-chrome';
    await page.waitForFunction(() => document.querySelector('#codex-dream-skin-chrome').getBoundingClientRect().width > 1500);
    await page.waitForTimeout(500); // Resize observers finish changing legacy art eligibility.
    await assertPlaying(page, `${chrome} .dream-angel-live-ticker > span`, 'dream-angel-ticker', ['transform']);
    await assertPlaying(page, `${chrome} .dream-angel-now-playing`, 'dream-record-spin', ['rotate'], '::after');
    await assertPlaying(page, `${chrome} .dream-angel-now-playing > i`, 'dream-equalizer', ['transform']);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(() => document.documentElement.getAttribute('data-dream-motion') === 'off');
    await assertNoSkinTimelines(page);
  });

  test(`Windows ${material}: existing bounded motion paints changing frames`, options, async (t) => {
    const {page} = await launch(t, material);
    await assertPlaying(page, role('character'), 'dream-motion-character', ['translate']);
    await assertPlaying(page, role('ambient'), 'dream-motion-ambient', ['opacity']);
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
