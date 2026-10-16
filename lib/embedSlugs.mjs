// The tools other sites may show in an iframe, at /embed/<slug>. Their details
// (title, credit, snippet height) live in lib/embeds.js, which fails the build
// if its list stops matching this one.
//
// A plain .mjs with no imports so next.config.mjs can import it as-is: the
// framing headers there are built from this exact list, so these pages, and no
// other path (not even a 404 under /embed/), can be framed by other sites.
// Slugs: lowercase letters, digits and hyphens (they go into a header regex).
export const EMBED_SLUGS = ["classroom-timer", "wheel-of-names"];

export const EMBED_PATHS = EMBED_SLUGS.map((slug) => `/embed/${slug}`);

// Exact match, case included: /embed/<registered slug> and nothing else.
export function isEmbedPath(pathname) {
  return typeof pathname === "string" && EMBED_PATHS.includes(pathname);
}
