import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const MAX_JSON = 256 * 1024;
const MAX_IMAGE = 10 * 1024 * 1024;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const missing = (error) => error.code === "ENOENT";
const object = (value) => value && typeof value === "object" && !Array.isArray(value);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!object(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function authored(theme) {
  const normalized = structuredClone(theme);
  for (const key of ["id", "name", "image"]) delete normalized[key];
  normalized.schemaVersion ??= 1;
  normalized.appearance ||= "auto";
  normalized.art ||= { focusX: null, focusY: null, safeArea: "auto", taskMode: "auto" };
  return JSON.stringify(stable(normalized));
}

async function safePath(target) {
  let current = path.resolve(target);
  for (;;) {
    const stat = await fs.lstat(current).catch((error) => { if (missing(error)) return null; throw error; });
    if (stat?.isSymbolicLink()) throw new Error("Theme migration refuses redirected paths");
    const parent = path.dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

async function read(file, limit) {
  if (file instanceof URL) file = fileURLToPath(file);
  await safePath(file);
  const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > limit) throw new Error("Theme migration input exceeds its limits");
    const bytes = await handle.readFile();
    if (bytes.length < 1 || bytes.length > limit) throw new Error("Theme migration input changed size");
    return bytes;
  } finally { await handle.close(); }
}

async function directory(target) {
  await safePath(target);
  await fs.mkdir(target, { recursive: true, mode: 0o700 });
  const stat = await fs.lstat(target);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Theme migration requires private directories");
}

async function pack(directoryPath, runtimeAssets = false) {
  await safePath(directoryPath);
  const metadata = await read(path.join(directoryPath, "theme.json"), MAX_JSON);
  const theme = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(metadata));
  if (!object(theme) || typeof theme.id !== "string" || typeof theme.image !== "string" ||
      !theme.image || theme.image.includes("/") || theme.image.includes("\\") ||
      theme.image === "." || theme.image === ".." || !/\.(png|jpe?g|webp)$/i.test(theme.image)) {
    throw new Error("Theme migration cannot identify this theme");
  }
  let entries = await fs.readdir(directoryPath, { withFileTypes: true });
  // Added CSS, manifests, licenses or other user content distinguish a custom
  // theme from the old two-file built-ins. Preserve those themes in the library.
  const allowed = new Set(["theme.json", theme.image, ".DS_Store", "desktop.ini", "Thumbs.db"]);
  if (runtimeAssets) entries = entries.filter((entry) => entry.name === "theme.json" || entry.name === theme.image);
  if (entries.some((entry) => !entry.isFile() || !allowed.has(entry.name))) return null;
  const image = await read(path.join(directoryPath, theme.image), MAX_IMAGE);
  const checks = [];
  for (const entry of entries) {
    const file = path.join(directoryPath, entry.name);
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_IMAGE) return null;
    checks.push([entry.name, stat.size, stat.mtimeMs, stat.ino]);
  }
  return { theme, metadata, image, imageSha256: digest(image), authored: authored(theme),
    fingerprint: digest(Buffer.from(JSON.stringify([digest(metadata), digest(image), checks.sort()]))), directory: directoryPath };
}

function validateCatalog(catalog) {
  if (!object(catalog) || catalog.schemaVersion !== 1 || !/^\d+\.\d+\.\d+$/.test(catalog.version) ||
      !object(catalog.retained) || catalog.retained.theme?.id !== "preset-internet-angel-default" ||
      !Array.isArray(catalog.templates) || catalog.templates.length > 32) throw new Error("Invalid retired-theme catalog");
  for (const entry of [catalog.retained, ...catalog.templates]) {
    if (!object(entry.theme) || !/^[a-f0-9]{64}$/.test(entry.imageSha256)) throw new Error("Invalid retired-theme catalog entry");
  }
  if (catalog.retained.variants !== undefined && (!Array.isArray(catalog.retained.variants) ||
      catalog.retained.variants.length > 3 || catalog.retained.variants.some((theme) => !object(theme) || theme.id !== catalog.retained.theme.id))) {
    throw new Error("Invalid retained-theme platform variants");
  }
}

