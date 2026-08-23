"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// All 8 winning lines as index triples on the flat 9-cell board.
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const EMPTY_BOARD = Array(9).fill(null);

// Returns { winner: "X"|"O", line: [i,j,k] } or null if no winner yet.
function getWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return null;
}

function isFull(board) {
  return board.every((cell) => cell !== null);
}

// Minimax with alpha-beta pruning. Returns a score from the perspective of
// `aiPlayer`: +10 (minus depth) for an AI win, -10 (plus depth) for a loss,
// 0 for a draw. Depth is used so the AI prefers faster wins / slower losses.
function minimax(board, current, aiPlayer, humanPlayer, depth, alpha, beta) {
  const result = getWinner(board);
  if (result) {
    return result.winner === aiPlayer ? 10 - depth : depth - 10;
  }
  if (isFull(board)) return 0;

  const isAiTurn = current === aiPlayer;
  let best = isAiTurn ? -Infinity : Infinity;

  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    board[i] = current;
    const score = minimax(
      board,
      current === "X" ? "O" : "X",
      aiPlayer,
      humanPlayer,
      depth + 1,
      alpha,
      beta
    );
    board[i] = null;

    if (isAiTurn) {
      if (score > best) best = score;
      if (best > alpha) alpha = best;
    } else {
      if (score < best) best = score;
      if (best < beta) beta = best;
    }
    if (beta <= alpha) break; // prune
  }
  return best;
}

// Picks the optimal move index for aiPlayer on the given board.
function bestMove(board, aiPlayer) {
  const humanPlayer = aiPlayer === "X" ? "O" : "X";
  let move = -1;
  let bestScore = -Infinity;

  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    board[i] = aiPlayer;
    const score = minimax(
      board,
      humanPlayer,
      aiPlayer,
      humanPlayer,
      0,
      -Infinity,
      Infinity
    );
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      move = i;
    }
  }
  return move;
}

