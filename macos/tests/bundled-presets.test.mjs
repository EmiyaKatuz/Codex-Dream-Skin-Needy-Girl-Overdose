import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const macosRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundledId = "preset-internet-angel-default";

function seed(stateRoot) {
  const result = spawnSync("/bin/bash", ["-c", `
    . "$1/scripts/common-macos.sh"
    STATE_ROOT="$2"
    seed_bundled_presets
  `, "_", macosRoot, stateRoot], { encoding: "utf8" });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
}

test("fresh macOS libraries contain only the customized Internet Angel JPEG", async () => {
  const stateRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dreamskin-presets-fresh."));
  try {
    const sourceDirectories = (await fs.readdir(path.join(macosRoot, "presets"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    assert.deepEqual(sourceDirectories, [bundledId]);
    seed(stateRoot);
    seed(stateRoot);
    assert.deepEqual(await fs.readdir(path.join(stateRoot, "themes")), [bundledId]);
    const presetRoot = path.join(macosRoot, "presets", bundledId);
    for (const name of ["theme.json", "dream-reference.jpg"]) {
      const expected = await fs.readFile(path.join(presetRoot, name));
      assert.deepEqual(await fs.readFile(path.join(stateRoot, "themes", bundledId, name)), expected);
      assert.deepEqual(await fs.readFile(path.join(macosRoot, "assets", name)), expected);
    }
  } finally {
    await fs.rm(stateRoot, { recursive: true, force: true });
  }
});

test("macOS preset refresh preserves former presets, saved imports and the active copy", async () => {
  const stateRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dreamskin-presets-upgrade."));
  try {
    const preservedIds = [
      "preset-gothic-void-crusade", "preset-arina-hashimoto", "preset-internet-angel",
      "preset-midnight-aurora", "preset-sakura-dawn", "preset-amber-dusk",
      "preset-forest-mist", "preset-cyber-neon", "preset-romantic-rose",
      "custom-keepme", "studio.saved-import",
    ];
    const preserved = [];
    for (const id of preservedIds) {
      const directory = path.join(stateRoot, "themes", id);
      await fs.mkdir(directory, { recursive: true });
      for (const name of ["theme.json", "background.jpg", "theme.css"]) {
        const file = path.join(directory, name);
        const bytes = Buffer.from(`${id}/${name}: user-owned content\n`);
        await fs.writeFile(file, bytes);
        preserved.push([file, bytes]);
      }
    }
    const activeRoot = path.join(stateRoot, "theme");
    await fs.mkdir(activeRoot);
    for (const name of ["theme.json", "background.jpg", "theme.css"]) {
      const file = path.join(activeRoot, name);
      const bytes = Buffer.from(`active/${name}: customized copy\n`);
      await fs.writeFile(file, bytes);
      preserved.push([file, bytes]);
    }
    seed(stateRoot);
    seed(stateRoot);
    for (const [file, bytes] of preserved) {
      assert.deepEqual(await fs.readFile(file), bytes, `${file} changed during preset refresh`);
    }
    assert.deepEqual((await fs.readdir(path.join(stateRoot, "themes"))).sort(), [...preservedIds, bundledId].sort());
  } finally {
    await fs.rm(stateRoot, { recursive: true, force: true });
  }
});
