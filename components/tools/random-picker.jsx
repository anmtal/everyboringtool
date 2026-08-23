"use client";

import { useCallback, useMemo, useState } from "react";

const MAX_PICK = 1000;
const TWO_32 = 0x100000000; // 2^32

// Cryptographically strong integer in [0, max) using rejection sampling to
// avoid modulo bias. Returns 0 when the range is empty.
function secureRandomInt(max) {
  if (max <= 0) return 0;
  const limit = Math.floor(TWO_32 / max) * max;
  const buf = new Uint32Array(1);
  let value;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

// Draw `count` unique items from `items` using a partial Fisher-Yates shuffle
// so every selection is uniformly distributed without materialising a full
// shuffle when the list is long.
function pickUnique(items, count) {
  const pool = items.slice();
  const n = Math.min(count, pool.length);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const j = i + secureRandomInt(pool.length - i);
    out[i] = pool[j];
    pool[j] = pool[i];
  }
  return out;
}

// Parse a text field into a whole number, or null if it isn't a valid integer.
function parseIntOrNull(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isSafeInteger(n)) return null;
  return n;
}

export default function RandomPicker() {
  const [text, setText] = useState("");
  const [countText, setCountText] = useState("1");
  const [removePicked, setRemovePicked] = useState(false);
  const [picked, setPicked] = useState([]);
  const [copied, setCopied] = useState(false);

  // Split into non-blank, trimmed lines. Blank/whitespace-only lines ignored.
  const items = useMemo(() => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [text]);

  const count = useMemo(() => parseIntOrNull(countText), [countText]);

  const error = useMemo(() => {
    if (count === null) return "Enter how many items to pick.";
    if (count < 1) return "Pick at least one item.";
    if (count > MAX_PICK)
      return `You can pick up to ${MAX_PICK.toLocaleString("en-US")} items at a time.`;
    if (items.length > 0 && count > items.length)
      return `Only ${items.length.toLocaleString("en-US")} ${
        items.length === 1 ? "item is" : "items are"
      } in your list. Add more items or lower the number to pick.`;
    return null;
  }, [count, items.length]);

  const canPick = items.length > 0 && !error;

  const pick = useCallback(() => {
    setCopied(false);
    if (!canPick) {
      setPicked([]);
      return;
    }
    const selection = pickUnique(items, count);
    setPicked(selection);

    if (removePicked) {
      // Remove each picked item once (by first matching occurrence) so
      // duplicate lines are handled correctly.
      const remaining = items.slice();
      for (const value of selection) {
        const idx = remaining.indexOf(value);
        if (idx !== -1) remaining.splice(idx, 1);
      }
      setText(remaining.join("\n"));
    }
  }, [canPick, items, count, removePicked]);

  const clearAll = useCallback(() => {
    setText("");
    setPicked([]);
    setCopied(false);
  }, []);

  const joined = useMemo(() => picked.join("\n"), [picked]);

  async function handleCopy() {
    if (picked.length === 0) return;
    try {
      await navigator.clipboard.writeText(joined);
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
          <label className="tool-label" htmlFor="rp-list">
            Your list (one item per line)
          </label>
          <textarea
            id="rp-list"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Alice\nBob\nCharlie\nDana\n…"}
            rows={10}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-count">
              Number to pick
            </label>
            <input
              id="rp-count"
              className="tool-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_PICK}
              step={1}
              value={countText}
              onChange={(e) => setCountText(e.target.value)}
              placeholder="1"
            />
          </div>
        </div>

        <div className="tool-field">
          <label
            className="tool-label"
            htmlFor="rp-remove"
            style={{ fontWeight: "normal" }}
          >
            <input
              id="rp-remove"
              type="checkbox"
              checked={removePicked}
              onChange={(e) => setRemovePicked(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Remove picked items from the list
          </label>
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={pick}
          disabled={!canPick}
        >
          {count !== null && count > 1 ? `Pick ${count}` : "Pick one"}
        </button>
        <button
          className={copied ? "btn btn-success" : "btn"}
          type="button"
          onClick={handleCopy}
          disabled={picked.length === 0}
        >
          {copied ? "Copied!" : "Copy result"}
        </button>
        <button
          className="btn"
          type="button"
          onClick={clearAll}
          disabled={text === "" && picked.length === 0}
        >
          Clear
        </button>
      </div>

      {error ? (
        <div className="tool-error">{error}</div>
      ) : items.length === 0 ? (
        <p className="tool-note">
          Paste or type a list above — one item per line. Blank lines are
          ignored. Then press &ldquo;Pick one&rdquo; to choose at random.
        </p>
      ) : picked.length > 0 ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">
              {picked.length === 1
                ? "The winner is"
                : `Picked ${picked.length} items`}
            </div>
            {picked.length === 1 ? (
              <div
                className="tool-result-value"
                style={{ wordBreak: "break-word", lineHeight: 1.4 }}
              >
                {picked[0]}
              </div>
            ) : (
              <ol
                style={{
                  margin: "0.5rem 0 0",
                  paddingLeft: "1.5rem",
                  lineHeight: 1.7,
                  fontSize: "1.05rem",
                }}
              >
                {picked.map((item, i) => (
                  <li key={i} style={{ wordBreak: "break-word" }}>
                    {item}
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {picked.length.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Picked</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {items.length.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">
                {removePicked ? "Items remaining" : "Items in list"}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="tool-note">
          {items.length.toLocaleString("en-US")}{" "}
          {items.length === 1 ? "item" : "items"} ready. Press &ldquo;Pick
          one&rdquo; to choose at random.
        </p>
      )}

      <p className="tool-note">
        Selections use your browser&apos;s built-in cryptographic random
        generator (crypto.getRandomValues) for fair, unbiased picks. Everything
        runs locally on your device — your list never leaves your browser.
      </p>
    </div>
  );
}
