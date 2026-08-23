"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// Inline pool of common words. One is chosen at random per round — no network,
// no external word list. Kept to everyday words so the game stays winnable.
const WORDS = [
  "ANCHOR", "ANIMAL", "AUTUMN", "BASKET", "BEACON", "BOTTLE", "BRANCH",
  "BREEZE", "BRIDGE", "BUTTON", "CAMERA", "CANDLE", "CARPET", "CASTLE",
  "CHERRY", "CIRCLE", "CLOUDY", "COFFEE", "COMEDY", "COTTON", "CRAYON",
  "DINNER", "DOCTOR", "DRAGON", "ENGINE", "FABRIC", "FALCON", "FLOWER",
  "FOREST", "GARDEN", "GUITAR", "HAMMER", "HARBOR", "HELMET", "ISLAND",
  "JACKET", "JUNGLE", "KETTLE", "KITTEN", "LADDER", "LANTERN", "LEDGER",
  "LEMONS", "LETTER", "MARBLE", "MARKET", "MELODY", "MIRROR", "MONKEY",
  "MUFFIN", "NEEDLE", "ORANGE", "PALACE", "PANTRY", "PARROT", "PEBBLE",
  "PENCIL", "PEPPER", "PICKLE", "PIGEON", "PILLOW", "PLANET", "POCKET",
  "POTATO", "PUMPKIN", "PUZZLE", "RABBIT", "RIBBON", "RIVERS", "ROCKET",
  "SADDLE", "SALMON", "SANDAL", "SCHOOL", "SHOVEL", "SILVER", "SODIUM",
  "SPRING", "SQUARE", "STREAM", "SUGARS", "SUMMER", "SUNSET", "TEAPOT",
  "TICKET", "TIMBER", "TOMATO", "TUNNEL", "TURTLE", "VELVET", "VIOLET",
  "WAFFLE", "WALNUT", "WINDOW", "WINTER", "WIZARD", "YELLOW", "ZIPPER",
];

