"use client";

import { useReducer, useEffect, useRef, useState, useMemo } from "react";

const SIZE = 4;
const CELLS = SIZE * SIZE;
const BEST_KEY = "eb-2048-best";

// Classic 2048 tile palette. Each tile carries a solid background so it stays
// readable on both light and dark app themes; the board itself is theme-neutral.
const TILE_COLORS = {
  2: { bg: "#eee4da", color: "#4b453f" },
  4: { bg: "#ede0c8", color: "#4b453f" },
  8: { bg: "#f2b179", color: "#ffffff" },
  16: { bg: "#f59563", color: "#ffffff" },
  32: { bg: "#f67c5f", color: "#ffffff" },
  64: { bg: "#f65e3b", color: "#ffffff" },
  128: { bg: "#edcf72", color: "#ffffff" },
  256: { bg: "#edcc61", color: "#ffffff" },
  512: { bg: "#edc850", color: "#ffffff" },
  1024: { bg: "#edc53f", color: "#ffffff" },
  2048: { bg: "#edc22e", color: "#ffffff" },
};
const SUPER_TILE = { bg: "#3c3a32", color: "#ffffff" };
const EMPTY_CELL = "rgba(128,128,128,0.16)";

function emptyBoard() {
  return new Array(CELLS).fill(0);
}

// Flat-index lists for each move direction. Each "line" lists the four cells of
// a row/column in the order they compact toward (index 0 = the leading edge).
function lineIndices(dir) {
  const lines = [];
  for (let i = 0; i < SIZE; i++) {
    const line = [];
    for (let j = 0; j < SIZE; j++) {
      let r;
      let c;
      if (dir === "left") {
        r = i;
        c = j;
      } else if (dir === "right") {
        r = i;
        c = SIZE - 1 - j;
      } else if (dir === "up") {
        r = j;
        c = i;
      } else {
        // down
        r = SIZE - 1 - j;
        c = i;
      }
      line.push(r * SIZE + c);
    }
    lines.push(line);
  }
  return lines;
}

// Compact + merge one line of four values toward index 0. Each pair merges at
// most once per move, and merged tiles are not merged again this move.
function slideLine(vals) {
  const filtered = vals.filter((v) => v !== 0);
  const row = [];
  let gain = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      row.push(merged);
      gain += merged;
      i++; // skip the tile we just merged into
    } else {
      row.push(filtered[i]);
    }
  }
  while (row.length < SIZE) row.push(0);
  return { row, gain };
}

function applyMove(board, dir) {
  const lines = lineIndices(dir);
  const next = board.slice();
  let gained = 0;
  let moved = false;
  for (const idxs of lines) {
    const vals = idxs.map((i) => board[i]);
    const { row, gain } = slideLine(vals);
    gained += gain;
    for (let k = 0; k < SIZE; k++) {
      if (next[idxs[k]] !== row[k]) moved = true;
      next[idxs[k]] = row[k];
    }
  }
  return { board: next, gained, moved };
}

// Add a 2 (90%) or 4 (10%) to a random empty cell.
function spawnTile(board) {
  const empties = [];
  for (let i = 0; i < CELLS; i++) {
    if (board[i] === 0) empties.push(i);
  }
  if (empties.length === 0) return board;
  const next = board.slice();
  const idx = empties[Math.floor(Math.random() * empties.length)];
  next[idx] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

// A move is possible if any cell is empty or any orthogonal neighbours match.
function movesAvailable(board) {
  for (let i = 0; i < CELLS; i++) {
    if (board[i] === 0) return true;
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r * SIZE + c];
      if (c < SIZE - 1 && board[r * SIZE + c + 1] === v) return true;
      if (r < SIZE - 1 && board[(r + 1) * SIZE + c] === v) return true;
    }
  }
  return false;
}

function freshGame() {
  const board = spawnTile(spawnTile(emptyBoard()));
  return { board, score: 0, won: false, keepGoing: false, over: false };
}

const INITIAL = { board: emptyBoard(), score: 0, won: false, keepGoing: false, over: false };

function reducer(state, action) {
  switch (action.type) {
    case "move": {
      // Frozen while the win prompt is up (until "Keep going") or after game over.
      if (state.over || (state.won && !state.keepGoing)) return state;
      const { board, gained, moved } = applyMove(state.board, action.dir);
      if (!moved) return state;
      const spawned = spawnTile(board);
      const won = state.won || spawned.some((v) => v >= 2048);
      const over = !movesAvailable(spawned);
      return { ...state, board: spawned, score: state.score + gained, won, over };
    }
    case "keepGoing":
      return { ...state, keepGoing: true };
    case "newGame":
      return freshGame();
    default:
      return state;
  }
}

function tileStyle(value) {
  if (value === 0) return { bg: EMPTY_CELL, color: "transparent" };
  return TILE_COLORS[value] || SUPER_TILE;
}