function retired(record, catalog) {
  if (!record) return false;
  if (record.theme.id === catalog.retained.theme.id && record.imageSha256 === catalog.retained.imageSha256) return false;
  return catalog.templates.some((entry) => record.imageSha256 === entry.imageSha256 && record.authored === authored(entry.theme));
}

async function lockOwner(lock) {
  try {
    const owner = JSON.parse((await read(path.join(lock, "owner.json"), 4096)).toString("utf8"));
    if (!object(owner) || !Number.isSafeInteger(owner.pid) || owner.pid < 1 ||
        typeof owner.token !== "string" || !/^[a-f0-9-]{36}$/.test(owner.token) ||
        typeof owner.createdAt !== "string" || !Number.isFinite(Date.parse(owner.createdAt))) return null;
    return owner;
  } catch { return null; }
}

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== "ESRCH"; }
}

async function acquireImportLock(themesRoot) {
  const lock = path.join(themesRoot, ".theme-import.lock");
  const token = randomUUID();
  let owned = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    await safePath(lock);
    try { await fs.mkdir(lock, { mode: 0o700 }); owned = true; break; }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      const stat = await fs.lstat(lock);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Theme import lock is unsafe");
      const owner = await lockOwner(lock);
      if ((owner && alive(owner.pid)) || (!owner && Date.now() - stat.mtimeMs < 300000)) {
        throw new Error("Another theme import is still running");
      }
      // Retain abandoned lock evidence rather than recursively deleting it.
      await fs.rename(lock, path.join(themesRoot, `.theme-import-lock-stale-${randomUUID()}`));
    }
  }
  if (!owned) throw new Error("Could not acquire the theme import lock");
  try {
    await fs.writeFile(path.join(lock, "owner.json"), JSON.stringify({ pid: process.pid, token, createdAt: new Date().toISOString() }) + "\n", { flag: "wx", mode: 0o600 });
  } catch (error) { await fs.rmdir(lock).catch(() => {}); throw error; }
  return async () => {
    const owner = await lockOwner(lock);
    if (owner?.pid !== process.pid || owner?.token !== token) return;
    await fs.unlink(path.join(lock, "owner.json"));
    await fs.rmdir(lock);
  };
}

async function optionalPack(directoryPath) {
  try { return await pack(directoryPath); } catch { return null; }
}

