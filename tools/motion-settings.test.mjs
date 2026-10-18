import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  MOTION_MODES, DEFAULT_MOTION_SETTINGS, normalizeMotionSettings,
  getMotionSettingsPath, readMotionSettings, writeMotionSettings,
} from "../runtime/motion-settings.mjs";

const moduleFile = fileURLToPath(new URL("../runtime/motion-settings.mjs", import.meta.url));
const defaults = () => normalizeMotionSettings(DEFAULT_MOTION_SETTINGS);
async function fixture(t) {
  // macOS exposes /var and /tmp as OS symlinks. Use the canonical test root;
  // the utility deliberately does not grant exceptions to arbitrary aliases.
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "dream-motion-")));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, file: path.join(root, "state", "motion.json") };
}
const cli = (file, ...args) => spawnSync(process.execPath, [moduleFile, ...args, "--file", file], { encoding: "utf8" });

test("defaults are immutable and normalization returns independent preferences", () => {
  assert.deepEqual(MOTION_MODES, ["system", "off", "subtle", "full"]);
  const first = defaults();
  first.mode = "off";
  first.effects.ambient = false;
  assert.equal(defaults().mode, "system");
  assert.equal(defaults().effects.ambient, true);
  assert.ok(Object.isFrozen(DEFAULT_MOTION_SETTINGS));
  assert.ok(Object.isFrozen(DEFAULT_MOTION_SETTINGS.effects));
  for (const mode of MOTION_MODES) assert.equal(normalizeMotionSettings({ ...defaults(), mode }).mode, mode);
});

test("schema rejects unknown, missing, inherited, accessor, and incorrectly typed fields", () => {
  for (const raw of [
    null, [], "system", 1, {}, { ...defaults(), extra: true },
    { ...defaults(), schemaVersion: "1" }, { ...defaults(), schemaVersion: 2 },
    { ...defaults(), mode: "AUTO" }, { ...defaults(), mode: true },
    { schemaVersion: 1, mode: "off" },
    { ...defaults(), effects: {} }, { ...defaults(), effects: [] },
    { ...defaults(), effects: { ...defaults().effects, extra: true } },
    { ...defaults(), effects: { ...defaults().effects, ambient: "false" } },
    { ...defaults(), effects: { ...defaults().effects, status: 0 } },
    Object.assign(Object.create({ unsafe: true }), defaults()),
    Object.defineProperty(defaults(), "mode", { get() { throw new Error("accessor invoked"); } }),
  ]) assert.throws(() => normalizeMotionSettings(raw), /Motion settings:/);
});

test("platform paths use the dedicated state directory and reject relative/remote inputs", () => {
  assert.equal(getMotionSettingsPath({ platform: "darwin", homeDir: "/Users/person", env: {} }),
    "/Users/person/Library/Application Support/CodexDreamSkinStudio/motion.json");
  assert.equal(getMotionSettingsPath({ platform: "win32", env: { LOCALAPPDATA: "C:\\Users\\person\\AppData\\Local" } }),
    "C:\\Users\\person\\AppData\\Local\\CodexDreamSkin\\motion.json");
  assert.equal(getMotionSettingsPath({ platform: "linux", homeDir: "/home/person", env: {} }),
    "/home/person/.local/state/CodexDreamSkin/motion.json");
  assert.equal(getMotionSettingsPath({ platform: "linux", env: { XDG_STATE_HOME: "/custom state" } }),
    "/custom state/CodexDreamSkin/motion.json");
  for (const options of [
    { platform: "win32", env: {} },
    { platform: "win32", env: { LOCALAPPDATA: "C:relative" } },
    { platform: "win32", env: { LOCALAPPDATA: "\\\\server\\share" } },
    { platform: "win32", env: { LOCALAPPDATA: "C:\\state:stream" } },
    { platform: "linux", env: { XDG_STATE_HOME: "relative" } },
    { platform: "darwin", homeDir: "relative", env: {} },
    { platform: "unsupported", env: {} },
  ]) assert.throws(() => getMotionSettingsPath(options), /Motion settings:/);
});

test("missing settings return defaults without creating state", async (t) => {
  const { root, file } = await fixture(t);
  assert.deepEqual(await readMotionSettings(file), defaults());
  assert.deepEqual(await fs.readdir(root), []);
  await assert.rejects(readMotionSettings("relative.json"), /absolute path/);
});

test("writes create private state, persist all effects, and replace atomically", async (t) => {
  const { root, file } = await fixture(t);
  const settings = { ...defaults(), mode: "subtle", effects: { ...defaults().effects, ambient: false } };
  assert.deepEqual(await writeMotionSettings(settings, file), settings);
  assert.deepEqual(await readMotionSettings(file), settings);
  const oldHandle = await fs.open(file, "r");
  try {
    const next = { ...settings, mode: "off" };
    await writeMotionSettings(next, file);
    assert.equal(JSON.parse(await oldHandle.readFile("utf8")).mode, "subtle");
    assert.deepEqual(await readMotionSettings(file), next);
  } finally { await oldHandle.close(); }
  assert.deepEqual(await fs.readdir(path.dirname(file)), ["motion.json"]);
  if (process.platform !== "win32") {
    assert.equal((await fs.stat(path.dirname(file))).mode & 0o777, 0o700);
    assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  }
  assert.deepEqual(await fs.readdir(root), ["state"]);
});

