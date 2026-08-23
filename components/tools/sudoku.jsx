"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

// Target number of given clues for each difficulty.
const CLUES = { easy: 40, medium: 32, hard: 26 };

const DIFFICULTIES = [
  { value: "easy", label: "Easy (~40 clues)" },
  { value: "medium", label: "Medium (~32 clues)" },
  { value: "hard", label: "Hard (~26 clues)" },
];

// Theme-neutral grid lines that read on light and dark backgrounds.
const LINE_THIN = "rgba(128,128,128,0.35)";
const LINE_THICK = "rgba(128,128,128,0.85)";
const CONFLICT_COLOR = "#e5484d";
const CONFLICT_BG = "rgba(229,72,77,0.16)";

function makeEmpty() {
  return new Array(81).fill(0);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// Is placing `val` at flat index `idx` valid given the current grid?
function isValid(grid, idx, val) {
  const row = Math.floor(idx / 9);
  const col = idx % 9;
  for (let c = 0; c < 9; c++) {
    if (grid[row * 9 + c] === val) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (grid[r * 9 + col] === val) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (grid[r * 9 + c] === val) return false;
    }
  }
  return true;
}

// Backtracking filler: fills the grid with a random valid full solution.
function fillGrid(grid) {
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0) {
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (let k = 0; k < nums.length; k++) {
        const val = nums[k];
        if (isValid(grid, i, val)) {
          grid[i] = val;
          if (fillGrid(grid)) return true;
          grid[i] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

// Count solutions of a puzzle, stopping once `limit` is reached.
function countSolutions(grid, limit) {
  let idx = -1;
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return 1;
  let count = 0;
  for (let val = 1; val <= 9; val++) {
    if (isValid(grid, idx, val)) {
      grid[idx] = val;
      count += countSolutions(grid, limit);
      grid[idx] = 0;
      if (count >= limit) break;
    }
  }
  return count;
}

// Remove clues from a solved grid down to ~targetClues while keeping a
// unique solution, so the stored solution is the only valid completion.
function digCells(solution, targetClues) {
  const puzzle = solution.slice();
  const order = shuffle([...Array(81).keys()]);
  let clues = 81;
  for (let k = 0; k < order.length; k++) {
    if (clues <= targetClues) break;
    const idx = order[k];
    if (puzzle[idx] === 0) continue;
    const backup = puzzle[idx];
    puzzle[idx] = 0;
    const copy = puzzle.slice();
    if (countSolutions(copy, 2) !== 1) {
      puzzle[idx] = backup; // removing this clue breaks uniqueness
    } else {
      clues -= 1;
    }
  }
  return puzzle;
}

export default function Sudoku() {
  const [difficulty, setDifficulty] = useState("easy");
  const [puzzle, setPuzzle] = useState([]); // givens: digit or 0
  const [solution, setSolution] = useState([]); // full solved grid
  const [entries, setEntries] = useState([]); // user input strings
  const [conflicts, setConflicts] = useState(() => new Set());
  const [checkMsg, setCheckMsg] = useState("");
  const [autoSolved, setAutoSolved] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [generating, setGenerating] = useState(true);

  const startNewGame = useCallback((diff) => {
    setGenerating(true);
    setConflicts(new Set());
    setCheckMsg("");
    setAutoSolved(false);
    setFocusedIdx(-1);
    // Defer the heavy backtracking work so the "Generating…" state paints.
    setTimeout(() => {
      const sol = makeEmpty();
      fillGrid(sol);
      const clues = CLUES[diff] != null ? CLUES[diff] : 40;
      const puz = digCells(sol, clues);
      setSolution(sol);
      setPuzzle(puz);
      setEntries(new Array(81).fill(""));
      setGenerating(false);
    }, 20);
  }, []);

  // Generate the first puzzle on mount (client only, avoids hydration mismatch).
  useEffect(() => {
    startNewGame("easy");
  }, [startNewGame]);

  const ready = puzzle.length === 81 && solution.length === 81;

  // The value shown in a cell right now (given clue or user entry, 0 if blank).
  const valueAt = useCallback(
    (i) => {
      if (puzzle[i] !== 0 && puzzle[i] != null) return puzzle[i];
      const n = parseInt(entries[i], 10);
      return Number.isFinite(n) ? n : 0;
    },
    [puzzle, entries]
  );

  // Does the value at idx duplicate another value in its row/col/box?
  const hasRuleConflict = useCallback(
    (idx, val) => {
      const row = Math.floor(idx / 9);
      const col = idx % 9;
      for (let c = 0; c < 9; c++) {
        const j = row * 9 + c;
        if (j !== idx && valueAt(j) === val) return true;
      }
      for (let r = 0; r < 9; r++) {
        const j = r * 9 + col;
        if (j !== idx && valueAt(j) === val) return true;
      }
      const br = Math.floor(row / 3) * 3;
      const bc = Math.floor(col / 3) * 3;
      for (let r = br; r < br + 3; r++) {
        for (let c = bc; c < bc + 3; c++) {
          const j = r * 9 + c;
          if (j !== idx && valueAt(j) === val) return true;
        }
      }
      return false;
    },
    [valueAt]
  );

  // Win when every cell matches the stored solution.
  const solved = useMemo(() => {
    if (!ready) return false;
    for (let i = 0; i < 81; i++) {
      if (valueAt(i) !== solution[i]) return false;
    }
    return true;
  }, [ready, valueAt, solution]);

  const stats = useMemo(() => {
    if (!ready) return { clues: 0, filled: 0, empty: 0 };
    let clues = 0;
    let empty = 0;
    let filled = 0;
    for (let i = 0; i < 81; i++) {
      if (puzzle[i] !== 0) {
        clues += 1;
      } else if (entries[i]) {
        filled += 1;
      } else {
        empty += 1;
      }
    }
    return { clues, filled, empty };
  }, [ready, puzzle, entries]);

  function handleChange(idx, raw) {
    const digits = String(raw).replace(/[^1-9]/g, "");
    const digit = digits.slice(-1); // keep the last typed digit
    setEntries((prev) => {
      const next = prev.slice();
      next[idx] = digit;
      return next;
    });
    if (conflicts.size) setConflicts(new Set());
    if (checkMsg) setCheckMsg("");
    if (autoSolved) setAutoSolved(false);
  }

  function handleCheck() {
    if (!ready) return;
    const bad = new Set();
    let filledCount = 0;
    for (let i = 0; i < 81; i++) {
      if (puzzle[i] !== 0) continue; // givens are always correct
      const raw = entries[i];
      if (!raw) continue;
      filledCount += 1;
      const val = parseInt(raw, 10);
      if (val !== solution[i] || hasRuleConflict(i, val)) {
        bad.add(i);
      }
    }
    setConflicts(bad);
    if (filledCount === 0) {
      setCheckMsg("Nothing to check yet — type some digits first.");
    } else if (bad.size === 0) {
      setCheckMsg("No mistakes so far. Keep going!");
    } else {
      setCheckMsg(
        `${bad.size} cell${bad.size === 1 ? "" : "s"} look wrong — highlighted in red.`
      );
    }
  }

  function handleSolve() {
    if (!ready) return;
    const next = new Array(81).fill("");
    for (let i = 0; i < 81; i++) {
      if (puzzle[i] === 0) next[i] = String(solution[i]);
    }
    setEntries(next);
    setConflicts(new Set());
    setCheckMsg("");
    setAutoSolved(true);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="sudoku-difficulty">
            Difficulty
          </label>
          <select
            id="sudoku-difficulty"
            className="tool-select"
            value={difficulty}
            onChange={(e) => {
              const d = e.target.value;
              setDifficulty(d);
              startNewGame(d);
            }}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => startNewGame(difficulty)}
          disabled={generating}
        >
          {generating ? "Generating…" : "New Game"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleCheck}
          disabled={!ready || solved}
        >
          Check
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleSolve}
          disabled={!ready || solved}
        >
          Solve
        </button>
      </div>

      {solved && (
        <div
          className="tool-result"
          role="status"
          style={{ textAlign: "center" }}
        >
          <p className="tool-result-label">
            {autoSolved ? "Solved" : "Puzzle complete"}
          </p>
          <div className="tool-result-value">
            {autoSolved
              ? "Here's the full solution."
              : "You solved it! 🎉"}
          </div>
          {!autoSolved && (
            <p className="tool-note">
              Every cell matches the solution. Start a new game to play again.
            </p>
          )}
        </div>
      )}

      <div
        aria-label="Sudoku grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(9, 1fr)",
          gridTemplateRows: "repeat(9, 1fr)",
          width: "min(100%, 460px)",
          aspectRatio: "1 / 1",
          margin: "18px auto",
          userSelect: "none",
        }}
      >
        {ready
          ? puzzle.map((given, idx) => {
              const r = Math.floor(idx / 9);
              const c = idx % 9;
              const isGiven = given !== 0;
              const isConflict = conflicts.has(idx);
              const isFocused = focusedIdx === idx;

              const cellStyle = {
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 0,
                borderTop: `${r % 3 === 0 ? "2px" : "1px"} solid ${
                  r % 3 === 0 ? LINE_THICK : LINE_THIN
                }`,
                borderLeft: `${c % 3 === 0 ? "2px" : "1px"} solid ${
                  c % 3 === 0 ? LINE_THICK : LINE_THIN
                }`,
                borderRight: c === 8 ? `2px solid ${LINE_THICK}` : "none",
                borderBottom: r === 8 ? `2px solid ${LINE_THICK}` : "none",
                background: isConflict
                  ? CONFLICT_BG
                  : isFocused && !isGiven
                  ? "rgba(128,128,128,0.16)"
                  : isGiven
                  ? "rgba(128,128,128,0.08)"
                  : "transparent",
              };

              return (
                <div key={idx} style={cellStyle}>
                  {isGiven ? (
                    <span
                      style={{
                        fontSize: "clamp(15px, 5.2vw, 23px)",
                        fontWeight: 700,
                        color: "var(--text)",
                        lineHeight: 1,
                      }}
                    >
                      {given}
                    </span>
                  ) : (
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Row ${r + 1}, column ${c + 1}`}
                      value={entries[idx] || ""}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      onFocus={() => setFocusedIdx(idx)}
                      onBlur={() => setFocusedIdx(-1)}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        textAlign: "center",
                        fontSize: "clamp(15px, 5.2vw, 23px)",
                        fontWeight: 500,
                        fontFamily: "inherit",
                        color: isConflict ? CONFLICT_COLOR : "var(--text)",
                        caretColor: "var(--text)",
                        padding: 0,
                        borderRadius: 0,
                        MozAppearance: "textfield",
                        lineHeight: 1,
                      }}
                    />
                  )}
                </div>
              );
            })
          : Array.from({ length: 81 }).map((_, idx) => {
              const r = Math.floor(idx / 9);
              const c = idx % 9;
              return (
                <div
                  key={idx}
                  style={{
                    borderTop: `${r % 3 === 0 ? "2px" : "1px"} solid ${
                      r % 3 === 0 ? LINE_THICK : LINE_THIN
                    }`,
                    borderLeft: `${c % 3 === 0 ? "2px" : "1px"} solid ${
                      c % 3 === 0 ? LINE_THICK : LINE_THIN
                    }`,
                    borderRight: c === 8 ? `2px solid ${LINE_THICK}` : "none",
                    borderBottom: r === 8 ? `2px solid ${LINE_THICK}` : "none",
                  }}
                />
              );
            })}
      </div>

      {generating && (
        <p className="tool-note" style={{ textAlign: "center" }}>
          Generating a new puzzle…
        </p>
      )}

      {checkMsg && !solved && (
        <p
          className={conflicts.size ? "tool-error" : "tool-note"}
          role="status"
          style={{ textAlign: "center" }}
        >
          {checkMsg}
        </p>
      )}

      {ready && (
        <div className="tool-stat-grid">
          <div className="tool-stat">
            <div className="tool-stat-num">{stats.clues}</div>
            <div className="tool-stat-label">Given clues</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{stats.filled}</div>
            <div className="tool-stat-label">Filled in</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{stats.empty}</div>
            <div className="tool-stat-label">Empty left</div>
          </div>
        </div>
      )}

      <p className="tool-note">
        Given numbers are bold and locked. Type 1–9 into the blank cells. Use
        Check to highlight mistakes in red, or Solve to reveal the full grid.
        Every puzzle has exactly one solution.
      </p>
    </div>
  );
}
