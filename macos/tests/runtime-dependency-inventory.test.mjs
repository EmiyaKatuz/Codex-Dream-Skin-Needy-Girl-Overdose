import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

// Derive the dependencies from imports, rather than maintaining another list
// that can drift from the startup code. Whole-directory copying does not make
// an incomplete runtime safe to accept as installed or ready to publish.
for (const [platform, inventories] of [
  ['macos', [
    ['macos/menubar-app/Sources/CodexDreamSkinMenuBar/AppDelegate.swift', /requiredEngineRelativePaths\s*=\s*\[([\s\S]*?)\]/],
  ]],
  ['windows', [
    ['windows/scripts/common-windows.ps1', /\$required\s*=\s*@\(([\s\S]*?)\)/],
    ['windows/installer/build-release.ps1', /\$expectedPayloadFiles\s*=\s*@\(([\s\S]*?)\)/],
  ]],
]) {
  test(`${platform} runtime inventories require every injector asset module`, async () => {
    const injector = await read(`${platform}/scripts/injector.mjs`);
    const dependencies = [...injector.matchAll(/from\s+["']\.\.\/assets\/([^"']+\.mjs)["']/g)]
      .map((match) => `assets/${match[1]}`);
    assert.ok(dependencies.includes('assets/css-predicate-cache.mjs'));
    for (const [path, pattern] of inventories) {
      const inventory = pattern.exec(await read(path))?.[1];
      assert.ok(inventory, `${path}: required inventory not found`);
      const paths = new Set([...inventory.matchAll(/["']([^"']+)["']/g)]
        .map((match) => match[1].replaceAll('\\', '/')));
      for (const dependency of dependencies) {
        assert.ok(paths.has(dependency), `${path}: missing startup dependency ${dependency}`);
      }
    }
  });
}
