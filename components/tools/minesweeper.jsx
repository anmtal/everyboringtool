"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const LEVELS = {
  beginner: { label: "Beginner (9x9, 10 mines)", rows: 9, cols: 9, mines: 10 },
  intermediate: { label: "Intermediate (16x16, 40 mines)", rows: 16, cols: 16, mines: 40 },
};

const NUMBER_COLORS = {
  1: "#1976d2",
  2: "#388e3c",
  3: "#d32f2f",
  4: "#7b1fa2",
  5: "#b8860b",
  6: "#0097a7",
  7: "#5d4037",
  8: "#616161",
};

function makeGrid(rows, cols) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        mine: false,
        revealed: false,
        flagged: false,
        adjacent: 0,
      });
    }
    grid.push(row);
  }
  return grid;
}

function neighbors(r, c, rows, cols) {
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc]);
    }
  }
  return out;
}

// Random int in [0, max) using crypto when available for a fair board.
function randInt(max) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

// Place mines avoiding the first-clicked cell and its neighbors (safe first click).
function placeMines(grid, rows, cols, mineCount, safeR, safeC) {
  const next = grid.map((row) => row.map((cell) => ({ ...cell, mine: false, adjacent: 0 })));

  const forbidden = new Set();
  forbidden.add(safeR * cols + safeC);
  neighbors(safeR, safeC, rows, cols).forEach(([nr, nc]) => forbidden.add(nr * cols + nc));

  const totalCells = rows * cols;
  // If the board is too small to keep a full safe ring, only protect the clicked cell.
  const available = totalCells - forbidden.size;
  const useNeighborSafety = available >= mineCount;
  if (!useNeighborSafety) {
    forbidden.clear();
    forbidden.add(safeR * cols + safeC);
  }

  let placed = 0;
  const maxMines = Math.min(mineCount, totalCells - forbidden.size);
  while (placed < maxMines) {
    const idx = randInt(totalCells);
    if (forbidden.has(idx)) continue;
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    if (next[r][c].mine) continue;
    next[r][c].mine = true;
    placed++;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c].mine) continue;
      let count = 0;
      neighbors(r, c, rows, cols).forEach(([nr, nc]) => {
        if (next[nr][nc].mine) count++;
      });
      next[r][c].adjacent = count;
    }
  }
  return next;
}

// Flood-fill reveal starting at (r, c). Mutates a fresh clone and returns it.
function revealFlood(grid, rows, cols, startR, startC) {
  const next = grid.map((row) => row.map((cell) => ({ ...cell })));
  const stack = [[startR, startC]];
  while (stack.length) {
    const [r, c] = stack.pop();
    const cell = next[r][c];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent === 0 && !cell.mine) {
      neighbors(r, c, rows, cols).forEach(([nr, nc]) => {
        const n = next[nr][nc];
        if (!n.revealed && !n.flagged) stack.push([nr, nc]);
      });
    }
  }
  return next;
}

function countFlags(grid) {
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell.flagged) n++;
  return n;
}

function countRevealed(grid) {
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell.revealed) n++;
  return n;
}

