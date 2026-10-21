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
  for (const name of ['dream-chat-drift', 'dream-signal-pulse', 'dream-heartbeat-scan', 'angel-signal']) {
    const frames = legacy.match(new RegExp(`@keyframes ${name}\\s*\\{((?:[^{}]|\\{[^{}]*\\})*)\\}`))?.[1];
    assert.ok(frames, `${name} needs its shared lightweight replacement`);
    assert.doesNotMatch(frames, /\b(?:margin(?:-top)?|filter|backdrop-filter|box-shadow|width|height|top|left)\s*:/);
    assert.match(frames, /opacity\s*:/);
  }
});

test('modern Home broadcast details stay in the existing collision-checked ambient box', () => {
  const effects = rules.filter(({selector, body}) => selector.includes('[data-dream-motion-role="ambient"]')
    && /animation:\s*dream-(?:signal-pulse|chat-drift)/.test(body));
  assert.equal(effects.length, 2, 'restore only the signal and reaction in the existing star channel');
  for (const {selector, body} of effects) {
    for (const gate of ['[data-dream-motion="full"]', '[data-dream-motion-paused="false"]',
      '[data-dream-motion-ambient="on"]', '[data-dream-motion-route="home"]', '[data-dream-motion-owned]']) {
      assert.ok(selector.includes(gate), `${selector} must retain ${gate}`);
    }
    assert.doesNotMatch(selector, /#codex-dream-skin-chrome|data-ds-part|data-angel-component/,
      'do not re-enable old fixed coordinates or animate native content');
    assert.doesNotMatch(body, /\b(?:filter|backdrop-filter|will-change)\s*:/);
  }
  const pixels = (body, property) => Number(body.match(new RegExp(`(?:^|;)\\s*${property}:\\s*(-?\\d+)px`))?.[1]);
  const signal = effects.find(({selector}) => selector.endsWith('::before'));
  const reaction = effects.find(({selector}) => selector.endsWith('::after'));
  assert.ok(signal && reaction);
  const sx = pixels(signal.body, 'left'), sy = pixels(signal.body, 'top');
  assert.ok(sx >= 0 && sy >= 0 && sx + pixels(signal.body, 'width') <= 68
    && sy + pixels(signal.body, 'height') <= 104, 'the complete waveform must fit inside the existing box');
  // The existing second star is right:0, top:42px. Its text has nonnegative
  // width, so the reaction's right edge never reaches beyond 68px.
  const rx = pixels(reaction.body, 'left'), ry = 42 + pixels(reaction.body, 'top');
  assert.ok(rx + pixels(reaction.body, 'width') <= 0 && 68 + rx >= 0);
  assert.ok(ry - 3 >= 0 && ry + pixels(reaction.body, 'height') <= 104,
    'the full 3px reaction drift must fit inside the same collision-tested envelope');
});

test('legacy music, heartbeat and orbit are adapted to bounded owned decorations', () => {
  const names = ['dream-record-spin', 'dream-equalizer', 'dream-heartbeat-scan', 'dream-angel-orbit-spin'];
  for (const name of names) {
    const effect = rules.find(({body}) => body.includes(`animation: ${name} `));
    assert.ok(effect, `missing migrated ${name}`);
    for (const gate of ['[data-dream-motion="full"]', '[data-dream-motion-paused="false"]',
      '[data-dream-motion-route="home"]', '[data-dream-motion-owned]']) assert.ok(effect.selector.includes(gate));
    assert.doesNotMatch(effect.selector, /#codex-dream-skin-chrome|data-ds-part|data-angel-component/);
    assert.doesNotMatch(effect.body, /\b(?:filter|backdrop-filter|will-change)\s*:/);
  }
  const orbit = rules.find(({body}) => body.includes('animation: dream-angel-orbit-spin '));
  const radius = Math.hypot(34, 34) / 2;
  assert.ok(28 + 24 - radius >= 0 && 28 + 24 + radius <= 80);
  assert.ok(4 + 24 - radius >= 0 && 4 + 24 + radius <= 76);
  assert.match(orbit.body, /width:\s*34px/);
  assert.match(orbit.body, /height:\s*34px/);
});
