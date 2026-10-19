import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import test from 'node:test';
import {cacheableCssPredicateManifest, createCssPredicateCache} from './css-predicate-cache.mjs';

const css = await readFile(new URL('../runtime/internet-angel-extension.css', import.meta.url), 'utf8');
const baseCss = await readFile(new URL('../windows/assets/dream-skin.css', import.meta.url), 'utf8');
const script = (await readFile(new URL('../runtime/internet-angel-extension.js', import.meta.url), 'utf8'))
  .replace('__INTERNET_ANGEL_EXTENSION_ENABLED_JSON__', 'true');
const carrier = 'button[class*="navigation-row"]:not(*)';
const original = ':has(> button[class*="navigation-row"])';
const baseline = css.replace(carrier, original);
const root = '<html class="codex-dream-skin dream-theme-dark" data-dream-skin="active" data-dream-theme="internet-angel" data-dream-shell="dark">';
const browserOptions = {skip: process.env.DREAM_SKIN_TURN_RAIL_BROWSER !== '1'
  ? 'opt in with DREAM_SKIN_TURN_RAIL_BROWSER=1 and installed Playwright/Chromium' : false};

function launch() {
  const require = createRequire(import.meta.url);
  const {chromium} = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
  return chromium.launch({headless:true, ...(process.env.DREAM_SKIN_BROWSER_EXECUTABLE
    ? {executablePath:process.env.DREAM_SKIN_BROWSER_EXECUTABLE} : {})});
}

test('turn rail glow uses its registered marker with unchanged selector specificity', () => {
  assert.equal(css.split(carrier).length - 1, 1);
  assert.ok(!css.includes(original));
  assert.match(css, /\[data-angel-component="turn-nav-rail"\],\s*button\[class\*="navigation-row"\]:not\(\*\)\s*\)\s*\{\s*filter: drop-shadow\(0 0 4px rgb\(32 84 255 \/ \.34\)\);/);
  // Both the original :has(button[attribute]) and impossible branch contribute
  // one attribute and one type; :not(*) contributes zero specificity.
  assert.match(script, /mark\(row\.parentElement, "turn-nav-rail"\)/);
  assert.match(script, /selectors\.turnRow,/);
});

test('real classifier retains initial/mounted rail glow, cleanup and cascade precedence', browserOptions, async () => {
  const browser = await launch();
  try {
    const snapshots = [];
    for (const sheet of [baseline, css]) {
      const page = await browser.newPage();
      await page.setContent(root + '<head></head><body><main class="main-surface"><div id="rail"><button class="navigation-row"><span>Turn</span></button></div><div id="later"></div></main></body></html>');
      await page.addStyleTag({content:sheet});
      await page.addScriptTag({content:script});
      const initial = await page.evaluate(() => ({mark:document.getElementById('rail').dataset.angelComponent,
        filter:getComputedStyle(document.getElementById('rail')).filter}));
      assert.equal(initial.mark, 'turn-nav-rail');
      assert.match(initial.filter, /^drop-shadow\(/);
      await page.evaluate(() => {document.getElementById('later').innerHTML = '<button class="navigation-row"><span>Mounted turn</span></button>';});
      await page.waitForFunction(() => document.getElementById('later').dataset.angelComponent === 'turn-nav-rail', null, {timeout:2000});
      const mounted = await page.evaluate(() => getComputedStyle(document.getElementById('later')).filter);
      assert.equal(mounted, initial.filter);
      await page.evaluate(() => {document.querySelector('#later button').remove();});
      await page.waitForFunction(() => !document.getElementById('later').hasAttribute('data-angel-component'), null, {timeout:2000});
      assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('later')).filter), 'none');
      const cascade = await page.evaluate(() => {
        const rail = document.getElementById('rail');
        const theme = document.querySelector('style');
        const competition = document.createElement('style');
        // Same specificity as the old and new rail rule, and matches the marker.
        competition.textContent = 'html[data-dream-skin="active"][data-dream-theme="internet-angel"] :is([data-angel-component="turn-nav-rail"],button[data-never]:not(*)){filter:drop-shadow(1px 2px 3px red)}';
        theme.before(competition);
        const before = getComputedStyle(rail).filter;
        document.head.append(competition);
        const after = getComputedStyle(rail).filter;
        competition.textContent = '#rail{filter:drop-shadow(2px 3px 4px blue)}';
        theme.before(competition);
        const higher = getComputedStyle(rail).filter;
        competition.remove();
        window.__CODEX_INTERNET_ANGEL_EXTENSION_STATE__.cleanup();
        return {before, after, higher, cleaned:!rail.hasAttribute('data-angel-component'), cleanedFilter:getComputedStyle(rail).filter};
      });
      assert.equal(cascade.before, initial.filter, 'later skin rule wins equal specificity');
      assert.notEqual(cascade.after, initial.filter, 'later author rule wins equal specificity');
      assert.match(cascade.higher, /rgb\(0, 0, 255\)/, 'higher specificity wins even before skin');
      assert.equal(cascade.cleaned, true);
      // Old structural fallback still glows after cleanup; new CSS deliberately
      // waits for its owner to classify, consistent with other marker styling.
      if(sheet === css) assert.equal(cascade.cleanedFilter, 'none', 'teardown removes the owner-controlled rail glow');
      else assert.equal(cascade.cleanedFilter, initial.filter, 'baseline structural fallback still matches without its owner');
      const {cleanedFilter, ...commonCascade}=cascade;
      snapshots.push({initial, mounted, cascade:commonCascade});
      await page.close();
    }
    assert.deepEqual(snapshots[1], snapshots[0]);
  } finally {await browser.close();}
});

