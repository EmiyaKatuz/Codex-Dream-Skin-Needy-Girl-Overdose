// Build-time extraction only. Runtime replaces these exact selector fragments;
// it does not parse CSS, and the published CSS remains the canonical source.
export function cssPredicateManifest(css) {
  const predicates = new Map();
  let quote = null;
  let comment = false;
  for (let i = 0; i < css.length; i += 1) {
    const char = css[i];
    if (comment) {
      if (css.startsWith("*/", i)) { comment = false; i += 1; }
      continue;
    }
    if (char === "\\") { i += 1; continue; }
    if (quote) { if (char === quote) quote = null; continue; }
    if (css.startsWith("/*", i)) { comment = true; i += 1; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (!css.startsWith(":has(", i)) continue;

    const start = i;
    let branchStart = i + 5;
    const stack = [")"];
    const branches = [];
    let innerQuote = null;
    let innerComment = false;
    let closed = false;
    const addBranch = (end) => {
      const branch = css.slice(branchStart, end).trim();
      if (!branch || /^[>+~]\s*$/.test(branch) || /[>+~]\s*$/.test(branch)) {
        throw new Error("Malformed :has() relative selector branch");
      }
      branches.push(branch);
    };
    for (i += 5; i < css.length; i += 1) {
      const current = css[i];
      if (innerComment) {
        if (css.startsWith("*/", i)) { innerComment = false; i += 1; }
        continue;
      }
      if (current === "\\") { i += 1; continue; }
      if (innerQuote) { if (current === innerQuote) innerQuote = null; continue; }
      if (css.startsWith("/*", i)) { innerComment = true; i += 1; continue; }
      if (current === '"' || current === "'") { innerQuote = current; continue; }
      if (css.startsWith(":has(", i)) throw new Error("Nested :has() is unsupported");
      if (current === "(" || current === "[") stack.push(current === "(" ? ")" : "]");
      else if (current === ")" || current === "]") {
        if (stack.pop() !== current) throw new Error("Unbalanced :has() selector");
        if (!stack.length) { addBranch(i); closed = true; break; }
      } else if (current === "," && stack.length === 1) {
        addBranch(i);
        branchStart = i + 1;
      } else if (current === "{" || current === "}" || current === ";") {
        throw new Error("Malformed :has() selector boundary");
      }
    }
    if (!closed) throw new Error("Unclosed :has() selector");
    const selector = css.slice(start, i + 1);
    if (!predicates.has(selector)) {
      const attribute = `data-dream-has-${predicates.size}`;
      // :where(marker) adds no specificity. The impossible second branch
      // carries exactly :has()'s max argument specificity. Prefixing every
      // relative branch with * makes >, + and ~ valid complex selectors.
      const specificityBranch = branches.map((branch) => `* ${branch}`).join(", ");
      predicates.set(selector, {
        selector,
        attribute,
        branches: branches.map((branch) => {
          // Leading comments do not affect the relative combinator. Preserve
          // the remaining selector verbatim for the runtime leaf query.
          const relative = branch.replace(/^(?:\s|\/\*[\s\S]*?\*\/)+/, "");
          const combinator = /^[>+~]/.exec(relative)?.[0];
          return {
            selector: combinator ? relative.slice(1).trim() : relative,
            relation: ({ ">": "child", "+": "adjacent", "~": "sibling" })[combinator] ?? "descendant",
          };
        }),
        replacement: `:is(:where([${attribute}]), :is(${specificityBranch}):not(*))`,
      });
    }
  }
  if (quote || comment) throw new Error("Unclosed CSS string or comment");
  return [...predicates.values()];
}

// Keep the first port limited to route landmarks whose mutations can be
// observed without tracking hover, editor state, or extension-owned markers.
const mainLandmark = 'main:is(.main-surface, [data-app-shell-main-surface], [class*="_MainContentSurface_"])';
const cachedPredicates = new Set([
  `:has(${mainLandmark})`,
  `:has(${mainLandmark} [role="main"])`,
  ':has([role="main"])',
  ':has([data-testid="home-icon"])',
  ':has([data-settings-panel-slug])',
  ':has(nav [data-settings-panel-slug])',
]);
export function cacheableCssPredicateManifest(css) {
  return cssPredicateManifest(css).filter(({ selector }) => cachedPredicates.has(selector))
    .map((predicate) => ({
      ...predicate,
      // Observe the leaf independently of its ancestor context: a removed
      // subtree no longer matches "main [role=main]" or "nav [data-...]".
      mutationSelector: predicate.selector.includes('[role="main"]') ? '[role="main"]'
        : predicate.selector.includes('[data-settings-panel-slug]') ? '[data-settings-panel-slug]'
        : predicate.branches[0].selector,
    }));
}

// This pure factory is embedded verbatim into both renderer payloads. Keep all
// dependencies inside the function so Function.toString() remains standalone.
export function createCssPredicateCache(document, manifest) {
  const predicates = manifest;
  const retained = predicates.map(() => new Set());
  const metrics = { passes: 0, writes: 0, totalMs: 0, lastMs: 0, maxMs: 0 };
  let timer = null;
  let observer = null;
  let stopped = false;
  const lightSheets = new Map();
  const lightMedia = "(dream-skin-internet-angel-light)";
  // Media queries are excluded before descendant selector matching. The
  // trusted light block defaults to all so standalone CSS remains usable.
  // Only the owning renderer's sheet is inspected; never scan app sheets.
  const syncLightRules = (sheet) => {
    if (stopped || !sheet) return;
    try {
      const rules = sheet.cssRules;
      if (!rules) return;
      let cached = lightSheets.get(sheet);
      if (!cached || cached.first !== rules[0] || cached.last !== rules[rules.length - 1]
          || cached.entries.some(({ index, rule }) => rules[index] !== rule)) {
        const entries = Array.from(rules, (rule, index) => ({ rule, index }))
          .filter(({ rule }) => rule.media?.mediaText?.includes(lightMedia));
        cached = { entries, first: rules[0], last: rules[rules.length - 1] };
        lightSheets.set(sheet, cached);
      }
      const light = document.documentElement?.matches?.('html:is(.dream-theme-light, [data-dream-shell="light"])');
      const desired = light ? `${lightMedia}, all` : lightMedia;
      for (const { rule } of cached.entries) {
        if (rule.media.mediaText !== desired) rule.media.mediaText = desired;
      }
    } catch {
      // Unavailable CSSOM keeps the original selector-controlled styling.
    }
  };
  const now = () => typeof performance === "object" && typeof performance.now === "function" ? performance.now() : Date.now();
  const refresh = () => {
    if (stopped || !predicates.length) return;
    const started = now();
    metrics.passes += 1;
    predicates.forEach(({ selector, attribute, branches }, index) => {
      const candidates = new Set();
      for (const branch of branches) {
        for (const leaf of document.querySelectorAll(branch.selector)) {
          if (branch.relation === "sibling" || branch.relation === "adjacent") {
            for (let ancestor = leaf; ancestor; ancestor = ancestor.parentElement) {
              for (let sibling = ancestor.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
                candidates.add(sibling);
              }
            }
          } else {
            for (let ancestor = leaf.parentElement; ancestor; ancestor = ancestor.parentElement) candidates.add(ancestor);
          }
        }
      }
      const desired = new Set([...candidates].filter((node) =>
        !node.closest?.('[contenteditable="true"], .ProseMirror') && node.matches(selector)));
      for (const node of retained[index]) {
        if (!desired.has(node)) {
          node.removeAttribute(attribute);
          metrics.writes += 1;
        }
      }
      for (const node of desired) {
        if (node.getAttribute(attribute) !== "true") {
          node.setAttribute(attribute, "true");
          metrics.writes += 1;
        }
      }
      retained[index] = desired;
    });
    metrics.lastMs = Math.max(0, now() - started);
    metrics.totalMs += metrics.lastMs;
    metrics.maxMs = Math.max(metrics.maxMs, metrics.lastMs);
  };
  const schedule = () => {
    if (stopped || timer !== null) return;
    timer = setTimeout(() => { timer = null; refresh(); }, 120);
  };
  const mainClasses = (value) => String(value || "").split(/\s+/)
    .filter((token) => token === "main-surface" || token.includes("_MainContentSurface_")).sort().join(" ");
  const mutationSelector = [...new Set(predicates.map((predicate) => predicate.mutationSelector)
    .filter(Boolean))].join(", ");
  const containsLandmark = (node) => node?.nodeType === 1 && (
    !mutationSelector || node.matches?.(mutationSelector) || node.querySelector?.(mutationSelector)
  );
  if (predicates.length && typeof MutationObserver === "function" && document.documentElement) {
    observer = new MutationObserver((records) => {
      if (records.some((record) => {
        if (record.type === "childList") return [...(record.addedNodes || []), ...(record.removedNodes || [])]
          .some(containsLandmark);
        const current = record.target.getAttribute(record.attributeName);
        return record.attributeName === "class"
          ? mainClasses(record.oldValue) !== mainClasses(current)
          : record.oldValue !== current;
      })) schedule();
    });
    observer.observe(document.documentElement, {
      childList: true, subtree: true, attributes: true, attributeOldValue: true,
      attributeFilter: ["class", "role", "data-testid", "data-settings-panel-slug", "data-app-shell-main-surface"],
    });
  }
  const cleanup = () => {
    stopped = true;
    for (const { entries } of lightSheets.values()) {
      for (const { rule } of entries) {
        try { rule.media.mediaText = `${lightMedia}, all`; } catch {}
      }
    }
    lightSheets.clear();
    observer?.disconnect();
    if (timer !== null) clearTimeout(timer);
    timer = null;
    predicates.forEach(({ attribute }, index) => {
      const nodes = new Set([...retained[index], ...document.querySelectorAll(`[${attribute}]`)]);
      for (const node of nodes) node.removeAttribute(attribute);
      retained[index].clear();
    });
  };
  return { refresh, syncLightRules, cleanup, metrics };
}