const MAX_WRONG = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Staged gallows drawn in plain text/emoji. Index 0 = no wrong guesses (empty
// gallows), index 6 = fully hanged (game over). Monospace keeps it aligned.
const STAGES = [
  "  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========",
];

// Small mood emoji echoing how close the round is to a loss.
const MOOD = ["😀", "🙂", "😐", "😟", "😧", "😨", "💀"];

export default function Hangman() {
  const [answer, setAnswer] = useState("");
  const [guessed, setGuessed] = useState([]); // uppercase letters, in order guessed
  const [status, setStatus] = useState("playing"); // playing | won | lost

  // Mirror state in a ref so the global key handler reads fresh values without
  // re-registering the listener on every keystroke.
  const gameRef = useRef({});

  const newWord = useCallback(() => {
    const pick = WORDS[Math.floor(Math.random() * WORDS.length)];
    setAnswer(pick);
    setGuessed([]);
    setStatus("playing");
  }, []);

  // Pick the secret word on the client only so server and first client render
  // agree (no hydration mismatch from Math.random).
  useEffect(() => {
    newWord();
  }, [newWord]);

  const uniqueLetters = useMemo(
    () => (answer ? Array.from(new Set(answer.split(""))) : []),
    [answer]
  );

  const wrongLetters = useMemo(
    () => guessed.filter((g) => answer && !answer.includes(g)),
    [guessed, answer]
  );

  const wrongCount = wrongLetters.length;
  const remaining = MAX_WRONG - wrongCount;

  const isWon =
    answer !== "" && uniqueLetters.every((l) => guessed.includes(l));
  const isLost = wrongCount >= MAX_WRONG;

  gameRef.current = { answer, guessed, status };

  const guessLetter = useCallback((letter) => {
    const g = gameRef.current;
    if (g.status !== "playing" || !g.answer) return;
    if (g.guessed.includes(letter)) return;
    setGuessed((prev) => (prev.includes(letter) ? prev : [...prev, letter]));
  }, []);

  // Resolve win/loss after each guess (derived from state, applied once).
  useEffect(() => {
    if (status !== "playing" || !answer) return;
    if (isWon) setStatus("won");
    else if (isLost) setStatus("lost");
  }, [isWon, isLost, status, answer]);

  // Physical keyboard support: A–Z guesses a letter.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (/^[a-zA-Z]$/.test(k)) {
        e.preventDefault();
        guessLetter(k.toUpperCase());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guessLetter]);

  const stageIndex = Math.min(wrongCount, MAX_WRONG);
  const guessedSet = useMemo(() => new Set(guessed), [guessed]);

  // Masked word: reveal guessed letters, blanks otherwise. When lost, reveal
  // the full word (with missed letters flagged) so the player sees the answer.
  const displayLetters = answer.split("").map((ch) => {
    const shown = guessedSet.has(ch) || status === "lost";
    return { ch, shown, missed: status === "lost" && !guessedSet.has(ch) };
  });

  const statusLabel =
    status === "won" ? "Won" : status === "lost" ? "Lost" : "Playing";

  return (
    <div className="tool">
      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={newWord}>
          New Word
        </button>
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">{Math.max(0, remaining)}</div>
          <div className="tool-stat-label">Guesses left</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{wrongCount}</div>
          <div className="tool-stat-label">Wrong guesses</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{statusLabel}</div>
          <div className="tool-stat-label">Status</div>
        </div>
      </div>

      {/* Gallows + mood */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(10px, 4vw, 28px)",
          margin: "16px auto 8px",
        }}
      >
        <pre
          className="tool-output"
          aria-label={`Hangman: ${wrongCount} of ${MAX_WRONG} wrong guesses`}
          style={{
            margin: 0,
            lineHeight: 1.15,
            fontSize: "clamp(12px, 3.4vw, 16px)",
            width: "auto",
            display: "inline-block",
          }}
        >
          {STAGES[stageIndex]}
        </pre>
        <div
          aria-hidden="true"
          style={{
            fontSize: "clamp(34px, 12vw, 56px)",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          {status === "won" ? "🎉" : MOOD[stageIndex]}
        </div>
      </div>

      {/* Masked word */}
      <div
        role="status"
        aria-label={
          status === "playing"
            ? `Word, ${answer.length} letters, ${guessed.length} guessed`
            : `Word was ${answer}`
        }
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(6px, 2.2vw, 12px)",
          justifyContent: "center",
          margin: "10px auto 4px",
          maxWidth: 520,
        }}
      >
        {displayLetters.map(({ ch, shown, missed }, i) => (
          <span
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "flex-end",
              justifyContent: "center",
              minWidth: "clamp(20px, 7vw, 30px)",
              fontSize: "clamp(22px, 8vw, 34px)",
              fontWeight: 700,
              lineHeight: 1.1,
              paddingBottom: 2,
              borderBottom: "3px solid rgba(128,128,128,0.6)",
              color: missed ? "#d14343" : "currentColor",
              userSelect: "none",
            }}
          >
            {shown ? ch : " "}
          </span>
        ))}
      </div>

      {/* Wrong-guess trail */}
      <p
        className="tool-note"
        style={{ textAlign: "center", minHeight: "1.2em", marginTop: 4 }}
      >
        {wrongLetters.length > 0 ? (
          <>
            Missed:{" "}
            <span style={{ letterSpacing: "0.14em", fontWeight: 600 }}>
              {wrongLetters.join(" ")}
            </span>
          </>
        ) : (
          "No wrong guesses yet."
        )}
      </p>

      {/* Win / loss banner */}
      {status !== "playing" && (
        <div className="tool-result" role="status" style={{ textAlign: "center" }}>
          <div className="tool-result-label">
            {status === "won" ? "You saved the day!" : "Out of guesses"}
          </div>
          <div className="tool-result-value" style={{ letterSpacing: "0.12em" }}>
            {answer}
          </div>
          <div className="tool-note" style={{ marginTop: 8 }}>
            {status === "won"
              ? `Solved with ${remaining} ${
                  remaining === 1 ? "guess" : "guesses"
                } to spare.`
              : "The word is shown above."}{" "}
            <button
              type="button"
              className="btn btn-success"
              onClick={newWord}
              style={{ marginLeft: 6 }}
            >
              Play again
            </button>
          </div>
        </div>
      )}

      {/* On-screen A–Z keyboard */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(38px, 1fr))",
          gap: 6,
          maxWidth: 460,
          margin: "18px auto 0",
        }}
      >
        {ALPHABET.map((letter) => {
          const isGuessed = guessedSet.has(letter);
          const isWrong = isGuessed && answer && !answer.includes(letter);
          const isRight = isGuessed && answer && answer.includes(letter);
          const disabled = isGuessed || status !== "playing";
          let bg = "rgba(128,128,128,0.18)";
          let color = "currentColor";
          let border = "1px solid rgba(128,128,128,0.35)";
          if (isRight) {
            bg = "#6aaa64";
            color = "#ffffff";
            border = "1px solid #6aaa64";
          } else if (isWrong) {
            bg = "#b23b3b";
            color = "#ffffff";
            border = "1px solid #b23b3b";
          }
          return (
            <button
              key={letter}
              type="button"
              onClick={() => guessLetter(letter)}
              disabled={disabled}
              aria-label={
                isRight
                  ? `${letter}, correct`
                  : isWrong
                  ? `${letter}, wrong`
                  : letter
              }
              aria-pressed={isGuessed}
              style={{
                height: 44,
                minWidth: 0,
                padding: 0,
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 6,
                background: bg,
                color,
                border,
                cursor: disabled ? "default" : "pointer",
                opacity:
                  isGuessed && !isRight && !isWrong
                    ? 0.5
                    : status !== "playing" && !isGuessed
                    ? 0.55
                    : 1,
                transition: "background 120ms ease, opacity 120ms ease",
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>

      <p className="tool-note" style={{ marginTop: 14 }}>
        Guess the hidden word one letter at a time. Tap the on-screen letters or
        type on your keyboard. Each wrong letter adds a piece to the hangman —
        you have {MAX_WRONG} wrong guesses before the round is lost. Reveal every
        letter to win, then hit New Word for a fresh puzzle.
      </p>
    </div>
  );
}