test("invalid JSON, UTF-8, duplicate keys, empty and oversized files fail without overwrite", async (t) => {
  const { file } = await fixture(t);
  await fs.mkdir(path.dirname(file));
  const duplicate = JSON.stringify(defaults()).replace('"mode":"system"', '"mode":"off","mo\\u0064e":"system"');
  for (const bytes of [
    Buffer.from(""), Buffer.from("{"), Buffer.from([0xc3, 0x28]),
    Buffer.from(JSON.stringify({ ...defaults(), injected: "field" })),
    Buffer.from(duplicate), Buffer.alloc(16385, 32),
  ]) {
    await fs.writeFile(file, bytes);
    await assert.rejects(readMotionSettings(file), /Motion settings:/);
    await assert.rejects(writeMotionSettings(defaults(), file), /Motion settings:/);
    assert.deepEqual(await fs.readFile(file), bytes);
    assert.deepEqual(await fs.readdir(path.dirname(file)), ["motion.json"]);
  }
});

test("bounded JSON accepts the byte limit and rejects the next byte", async (t) => {
  const { file } = await fixture(t);
  await fs.mkdir(path.dirname(file));
  const data = JSON.stringify(defaults());
  await fs.writeFile(file, data.padEnd(16384));
  assert.deepEqual(await readMotionSettings(file), defaults());
  await fs.appendFile(file, " ");
  await assert.rejects(readMotionSettings(file), /16384 bytes/);
});

test("directories and hard links cannot masquerade as a settings file", async (t) => {
  const { file, root } = await fixture(t);
  await fs.mkdir(file, { recursive: true });
  await assert.rejects(readMotionSettings(file), /regular file/);
  await assert.rejects(writeMotionSettings(defaults(), file), /regular file/);
  await fs.rmdir(file);
  const outside = path.join(root, "other.json");
  await fs.writeFile(outside, JSON.stringify(defaults()));
  await fs.link(outside, file);
  await assert.rejects(readMotionSettings(file), /additional links/);
  await assert.rejects(writeMotionSettings(defaults(), file), /additional links/);
  assert.equal(JSON.parse(await fs.readFile(outside, "utf8")).mode, "system");
});

test("linked ancestors are rejected for existing and missing leaves", async (t) => {
  const { root } = await fixture(t);
  const target = path.join(root, "target");
  const link = path.join(root, "link");
  await fs.mkdir(target);
  await fs.symlink(target, link, process.platform === "win32" ? "junction" : "dir");
  const file = path.join(link, "nested", "motion.json");
  await assert.rejects(readMotionSettings(file), /trusted directory|redirection/);
  await assert.rejects(writeMotionSettings(defaults(), file), /trusted directory|redirection/);
  assert.deepEqual(await fs.readdir(target), []);
});

test("linked settings leaf never reads or modifies its target", async (t) => {
  const { root, file } = await fixture(t);
  await fs.mkdir(path.dirname(file));
  const target = path.join(root, "target.json");
  const original = JSON.stringify({ ...defaults(), mode: "full" });
  await fs.writeFile(target, original);
  try { await fs.symlink(target, file, "file"); }
  catch (error) {
    if (process.platform === "win32" && error.code === "EPERM") {
      t.skip("This Windows account cannot create file symlinks; junction coverage remains active.");
      return;
    }
    throw error;
  }
  await assert.rejects(readMotionSettings(file), /regular file/);
  await assert.rejects(writeMotionSettings(defaults(), file), /regular file/);
  assert.equal(await fs.readFile(target, "utf8"), original);
});

test("write validation and rename failure preserve original bytes and clean owned staging", async (t) => {
  const { file } = await fixture(t);
  await writeMotionSettings(defaults(), file);
  const original = await fs.readFile(file);
  await assert.rejects(writeMotionSettings({ ...defaults(), mode: "invalid" }, file), /mode/);
  const mocked = t.mock.method(fs, "rename", async () => { throw Object.assign(new Error("private path"), { code: "EACCES" }); });
  await assert.rejects(writeMotionSettings({ ...defaults(), mode: "off" }, file), (error) => {
    assert.match(error.message, /EACCES/);
    assert.doesNotMatch(error.message, /private path/);
    return true;
  });
  mocked.mock.restore();
  assert.deepEqual(await fs.readFile(file), original);
  assert.deepEqual(await fs.readdir(path.dirname(file)), ["motion.json"]);
});

