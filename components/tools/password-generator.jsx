"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Character sets. Ambiguous glyphs (l, 1, I, O, 0) are removed when the
// "exclude ambiguous" option is on so passwords are easier to read aloud.
const SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/",
};

const AMBIGUOUS = new Set(["l", "1", "I", "O", "0"]);

const OPTIONS = [
  { key: "uppercase", label: "Uppercase (A-Z)" },
  { key: "lowercase", label: "Lowercase (a-z)" },
  { key: "numbers", label: "Numbers (0-9)" },
  { key: "symbols", label: "Symbols (!@#$…)" },
];

const MIN_LENGTH = 6;
const MAX_LENGTH = 64;

// Cryptographically strong integer in [0, max) using rejection sampling to
// avoid modulo bias.
function secureRandomInt(max) {
  if (max <= 0) return 0;
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let value;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

// Fisher-Yates shuffle backed by secureRandomInt.
function secureShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildPools(selectedKeys, excludeAmbiguous) {
  return selectedKeys.map((key) => {
    let chars = SETS[key];
    if (excludeAmbiguous) {
      chars = chars
        .split("")
        .filter((c) => !AMBIGUOUS.has(c))
        .join("");
    }
    return { key, chars };
  });
}

function generatePassword(length, selectedKeys, excludeAmbiguous) {
  const pools = buildPools(selectedKeys, excludeAmbiguous).filter(
    (p) => p.chars.length > 0
  );
  if (pools.length === 0) return "";

  const all = pools.map((p) => p.chars).join("");
  const result = [];

  // Guarantee at least one character from each selected (non-empty) set.
  for (const pool of pools) {
    result.push(pool.chars[secureRandomInt(pool.chars.length)]);
  }

  // Fill the remaining slots from the combined pool.
  for (let i = result.length; i < length; i++) {
    result.push(all[secureRandomInt(all.length)]);
  }

  // If the requested length is shorter than the number of selected sets,
  // trim so we never exceed it, then shuffle so guaranteed chars aren't
  // always at the front.
  const trimmed = result.slice(0, Math.max(length, 0));
  return secureShuffle(trimmed).join("");
}

// Strength scored from length and how many character sets are in play.
function scoreStrength(length, varietyCount) {
  if (length === 0 || varietyCount === 0) {
    return { label: "—", level: 0 };
  }
  let score = 0;
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;
  if (length >= 24) score += 1;
  score += varietyCount - 1; // 0-3 bonus for extra sets

  if (score <= 2) return { label: "Weak", level: 1 };
  if (score <= 4) return { label: "Fair", level: 2 };
  if (score <= 6) return { label: "Strong", level: 3 };
  return { label: "Very strong", level: 4 };
}

const STRENGTH_COLORS = {
  0: "currentColor",
  1: "#dc2626",
  2: "#d97706",
  3: "#16a34a",
  4: "#15803d",
};

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [sets, setSets] = useState({
    uppercase: false,
    lowercase: true,
    numbers: true,
    symbols: false,
  });
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedKeys = useMemo(
    () => OPTIONS.map((o) => o.key).filter((key) => sets[key]),
    [sets]
  );

  const noneSelected = selectedKeys.length === 0;

  const regenerate = useCallback(() => {
    setCopied(false);
    if (noneSelected) {
      setPassword("");
      return;
    }
    setPassword(generatePassword(length, selectedKeys, excludeAmbiguous));
  }, [length, selectedKeys, excludeAmbiguous, noneSelected]);

  // Generate on mount and whenever the options change.
  useEffect(() => {
    regenerate();
  }, [regenerate]);

  const strength = useMemo(
    () => scoreStrength(password.length, selectedKeys.length),
    [password.length, selectedKeys.length]
  );

  function toggleSet(key) {
    setSets((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleLengthChange(e) {
    const raw = parseInt(e.target.value, 10);
    if (Number.isNaN(raw)) {
      setLength(MIN_LENGTH);
      return;
    }
    const clamped = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, raw));
    setLength(clamped);
  }

  async function handleCopy() {
    if (!password) return;
    try {
      await copyText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="pg-length">
            Password length: {length}
          </label>
          <div className="tool-row">
            <input
              id="pg-length"
              className="tool-input"
              type="range"
              min={MIN_LENGTH}
              max={MAX_LENGTH}
              step={1}
              value={length}
              onChange={handleLengthChange}
              style={{ flex: 1 }}
            />
            <input
              className="tool-input"
              type="number"
              min={MIN_LENGTH}
              max={MAX_LENGTH}
              value={length}
              onChange={handleLengthChange}
              aria-label="Password length"
              style={{ maxWidth: "5rem" }}
            />
          </div>
        </div>

        <div className="tool-field">
          <span className="tool-label">Include characters</span>
          {OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="tool-label"
              htmlFor={`pg-${opt.key}`}
              style={{ fontWeight: "normal" }}
            >
              <input
                id={`pg-${opt.key}`}
                type="checkbox"
                checked={sets[opt.key]}
                onChange={() => toggleSet(opt.key)}
                style={{ marginRight: "0.5rem" }}
              />
              {opt.label}
            </label>
          ))}
        </div>

        <div className="tool-field">
          <label
            className="tool-label"
            htmlFor="pg-ambiguous"
            style={{ fontWeight: "normal" }}
          >
            <input
              id="pg-ambiguous"
              type="checkbox"
              checked={excludeAmbiguous}
              onChange={(e) => setExcludeAmbiguous(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Exclude ambiguous characters (l, 1, I, O, 0)
          </label>
        </div>
      </div>

      {noneSelected ? (
        <div className="tool-error">
          Select at least one character type to generate a password.
        </div>
      ) : (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">Your password</div>
            <div
              className="tool-result-value"
              style={{
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                wordBreak: "break-all",
              }}
            >
              {password}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              margin: "0.75rem 0",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                flex: 1,
                height: "6px",
                borderRadius: "999px",
                background: "rgba(128,128,128,0.25)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(strength.level / 4) * 100}%`,
                  height: "100%",
                  background: STRENGTH_COLORS[strength.level],
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <span
              style={{
                fontWeight: 600,
                color: STRENGTH_COLORS[strength.level],
                minWidth: "6.5rem",
                textAlign: "right",
              }}
            >
              {strength.label}
            </span>
          </div>

          <div className="tool-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={regenerate}
            >
              Regenerate
            </button>
            <button
              className={copied ? "btn btn-success" : "btn"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </>
      )}

      <p className="tool-note">
        Passwords are created with your browser&apos;s built-in cryptographic
        random generator (crypto.getRandomValues) and always contain at least
        one character from every set you select. Nothing is sent anywhere —
        everything runs locally on your device.
      </p>
    </div>
  );
}
