import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import test from 'node:test';

const css = await readFile(new URL('../runtime/internet-angel-extension.css', import.meta.url), 'utf8');
const script = (await readFile(new URL('../runtime/internet-angel-extension.js', import.meta.url), 'utf8'))
  .replace('__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__', 'true');
const browserOptions = {skip: process.env.DREAM_SKIN_TRANSPARENCY_BROWSER !== '1'
  ? 'opt in with DREAM_SKIN_TRANSPARENCY_BROWSER=1 and installed Playwright/Chromium' : false};
const components = ['sidebar', 'composer', 'environment', 'settings-sidebar', 'settings-content',
  'terminal-panel', 'activity-output', 'side-workspace', 'summary-panel'];
const variables = `html {--dream-text:#fff7ff;--ds-text:#fff7ff;--dream-surface:#1a174b;
  --ds-panel:#1a174b;--dream-surface-raised:#312574;--ds-panel-2:#312574;
  --dream-accent:#ff45c8;--ds-green:#ff45c8;--dream-muted:#bbb5d8;--ds-muted:#bbb5d8;}
  body {margin:24px;background:#6e86ad;display:grid;grid-template-columns:repeat(3,240px);gap:30px;}
  [data-probe] {position:relative!important;display:block!important;box-sizing:border-box!important;
    width:240px!important;height:100px!important;padding:12px!important;transform:none!important;}
  *,*::before,*::after {animation:none!important;transition:none!important;}`;

async function launch() {
  const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  return chromium.launch({headless:true, ...(process.env.DREAM_SKIN_BROWSER_EXECUTABLE
    ? {executablePath:process.env.DREAM_SKIN_BROWSER_EXECUTABLE} : {})});
}
async function prepare(page, sheet, light) {
  await page.setContent(`<html class="codex-dream-skin ${light ? 'dream-theme-light' : 'dream-theme-dark'}"
    data-dream-skin="active" data-dream-theme="internet-angel" data-dream-shell="${light ? 'light' : 'dark'}">
    <head></head><body></body></html>`);
  await page.addStyleTag({content:sheet});
  await page.addStyleTag({content:variables});
  await page.evaluate((components) => {
    for (const component of components) {
      const node = document.createElement(component.includes('sidebar') ? 'aside' : 'section');
      node.dataset.angelComponent = component;
      node.dataset.probe = component;
      node.innerHTML = '<strong>Native text</strong><p>Theme controls remain readable</p>';
      document.body.append(node);
    }
  }, components);
}
async function foreground(page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-probe]')].map((node) => {
    const style = getComputedStyle(node);
    return [style.color, style.opacity, style.fontSize, style.fontFamily,
      node.getBoundingClientRect().width, node.getBoundingClientRect().height];
  }));
}

test('personal transparency preserves the existing appearance and changes panel paint only', browserOptions, async () => {
  const baseline = execFileSync('git', ['show', 'v1.6.0:runtime/internet-angel-extension.css'],
    {cwd:new URL('../', import.meta.url), encoding:'utf8'});
  const browser = await launch();
  try {
    for (const light of [false, true]) {
      const original = await browser.newPage({viewport:{width:900,height:600}});
      const candidate = await browser.newPage({viewport:{width:900,height:600}});
      await prepare(original, baseline, light);
      await prepare(candidate, css, light);
      const before = await foreground(candidate);
      assert.deepEqual(before, await foreground(original), 'no preference preserves foreground and geometry');
      assert.ok((await candidate.screenshot()).equals(await original.screenshot()),
        'no preference must preserve the original painted theme');
      for (const transparency of [0, 30, 100]) {
        await candidate.evaluate((value) => {
          document.documentElement.setAttribute('data-dream-user-transparency', 'true');
          document.documentElement.style.setProperty('--ds-user-surface-alpha', String((100-value)/100));
        }, transparency);
        assert.deepEqual(await foreground(candidate), before, 'transparency must not fade text or controls');
        if (transparency === 100) {
          const transparent = await candidate.screenshot();
          await candidate.evaluate(() => {
            for (const node of document.querySelectorAll('[data-probe]')) {
              node.style.setProperty('background', 'transparent', 'important');
            }
          });
          assert.ok((await candidate.screenshot()).equals(transparent),
            '100% transparency leaves no hidden opaque panel background');
        }
      }
      await original.close();
      await candidate.close();
    }
  } finally {await browser.close();}
});

test('diff shadow backgrounds inherit personal transparency and retain foreground', browserOptions, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<html data-dream-skin="active" data-dream-theme="internet-angel"><body><main class="main-surface"><diffs-container></diffs-container></main></body></html>');
    await page.addStyleTag({content:css+'\n'+variables});
    await page.evaluate(() => document.querySelector('diffs-container').attachShadow({mode:'open'})
      .innerHTML = '<pre id="code"><code>synthetic diff</code></pre>');
    await page.addScriptTag({content:script});
    await page.waitForFunction(() => document.querySelector('diffs-container').shadowRoot.querySelector('style[data-internet-angel-diff-theme]'));
    const samples = [];
    for (const transparency of [0, 30, 100]) {
      samples.push(await page.evaluate((value) => {
        document.documentElement.setAttribute('data-dream-user-transparency', 'true');
        document.documentElement.style.setProperty('--ds-user-surface-alpha', String((100-value)/100));
        const host = document.querySelector('diffs-container');
        const context = document.createElement('canvas').getContext('2d');
        context.fillStyle = getComputedStyle(host).backgroundColor;
        context.fillRect(0,0,1,1);
        return {alpha:context.getImageData(0,0,1,1).data[3], color:getComputedStyle(host).color};
      }, transparency));
    }
    assert.deepEqual(samples.map((sample) => sample.alpha), [255,179,0]);
    assert.equal(new Set(samples.map((sample) => sample.color)).size, 1);
    await page.evaluate(() => window.__CODEX_INTERNET_ANGEL_EXTENSION_STATE__.cleanup());
    assert.equal(await page.locator('diffs-container').evaluate((host) =>
      host.shadowRoot.querySelectorAll('style[data-internet-angel-diff-theme]').length), 0);
  } finally {await browser.close();}
});