test("publication detects a file changed by another writer", async (t) => {
  const { file } = await fixture(t);
  await writeMotionSettings(defaults(), file);
  const nativeOpen = fs.open.bind(fs);
  const replacement = JSON.stringify({ ...defaults(), mode: "full" });
  const mocked = t.mock.method(fs, "open", async (requested, ...args) => {
    const handle = await nativeOpen(requested, ...args);
    if (String(requested).endsWith(".tmp")) await fs.writeFile(file, replacement);
    return handle;
  });
  await assert.rejects(writeMotionSettings({ ...defaults(), mode: "off" }, file), /changed before publication/);
  mocked.mock.restore();
  assert.equal(await fs.readFile(file, "utf8"), replacement);
  assert.deepEqual(await fs.readdir(path.dirname(file)), ["motion.json"]);
});

test("an existing lock is not removed or used to overwrite settings", async (t) => {
  const { file } = await fixture(t);
  await writeMotionSettings(defaults(), file);
  const lock = path.join(path.dirname(file), ".motion.json.lock");
  await fs.writeFile(lock, "other writer");
  await assert.rejects(writeMotionSettings({ ...defaults(), mode: "off" }, file), /another update/);
  assert.equal(await fs.readFile(lock, "utf8"), "other writer");
  assert.deepEqual(await readMotionSettings(file), defaults());
});

test("an ancestor redirected mid-write cannot publish or clean files in the new target", async (t) => {
  const { root, file } = await fixture(t);
  await writeMotionSettings(defaults(), file);
  const directory = path.dirname(file);
  const retained = path.join(root, "retained");
  const target = path.join(root, "foreign");
  await fs.mkdir(target);
  const foreignFile = path.join(target, "motion.json");
  const foreignContents = JSON.stringify({ ...defaults(), mode: "full" });
  await fs.writeFile(foreignFile, foreignContents);
  const nativeOpen = fs.open.bind(fs);
  const mocked = t.mock.method(fs, "open", async (requested, ...args) => {
    const handle = await nativeOpen(requested, ...args);
    if (String(requested).endsWith(".tmp")) {
      await fs.rename(directory, retained);
      await fs.symlink(target, directory, process.platform === "win32" ? "junction" : "dir");
    }
    return handle;
  });
  await assert.rejects(writeMotionSettings({ ...defaults(), mode: "off" }, file), /ancestor changed/);
  mocked.mock.restore();
  assert.equal(await fs.readFile(foreignFile, "utf8"), foreignContents);
  assert.deepEqual(await fs.readdir(target), ["motion.json"]);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(retained, "motion.json"), "utf8")), defaults());
});

test("CLI mutations preserve unrelated preferences and reject malformed arguments", async (t) => {
  const { file } = await fixture(t);
  assert.deepEqual(JSON.parse(cli(file, "--get").stdout), defaults());
  for (const effect of Object.keys(defaults().effects)) {
    const result = cli(file, "--set-effect", effect, "off");
    assert.equal(result.status, 0, result.stderr);
  }
  const selected = cli(file, "--set-mode", "subtle");
  assert.equal(selected.status, 0, selected.stderr);
  assert.deepEqual(JSON.parse(selected.stdout), {
    schemaVersion: 1, mode: "subtle",
    effects: Object.fromEntries(Object.keys(defaults().effects).map((effect) => [effect, false])),
  });
  const before = await fs.readFile(file);
  for (const args of [[], ["--set-mode"], ["--set-mode", "fast"], ["--set-effect", "unknown", "on"],
    ["--set-effect", "ambient", "true"], ["--get", "extra"], ["--get", "--file", file]]) {
    const result = cli(file, ...args);
    assert.notEqual(result.status, 0, args.join(" "));
    assert.equal(result.stdout, "");
    assert.deepEqual(await fs.readFile(file), before);
  }
});

test("Linux wrapper uses the installed shared CLI without launching Codex", { skip: process.platform !== "linux" }, async (t) => {
  const { root } = await fixture(t);
  const scripts = path.join(root, "engine", "scripts");
  const assets = path.join(root, "engine", "assets");
  await fs.mkdir(scripts, { recursive: true });
  await fs.mkdir(assets);
  for (const name of ["common-linux.sh", "motion-settings-linux.sh"]) {
    await fs.copyFile(new URL(`../linux/scripts/${name}`, import.meta.url), path.join(scripts, name));
  }
  await fs.copyFile(moduleFile, path.join(assets, "motion-settings.mjs"));
  const result = spawnSync("bash", [path.join(scripts, "motion-settings-linux.sh"), "--set-mode", "off"], {
    env: { ...process.env, NODE: process.execPath, XDG_STATE_HOME: path.join(root, "state") }, encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).mode, "off");
  const file = path.join(root, "state", "CodexDreamSkin", "motion.json");
  assert.equal((await readMotionSettings(file)).mode, "off");
});
