// Query parsing for the word-game hubs. Results live at the hub URL
// (/unscramble?q=hole, /crossword-solver?q=c_t …; rewritten to
// app/word-results/[family]) and replaced the retired per-query child URLs
// (/unscramble/<letters> etc., now 410 Gone; see lib/wordGone.js).
// Dependency-free so client components can share it.
//
// Every parser returns the cleaned query, or null when the input isn't a
// genuine query; the hub then renders as the plain tool with a short notice.

const MAX_LEN = 15;

// Next hands repeated params (?q=a&q=b) over as an array — take the first.
function first(raw) {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return typeof s === "string" ? s.trim() : "";
}

// Unscramble / anagram racks: letters plus "?" blank tiles, at least 2 real letters.
export function parseRack(raw) {
  const s = first(raw);
  if (!s || s.length > MAX_LEN || !/^[A-Za-z?]+$/.test(s)) return null;
  const l = s.toLowerCase();
  return l.replace(/\?/g, "").length >= 2 ? l : null;
}

// Words starting with / ending with / containing: letters only.
export function parseAffix(raw) {
  const s = first(raw);
  if (!s || s.length > MAX_LEN || !/^[A-Za-z]+$/.test(s)) return null;
  return s.toLowerCase();
}

// Crossword patterns: letters plus a blank marker ("_", "-", "?" or "."), 2-15
// squares, at least one known letter. Returned with "-" blanks, as the engine
// (matchPattern) expects.
export function parsePattern(raw) {
  const s = first(raw);
  if (s.length < 2 || s.length > MAX_LEN || !/^[A-Za-z_?.-]+$/.test(s)) return null;
  const p = s.toLowerCase().replace(/[_?.]/g, "-");
  return /[a-z]/.test(p) ? p : null;
}

// The hub URL for a query. Crossword blanks read best as underscores.
export function wordHref(base, q) {
  const v = base === "/crossword-solver" ? String(q).replace(/-/g, "_") : String(q);
  return `${base}?q=${encodeURIComponent(v)}`;
}
