"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// A themed sample word list, used when the input box is empty. Editable by the
// user — this is just a friendly starting point so the tool works instantly.
const DEFAULT_WORDS = [
  "TIGER", "ZEBRA", "HORSE", "MOUSE", "EAGLE", "SHARK",
  "WHALE", "PANDA", "KOALA", "OTTER", "BISON", "MONKEY",
  "RABBIT", "LIZARD",
].join("\n");

// Forward placement directions only (words always read left-to-right, top-to-
// bottom or along a downward/upward-right diagonal — never reversed).
const DIRECTIONS = [
  { dr: 0, dc: 1 },   // horizontal, left to right
  { dr: 1, dc: 0 },   // vertical, top to bottom
  { dr: 1, dc: 1 },   // diagonal, down-right
  { dr: -1, dc: 1 },  // diagonal, up-right
];

const SIZE_OPTIONS = [10, 12, 14, 16];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_WORDS = 40;

// Parse the textarea into clean, unique, letters-only words (A-Z, 2+ chars).
// Any non-letter (space, comma, hyphen, newline) separates words.
function parseWords(input) {
  const tokens = (input || "").toUpperCase().split(/[^A-Z]+/);
  const seen = new Set();
  const out = [];
  for (const t of tokens) {
    if (t.length < 2 || t.length > 24) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_WORDS) break;
  }
  return out;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomLetter() {
  return ALPHABET[Math.floor(Math.random() * 26)];
}

// Try to place one word into the grid. Returns the list of cells it occupies,
// or null if no valid position/direction fits. Overlaps are allowed only when
// the shared cells already hold the same letter.
function tryPlace(grid, word, dirs, size) {
  const options = [];
  for (const dir of dirs) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const endR = r + dir.dr * (word.length - 1);
        const endC = c + dir.dc * (word.length - 1);
        if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
        options.push({ r, c, dir });
      }
    }
  }
  shuffle(options);
  for (const opt of options) {
    const cells = [];
    let ok = true;
    for (let i = 0; i < word.length; i++) {
      const rr = opt.r + opt.dir.dr * i;
      const cc = opt.c + opt.dir.dc * i;
      const existing = grid[rr][cc];
      if (existing && existing !== word[i]) {
        ok = false;
        break;
      }
      cells.push({ r: rr, c: cc });
    }
    if (ok) return cells;
  }
  return null;
}

// Build a full puzzle: place every word (longest first for a better fit), then
// fill every remaining empty cell with a random letter.
function buildPuzzle(words, requestedSize, useDiagonals) {
  if (words.length === 0) {
    return { grid: [], placements: [], unplaced: [], size: 0, empty: true };
  }
  const longest = words.reduce((m, w) => Math.max(m, w.length), 0);
  const size = Math.max(requestedSize, longest);
  const dirs = useDiagonals ? DIRECTIONS : DIRECTIONS.slice(0, 2);

  const grid = Array.from({ length: size }, () => new Array(size).fill(""));
  const placements = [];
  const unplaced = [];

  const ordered = [...words].sort((a, b) => b.length - a.length);
  for (const word of ordered) {
    const cells = tryPlace(grid, word, dirs, size);
    if (cells) {
      for (let i = 0; i < cells.length; i++) {
        grid[cells[i].r][cells[i].c] = word[i];
      }
      placements.push({ word, cells });
    } else {
      unplaced.push(word);
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = randomLetter();
    }
  }

  // Present the word list alphabetically for the solver, regardless of the
  // order words were placed in.
  placements.sort((a, b) => a.word.localeCompare(b.word));
  unplaced.sort((a, b) => a.localeCompare(b));

  return { grid, placements, unplaced, size, empty: false };
}

