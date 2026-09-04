"use client";

import { useCallback, useMemo, useState } from "react";

// Cryptographically strong integer in [0, max) using rejection sampling to
// avoid modulo bias. Returns 0 when the range is empty.
function randInt(max) {
  if (max <= 0) return 0;
  const b = new Uint32Array(1);
  const lim = Math.floor(0x100000000 / max) * max;
  let v;
  do {
    crypto.getRandomValues(b);
    v = b[0];
  } while (v >= lim);
  return v % max;
}

// In-place Fisher-Yates shuffle built on randInt. Returns a new array.
function shuffle(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

const COLUMNS = ["B", "I", "N", "G", "O"];

// Classic B-I-N-G-O column ranges: B 1-15, I 16-30, N 31-45, G 46-60, O 61-75.
function buildNumberCard() {
  const grid = [];
  for (let c = 0; c < 5; c++) {
    const start = c * 15 + 1;
    const pool = [];
    for (let n = start; n < start + 15; n++) pool.push(n);
    const picks = shuffle(pool).slice(0, 5);
    grid.push(picks);
  }
  // grid is column-major; transpose to rows and set the free centre.
  const rows = [];
  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) row.push("FREE");
      else row.push(String(grid[c][r]));
    }
    rows.push(row);
  }
  return rows;
}

// Fill a 5x5 grid from a word pool (needs >= 24). Centre is FREE.
function buildWordCard(words) {
  const picks = shuffle(words).slice(0, 24);
  const rows = [];
  let k = 0;
  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) row.push("FREE");
      else row.push(picks[k++]);
    }
    rows.push(row);
  }
  return rows;
}

export default function BingoCardGenerator() {
  const [mode, setMode] = useState("numbers");
  const [wordText, setWordText] = useState("");
  const [card, setCard] = useState(() => buildNumberCard());
  const [showFree, setShowFree] = useState(false);

  // Split words into unique, trimmed, non-blank entries.
  const words = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const raw of wordText.split(/\r?\n|,/)) {
      const w = raw.trim();
      if (w.length === 0) continue;
      const key = w.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(w);
    }
    return out;
  }, [wordText]);

  const wordError = useMemo(() => {
    if (mode !== "words") return null;
    if (words.length === 0) return null;
    if (words.length < 24)
      return `Add at least 24 words to fill a card — you have ${words.length}. (A 5×5 card has 24 squares plus a free centre.)`;
    return null;
  }, [mode, words.length]);

  const canBuildWords = mode === "words" && words.length >= 24;

  const newCard = useCallback(() => {
    if (mode === "numbers") {
      setCard(buildNumberCard());
    } else if (canBuildWords) {
      setCard(buildWordCard(words));
    }
  }, [mode, canBuildWords, words]);

  const switchMode = useCallback(
    (next) => {
      setShowFree(false);
      setMode(next);
      if (next === "numbers") setCard(buildNumberCard());
      else setCard(null);
    },
    []
  );

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="bc-mode">
            Card type
          </label>
          <select
            id="bc-mode"
            className="tool-select"
            value={mode}
            onChange={(e) => switchMode(e.target.value)}
          >
            <option value="numbers">Numbers (1–75 classic)</option>
            <option value="words">Custom words</option>
          </select>
        </div>

        {mode === "words" ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="bc-words">
              Your words (one per line, or comma-separated — need 24+)
            </label>
            <textarea
              id="bc-words"
              className="tool-textarea"
              value={wordText}
              onChange={(e) => setWordText(e.target.value)}
              placeholder={"Sunshine\nRainbow\nPuppy\nBalloon\nPizza\n…"}
              rows={8}
            />
          </div>
        ) : null}

        <div className="tool-field">
          <label
            className="tool-label"
            htmlFor="bc-free"
            style={{ fontWeight: "normal" }}
          >
            <input
              id="bc-free"
              type="checkbox"
              checked={showFree}
              onChange={(e) => setShowFree(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Mark the centre square as already stamped
          </label>
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={newCard}
          disabled={mode === "words" && !canBuildWords}
        >
          New card
        </button>
      </div>

      {wordError ? (
        <p className="tool-error" role="alert">
          {wordError}
        </p>
      ) : null}

      {mode === "words" && !card ? (
        <p className="tool-note">
          Add 24 or more words above, then press &ldquo;New card&rdquo; to build
          your bingo card.
        </p>
      ) : null}

      {card ? (
        <div className="tool-result" aria-live="polite">
          <p className="tool-result-label">
            {mode === "numbers" ? "Classic B-I-N-G-O card" : "Your bingo card"}
          </p>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                margin: "0.5rem auto 0",
                width: "100%",
                maxWidth: "440px",
                tableLayout: "fixed",
              }}
            >
              {mode === "numbers" ? (
                <thead>
                  <tr>
                    {COLUMNS.map((c) => (
                      <th
                        key={c}
                        style={{
                          border: "2px solid currentColor",
                          padding: "0.4rem",
                          fontSize: "1.5rem",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {card.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => {
                      const isFree = r === 2 && c === 2;
                      return (
                        <td
                          key={c}
                          style={{
                            border: "2px solid currentColor",
                            padding: "0.3rem",
                            textAlign: "center",
                            verticalAlign: "middle",
                            height: "68px",
                            width: "20%",
                            fontSize:
                              mode === "numbers" ? "1.35rem" : "0.9rem",
                            fontWeight: isFree ? 700 : 500,
                            lineHeight: 1.15,
                            wordBreak: "break-word",
                            background:
                              isFree && showFree
                                ? "rgba(127,127,127,0.25)"
                                : "transparent",
                          }}
                        >
                          {isFree ? "★ FREE" : cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <p className="tool-note">
        Tip: press Ctrl+P (Windows) or Cmd+P (Mac) to print this card, or save it
        as a PDF. Generate a fresh card for each player before you print.
      </p>
      <p className="tool-note">
        Cards are built with your browser&apos;s cryptographic random generator
        (crypto.getRandomValues) for fair, unbiased boards. Everything runs
        locally — nothing you type ever leaves your device.
      </p>
    </div>
  );
}
