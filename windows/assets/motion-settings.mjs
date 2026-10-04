#!/usr/bin/env node

import fs from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

export const MOTION_MODES = Object.freeze(["system", "off", "subtle", "full"]);
const EFFECTS = Object.freeze(["interactions", "status", "character", "ambient", "themeTransition"]);
export const DEFAULT_MOTION_SETTINGS = Object.freeze({
  schemaVersion: 1,
  mode: "system",
  effects: Object.freeze(Object.fromEntries(EFFECTS.map((effect) => [effect, true]))),
});
const MAX_BYTES = 16 * 1024;
const READ_FLAGS = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);
const CREATE_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);

function fail(message) {
  throw new Error(`Motion settings: ${message}`);
}

function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    fail(`${label} must be a plain object.`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || ownKeys.some((key) => !keys.includes(key))) {
    fail(`${label} must contain exactly the registered fields.`);
  }
  if (ownKeys.some((key) => !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), "value"))) {
    fail(`${label} must not contain accessors.`);
  }
}

export function normalizeMotionSettings(raw) {
  exactObject(raw, ["schemaVersion", "mode", "effects"], "configuration");
  if (raw.schemaVersion !== 1) fail("schemaVersion must be 1.");
  if (!MOTION_MODES.includes(raw.mode)) fail("mode is unsupported.");
  exactObject(raw.effects, EFFECTS, "effects");
  for (const effect of EFFECTS) {
    if (typeof raw.effects[effect] !== "boolean") fail(`effects.${effect} must be boolean.`);
  }
  return {
    schemaVersion: 1,
    mode: raw.mode,
    effects: Object.fromEntries(EFFECTS.map((effect) => [effect, raw.effects[effect]])),
  };
}