export default function WordSearch() {
  const [wordsInput, setWordsInput] = useState(DEFAULT_WORDS);
  const [size, setSize] = useState(12);
  const [useDiagonals, setUseDiagonals] = useState(true);
  const [puzzle, setPuzzle] = useState(null);
  const [revealAll, setRevealAll] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);

  const parsed = useMemo(() => parseWords(wordsInput), [wordsInput]);

  // Generate a fresh puzzle. Called from all controls so a single code path
  // handles building + resetting the reveal/selection state.
  const generate = useCallback((words, gridSize, diag) => {
    setPuzzle(buildPuzzle(words, gridSize, diag));
    setRevealAll(false);
    setSelectedWord(null);
  }, []);

  // Build the first puzzle on the client only, so the server render and the
  // first client render match (Math.random must not run during render).
  useEffect(() => {
    generate(parseWords(DEFAULT_WORDS), 12, true);
  }, [generate]);

  const handleNewPuzzle = () => generate(parsed, size, useDiagonals);

  const handleSizeChange = (e) => {
    const next = Number(e.target.value) || 12;
    setSize(next);
    generate(parsed, next, useDiagonals);
  };

  const handleDiagonalChange = (e) => {
    const next = e.target.checked;
    setUseDiagonals(next);
    generate(parsed, size, next);
  };

  const toggleWord = (word) => {
    setSelectedWord((cur) => (cur === word ? null : word));
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  // Map of "r-c" -> highlight kind for the current view. A single selected word
  // (amber) always wins over the full reveal (green).
  const highlight = useMemo(() => {
    const map = new Map();
    if (!puzzle) return map;
    if (revealAll) {
      for (const p of puzzle.placements) {
        for (const cell of p.cells) map.set(`${cell.r}-${cell.c}`, "reveal");
      }
    }
    if (selectedWord) {
      const p = puzzle.placements.find((x) => x.word === selectedWord);
      if (p) for (const cell of p.cells) map.set(`${cell.r}-${cell.c}`, "select");
    }
    return map;
  }, [puzzle, revealAll, selectedWord]);

  const hasInputError = parsed.length === 0;
  const ready = puzzle && !puzzle.empty;

  const cellFontSize = puzzle && puzzle.size
    ? `min(${Math.max(9, Math.round(260 / puzzle.size))}px, ${(60 / puzzle.size).toFixed(2)}vw)`
    : "16px";
  const gridWidth = puzzle && puzzle.size
    ? `min(100%, ${Math.min(puzzle.size * 42, 560)}px)`
    : "100%";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ws-words">
              Words (one per line, or separated by commas/spaces)
            </label>
            <textarea
              id="ws-words"
              className="tool-textarea"
              rows={6}
              value={wordsInput}
              onChange={(e) => setWordsInput(e.target.value)}
              placeholder={"tiger\nzebra\nhorse"}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="tool-note">
              Only letters A-Z are used; numbers, spaces and symbols split words
              apart. Up to {MAX_WORDS} words, 2-24 letters each. Click
              &ldquo;New puzzle&rdquo; after editing to apply your list.
            </p>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ws-size">
              Grid size
            </label>
            <select
              id="ws-size"
              className="tool-select"
              value={size}
              onChange={handleSizeChange}
            >
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s} × {s}
                </option>
              ))}
            </select>
            <p className="tool-note">
              Grows automatically if a word is longer than the chosen size.
            </p>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="ws-diagonals">
              Difficulty
            </label>
            <label
              htmlFor="ws-diagonals"
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
            >
              <input
                id="ws-diagonals"
                type="checkbox"
                checked={useDiagonals}
                onChange={handleDiagonalChange}
              />
              <span>Include diagonal words</span>
            </label>
            <p className="tool-note">
              Off = horizontal &amp; vertical only (easier).
            </p>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={handleNewPuzzle}>
          New puzzle
        </button>
        <button
          type="button"
          className={revealAll ? "btn btn-success" : "btn"}
          onClick={() => setRevealAll((v) => !v)}
          disabled={!ready}
          aria-pressed={revealAll}
        >
          {revealAll ? "Hide answers" : "Reveal answers"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={handlePrint}
          disabled={!ready}
        >
          Print
        </button>
      </div>

      {hasInputError && (
        <div className="tool-error">
          Add at least one word (letters only, 2 or more characters).
        </div>
      )}

      {ready && (
        <div className="tool-stat-grid" role="status" aria-live="polite">
          <div className="tool-stat">
            <div className="tool-stat-num">{puzzle.placements.length}</div>
            <div className="tool-stat-label">Words hidden</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">
              {puzzle.size}×{puzzle.size}
            </div>
            <div className="tool-stat-label">Grid size</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{puzzle.unplaced.length}</div>
            <div className="tool-stat-label">Didn&rsquo;t fit</div>
          </div>
        </div>
      )}

      {ready && (
        <div
          role="group"
          aria-label="Word search grid"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${puzzle.size}, 1fr)`,
            gap: "2px",
            width: gridWidth,
            margin: "18px auto",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          }}
        >
          {puzzle.grid.map((row, r) =>
            row.map((ch, c) => {
              const kind = highlight.get(`${r}-${c}`);
              const bg =
                kind === "select"
                  ? "#e08a2b"
                  : kind === "reveal"
                  ? "#2e9e6a"
                  : "transparent";
              const fg = kind ? "#ffffff" : "currentColor";
              return (
                <div
                  key={`${r}-${c}`}
                  role="presentation"
                  aria-label={ch}
                  style={{
                    aspectRatio: "1 / 1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: cellFontSize,
                    fontWeight: 600,
                    lineHeight: 1,
                    userSelect: "none",
                    borderRadius: 3,
                    background: bg,
                    color: fg,
                    border: kind
                      ? `1px solid ${kind === "select" ? "#e08a2b" : "#2e9e6a"}`
                      : "1px solid rgba(128,128,128,0.28)",
                    transition: "background 120ms ease, color 120ms ease",
                  }}
                >
                  {ch}
                </div>
              );
            })
          )}
        </div>
      )}

      {ready && puzzle.placements.length > 0 && (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">
            Find these words ({puzzle.placements.length}) — click one to spotlight it
          </div>
          <div
            className="tool-result-value"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 6,
            }}
          >
            {puzzle.placements.map((p) => {
              const active = selectedWord === p.word;
              return (
                <button
                  key={p.word}
                  type="button"
                  onClick={() => toggleWord(p.word)}
                  aria-pressed={active}
                  style={{
                    padding: "5px 12px",
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    borderRadius: 999,
                    border: `1px solid ${active ? "#e08a2b" : "rgba(128,128,128,0.4)"}`,
                    background: active ? "#e08a2b" : "transparent",
                    color: active ? "#ffffff" : "currentColor",
                    transition: "background 120ms ease, border-color 120ms ease",
                  }}
                >
                  {p.word}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {ready && puzzle.unplaced.length > 0 && (
        <div className="tool-note" style={{ marginTop: 12 }}>
          These words could not fit and were left out:{" "}
          <strong>{puzzle.unplaced.join(", ")}</strong>. Try a larger grid, fewer
          words, or shorter words.
        </div>
      )}

      <p className="tool-note" style={{ marginTop: 14 }}>
        Words hide horizontally, vertically and (unless you turn diagonals off)
        along diagonals, always reading forward. Use &ldquo;New puzzle&rdquo; for
        a fresh random layout, &ldquo;Reveal answers&rdquo; to highlight every
        word, or click a word above to spotlight just that one.
      </p>
    </div>
  );
}