function tileFontSize(value) {
  const digits = String(value).length;
  if (digits <= 2) return "clamp(20px, 8.5vw, 36px)";
  if (digits === 3) return "clamp(17px, 7vw, 30px)";
  if (digits === 4) return "clamp(14px, 5.6vw, 25px)";
  return "clamp(11px, 4.6vw, 20px)";
}

export default function Game2048() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [best, setBest] = useState(0);
  const touchRef = useRef(null);
  const boardRef = useRef(null);

  // Deal the opening tiles on the client only, so server and first client
  // render agree on the empty board (no hydration mismatch from Math.random).
  useEffect(() => {
    dispatch({ type: "newGame" });
    try {
      const stored = parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
      if (Number.isFinite(stored) && stored > 0) setBest(stored);
    } catch {
      /* localStorage may be unavailable */
    }
  }, []);

  // Persist the best score whenever it is beaten.
  useEffect(() => {
    if (state.score > best) {
      setBest(state.score);
      try {
        localStorage.setItem(BEST_KEY, String(state.score));
      } catch {
        /* ignore write failures */
      }
    }
  }, [state.score, best]);

  // Arrow keys and WASD. dispatch from useReducer is stable, so no stale closure.
  useEffect(() => {
    const KEY_DIRS = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
      W: "up",
      S: "down",
      A: "left",
      D: "right",
    };
    const onKey = (e) => {
      const dir = KEY_DIRS[e.key];
      if (!dir) return;
      // Don't steal keys from form fields, and don't block arrow-key scrolling
      // once the board is off screen — this listener is on window, and the page
      // is far taller than the game.
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      const board = boardRef.current;
      if (board) {
        const r = board.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
      }
      e.preventDefault();
      dispatch({ type: "move", dir });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const highest = useMemo(() => {
    let max = 0;
    for (let i = 0; i < state.board.length; i++) {
      if (state.board[i] > max) max = state.board[i];
    }
    return max;
  }, [state.board]);

  const showWin = state.won && !state.keepGoing && !state.over;
  const showOver = state.over;

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    if (t) touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < 24) return; // ignore taps / tiny drags
    const dir = ax > ay ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    dispatch({ type: "move", dir });
  };

  const DirButton = ({ dir, label, glyph }) => (
    <button
      type="button"
      className="btn"
      aria-label={label}
      onClick={() => dispatch({ type: "move", dir })}
      disabled={state.over}
      style={{ minWidth: 52, fontSize: 20, lineHeight: 1 }}
    >
      {glyph}
    </button>
  );

  return (
    <div className="tool">
      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => dispatch({ type: "newGame" })}
        >
          New Game
        </button>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{state.score.toLocaleString("en-US")}</div>
          <div className="tool-stat-label">Score</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{best.toLocaleString("en-US")}</div>
          <div className="tool-stat-label">Best</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{highest.toLocaleString("en-US")}</div>
          <div className="tool-stat-label">Highest tile</div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: "min(100%, 440px)",
          margin: "18px auto",
        }}
      >
        <div
          ref={boardRef}
          role="group"
          aria-label="2048 board"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "repeat(4, 1fr)",
            gap: "clamp(6px, 2.2vw, 12px)",
            padding: "clamp(6px, 2.2vw, 12px)",
            aspectRatio: "1 / 1",
            borderRadius: 10,
            background: "rgba(128,128,128,0.22)",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          {state.board.map((value, idx) => {
            const s = tileStyle(value);
            return (
              <div
                key={idx}
                role="presentation"
                aria-label={value === 0 ? "empty" : String(value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 0,
                  borderRadius: 6,
                  background: s.bg,
                  color: s.color,
                  fontWeight: 700,
                  fontSize: tileFontSize(value),
                  lineHeight: 1,
                  transition: "background 90ms ease",
                }}
              >
                {value !== 0 ? value : ""}
              </div>
            );
          })}
        </div>

        {(showWin || showOver) && (
          <div
            role="status"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              borderRadius: 10,
              padding: 16,
              textAlign: "center",
              background: "rgba(238,228,218,0.82)",
              color: "#4b453f",
            }}
          >
            <div style={{ fontSize: "clamp(24px, 8vw, 40px)", fontWeight: 800 }}>
              {showOver ? "Game over" : "You win!"}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {showOver
                ? state.won
                  ? "You reached 2048 and ran out of moves."
                  : "No moves left."
                : "You made a 2048 tile."}
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {showWin && (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => dispatch({ type: "keepGoing" })}
                >
                  Keep going
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => dispatch({ type: "newGame" })}
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          marginTop: 4,
        }}
      >
        <DirButton dir="up" label="Move up" glyph="↑" />
        <div style={{ display: "flex", gap: 8 }}>
          <DirButton dir="left" label="Move left" glyph="←" />
          <DirButton dir="down" label="Move down" glyph="↓" />
          <DirButton dir="right" label="Move right" glyph="→" />
        </div>
      </div>

      <p className="tool-note">
        Use the arrow keys, WASD, swipe, or the on-screen buttons to slide the
        tiles. When two tiles with the same number touch, they merge into one.
        Reach the 2048 tile to win — then keep going for a higher score.
      </p>
    </div>
  );
}
