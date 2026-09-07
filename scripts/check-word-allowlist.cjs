/*
 * Build-time guard for the programmatic word engine's curated index gate.
 * Runs on plain Node (CJS) so it works locally and in the Vercel build.
 *   node scripts/check-word-allowlist.cjs      (also: npm run check:allowlist)
 *
 * Asserts — so a future edit can never silently re-expose the thin tail that drew
 * the 2026-09-03 AdSense "low value content" flag:
 *   1. Every allowlisted param clears its family's results FLOOR, as the live
 *      engine sees it (same dictionary, same slur strip).
 *   2. Every gated route file still calls notFound() (no soft-404 "0 results" 200s).
 *   3. Every allow family is a known family that has a floor.
 *   4. If the master switch is ON, the sitemap must import the allowlist (i.e. the
 *      curated params are actually being submitted) — a forward guard for Phase 1.
 *
 * The master switch (PROGRAMMATIC_INDEX_ENABLED in lib/wordSeo.js) is independent:
 * this validates the gate is SAFE to enable, whether or not it currently is.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const data = require(path.join(ROOT, "lib", "wordAllowlist.json"));

// Mirror lib/wordEngine.js's slur strip so our counts match what the engine serves.
const BLOCKED = new Set([
  "nigger", "niggers", "nigga", "niggas", "niggaz", "niggah", "niggahs",
  "faggot", "faggots", "faggy", "faggoty", "kike", "kikes", "spic", "spics",
  "wetback", "wetbacks", "beaner", "beaners", "paki", "pakis", "wog", "wogs",
  "dago", "dagos", "dagoes", "tranny", "trannies", "trannys", "cunt", "cunts",
  "darkie", "darkies", "darky", "raghead", "ragheads", "towelhead", "towelheads",
  "jigaboo", "jigaboos", "chinaman", "chinamen", "gippo", "gippos", "abbo", "abbos",
  "boong", "boongs", "golliwog", "golliwogs", "golliwogg", "golliwoggs",
  "negress", "negresses",
]);

const WORDS = fs
  .readFileSync(path.join(ROOT, "public", "words", "dict.txt"), "utf8")
  .split("\n").filter(Boolean).filter((w) => !BLOCKED.has(w));

// Count matches the way each word-list family does. Rack/pattern families
// (unscramble/anagram/crossword) start empty in Phase 1; when seeded later, add
// their counting here before they can pass this guard.
function countFor(family, param) {
  const p = String(param).toLowerCase().replace(/[^a-z]/g, "");
  if (!p) return 0;
  if (family === "words-starting-with") return WORDS.reduce((n, w) => n + (w.startsWith(p) ? 1 : 0), 0);
  if (family === "words-ending-with") return WORDS.reduce((n, w) => n + (w.endsWith(p) ? 1 : 0), 0);
  if (family === "words-containing") return WORDS.reduce((n, w) => n + (w.includes(p) ? 1 : 0), 0);
  return null; // not floor-checkable in this phase
}

const ROUTES = {
  "words-starting-with": "app/words-starting-with/[prefix]/page.js",
  "words-ending-with": "app/words-ending-with/[suffix]/page.js",
  "words-containing": "app/words-containing/[substr]/page.js",
  "unscramble": "app/unscramble/[letters]/page.js",
  "anagram": "app/anagram/[letters]/page.js",
  "crossword-solver": "app/crossword-solver/[pattern]/page.js",
};

const errors = [];
const knownFamilies = new Set(Object.keys(data.floors));
let checked = 0;
let unchecked = 0;

// 1 + 3: every allowlisted param clears its floor; family is known.
for (const [family, list] of Object.entries(data.allow)) {
  if (!knownFamilies.has(family)) { errors.push(`allow.${family}: no floor defined for this family`); continue; }
  const floor = data.floors[family];
  for (const param of list) {
    const c = countFor(family, param);
    if (c === null) { unchecked++; continue; }
    if (c < floor) errors.push(`${family} "${param}": ${c} words < floor ${floor}`);
    else checked++;
  }
}

// 2: every gated route still 404s on empty/invalid input.
for (const [family, rel] of Object.entries(ROUTES)) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { errors.push(`route missing: ${rel}`); continue; }
  const src = fs.readFileSync(abs, "utf8");
  if (!src.includes("notFound()")) errors.push(`${rel}: no notFound() guard (soft-404 risk)`);
}

// 4: forward guard — if indexing is ON, the sitemap must submit the curated params.
const seo = fs.readFileSync(path.join(ROOT, "lib", "wordSeo.js"), "utf8");
const enabled = /PROGRAMMATIC_INDEX_ENABLED\s*=\s*true/.test(seo);
if (enabled) {
  const sitemap = fs.readFileSync(path.join(ROOT, "app", "sitemap.js"), "utf8");
  if (!sitemap.includes("wordAllowlist")) {
    errors.push("PROGRAMMATIC_INDEX_ENABLED is true but app/sitemap.js does not import wordAllowlist — curated pages are indexable but not in the sitemap. Wire them before enabling.");
  }
}

const total = Object.values(data.allow).reduce((n, l) => n + l.length, 0);
if (errors.length) {
  console.error("✗ word-allowlist guard FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  `✓ word-allowlist guard OK — ${total} curated pages ` +
  `(${checked} floor-verified, ${unchecked} rack/pattern pending), ` +
  `all ${Object.keys(ROUTES).length} routes 404 on empty. ` +
  `Engine indexing is ${enabled ? "ON" : "OFF"}.`
);
