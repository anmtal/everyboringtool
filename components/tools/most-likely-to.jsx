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

// Fisher-Yates shuffle built on randInt (returns a new array).
function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

// Family-friendly "Who's most likely to ___?" prompts. All-ages and clean.
const PROMPTS = [
  "become a famous inventor",
  "trip over absolutely nothing",
  "forget where they parked the car",
  "adopt ten cats one day",
  "laugh at the worst possible moment",
  "win a dance competition",
  "become a professional chef",
  "get lost using a map app",
  "talk their way out of a parking ticket",
  "sleep through their alarm",
  "start a podcast about a random hobby",
  "cry happy tears at a wedding",
  "become a world traveler",
  "sing karaoke without being asked twice",
  "eat dessert before the main course",
  "befriend a total stranger in five minutes",
  "forget someone’s name two seconds after meeting them",
  "become a millionaire from a wild idea",
  "spend an entire weekend reading books",
  "organize a surprise party",
  "win a trivia night single-handedly",
  "get scared by a jump-scare in a movie",
  "become a famous painter",
  "show up ten minutes early to everything",
  "start a garden and grow their own vegetables",
  "learn to juggle just for fun",
  "give the best pep talk when you’re down",
  "become a marathon runner",
  "collect the most souvenirs on a trip",
  "quote an entire movie from memory",
  "adopt a very unusual pet",
  "become a teacher everyone remembers",
  "spend their savings on concert tickets",
  "get emotional over a cute animal video",
  "invent a brand-new board game",
  "become the family photographer",
  "always order the strangest thing on the menu",
  "master a magic trick",
  "become an astronaut",
  "keep a diary for thirty years straight",
  "win an award for kindness",
  "learn every word to a favorite song",
  "start a small business from their kitchen",
  "get distracted by a dog mid-conversation",
  "become a stand-up comedian",
  "plan every detail of a big trip",
  "fall asleep during a movie night",
  "become a bestselling author",
  "always have snacks in their bag",
  "run for mayor of their town",
  "learn to play a new instrument",
  "become a champion at video games",
  "save the day with a clever idea",
  "spend an hour choosing what to watch",
  "become a beloved coach or mentor",
  "take the scenic route every single time",
  "win a baking contest",
  "become the group’s tour guide on vacation",
  "keep everyone laughing on a long road trip",
  "start a collection of something unexpected",
  "become a wildlife photographer",
  "remember everyone’s birthday without a reminder",
];

export default function MostLikelyTo() {
  const [order, setOrder] = useState(() => shuffle(PROMPTS));
  const [index, setIndex] = useState(-1);
  const [copied, setCopied] = useState(false);

  const current = index >= 0 ? order[index] : null;
  const seen = index >= 0 ? index + 1 : 0;

  const next = useCallback(() => {
    setCopied(false);
    setIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= order.length) {
        // Reshuffle for a fresh round once every prompt has been shown.
        setOrder(shuffle(PROMPTS));
        return 0;
      }
      return nextIndex;
    });
  }, [order.length]);

  const reset = useCallback(() => {
    setOrder(shuffle(PROMPTS));
    setIndex(-1);
    setCopied(false);
  }, []);

  const fullLine = useMemo(
    () => (current ? `Who’s most likely to ${current}?` : ""),
    [current],
  );

  async function handleCopy() {
    if (!current) return;
    try {
      await copyText(fullLine);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-result" aria-live="polite">
        <p className="tool-result-label">
          {current ? "Who’s most likely to…" : "Ready to play"}
        </p>
        <div
          className="tool-result-value"
          style={{
            fontSize: "1.5rem",
            lineHeight: 1.35,
            wordBreak: "break-word",
            minHeight: "3.2em",
            display: "flex",
            alignItems: "center",
          }}
        >
          {current
            ? `…${current}?`
            : "Press “Next” to reveal your first prompt."}
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={next}>
          {current ? "Next prompt" : "Start"}
        </button>
        <button
          type="button"
          className={copied ? "btn btn-success" : "btn"}
          onClick={handleCopy}
          disabled={!current}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={reset}
          disabled={index < 0}
        >
          Reset
        </button>
      </div>

      {current ? (
        <div className="tool-stat-grid" aria-live="polite">
          <div className="tool-stat">
            <div className="tool-stat-num">{seen}</div>
            <div className="tool-stat-label">Shown this round</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{PROMPTS.length}</div>
            <div className="tool-stat-label">Prompts in deck</div>
          </div>
        </div>
      ) : null}

      <p className="tool-note">
        How to play — gather your group and read the prompt aloud. On the count
        of three, everyone points at the person they think fits best. Whoever
        gets the most points takes that round. It’s all in good fun, so keep the
        picks kind.
      </p>

      <p className="tool-note">
        Prompts are drawn randomly with your browser’s built-in cryptographic
        generator, so each game plays out differently. Nothing leaves your
        device — the whole game runs locally in your browser.
      </p>
    </div>
  );
}
