import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.join(testDirectory, "..", "assets", "dream-skin.css");
const css = fs.readFileSync(cssPath, "utf8");
const marker = "/* Fullscreen home stage:";
const adaptiveMarker = "/* Adaptive Home split layouts:";
const sectionStart = css.indexOf(marker);
const sectionEnd = css.indexOf("@media (prefers-reduced-motion: reduce)", sectionStart);
const adaptiveStart = css.indexOf(adaptiveMarker);
const adaptiveEnd = css.indexOf(marker, adaptiveStart);

assert.notEqual(sectionStart, -1, "fullscreen Home layout marker is missing");
assert.notEqual(sectionEnd, -1, "fullscreen Home layout section has no stable end marker");
assert.notEqual(adaptiveStart, -1, "adaptive Home split-layout marker is missing");
assert.notEqual(adaptiveEnd, -1, "adaptive Home split-layout section has no stable end marker");

const section = css.slice(sectionStart, sectionEnd);
const adaptiveSection = css.slice(adaptiveStart, adaptiveEnd);
assert.match(section, /@container home-main-content \(min-width: 1280px\) and \(min-height: 780px\)/);
assert.match(section, /--dream-home-wide-content-max:\s*min\(1560px, calc\(100cqw - 112px\)\)/);
assert.match(section, /#codex-dream-skin-presets\s*\{[\s\S]*?top:\s*clamp\(350px, 38cqh, 450px\)/);
assert.match(section, /\.group\\\/home-suggestions > div > div\s*\{[\s\S]*?gap:\s*clamp\(18px, 1\.15cqw, 26px\)/);
assert.match(section, /button\.dream-codex-preset\s*\{[\s\S]*?min-height:\s*140px/);
assert.match(section, /\.dream-home \.composer-surface-chrome\s*\{[\s\S]*?min-height:\s*110px/);
assert.doesNotMatch(section, /dream-terminal-panel|dream-side-workspace|\[role="menu"\]/);

assert.match(adaptiveSection, /@container home-main-content \(max-width: 900px\)/);
assert.match(adaptiveSection, /@container home-main-content \(max-height: 650px\)/);
assert.match(adaptiveSection, /@container home-main-content \(max-width: 900px\) and \(max-height: 650px\)/);
assert.match(adaptiveSection, /\.dream-presets-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(adaptiveSection, /\.dream-home > div:first-child:not\(\[class~="group\/home-composer-layout"\]\) > div:first-child\s*\{[\s\S]*?flex:\s*0 0 clamp\(286px, 62cqh, 330px\)/);
assert.match(adaptiveSection, /\.dream-home \.composer-surface-chrome\s*\{[\s\S]*?min-height:\s*82px[\s\S]*?max-height:\s*112px/);
assert.match(adaptiveSection, /dream-home-side-open[\s\S]*?dream-angel-webcam-card[\s\S]*?display:\s*none/);
assert.match(adaptiveSection, /dream-home-bottom-open[\s\S]*?\.dream-angel-stage\s*\{[\s\S]*?--dream-composer-top/);
assert.match(adaptiveSection, /dream-home-bottom-open:not\(\.dream-home-dual-panel\)[\s\S]*?flex:\s*0 0 clamp\(308px, 66cqh, 352px\)/);
assert.match(adaptiveSection, /dream-home-dual-panel[\s\S]*?\.dream-angel-spark-field\s*\{[\s\S]*?opacity:\s*\.38/);
assert.match(adaptiveSection, /max-width: 900px\) and \(max-height: 650px\)[\s\S]*?#codex-dream-skin-presets\s*\{[^}]*top:\s*114px\s*!important/s);
assert.match(adaptiveSection, /max-width: 900px\) and \(max-height: 650px\)[\s\S]*?button\.dream-generated-preset\s*\{[^}]*height:\s*56px\s*!important[^}]*max-height:\s*56px\s*!important/s);

const livingLayerStart = css.indexOf("CHOTEN living broadcast layer");
assert.notEqual(livingLayerStart, -1, "Choten living broadcast layer marker is missing");
const livingLayer = css.slice(livingLayerStart);
assert.match(livingLayer, /dream-home-side-open[\s\S]*?dream-angel-blink[\s\S]*?display:\s*none\s*!important/);
assert.match(livingLayer, /dream-home-bottom-open[\s\S]*?dream-angel-heartbeat[\s\S]*?display:\s*none\s*!important/);
assert.match(livingLayer, /dream-home-dual-panel[\s\S]*?dream-angel-live-ticker[\s\S]*?display:\s*none\s*!important/);
assert.match(livingLayer, /@container angel-stage \(max-width: 980px\)[\s\S]*?dream-angel-now-playing[\s\S]*?display:\s*none\s*!important/);
assert.match(livingLayer, /@container angel-stage \(max-height: 620px\)[\s\S]*?dream-angel-blink[\s\S]*?display:\s*none\s*!important/);
assert.match(livingLayer, /dream-choten-art:not\(\.dream-home-side-open\):not\(\.dream-home-bottom-open\)[\s\S]*?dream-angel-dose-strip[\s\S]*?bottom:\s*180px/);
assert.match(livingLayer, /dream-choten-art:not\(\.dream-home-side-open\):not\(\.dream-home-bottom-open\)[\s\S]*?dream-angel-webcam-card[\s\S]*?bottom:\s*172px/);

const workspaceStart = css.indexOf("/* The renderer assigns the durable workspace class");
const workspaceEnd = css.indexOf("/* A live side conversation replaces the launcher DOM entirely.", workspaceStart);
assert.notEqual(workspaceStart, -1, "durable side-workspace marker is missing");
assert.notEqual(workspaceEnd, -1, "durable side-workspace section has no stable end marker");

const workspaceSection = css.slice(workspaceStart, workspaceEnd);
assert.match(workspaceSection, /html\.codex-dream-skin \.dream-side-workspace\s*\{/);
assert.doesNotMatch(
  workspaceSection,
  /contain:layout_paint[^}]*:has\(/,
  "The scrolling task hot path must not restore the deep structural workspace fallback",
);
assert.match(workspaceSection, /SIDE CHANNEL \/\/ ANGEL RELAY/);
assert.match(workspaceSection, /AFFECTION\s+9999\+/);
assert.match(workspaceSection, /\.dream-side-workspace-brand\s*\{/);

console.log("PASS: Home layouts adapt to split panels and the side relay uses durable renderer classes.");
