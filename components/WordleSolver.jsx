"use client";

import { useState, useEffect, useMemo, useRef } from "react";

export default function WordleSolver() {
  const [words, setWords] = useState(null);
  const [green, setGreen] = useState(["", "", "", "", ""]);
  const [yellow, setYellow] = useState("");
  const [grey, setGrey] = useState("");
  const refs = useRef([]);

  useEffect(() => {
    let alive = true;
    fetch("/words/len5.txt")
      .then((r) => r.text())
      .then((t) => { if (alive) setWords(t.split("\n").filter(Boolean)); })
      .catch(() => { if (alive) setWords([]); });
    return () => { alive = false; };
  }, []);

  const matches = useMemo(() => {
    if (!words) return null;
    const g = green.map((c) => c.toLowerCase().replace(/[^a-z]/g, "").slice(0, 1));
    const yl = [...new Set(yellow.toLowerCase().replace(/[^a-z]/g, "").split(""))];
    const gl = new Set(grey.toLowerCase().replace(/[^a-z]/g, "").split(""));
    for (const c of g) if (c) gl.delete(c);
    for (const c of yl) gl.delete(c);
    return words.filter((w) => {
      for (let i = 0; i < 5; i++) if (g[i] && w[i] !== g[i]) return false;
      for (const c of yl) if (!w.includes(c)) return false;
      for (const c of w) if (gl.has(c)) return false;
      return true;
    });
  }, [words, green, yellow, grey]);

  function setPos(i, val) {
    const v = val.toLowerCase().replace(/[^a-z]/g, "").slice(0, 1);
    setGreen((g) => { const n = [...g]; n[i] = v; return n; });
    if (v && i < 4) refs.current[i + 1]?.focus();
  }

  const tile = {
    width: 46, height: 52, textAlign: "center", fontSize: 22, fontWeight: 700,
    textTransform: "uppercase", borderRadius: 8, border: "2px solid rgba(128,128,128,0.5)",
    background: "rgba(120,180,120,0.18)", color: "currentColor",
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label">Green — correct letter &amp; position</label>
          <div style={{ display: "flex", gap: 8 }}>
            {green.map((c, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                value={c}
                onChange={(e) => setPos(i, e.target.value)}
                maxLength={1}
                aria-label={`Green letter position ${i + 1}`}
                style={tile}
              />
            ))}
          </div>
        </div>
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ws-y">Yellow — in the word, wrong spot</label>
            <input id="ws-y" className="tool-input" value={yellow} onChange={(e) => setYellow(e.target.value)} placeholder="e.g. aer" autoCapitalize="none" spellCheck={false} />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ws-g">Grey — not in the word</label>
            <input id="ws-g" className="tool-input" value={grey} onChange={(e) => setGrey(e.target.value)} placeholder="e.g. tsni" autoCapitalize="none" spellCheck={false} />
          </div>
        </div>
      </div>

      {matches === null ? (
        <p className="tool-note">Loading word list…</p>
      ) : (
        <>
          <p className="tool-note" aria-live="polite">
            <strong>{matches.length}</strong> possible word{matches.length === 1 ? "" : "s"}
            {matches.length > 300 ? " — add more clues to narrow it down." : ""}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {matches.slice(0, 300).map((w) => (
              <a key={w} href={`/unscramble/${w}`} className="badge" style={{ textDecoration: "none", fontSize: 15, padding: "5px 10px" }}>{w}</a>
            ))}
          </div>
        </>
      )}

      <p className="tool-note">
        Enter the clues from your Wordle guesses: green letters in their exact spot, yellow letters that are in the word
        somewhere, and grey letters that aren't. The list narrows as you type. Everything runs in your browser.
      </p>
    </div>
  );
}
