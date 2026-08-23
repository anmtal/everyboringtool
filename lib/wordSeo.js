// The word-game routes mint a page for ANY parameter, so the URL space is
// effectively unbounded. Left unchecked that produces soft-404s ("no words
// found") served as 200 + index,follow, which is exactly the pattern Google's
// spam policies describe as scaled content abuse.
//
// Rule: a page is only indexable if it actually answers something. Pages with no
// results stay reachable for humans but are excluded from the index, and still
// pass link equity onward via follow.
export function wordRobots(resultCount) {
  return resultCount > 0
    ? { index: true, follow: true }
    : { index: false, follow: true };
}
