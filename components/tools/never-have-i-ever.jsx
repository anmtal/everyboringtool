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

// Family-friendly "Never have I ever ___" statements. All-ages, no alcohol,
// drugs, or anything unsuitable for a general audience.
const STATEMENTS = [
  "fallen asleep in a movie theater",
  "sent a text to the wrong person",
  "laughed so hard that milk came out of my nose",
  "gotten lost in my own neighborhood",
  "eaten dessert before dinner",
  "sang loudly in the shower",
  "tripped in front of a crowd",
  "forgotten someone’s name right after they told me",
  "stayed up all night reading a book",
  "talked to my pet like it could answer back",
  "waved back at someone who was waving at another person",
  "worn two different socks on purpose",
  "eaten cereal for dinner",
  "gotten a brain freeze from ice cream",
  "pretended to be asleep to avoid chores",
  "laughed at the wrong moment",
  "danced when I thought no one was watching",
  "lost a staring contest on purpose",
  "named a houseplant",
  "walked into a glass door",
  "cried during a happy movie",
  "eaten the last cookie and blamed someone else",
  "made a wish on a shooting star",
  "practiced a speech in the mirror",
  "gotten food stuck in my teeth all day without knowing",
  "reread the same sentence ten times",
  "hidden a mess in the closet before guests arrived",
  "sung the wrong lyrics with full confidence",
  "built a blanket fort",
  "gotten scared by my own reflection",
  "forgotten why I walked into a room",
  "high-fived someone and missed completely",
  "eaten pizza for breakfast",
  "pretended to understand directions I didn’t follow",
  "laughed so hard no sound came out",
  "worn a shirt inside out all day",
  "talked in my sleep",
  "won a game and done a victory dance",
  "made up a song about my dinner",
  "gotten a song stuck in my head for a whole day",
  "waved at a stranger thinking they were a friend",
  "fallen off a chair while leaning back",
  "eaten something that fell on the floor",
  "gotten lost following a map app",
  "stayed in pajamas all day",
  "counted sheep and lost track",
  "clapped when the plane landed",
  "made a snow angel",
  "gotten my shoelaces tangled together",
  "laughed at my own joke before finishing it",
  "forgotten my own phone number for a second",
  "put something in the fridge that didn’t belong there",
  "tried to push a door that said pull",
  "named a stuffed animal",
  "gotten the hiccups at the quietest moment",
  "run to catch a bus and missed it anyway",
  "eaten peanut butter straight from the jar",
  "fallen asleep during a car ride",
  "drawn on my own hand out of boredom",
  "gotten a word stuck on the tip of my tongue",
  "cheered for the wrong team by mistake",
  "made faces at a baby to get a smile",
  "lost a board game and asked for a rematch",
  "forgotten where I put my glasses while wearing them",
];

export default function NeverHaveIEver() {
  const [order, setOrder] = useState(() => shuffle(STATEMENTS));
  const [index, setIndex] = useState(-1);
  const [copied, setCopied] = useState(false);

  const current = index >= 0 ? order[index] : null;
  const seen = index >= 0 ? index + 1 : 0;

  const next = useCallback(() => {
    setCopied(false);
    setIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= order.length) {
        // Reshuffle for a fresh round once every statement has been shown.
        setOrder(shuffle(STATEMENTS));
        return 0;
      }
      return nextIndex;
    });
  }, [order.length]);

  const reset = useCallback(() => {
    setOrder(shuffle(STATEMENTS));
    setIndex(-1);
    setCopied(false);
  }, []);

  const fullLine = useMemo(
    () => (current ? `Never have I ever ${current}.` : ""),
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
          {current ? "Never have I ever…" : "Ready to play"}
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
            ? `…${current}.`
            : "Press “Next” to reveal your first statement."}
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={next}>
          {current ? "Next statement" : "Start"}
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
            <div className="tool-stat-num">{STATEMENTS.length}</div>
            <div className="tool-stat-label">Statements in deck</div>
          </div>
        </div>
      ) : null}

      <p className="tool-note">
        How to play — everyone starts with ten fingers up. Read the statement
        aloud; anyone who <em>has</em> done it puts one finger down. The last
        player with a finger still up wins. Keep it lighthearted and only share
        what you’re comfortable sharing.
      </p>

      <p className="tool-note">
        Every statement is drawn randomly using your browser’s built-in
        cryptographic generator, so no two rounds feel the same. Nothing is sent
        anywhere — the whole game runs on your device.
      </p>
    </div>
  );
}
