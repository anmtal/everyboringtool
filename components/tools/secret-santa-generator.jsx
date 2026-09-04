"use client";

import { useCallback, useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const MIN_PARTICIPANTS = 3;

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

// Standard Fisher-Yates shuffle built on randInt. Returns a new array.
function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

// Build a derangement of the given indices: a permutation where no element
// stays in its original position (so no one draws themselves). Uses the
// "early refusal + retry" method, which is fast and unbiased for small groups.
function derange(n) {
  if (n < 2) return null;
  for (let attempt = 0; attempt < 1000; attempt++) {
    const order = new Array(n);
    for (let i = 0; i < n; i++) order[i] = i;
    const shuffled = shuffle(order);
    let ok = true;
    for (let i = 0; i < n; i++) {
      if (shuffled[i] === i) {
        ok = false;
        break;
      }
    }
    if (ok) return shuffled;
  }
  // Fallback: a simple rotation is always a valid derangement.
  const order = new Array(n);
  for (let i = 0; i < n; i++) order[i] = (i + 1) % n;
  return order;
}

export default function SecretSantaGenerator() {
  const [text, setText] = useState("");
  const [pairs, setPairs] = useState([]);
  const [copied, setCopied] = useState(false);

  // Split into non-blank, trimmed lines.
  const names = useMemo(() => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [text]);

  // Detect duplicate names (case-insensitive) so the organizer can fix them.
  const hasDuplicates = useMemo(() => {
    const seen = new Set();
    for (const name of names) {
      const key = name.toLowerCase();
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }, [names]);

  const error = useMemo(() => {
    if (names.length > 0 && names.length < MIN_PARTICIPANTS)
      return `Add at least ${MIN_PARTICIPANTS} participants — you have ${names.length}.`;
    if (hasDuplicates)
      return "Two participants share the same name. Make each name unique (add a last initial) so the pairings are clear.";
    return null;
  }, [names.length, hasDuplicates]);

  const canDraw = names.length >= MIN_PARTICIPANTS && !error;

  const draw = useCallback(() => {
    setCopied(false);
    if (!canDraw) {
      setPairs([]);
      return;
    }
    const mapping = derange(names.length);
    if (!mapping) {
      setPairs([]);
      return;
    }
    const result = names.map((giver, i) => ({
      giver,
      receiver: names[mapping[i]],
    }));
    setPairs(result);
  }, [canDraw, names]);

  const clearAll = useCallback(() => {
    setText("");
    setPairs([]);
    setCopied(false);
  }, []);

  const joined = useMemo(
    () => pairs.map((p) => `${p.giver} → ${p.receiver}`).join("\n"),
    [pairs]
  );

  async function handleCopy() {
    if (pairs.length === 0) return;
    try {
      await copyText(joined);
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
          <label className="tool-label" htmlFor="ss-list">
            Participants (one name per line)
          </label>
          <textarea
            id="ss-list"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Alice\nBob\nCharlie\nDana\nEli\nFrankie\n…"}
            rows={10}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={draw}
          disabled={!canDraw}
        >
          {pairs.length > 0 ? "Re-draw names" : "Draw names"}
        </button>
        <button
          className={copied ? "btn btn-success" : "btn"}
          type="button"
          onClick={handleCopy}
          disabled={pairs.length === 0}
        >
          {copied ? "Copied!" : "Copy pairings"}
        </button>
        <button
          className="btn"
          type="button"
          onClick={clearAll}
          disabled={text === "" && pairs.length === 0}
        >
          Clear
        </button>
      </div>

      {error ? (
        <p className="tool-error" role="alert">
          {error}
        </p>
      ) : names.length === 0 ? (
        <p className="tool-note">
          Add everyone taking part — one name per line — then press &ldquo;Draw
          names&rdquo;. You need at least {MIN_PARTICIPANTS} people.
        </p>
      ) : pairs.length > 0 ? (
        <>
          <div className="tool-result" aria-live="polite">
            <p className="tool-result-label">Secret Santa pairings</p>
            <div className="tool-result-value">
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  lineHeight: 1.9,
                  fontSize: "1.05rem",
                }}
              >
                {pairs.map((p, i) => (
                  <li key={i} style={{ wordBreak: "break-word" }}>
                    <strong>{p.giver}</strong>
                    {" → "}
                    {p.receiver}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="tool-stat-grid" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{pairs.length}</div>
              <div className="tool-stat-label">Participants</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{pairs.length}</div>
              <div className="tool-stat-label">Gifts to give</div>
            </div>
          </div>

          <p className="tool-note">
            This list is for the organizer&apos;s eyes only. To keep it a
            surprise, tell each giver privately who they drew — or hand out
            folded slips so no one sees the whole list.
          </p>
        </>
      ) : (
        <p className="tool-note">
          {names.length} {names.length === 1 ? "participant" : "participants"}{" "}
          ready. Press &ldquo;Draw names&rdquo; to pair everyone up — no one is
          ever assigned themselves.
        </p>
      )}

      <p className="tool-note">
        Every draw is a true derangement, so no one is matched with themselves.
        Pairings are generated locally in your browser using its cryptographic
        random generator — nothing is uploaded, saved, or shared.
      </p>
    </div>
  );
}
