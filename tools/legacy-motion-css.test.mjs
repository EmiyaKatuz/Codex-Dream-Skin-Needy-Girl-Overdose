import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../runtime/theme-motion.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const legacy = css.slice(0, css.indexOf('html:root[data-dream-motion]:not([data-dream-motion="off"])'));
const rules = [...legacy.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, body]) => ({selector: selector.trim(), body}));

test('the legacy broadcast freeze excludes eligible full-mode Home scenes', () => {
  const suppressors = rules.filter(({selector, body}) => selector.includes('#codex-dream-skin-chrome')
    && selector.includes('#chatgpt-internet-angel-hud') && /animation:\s*none\s*!important/.test(body));
  assert.equal(suppressors.length, 2, 'one policy gate and one independent reduced-motion guard');
  const gate = suppressors.find(({selector}) => selector.includes(':not('));
  assert.ok(gate, 'legacy loops must not be unconditionally disabled in normal full mode');
  for (const selector of gate.selector.split(',\n').slice(0, 4)) {
    assert.match(selector,
      /:not\(\[data-dream-motion="full"\]\[data-dream-motion-paused="false"\]\[data-dream-motion-route="home"\]\[data-dream-motion-ambient="on"\]\)/);
  }
  const media = legacy.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)\}/)?.[1];
  assert.ok(media?.includes(suppressors.find(({selector}) => !selector.includes(':not(')).body));
});

test('restoring broadcast playback does not re-enable hidden layouts or native spinners', () => {
  for (const {selector, body} of rules.filter(({selector, body}) => selector.startsWith('html')
    && /animation:\s*none/.test(body))) {
    assert.doesNotMatch(body, /\b(?:display|visibility|position|inset|left|top|width|height|pointer-events)\s*:/,
      'motion policy cannot override platform collision or responsive layout rules');
    assert.ok(selector.includes('#codex-dream-skin-chrome'), 'only owned decoration may be stopped');
    assert.doesNotMatch(selector, /(?:data-angel-component|data-ds-part|\bmain\b|\[role=)/,
      'native content and loading indicators must retain their own playback');
  }
});

test('the unverified legacy eyelid stays hidden and per-subagent glow stays retired', () => {
  const eyelid = rules.find(({selector}) => selector.endsWith('.dream-blink-frame'));
  assert.ok(eyelid);
  assert.match(eyelid.body, /animation:\s*none\s*!important/);
  assert.match(eyelid.body, /opacity:\s*0\s*!important/);
  const subagent = rules.find(({selector}) => selector.includes('.dream-subagent-row-live'));
  assert.ok(subagent);
  assert.match(subagent.selector, /> svg:first-child$/);
  assert.match(subagent.body, /animation:\s*none\s*!important/);
});

test('restored legacy keyframes animate paint and transform without layout or filter loops', () => {
  for (const name of ['dream-chat-drift', 'dream-signal-pulse', 'dream-heartbeat-scan']) {
    const frames = legacy.match(new RegExp(`@keyframes ${name}\\s*\\{((?:[^{}]|\\{[^{}]*\\})*)\\}`))?.[1];
    assert.ok(frames, `${name} needs its shared lightweight replacement`);
    assert.doesNotMatch(frames, /\b(?:margin(?:-top)?|filter|backdrop-filter|box-shadow|width|height|top|left)\s*:/);
    assert.match(frames, /opacity\s*:/);
  }
});
