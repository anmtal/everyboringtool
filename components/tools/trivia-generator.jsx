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

const CATEGORIES = [
  "General",
  "Science",
  "History",
  "Geography",
  "Movies",
  "Music",
  "Sports",
];

// Curated, fact-checked trivia. Family-friendly, all ages.
const QUESTIONS = {
  General: [
    { question: "How many sides does a hexagon have?", answer: "Six" },
    { question: "What is the largest planet in our solar system?", answer: "Jupiter" },
    { question: "What do bees collect and use to make honey?", answer: "Nectar" },
    { question: "How many colors are in a rainbow?", answer: "Seven" },
    { question: "What is the tallest land animal in the world?", answer: "The giraffe" },
    { question: "How many minutes are there in a full day?", answer: "1,440 minutes" },
    { question: "What is the hardest natural substance on Earth?", answer: "Diamond" },
    { question: "What shape has three sides?", answer: "A triangle" },
  ],
  Science: [
    { question: "What is the chemical symbol for gold?", answer: "Au" },
    { question: "What planet is known as the Red Planet?", answer: "Mars" },
    { question: "What gas do plants absorb from the air for photosynthesis?", answer: "Carbon dioxide" },
    { question: "How many bones are in the adult human body?", answer: "206" },
    { question: "What is the closest star to Earth?", answer: "The Sun" },
    { question: "What is the chemical symbol for water?", answer: "H2O" },
    { question: "What force pulls objects toward the center of the Earth?", answer: "Gravity" },
    { question: "What is the largest organ of the human body?", answer: "The skin" },
    { question: "At what temperature does water freeze in degrees Celsius?", answer: "0 degrees Celsius" },
    { question: "What part of a plant conducts photosynthesis?", answer: "The leaves" },
  ],
  History: [
    { question: "In what year did World War II end?", answer: "1945" },
    { question: "Who was the first President of the United States?", answer: "George Washington" },
    { question: "What ancient wonder still stands at Giza, Egypt?", answer: "The Great Pyramid" },
    { question: "Who wrote the Declaration of Independence's first draft?", answer: "Thomas Jefferson" },
    { question: "What ship sank on its maiden voyage in 1912?", answer: "The Titanic" },
    { question: "Which civilization built Machu Picchu?", answer: "The Inca" },
    { question: "In what year did humans first land on the Moon?", answer: "1969" },
    { question: "Who was the ancient Greek philosopher who taught Alexander the Great?", answer: "Aristotle" },
  ],
  Geography: [
    { question: "What is the longest river in the world?", answer: "The Nile (by most measures)" },
    { question: "What is the capital city of Japan?", answer: "Tokyo" },
    { question: "Which is the largest ocean on Earth?", answer: "The Pacific Ocean" },
    { question: "What is the smallest country in the world by area?", answer: "Vatican City" },
    { question: "On which continent is the Sahara Desert located?", answer: "Africa" },
    { question: "What is the capital of Australia?", answer: "Canberra" },
    { question: "Which mountain is the tallest above sea level?", answer: "Mount Everest" },
    { question: "What is the largest country in the world by area?", answer: "Russia" },
    { question: "Which country has the most people?", answer: "India" },
  ],
  Movies: [
    { question: "What animated film features a snowman named Olaf?", answer: "Frozen" },
    { question: "In which movie does a young lion named Simba grow up to be king?", answer: "The Lion King" },
    { question: "What is the name of the toy cowboy in Toy Story?", answer: "Woody" },
    { question: "In Finding Nemo, what kind of fish is Nemo?", answer: "A clownfish" },
    { question: "What wizard school does Harry Potter attend?", answer: "Hogwarts" },
    { question: "What green ogre stars in a DreamWorks film series?", answer: "Shrek" },
    { question: "In which film does a girl named Dorothy travel to the Land of Oz?", answer: "The Wizard of Oz" },
    { question: "What Pixar film is about a rat who wants to be a chef?", answer: "Ratatouille" },
  ],
  Music: [
    { question: "How many strings does a standard guitar have?", answer: "Six" },
    { question: "What instrument has 88 keys?", answer: "The piano" },
    { question: "What family of instruments includes the violin and cello?", answer: "The string family" },
    { question: "How many musicians are in a quartet?", answer: "Four" },
    { question: "What brass instrument is the largest and lowest-pitched?", answer: "The tuba" },
    { question: "What do you call the person who leads an orchestra?", answer: "The conductor" },
    { question: "Which instrument do you play by pressing keys and blowing into it, common in jazz?", answer: "The saxophone" },
    { question: "What term means a piece of music is played slowly?", answer: "Adagio" },
  ],
  Sports: [
    { question: "How many players are on a soccer team on the field at once?", answer: "Eleven" },
    { question: "In which sport would you perform a slam dunk?", answer: "Basketball" },
    { question: "How many points is a touchdown worth in American football?", answer: "Six" },
    { question: "How often are the Summer Olympic Games held?", answer: "Every four years" },
    { question: "In tennis, what is a score of zero called?", answer: "Love" },
    { question: "How many rings are on the Olympic flag?", answer: "Five" },
    { question: "In baseball, how many strikes make an out?", answer: "Three" },
    { question: "What sport uses a shuttlecock?", answer: "Badminton" },
  ],
};

