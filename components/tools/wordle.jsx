"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// Inline pool of common 5-letter words. One is chosen at random as the secret
// answer each game — no network, no external word list.
const WORDS = [
  "APPLE", "BEACH", "BRAIN", "BREAD", "BRICK", "BROWN", "CHAIR", "CHARM",
  "CHEST", "CHILD", "CLEAN", "CLICK", "CLIFF", "CLOCK", "CLOUD", "COAST",
  "CRANE", "CRISP", "CROWN", "DANCE", "DIARY", "DREAM", "DRESS", "DRINK",
  "DRIVE", "EAGLE", "EARTH", "EIGHT", "EMPTY", "EQUAL", "EXTRA", "FAITH",
  "FANCY", "FIELD", "FIGHT", "FLAME", "FLASH", "FLOOR", "FLOUR", "FOCUS",
  "FRAME", "FRESH", "FRONT", "FRUIT", "FUNNY", "GHOST", "GIANT", "GLASS",
  "GLOVE", "GRACE", "GRAND", "GRAPE", "GRASS", "GREAT", "GREEN", "GUARD",
  "HAPPY", "HEART", "HEAVY", "HONEY", "HORSE", "HOTEL", "HOUSE", "HUMAN",
  "IMAGE", "INDEX", "JUICE", "KNIFE", "LARGE", "LAUGH", "LAYER", "LEARN",
  "LEMON", "LEVEL", "LIGHT", "LUCKY", "LUNCH", "MAGIC", "MAPLE", "MARCH",
  "MONEY", "MONTH", "MOTOR", "MOUNT", "MOUSE", "MOUTH", "MUSIC", "NIGHT",
  "NOISE", "NORTH", "NURSE", "OCEAN", "OFFER", "ORDER", "PAINT", "PANEL",
  "PAPER", "PARTY", "PEACE", "PEACH", "PHONE", "PHOTO", "PIANO", "PILOT",
  "PIZZA", "PLACE", "PLANT", "PLATE", "POINT", "POUND", "POWER", "PRESS",
  "PRICE", "PRIDE", "PRIZE", "PROUD", "QUEEN", "QUICK", "QUIET", "QUILT",
  "QUOTE", "RADIO", "RANGE", "RIVER", "ROBOT", "ROUND", "ROYAL", "SCALE",
  "SCENE", "SCORE", "SHADE", "SHARK", "SHARP", "SHEEP", "SHEET", "SHELF",
  "SHINE", "SHIRT", "SHOCK", "SHORE", "SHORT", "SIGHT", "SILLY", "SIXTY",
  "SKILL", "SLEEP", "SLIDE", "SMART", "SMILE", "SMOKE", "SNAKE", "SOLID",
  "SOUND", "SOUTH", "SPACE", "SPARK", "SPEAK", "SPEND", "SPICE", "SPORT",
  "STAGE", "STAIR", "STAMP", "STAND", "START", "STEAM", "STEEL", "STICK",
  "STONE", "STORE", "STORM", "STORY", "STOVE", "STYLE", "SUGAR", "SUNNY",
  "SWEET", "TABLE", "TASTE", "TEACH", "THANK", "THEME", "THICK", "THINK",
  "THREE", "THROW", "TIGER", "TIGHT", "TITLE", "TODAY", "TOOTH", "TORCH",
  "TOUCH", "TOWER", "TRACK", "TRADE", "TRAIN", "TREAT", "TREND", "TRIBE",
  "TRICK", "TRUCK", "TRUST", "TRUTH", "TWICE", "UNCLE", "UNITY", "VALUE",
  "VIDEO", "VOICE", "WATCH", "WATER", "WHEAT", "WHEEL", "WHERE", "WHICH",
  "WHITE", "WHOLE", "WOMAN", "WORLD", "WORTH", "WOUND", "WRIST", "WRONG",
  "YOUNG", "YOUTH", "ZEBRA",
];

const ROWS = 6;
const COLS = 5;

// Colors for each letter state. Solid backgrounds + white text so tiles stay
// readable on both light and dark app themes.
const STATE_STYLE = {
  correct: { bg: "#6aaa64", color: "#ffffff", border: "#6aaa64" },
  present: { bg: "#c9b458", color: "#ffffff", border: "#c9b458" },
  absent: { bg: "#787c7e", color: "#ffffff", border: "#787c7e" },
};
const RANK = { absent: 1, present: 2, correct: 3 };