test('isolated editor mutations avoid global turn-rail ancestor invalidation', browserOptions, async () => {
  const browser = await launch();
  const evidence = [];
  try {
    for (const [variant, extension] of [['baseline', baseline], ['marked', css]]) {
      let sheet = baseCss + '\n' + extension;
      const manifest = cacheableCssPredicateManifest(sheet);
      for (const item of manifest) sheet = sheet.replaceAll(item.selector, item.replacement);
      const page = await browser.newPage({viewport:{width:1600,height:1000}});
      await page.setContent(root + '<head></head><body><aside data-ds-part="sidebar"></aside><main class="main-surface" data-ds-part="main"><div role="main"><section id="messages"></section><section data-ds-part="composer" data-angel-component="composer"><div class="ProseMirror" contenteditable="true"><p id="editing">Edit</p></div></section></div></main></body></html>');
      const nodeCount = await page.evaluate(({sheet, manifest, factory}) => {
        for (let i=0; i<150; i++) {
          const row=document.createElement('article');row.dataset.angelComponent='message-assistant';let parent=row;
          for(let j=0;j<12;j++){const child=document.createElement('div');parent.append(child);parent=child;}
          parent.innerHTML='<p>Message <span>text</span></p><p>Another <code>fragment</code></p>';document.getElementById('messages').append(row);
        }
        const style=document.createElement('style');style.textContent=sheet;document.head.append(style);
        const cache=eval('('+factory+')')(document,manifest);cache.refresh();cache.syncLightRules(style.sheet);
        const calm=document.createElement('style');calm.textContent='*,:before,:after{animation:none!important;transition:none!important} main{width:1200px!important} #messages{height:700px;overflow:auto} .ProseMirror{min-height:40px;width:700px}';document.head.append(calm);
        document.body.getBoundingClientRect();return document.querySelectorAll('*').length;
      }, {sheet, manifest, factory:createCssPredicateCache.toString()});
      const cdp=await page.context().newCDPSession(page);
      const styles=[];let tracing=false;let timeout;
      cdp.on('Tracing.dataCollected', ({value}) => {
        for(const event of value) if(event.name==='UpdateLayoutTree') styles.push({ms:(event.dur||0)/1000,
          elements:event.args?.elementCount ?? event.args?.beginData?.elementCount ?? event.args?.data?.elementCount ?? 0});
      });
      const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete', resolve));
      try {
        await cdp.send('Tracing.start', {transferMode:'ReportEvents', traceConfig:{recordMode:'recordUntilFull',traceBufferSizeInKb:16384,includedCategories:['devtools.timeline']}});tracing=true;
        const durations=await page.evaluate(() => {
          const editor=document.querySelector('.ProseMirror');const paragraph=document.getElementById('editing');const runs=[];
          for(let i=0;i<15;i++){
            const started=performance.now();const span=document.createElement('span');span.textContent='x';paragraph.append(span);editor.getBoundingClientRect();
            const range=document.createRange();range.selectNodeContents(paragraph);range.collapse(false);window.getSelection().removeAllRanges();window.getSelection().addRange(range);editor.getBoundingClientRect();
            span.remove();editor.getBoundingClientRect();runs.push(performance.now()-started);
          }return runs;
        });
        await cdp.send('Tracing.end');tracing=false;
        await Promise.race([complete,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('turn-rail trace completion exceeded 15 seconds')),15000);})]);
        const sorted=styles.map(x=>x.elements).sort((a,b)=>a-b);
        evidence.push({variant,nodeCount,styles,durations,medianElements:sorted[Math.floor(sorted.length/2)]});
      } finally {
        clearTimeout(timeout);
        if(tracing) await cdp.send('Tracing.end').catch(()=>{});
        await cdp.detach().catch(()=>{});await page.close();
      }
    }
    if(process.env.DREAM_SKIN_TURN_RAIL_EVIDENCE) await writeFile(process.env.DREAM_SKIN_TURN_RAIL_EVIDENCE, JSON.stringify(evidence,null,2));
    assert.ok(evidence[0].styles.length>=30 && evidence[1].styles.length>=30, 'actual style recalculation events required');
    assert.ok(evidence[0].medianElements>=10, 'baseline must reproduce ancestor invalidation');
    assert.ok(evidence[1].medianElements<=2, 'edited content must not invalidate the editor ancestor chain');
  } finally {await browser.close();}
});