function absolutePath(value, api = path) {
  if (typeof value !== "string" || !value || /[\u0000-\u001f\u007f]/u.test(value)
    || !api.isAbsolute(value)) fail("a local absolute path is required.");
  if (api === path.win32 && (!/^[A-Za-z]:[\\/]/.test(value) || /[:*?"<>|]/.test(value.slice(2)))) {
    fail("a local drive path without alternate streams is required.");
  }
  return api.resolve(value);
}

export function getMotionSettingsPath({ platform = process.platform, env = process.env, homeDir = os.homedir() } = {}) {
  if (platform === "win32") {
    return path.win32.join(absolutePath(env.LOCALAPPDATA, path.win32), "CodexDreamSkin", "motion.json");
  }
  if (platform === "darwin") {
    return path.posix.join(absolutePath(homeDir, path.posix), "Library", "Application Support", "CodexDreamSkinStudio", "motion.json");
  }
  if (platform === "linux") {
    const stateRoot = env.XDG_STATE_HOME
      ? absolutePath(env.XDG_STATE_HOME, path.posix)
      : path.posix.join(absolutePath(homeDir, path.posix), ".local", "state");
    return path.posix.join(stateRoot, "CodexDreamSkin", "motion.json");
  }
  fail("platform is unsupported.");
}

function samePath(left, right) {
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

async function statOrMissing(file) {
  try { return await fs.lstat(file); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

// Walk from the filesystem root rather than resolving an unchecked ancestor.
// Checking the canonical spelling also rejects Windows junction/path redirects.
async function directoryChain(directory, create = false) {
  const root = path.parse(directory).root;
  const segments = path.relative(root, directory).split(path.sep).filter(Boolean);
  let current = root;
  const chain = [];
  for (const segment of [null, ...segments]) {
    if (segment !== null) current = path.join(current, segment);
    let stat = await statOrMissing(current);
    if (!stat && create) {
      await verifyChain(chain);
      try { await fs.mkdir(current, { mode: 0o700 }); }
      catch (error) { if (error.code !== "EEXIST") throw error; }
      stat = await fs.lstat(current);
    }
    if (!stat) return null;
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail("an ancestor is not a trusted directory.");
    const canonical = await fs.realpath(current);
    if (!samePath(current, canonical)) fail("directory redirection is not allowed.");
    const confirmed = await fs.lstat(current);
    if (!sameFile(stat, confirmed) || confirmed.isSymbolicLink()) fail("an ancestor changed during access.");
    chain.push({ file: current, stat });
  }
  return chain;
}

async function verifyChain(chain) {
  for (const { file, stat } of chain) {
    const current = await fs.lstat(file);
    if (current.isSymbolicLink() || !current.isDirectory() || !sameFile(stat, current)
      || !samePath(file, await fs.realpath(file))) fail("an ancestor changed during access.");
  }
}

function checkFile(stat) {
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) fail("configuration must be a regular file with no additional links.");
  if (stat.size < 1 || stat.size > MAX_BYTES) fail("configuration must be between 1 and 16384 bytes.");
}

function fingerprint(stat) {
  return [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs].join(":");
}

async function readSnapshot(file, chain) {
  await verifyChain(chain);
  const before = await statOrMissing(file);
  if (!before) return { settings: normalizeMotionSettings(DEFAULT_MOTION_SETTINGS), stamp: null };
  checkFile(before);
  const handle = await fs.open(file, READ_FLAGS);
  try {
    const opened = await handle.stat();
    checkFile(opened);
    if (fingerprint(before) !== fingerprint(opened)) fail("configuration changed during access.");
    // A bounded read remains bounded even if the file grows after stat().
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length < 1 || length > MAX_BYTES) fail("configuration must be between 1 and 16384 bytes.");
    await verifyChain(chain);
    const after = await fs.lstat(file);
    if (fingerprint(before) !== fingerprint(after) || fingerprint(before) !== fingerprint(await handle.stat())) {
      fail("configuration changed during access.");
    }
    let raw;
    try {
      const source = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, length));
      raw = JSON.parse(source);
      // Registered root/effect names are disjoint. Reject duplicate JSON keys,
      // including escaped spellings, before normalization discards ambiguity.
      const keys = [...source.matchAll(/("(?:[^"\\]|\\.)*")\s*:/g)].map((match) => JSON.parse(match[1]));
      if (new Set(keys).size !== keys.length) fail("configuration repeats a field.");
    }
    catch { fail("configuration is not valid UTF-8 JSON."); }
    return { settings: normalizeMotionSettings(raw), stamp: fingerprint(before) };
  } finally { await handle.close(); }
}

function safeError(error) {
  if (error.message?.startsWith("Motion settings:")) return error;
  const failure = new Error(`Motion settings: filesystem operation failed (${error.code || "unknown"}).`);
  if (error.code) failure.code = error.code;
  return failure;
}

export async function readMotionSettings(filePath = getMotionSettingsPath()) {
  try {
    const file = absolutePath(filePath);
    const chain = await directoryChain(path.dirname(file));
    if (!chain) return normalizeMotionSettings(DEFAULT_MOTION_SETTINGS);
    return (await readSnapshot(file, chain)).settings;
  } catch (error) { throw safeError(error); }
}

async function updateMotionSettings(update, filePath) {
  const file = absolutePath(filePath);
  const directory = path.dirname(file);
  const chain = await directoryChain(directory, true);
  const lockFile = path.join(directory, `.${path.basename(file)}.lock`);
  let lock;
  let temporary;
  let temporaryStamp;
  let temporaryIdentity;
  try {
    await verifyChain(chain);
    try { lock = await fs.open(lockFile, CREATE_FLAGS, 0o600); }
    catch (error) {
      if (error.code === "EEXIST") fail("another update is in progress; retry after it finishes.");
      throw error;
    }
    const original = await readSnapshot(file, chain);
    const settings = normalizeMotionSettings(update(original.settings));
    temporary = path.join(directory, `.${path.basename(file)}.${randomUUID()}.tmp`);
    await verifyChain(chain);
    const stage = await fs.open(temporary, CREATE_FLAGS, 0o600);
    try {
      temporaryIdentity = await stage.stat();
      await stage.writeFile(`${JSON.stringify(settings, null, 2)}\n`, "utf8");
      await stage.sync();
      temporaryStamp = fingerprint(await stage.stat());
    } finally { await stage.close(); }
    await verifyChain(chain);
    const current = await statOrMissing(file);
    if ((current ? fingerprint(current) : null) !== original.stamp) fail("configuration changed before publication.");
    if (current) checkFile(current);
    const staged = await fs.lstat(temporary);
    checkFile(staged);
    if (fingerprint(staged) !== temporaryStamp) fail("staged configuration changed before publication.");
    await fs.rename(temporary, file);
    temporary = null;
    return settings;
  } finally {
    // Never clean through a redirected ancestor, or remove someone else's file.
    if (temporary && temporaryIdentity) {
      try {
        await verifyChain(chain);
        const staged = await statOrMissing(temporary);
        if (staged && !staged.isSymbolicLink() && sameFile(staged, temporaryIdentity)) await fs.unlink(temporary);
      } catch { /* Preserve unverified files for diagnosis. */ }
    }
    if (lock) {
      const owned = await lock.stat();
      await lock.close();
      try {
        await verifyChain(chain);
        const current = await statOrMissing(lockFile);
        if (current && !current.isSymbolicLink() && sameFile(owned, current)) await fs.unlink(lockFile);
      } catch { /* Leave an unverified lock rather than deleting a foreign file. */ }
    }
  }
}

export async function writeMotionSettings(settings, filePath = getMotionSettingsPath()) {
  const normalized = normalizeMotionSettings(settings);
  try { return await updateMotionSettings(() => normalized, filePath); }
  catch (error) { throw safeError(error); }
}

async function main(args) {
  let file;
  const fileIndex = args.indexOf("--file");
  if (fileIndex !== -1) {
    file = args[fileIndex + 1];
    if (!file || file.startsWith("--")) fail("--file requires an absolute path.");
    args = [...args.slice(0, fileIndex), ...args.slice(fileIndex + 2)];
  }
  file ??= getMotionSettingsPath();
  let settings;
  if (args.length === 1 && args[0] === "--get") {
    settings = await readMotionSettings(file);
  } else if (args.length === 2 && args[0] === "--set-mode" && MOTION_MODES.includes(args[1])) {
    settings = await updateMotionSettings((current) => ({ ...current, mode: args[1] }), file);
  } else if (args.length === 3 && args[0] === "--set-effect" && EFFECTS.includes(args[1]) && ["on", "off"].includes(args[2])) {
    settings = await updateMotionSettings((current) => ({
      ...current, effects: { ...current.effects, [args[1]]: args[2] === "on" },
    }), file);
  } else {
    fail("use --get, --set-mode system|off|subtle|full, or --set-effect NAME on|off; optionally --file PATH.");
  }
  process.stdout.write(`${JSON.stringify(settings)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${safeError(error).message}\n`);
    process.exitCode = 1;
  });
}
