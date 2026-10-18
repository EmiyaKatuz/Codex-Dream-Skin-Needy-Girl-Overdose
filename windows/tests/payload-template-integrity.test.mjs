import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { loadPayload } from "../scripts/injector.mjs";

// Regression for the payload template substitution bug.
//
// loadPayload() used `template.replace(placeholder, JSON.stringify(value))`.
// String.prototype.replace interprets `$$`, `$&`, "$`" and `$'` in the
// replacement even when it is a plain string, so any `$` reaching a
// substituted value rewrote the payload:
//
//   name       parses?  effect on the emitted payload
//   ---------  -------  ------------------------------------------------
//   "a$$b"     yes      silently becomes "a$b"
//   "a$&b"     yes      silently becomes "a__DREAM_SKIN_THEME_JSON__b"
//   "a$`b"     NO       splices the whole 38 KB template prefix back in
//   "a$'b"     NO       splices the whole template suffix back in
//
// theme.json is user-supplied and normalizeThemeText deliberately allows `$`
// (it is legitimate text), so this was reachable from any imported theme. The
// fix passes a replacer function instead, which is never scanned for `$`
// patterns. These tests drive the real loadPayload build path -- they must not
// reimplement the substitution.

const here = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(here, "../assets");
const templatePath = path.join(assetsDir, "renderer-inject.js");
const template = await fs.readFile(templatePath, "utf8");

// A distinctive, long-enough slice of the template. If a `$`-splice pastes the
// template source back into the payload, this fragment shows up more than once.
const TEMPLATE_FINGERPRINT = 'const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";';
assert.equal(
  template.split(TEMPLATE_FINGERPRINT).length - 1,
  1,
  "The fingerprint must occur exactly once in the template for the splice check to mean anything.",
);

const PLACEHOLDERS = [
  "__DREAM_CSS_JSON__",
  "__DREAM_ART_JSON__",
  "__DREAM_THEME_JSON__",
  "__DREAM_SKIN_VERSION_JSON__",
  "__DREAM_SKIN_PAYLOAD_REVISION_JSON__",
  "__DREAM_SIDEBAR_SCROLL_QUIET_ENABLED_JSON__",
];

async function buildWith(themeFields, safeCss = null) {
  const themeDir = await fs.mkdtemp(path.join(os.tmpdir(), "dream-skin-payload-"));
  try {
    await fs.copyFile(
      path.join(assetsDir, "dream-reference.jpg"),
      path.join(themeDir, "dream-reference.jpg"),
    );
    await fs.writeFile(
      path.join(themeDir, "theme.json"),
      JSON.stringify({
        schemaVersion: 1,
        id: "payload-integrity-fixture",
        image: "dream-reference.jpg",
        appearance: "auto",
        ...themeFields,
      }),
      "utf8",
    );
    if (safeCss !== null) {
      await fs.writeFile(path.join(themeDir, "theme.css"), safeCss, "utf8");
    }
    return await loadPayload(themeDir);
  } finally {
    await fs.rm(themeDir, { recursive: true, force: true });
  }
}

function assertIntactPayload(payload, label) {
  // Ordered most-specific first: a template splice also leaves duplicated
  // placeholders behind, so checking for the splice first reports the cause
  // rather than the symptom.
  assert.equal(
    payload.split(TEMPLATE_FINGERPRINT).length - 1,
    1,
    `${label}: the template source was spliced back into the payload.`,
  );
  for (const placeholder of PLACEHOLDERS) {
    assert.ok(
      !payload.includes(placeholder),
      `${label}: payload still contains the ${placeholder} placeholder.`,
    );
  }
  // Compile-only parse. This never executes the renderer script.
  assert.doesNotThrow(
    () => new Function(payload),
    `${label}: payload is not parseable JavaScript.`,
  );
}

function extractRendererArguments(payload) {
  // Inject an early return into the real renderer IIFE and evaluate only far
  // enough to recover its arguments. Parsing the final JSON-looking object was
  // brittle once the shared Internet Angel IIFE was appended to the payload.
  const marker = "((cssText, artDataUrl, rawConfig, sidebarScrollQuietEnabled) => {";
  const start = payload.indexOf("/* dream-skin:renderer:start */");
  const end = payload.indexOf("/* dream-skin:renderer:end */");
  assert.ok(start >= 0 && end > start, "payload must delimit its canonical renderer");
  const rendererPayload = payload.slice(start + "/* dream-skin:renderer:start */".length, end);
  const at = rendererPayload.indexOf(marker);
  assert.notEqual(at, -1, "payload must keep the canonical renderer IIFE signature");
  const probe = `${rendererPayload.slice(0, at + marker.length)}
return { cssText, rawConfig, sidebarScrollQuietEnabled };
${rendererPayload.slice(at + marker.length)}`;
  const art = payload.match(/const __dreamSkinMotionArt = (.*);/);
  assert.ok(art, "payload must include its shared art value once");
  return vm.runInNewContext(probe, {
    __dreamSkinMotionArt: JSON.parse(art[1]),
  }, { timeout: 10_000 });
}

