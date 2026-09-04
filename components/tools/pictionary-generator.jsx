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
  Objects: [
    { text: "Cup", level: 1 },
    { text: "Chair", level: 1 },
    { text: "Clock", level: 1 },
    { text: "Book", level: 1 },
    { text: "Key", level: 1 },
    { text: "Hat", level: 1 },
    { text: "Ladder", level: 2 },
    { text: "Umbrella", level: 2 },
    { text: "Camera", level: 2 },
    { text: "Guitar", level: 2 },
    { text: "Anchor", level: 2 },
    { text: "Telescope", level: 3 },
    { text: "Lighthouse", level: 2 },
    { text: "Wheelbarrow", level: 3 },
    { text: "Chandelier", level: 3 },
    { text: "Compass", level: 3 },
    { text: "Fire hydrant", level: 3 },
    { text: "Toaster", level: 2 },
    { text: "Kite", level: 1 },
    { text: "Sock", level: 1 },
  ],
  Animals: [
    { text: "Cat", level: 1 },
    { text: "Dog", level: 1 },
    { text: "Fish", level: 1 },
    { text: "Snake", level: 1 },
    { text: "Bird", level: 1 },
    { text: "Cow", level: 1 },
    { text: "Elephant", level: 2 },
    { text: "Giraffe", level: 2 },
    { text: "Penguin", level: 2 },
    { text: "Octopus", level: 2 },
    { text: "Kangaroo", level: 2 },
    { text: "Platypus", level: 3 },
    { text: "Chameleon", level: 3 },
    { text: "Narwhal", level: 3 },
    { text: "Hedgehog", level: 3 },
    { text: "Peacock", level: 2 },
    { text: "Jellyfish", level: 2 },
    { text: "Seahorse", level: 3 },
    { text: "Butterfly", level: 2 },
    { text: "Turtle", level: 1 },
  ],
  Food: [
    { text: "Apple", level: 1 },
    { text: "Banana", level: 1 },
    { text: "Pizza", level: 1 },
    { text: "Egg", level: 1 },
    { text: "Ice cream", level: 1 },
    { text: "Cake", level: 1 },
    { text: "Hamburger", level: 2 },
    { text: "Spaghetti", level: 2 },
    { text: "Pineapple", level: 2 },
    { text: "Watermelon", level: 2 },
    { text: "Popcorn", level: 2 },
    { text: "Sushi roll", level: 3 },
    { text: "Cupcake", level: 2 },
    { text: "Pretzel", level: 3 },
    { text: "Corn on the cob", level: 3 },
    { text: "Doughnut", level: 2 },
    { text: "Carrot", level: 1 },
    { text: "Sandwich", level: 2 },
    { text: "Lollipop", level: 1 },
    { text: "Taco", level: 2 },
  ],
  Places: [
    { text: "Beach", level: 1 },
    { text: "House", level: 1 },
    { text: "School", level: 1 },
    { text: "Farm", level: 1 },
    { text: "Castle", level: 2 },
    { text: "Volcano", level: 2 },
    { text: "Igloo", level: 2 },
    { text: "Playground", level: 2 },
    { text: "Airport", level: 3 },
    { text: "Waterfall", level: 2 },
    { text: "Desert island", level: 3 },
    { text: "Amusement park", level: 3 },
    { text: "Campsite", level: 2 },
    { text: "Rainforest", level: 3 },
    { text: "Library", level: 2 },
    { text: "Bridge", level: 1 },
    { text: "Windmill", level: 3 },
    { text: "Zoo", level: 1 },
    { text: "Barn", level: 1 },
    { text: "Cave", level: 2 },
  ],
  Actions: [
    { text: "Running", level: 1 },
    { text: "Sleeping", level: 1 },
    { text: "Swimming", level: 1 },
    { text: "Reading", level: 1 },
    { text: "Jumping", level: 1 },
    { text: "Dancing", level: 2 },
    { text: "Fishing", level: 2 },
    { text: "Skating", level: 2 },
    { text: "Sneezing", level: 2 },
    { text: "Juggling", level: 3 },
    { text: "Surfing", level: 2 },
    { text: "Camping", level: 2 },
    { text: "Skydiving", level: 3 },
    { text: "Gardening", level: 3 },
    { text: "Bowling", level: 2 },
    { text: "Painting", level: 2 },
    { text: "Cartwheel", level: 3 },
    { text: "Tug of war", level: 3 },
    { text: "Waving", level: 1 },
    { text: "Digging", level: 1 },
  ],
  Nature: [
    { text: "Sun", level: 1 },
    { text: "Tree", level: 1 },
    { text: "Flower", level: 1 },
    { text: "Cloud", level: 1 },
    { text: "Star", level: 1 },
    { text: "Mountain", level: 2 },
    { text: "Rainbow", level: 2 },
    { text: "Snowflake", level: 2 },
    { text: "Lightning", level: 2 },
    { text: "Tornado", level: 3 },
    { text: "Cactus", level: 2 },
    { text: "Seashell", level: 2 },
    { text: "Mushroom", level: 2 },
    { text: "Iceberg", level: 3 },
    { text: "Coral reef", level: 3 },
    { text: "Waterfall", level: 3 },
    { text: "Leaf", level: 1 },
    { text: "River", level: 2 },
    { text: "Volcano", level: 3 },
    { text: "Puddle", level: 1 },
  ],
};

