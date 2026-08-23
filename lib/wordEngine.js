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

// Group a word list by length, longest first: [{ len, words: [...] }]
export function groupByLength(words) {
  const g = {};
  for (const w of words) (g[w.length] = g[w.length] || []).push(w);
  return Object.keys(g).map(Number).sort((a, b) => b - a).map((len) => ({ len, words: g[len] }));
}