const DOLLAR_NAMES = [
  ["dollar-dollar", "a$$b"],
  ["dollar-ampersand", "a$&b"],
  ["dollar-backtick", "a$`b"],
  ["dollar-apostrophe", "a$'b"],
  ["dollar-group-refs", "a$1b$<name>c"],
  ["combined", "N $` $& $$ $' $1 $<x>"],
  ["leading-and-trailing", "$$$&$`$'"],
];

test("theme names containing $ substitution patterns cannot corrupt the payload", async () => {
  for (const [label, name] of DOLLAR_NAMES) {
    const loaded = await buildWith({ name });
    assertIntactPayload(loaded.payload, label);
    assert.equal(loaded.theme.name, name, `${label}: loadTheme must keep the name verbatim.`);
    assert.equal(
      extractRendererArguments(loaded.payload).rawConfig.name,
      name,
      `${label}: the theme name in the payload must be byte-for-byte identical to theme.json.`,
    );
  }
});

test("$ patterns in every user-visible theme string survive the build", async () => {
  // theme.name is the shortest path to the bug, but the whole theme object goes
  // through the same single substitution, so every field shares the hazard.
  // No leading/trailing whitespace here: normalizeThemeText trims, which would
  // make the round-trip assertions compare against the wrong expectation.
  const fields = {
    name: "name $`",
    brandSubtitle: "brand $&",
    tagline: "tagline $$",
    projectPrefix: "prefix $'",
    projectLabel: "label $1",
    statusText: "status $<x>",
    quote: "quote $` $& $$ $'",
  };
  const loaded = await buildWith(fields);
  assertIntactPayload(loaded.payload, "all-fields");
  const emitted = extractRendererArguments(loaded.payload).rawConfig;
  for (const [key, value] of Object.entries(fields)) {
    assert.equal(loaded.theme[key], value, `loadTheme mangled ${key}.`);
    assert.equal(emitted[key], value, `The payload mangled ${key}.`);
  }
});

test("an ordinary theme name is unaffected by the fix", async () => {
  const name = "桥本有菜 Dream Skin";
  const loaded = await buildWith({ name });
  assertIntactPayload(loaded.payload, "ordinary");
  assert.equal(extractRendererArguments(loaded.payload).rawConfig.name, name);

  const shipped = await loadPayload();
  assertIntactPayload(shipped.payload, "shipped-assets");
  assert.equal(
    extractRendererArguments(shipped.payload).rawConfig.name,
    shipped.theme.name,
    "The shipped theme must round-trip through the payload unchanged.",
  );
  assert.equal(extractRendererArguments(shipped.payload).sidebarScrollQuietEnabled, false,
    "System/Mica payloads must not run an Acrylic-only sidebar timer.");
  const acrylic = await loadPayload(undefined, null, "acrylic");
  assert.equal(acrylic.acrylicOverlay, true);
  assert.equal(extractRendererArguments(acrylic.payload).sidebarScrollQuietEnabled, true,
    "The Internet Angel Acrylic payload must enable sidebar scroll quiet mode.");
});

test("legacy palette accent migrates into the normalized colors contract", async () => {
  const loaded = await buildWith({ palette: { accent: "#ff45c8" } });
  const emitted = extractRendererArguments(loaded.payload).rawConfig;
  assert.equal(Object.hasOwn(loaded.theme, "palette"), false);
  assert.equal(Object.hasOwn(emitted, "palette"), false);
  assert.equal(loaded.theme.colors.accent, "#ff45c8");
  assert.equal(emitted.colors.accent, "#ff45c8");
  assert.equal(loaded.theme.colorMode, "explicit");
  assert.deepEqual(loaded.theme.explicitColorKeys, ["accent"]);
  assert.deepEqual(Array.from(emitted.explicitColorKeys), ["accent"]);

  const colorsWin = await buildWith({
    palette: { accent: "#ff45c8" },
    colors: { accent: "#2468ac" },
  });
  assert.equal(colorsWin.theme.colors.accent, "#2468ac",
    "The current colors contract must take precedence over a legacy palette value.");
  assert.deepEqual(colorsWin.theme.explicitColorKeys, ["accent"]);

  const mergedContracts = await buildWith({
    palette: { accent: "#ff45c8" },
    colors: { panel: "#102030" },
  });
  const mergedEmitted = extractRendererArguments(mergedContracts.payload).rawConfig;
  assert.equal(mergedContracts.theme.colors.accent, "#ff45c8");
  assert.equal(mergedEmitted.colors.accent, "#ff45c8");
  assert.deepEqual(mergedContracts.theme.explicitColorKeys, ["panel", "accent"],
    "A legacy accent must remain explicit when a partial current colors object is also present.");
  assert.deepEqual(Array.from(mergedEmitted.explicitColorKeys), ["panel", "accent"]);

  const automatic = await buildWith({});
  const automaticEmitted = extractRendererArguments(automatic.payload).rawConfig;
  assert.equal(automatic.theme.colorMode, "auto");
  assert.deepEqual(automatic.theme.explicitColorKeys, []);
  assert.deepEqual(Array.from(automaticEmitted.explicitColorKeys), [],
    "A theme without either color contract must retain automatic color semantics.");
});