// Callers also hold their platform's active-theme/operation lock. On Windows
// they must hold the named ThemeImport mutex shared with the native manager.
export async function migrateRetiredThemes({ stateRoot, activeName, defaultThemeDir, catalog }) {
  if (!["theme", "active-theme"].includes(activeName) || typeof stateRoot !== "string" || !stateRoot ||
      typeof defaultThemeDir !== "string" || !defaultThemeDir) throw new Error("Invalid theme migration arguments");
  catalog ??= JSON.parse((await read(new URL("./retired-theme-catalog.json", import.meta.url), MAX_JSON)).toString("utf8"));
  validateCatalog(catalog);
  const root = path.resolve(stateRoot);
  if (root === path.parse(root).root) throw new Error("Theme migration requires a dedicated state directory");
  await directory(root);
  const themesRoot = path.join(root, "themes");
  const activeRoot = path.join(root, activeName);
  await directory(themesRoot);
  await safePath(activeRoot);
  const release = await acquireImportLock(themesRoot);
  let stage = null;
  try {
    const marker = path.join(root, `.retired-theme-migration-${catalog.version}.json`);
    await safePath(marker);
    const completed = await read(marker, 4096).catch((error) => { if (missing(error)) return null; throw error; });
    if (completed) {
      const status = JSON.parse(completed.toString("utf8"));
      if (status.schemaVersion !== 1 || status.version !== catalog.version || status.completed !== true) {
        throw new Error("Invalid theme migration completion marker");
      }
      return { activeReplaced: false, archived: 0, backupRoot: null };
    }
    const complete = async () => {
      const temporary = path.join(root, `.retired-theme-complete-${randomUUID()}.tmp`);
      try {
        await fs.writeFile(temporary, JSON.stringify({ schemaVersion: 1, version: catalog.version, completed: true }) + "\n", { flag: "wx", mode: 0o600 });
        await safePath(marker);
        await fs.rename(temporary, marker);
      } finally { await fs.unlink(temporary).catch(() => {}); }
    };
    const names = await fs.readdir(themesRoot, { withFileTypes: true });
    if (names.some((entry) => /^\.theme-replace-/.test(entry.name))) throw new Error("Theme import recovery is still pending");
    if (names.length > 4096) throw new Error("Theme library exceeds migration limits");
    const oldActive = await optionalPack(activeRoot);
    const replaceActive = retired(oldActive, catalog);
    const candidates = [];
    for (const entry of names) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name.startsWith(".")) continue;
      const record = await optionalPack(path.join(themesRoot, entry.name));
      if (retired(record, catalog)) candidates.push(record);
    }
    if (!replaceActive && candidates.length === 0) {
      await complete();
      return { activeReplaced: false, archived: 0, backupRoot: null };
    }
    // Verify the replacement before creating a backup or moving any user bytes.
    const replacement = await pack(path.resolve(defaultThemeDir), true);
    if (!replacement || replacement.imageSha256 !== catalog.retained.imageSha256 ||
        ![catalog.retained.theme, ...(catalog.retained.variants ?? [])].some((theme) =>
          JSON.stringify(stable(replacement.theme)) === JSON.stringify(stable(theme)))) {
      throw new Error("Reviewed JPEG replacement theme is unavailable");
    }
    const archive = path.join(root, "retired-themes");
    await directory(archive);
    const backupRoot = path.join(archive, `${catalog.version}-${randomUUID()}`);
    await fs.mkdir(backupRoot, { mode: 0o700 });
    const report = { schemaVersion: 1, version: catalog.version, activeReplaced: false, themes: [] };
    const recordReport = async () => {
      const temporary = path.join(backupRoot, ".manifest.tmp");
      await fs.writeFile(temporary, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
      await fs.rename(temporary, path.join(backupRoot, "manifest.json"));
    };
    await recordReport();
    if (replaceActive) {
      stage = path.join(root, `.retired-theme-stage-${randomUUID()}`);
      await fs.mkdir(stage, { mode: 0o700 });
      await fs.writeFile(path.join(stage, replacement.theme.image), replacement.image, { flag: "wx", mode: 0o600 });
      await fs.writeFile(path.join(stage, "theme.json"), replacement.metadata, { flag: "wx", mode: 0o600 });
      const checked = await pack(activeRoot);
      if (!checked || checked.fingerprint !== oldActive.fingerprint) throw new Error("Active theme changed during migration");
      const activeBackup = path.join(backupRoot, activeName);
      await fs.rename(activeRoot, activeBackup);
      try { await fs.rename(stage, activeRoot); stage = null; }
      catch (error) {
        // Never overwrite a concurrently created directory when rolling back.
        const exists = await fs.lstat(activeRoot).catch((failure) => { if (missing(failure)) return null; throw failure; });
        if (!exists) await fs.rename(activeBackup, activeRoot);
        throw error;
      }
      report.activeReplaced = true;
      await recordReport();
    }
    for (const record of candidates) {
      const current = await optionalPack(record.directory);
      if (!current || current.fingerprint !== record.fingerprint) throw new Error("Saved theme changed during migration");
      const destination = path.basename(record.directory);
      const backupName = `saved-${report.themes.length}`;
      // Journal the intended source/backup names before the same-volume rename.
      report.themes.push({ source: destination, backup: backupName });
      await recordReport();
      await fs.rename(record.directory, path.join(backupRoot, backupName));
    }
    await complete();
    return { activeReplaced: report.activeReplaced, archived: report.themes.length, backupRoot };
  } finally {
    if (stage) await fs.rm(stage, { recursive: true, force: true });
    await release();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const keys = new Map([["--state-root", "stateRoot"], ["--active-name", "activeName"], ["--default-theme-dir", "defaultThemeDir"]]);
    if (args.length !== 6) throw new Error("Invalid theme migration arguments");
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = keys.get(args[i]);
      if (!key || Object.hasOwn(options, key) || !args[i + 1]) throw new Error("Invalid theme migration arguments");
      options[key] = args[i + 1];
    }
    console.log(JSON.stringify(await migrateRetiredThemes(options)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