export default function TriviaGenerator() {
  const [category, setCategory] = useState("General");
  const [current, setCurrent] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState(0);
  const [copied, setCopied] = useState(false);

  // Build the working pool for the selected category (all categories mixed
  // for "General"? No — General has its own set; keep it simple and clear).
  const pool = useMemo(() => {
    if (category === "General") {
      // General mixes its own set plus a broad sampling from every category.
      const all = [];
      for (const key of Object.keys(QUESTIONS)) all.push(...QUESTIONS[key]);
      return all;
    }
    return QUESTIONS[category] || [];
  }, [category]);

  const nextQuestion = useCallback(() => {
    setCopied(false);
    setRevealed(false);
    if (pool.length === 0) {
      setCurrent(null);
      return;
    }
    let pick;
    if (pool.length === 1) {
      pick = pool[0];
    } else {
      // Avoid repeating the exact same question twice in a row.
      do {
        pick = pool[randInt(pool.length)];
      } while (current && pick.question === current.question);
    }
    setCurrent(pick);
    setSeen((n) => n + 1);
  }, [pool, current]);

  const onCategoryChange = useCallback((e) => {
    setCategory(e.target.value);
    setCurrent(null);
    setRevealed(false);
    setSeen(0);
    setCopied(false);
  }, []);

  async function handleCopy() {
    if (!current) return;
    const text = `${current.question}\nAnswer: ${current.answer}`;
    try {
      await copyText(text);
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
          <label className="tool-label" htmlFor="tg-category">
            Category
          </label>
          <select
            id="tg-category"
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
        <button className="btn btn-primary" type="button" onClick={nextQuestion}>
          {current ? "Next question" : "Start"}
        </button>
        {current ? (
          <button
            className="btn"
            type="button"
            onClick={() => setRevealed((r) => !r)}
          >
            {revealed ? "Hide answer" : "Reveal answer"}
          </button>
        ) : null}
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
            <p className="tool-result-label">{category} question</p>
            <div
              className="tool-result-value"
              style={{ lineHeight: 1.4, wordBreak: "break-word" }}
            >
              {current.question}
            </div>
            {revealed ? (
              <p
                style={{
                  margin: "0.85rem 0 0",
                  fontSize: "1.05rem",
                  lineHeight: 1.5,
                }}
              >
                <strong>Answer:</strong> {current.answer}
              </p>
            ) : (
              <p className="tool-note" style={{ marginTop: "0.85rem" }}>
                Press &ldquo;Reveal answer&rdquo; when everyone has guessed.
              </p>
            )}
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
          Choose a category and press &ldquo;Start&rdquo; for a random trivia
          question. Guess out loud, then reveal the answer.
        </p>
      )}

      <p className="tool-note">
        Every question is picked with your browser&apos;s built-in cryptographic
        random generator, and nothing leaves your device — the whole quiz runs
        locally in your browser.
      </p>
    </div>
  );
}
