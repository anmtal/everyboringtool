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

const TRUTHS = [
  "What is the most embarrassing thing you have ever worn in public?",
  "What is one talent you wish you had?",
  "Who was your very first best friend?",
  "What is the silliest thing you are afraid of?",
  "What is your most-used emoji?",
  "If you could be any animal for a day, which would you pick?",
  "What is the weirdest food combination you actually enjoy?",
  "What is your go-to karaoke song?",
  "What is the most childish thing you still do?",
  "What is a small thing that always makes you laugh?",
  "If you could instantly master one skill, what would it be?",
  "What is the strangest dream you can remember?",
  "What is your biggest pet peeve?",
  "What is the worst haircut you have ever had?",
  "If you had to eat one meal for the rest of your life, what would it be?",
  "What is the most useless fact you know?",
  "What is your favorite way to waste an afternoon?",
  "What is a song you are secretly a little embarrassed to love?",
  "What is the best gift you have ever received?",
  "If you could live in any fictional world, which one would you choose?",
  "What is the funniest thing that happened to you at school?",
  "What is your hidden talent that almost nobody knows about?",
  "What would your superhero name be?",
  "What is the messiest your room has ever been?",
  "What is one thing on your bucket list?",
  "Who is your favorite cartoon character and why?",
  "What is the longest you have ever gone without sleep?",
  "What is your most-repeated catchphrase?",
  "If you could swap lives with anyone for a day, who would it be?",
  "What is the strangest thing you have ever eaten?",
  "What is a habit you would love to break?",
  "What is your favorite board game or video game?",
  "What is the nicest thing anyone has ever said to you?",
  "If you could have any pet in the world, what would it be?",
  "What is the last thing that made you cry happy tears?",
  "What is your dream vacation destination?",
  "What is the weirdest thing in your fridge right now?",
  "What is a movie you can quote almost word for word?",
  "What is the worst gift you have ever given someone?",
  "If you found a magic lamp, what would your first wish be?",
  "What is your favorite thing about your best friend?",
  "What is the most adventurous thing you have ever done?",
  "What is a food you refused to try until recently?",
  "What was your favorite toy as a kid?",
  "What is the most number of times you have seen the same movie?",
  "If you could rename yourself, what name would you choose?",
  "What is your favorite season and why?",
  "What is the silliest reason you have ever laughed until you cried?",
  "What is one thing you are really proud of?",
  "What would you do with a completely free day, no plans at all?",
  "What is the best compliment you could give a stranger?",
  "What is your favorite smell in the whole world?",
  "If your life had a theme song, what would it be?",
  "What is the strangest talent you wish you could show off?",
];

const DARES = [
  "Do your best robot dance for ten seconds.",
  "Talk in a cartoon voice until your next turn.",
  "Do your best impression of a chicken.",
  "Balance a spoon on your nose for ten seconds.",
  "Sing the alphabet backwards as fast as you can.",
  "Do ten jumping jacks right now.",
  "Speak only in questions until your next turn.",
  "Do your best impression of another player.",
  "Pretend to be a news reporter describing the room.",
  "Hop on one foot around the room once.",
  "Make up a short rap about your favorite food.",
  "Do your best superhero pose and hold it for five seconds.",
  "Try to lick your elbow.",
  "Walk like a penguin to the other side of the room and back.",
  "Do your best slow-motion movie run across the room.",
  "Give a dramatic speech thanking your imaginary award.",
  "Act like a cat trying to get attention for fifteen seconds.",
  "Say the tongue twister ‘she sells seashells’ three times fast.",
  "Do your best impression of a robot running out of battery.",
  "Pretend to be a tour guide showing off the room.",
  "Do your best air-guitar solo.",
  "Make the silliest face you can and hold it for ten seconds.",
  "Do your best impression of a wobbly bowl of jelly.",
  "Pretend to swim across the floor for ten seconds.",
  "Do a dramatic cartwheel — or a very dramatic pretend one.",
  "Hum a song and let the others guess it.",
  "Do your best impression of a scary movie scream — quietly.",
  "Pretend you are stuck in an invisible box.",
  "Do your best fashion-model runway walk.",
  "Speak in a whisper for the next two rounds.",
  "Do your best impression of a happy puppy.",
  "Give someone a very over-the-top compliment.",
  "Do your best march like a wind-up toy soldier.",
  "Pretend to be a weather forecaster predicting rain of candy.",
  "Do your best impression of a slow-motion sneeze.",
  "Balance a book on your head and walk five steps.",
  "Do your best impression of a rooster at sunrise.",
  "Act out brushing your teeth without any toothbrush.",
  "Do your best impression of a very sleepy sloth.",
  "Do a silly dance every time someone says your name until your next turn.",
  "Pretend to be a robot vacuum cleaning the room.",
  "Do your best impression of a bouncing kangaroo.",
  "Say ‘I am a teapot’ and act out the shape.",
  "Do your best impression of a melting ice cream cone.",
  "Give a dramatic reading of the nearest label or sign.",
  "Do your best impression of a frog hopping across the room.",
  "Pretend to be a statue for fifteen seconds — no giggling.",
  "Do your best impression of a race car zooming past.",
  "March in place while saluting for ten seconds.",
  "Do your best impression of a bird trying to fly.",
  "Pretend you just won the lottery and celebrate silently.",
  "Do your best impression of a bouncy ball that will not stop.",
  "Give an acceptance speech for ‘best laugh in the room’.",
  "Do your best impression of a tiny, grumpy dinosaur.",
];

