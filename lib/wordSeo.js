// Robots policy for the programmatic word-game pages (words-starting/ending/
// containing, unscramble, anagram, crossword-solver).
//
// The word-game routes mint a page for ANY parameter, so the URL space is
// effectively unbounded. Left unchecked that produces soft-404s ("no words
// found") AND near-empty pages served as 200 + index — exactly the thin,
// templated "scaled content" pattern Google's Helpful Content system devalues
// site-wide, and the likely trigger of the 2026-09-03 AdSense "low value
// content" flag. Every route already 404s (notFound()) on an empty/invalid
// param, so no soft-404s are served; this file governs which of the REAL,
// non-empty pages are allowed into the index.
//
// TWO-PART GATE. A page is indexable only when ALL of these hold:
//   1) PROGRAMMATIC_INDEX_ENABLED is true (the master switch, below), AND
//   2) the result set clears a per-family FLOOR (enough substance to stand
//      alone), AND
//   3) the exact param is on the curated allowlist (lib/wordAllowlist.json).
// follow:true is kept on EVERY page (indexed or not) so link equity still flows
// and nothing is orphaned — matching the original design. A bare numeric floor
// alone is NOT enough: it still admits tens of thousands of low-demand near-
// duplicate pages. The curated allowlist is the load-bearing half.

import { FLOORS, isAllowlisted } from "./wordAllowlist";

// ── MASTER KILL SWITCH ──────────────────────────────────────────────────────
// Keep FALSE until AdSense approval is granted AND stable for 2-3 weeks. While
// false, EVERY programmatic word page returns { index:false, follow:true } — the
// exact behaviour the site has today — regardless of floors or allowlist. This is
// the single, auditable switch for the whole engine; flip it to true to activate
// the curated tranche, and roll it back instantly if GSC shows soft-404s or the
// "low value content" flag recurs.
export const PROGRAMMATIC_INDEX_ENABLED = false;

// robots value for a word page. `resultCount` is the number of matching words;
// `opts.family` names the route family and `opts.param` is the cleaned query.
// Callers that omit opts (or family) get the safe noindex default.
export function wordRobots(resultCount, opts = {}) {
  if (!PROGRAMMATIC_INDEX_ENABLED) return { index: false, follow: true };
  const { family, param } = opts;
  const floor = family && FLOORS[family] != null ? FLOORS[family] : Infinity;
  const indexable = resultCount >= floor && isAllowlisted(family, param);
  return indexable ? { index: true, follow: true } : { index: false, follow: true };
}
