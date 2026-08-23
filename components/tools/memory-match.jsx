"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Grid presets. Card count (cols * rows) must be even so every card gets a pair.
const LEVELS = {
  easy: { label: "Easy (4×4)", cols: 4, rows: 4 },
  medium: { label: "Medium (6×4)", cols: 6, rows: 4 },
  hard: { label: "Hard (6×6)", cols: 6, rows: 6 },
};

// Emoji pool — needs at least (maxCards / 2) distinct symbols. Hard is 18 pairs.
const EMOJI = [
  "🍎", "🍌", "🍇", "🍉", "🍓", "🍒", "🍑", "🥝",
  "🐶", "🐱", "🦊", "🐼", "🐸", "🐵", "🦁", "🐧",
  "⚽", "🏀", "🎾", "🎲", "🎸", "🎺", "🚀", "⛵",
  "🌵", "🌸", "🍄", "⭐", "🌙", "🔥", "❄️", "🍀",
  "🎈", "🎁", "💎", "🔔",
];

// Fisher–Yates shuffle using crypto when available for a fair deal.
function randInt(max) {
  if (max <= 0) return 0;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a shuffled deck of {id, pairId, emoji} for the given level.
function makeDeck(level) {
  const total = level.cols * level.rows;
  const pairs = Math.floor(total / 2);
  const chosen = shuffle(EMOJI).slice(0, pairs);
  const cards = [];
  chosen.forEach((emoji, pairId) => {
    cards.push({ id: pairId * 2, pairId, emoji });
    cards.push({ id: pairId * 2 + 1, pairId, emoji });
  });
  return shuffle(cards);
}

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export default function MemoryMatch() {
  const [levelKey, setLevelKey] = useState("easy");
  const level = LEVELS[levelKey] || LEVELS.easy;

  const [deck, setDeck] = useState(() => makeDeck(LEVELS.easy));
  // Indices (positions in `deck`) currently flipped face-up, awaiting evaluation.
  const [flipped, setFlipped] = useState([]);
  // Indices that have been permanently matched (stay face-up).
  const [matched, setMatched] = useState(() => new Set());
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState("ready"); // ready | playing | won
  const [locked, setLocked] = useState(false); // true while a mismatched pair is showing

  const timerRef = useRef(null);
  const flipTimeoutRef = useRef(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setSeconds((s) => (s >= 5999 ? 5999 : s + 1));
    }, 1000);
  }, []);

  const clearFlipTimeout = useCallback(() => {
    if (flipTimeoutRef.current) {
      clearTimeout(flipTimeoutRef.current);
      flipTimeoutRef.current = null;
    }
  }, []);

  // Clean up any pending timers on unmount.
  useEffect(
    () => () => {
      stopTimer();
      clearFlipTimeout();
    },
    [stopTimer, clearFlipTimeout]
  );

  const resetGame = useCallback(
    (key) => {
      const lvl = LEVELS[key] || LEVELS.easy;
      stopTimer();
      clearFlipTimeout();
      setDeck(makeDeck(lvl));
      setFlipped([]);
      setMatched(new Set());
      setMoves(0);
      setSeconds(0);
      setStatus("ready");
      setLocked(false);
    },
    [stopTimer, clearFlipTimeout]
  );

  const handleLevelChange = useCallback(
    (e) => {
      const key = e.target.value;
      setLevelKey(key);
      resetGame(key);
    },
    [resetGame]
  );

  const newGame = useCallback(() => resetGame(levelKey), [resetGame, levelKey]);

  const totalPairs = Math.floor((level.cols * level.rows) / 2);
  const matchedPairs = Math.floor(matched.size / 2);

  const handleCardClick = useCallback(
    (index) => {
      if (status === "won" || locked) return;
      if (matched.has(index)) return; // already solved
      if (flipped.includes(index)) return; // already face-up and waiting

      // Start the clock on the very first flip.
      if (status === "ready") {
        setStatus("playing");
        startTimer();
      }

      const next = [...flipped, index];
      setFlipped(next);

      if (next.length < 2) return;

      // Two cards are up — evaluate the pair.
      setMoves((m) => m + 1);
      const [a, b] = next;

      if (deck[a].pairId === deck[b].pairId) {
        // Match: lock them in, briefly, so both cards register before settling.
        setLocked(true);
        clearFlipTimeout();
        flipTimeoutRef.current = setTimeout(() => {
          setMatched((prev) => {
            const updated = new Set(prev);
            updated.add(a);
            updated.add(b);
            if (updated.size >= deck.length) {
              setStatus("won");
              stopTimer();
            }
            return updated;
          });
          setFlipped([]);
          setLocked(false);
          flipTimeoutRef.current = null;
        }, 380);
      } else {
        // Mismatch: keep both visible briefly, then flip back.
        setLocked(true);
        clearFlipTimeout();
        flipTimeoutRef.current = setTimeout(() => {
          setFlipped([]);
          setLocked(false);
          flipTimeoutRef.current = null;
        }, 850);
      }
    },
    [status, locked, matched, flipped, deck, startTimer, stopTimer, clearFlipTimeout]
  );

  const isFaceUp = useCallback(
    (index) => flipped.includes(index) || matched.has(index),
    [flipped, matched]
  );

  const statusMessage = useMemo(() => {
    if (status === "won") {
      return `Solved in ${moves} moves and ${formatTime(seconds)}. 🎉`;
    }
    if (status === "playing") return "Find every matching pair.";
    return "Flip two cards to begin. Match all the pairs to win.";
  }, [status, moves, seconds]);

  // Keep the board tidy: width scales with column count but stays capped.
  const boardMaxWidth = Math.min(level.cols * 84, 540);

  function cardFaceStyle(index) {
    const faceUp = isFaceUp(index);
    const isMatched = matched.has(index);
    return {
      position: "relative",
      width: "100%",
      aspectRatio: "1 / 1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxSizing: "border-box",
      padding: 0,
      margin: 0,
      borderRadius: 10,
      border: "1px solid rgba(128,128,128,0.4)",
      cursor:
        status === "won" || isMatched || locked ? "default" : "pointer",
      userSelect: "none",
      fontSize: "clamp(20px, 7vw, 34px)",
      lineHeight: 1,
      transition: "background 0.15s ease, transform 0.12s ease, opacity 0.2s ease",
      background: faceUp
        ? isMatched
          ? "rgba(76,175,80,0.18)"
          : "rgba(128,128,128,0.16)"
        : "rgba(128,128,128,0.28)",
      boxShadow: faceUp
        ? "none"
        : "inset 1px 1px 0 rgba(255,255,255,0.18), inset -1px -1px 0 rgba(0,0,0,0.15)",
      color: "currentColor",
      opacity: isMatched ? 0.85 : 1,
      touchAction: "manipulation",
    };
  }

  function cardLabel(index) {
    const pos = `Card ${index + 1}`;
    if (matched.has(index)) return `${pos}, matched ${deck[index].emoji}`;
    if (flipped.includes(index)) return `${pos}, showing ${deck[index].emoji}`;
    return `${pos}, face down`;
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="mm-difficulty">
              Difficulty
            </label>
            <select
              id="mm-difficulty"
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
          <div className="tool-stat-num">{moves}</div>
          <div className="tool-stat-label">Moves</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{formatTime(seconds)}</div>
          <div className="tool-stat-label">Time</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {matchedPairs}/{totalPairs}
          </div>
          <div className="tool-stat-label">Pairs Found</div>
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={newGame}>
          New Game
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

      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <div
          role="grid"
          aria-label="Memory match board"
          style={{
            width: "100%",
            maxWidth: boardMaxWidth,
            display: "grid",
            gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))`,
            gap: 8,
          }}
        >
          {deck.map((card, index) => {
            const faceUp = isFaceUp(index);
            return (
              <button
                key={card.id}
                type="button"
                role="gridcell"
                aria-label={cardLabel(index)}
                aria-pressed={faceUp}
                disabled={status === "won" || matched.has(index)}
                onClick={() => handleCardClick(index)}
                style={cardFaceStyle(index)}
              >
                <span aria-hidden="true">{faceUp ? card.emoji : "❓"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: 12 }}>
        Flip two cards to compare them. Matching pairs stay face up; mismatches
        flip back after a moment. Clear the whole board in as few moves as you
        can. Everything runs in your browser — nothing is uploaded.
      </p>
    </div>
  );
}
