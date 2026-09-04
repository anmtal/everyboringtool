"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { copyText } from "../../lib/copyText";

// Cryptographically strong integer in [0, max) using rejection sampling to
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

const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const HARD_LETTERS = ["Q", "X", "Z", "U", "V", "Y"];

const CATEGORY_LIBRARY = [
  "A boy's name",
  "A girl's name",
  "Something in the kitchen",
  "A movie title",
  "An animal",
  "A country",
  "A city",
  "A type of food",
  "A color",
  "A sport",
  "A job or profession",
  "Something you wear",
  "A cartoon character",
  "A board game",
  "Something found at the beach",
  "A school subject",
  "A fruit or vegetable",
  "A type of bird",
  "Something in a park",
  "A musical instrument",
  "A holiday or celebration",
  "A brand or company",
  "Something cold",
  "Something hot",
  "A body part",
  "A hobby",
  "A dessert",
  "Something in the classroom",
  "A famous person",
  "A type of weather",
  "A vegetable",
  "Something round",
  "A room in a house",
  "A tree or plant",
  "A superhero",
  "Something you find in a garage",
  "A US state",
  "A river or lake",
  "A type of dance",
  "Something at the zoo",
  "A breakfast food",
  "A word that describes a friend",
  "A tool",
  "Something at a birthday party",
  "A type of shoe",
  "A pizza topping",
  "Something in a backpack",
  "A cartoon or TV show",
  "A song title",
  "A book title",
  "A vehicle",
  "Something soft",
  "Something that flies",
  "A type of candy",
  "A restaurant",
  "A vacation spot",
  "Something in the bathroom",
  "A type of dog",
  "A flower",
  "Something you recycle",
  "A famous landmark",
  "Something electronic",
  "A type of sandwich",
  "Something in the ocean",
  "A word to describe weather",
  "A card game",
  "Something you plug in",
  "A camping item",
  "A theme park ride",
  "A type of hat",
];

const CATEGORY_COUNT = 12;
const DEFAULT_SECONDS = 60;

export default function ScattergoriesGenerator() {
  const [excludeHard, setExcludeHard] = useState(true);
  const [letter, setLetter] = useState(null);
  const [categories, setCategories] = useState([]);
  const [copied, setCopied] = useState(false);

  const [seconds, setSeconds] = useState(DEFAULT_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const letterPool = useMemo(
    () => (excludeHard ? ALL_LETTERS.filter((l) => !HARD_LETTERS.includes(l)) : ALL_LETTERS),
    [excludeHard]
  );

  const roll = useCallback(() => {
    setCopied(false);
    const nextLetter = letterPool[randInt(letterPool.length)];
    const nextCategories = shuffle(CATEGORY_LIBRARY).slice(0, CATEGORY_COUNT);
    setLetter(nextLetter);
    setCategories(nextCategories);
  }, [letterPool]);

  // Countdown timer.
  useEffect(() => {
    if (!running) return undefined;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  const startTimer = useCallback(() => {
    setSeconds((s) => (s <= 0 ? DEFAULT_SECONDS : s));
    setRunning(true);
  }, []);

  const stopTimer = useCallback(() => {
    setRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setRunning(false);
    setSeconds(DEFAULT_SECONDS);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  async function handleCopy() {
    if (!letter || categories.length === 0) return;
    const text =
      `Letter: ${letter}\n\n` +
      categories.map((c, i) => `${i + 1}. ${c}`).join("\n");
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
          <label
            className="tool-label"
            htmlFor="sc-exclude"
            style={{ fontWeight: "normal" }}
          >
            <input
              id="sc-exclude"
              type="checkbox"
              checked={excludeHard}
              onChange={(e) => setExcludeHard(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Exclude hard letters (Q, X, Z, U, V, Y)
          </label>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn btn-primary" type="button" onClick={roll}>
          {letter ? "Roll again" : "Roll letter & list"}
        </button>
        <button
          className={copied ? "btn btn-success" : "btn"}
          type="button"
          onClick={handleCopy}
          disabled={!letter}
        >
          {copied ? "Copied!" : "Copy round"}
        </button>
      </div>

      {letter ? (
        <div className="tool-result" aria-live="polite">
          <p className="tool-result-label">Your letter</p>
          <div
            className="tool-result-value"
            style={{
              fontSize: "clamp(3rem, 14vw, 6rem)",
              fontWeight: 800,
              textAlign: "center",
              lineHeight: 1,
              padding: "0.5rem 0",
            }}
          >
            {letter}
          </div>
          <p className="tool-result-label" style={{ marginTop: "0.75rem" }}>
            Find one for each category
          </p>
          <ol
            style={{
              margin: "0.5rem 0 0",
              paddingLeft: "1.5rem",
              lineHeight: 1.9,
              fontSize: "1.05rem",
            }}
          >
            {categories.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="tool-note">
          Press &ldquo;Roll letter &amp; list&rdquo; to get a random letter and
          twelve categories. Everyone races to name something in each category
          that starts with that letter before the timer runs out.
        </p>
      )}

      <div
        className="tool-result"
        aria-live="polite"
        style={{ marginTop: "1rem" }}
      >
        <p className="tool-result-label">Timer</p>
        <div
          style={{
            fontSize: "clamp(2.5rem, 12vw, 4.5rem)",
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1,
            padding: "0.25rem 0",
            fontVariantNumeric: "tabular-nums",
            color: seconds === 0 ? "#c0392b" : undefined,
          }}
        >
          {mm}:{ss}
        </div>
        <div className="tool-actions" style={{ justifyContent: "center" }}>
          {running ? (
            <button className="btn btn-primary" type="button" onClick={stopTimer}>
              Pause
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={startTimer}>
              {seconds === 0 ? "Restart 60s" : "Start 60s"}
            </button>
          )}
          <button
            className="btn"
            type="button"
            onClick={resetTimer}
            disabled={seconds === DEFAULT_SECONDS && !running}
          >
            Reset
          </button>
        </div>
        {seconds === 0 ? (
          <p className="tool-note" style={{ textAlign: "center" }}>
            Time&apos;s up — pencils down!
          </p>
        ) : null}
      </div>

      <p className="tool-note">
        Letters and category lists are chosen with your browser&apos;s
        cryptographic random generator for fair, unbiased rounds. Everything
        runs locally on your device — nothing is sent anywhere.
      </p>
    </div>
  );
}
