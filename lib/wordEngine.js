import fs from "fs";
import path from "path";

let WORDS = null;
let SIGS = null;
let WORDSET = null;

function load() {
  if (WORDS) return;
  const file = path.join(process.cwd(), "public", "words", "dict.txt");
  const txt = fs.readFileSync(file, "utf8");
  WORDS = txt.split("\n").filter(Boolean);
  WORDSET = new Set(WORDS);
  SIGS = new Array(WORDS.length);
  for (let i = 0; i < WORDS.length; i++) {
    const w = WORDS[i];
    const a = new Uint8Array(26);
    for (let j = 0; j < w.length; j++) a[w.charCodeAt(j) - 97]++;
    SIGS[i] = a;
  }
}

const SCRABBLE = { a: 1, e: 1, i: 1, o: 1, u: 1, l: 1, n: 1, s: 1, t: 1, r: 1, d: 2, g: 2, b: 3, c: 3, m: 3, p: 3, f: 4, h: 4, v: 4, w: 4, y: 4, k: 5, j: 8, x: 8, q: 10, z: 10 };
const WWF = { a: 1, e: 1, i: 1, o: 1, t: 1, r: 1, s: 1, d: 2, l: 2, n: 2, u: 2, h: 3, g: 3, y: 3, b: 4, c: 4, f: 4, m: 4, p: 4, w: 4, k: 5, v: 5, x: 8, j: 10, q: 10, z: 10 };

export function scrabbleScore(w) { let s = 0; for (let i = 0; i < w.length; i++) s += SCRABBLE[w[i]] || 0; return s; }
export function wwfScore(w) { let s = 0; for (let i = 0; i < w.length; i++) s += WWF[w[i]] || 0; return s; }

export function cleanLetters(raw) {
  return String(raw || "").toLowerCase().replace(/[^a-z?]/g, "").slice(0, 15);
}
// Canonical key for a set of letters (sorted) — used for canonical URLs to avoid
// duplicate content across different scrambles of the same letters.
export function canonicalLetters(raw) {
  const l = cleanLetters(raw);
  return l.split("").sort().join("");
}

// All dictionary words that can be built from `raw` letters (sub-anagrams).
// "?" acts as a blank/wildcard tile.
export function unscramble(raw) {
  load();
  const letters = cleanLetters(raw);
  const wild = (letters.match(/\?/g) || []).length;
  const clean = letters.replace(/\?/g, "");
  const avail = new Uint8Array(26);
  for (let j = 0; j < clean.length; j++) avail[clean.charCodeAt(j) - 97]++;
  const maxLen = clean.length + wild;
  const out = [];
  for (let i = 0; i < WORDS.length; i++) {
    const w = WORDS[i];
    if (w.length < 2 || w.length > maxLen) continue;
    const s = SIGS[i];
    let need = 0, ok = true;
    for (let c = 0; c < 26; c++) {
      const d = s[c] - avail[c];
      if (d > 0) { need += d; if (need > wild) { ok = false; break; } }
    }
    if (ok) out.push(w);
  }
  out.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return out;
}

export function isWord(w) { load(); return WORDSET.has(String(w || "").toLowerCase()); }

// True anagrams: words that use ALL the given letters (same length).
export function anagrams(raw) {
  const letters = cleanLetters(raw);
  const total = letters.replace(/\?/g, "").length + (letters.match(/\?/g) || []).length;
  return unscramble(raw).filter((w) => w.length === total);
}

function scan(test) {
  load();
  const out = [];
  for (let i = 0; i < WORDS.length; i++) if (test(WORDS[i])) out.push(WORDS[i]);
  out.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return out;
}
export function startingWith(prefix) {
  const p = String(prefix || "").toLowerCase().replace(/[^a-z]/g, "");
  return p ? scan((w) => w.startsWith(p)) : [];
}
export function endingWith(suffix) {
  const s = String(suffix || "").toLowerCase().replace(/[^a-z]/g, "");
  return s ? scan((w) => w.endsWith(s)) : [];
}
export function containing(sub) {
  const s = String(sub || "").toLowerCase().replace(/[^a-z]/g, "");
  return s ? scan((w) => w.includes(s)) : [];
}

// Words of an exact length, with optional starts-with / ends-with / contains filters.
export function byLength(n, opts = {}) {
  load();
  const len = n | 0;
  if (len < 2 || len > 15) return [];
  const sw = opts.startsWith ? String(opts.startsWith).toLowerCase().replace(/[^a-z]/g, "") : "";
  const ew = opts.endsWith ? String(opts.endsWith).toLowerCase().replace(/[^a-z]/g, "") : "";
  const ct = opts.contains ? String(opts.contains).toLowerCase().replace(/[^a-z]/g, "") : "";
  const out = [];
  for (let i = 0; i < WORDS.length; i++) {
    const w = WORDS[i];
    if (w.length !== len) continue;
    if (sw && !w.startsWith(sw)) continue;
    if (ew && !w.endsWith(ew)) continue;
    if (ct && !w.includes(ct)) continue;
    out.push(w);
  }
  return out;
}

// Crossword pattern: letters + "-" for a blank (e.g. "c-t" => cat, cot, cut).
export function matchPattern(raw) {
  load();
  const pat = String(raw || "").toLowerCase().replace(/[^a-z-]/g, "").slice(0, 15);
  if (!pat || !/[a-z]/.test(pat.replace(/-/g, "") + "x")) return [];
  const len = pat.length;
  const out = [];
  for (let i = 0; i < WORDS.length; i++) {
    const w = WORDS[i];
    if (w.length !== len) continue;
    let ok = true;
    for (let j = 0; j < len; j++) { const p = pat[j]; if (p !== "-" && p !== w[j]) { ok = false; break; } }
    if (ok) out.push(w);
  }
  return out;
}

// Group a word list by length, longest first: [{ len, words: [...] }]
export function groupByLength(words) {
  const g = {};
  for (const w of words) (g[w.length] = g[w.length] || []).push(w);
  return Object.keys(g).map(Number).sort((a, b) => b - a).map((len) => ({ len, words: g[len] }));
}

// Per-page stats derived from the result list — genuinely unique data for each
// query (not boilerplate), and useful for players.
export function wordStats(words) {
  if (!words || !words.length) return null;
  let longest = words[0];
  let best = words[0];
  let bestScore = scrabbleScore(words[0]);
  let two = 0;
  for (const w of words) {
    if (w.length > longest.length) longest = w;
    if (w.length === 2) two++;
    const sc = scrabbleScore(w);
    if (sc > bestScore) { bestScore = sc; best = w; }
  }
  return { total: words.length, longest, longestLen: longest.length, best, bestScore, two };
}

// One representative URL per set of letters, so anagram-equivalent scrambles
// (listen / silent / tinsel) share a single canonical instead of each
// self-canonicalising into a near-duplicate. Prefers the alphabetically-first
// full-length dictionary word for the set; falls back to the sorted letters.
export function canonicalLettersForm(raw) {
  const letters = cleanLetters(raw);
  if (letters.indexOf("?") !== -1) return letters;
  const anas = anagrams(letters);
  if (anas.length) return anas[0];
  return letters.split("").sort().join("");
}
