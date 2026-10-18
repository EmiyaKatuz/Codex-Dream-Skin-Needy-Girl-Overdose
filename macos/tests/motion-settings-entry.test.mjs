import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const shellAvailable = process.platform !== "win32";

async function fixture(t) {
  const root = await mkdtemp(path.join(await realpath(os.tmpdir()), "dreamskin-motion-entry-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "scripts"));
  await mkdir(path.join(root, "assets"));
  await cp(path.join(project, "macos/scripts/motion-settings-macos.sh"), path.join(root, "scripts/motion-settings-macos.sh"));
  await cp(path.join(project, "runtime/motion-settings.mjs"), path.join(root, "assets/motion-settings.mjs"));
  // Only substitute platform discovery/signature checks. The entry script and
  // shared settings utility execute unchanged with the real Node runtime.
  await writeFile(path.join(root, "scripts/common-macos.sh"), `
PROJECT_ROOT="$MOTION_ENTRY_PROJECT"
STATE_ROOT="$MOTION_ENTRY_STATE"
fail() { printf '%s\\n' "$*" >&2; exit 1; }
discover_codex_app() { printf '%s\\n' discover >> "$MOTION_ENTRY_TRACE"; }
require_signed_node_runtime() {
  printf '%s\\n' validate >> "$MOTION_ENTRY_TRACE"
  [ "$MOTION_ENTRY_REJECT_RUNTIME" != "1" ] || fail 'runtime rejected'
  NODE="$MOTION_ENTRY_NODE"
}
`, { mode: 0o600 });
  const environment = {
    ...process.env,
    MOTION_ENTRY_PROJECT: root,
    MOTION_ENTRY_STATE: path.join(root, "state"),
    MOTION_ENTRY_TRACE: path.join(root, "trace"),
    MOTION_ENTRY_NODE: process.execPath,
    MOTION_ENTRY_REJECT_RUNTIME: "0",
  };
  const run = (args, extraEnvironment = {}) => spawnSync("/bin/bash", [
    path.join(root, "scripts/motion-settings-macos.sh"), ...args,
  ], { encoding: "utf8", env: { ...environment, ...extraEnvironment } });
  return { root, environment, run };
}

test("macOS motion entry validates its runtime before safely persisting modes and effects", { skip: !shellAvailable }, async (t) => {
  const { root, run } = await fixture(t);
  const initial = run(["--get"]);
  assert.equal(initial.status, 0, initial.stderr);
  assert.equal(JSON.parse(initial.stdout).mode, "system");
  assert.equal(await readFile(path.join(root, "trace"), "utf8"), "discover\nvalidate\n");

  const mode = run(["--set-mode", "full"]);
  assert.equal(mode.status, 0, mode.stderr);
  assert.equal(JSON.parse(mode.stdout).mode, "full");
  const effect = run(["--set-effect", "ambient", "off"]);
  assert.equal(effect.status, 0, effect.stderr);
  assert.equal(JSON.parse(effect.stdout).mode, "full");
  assert.equal(JSON.parse(effect.stdout).effects.ambient, false);
  const stored = JSON.parse(await readFile(path.join(root, "state/motion.json"), "utf8"));
  assert.deepEqual(stored, JSON.parse(effect.stdout));
});

test("macOS motion entry rejects path overrides and invalid actions before runtime discovery", { skip: !shellAvailable }, async (t) => {
  const { root, run } = await fixture(t);
  for (const args of [
    [], ["--get", "--file", "/tmp/other.json"], ["--set-mode", "fast"],
    ["--set-mode"], ["--set-effect", "status", "true"],
    ["--set-effect", "script", "on"], ["--set-effect", "ambient"],
  ]) {
    assert.notEqual(run(args).status, 0, JSON.stringify(args));
  }
  await assert.rejects(readFile(path.join(root, "trace")), { code: "ENOENT" });
  await assert.rejects(readFile(path.join(root, "state/motion.json")), { code: "ENOENT" });
});

test("macOS motion entry cannot write settings when runtime validation fails", { skip: !shellAvailable }, async (t) => {
  const { root, run } = await fixture(t);
  const result = run(["--set-mode", "full"], { MOTION_ENTRY_REJECT_RUNTIME: "1" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /runtime rejected/);
  await assert.rejects(readFile(path.join(root, "state/motion.json")), { code: "ENOENT" });
});
