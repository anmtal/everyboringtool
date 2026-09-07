// Curated allowlist for the programmatic word engine's index gate. The seed data
// and the per-family result FLOORS live in ./wordAllowlist.json (a single source
// of truth shared with the build-time guard scripts/check-word-allowlist.cjs).
//
// This is the "load-bearing half" of the two-part gate in lib/wordSeo.js. A bare
// numeric floor alone still admits tens of thousands of near-duplicate templated
// pages — the doorway/scaled-content pattern that drew the 2026-09-03 "low value
// content" flag. Only params on this hand-curated list are ever eligible to index
// (and only then when they also clear the floor AND the master switch is on).
import data from "./wordAllowlist.json";

export const FLOORS = data.floors;

// Normalise an incoming URL param to the canonical form the allowlist stores, so
// matching is exact and scramble-invariant where it should be. Mirrors how each
// route cleans its param before rendering.
function norm(family, param) {
  const raw = String(param || "").toLowerCase();
  if (family === "unscramble" || family === "anagram") {
    // letter-set identity: drop non-letters + wildcards, sort — so every scramble
    // of an allowlisted rack maps to the same key.
    return raw.replace(/[^a-z]/g, "").split("").sort().join("");
  }
  if (family === "crossword-solver") {
    return raw.replace(/_/g, "-").replace(/[^a-z-]/g, "");
  }
  if (family === "convert") {
    return raw.replace(/[^a-z0-9-]/g, "");
  }
  // words-starting-with / words-ending-with / words-containing
  return raw.replace(/[^a-z]/g, "");
}

const SETS = {};
for (const family of Object.keys(data.allow)) {
  SETS[family] = new Set(data.allow[family].map((p) => norm(family, p)));
}

// Is this exact param curated for indexing within its family?
export function isAllowlisted(family, param) {
  const set = SETS[family];
  if (!set) return false;
  return set.has(norm(family, param));
}

// Count of curated pages — for one family, or across all families when omitted.
export function allowlistCount(family) {
  if (family) return SETS[family] ? SETS[family].size : 0;
  return Object.values(SETS).reduce((total, set) => total + set.size, 0);
}
