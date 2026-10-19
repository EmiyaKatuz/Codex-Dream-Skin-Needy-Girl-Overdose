import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import test from "node:test";
import { migrateRetiredThemes } from "../runtime/retired-theme-migration.mjs";

const production = JSON.parse(await fs.readFile(new URL("../runtime/retired-theme-catalog.json", import.meta.url), "utf8"));
const jpeg = await fs.readFile(new URL("../windows/assets/dream-reference.jpg", import.meta.url));
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZLkAAAAASUVORK5CYII=", "base64");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const oldTheme = { ...structuredClone(production.templates[0].theme), image: "art.png" };
const catalog = { ...production, templates: [{ key: "fixture-pixel-cafe", theme: oldTheme, imageSha256: hash(png) }] };

async function fixture(t, activeName = "active-theme") {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "dream-retired-test-")));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateRoot = path.join(root, "state");
  const defaultThemeDir = path.join(root, "assets");
  await fs.mkdir(path.join(stateRoot, "themes"), { recursive: true });
  await writePack(defaultThemeDir, production.retained.theme, jpeg);
  await fs.writeFile(path.join(defaultThemeDir, "unrelated-runtime.mjs"), "// runtime asset\n");
  const options = { stateRoot, activeName, defaultThemeDir, catalog: structuredClone(catalog) };
  return { ...options, options, active: path.join(stateRoot, activeName), saved: path.join(stateRoot, "themes") };
}

async function writePack(directory, theme = oldTheme, image = png) {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "theme.json"), JSON.stringify(theme, null, 2) + "\n");
  await fs.writeFile(path.join(directory, theme.image), image);
}

test("upgrade archives retired snapshots and active copy, leaving one JPEG plus genuine custom themes", async (t) => {
  const f = await fixture(t);
  await writePack(f.active, { ...oldTheme, id: "20260101-deadbeef", name: "Pixel Cafe" });
  await writePack(path.join(f.saved, "preset-internet-angel"));
  await writePack(path.join(f.saved, "saved-copy"), { ...oldTheme, id: "snapshot", name: "Pixel Cafe", image: "renamed.png" });
  await writePack(path.join(f.saved, "custom-same-name"), { ...oldTheme, id: "custom", name: "Pixel Cafe", quote: "my edited theme" });
  await writePack(path.join(f.saved, "custom-css"));
  await fs.writeFile(path.join(f.saved, "custom-css/theme.css"), "[data-ds-part=root]{color:red}");
  await writePack(path.join(f.saved, production.retained.theme.id), production.retained.theme, jpeg);
  const preferences = '{"schemaVersion":1,"themes":{"snapshot":{"transparency":51}}}\n';
  await fs.writeFile(path.join(f.stateRoot, "theme-preferences.json"), preferences);
  const activeBefore = await fs.readFile(path.join(f.active, "theme.json"));
  const result = await migrateRetiredThemes(f.options);
  assert.equal(result.activeReplaced, true);
  assert.equal(result.archived, 2);
  assert.deepEqual((await fs.readdir(f.saved)).sort(), ["custom-css", "custom-same-name", production.retained.theme.id].sort());
  assert.deepEqual(await fs.readFile(path.join(result.backupRoot, "active-theme/theme.json")), activeBefore);
  assert.deepEqual(await fs.readFile(path.join(result.backupRoot, "active-theme/art.png")), png);
  assert.equal(JSON.parse(await fs.readFile(path.join(f.active, "theme.json"))).id, production.retained.theme.id);
  assert.deepEqual(await fs.readFile(path.join(f.active, production.retained.theme.image)), jpeg);
  const manifest = JSON.parse(await fs.readFile(path.join(result.backupRoot, "manifest.json")));
  assert.deepEqual(manifest.themes.map((entry) => entry.source).sort(), ["preset-internet-angel", "saved-copy"]);
  for (const entry of manifest.themes) {
    const theme = JSON.parse(await fs.readFile(path.join(result.backupRoot, entry.backup, "theme.json")));
    assert.deepEqual(await fs.readFile(path.join(result.backupRoot, entry.backup, theme.image)), png);
  }
  assert.equal(await fs.readFile(path.join(f.stateRoot, "theme-preferences.json"), "utf8"), preferences);
  assert.deepEqual(await migrateRetiredThemes(f.options), { activeReplaced: false, archived: 0, backupRoot: null });
  assert.equal((await fs.readdir(path.join(f.stateRoot, "retired-themes"))).length, 1);
  // Explicitly restoring an archived theme after the one-time upgrade keeps
  // that later user choice, instead of silently archiving it on every launch.
  await writePack(path.join(f.saved, "restored-by-user"));
  await migrateRetiredThemes(f.options);
  assert.deepEqual(await fs.readFile(path.join(f.saved, "restored-by-user", oldTheme.image)), png);
});

