"use client";

import { useCallback, useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Cryptographically strong integer in [0, max) with rejection sampling to
// avoid modulo bias. Returns 0 when the range is empty.
function randInt(max) {
  if (max <= 0) return 0;
  const b = new Uint32Array(1);
  const lim = Math.floor(0x100000000 / max) * max;
  let v;
  do {
    crypto.getRandomValues(b);
    v = b[0];
  } while (v >= lim);
  return v % max;
}

// Fisher-Yates shuffle built on randInt.
function shuffle(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

const CATEGORIES = ["General", "Work", "Fun", "Deep", "Family"];

// Curated, clean conversation starters. Family-friendly, all ages.
const QUESTIONS = {
  General: [
    "If you could instantly learn any new skill, what would it be?",
    "What is a small thing that always makes your day better?",
    "If you could visit anywhere in the world, where would you go first?",
    "What is your favorite way to spend a rainy afternoon?",
    "If you could have any animal as a pet, what would you pick?",
    "What is a book, show, or movie you could enjoy over and over?",
    "What is your favorite season, and why?",
    "If you could have dinner with anyone from history, who would it be?",
    "What is the best piece of advice you have ever been given?",
    "What is something new you would love to try this year?",
    "If you could be really good at one hobby overnight, what would it be?",
    "What is your go-to song when you want to feel happy?",
  ],
  Work: [
    "What first got you interested in the kind of work you do?",
    "What is a project you are genuinely proud of finishing?",
    "If you could swap jobs with anyone for a day, who would it be?",
    "What is one tool or app you could not do your job without?",
    "What does a truly great workday look like for you?",
    "What is a skill you have picked up that surprised you?",
    "If you started your own business, what would it be?",
    "What is the best team you have ever been part of, and why?",
    "What is one thing you wish more people understood about your role?",
    "How do you like to recharge after a busy week?",
    "What is a piece of career advice you would give your younger self?",
    "What is something you are learning or want to learn right now?",
  ],
  Fun: [
    "If you could have any superpower, which one would you choose?",
    "Would you rather explore outer space or the deep ocean?",
    "What is the most useless talent you have?",
    "If you were an ice cream flavor, which one would you be?",
    "What is the funniest nickname you have ever had?",
    "If your life had a theme song, what would it be?",
    "Would you rather be able to fly or be invisible?",
    "What is a movie you can quote almost word for word?",
    "If you could turn any activity into an Olympic sport, what would you win?",
    "What is the best costume you have ever worn?",
    "If you could instantly teleport anywhere for lunch, where would you eat?",
    "What is the strangest food combination you secretly enjoy?",
  ],
  Deep: [
    "What is something you have changed your mind about recently?",
    "What does a meaningful life look like to you?",
    "What is a lesson you learned the hard way?",
    "Who has had the biggest positive influence on your life?",
    "What is something you are grateful for that you often take for granted?",
    "If you could send one message to the whole world, what would it say?",
    "What does success mean to you, beyond money or status?",
    "What is a fear you have worked to overcome?",
    "What is a value you refuse to compromise on?",
    "When do you feel most like yourself?",
    "What is something you hope people remember about you?",
    "What is a question you wish more people asked each other?",
  ],
  Family: [
    "What is your favorite family tradition?",
    "What is a memory that always makes you smile?",
    "If our family could take any trip together, where should we go?",
    "What is a meal that reminds you of home?",
    "What is the best gift you have ever received?",
    "What game did you love playing as a kid?",
    "What is a story from when you were little that you love to tell?",
    "If we could have a family talent show, what would your act be?",
    "What is something you appreciate about someone in this room?",
    "What is a new tradition you would love to start together?",
    "What is your happiest memory from a holiday or birthday?",
    "If you could freeze one ordinary day forever, which would you choose?",
  ],
};

export default function IcebreakerGenerator() {
  const [category, setCategory] = useState("General");
  const [current, setCurrent] = useState("");
  const [seen, setSeen] = useState(0);
  const [copied, setCopied] = useState(false);

  const pool = useMemo(() => QUESTIONS[category] || [], [category]);

  const next = useCallback(() => {
    setCopied(false);
    if (pool.length === 0) {
      setCurrent("");
      return;
    }
    let pick;
    if (pool.length === 1) {
      pick = pool[0];
    } else {
      do {
        pick = pool[randInt(pool.length)];
      } while (pick === current);
    }
    setCurrent(pick);
    setSeen((n) => n + 1);
  }, [pool, current]);

  const onCategoryChange = useCallback((e) => {
    setCategory(e.target.value);
    setCurrent("");
    setSeen(0);
    setCopied(false);
  }, []);

  async function handleCopy() {
    if (!current) return;
    try {
      await copyText(current);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ib-category">
            Category
          </label>
          <select
            id="ib-category"
            className="tool-select"
            value={category}
            onChange={onCategoryChange}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn btn-primary" type="button" onClick={next}>
          {current ? "Next" : "Start"}
        </button>
        <button
          className={copied ? "btn btn-success" : "btn"}
          type="button"
          onClick={handleCopy}
          disabled={!current}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {current ? (
        <>
          <div className="tool-result" aria-live="polite">
            <p className="tool-result-label">{category} icebreaker</p>
            <div
              className="tool-result-value"
              style={{ lineHeight: 1.4, wordBreak: "break-word" }}
            >
              {current}
            </div>
          </div>

          <div className="tool-stat-grid" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{seen}</div>
              <div className="tool-stat-label">
                {seen === 1 ? "Question shown" : "Questions shown"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{pool.length}</div>
              <div className="tool-stat-label">In this category</div>
            </div>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Pick a category and press &ldquo;Start&rdquo; for a random
          conversation starter. Great for meetings, classrooms, parties, and
          family dinners.
        </p>
      )}

      <p className="tool-note">
        Questions are chosen with your browser&apos;s built-in cryptographic
        random generator, and everything runs locally — nothing you do here
        leaves your device.
      </p>
    </div>
  );
}
