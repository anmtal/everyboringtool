"use client";

import { useMemo, useState } from "react";

// A small list of the most common passwords / patterns. Kept short on purpose:
// this runs entirely in the browser, so we can't ship a huge dictionary, but
// catching the worst offenders is what matters most for honest feedback.
const COMMON_PASSWORDS = new Set([
  "password", "123456", "123456789", "12345678", "12345", "1234567",
  "qwerty", "abc123", "111111", "123123", "admin", "letmein", "welcome",
  "monkey", "password1", "1234567890", "iloveyou", "1234", "dragon",
  "sunshine", "princess", "football", "charlie", "aa123456", "donald",
  "qwerty123", "qwertyuiop", "password123", "000000", "654321", "superman",
  "master", "hello", "freedom", "whatever", "trustno1", "starwars",
  "passw0rd", "zaq12wsx", "login", "shadow", "michael", "ashley", "baseball",
]);

const SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
  "0123456789",
];

// Rough offline crack speed of a well-funded attacker against a fast hash
// (billions of guesses/sec). We report several reference rates so the number
// isn't presented as a single false certainty.
const GUESS_RATES = [
  { label: "Online, throttled (100/sec)", rate: 100 },
  { label: "Online, no throttle (10K/sec)", rate: 1e4 },
  { label: "Offline, slow hash / bcrypt (10K/sec)", rate: 1e4 },
  { label: "Offline, fast hash / GPU (10B/sec)", rate: 1e10 },
];

function hasSequence(lower) {
  for (const seq of SEQUENCES) {
    for (let i = 0; i + 3 <= seq.length; i++) {
      const chunk = seq.slice(i, i + 4);
      if (lower.includes(chunk)) return true;
      const rev = chunk.split("").reverse().join("");
      if (lower.includes(rev)) return true;
    }
  }
  return false;
}

function hasRepeat(pw) {
  // 3+ of the same character in a row, e.g. "aaa" or "111".
  return /(.)\1\1/.test(pw);
}

// Estimate the character-set size the password draws from. This drives the
// naive entropy bound (log2(poolSize) * length).
function poolSize(pw) {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 33; // printable ASCII symbols/space
  return pool;
}

function formatTime(seconds) {
  if (!isFinite(seconds)) return "forever";
  if (seconds < 1) return "instantly";
  const units = [
    ["century", 60 * 60 * 24 * 365 * 100],
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [name, size] of units) {
    if (seconds >= size) {
      const value = seconds / size;
      if (value >= 1e6) {
        return `${(value).toExponential(1)} ${name}s`;
      }
      const rounded = Math.round(value);
      return `${rounded.toLocaleString("en-US")} ${name}${rounded === 1 ? "" : "s"}`;
    }
  }
  return "instantly";
}

function analyze(pw) {
  if (!pw) return null;

  const lower = pw.toLowerCase();
  const length = pw.length;
  const pool = poolSize(pw);

  // Naive entropy: assumes the attacker only knows the character set, not the
  // structure. We then subtract penalties for predictable structure so we
  // don't over-credit passwords like "Password123!".
  let entropy = pool > 0 ? Math.log2(pool) * length : 0;

  const warnings = [];
  const suggestions = [];

  const isCommon = COMMON_PASSWORDS.has(lower);
  const seq = hasSequence(lower);
  const repeat = hasRepeat(pw);
  const yearMatch = /(19|20)\d\d/.test(pw);
  const onlyDigits = /^\d+$/.test(pw);
  const onlyLetters = /^[a-z]+$/i.test(pw);

  if (isCommon) {
    // A known password has almost no real entropy regardless of composition.
    entropy = Math.min(entropy, 8);
    warnings.push("This is one of the most common passwords in breach lists.");
  }
  if (seq) {
    entropy -= 10;
    warnings.push("Contains a keyboard or alphabet sequence (like \"1234\" or \"qwerty\").");
    suggestions.push("Avoid sequences like abcd, 1234, or qwerty.");
  }
  if (repeat) {
    entropy -= 8;
    warnings.push("Contains a repeated character run (like \"aaa\").");
  }
  if (yearMatch) {
    entropy -= 6;
    suggestions.push("Avoid years and dates — they are easy to guess.");
  }
  if (onlyDigits) {
    entropy -= 8;
    suggestions.push("Add letters and symbols, not just numbers.");
  }
  if (onlyLetters) {
    suggestions.push("Mix in numbers and symbols.");
  }

  entropy = Math.max(0, entropy);

  // Composition suggestions.
  if (length < 12) {
    suggestions.push("Make it at least 12–16 characters — length matters most.");
  }
  if (!/[A-Z]/.test(pw)) suggestions.push("Add an uppercase letter.");
  if (!/[a-z]/.test(pw)) suggestions.push("Add a lowercase letter.");
  if (!/[0-9]/.test(pw)) suggestions.push("Add a number.");
  if (!/[^A-Za-z0-9]/.test(pw)) suggestions.push("Add a symbol (like ! ? # or -).");

  // Guesses needed ≈ half the keyspace implied by the entropy.
  const guesses = Math.pow(2, entropy) / 2;

  const crackTimes = GUESS_RATES.map((g) => ({
    label: g.label,
    time: formatTime(guesses / g.rate),
  }));

  // Score bands based on entropy bits (a widely used rule of thumb).
  let score, label, band;
  if (isCommon || entropy < 28) {
    score = 0; label = "Very weak"; band = "vweak";
  } else if (entropy < 36) {
    score = 1; label = "Weak"; band = "weak";
  } else if (entropy < 60) {
    score = 2; label = "Fair"; band = "fair";
  } else if (entropy < 80) {
    score = 3; label = "Strong"; band = "strong";
  } else {
    score = 4; label = "Very strong"; band = "vstrong";
  }

  const composition = {
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };

  // De-duplicate suggestions while preserving order.
  const seen = new Set();
  const uniqueSuggestions = suggestions.filter((s) => {
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });

  return {
    length,
    pool,
    entropy: Math.round(entropy),
    score,
    label,
    band,
    warnings,
    suggestions: uniqueSuggestions,
    crackTimes,
    composition,
  };
}

