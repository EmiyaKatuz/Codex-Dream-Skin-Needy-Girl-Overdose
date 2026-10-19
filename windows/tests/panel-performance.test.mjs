import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';

const source = await fs.readFile(new URL('../assets/renderer-inject.js', import.meta.url), 'utf8');
const start = source.indexOf('    let shellBox = null;');
const end = source.indexOf('    sideWorkspace?.classList.add("dream-side-workspace");', start);
assert.ok(start > 0 && end > start);
const detector = source.slice(start, end) + '\nsideWorkspace;';
const browserMarker = {};
const terminalMarker = {};
function fixture() {
  const reads = { geometry: 0, styles: 0, queries: 0, shell: 0 };
  const surface = ({ markers = [], left = 500, width = 600, height = 400, hidden = false } = {}) => ({
    markers, hidden,
    contains(marker) { return this.markers.includes(marker); },
    getBoundingClientRect() { reads.geometry++; return { left, width, height, right: left + width }; },
  });
  const context = {
    document: { querySelectorAll() { reads.queries++; return context.surfaces; } },
    surfaces: Array.from({ length: 1000 }, () => surface()),
    shellMain: { getBoundingClientRect() { reads.shell++; return { left: 0, width: 1200, right: 1200 }; } },
    terminalRoot: null, browserMarkers: [], terminalMarkers: [], sideLauncher: null,
    getComputedStyle(candidate) { reads.styles++; return { display: candidate.hidden ? 'none' : 'block', visibility: 'visible', opacity: '1' }; },
  };
  return { context, reads, surface, run: () => vm.runInNewContext(detector, context) };
}

test('ordinary pages and partial workspace labels cause no surface measurements', () => {
  for (const browserMarkers of [[], [browserMarker]]) {
    const f = fixture();
    f.context.browserMarkers = browserMarkers;
    assert.equal(f.run(), null);
    assert.deepEqual(f.reads, { geometry: 0, styles: 0, queries: 0, shell: 0 });
  }
});

test('workspace detection measures only matching surfaces and preserves smallest visible right panel', () => {
  const f = fixture();
  f.context.browserMarkers = [browserMarker];
  f.context.terminalMarkers = [terminalMarker];
  const markers = [browserMarker, terminalMarker];
  const hidden = f.surface({ markers, hidden: true });
  const left = f.surface({ markers, left: 0 });
  const large = f.surface({ markers, width: 700 });
  const small = f.surface({ markers, width: 600 });
  f.context.surfaces.push(hidden, left, large, small);
  assert.equal(f.run(), small);
  assert.deepEqual(f.reads, { geometry: 4, styles: 4, queries: 1, shell: 1 });
});

test('semantic launcher fallback remains available without Browser/Terminal labels', () => {
  const f = fixture();
  const fallback = f.surface();
  f.context.sideLauncher = { closest: () => fallback };
  assert.equal(f.run(), fallback);
  assert.deepEqual(f.reads, { geometry: 1, styles: 1, queries: 0, shell: 1 });
  f.context.terminalRoot = fallback;
  const next = { ...f.context };
  assert.equal(vm.runInNewContext(detector, next), null, 'A terminal cannot be reused as the side workspace');
});
