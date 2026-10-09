// ── MASTER KILL SWITCH for the programmatic word pages ─────────────────────
// Lives in its own dependency-free module so client components (WordBadges,
// WordleSolver) can read it without bundling the allowlist JSON. lib/wordSeo.js
// re-exports it and holds the full indexing policy.
//
// Keep FALSE until AdSense approval is granted AND stable for 2-3 weeks. While
// false:
//   - EVERY programmatic word page returns { index:false, follow:true }
//     (lib/wordSeo.js), regardless of floors or allowlist, and
//   - result-word badges render as buttons, not <a href> links, so crawlers
//     can't spider the 168k-word dictionary. (2026-10-08: Google had indexed
//     ~9.2K /unscramble/<word> pages found only through those badge links, and
//     187 real sitemap pages were still "Discovered – not indexed".)
// Flip to true to activate the curated tranche; roll back instantly if GSC shows
// soft-404s or the "low value content" flag recurs.
export const PROGRAMMATIC_INDEX_ENABLED = false;
