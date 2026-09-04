"use client";

import { useCallback, useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const TWO_32 = 0x100000000; // 2^32

// Cryptographically strong integer in [0, max) using rejection sampling to
// avoid modulo bias. Returns 0 when the range is empty.
function randInt(max) {
  if (max <= 0) return 0;
  const b = new Uint32Array(1);
  const lim = Math.floor(TWO_32 / max) * max;
  let v;
  do {
    crypto.getRandomValues(b);
    v = b[0];
  } while (v >= lim);
  return v % max;
}

// Fisher-Yates shuffle built on randInt.
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

// Each entry: { text, level } where level is 1 (Easy), 2 (Medium), 3 (Hard).
const LIBRARY = {
  Movies: [
    { text: "The Lion King", level: 1 },
    { text: "Toy Story", level: 1 },
    { text: "Finding Nemo", level: 1 },
    { text: "Frozen", level: 1 },
    { text: "Jurassic Park", level: 1 },
    { text: "E.T.", level: 1 },
    { text: "Star Wars", level: 1 },
    { text: "The Wizard of Oz", level: 1 },
    { text: "Home Alone", level: 1 },
    { text: "Jaws", level: 2 },
    { text: "Ghostbusters", level: 2 },
    { text: "The Karate Kid", level: 2 },
    { text: "Back to the Future", level: 2 },
    { text: "Cars", level: 1 },
    { text: "Shrek", level: 1 },
    { text: "Ratatouille", level: 2 },
    { text: "Up", level: 2 },
    { text: "The Incredibles", level: 2 },
    { text: "Kung Fu Panda", level: 2 },
    { text: "Peter Pan", level: 1 },
    { text: "Mary Poppins", level: 2 },
    { text: "Willy Wonka", level: 2 },
    { text: "The Sound of Music", level: 3 },
    { text: "Beauty and the Beast", level: 2 },
    { text: "The Jungle Book", level: 2 },
    { text: "Moana", level: 1 },
    { text: "Aladdin", level: 1 },
    { text: "The Little Mermaid", level: 2 },
    { text: "Despicable Me", level: 1 },
    { text: "Madagascar", level: 2 },
    { text: "Ice Age", level: 2 },
    { text: "The Sandlot", level: 3 },
    { text: "Charlotte's Web", level: 2 },
    { text: "Willow", level: 3 },
    { text: "The Goonies", level: 3 },
    { text: "Zootopia", level: 2 },
  ],
  Animals: [
    { text: "Elephant", level: 1 },
    { text: "Kangaroo", level: 1 },
    { text: "Penguin", level: 1 },
    { text: "Monkey", level: 1 },
    { text: "Giraffe", level: 1 },
    { text: "Snake", level: 1 },
    { text: "Frog", level: 1 },
    { text: "Rabbit", level: 1 },
    { text: "Chicken", level: 1 },
    { text: "Horse", level: 1 },
    { text: "Crab", level: 2 },
    { text: "Octopus", level: 2 },
    { text: "Butterfly", level: 2 },
    { text: "Bee", level: 1 },
    { text: "Owl", level: 2 },
    { text: "Gorilla", level: 1 },
    { text: "Dolphin", level: 2 },
    { text: "Shark", level: 1 },
    { text: "Turtle", level: 1 },
    { text: "Spider", level: 2 },
    { text: "Cheetah", level: 2 },
    { text: "Flamingo", level: 2 },
    { text: "Peacock", level: 2 },
    { text: "Woodpecker", level: 3 },
    { text: "Chameleon", level: 3 },
    { text: "Seahorse", level: 3 },
    { text: "Ostrich", level: 2 },
    { text: "Hedgehog", level: 3 },
    { text: "Sloth", level: 3 },
    { text: "Meerkat", level: 3 },
    { text: "Walrus", level: 2 },
    { text: "Koala", level: 1 },
    { text: "Duck", level: 1 },
    { text: "Camel", level: 2 },
  ],
  Actions: [
    { text: "Swimming", level: 1 },
    { text: "Dancing", level: 1 },
    { text: "Sleeping", level: 1 },
    { text: "Cooking", level: 1 },
    { text: "Fishing", level: 1 },
    { text: "Brushing your teeth", level: 1 },
    { text: "Riding a bike", level: 1 },
    { text: "Jumping rope", level: 1 },
    { text: "Playing basketball", level: 1 },
    { text: "Reading a book", level: 1 },
    { text: "Tying your shoes", level: 2 },
    { text: "Washing dishes", level: 2 },
    { text: "Flying a kite", level: 2 },
    { text: "Building a sandcastle", level: 2 },
    { text: "Blowing out candles", level: 2 },
    { text: "Painting a wall", level: 2 },
    { text: "Vacuuming the floor", level: 2 },
    { text: "Playing the piano", level: 2 },
    { text: "Climbing a ladder", level: 2 },
    { text: "Juggling", level: 2 },
    { text: "Skateboarding", level: 2 },
    { text: "Roller skating", level: 2 },
    { text: "Milking a cow", level: 3 },
    { text: "Rowing a boat", level: 2 },
    { text: "Chopping wood", level: 3 },
    { text: "Conducting an orchestra", level: 3 },
    { text: "Doing yoga", level: 3 },
    { text: "Ice skating", level: 2 },
    { text: "Shooting an arrow", level: 3 },
    { text: "Planting a tree", level: 3 },
    { text: "Folding laundry", level: 3 },
    { text: "Playing hopscotch", level: 3 },
  ],
  Jobs: [
    { text: "Firefighter", level: 1 },
    { text: "Doctor", level: 1 },
    { text: "Teacher", level: 1 },
    { text: "Chef", level: 1 },
    { text: "Police officer", level: 1 },
    { text: "Farmer", level: 1 },
    { text: "Astronaut", level: 1 },
    { text: "Pilot", level: 1 },
    { text: "Dentist", level: 2 },
    { text: "Painter", level: 1 },
    { text: "Waiter", level: 2 },
    { text: "Barber", level: 2 },
    { text: "Mail carrier", level: 2 },
    { text: "Lifeguard", level: 2 },
    { text: "Magician", level: 2 },
    { text: "Clown", level: 1 },
    { text: "Photographer", level: 2 },
    { text: "Scientist", level: 2 },
    { text: "Nurse", level: 2 },
    { text: "Carpenter", level: 3 },
    { text: "Referee", level: 2 },
    { text: "Librarian", level: 3 },
    { text: "Gardener", level: 2 },
    { text: "Plumber", level: 3 },
    { text: "Electrician", level: 3 },
    { text: "Veterinarian", level: 2 },
    { text: "Judge", level: 3 },
    { text: "Tailor", level: 3 },
    { text: "Sculptor", level: 3 },
    { text: "Weather forecaster", level: 3 },
    { text: "Zookeeper", level: 2 },
    { text: "Bus driver", level: 1 },
  ],
  Objects: [
    { text: "Umbrella", level: 1 },
    { text: "Toothbrush", level: 1 },
    { text: "Guitar", level: 1 },
    { text: "Telephone", level: 1 },
    { text: "Scissors", level: 1 },
    { text: "Camera", level: 1 },
    { text: "Alarm clock", level: 2 },
    { text: "Hammer", level: 1 },
    { text: "Broom", level: 1 },
    { text: "Ladder", level: 2 },
    { text: "Balloon", level: 1 },
    { text: "Kite", level: 1 },
    { text: "Backpack", level: 2 },
    { text: "Flashlight", level: 2 },
    { text: "Frying pan", level: 2 },
    { text: "Vacuum cleaner", level: 2 },
    { text: "Fishing rod", level: 2 },
    { text: "Binoculars", level: 3 },
    { text: "Typewriter", level: 3 },
    { text: "Wheelbarrow", level: 3 },
    { text: "Watering can", level: 2 },
    { text: "Rolling pin", level: 3 },
    { text: "Paintbrush", level: 2 },
    { text: "Stapler", level: 2 },
    { text: "Whistle", level: 2 },
    { text: "Kettle", level: 3 },
    { text: "Compass", level: 3 },
    { text: "Skateboard", level: 1 },
    { text: "Trumpet", level: 2 },
    { text: "Tent", level: 2 },
    { text: "Snorkel", level: 3 },
    { text: "Yo-yo", level: 2 },
  ],
};

const CATEGORY_NAMES = Object.keys(LIBRARY);
const DIFFICULTY_LABEL = { 1: "Easy", 2: "Medium", 3: "Hard" };

// Build the pool for a chosen category ("Anything" merges all) and difficulty.
function buildPool(category, difficulty) {
  let entries;
  if (category === "Anything") {
    entries = CATEGORY_NAMES.flatMap((name) =>
      LIBRARY[name].map((e) => ({ ...e, category: name }))
    );
  } else {
    entries = LIBRARY[category].map((e) => ({ ...e, category }));
  }
  if (difficulty !== "any") {
    const want = Number(difficulty);
    entries = entries.filter((e) => e.level === want);
  }
  return entries;
}

export default function CharadesGenerator() {
  const [category, setCategory] = useState("Anything");
  const [difficulty, setDifficulty] = useState("any");
  const [current, setCurrent] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState(0);
  const [copied, setCopied] = useState(false);
  // Track the recently-served items so we do not repeat back-to-back.
  const [recent, setRecent] = useState([]);

  const pool = useMemo(
    () => buildPool(category, difficulty),
    [category, difficulty]
  );

  const newWord = useCallback(() => {
    setCopied(false);
    if (pool.length === 0) {
      setCurrent(null);
      return;
    }
    // Prefer items not seen recently; fall back to the full pool if needed.
    const recentSet = new Set(recent);
    let choices = pool.filter((e) => !recentSet.has(e.text));
    if (choices.length === 0) choices = pool;
    const pick = shuffle(choices)[0];
    setCurrent(pick);
    setRevealed(category !== "Anything" ? false : false);
    setSeen((n) => n + 1);
    setRecent((prev) => {
      const next = [pick.text, ...prev];
      // Keep the memory small relative to the pool size.
      const cap = Math.min(10, Math.max(1, Math.floor(pool.length / 2)));
      return next.slice(0, cap);
    });
  }, [pool, recent, category]);

  const reset = useCallback(() => {
    setCurrent(null);
    setRevealed(false);
    setSeen(0);
    setRecent([]);
    setCopied(false);
  }, []);

  async function handleCopy() {
    if (!current) return;
    try {
      await copyText(current.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const poolEmpty = pool.length === 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ch-category">
              Category
            </label>
            <select
              id="ch-category"
              className="tool-select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCurrent(null);
                setRevealed(false);
                setRecent([]);
                setCopied(false);
              }}
            >
              <option value="Anything">Anything (all categories)</option>
              {CATEGORY_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="ch-difficulty">
              Difficulty
            </label>
            <select
              id="ch-difficulty"
              className="tool-select"
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setCurrent(null);
                setRevealed(false);
                setRecent([]);
                setCopied(false);
              }}
            >
              <option value="any">Any</option>
              <option value="1">Easy</option>
              <option value="2">Medium</option>
              <option value="3">Hard</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={newWord}
          disabled={poolEmpty}
        >
          {current ? "New word" : "Start"}
        </button>
        <button
          className={copied ? "btn btn-success" : "btn"}
          type="button"
          onClick={handleCopy}
          disabled={!current || !revealed}
        >
          {copied ? "Copied!" : "Copy word"}
        </button>
        <button
          className="btn"
          type="button"
          onClick={reset}
          disabled={!current && seen === 0}
        >
          Reset
        </button>
      </div>

      {poolEmpty ? (
        <p className="tool-error" role="alert">
          No words match that category and difficulty. Try a different
          combination.
        </p>
      ) : !current ? (
        <p className="tool-note">
          Pick a category and difficulty, then press &ldquo;Start&rdquo;. The
          word stays hidden until the actor taps to reveal it — so no one else
          sees the answer.
        </p>
      ) : (
        <>
          <div className="tool-result" aria-live="polite">
            <p className="tool-result-label">
              {current.category} · {DIFFICULTY_LABEL[current.level]}
            </p>
            {revealed ? (
              <div
                className="tool-result-value"
                style={{
                  wordBreak: "break-word",
                  lineHeight: 1.3,
                  fontSize: "1.8rem",
                }}
              >
                {current.text}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "1.5rem 1rem",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "2px dashed currentColor",
                  borderRadius: "0.5rem",
                  background: "transparent",
                  color: "inherit",
                  opacity: 0.75,
                }}
              >
                Tap to reveal — actor only
              </button>
            )}
          </div>

          <div className="tool-stat-grid" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{seen}</div>
              <div className="tool-stat-label">Words this round</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{pool.length}</div>
              <div className="tool-stat-label">In this pool</div>
            </div>
          </div>
        </>
      )}

      <p className="tool-note">
        Everything runs locally in your browser — no sign-up, no internet needed
        once the page has loaded. Words are chosen with your browser&apos;s
        cryptographic random generator for a fair, well-mixed draw.
      </p>
    </div>
  );
}