const CATEGORY_NAMES = Object.keys(LIBRARY);
const DIFFICULTY_LABEL = { 1: "Easy", 2: "Medium", 3: "Hard" };

// Build the pool for a chosen category ("All" merges every category) and
// difficulty ("any" keeps all levels).
function buildPool(category, difficulty) {
  let entries;
  if (category === "All") {
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

export default function PictionaryGenerator() {
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("any");
  const [current, setCurrent] = useState(null);
  const [seen, setSeen] = useState(0);
  const [copied, setCopied] = useState(false);
  // Track recently-served words so the same one does not repeat back-to-back.
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
    const recentSet = new Set(recent);
    let choices = pool.filter((e) => !recentSet.has(e.text));
    if (choices.length === 0) choices = pool;
    const pick = shuffle(choices)[0];
    setCurrent(pick);
    setSeen((n) => n + 1);
    setRecent((prev) => {
      const next = [pick.text, ...prev];
      const cap = Math.min(10, Math.max(1, Math.floor(pool.length / 2)));
      return next.slice(0, cap);
    });
  }, [pool, recent]);

  const reset = useCallback(() => {
    setCurrent(null);
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
            <label className="tool-label" htmlFor="pc-category">
              Category
            </label>
            <select
              id="pc-category"
              className="tool-select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCurrent(null);
                setRecent([]);
                setCopied(false);
              }}
            >
              <option value="All">All categories</option>
              {CATEGORY_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="pc-difficulty">
              Difficulty
            </label>
            <select
              id="pc-difficulty"
              className="tool-select"
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setCurrent(null);
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
          {current ? "New word" : "Start drawing"}
        </button>
        <button
          className={copied ? "btn btn-success" : "btn"}
          type="button"
          onClick={handleCopy}
          disabled={!current}
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
          Pick a category and difficulty, then press &ldquo;Start
          drawing&rdquo;. One drawer sees the word and sketches it — no letters,
          no numbers, no talking — while everyone else guesses.
        </p>
      ) : (
        <>
          <div className="tool-result" aria-live="polite">
            <p className="tool-result-label">
              {current.category} · {DIFFICULTY_LABEL[current.level]}
            </p>
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
        Everything runs locally in your browser — free, no sign-up, and no
        internet needed once the page has loaded. Words are drawn with your
        browser&apos;s cryptographic random generator for a fair, well-mixed
        shuffle.
      </p>
    </div>
  );
}