test("image or authored metadata mismatch and imported manifests are preserved even with retired IDs", async (t) => {
  const f = await fixture(t, "theme");
  await writePack(f.active, { ...oldTheme, name: "Pixel Cafe", tagline: "personal change" });
  await writePack(path.join(f.saved, "wrong-image"), oldTheme, jpeg);
  await writePack(path.join(f.saved, "imported"));
  await fs.writeFile(path.join(f.saved, "imported/manifest.json"), "{}");
  await writePack(path.join(f.saved, "malformed"));
  await fs.writeFile(path.join(f.saved, "malformed/theme.json"), "{");
  assert.deepEqual(await migrateRetiredThemes(f.options), { activeReplaced: false, archived: 0, backupRoot: null });
  assert.equal((await fs.readdir(f.saved)).length, 3);
});

test("live import lock and pending recovery refuse migration before user files move", async (t) => {
  const f = await fixture(t);
  await writePack(f.active);
  const lock = path.join(f.saved, ".theme-import.lock");
  await fs.mkdir(lock);
  await fs.writeFile(path.join(lock, "owner.json"), JSON.stringify({ pid: process.pid, token: "11111111-1111-1111-1111-111111111111", createdAt: new Date().toISOString() }));
  await assert.rejects(migrateRetiredThemes(f.options), /Another theme import/);
  await fs.rm(lock, { recursive: true });
  await fs.mkdir(path.join(f.saved, ".theme-replace-pending"));
  await assert.rejects(migrateRetiredThemes(f.options), /recovery is still pending/);
  assert.deepEqual(await fs.readFile(path.join(f.active, oldTheme.image)), png);
  await assert.rejects(fs.stat(path.join(f.stateRoot, "retired-themes")), { code: "ENOENT" });
});

test("invalid replacement is rejected before creating backups or changing active files", async (t) => {
  const f = await fixture(t);
  await writePack(f.active);
  await fs.writeFile(path.join(f.defaultThemeDir, production.retained.theme.image), "tampered image");
  await assert.rejects(migrateRetiredThemes(f.options), /Reviewed JPEG replacement/);
  assert.deepEqual(await fs.readFile(path.join(f.active, oldTheme.image)), png);
  await assert.rejects(fs.stat(path.join(f.stateRoot, "retired-themes")), { code: "ENOENT" });
});

test("active publication failure rolls the original directory back without losing its contents", async (t) => {
  const f = await fixture(t);
  await writePack(f.active);
  const originalRename = fs.rename;
  fs.rename = async (source, destination) => {
    if (path.basename(source).startsWith(".retired-theme-stage-")) {
      const error = new Error("injected publication failure"); error.code = "EACCES"; throw error;
    }
    return originalRename(source, destination);
  };
  try { await assert.rejects(migrateRetiredThemes(f.options), /injected publication failure/); }
  finally { fs.rename = originalRename; }
  assert.deepEqual(await fs.readFile(path.join(f.active, oldTheme.image)), png);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.active, "theme.json"))), oldTheme);
  assert.equal((await fs.readdir(f.stateRoot)).some((name) => name.startsWith(".retired-theme-stage-")), false);
  assert.equal((await fs.readdir(f.saved)).includes(".theme-import.lock"), false);
});

test("redirected state paths are rejected and linked saved directories are never followed", async (t) => {
  const f = await fixture(t);
  const outside = path.join(f.stateRoot, "outside");
  await writePack(outside);
  await fs.symlink(outside, path.join(f.saved, "linked"), process.platform === "win32" ? "junction" : "dir");
  assert.deepEqual(await migrateRetiredThemes(f.options), { activeReplaced: false, archived: 0, backupRoot: null });
  assert.deepEqual(await fs.readFile(path.join(outside, oldTheme.image)), png);
  await fs.symlink(f.stateRoot, path.join(f.stateRoot, "redirect"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(migrateRetiredThemes({ ...f.options, stateRoot: path.join(f.stateRoot, "redirect") }), /redirected/);
});

test("production catalog contains fingerprints, without restoring removed artwork", () => {
  assert.equal(production.retained.imageSha256, hash(jpeg));
  assert.ok(production.templates.some((entry) => entry.key === "pixel-cafe" && entry.imageSha256 === "d78177458da6c805d5ef55ea65cf4352a80aba921f4770029f15384bdcdbdea5"));
  assert.ok(production.templates.some((entry) => entry.key === "gothic"));
});

test("Linux upgrade preserves the reviewed full-performance JPEG default", async (t) => {
  const f = await fixture(t, "theme");
  const linuxTheme = JSON.parse(await fs.readFile(new URL("../linux/assets/theme.json", import.meta.url), "utf8"));
  await writePack(f.defaultThemeDir, linuxTheme, jpeg);
  await writePack(f.active);
  const result = await migrateRetiredThemes(f.options);
  assert.equal(result.activeReplaced, true);
  assert.equal(JSON.parse(await fs.readFile(path.join(f.active, "theme.json"))).performanceMode, "full");
});
