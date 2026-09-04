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
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// Each item is [optionA, optionB]. Rendered as “Would you rather A or B?”
const DILEMMAS = [
  ["be able to fly", "be able to turn invisible"],
  ["have a pause button for life", "have a rewind button for life"],
  ["be able to talk to animals", "be able to speak every human language"],
  ["always be ten minutes early", "always be twenty minutes late"],
  ["have a pet dragon the size of a cat", "have a pet dinosaur the size of a dog"],
  ["live by the beach", "live in the mountains"],
  ["explore outer space", "explore the deep ocean"],
  ["have super speed", "have super strength"],
  ["never have to sleep again", "never have to eat again but still enjoy food"],
  ["be a famous singer", "be a famous movie star"],
  ["have a robot best friend", "have a talking pet"],
  ["be able to breathe underwater", "be able to walk through walls"],
  ["always know when someone is lying", "always get away with a little white lie"],
  ["have unlimited books", "have unlimited video games"],
  ["travel one hundred years into the future", "travel one hundred years into the past"],
  ["be the funniest person in the room", "be the smartest person in the room"],
  ["have a house made of candy", "have a car that flies"],
  ["be able to teleport anywhere", "be able to stop time for everyone but you"],
  ["always have perfect hair", "always have perfectly clean shoes"],
  ["only be able to whisper", "only be able to shout"],
  ["have a tail like a monkey", "have wings like a bird"],
  ["be able to shrink to the size of an ant", "be able to grow as tall as a building"],
  ["eat pizza every day forever", "eat ice cream every day forever"],
  ["have a magic paintbrush that brings drawings to life", "have shoes that let you run super fast"],
  ["live in a treehouse", "live in a castle"],
  ["be able to control the weather", "be able to control plants and make them grow"],
  ["have a personal chef", "have a personal tour guide for the whole world"],
  ["always win at board games", "always win at sports"],
  ["be able to read minds", "be able to see one minute into the future"],
  ["have a backpack that fits anything", "have a jacket that keeps you comfy in any weather"],
  ["swim in a pool of chocolate", "swim in a pool of marshmallows"],
  ["be able to jump as high as a building", "be able to run as fast as a car"],
  ["have a bedroom on a spaceship", "have a bedroom under the sea"],
  ["be able to talk to your future self", "be able to talk to your past self"],
  ["never feel too cold", "never feel too hot"],
  ["have a garden that grows any food you want", "have a fridge that never runs empty"],
  ["be an astronaut", "be a deep-sea explorer"],
  ["have a pet that glows in the dark", "have a pet that can change colors"],
  ["always have the perfect thing to say", "always know the answer to any question"],
  ["ride a roller coaster all day", "play at a water park all day"],
  ["be able to draw anything perfectly", "be able to sing any song beautifully"],
  ["have a time machine you can use once", "have a teleporter you can use any time"],
  ["live in a world where it is always summer", "live in a world where it is always winter"],
  ["be able to talk to trees", "be able to talk to the ocean"],
  ["have a magic carpet", "have a pair of flying sneakers"],
  ["be a world-famous chef", "be a world-famous inventor"],
  ["have hiccups for a day", "have the giggles for a day"],
  ["always smell fresh cookies", "always hear your favorite song faintly playing"],
  ["be able to make anyone smile", "be able to make anyone feel brave"],
  ["have a snowball fight in summer", "go to the beach in winter"],
  ["be able to breathe fire like a friendly dragon", "be able to freeze things with a touch"],
  ["own a giant trampoline park", "own a giant candy shop"],
  ["have a map that shows hidden treasure", "have a key that opens any door"],
  ["be able to turn any drawing into a real object", "be able to shrink any object to fit in your pocket"],
  ["spend a day as a giant", "spend a day as tiny as a mouse"],
  ["have a talking backpack", "have a talking pair of shoes"],
  ["always land on the fun square in a game", "always roll the number you need"],
  ["be able to paint the sky any color", "be able to rearrange the stars"],
  ["have a slide instead of stairs at home", "have a fire pole instead of stairs at home"],
  ["be able to understand every animal", "be able to fly like a bird for one hour a day"],
  ["have a never-melting ice cream cone", "have a never-ending bag of popcorn"],
  ["be a superhero who saves cats from trees", "be a superhero who helps people find lost things"],
  ["visit every country in the world", "visit the moon just once"],
  ["have a robot that does your chores", "have a robot that tells the best jokes"],
  ["be able to bounce like a rubber ball", "be able to stretch your arms super long"],
  ["ride a friendly whale across the ocean", "ride a friendly eagle across the sky"],
  ["have a secret hideout in a cave", "have a secret hideout in the clouds"],
  ["be able to make it snow whenever you want", "be able to make a rainbow whenever you want"],
  ["have a pancake for a hat", "have spaghetti for shoelaces"],
];

export default function WouldYouRather() {
  const [queue, setQueue] = useState(() => shuffle(DILEMMAS));
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState(null); // [a, b]
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const drawNext = useCallback(() => {
    let q = queue;
    let i = index;
    if (i >= q.length) {
      q = shuffle(DILEMMAS);
      i = 0;
      setQueue(q);
    }
    setCurrent(q[i]);
    setIndex(i + 1);
    setCount((c) => c + 1);
    setCopied(false);
  }, [queue, index]);

  const total = useMemo(() => DILEMMAS.length, []);

  async function handleCopy() {
    if (!current) return;
    try {
      await copyText(`Would you rather ${current[0]} or ${current[1]}?`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-actions">
        <button className="btn btn-primary" type="button" onClick={drawNext}>
          {current ? "Next question" : "Start"}
        </button>
        {current ? (
          <button
            className={copied ? "btn btn-success" : "btn"}
            type="button"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        ) : null}
      </div>

      {current ? (
        <>
          <div className="tool-result" aria-live="polite">
            <p className="tool-result-label">Would you rather…</p>
            <div
              className="tool-result-value"
              style={{ fontSize: "1.35rem", lineHeight: 1.4 }}
            >
              <span style={{ wordBreak: "break-word" }}>{current[0]}</span>
              <span
                style={{
                  display: "block",
                  margin: "0.6rem 0",
                  fontWeight: 700,
                  color: "#c026d3",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontSize: "0.95rem",
                }}
              >
                — or —
              </span>
              <span style={{ wordBreak: "break-word" }}>{current[1]}?</span>
            </div>
          </div>

          <div className="tool-stat-grid" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{count}</div>
              <div className="tool-stat-label">Questions asked</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{total}</div>
              <div className="tool-stat-label">In the deck</div>
            </div>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Press <strong>Start</strong> for a random &ldquo;would you
          rather&rdquo; dilemma. Every question is clean and family-friendly —
          perfect for parties, classrooms, road trips, and dinner-table
          debates.
        </p>
      )}

      <p className="tool-note">
        {total} hand-picked, all-ages questions, shuffled so you won&apos;t see
        a repeat until the deck runs out. Everything runs locally in your
        browser — nothing is sent anywhere.
      </p>
    </div>
  );
}