export default function PasswordStrengthChecker() {
  const [password, setPassword] = useState("Tr0ub4dour&3");
  const [reveal, setReveal] = useState(false);

  const result = useMemo(() => analyze(password), [password]);

  const bars = [0, 1, 2, 3, 4];

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="pw-input">
            Password to test
          </label>
          <input
            id="pw-input"
            className="tool-input"
            type={reveal ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type or paste a password…"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn"
          type="button"
          onClick={() => setReveal((r) => !r)}
        >
          {reveal ? "Hide password" : "Show password"}
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => setPassword("")}
        >
          Clear
        </button>
      </div>

      <p className="tool-note">
        Nothing is sent anywhere. Your password is checked entirely in your
        browser and is never uploaded, stored, or logged.
      </p>

      {!result ? (
        <p className="tool-note">
          Enter a password above to see its strength, estimated crack time, and
          specific ways to make it stronger.
        </p>
      ) : (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">Strength</div>
          <div className="tool-result-value">
            {result.label} · {result.entropy} bits of entropy
          </div>

          <div className="tool-stat-grid" aria-hidden="true" style={{ marginTop: "0.75rem" }}>
            {bars.map((b) => (
              <div
                key={b}
                className="tool-stat"
                style={{
                  height: "8px",
                  padding: 0,
                  borderRadius: "4px",
                  background: "currentColor",
                  opacity: b <= result.score ? 1 : 0.18,
                }}
              />
            ))}
          </div>

          <div className="tool-stat-grid" style={{ marginTop: "1rem" }}>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.length}</div>
              <div className="tool-stat-label">Characters</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.pool}</div>
              <div className="tool-stat-label">Character pool</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.entropy}</div>
              <div className="tool-stat-label">Entropy (bits)</div>
            </div>
          </div>

          <div className="tool-note" style={{ marginTop: "0.5rem" }}>
            Character types used:{" "}
            {[
              result.composition.lower && "lowercase",
              result.composition.upper && "uppercase",
              result.composition.digit && "numbers",
              result.composition.symbol && "symbols",
            ]
              .filter(Boolean)
              .join(", ") || "none"}
          </div>

          <div className="tool-result-label" style={{ marginTop: "1rem" }}>
            Estimated time to crack (by guessing)
          </div>
          <pre className="tool-output">
            {result.crackTimes
              .map((c) => `${c.label.padEnd(38, " ")} ${c.time}`)
              .join("\n")}
          </pre>
          <p className="tool-note">
            These are rough estimates based on password entropy and assume the
            attacker does not already know your password from a data breach. A
            unique, long passphrase is stronger than any single number suggests.
          </p>

          {result.warnings.length > 0 ? (
            <>
              <div className="tool-result-label" style={{ marginTop: "1rem" }}>
                Warnings
              </div>
              <ul className="tool-note" style={{ margin: "0.25rem 0", paddingLeft: "1.2rem" }}>
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </>
          ) : null}

          {result.suggestions.length > 0 ? (
            <>
              <div className="tool-result-label" style={{ marginTop: "1rem" }}>
                How to make it stronger
              </div>
              <ul className="tool-note" style={{ margin: "0.25rem 0", paddingLeft: "1.2rem" }}>
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="tool-note" style={{ marginTop: "1rem" }}>
              This password uses a strong mix of length and character types. For
              best results, make sure it is unique to this account and stored in
              a password manager.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
