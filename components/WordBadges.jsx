"use client";

import { useState } from "react";
import Link from "next/link";

// Inlined so this stays client-safe (lib/wordEngine imports `fs`). Values match
// wordEngine.scrabbleScore + groupByLength exactly.
const SCRABBLE = { a: 1, e: 1, i: 1, o: 1, u: 1, l: 1, n: 1, s: 1, t: 1, r: 1, d: 2, g: 2, b: 3, c: 3, m: 3, p: 3, f: 4, h: 4, v: 4, w: 4, y: 4, k: 5, j: 8, x: 8, q: 10, z: 10 };
function score(w) { let s = 0; for (let i = 0; i < w.length; i++) s += SCRABBLE[w[i]] || 0; return s; }
function groupByLength(words) {
  const g = {};
  for (const w of words) (g[w.length] = g[w.length] || []).push(w);
  return Object.keys(g).map(Number).sort((a, b) => b - a).map((len) => ({ len, words: g[len] }));
}

const INITIAL = 600; // server-rendered baseline (fast paint + a sane crawl budget)
const STEP = 1200;   // words revealed per "show more" click

export default function WordBadges({ words = [], linkBase = "/unscramble" }) {
  const [shown, setShown] = useState(INITIAL);
  const visible = words.length > shown ? words.slice(0, shown) : words;
  const groups = groupByLength(visible);
  const remaining = words.length - visible.length;

  return (
    <>
      {groups.map(({ len, words: ws }) => (
        <section key={len} style={{ marginTop: 18 }}>
          <h2 className="section-title" style={{ fontSize: "1.05rem" }}>{len}-letter words ({ws.length})</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ws.map((w) => (
              <Link key={w} href={`${linkBase}/${w}`} prefetch={false} className="badge" style={{ textDecoration: "none", fontSize: 14, padding: "4px 9px" }} title={`${score(w)} points`}>
                {w} <span style={{ opacity: 0.55, fontSize: 11 }}>{score(w)}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {remaining > 0 ? (
        <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <button type="button" className="btn" onClick={() => setShown((s) => Math.min(s + STEP, words.length))}>
            Show {Math.min(STEP, remaining).toLocaleString()} more
          </button>
          <button type="button" className="btn" onClick={() => setShown(words.length)}>
            Show all {words.length.toLocaleString()}
          </button>
          <span className="tool-note" style={{ margin: 0 }}>
            Showing {visible.length.toLocaleString()} of {words.length.toLocaleString()} words
          </span>
        </div>
      ) : (
        words.length > INITIAL && (
          <p className="tool-note" style={{ marginTop: 16 }}>Showing all {words.length.toLocaleString()} words.</p>
        )
      )}
    </>
  );
}
