"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// Inlined so this stays client-safe (lib/wordEngine imports `fs`). Values match
// wordEngine.scrabbleScore + groupByLength exactly.
const SCRABBLE = { a: 1, e: 1, i: 1, o: 1, u: 1, l: 1, n: 1, s: 1, t: 1, r: 1, d: 2, g: 2, b: 3, c: 3, m: 3, p: 3, f: 4, h: 4, v: 4, w: 4, y: 4, k: 5, j: 8, x: 8, q: 10, z: 10 };
function score(w) { let s = 0; for (let i = 0; i < w.length; i++) s += SCRABBLE[w[i]] || 0; return s; }

const PREVIEW = 36;  // words shown per length in the multi-length "All" overview
const INITIAL = 600; // words shown for a single length before "show more"
const STEP = 1200;   // words revealed per "show more" click

function chip(active) {
  return {
    fontSize: 13, fontWeight: 600, lineHeight: 1, padding: "6px 11px",
    borderRadius: 999, cursor: "pointer", fontVariantNumeric: "tabular-nums",
    border: "1px solid var(--border-strong)",
    background: active ? "var(--text)" : "var(--surface)",
    color: active ? "var(--bg)" : "var(--text)",
    transition: "background-color 120ms ease-out, color 120ms ease-out",
  };
}

export default function WordBadges({ words = [], linkBase = "/unscramble" }) {
  const [filter, setFilter] = useState("all"); // "all" or a length (number)
  const [shown, setShown] = useState(INITIAL);

  // Group the FULL list by length, longest first (stable sort keeps the
  // dictionary's alphabetical order within each length).
  const groups = useMemo(() => {
    const g = {};
    for (const w of words) (g[w.length] = g[w.length] || []).push(w);
    return Object.keys(g).map(Number).sort((a, b) => b - a).map((len) => ({ len, words: g[len] }));
  }, [words]);

  function pick(f) { setFilter(f); setShown(INITIAL); }

  const renderBadges = (list) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {list.map((w) => (
        <Link key={w} href={`${linkBase}/${w}`} prefetch={false} className="badge" style={{ textDecoration: "none", fontSize: 14, padding: "4px 9px" }} title={`${score(w)} points`}>
          {w} <span style={{ opacity: 0.55, fontSize: 11 }}>{score(w)}</span>
        </Link>
      ))}
    </div>
  );

  // One length, listed with a show-more budget (used for single-length result
  // sets, and when a length is selected from the filter).
  const renderOneLength = (len, ws) => {
    const visible = ws.length > shown ? ws.slice(0, shown) : ws;
    const remaining = ws.length - visible.length;
    return (
      <>
        <section style={{ marginTop: 18 }}>
          <h2 className="section-title" style={{ fontSize: "1.05rem" }}>{len}-letter words ({ws.length.toLocaleString()})</h2>
          {renderBadges(visible)}
        </section>
        {remaining > 0 ? (
          <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button type="button" className="btn" onClick={() => setShown((s) => Math.min(s + STEP, ws.length))}>
              Show {Math.min(STEP, remaining).toLocaleString()} more
            </button>
            <button type="button" className="btn" onClick={() => setShown(ws.length)}>
              Show all {ws.length.toLocaleString()}
            </button>
            <span className="tool-note" style={{ margin: 0 }}>
              Showing {visible.length.toLocaleString()} of {ws.length.toLocaleString()} words
            </span>
          </div>
        ) : (
          ws.length > INITIAL && <p className="tool-note" style={{ marginTop: 16 }}>Showing all {ws.length.toLocaleString()} words.</p>
        )}
      </>
    );
  };

  if (groups.length === 0) return null;

  // Single length (crossword patterns, N-letter pages, one-length prefixes):
  // no filter needed — just list them, longest-first is moot.
  if (groups.length === 1) return renderOneLength(groups[0].len, groups[0].words);

  // If a stale length filter survives a client navigation to a prefix that has
  // no words of that length, fall back to the overview instead of crashing.
  const selected = filter === "all" ? null : groups.find((g) => g.len === filter);
  const showOverview = filter === "all" || !selected;

  return (
    <>
      <div role="group" aria-label="Filter by word length" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 18 }}>
        <span className="tool-note" style={{ margin: "0 4px 0 0" }}>Length:</span>
        <button type="button" onClick={() => pick("all")} aria-pressed={filter === "all"} style={chip(filter === "all")}>All</button>
        {groups.map(({ len, words: ws }) => (
          <button key={len} type="button" onClick={() => pick(len)} aria-pressed={filter === len} title={`${ws.length.toLocaleString()} ${len}-letter words`} style={chip(filter === len)}>
            {len}
          </button>
        ))}
      </div>

      {showOverview
        ? groups.map(({ len, words: ws }) => {
            const preview = ws.length > PREVIEW ? ws.slice(0, PREVIEW) : ws;
            return (
              <section key={len} style={{ marginTop: 18 }}>
                <h2 className="section-title" style={{ fontSize: "1.05rem" }}>{len}-letter words ({ws.length.toLocaleString()})</h2>
                {renderBadges(preview)}
                {ws.length > PREVIEW && (
                  <button
                    type="button"
                    onClick={() => pick(len)}
                    style={{ marginTop: 10, background: "none", border: "none", padding: 0, color: "var(--text)", fontWeight: 600, fontSize: 13, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}
                  >
                    Show all {ws.length.toLocaleString()} {len}-letter words →
                  </button>
                )}
              </section>
            );
          })
        : renderOneLength(selected.len, selected.words)}
    </>
  );
}
