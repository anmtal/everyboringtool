"use client";

import { useMemo, useState } from "react";

// Ordered digit alphabet; index === digit value (0-15 covers up to hex).
const DIGITS = "0123456789abcdef";

const BASES = [
  { value: 2, label: "Binary (base 2)", allowed: "0-1" },
  { value: 8, label: "Octal (base 8)", allowed: "0-7" },
  { value: 10, label: "Decimal (base 10)", allowed: "0-9" },
  { value: 16, label: "Hexadecimal (base 16)", allowed: "0-9, A-F" },
];

const OUTPUTS = [
  { key: "bin", base: 2, label: "Binary" },
  { key: "oct", base: 8, label: "Octal" },
  { key: "dec", base: 10, label: "Decimal" },
  { key: "hex", base: 16, label: "Hexadecimal" },
];

// Normalize raw input: trim, drop a single leading sign, strip grouping
// underscores/spaces. Returns { sign, body } where body holds only digits.
function normalize(raw) {
  let s = String(raw).trim();
  let sign = "";
  if (s[0] === "+" || s[0] === "-") {
    sign = s[0] === "-" ? "-" : "";
    s = s.slice(1);
  }
  const body = s.replace(/[_\s]/g, "");
  return { sign, body };
}

// Parse a string in the given base into a BigInt, or null if any digit is
// invalid for that base. Uses BigInt so arbitrarily large values never lose
// precision or produce NaN/Infinity.
function parseInBase(raw, base) {
  const { sign, body } = normalize(raw);
  if (body === "") return null;
  const b = BigInt(base);
  let val = 0n;
  for (const ch of body.toLowerCase()) {
    const d = DIGITS.indexOf(ch);
    if (d === -1 || d >= base) return null;
    val = val * b + BigInt(d);
  }
  return sign === "-" ? -val : val;
}

// Format a BigInt in the target base; hex/other letters uppercased.
function formatInBase(value, base) {
  if (value < 0n) return "-" + (-value).toString(base).toUpperCase();
  return value.toString(base).toUpperCase();
}

// Collect the distinct characters that are not legal digits for the base,
// so the error message can point at exactly what is wrong.
function invalidChars(raw, base) {
  const { body } = normalize(raw);
  const bad = [];
  const seen = new Set();
  for (const ch of body) {
    const d = DIGITS.indexOf(ch.toLowerCase());
    if ((d === -1 || d >= base) && !seen.has(ch)) {
      seen.add(ch);
      bad.push(ch);
    }
  }
  return bad;
}

export default function NumberBaseConverter() {
  const [input, setInput] = useState("255");
  const [fromBase, setFromBase] = useState(10);
  const [copied, setCopied] = useState("");

  const value = useMemo(() => parseInBase(input, fromBase), [input, fromBase]);
  const isEmpty = normalize(input).body === "";
  const isInvalid = !isEmpty && value === null;

  const bad = useMemo(
    () => (isInvalid ? invalidChars(input, fromBase) : []),
    [isInvalid, input, fromBase]
  );

  const currentBase = BASES.find((b) => b.value === fromBase) || BASES[2];

  // Derived stats, computed from the unsigned magnitude of the parsed value.
  const stats = useMemo(() => {
    if (value === null) return null;
    const mag = value < 0n ? -value : value;
    const bits = mag === 0n ? 1 : mag.toString(2).length;
    return {
      bits,
      bytes: Math.ceil(bits / 8),
      decDigits: (value < 0n ? -value : value).toString(10).length,
      hexDigits: mag.toString(16).length,
    };
  }, [value]);

  async function copy(text, key) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      // Clipboard may be unavailable (permissions / insecure context); ignore.
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="nbc-input">
              Value to convert
            </label>
            <input
              id="nbc-input"
              className="tool-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              inputMode={fromBase === 10 ? "numeric" : "text"}
              placeholder="Enter a number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="nbc-base">
              From base
            </label>
            <select
              id="nbc-base"
              className="tool-select"
              value={fromBase}
              onChange={(e) => setFromBase(Number(e.target.value))}
            >
              {BASES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isInvalid ? (
        <p className="tool-error">
          {bad.length > 0
            ? `Invalid digit${bad.length > 1 ? "s" : ""} for ${
                currentBase.label
              }: ${bad.map((c) => `"${c}"`).join(", ")}. Allowed: ${
                currentBase.allowed
              }.`
            : `Enter a valid ${currentBase.label} number. Allowed digits: ${currentBase.allowed}.`}
        </p>
      ) : null}

      {OUTPUTS.map((row) => {
        const text = value === null ? "" : formatInBase(value, row.base);
        return (
          <div className="tool-result" key={row.key}>
            <div className="tool-result-label">
              {row.label}
              {row.base === 16 ? " (uppercase)" : ""}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                className="tool-result-value"
                style={{
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  wordBreak: "break-all",
                }}
              >
                {text || "—"}
              </div>
              <button
                type="button"
                className="btn"
                disabled={!text}
                onClick={() => copy(text, row.key)}
              >
                {copied === row.key ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        );
      })}

      {stats ? (
        <div className="tool-stat-grid">
          <div className="tool-stat">
            <div className="tool-stat-num">{stats.bits}</div>
            <div className="tool-stat-label">Bit length</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{stats.bytes}</div>
            <div className="tool-stat-label">Bytes</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{stats.decDigits}</div>
            <div className="tool-stat-label">Decimal digits</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{stats.hexDigits}</div>
            <div className="tool-stat-label">Hex digits</div>
          </div>
        </div>
      ) : null}

      <p className="tool-note">
        Pick the base your number is written in, type it, and it converts live
        to binary, octal, decimal, and uppercase hex. Underscores and spaces are
        ignored as digit separators, and very large numbers stay exact. Nothing
        is uploaded — it all runs in your browser.
      </p>
    </div>
  );
}