// Score a guess against the answer with correct duplicate handling: mark exact
// matches (green) first, decrementing available letter counts, then mark
// remaining letters that still exist elsewhere (yellow) only up to what's left.
function scoreGuess(guess, answer) {
  const result = new Array(COLS).fill("absent");
  const counts = {};
  for (const ch of answer) counts[ch] = (counts[ch] || 0) + 1;
  for (let i = 0; i < COLS; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      counts[guess[i]]--;
    }
  }
  for (let i = 0; i < COLS; i++) {
    if (result[i] === "correct") continue;
    const ch = guess[i];
    if (counts[ch] > 0) {
      result[i] = "present";
      counts[ch]--;
    }
  }
  return result;
}

const KEY_ROWS = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  ["ENTER", ..."ZXCVBNM".split(""), "DEL"],
];

export default function Wordle() {
  const [answer, setAnswer] = useState("");
  const [rows, setRows] = useState([]); // [{ guess, result }]
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState("playing"); // playing | won | lost
  const [error, setError] = useState("");

  // Mirror state into a ref so the global key handler always reads fresh values
  // without re-registering the listener on every keystroke.
  const gameRef = useRef({});
  gameRef.current = { answer, rows, current, status };

  const newGame = useCallback(() => {
    const pick = WORDS[Math.floor(Math.random() * WORDS.length)];
    setAnswer(pick);
    setRows([]);
    setCurrent("");
    setStatus("playing");
    setError("");
  }, []);

  // Choose the secret word on the client only, so the server render and first
  // client render agree (no hydration mismatch from Math.random).
  useEffect(() => {
    newGame();
  }, [newGame]);

  const doChar = useCallback((ch) => {
    const g = gameRef.current;
    if (g.status !== "playing" || !g.answer) return;
    setError("");
    setCurrent((c) => (c.length < COLS ? c + ch : c));
  }, []);

  const doBackspace = useCallback(() => {
    if (gameRef.current.status !== "playing") return;
    setError("");
    setCurrent((c) => c.slice(0, -1));
  }, []);

  const doEnter = useCallback(() => {
    const g = gameRef.current;
    if (g.status !== "playing" || !g.answer) return;
    if (g.current.length !== COLS) {
      setError("Enter all 5 letters.");
      return;
    }
    const result = scoreGuess(g.current, g.answer);
    const nextRows = [...g.rows, { guess: g.current, result }];
    setRows(nextRows);
    setCurrent("");
    setError("");
    if (g.current === g.answer) setStatus("won");
    else if (nextRows.length >= ROWS) setStatus("lost");
  }, []);

  // Physical keyboard support.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "Enter") {
        e.preventDefault();
        doEnter();
      } else if (k === "Backspace") {
        e.preventDefault();
        doBackspace();
      } else if (/^[a-zA-Z]$/.test(k)) {
        e.preventDefault();
        doChar(k.toUpperCase());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doChar, doBackspace, doEnter]);

  // Best-known state for each typed letter, for coloring the on-screen keyboard.
  const letterStatus = useMemo(() => {
    const m = {};
    for (const { guess, result } of rows) {
      for (let i = 0; i < COLS; i++) {
        const ch = guess[i];
        const s = result[i];
        if (!m[ch] || RANK[s] > RANK[m[ch]]) m[ch] = s;
      }
    }
    return m;
  }, [rows]);

  const guessesUsed = rows.length;

  const onKeyClick = (key) => {
    if (key === "ENTER") doEnter();
    else if (key === "DEL") doBackspace();
    else doChar(key);
  };

  // Build the 6x5 board. Submitted rows carry their scored colors; the active
  // row shows the in-progress guess; the rest are blank.
  const board = [];
  for (let r = 0; r < ROWS; r++) {
    let letters = ["", "", "", "", ""];
    let result = [null, null, null, null, null];
    let active = false;
    if (r < rows.length) {
      letters = rows[r].guess.split("");
      result = rows[r].result;
    } else if (r === rows.length && status === "playing") {
      active = true;
      const padded = current.padEnd(COLS, " ").split("");
      letters = padded.map((c) => (c === " " ? "" : c));
    }
    board.push({ letters, result, active });
  }

  return (
    <div className="tool">
      <style>{`
        @keyframes eb-wordle-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={newGame}>
          New Game
        </button>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{guessesUsed}</div>
          <div className="tool-stat-label">Guesses used</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{ROWS - guessesUsed}</div>
          <div className="tool-stat-label">Guesses left</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {status === "won" ? "Won" : status === "lost" ? "Lost" : "Playing"}
          </div>
          <div className="tool-stat-label">Status</div>
        </div>
      </div>

      {/* Board */}
      <div
        role="grid"
        aria-label="Wordle board"
        style={{
          display: "grid",
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: "clamp(4px, 1.6vw, 7px)",
          width: "min(100%, 340px)",
          margin: "18px auto",
        }}
      >
        {board.map((row, r) => (
          <div
            key={r}
            role="row"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gap: "clamp(4px, 1.6vw, 7px)",
            }}
          >
            {row.letters.map((ch, c) => {
              const st = row.result[c] ? STATE_STYLE[row.result[c]] : null;
              const filled = ch !== "";
              const win = status === "won" && r === rows.length - 1;
              return (
                <div
                  key={c}
                  role="gridcell"
                  aria-label={
                    row.result[c]
                      ? `${ch}, ${row.result[c]}`
                      : ch
                      ? ch
                      : "empty"
                  }
                  style={{
                    aspectRatio: "1 / 1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "clamp(20px, 7vw, 30px)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    lineHeight: 1,
                    userSelect: "none",
                    borderRadius: 4,
                    background: st ? st.bg : "transparent",
                    color: st ? st.color : "currentColor",
                    border: st
                      ? `2px solid ${st.border}`
                      : filled
                      ? "2px solid rgba(128,128,128,0.75)"
                      : "2px solid rgba(128,128,128,0.35)",
                    transition: "background 120ms ease, border-color 120ms ease",
                    animation:
                      win && st
                        ? `eb-wordle-pop 420ms ease ${c * 90}ms both`
                        : "none",
                  }}
                >
                  {ch}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {error && (
        <div className="tool-error" role="alert" style={{ textAlign: "center" }}>
          {error}
        </div>
      )}

      {/* Win / loss banner */}
      {status !== "playing" && (
        <div
          className="tool-result"
          role="status"
          style={{ textAlign: "center" }}
        >
          <div className="tool-result-label">
            {status === "won" ? "You got it!" : "Out of guesses"}
          </div>
          <div className="tool-result-value" style={{ letterSpacing: "0.12em" }}>
            {answer}
          </div>
          <div className="tool-note" style={{ marginTop: 8 }}>
            {status === "won"
              ? `Solved in ${guessesUsed} ${guessesUsed === 1 ? "guess" : "guesses"}.`
              : "The word is shown above."}{" "}
            <button
              type="button"
              className="btn btn-success"
              onClick={newGame}
              style={{ marginLeft: 6 }}
            >
              Play again
            </button>
          </div>
        </div>
      )}

      {/* On-screen keyboard */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          marginTop: 16,
        }}
      >
        {KEY_ROWS.map((keyRow, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 5,
              justifyContent: "center",
              width: "100%",
              maxWidth: 420,
            }}
          >
            {keyRow.map((key) => {
              const wide = key === "ENTER" || key === "DEL";
              const st = letterStatus[key] ? STATE_STYLE[letterStatus[key]] : null;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onKeyClick(key)}
                  aria-label={
                    key === "DEL" ? "Delete" : key === "ENTER" ? "Enter" : key
                  }
                  disabled={status !== "playing"}
                  style={{
                    flex: wide ? "1.5 1 0" : "1 1 0",
                    minWidth: 0,
                    height: 48,
                    padding: 0,
                    fontSize: wide ? 12 : 15,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    cursor: status === "playing" ? "pointer" : "default",
                    borderRadius: 5,
                    border: "1px solid rgba(128,128,128,0.35)",
                    background: st ? st.bg : "rgba(128,128,128,0.18)",
                    color: st ? st.color : "currentColor",
                    opacity: status !== "playing" ? 0.6 : 1,
                    transition: "background 120ms ease",
                  }}
                >
                  {key === "DEL" ? "⌫" : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="tool-note" style={{ marginTop: 14 }}>
        Guess the hidden 5-letter word in six tries. Type with your keyboard or
        the on-screen keys and press Enter. Green means the letter is in the right
        spot, yellow means it is in the word but somewhere else, and grey means it
        is not in the word.
      </p>
    </div>
  );
}
