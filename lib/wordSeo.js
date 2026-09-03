// The word-game routes mint a page for ANY parameter, so the URL space is
// effectively unbounded. Left unchecked that produces soft-404s ("no words
// found") AND near-empty pages served as 200 + index,follow — exactly the thin,
// templated "scaled content" pattern Google's Helpful Content system devalues
// site-wide (and what hammered comparable free-tool sites in 2023-24).
//
// Rule: a page is only indexable if it carries enough substance to stand on its
// own — at least MIN_INDEXABLE results. Thinner pages stay reachable for humans and
// still pass link equity via `follow`, but are kept out of the index so a long tail
// of near-empty templated pages can't drag the whole domain down. The substantive
// long tail (the actual SEO/ad-revenue engine) stays indexed.
//
// 2026-09-03: set to Infinity to noindex EVERY word-game page. AdSense flagged the
// site "low value content" and the auto-generated word-page volume is the likely
// driver; keeping only the ~255 tool pages + hubs indexed makes the site read as a
// quality tools site. `follow:true` still passes link equity and avoids orphaning.
// To bring word pages back after approval, set this to a finite gate (ideally a
// curated, higher-substance subset rather than the raw combinatorial engine).
const MIN_INDEXABLE = Infinity;

export function wordRobots(resultCount) {
  return resultCount >= MIN_INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: true };
}
