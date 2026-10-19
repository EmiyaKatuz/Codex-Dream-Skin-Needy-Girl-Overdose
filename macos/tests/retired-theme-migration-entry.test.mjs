import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const shellAvailable = process.platform !== "win32";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "dreamskin-macos-retired-entry-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const scripts = path.join(root, "scripts");
  const assets = path.join(root, "assets");
  const stateRoot = path.join(root, "state");
  await mkdir(scripts);
  await mkdir(assets);
  await mkdir(path.join(stateRoot, "themes"), { recursive: true });
  for (const name of [
    "migrate-retired-themes-macos.sh", "recover-theme-imports-macos.sh",
    "theme-switch-lock-macos.sh", "publish-theme-import.mjs", "theme-content-fingerprint.mjs",
  ]) {
    await cp(path.join(project, "macos/scripts", name), path.join(scripts, name));
  }
  for (const name of ["safe-css-validator.mjs", "safe-css-policy.json", "theme.json", "dream-reference.jpg"]) {
    await cp(path.join(project, "macos/assets", name), path.join(assets, name));
  }
  const retainedTheme = JSON.parse(await readFile(path.join(assets, "theme.json"), "utf8"));
  const retainedImage = await readFile(path.join(assets, "dream-reference.jpg"));
  const retiredTheme = { ...retainedTheme, id: "preset-pixel-cafe", name: "Pixel Cafe" };
  const retiredImage = Buffer.concat([retainedImage, Buffer.from("\nRetired fixture only\n")]);
  const catalog = {
    schemaVersion: 1,
    version: "1.7.2",
    retained: { theme: retainedTheme, imageSha256: digest(retainedImage) },
    templates: [{ key: "pixel-cafe", theme: retiredTheme, imageSha256: digest(retiredImage) }],
  };
  await writeFile(path.join(root, "test-catalog.json"), JSON.stringify(catalog));
  // Substitute only signed-runtime discovery and catalog input. The production
  // shell entry, cross-process locks, import recovery and migration API run.
  await writeFile(path.join(scripts, "common-macos.sh"), `
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$RETIRED_ENTRY_PROJECT"
STATE_ROOT="$RETIRED_ENTRY_STATE"
fail() { printf '%s\\n' "$*" >&2; exit 1; }
ensure_state_root() { /bin/mkdir -p "$STATE_ROOT"; }
ensure_node_runtime() {
  printf '%s\\n' validate >> "$RETIRED_ENTRY_TRACE"
  [ "$RETIRED_ENTRY_REJECT_RUNTIME" != "1" ] || fail 'runtime rejected'
  NODE="$RETIRED_ENTRY_NODE"
}
new_operation_token() { printf '%s:1700000000000:1\\n' "$$"; }
operation_token_is_valid() { [[ "$1" =~ ^[0-9]{1,12}:[0-9]{13}:[0-9]{1,8}$ ]]; }
`);
  const helperURL = pathToFileURL(path.join(project, "runtime/retired-theme-migration.mjs")).href;
  await writeFile(path.join(assets, "retired-theme-migration.mjs"), `
import fs from "node:fs/promises";
import { migrateRetiredThemes } from ${JSON.stringify(helperURL)};
await fs.appendFile(process.env.RETIRED_ENTRY_TRACE, "migrate\\n");
const args = process.argv.slice(2);
const value = (key) => args[args.indexOf(key) + 1];
const catalog = JSON.parse(await fs.readFile(process.env.RETIRED_ENTRY_CATALOG, "utf8"));
console.log(JSON.stringify(await migrateRetiredThemes({
  stateRoot: value("--state-root"), activeName: value("--active-name"),
  defaultThemeDir: value("--default-theme-dir"), catalog,
})));
`);
  const environment = {
    ...process.env,
    RETIRED_ENTRY_PROJECT: root,
    RETIRED_ENTRY_STATE: stateRoot,
    RETIRED_ENTRY_TRACE: path.join(root, "trace"),
    RETIRED_ENTRY_NODE: process.execPath,
    RETIRED_ENTRY_CATALOG: path.join(root, "test-catalog.json"),
    RETIRED_ENTRY_REJECT_RUNTIME: "0",
  };
  const run = (args = [], extraEnvironment = {}) => spawnSync("/bin/bash", [
    path.join(scripts, "recover-theme-imports-macos.sh"), ...args,
  ], { encoding: "utf8", env: { ...environment, ...extraEnvironment } });
  const createRetired = async (relative) => {
    const directory = path.join(stateRoot, relative);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "theme.json"), JSON.stringify(retiredTheme));
    await writeFile(path.join(directory, retiredTheme.image), retiredImage);
  };
  return { root, stateRoot, assets, run, createRetired, retiredImage, retiredTheme };
}