export default function TruthOrDare() {
  const [truthQueue, setTruthQueue] = useState(() => shuffle(TRUTHS));
  const [dareQueue, setDareQueue] = useState(() => shuffle(DARES));
  const [truthIndex, setTruthIndex] = useState(0);
  const [dareIndex, setDareIndex] = useState(0);
  const [current, setCurrent] = useState(null); // { type, text }
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const drawTruth = useCallback(() => {
    let queue = truthQueue;
    let index = truthIndex;
    if (index >= queue.length) {
      queue = shuffle(TRUTHS);
      index = 0;
      setTruthQueue(queue);
    }
    const text = queue[index];
    setTruthIndex(index + 1);
    setCurrent({ type: "truth", text });
    setCount((c) => c + 1);
    setCopied(false);
  }, [truthQueue, truthIndex]);

  const drawDare = useCallback(() => {
    let queue = dareQueue;
    let index = dareIndex;
    if (index >= queue.length) {
      queue = shuffle(DARES);
      index = 0;
      setDareQueue(queue);
    }
    const text = queue[index];
    setDareIndex(index + 1);
    setCurrent({ type: "dare", text });
    setCount((c) => c + 1);
    setCopied(false);
  }, [dareQueue, dareIndex]);

  const drawRandom = useCallback(() => {
    if (randInt(2) === 0) drawTruth();
    else drawDare();
  }, [drawTruth, drawDare]);

  const drawNext = useCallback(() => {
    if (!current) {
      drawRandom();
    } else if (current.type === "truth") {
      drawTruth();
    } else {
      drawDare();
    }
  }, [current, drawRandom, drawTruth, drawDare]);

  const totals = useMemo(
    () => ({ truths: TRUTHS.length, dares: DARES.length }),
    []
  );

  async function handleCopy() {
    if (!current) return;
    const label = current.type === "truth" ? "Truth" : "Dare";
    try {
      await copyText(`${label}: ${current.text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const isTruth = current && current.type === "truth";

  return (
    <div className="tool">
      <div className="tool-actions">
        <button className="btn btn-primary" type="button" onClick={drawTruth}>
          Truth
        </button>
        <button className="btn btn-primary" type="button" onClick={drawDare}>
          Dare
        </button>
        <button className="btn" type="button" onClick={drawRandom}>
          Random
        </button>
      </div>

      {current ? (
        <>
          <div className="tool-result" aria-live="polite">
            <p
              className="tool-result-label"
              style={{
                color: isTruth ? "#2563eb" : "#c026d3",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {isTruth ? "Truth" : "Dare"}
            </p>
            <div
              className="tool-result-value"
              style={{
                fontSize: "1.5rem",
                lineHeight: 1.35,
                wordBreak: "break-word",
              }}
            >
              {current.text}
            </div>
          </div>

          <div className="tool-actions">
            <button className="btn btn-primary" type="button" onClick={drawNext}>
              Next {isTruth ? "truth" : "dare"}
            </button>
            <button className="btn" type="button" onClick={drawRandom}>
              Surprise me
            </button>
            <button
              className={copied ? "btn btn-success" : "btn"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="tool-stat-grid" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{count}</div>
              <div className="tool-stat-label">Prompts drawn</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{totals.truths}</div>
              <div className="tool-stat-label">Truths in deck</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{totals.dares}</div>
              <div className="tool-stat-label">Dares in deck</div>
            </div>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Pick <strong>Truth</strong>, <strong>Dare</strong>, or{" "}
          <strong>Random</strong> to start. Every prompt is family-friendly and
          works great for parties, road trips, sleepovers, and classrooms.
        </p>
      )}

      <p className="tool-note">
        {totals.truths + totals.dares} hand-picked, all-ages prompts. Cards are
        shuffled so you won&apos;t see repeats until the whole deck has been
        used. Everything runs locally in your browser — nothing is sent
        anywhere.
      </p>
    </div>
  );
}