export default function TicTacToe() {
  // "2p" = two players share the device; "cpu" = play the unbeatable AI.
  const [mode, setMode] = useState("cpu");
  // In CPU mode, which mark the human plays.
  const [humanMark, setHumanMark] = useState("X");

  const [board, setBoard] = useState(EMPTY_BOARD);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [thinking, setThinking] = useState(false);

  const result = useMemo(() => getWinner(board), [board]);
  const winner = result ? result.winner : null;
  const winningLine = result ? result.line : null;
  const draw = !winner && isFull(board);
  const gameOver = Boolean(winner) || draw;

  const aiMark = humanMark === "X" ? "O" : "X";
  // X always moves first, so whose turn it is follows from the filled-cell count.
  const filledCount = useMemo(
    () => board.reduce((n, cell) => (cell ? n + 1 : n), 0),
    [board]
  );
  const currentMark = filledCount % 2 === 0 ? "X" : "O";

  // Record the outcome once per finished round.
  useEffect(() => {
    if (winner) {
      setScores((s) => ({ ...s, [winner]: s[winner] + 1 }));
    } else if (draw) {
      setScores((s) => ({ ...s, draws: s.draws + 1 }));
    }
    // Only re-run when the board reaches a terminal state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  const placeMark = useCallback((index, mark) => {
    setBoard((prev) => {
      if (index < 0 || prev[index] !== null || getWinner(prev)) return prev;
      const next = prev.slice();
      next[index] = mark;
      return next;
    });
  }, []);

  // Drive the AI move whenever it is the computer's turn in CPU mode.
  useEffect(() => {
    if (mode !== "cpu" || gameOver) return;
    if (currentMark !== aiMark) return;

    setThinking(true);
    const boardSnapshot = board.slice();
    const timer = setTimeout(() => {
      const move = bestMove(boardSnapshot, aiMark);
      if (move >= 0) placeMark(move, aiMark);
      setThinking(false);
    }, 350); // small delay so the move feels natural

    return () => {
      clearTimeout(timer);
      setThinking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentMark, aiMark, gameOver, board]);

  const handleCellClick = useCallback(
    (index) => {
      if (gameOver || board[index] !== null) return;
      // In CPU mode, block clicks while it is the computer's turn.
      if (mode === "cpu" && (thinking || currentMark !== humanMark)) return;
      placeMark(index, currentMark);
    },
    [gameOver, board, mode, thinking, currentMark, humanMark, placeMark]
  );

  const newGame = useCallback(() => {
    setBoard(EMPTY_BOARD);
    setThinking(false);
  }, []);

  const resetScores = useCallback(() => {
    setScores({ X: 0, O: 0, draws: 0 });
  }, []);

  const handleModeChange = useCallback((e) => {
    setMode(e.target.value);
    setBoard(EMPTY_BOARD);
    setThinking(false);
  }, []);

  const handleMarkChange = useCallback((e) => {
    setHumanMark(e.target.value);
    setBoard(EMPTY_BOARD);
    setThinking(false);
  }, []);

  const statusMessage = useMemo(() => {
    if (winner) {
      if (mode === "cpu") {
        return winner === humanMark ? "You win! 🎉" : "Computer wins.";
      }
      return `Player ${winner} wins! 🎉`;
    }
    if (draw) return "It's a draw.";
    if (mode === "cpu") {
      if (thinking || currentMark === aiMark) return "Computer is thinking…";
      return "Your turn.";
    }
    return `Player ${currentMark}'s turn.`;
  }, [winner, draw, mode, humanMark, thinking, currentMark, aiMark]);

  // ----- styles (inline, theme-neutral, dark-mode safe) -----
  const markColors = { X: "#2f7de1", O: "#e0603a" };

  function cellStyle(index) {
    const isWinning = winningLine && winningLine.includes(index);
    const filled = board[index] !== null;
    const interactive =
      !gameOver &&
      !filled &&
      !(mode === "cpu" && (thinking || currentMark !== humanMark));
    return {
      width: "100%",
      aspectRatio: "1 / 1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "clamp(38px, 12vw, 64px)",
      fontWeight: 800,
      lineHeight: 1,
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      color: board[index] ? markColors[board[index]] : "currentColor",
      background: isWinning
        ? "rgba(76, 175, 80, 0.22)"
        : "rgba(128,128,128,0.08)",
      border: "1px solid rgba(128,128,128,0.4)",
      borderRadius: 10,
      cursor: interactive ? "pointer" : "default",
      userSelect: "none",
      padding: 0,
      transition: "background 0.12s ease, transform 0.05s ease",
      boxShadow: isWinning
        ? "inset 0 0 0 2px rgba(76,175,80,0.55)"
        : "none",
      touchAction: "manipulation",
    };
  }

  const cellLabel = (index) => {
    const pos = `Cell ${index + 1}`;
    if (board[index]) return `${pos}, ${board[index]}`;
    return `${pos}, empty`;
  };

  const xLabel = mode === "cpu" ? (humanMark === "X" ? "X (You)" : "X (CPU)") : "X";
  const oLabel = mode === "cpu" ? (humanMark === "O" ? "O (You)" : "O (CPU)") : "O";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ttt-mode">
              Mode
            </label>
            <select
              id="ttt-mode"
              className="tool-select"
              value={mode}
              onChange={handleModeChange}
            >
              <option value="cpu">1 Player (vs Computer)</option>
              <option value="2p">2 Players</option>
            </select>
          </div>

          {mode === "cpu" && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="ttt-mark">
                You play as
              </label>
              <select
                id="ttt-mark"
                className="tool-select"
                value={humanMark}
                onChange={handleMarkChange}
              >
                <option value="X">X (go first)</option>
                <option value="O">O (go second)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num" style={{ color: markColors.X }}>
            {scores.X}
          </div>
          <div className="tool-stat-label">{xLabel}</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{scores.draws}</div>
          <div className="tool-stat-label">Draws</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num" style={{ color: markColors.O }}>
            {scores.O}
          </div>
          <div className="tool-stat-label">{oLabel}</div>
        </div>
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
        role="grid"
        aria-label="Tic-tac-toe board"
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          maxWidth: 360,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {board.map((cell, index) => (
          <button
            key={index}
            type="button"
            role="gridcell"
            aria-label={cellLabel(index)}
            onClick={() => handleCellClick(index)}
            style={cellStyle(index)}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className="tool-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={newGame}>
          New Game
        </button>
        <button type="button" className="btn" onClick={resetScores}>
          Reset Scores
        </button>
      </div>

      <p className="tool-note" style={{ marginTop: 12 }}>
        X always moves first. In 1-player mode the computer uses the minimax
        algorithm, so the best you can do is force a draw — it never loses. The
        scoreboard keeps a running tally across rounds until you reset it.
      </p>
    </div>
  );
}
