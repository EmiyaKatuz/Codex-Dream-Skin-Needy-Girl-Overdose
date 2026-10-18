import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import test from 'node:test';
import {createCssPredicateCache} from './css-predicate-cache.mjs';
const css=await readFile(new URL("../runtime/internet-angel-extension.css",import.meta.url),"utf8");
const gateMarker="@media (dream-skin-internet-angel-light), all {";
const gateAt=css.indexOf(gateMarker);
const baseline=css.slice(0,gateAt)+css.slice(gateAt+gateMarker.length).replace(/\}\s*$/,"");
test('light-only descendant rules are guarded by a private media rule without rewriting selectors',()=>{
 assert.ok(gateAt>css.indexOf('/* Light mode uses adaptive text'));
 assert.equal(css.split(gateMarker).length,2);
 const tail=css.slice(gateAt+gateMarker.length).trim();
 assert.ok(tail.startsWith('html[data-dream-skin="active"][data-dream-theme="internet-angel"]:is(.dream-theme-light, [data-dream-shell="light"])'));
 assert.match(tail,/\}\s*\}$/);
 assert.ok(baseline.includes('[data-angel-component] :where(button, a, p, span, div, li, h1, h2, h3, h4, h5, h6, label, td, th)'));
});

const browserOptions={skip:process.env.DREAM_SKIN_MEDIA_GATE_BROWSER!=='1'?'opt in with DREAM_SKIN_MEDIA_GATE_BROWSER=1 and installed Playwright/Chromium':false};
test('isolated Chromium synchronizes and restores adopted sheets after replacement',browserOptions,async()=>{
 const require=createRequire(import.meta.url);
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
 const browser=await chromium.launch({headless:true,...(process.env.DREAM_SKIN_BROWSER_EXECUTABLE?{executablePath:process.env.DREAM_SKIN_BROWSER_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage();await page.setContent('<html class="codex-dream-skin dream-theme-dark" data-dream-shell="dark"><body><div data-angel-component="composer"><span>Text</span></div></body></html>');
  const states=await page.evaluate(({css,factory})=>{
   const sheet=new CSSStyleSheet();sheet.replaceSync(css);document.adoptedStyleSheets=[sheet];
   const gate=eval('('+factory+')')(document,[]);
   const media=()=>[...sheet.cssRules].find(rule=>rule.media?.mediaText.includes('dream-skin-internet-angel-light')).media.mediaText;
   const result=[media()];gate.syncLightRules(sheet);result.push(media());
   document.documentElement.classList.add('dream-theme-light');gate.syncLightRules(sheet);result.push(media());
   document.documentElement.classList.remove('dream-theme-light');document.documentElement.dataset.dreamShell='light';gate.syncLightRules(sheet);result.push(media());
   document.documentElement.dataset.dreamShell='dark';sheet.replaceSync(css);gate.syncLightRules(sheet);result.push(media());
   gate.cleanup();result.push(media());return result;
  },{css,factory:createCssPredicateCache.toString()});
  assert.deepEqual(states,['(dream-skin-internet-angel-light), all','(dream-skin-internet-angel-light)','(dream-skin-internet-angel-light), all','(dream-skin-internet-angel-light), all','(dream-skin-internet-angel-light)','(dream-skin-internet-angel-light), all']);
 }finally{await browser.close();}
});
test('isolated Chromium preserves theme toggles, fixed-dark contrast and important specificity',browserOptions,async()=>{
 const require=createRequire(import.meta.url);
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
 const browser=await chromium.launch({headless:true,...(process.env.DREAM_SKIN_BROWSER_EXECUTABLE?{executablePath:process.env.DREAM_SKIN_BROWSER_EXECUTABLE}:{})});
 try{
  const snapshots=[];
  for(const [variant,sheet] of [['baseline',baseline],['gated',css],['standalone',css]]){
   const page=await browser.newPage();
   await page.setContent('<html><head></head><body></body></html>');
   await page.evaluate(({sheet,factory,variant})=>{
    const root=document.documentElement;root.className='codex-dream-skin';root.dataset.dreamSkin='active';root.dataset.dreamTheme='internet-angel';
    const style=document.createElement('style');style.textContent=sheet;document.head.append(style);
    const components=['sidebar','sidebar-row','sidebar-control','activity-header','activity-output','message-user','message-assistant','environment','scroll-bottom','composer','context-strip','active-goal-strip','changes-shell','changes-pill','side-workspace','composer-palette','settings-sidebar','settings-content','settings-search','settings-surface','settings-menu','terminal-panel','summary-panel','side-chat','activity-detail','selection-actions','turn-preview','turn-preview-surface','edited-card','edited-card-files','system-toast','subagent-frame','permission','composer-palette-heading','turn-preview-title','edited-card-title','edited-card-more','subagent-more','turn-preview-excerpt','edited-card-stats','edited-card-file-path','edited-card-file-stats'];
    for(const component of components){
     const owner=document.createElement('section');owner.dataset.angelComponent=component;owner.dataset.state='active';
     owner.innerHTML='<div><span>Nested text</span><button>Control</button><button disabled>Disabled</button><input placeholder="Placeholder"><textarea placeholder="Placeholder"></textarea><p>Paragraph <code>inline</code> <kbd>key</kbd></p><pre><code><span>Block text</span></code></pre><div class="xterm"><div class="xterm-rows"><span>Terminal</span></div></div><div aria-selected="true"><span>Selected</span></div><h3>Title</h3><label>Label</label></div>';
     document.body.append(owner);
    }
    const portals=document.createElement('div');portals.innerHTML='<div data-radix-popper-content-wrapper><div><button role="menuitem">Option</button></div></div><div role="tooltip"><span>Tooltip</span></div>';document.body.append(portals);
    const variables=document.createElement('style');variables.textContent='html {--angel-adaptive-text:#241b50;--angel-adaptive-muted:#766b90;--angel-adaptive-surface:#f8f2ff;--angel-adaptive-surface-raised:#fff9ff;--angel-adaptive-accent:#2054ff;--angel-adaptive-line-soft:#a19ab0;}';document.head.append(variables);
    const competition=document.createElement('style');competition.textContent='#specificity-probe {color:rgb(17, 34, 51)!important;} button {color:rgb(111, 112, 113)!important;} html[data-dream-skin="active"][data-dream-theme="internet-angel"]:is(.dream-theme-light,[data-dream-shell="light"]) :where([data-angel-component]) .equal-probe {color:rgb(61,62,63)!important;}';document.head.append(competition);document.querySelector('[data-angel-component="composer"] span').id='specificity-probe';
    const equal=document.createElement('span');equal.className='equal-probe';equal.textContent='Equal specificity';document.querySelector('[data-angel-component="composer"]').append(equal);
    window.__typingLightGate=eval('('+factory+')')(document,[]);
    window.__typingLightSheet=style.sheet;
    window.__typingLightGateEnabled=variant!=='standalone';
   },{sheet,factory:createCssPredicateCache.toString(),variant});
   const captured=[];
   for(const state of ['dark','class-light','attribute-light','both-light','dark-again','inactive-light']){
    captured.push(await page.evaluate(async state=>{
     const root=document.documentElement;root.classList.toggle('dream-theme-light',['class-light','both-light','inactive-light'].includes(state));root.classList.toggle('dream-theme-dark',state==='dark'||state==='dark-again');
     if(['attribute-light','both-light'].includes(state))root.dataset.dreamShell='light';else root.dataset.dreamShell='dark';root.dataset.dreamSkin=state==='inactive-light'?'inactive':'active';
     if(window.__typingLightGateEnabled)window.__typingLightGate.syncLightRules(window.__typingLightSheet);
     // Flush the new theme before awaiting native finite transitions. A fixed
     // timeout can sample different intermediate colors on busy machines.
     document.body.getBoundingClientRect();
     await Promise.all(document.getAnimations().filter(animation=>animation instanceof CSSTransition)
      .map(animation=>animation.finished.catch(()=>{})));
     const properties=['color','backgroundColor','backgroundImage','borderTopColor','borderTopWidth','boxShadow','fontFamily','fontWeight','opacity','display'];
     return {state,styles:[...document.body.querySelectorAll('*')].map(node=>{const style=getComputedStyle(node);return properties.map(key=>style[key]);}),placeholders:[...document.querySelectorAll('input,textarea')].map(node=>getComputedStyle(node,'::placeholder').color),specificity:getComputedStyle(document.getElementById('specificity-probe')).color,equalSpecificity:getComputedStyle(document.querySelector('.equal-probe')).color};
    },state));
   }
   snapshots.push(captured);await page.close();
  }
  const difference=snapshots[0].flatMap((entry,stateIndex)=>entry.styles.flatMap((values,nodeIndex)=>values.flatMap((value,propertyIndex)=>value===snapshots[1][stateIndex].styles[nodeIndex][propertyIndex]?[]:[{state:entry.state,nodeIndex,propertyIndex,baseline:value,gated:snapshots[1][stateIndex].styles[nodeIndex][propertyIndex]}])));
  assert.deepEqual(difference.slice(0,12),[],'media gate must preserve all fixture styles across runtime class/attribute toggles');
  assert.deepEqual(snapshots[1].map(entry=>entry.placeholders),snapshots[0].map(entry=>entry.placeholders),'editor/search placeholder contrast must remain unchanged');
  assert.deepEqual(snapshots[2],snapshots[0],'standalone CSS without a renderer retains the original cascade');
  assert.equal(snapshots[1][1].specificity,'rgb(17, 34, 51)','a higher-specificity important author rule still wins');
  assert.equal(snapshots[1][1].equalSpecificity,'rgb(61, 62, 63)','later equal-specificity important author rules retain source-order precedence');
 }finally{await browser.close();}
});

test('isolated Chromium skips inactive light descendant selectors during a forced dark restyle',browserOptions,async()=>{
 const require=createRequire(import.meta.url);
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
 const browser=await chromium.launch({headless:true,...(process.env.DREAM_SKIN_BROWSER_EXECUTABLE?{executablePath:process.env.DREAM_SKIN_BROWSER_EXECUTABLE}:{})});
 const evidence=[];
 try{
  for(const [variant,sheet] of [['baseline',baseline],['gated',css]]){
   const page=await browser.newPage();await page.setContent('<html class="codex-dream-skin dream-theme-dark" data-dream-skin="active" data-dream-theme="internet-angel" data-dream-shell="dark"><head></head><body></body></html>');
   await page.evaluate(({sheet,factory})=>{
    const style=document.createElement('style');style.textContent=sheet;document.head.append(style);
    for(let i=0;i<35;i++){
     const message=document.createElement('section');message.dataset.angelComponent='message-assistant';let parent=message;
     for(let j=0;j<35;j++){const child=document.createElement('div');parent.append(child);parent=child;}
     parent.innerHTML='<p>Synthetic paragraph <span>with nested text</span></p><pre><code><span>synthetic code</span></code></pre>';document.body.append(message);
    }
    eval('('+factory+')')(document,[]).syncLightRules(style.sheet);
    document.body.getBoundingClientRect();
   },{sheet,factory:createCssPredicateCache.toString()});
   const cdp=await page.context().newCDPSession(page);const stats=new Map();let selectorEvents=0;
   cdp.on('Tracing.dataCollected',({value})=>{for(const event of value){if(event.name!=='SelectorStats')continue;selectorEvents++;for(const row of event.args?.selector_stats?.selector_timings||[]){if(!row.selector?.includes('.dream-theme-light')||!row.selector.includes('data-angel-component'))continue;const current=stats.get(row.selector)||{selector:row.selector,attempts:0,matches:0,elapsedUs:0};current.attempts+=Number(row.match_attempts)||0;current.matches+=Number(row.match_count)||0;current.elapsedUs+=Number(row['elapsed (us)'])||0;stats.set(row.selector,current);}}});
   const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
   let tracing=false;
   let completionTimer=null;
   try{
    await cdp.send('Tracing.start',{transferMode:'ReportEvents',traceConfig:{recordMode:'recordUntilFull',traceBufferSizeInKb:16384,includedCategories:['devtools.timeline','disabled-by-default-devtools.timeline','disabled-by-default-blink.debug']}});
    tracing=true;
    const timing=await page.evaluate(()=>{const runs=[];for(let i=0;i<4;i++){const started=performance.now();document.documentElement.style.setProperty('--typing-light-gate-probe',String(i));document.body.getBoundingClientRect();runs.push(performance.now()-started);}return {runs,nodeCount:document.querySelectorAll('*').length};});
    await cdp.send('Tracing.end');tracing=false;
    await Promise.race([complete,new Promise((_,reject)=>{completionTimer=setTimeout(()=>reject(Error('selector trace completion exceeded 15 seconds')),15000);})]);
    evidence.push({variant,...timing,selectorEvents,stats:[...stats.values()].sort((a,b)=>b.elapsedUs-a.elapsedUs)});
   }finally{
    if(completionTimer!==null)clearTimeout(completionTimer);
    if(tracing)await cdp.send('Tracing.end').catch(()=>{});
    await cdp.detach().catch(()=>{});
    await page.close();
   }
  }
  if(process.env.DREAM_SKIN_MEDIA_GATE_EVIDENCE)await writeFile(process.env.DREAM_SKIN_MEDIA_GATE_EVIDENCE,JSON.stringify(evidence,null,2));
  assert.ok(evidence[0].selectorEvents>0&&evidence[1].selectorEvents>0,'Chromium trace must include actual selector statistics');
  assert.ok(evidence[0].stats.some(row=>row.attempts>1000),'ungated baseline must exercise inactive light selectors');
  assert.equal(evidence[1].stats.reduce((sum,row)=>sum+row.attempts,0),0,'media gate must reject inactive light rules before descendant matching');

 }finally{await browser.close();}
});
