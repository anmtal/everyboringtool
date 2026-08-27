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
// Set to 8 (not 3) deliberately: on a brand-new, no-authority domain a page with a
// handful of words wrapped in the shared template reads as thin/scaled content.
// Widen this back down once the domain has earned crawl trust and rankings.
const MIN_INDEXABLE = 8;

export function wordRobots(resultCount) {
  return resultCount >= MIN_INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: true };
}
