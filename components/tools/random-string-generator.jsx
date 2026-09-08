"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?/";
const SIMILAR = "il1Lo0O";

// Unbiased index in [0, max) using WebCrypto with rejection sampling.
function randomIndex(max) {
  if (max <= 0) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

function pickFrom(pool) {
  return pool[randomIndex(pool.length)];
}

export default function RandomStringGenerator() {
  const [length, setLength] = useState(16);
  const [count, setCount] = useState(5);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [excludeSimilar, setExcludeSimilar] = useState(false);
  const [customChars, setCustomChars] = useState("");
  const [everyGroup, setEveryGroup] = useState(true);
  const [tick, setTick] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState(-1);

  const groups = useMemo(() => {
    let g = [];
    if (customChars.trim()) {
      // Custom charset overrides the toggles: use unique characters as one pool.
      const uniq = Array.from(new Set(customChars.split("")));
      return [{ name: "custom", chars: uniq.join("") }];
    }
    if (useUpper) g.push({ name: "upper", chars: UPPER });
    if (useLower) g.push({ name: "lower", chars: LOWER });
    if (useDigits) g.push({ name: "digits", chars: DIGITS });
    if (useSymbols) g.push({ name: "symbols", chars: SYMBOLS });
    if (excludeSimilar) {
      g = g
        .map((grp) => ({
          ...grp,
          chars: grp.chars
            .split("")
            .filter((c) => !SIMILAR.includes(c))
            .join(""),
        }))
        .filter((grp) => grp.chars.length > 0);
    }
    return g;
  }, [
    useUpper,
    useLower,
    useDigits,
    useSymbols,
    excludeSimilar,
    customChars,
  ]);

  const pool = useMemo(() => groups.map((g) => g.chars).join(""), [groups]);

  const lenNum = Math.max(1, Math.min(4096, Math.floor(Number(length) || 0)));
  const countNum = Math.max(1, Math.min(500, Math.floor(Number(count) || 0)));
  const isCustom = customChars.trim().length > 0;
  const requireEach = everyGroup && !isCustom && groups.length > 1;

  const error = useMemo(() => {
    if (groups.length === 0)
      return "Pick at least one character set, or enter a custom character set.";
    if (requireEach && lenNum < groups.length)
      return `Length must be at least ${groups.length} to include one character from every selected set. Increase the length or turn off "at least one from each set".`;
    return "";
  }, [groups.length, requireEach, lenNum]);

  const strings = useMemo(() => {
    if (error) return [];
    // tick is a dependency so "Generate" produces a fresh batch on demand.
    void tick;
    const out = [];
    for (let n = 0; n < countNum; n++) {
      const arr = [];
      if (requireEach) {
        // Guarantee at least one char from each selected group.
        for (const grp of groups) arr.push(pickFrom(grp.chars));
        for (let i = arr.length; i < lenNum; i++) arr.push(pickFrom(pool));
        // Fisher-Yates shuffle so the guaranteed chars aren't at the front.
        for (let i = arr.length - 1; i > 0; i--) {
          const j = randomIndex(i + 1);
          const t = arr[i];
          arr[i] = arr[j];
          arr[j] = t;
        }
      } else {
        for (let i = 0; i < lenNum; i++) arr.push(pickFrom(pool));
      }
      out.push(arr.join(""));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, countNum, lenNum, requireEach, groups, pool, tick]);

  function regenerate() {
    setCopiedIdx(-1);
    setTick((t) => t + 1);
  }

  async function copyOne(str, idx) {
    await copyText(str);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx((c) => (c === idx ? -1 : c)), 1500);
  }

  async function copyAll() {
    if (!strings.length) return;
    await copyText(strings.join("\n"));
    setCopiedIdx(-2);
    setTimeout(() => setCopiedIdx((c) => (c === -2 ? -1 : c)), 1500);
  }

  function downloadTxt() {
    if (!strings.length) return;
    const blob = new Blob([strings.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "random-strings.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const combos = pool.length > 0 ? Math.log2(pool.length) * lenNum : 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rsg-length">
              Length (characters)
            </label>
            <input
              id="rsg-length"
              className="tool-input"
              type="number"
              min={1}
              max={4096}
              value={length}
              onChange={(e) => setLength(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rsg-count">
              How many strings
            </label>
            <input
              id="rsg-count"
              className="tool-input"
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rsg-upper">
              <input
                id="rsg-upper"
                type="checkbox"
                checked={useUpper}
                disabled={isCustom}
                onChange={(e) => setUseUpper(e.target.checked)}
              />{" "}
              Uppercase (A-Z)
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rsg-lower">
              <input
                id="rsg-lower"
                type="checkbox"
                checked={useLower}
                disabled={isCustom}
                onChange={(e) => setUseLower(e.target.checked)}
              />{" "}
              Lowercase (a-z)
            </label>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rsg-digits">
              <input
                id="rsg-digits"
                type="checkbox"
                checked={useDigits}
                disabled={isCustom}
                onChange={(e) => setUseDigits(e.target.checked)}
              />{" "}
              Numbers (0-9)
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rsg-symbols">
              <input
                id="rsg-symbols"
                type="checkbox"
                checked={useSymbols}
                disabled={isCustom}
                onChange={(e) => setUseSymbols(e.target.checked)}
              />{" "}
              Symbols (!@#$…)
            </label>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rsg-similar">
              <input
                id="rsg-similar"
                type="checkbox"
                checked={excludeSimilar}
                disabled={isCustom}
                onChange={(e) => setExcludeSimilar(e.target.checked)}
              />{" "}
              Exclude look-alikes (i l 1 L o 0 O)
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rsg-each">
              <input
                id="rsg-each"
                type="checkbox"
                checked={everyGroup}
                disabled={isCustom}
                onChange={(e) => setEveryGroup(e.target.checked)}
              />{" "}
              At least one from each set
            </label>
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="rsg-custom">
            Custom character set (optional — overrides the boxes above)
          </label>
          <input
            id="rsg-custom"
            className="tool-input"
            type="text"
            placeholder="e.g. ABCDEF0123456789"
            value={customChars}
            onChange={(e) => setCustomChars(e.target.value)}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn btn-primary" type="button" onClick={regenerate}>
          Generate
        </button>
        <button
          className="btn"
          type="button"
          onClick={copyAll}
          disabled={!strings.length}
        >
          {copiedIdx === -2 ? "Copied all!" : "Copy all"}
        </button>
        <button
          className="btn"
          type="button"
          onClick={downloadTxt}
          disabled={!strings.length}
        >
          Download .txt
        </button>
      </div>

      {error ? (
        <p className="tool-error" role="status" aria-live="polite">
          {error}
        </p>
      ) : (
        <div role="status" aria-live="polite">
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{pool.length}</div>
              <div className="tool-stat-label">Characters in pool</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{lenNum}</div>
              <div className="tool-stat-label">Length each</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">~{Math.round(combos)}</div>
              <div className="tool-stat-label">Bits of entropy</div>
            </div>
          </div>

          <p className="tool-result-label">
            {strings.length} random {strings.length === 1 ? "string" : "strings"}
          </p>
          {strings.map((s, i) => (
            <div className="tool-result" key={i}>
              <code className="tool-result-value">{s}</code>
              <button
                className="btn btn-success"
                type="button"
                onClick={() => copyOne(s, i)}
              >
                {copiedIdx === i ? "Copied!" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="tool-note">
        Strings are generated with your browser&apos;s cryptographically secure
        random number generator (WebCrypto), using unbiased sampling. Nothing is
        sent anywhere — everything happens locally in your browser. Entropy is an
        estimate (log2(pool size) × length) and assumes each position is chosen
        independently.
      </p>
    </div>
  );
}