test("Windows payload uses the same compiled Safe CSS cascade as macOS", async () => {
  const source = `[data-ds-part="sidebar"] {
  background-color: #123456;
}
[data-ds-part="header"] {
  color: var(--ds-theme-color-text);
}
[data-ds-part="home-hero"] {
  font-weight: 700;
}
[data-ds-part="composer"] {
  border-radius: 17px;
}
[data-ds-part="composer-toolbar"] {
  color: #abcdef;
}`;
  const loaded = await buildWith({ name: "Safe CSS cascade" }, source);
  const captured = extractRendererArguments(loaded.payload);
  assert.equal(loaded.safeCssStatus, "validated");
  assert.equal(loaded.safeCss, source,
    "The validated author source must remain available for fingerprinting and diagnostics.");
  assert.match(loaded.safeCssRuntime, /@layer dreamskin-community\s*\{/);
  assert.match(captured.cssText, /@layer dreamskin-accessibility, dreamskin-community;/);
  for (const declaration of [
    "background-color: #123456 !important;",
    "color: var(--ds-theme-color-text) !important;",
    "font-weight: 700 !important;",
    "border-radius: 17px !important;",
    "color: #abcdef !important;",
  ]) {
    assert.ok(loaded.safeCssRuntime.includes(declaration), declaration);
    assert.ok(captured.cssText.includes(declaration),
      `The final renderer IIFE must receive compiled Safe CSS: ${declaration}`);
  }
  assert.ok(captured.cssText.includes("background-image: none !important;"));
  assert.match(captured.cssText, /composer-toolbar[^\n]+:where\(button:not/);
  assert.ok(!captured.cssText.includes("background-color: #123456;\n"),
    "The original unprioritized author source must not be appended to the payload.");
});

test("the payload build refuses to emit a corrupted script", async () => {
  // Guard the guard: prove that a payload carrying a leftover placeholder or a
  // spliced-in template copy would actually be caught, so the checks above are
  // not vacuous if the substitution regresses. These fixtures reproduce the
  // pre-fix behaviour by passing JSON.stringify(...) as a literal replacement
  // string, exactly as loadPayload used to.
  const fillRest = (source) => source
    .replace("__DREAM_CSS_JSON__", () => '""')
    .replace("__DREAM_ART_JSON__", () => '""')
    .replace("__DREAM_SKIN_VERSION_JSON__", () => '"0"')
    .replace("__DREAM_SKIN_PAYLOAD_REVISION_JSON__", () => '"0"')
    .replaceAll("__DREAM_SIDEBAR_SCROLL_QUIET_ENABLED_JSON__", "false");

  const spliced = fillRest(
    template.replace("__DREAM_THEME_JSON__", JSON.stringify({ name: "a$&b" })),
  );
  assert.throws(
    () => assertIntactPayload(spliced, "self-check"),
    /__DREAM_THEME_JSON__ placeholder/,
    "A $&-corrupted payload must be caught by the placeholder assertion.",
  );

  const backtick = fillRest(
    template.replace("__DREAM_THEME_JSON__", JSON.stringify({ name: "a$`b" })),
  );
  assert.throws(
    () => assertIntactPayload(backtick, "self-check"),
    /spliced back into the payload/,
    "A $`-corrupted payload must be caught by the template-splice assertion.",
  );

  const apostrophe = fillRest(
    template.replace("__DREAM_THEME_JSON__", JSON.stringify({ name: "a$'b" })),
  );
  assert.throws(
    () => assertIntactPayload(apostrophe, "self-check"),
    /not parseable JavaScript/,
    "A $'-corrupted payload must be caught by the parse assertion.",
  );
});
