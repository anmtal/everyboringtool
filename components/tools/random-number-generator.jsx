"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const MAX_COUNT = 1000;

const TWO_32 = 0x100000000; // 2^32
const TWO_53 = Number.MAX_SAFE_INTEGER + 1; // 2^53

// Cryptographically strong integer in [0, max) using rejection sampling to
// avoid modulo bias. Returns 0 when the range is empty. Handles ranges larger
// than 2^32 by drawing 53 bits so a wide min/max can never spin forever.
function secureRandomInt(max) {
  if (max <= 0) return 0;

  if (max <= TWO_32) {
    const limit = Math.floor(TWO_32 / max) * max;
    const buf = new Uint32Array(1);
    let value;
    do {
      crypto.getRandomValues(buf);
      value = buf[0];
    } while (value >= limit);
    return value % max;
  }

  // Wide range: combine two 32-bit words into a 53-bit integer.
  const limit = max >= TWO_53 ? TWO_53 : Math.floor(TWO_53 / max) * max;
  const buf = new Uint32Array(2);
  let value;
  do {
    crypto.getRandomValues(buf);
    value = (buf[0] >>> 11) * TWO_32 + buf[1]; // 21 bits + 32 bits => [0, 2^53)
  } while (value >= limit);
  return value % max;
}

// Parse a text field into a whole number, or null if it isn't a valid integer.
function parseIntOrNull(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "+") return null;
  if (!/^[+-]?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isSafeInteger(n)) return null;
  return n;
}

// Generate `count` integers in [min, max] inclusive.
// When duplicates aren't allowed we draw a partial Fisher-Yates sample so
// every value is unique and uniformly distributed.
function generateNumbers(min, max, count, allowDuplicates) {
  const rangeSize = max - min + 1;

  if (allowDuplicates) {
    const out = new Array(count);
    for (let i = 0; i < count; i++) {
      out[i] = min + secureRandomInt(rangeSize);
    }
    return out;
  }

  // Unique draw. Fisher-Yates over a sparse map keyed by offset so we never
  // materialise the full range when it is large.
  const swaps = new Map();
  const read = (i) => (swaps.has(i) ? swaps.get(i) : i);
  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    const j = i + secureRandomInt(rangeSize - i);
    out[i] = min + read(j);
    swaps.set(j, read(i));
  }
  return out;
}

export default function RandomNumberGenerator() {
  const [minText, setMinText] = useState("1");
  const [maxText, setMaxText] = useState("100");
  const [countText, setCountText] = useState("5");
  const [allowDuplicates, setAllowDuplicates] = useState(true);
  const [numbers, setNumbers] = useState([]);
  const [copied, setCopied] = useState(false);

  const min = useMemo(() => parseIntOrNull(minText), [minText]);
  const max = useMemo(() => parseIntOrNull(maxText), [maxText]);
  const count = useMemo(() => parseIntOrNull(countText), [countText]);

  // Validate inputs and produce a single, user-facing error message.
  const error = useMemo(() => {
    if (min === null) return "Enter a valid whole number for the minimum.";
    if (max === null) return "Enter a valid whole number for the maximum.";
    if (count === null) return "Enter how many numbers you want to generate.";
    if (count < 1) return "Generate at least one number.";
    if (count > MAX_COUNT)
      return `You can generate up to ${MAX_COUNT.toLocaleString("en-US")} numbers at a time.`;
    if (min > max)
      return "The minimum must be less than or equal to the maximum.";
    const rangeSize = max - min + 1;
    if (!allowDuplicates && count > rangeSize)
      return `Only ${rangeSize.toLocaleString(
        "en-US"
      )} unique ${rangeSize === 1 ? "number is" : "numbers are"} available in this range. Widen the range, lower the count, or allow duplicates.`;
    return null;
  }, [min, max, count, allowDuplicates]);

  const regenerate = useCallback(() => {
    setCopied(false);
    if (error) {
      setNumbers([]);
      return;
    }
    setNumbers(generateNumbers(min, max, count, allowDuplicates));
  }, [error, min, max, count, allowDuplicates]);

  // Generate once on mount so the user sees a result immediately.
  useEffect(() => {
    if (!error) {
      setNumbers(generateNumbers(min, max, count, allowDuplicates));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear stale results whenever the inputs become invalid.
  useEffect(() => {
    if (error) setNumbers([]);
  }, [error]);

  const joined = useMemo(() => numbers.join(", "), [numbers]);

  const sum = useMemo(
    () => numbers.reduce((acc, n) => acc + n, 0),
    [numbers]
  );

  async function handleCopy() {
    if (numbers.length === 0) return;
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
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rng-min">
              Minimum
            </label>
            <input
              id="rng-min"
              className="tool-input"
              type="number"
              inputMode="numeric"
              step={1}
              value={minText}
              onChange={(e) => setMinText(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rng-max">
              Maximum
            </label>
            <input
              id="rng-max"
              className="tool-input"
              type="number"
              inputMode="numeric"
              step={1}
              value={maxText}
              onChange={(e) => setMaxText(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rng-count">
              How many
            </label>
            <input
              id="rng-count"
              className="tool-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_COUNT}
              step={1}
              value={countText}
              onChange={(e) => setCountText(e.target.value)}
              placeholder="5"
            />
          </div>
        </div>

        <div className="tool-field">
          <label
            className="tool-label"
            htmlFor="rng-duplicates"
            style={{ fontWeight: "normal" }}
          >
            <input
              id="rng-duplicates"
              type="checkbox"
              checked={allowDuplicates}
              onChange={(e) => setAllowDuplicates(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Allow duplicate numbers
          </label>
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={regenerate}
          disabled={!!error}
        >
          {numbers.length > 0 ? "Regenerate" : "Generate"}
        </button>
        <button
          className={copied ? "btn btn-success" : "btn"}
          type="button"
          onClick={handleCopy}
          disabled={numbers.length === 0}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {error ? (
        <div className="tool-error">{error}</div>
      ) : numbers.length > 0 ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">
              {numbers.length === 1
                ? "Your random number"
                : `Your ${numbers.length} random numbers`}
            </div>
            <div
              className="tool-result-value"
              style={{ wordBreak: "break-word", lineHeight: 1.6 }}
            >
              {joined}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {numbers.length.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Generated</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {Math.min(...numbers).toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Lowest</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {Math.max(...numbers).toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Highest</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {sum.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Sum</div>
            </div>
          </div>
        </>
      ) : null}

      <p className="tool-note">
        Numbers are drawn with your browser&apos;s built-in cryptographic
        generator (crypto.getRandomValues) for unbiased, high-quality
        randomness. Everything runs locally on your device — nothing is sent
        anywhere.
      </p>
    </div>
  );
}