test("macOS launch recovery archives unchanged retired built-ins and replaces a retired active theme once", { skip: !shellAvailable }, async (t) => {
  const { root, stateRoot, assets, run, createRetired, retiredImage } = await fixture(t);
  await createRetired("themes/preset-pixel-cafe");
  await createRetired("theme");
  await createRetired("themes/user-changed");
  await writeFile(path.join(stateRoot, "themes/user-changed/theme.css"), "/* custom theme */");
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.activeReplaced, true);
  assert.equal(report.archived, 1);
  assert.ok(report.backupRoot && !report.backupRoot.startsWith(path.join(stateRoot, "themes") + path.sep));
  const archive = JSON.parse(await readFile(path.join(report.backupRoot, "manifest.json"), "utf8"));
  assert.equal(archive.activeReplaced, true);
  assert.equal(archive.themes.length, 1);
  assert.equal(archive.themes[0].source, "preset-pixel-cafe");
  for (const directory of ["theme", archive.themes[0].backup]) {
    assert.deepEqual(await readFile(path.join(report.backupRoot, directory, "dream-reference.jpg")), retiredImage);
  }
  assert.deepEqual(await readdir(path.join(stateRoot, "themes")), ["user-changed"]);
  for (const name of ["theme.json", "dream-reference.jpg"]) {
    assert.deepEqual(await readFile(path.join(stateRoot, "theme", name)), await readFile(path.join(assets, name)));
  }
  assert.deepEqual(await readFile(path.join(stateRoot, "themes/user-changed/dream-reference.jpg")), retiredImage);
  assert.equal(await readFile(path.join(root, "trace"), "utf8"), "validate\nmigrate\n");
  const repeated = run();
  assert.equal(repeated.status, 0, repeated.stderr);
  const repeatedReport = JSON.parse(repeated.stdout);
  assert.equal(repeatedReport.activeReplaced, false);
  assert.equal(repeatedReport.archived, 0);
  assert.ok(!(await readdir(stateRoot)).includes(".theme-switch.lock"));
  assert.ok(!(await readdir(path.join(stateRoot, "themes"))).includes(".theme-import.lock"));
});

test("macOS launch migration respects live theme-import and theme-switch owners", { skip: !shellAvailable }, async (t) => {
  const { root, stateRoot, run, createRetired, retiredImage } = await fixture(t);
  await createRetired("themes/preset-pixel-cafe");
  await createRetired("theme");
  const importLock = path.join(stateRoot, "themes/.theme-import.lock");
  await mkdir(importLock);
  const owner = JSON.stringify({ pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() });
  await writeFile(path.join(importLock, "owner.json"), owner);
  const importing = run();
  assert.notEqual(importing.status, 0);
  assert.match(importing.stderr, /Another theme import/);
  assert.equal(await readFile(path.join(importLock, "owner.json"), "utf8"), owner);
  assert.deepEqual(await readFile(path.join(stateRoot, "theme/dream-reference.jpg")), retiredImage);
  assert.ok(!(await readdir(stateRoot)).includes(".theme-switch.lock"));
  await rm(importLock, { recursive: true });

  const switchLock = path.join(stateRoot, ".theme-switch.lock");
  await mkdir(switchLock);
  await writeFile(path.join(switchLock, "owner"), String(process.pid));
  await writeFile(path.join(switchLock, "token"), "123:1700000000000:1");
  const switching = run();
  assert.notEqual(switching.status, 0);
  assert.match(switching.stderr, /Another theme switch/);
  assert.equal(await readFile(path.join(switchLock, "owner"), "utf8"), String(process.pid));
  assert.deepEqual(await readFile(path.join(stateRoot, "themes/preset-pixel-cafe/dream-reference.jpg")), retiredImage);
  assert.equal(await readFile(path.join(root, "trace"), "utf8"), "validate\nvalidate\n");
});

test("macOS launch migration validates the signed runtime before publishing locks or themes", { skip: !shellAvailable }, async (t) => {
  const { root, stateRoot, run, createRetired, retiredImage } = await fixture(t);
  await createRetired("theme");
  const result = run([], { RETIRED_ENTRY_REJECT_RUNTIME: "1" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /runtime rejected/);
  assert.deepEqual(await readFile(path.join(stateRoot, "theme/dream-reference.jpg")), retiredImage);
  assert.deepEqual((await readdir(stateRoot)).sort(), ["theme", "themes"]);
  assert.equal(await readFile(path.join(root, "trace"), "utf8"), "validate\n");
});

test("macOS installer and already-current native launches execute migration before exposing themes", async () => {
  const read = (relative) => readFile(path.join(project, relative), "utf8");
  const installer = await read("macos/scripts/install-dream-skin-macos.sh");
  assert.match(installer, /seed_bundled_presets\n"\$SCRIPT_DIR\/migrate-retired-themes-macos\.sh"[^\n]*\nif \[ ! -f "\$THEME_DIR\/theme\.json"/);
  const app = await read("macos/menubar-app/Sources/CodexDreamSkinMenuBar/AppDelegate.swift");
  assert.match(app, /if !force && !engineNeedsInstall\(\) \{\s*recoverInterruptedThemeImports/);
  assert.match(app, /private func recoverInterruptedThemeImports[\s\S]*self\.refreshStatus\(\)[\s\S]*completion\?\(result\.succeeded\)/);
  const recovery = await read("macos/scripts/recover-theme-imports-macos.sh");
  assert.match(recovery, /"\$SCRIPT_DIR\/migrate-retired-themes-macos\.sh"/);
});