export default function Minesweeper() {
  const [levelKey, setLevelKey] = useState("beginner");
  const level = LEVELS[levelKey];

  const [grid, setGrid] = useState(() => makeGrid(level.rows, level.cols));
  const [minesPlaced, setMinesPlaced] = useState(false);
  const [status, setStatus] = useState("ready"); // ready | playing | won | lost
  const [flagMode, setFlagMode] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setSeconds((s) => (s >= 999 ? 999 : s + 1));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const resetBoard = useCallback(
    (key) => {
      const lvl = LEVELS[key] || LEVELS.beginner;
      stopTimer();
      setGrid(makeGrid(lvl.rows, lvl.cols));
      setMinesPlaced(false);
      setStatus("ready");
      setSeconds(0);
    },
    [stopTimer]
  );

  const handleLevelChange = useCallback(
    (e) => {
      const key = e.target.value;
      setLevelKey(key);
      resetBoard(key);
    },
    [resetBoard]
  );

  const newGame = useCallback(() => resetBoard(levelKey), [resetBoard, levelKey]);

  const revealAll = useCallback((g) => {
    return g.map((row) => row.map((cell) => ({ ...cell, revealed: cell.mine ? true : cell.revealed })));
  }, []);

  const checkWin = useCallback(
    (g) => {
      const total = level.rows * level.cols;
      const revealed = countRevealed(g);
      return revealed === total - level.mines;
    },
    [level.rows, level.cols, level.mines]
  );

  const reveal = useCallback(
    (r, c) => {
      if (status === "won" || status === "lost") return;

      setGrid((prev) => {
        let working = prev;
        let firstMove = false;

        // First reveal generates mines (guaranteed safe first click).
        if (!minesPlaced) {
          working = placeMines(prev, level.rows, level.cols, level.mines, r, c);
          firstMove = true;
        }

        const cell = working[r][c];
        if (cell.revealed || cell.flagged) return prev;

        // Hit a mine -> lose.
        if (cell.mine) {
          const exploded = revealAll(working).map((row, ri) =>
            row.map((cc, ci) => (ri === r && ci === c ? { ...cc, revealed: true, exploded: true } : cc))
          );
          if (firstMove) setMinesPlaced(true);
          setStatus("lost");
          stopTimer();
          return exploded;
        }

        const afterReveal = revealFlood(working, level.rows, level.cols, r, c);

        if (firstMove) {
          setMinesPlaced(true);
          setStatus("playing");
          startTimer();
        }

        if (checkWin(afterReveal)) {
          setStatus("won");
          stopTimer();
          // Auto-flag remaining mines on win.
          return afterReveal.map((row) =>
            row.map((cc) => (cc.mine && !cc.flagged ? { ...cc, flagged: true } : cc))
          );
        }

        return afterReveal;
      });
    },
    [status, minesPlaced, level.rows, level.cols, level.mines, revealAll, checkWin, startTimer, stopTimer]
  );

  const toggleFlag = useCallback(
    (r, c) => {
      if (status === "won" || status === "lost") return;

      setGrid((prev) => {
        const cell = prev[r][c];
        if (cell.revealed) return prev;
        const next = prev.map((row) => row.map((cc) => ({ ...cc })));
        next[r][c].flagged = !next[r][c].flagged;
        return next;
      });
    },
    [status]
  );

  const handleCellClick = useCallback(
    (r, c) => {
      if (flagMode) {
        toggleFlag(r, c);
      } else {
        reveal(r, c);
      }
    },
    [flagMode, toggleFlag, reveal]
  );

  const handleContextMenu = useCallback(
    (e, r, c) => {
      e.preventDefault();
      toggleFlag(r, c);
    },
    [toggleFlag]
  );

  const flagsUsed = useMemo(() => countFlags(grid), [grid]);
  const minesRemaining = level.mines - flagsUsed;

  const statusMessage = useMemo(() => {
    if (status === "won") return "You cleared the board! 🎉";
    if (status === "lost") return "Boom! You hit a mine. 💥";
    if (status === "playing") return "Game in progress…";
    return "Click any cell to start. Your first click is always safe.";
  }, [status]);

  const finished = status === "won" || status === "lost";

  // Sizing: keep cells finger-friendly but fit intermediate boards.
  const cellSize = level.cols > 12 ? 30 : 34;
  const fontSize = level.cols > 12 ? 15 : 17;

  const boardBorder = "1px solid rgba(128,128,128,0.5)";

  function cellStyle(cell) {
    const base = {
      width: cellSize,
      height: cellSize,
      minWidth: cellSize,
      lineHeight: `${cellSize}px`,
      textAlign: "center",
      fontSize,
      fontWeight: 700,
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
      padding: 0,
      margin: 0,
      cursor: finished ? "default" : "pointer",
      userSelect: "none",
      boxSizing: "border-box",
      border: "1px solid rgba(128,128,128,0.35)",
      transition: "background 0.05s ease",
    };

    if (!cell.revealed) {
      return {
        ...base,
        background: "rgba(128,128,128,0.22)",
        boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.25), inset -1px -1px 0 rgba(0,0,0,0.18)",
        color: "currentColor",
      };
    }

    // Revealed cell.
    if (cell.mine) {
      return {
        ...base,
        background: cell.exploded ? "#e53935" : "rgba(128,128,128,0.12)",
        color: cell.exploded ? "#fff" : "currentColor",
      };
    }

    return {
      ...base,
      background: "rgba(128,128,128,0.08)",
      color: cell.adjacent ? NUMBER_COLORS[cell.adjacent] : "transparent",
    };
  }

  function cellContent(cell) {
    if (cell.flagged && !cell.revealed) return "🚩";
    if (!cell.revealed) return "";
    if (cell.mine) return "💣";
    if (cell.adjacent > 0) return String(cell.adjacent);
    return "";
  }

  function cellLabel(cell, r, c) {
    const pos = `Row ${r + 1}, column ${c + 1}`;
    if (cell.flagged && !cell.revealed) return `${pos}, flagged`;
    if (!cell.revealed) return `${pos}, hidden`;
    if (cell.mine) return `${pos}, mine`;
    if (cell.adjacent > 0) return `${pos}, ${cell.adjacent} adjacent mines`;
    return `${pos}, empty`;
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ms-difficulty">
              Difficulty
            </label>
            <select
              id="ms-difficulty"
              className="tool-select"
              value={levelKey}
              onChange={handleLevelChange}
            >
              {Object.entries(LEVELS).map(([key, lvl]) => (
                <option key={key} value={key}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{minesRemaining}</div>
          <div className="tool-stat-label">Mines Remaining</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{String(seconds).padStart(3, "0")}</div>
          <div className="tool-stat-label">Time (s)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {status === "won" ? "Win" : status === "lost" ? "Lost" : "Playing"}
          </div>
          <div className="tool-stat-label">Status</div>
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={newGame}>
          New Game
        </button>
        <button
          type="button"
          className={flagMode ? "btn btn-success" : "btn"}
          onClick={() => setFlagMode((f) => !f)}
          aria-pressed={flagMode}
          title="Toggle flag mode for touch devices"
        >
          {flagMode ? "Flag Mode: ON 🚩" : "Flag Mode: OFF"}
        </button>
      </div>

      <div
        className="tool-result"
        role="status"
        aria-live="polite"
        style={{ marginTop: 4 }}
      >
        <span className="tool-result-label">Status</span>
        <span className="tool-result-value">{statusMessage}</span>
      </div>

      <div
        style={{
          marginTop: 16,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          role="grid"
          aria-label="Minesweeper board"
          style={{
            display: "inline-block",
            border: boardBorder,
            borderRadius: 6,
            padding: 4,
            background: "rgba(128,128,128,0.06)",
            touchAction: "manipulation",
          }}
        >
          {grid.map((row, r) => (
            <div key={r} role="row" style={{ display: "flex" }}>
              {row.map((cell, c) => (
                <button
                  key={c}
                  type="button"
                  role="gridcell"
                  aria-label={cellLabel(cell, r, c)}
                  disabled={finished && !cell.mine && !cell.revealed}
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={(e) => handleContextMenu(e, r, c)}
                  style={cellStyle(cell)}
                >
                  {cellContent(cell)}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: 12 }}>
        Left-click (or tap) reveals a cell. Right-click toggles a flag, or turn on
        Flag Mode to flag by tapping. Numbers show how many mines touch that cell.
        The first click is always safe.
      </p>
    </div>
  );
}
