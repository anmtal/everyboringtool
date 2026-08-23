"use client";

import { useMemo, useState } from "react";

// Subtractive pairs ordered high-to-low so the greedy encoder emits the
// canonical (shortest / standard) Roman numeral for any value 1-3999.
const ROMAN_MAP = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

const SYMBOL_VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

const REFERENCE = [
  ["I", "1"],
  ["V", "5"],
  ["X", "10"],
  ["L", "50"],
  ["C", "100"],
  ["D", "500"],
  ["M", "1000"],
];

// Encode an integer (assumed already validated to 1-3999) as a Roman numeral.
function toRoman(n) {
  let out = "";
  let rem = n;
  for (const [val, sym] of ROMAN_MAP) {
    while (rem >= val) {
      out += sym;
      rem -= val;
    }
  }
  return out;
}

// Decode a Roman numeral to an integer, or return null when the string is not
// a well-formed, canonical numeral in range. Strictness is guaranteed by a
// round-trip: we re-encode the computed value and require it to match the
// (uppercased) input exactly, which rejects "IIII", "VV", "IC", "XM", etc.
function fromRoman(raw) {
  const s = raw.replace(/\s+/g, "").toUpperCase();
  if (s === "") return null;
  if (!/^[IVXLCDM]+$/.test(s)) return null;

  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = SYMBOL_VALUES[s[i]];
    const next = SYMBOL_VALUES[s[i + 1]];
    if (next && cur < next) total -= cur;
    else total += cur;
  }

  if (total < 1 || total > 3999) return null;
  if (toRoman(total) !== s) return null;
  return total;
}

// Characters in the input that are not valid Roman symbols, for a precise
// error message. Letters are compared case-insensitively.
function invalidChars(raw) {
  const seen = new Set();
  const bad = [];
  for (const ch of raw) {
    if (/\s/.test(ch)) continue;
    const up = ch.toUpperCase();
    if (!(up in SYMBOL_VALUES) && !seen.has(up)) {
      seen.add(up);
      bad.push(ch);
    }
  }
  return bad;
}

export default function RomanNumeralConverter() {
  const [numInput, setNumInput] = useState("2026");
  const [romanInput, setRomanInput] = useState("MMXXVI");
  const [copied, setCopied] = useState("");

  // --- Integer -> Roman ---------------------------------------------------
  const numTrimmed = numInput.trim();
  const num = useMemo(() => {
    if (numTrimmed === "") return null;
    if (!/^-?\d+$/.test(numTrimmed)) return NaN; // non-integer text
    return parseInt(numTrimmed, 10);
  }, [numTrimmed]);

  const numEmpty = numTrimmed === "";
  const numOutOfRange =
    !numEmpty && (Number.isNaN(num) || num < 1 || num > 3999);
  const romanResult = !numEmpty && !numOutOfRange ? toRoman(num) : "";

  // --- Roman -> Integer ---------------------------------------------------
  const romanTrimmed = romanInput.trim();
  const decoded = useMemo(() => fromRoman(romanInput), [romanInput]);
  const romanEmpty = romanTrimmed === "";
  const romanInvalid = !romanEmpty && decoded === null;
  const bad = useMemo(
    () => (romanInvalid ? invalidChars(romanInput) : []),
    [romanInvalid, romanInput]
  );

  async function copy(text, key) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      // Clipboard may be blocked (permissions / insecure context); ignore.
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        {/* Number -> Roman */}
        <div className="tool-field">
          <label className="tool-label" htmlFor="rnc-number">
            Number to Roman numeral (1–3999)
          </label>
          <input
            id="rnc-number"
            className="tool-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="Enter a whole number, e.g. 2026"
            value={numInput}
            onChange={(e) => setNumInput(e.target.value)}
          />
        </div>
      </div>

      {numOutOfRange ? (
        <p className="tool-error">
          {Number.isNaN(num)
            ? "Enter a whole number (digits only)."
            : "Roman numerals only cover 1 to 3999. Enter a number in that range."}
        </p>
      ) : null}

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">Roman numeral</div>
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
            style={{ letterSpacing: "0.06em", wordBreak: "break-all" }}
          >
            {romanResult || "—"}
          </div>
          <button
            type="button"
            className="btn"
            disabled={!romanResult}
            onClick={() => copy(romanResult, "roman")}
          >
            {copied === "roman" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="tool-fields" style={{ marginTop: 8 }}>
        {/* Roman -> Number */}
        <div className="tool-field">
          <label className="tool-label" htmlFor="rnc-roman">
            Roman numeral to number
          </label>
          <input
            id="rnc-roman"
            className="tool-input"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Enter a Roman numeral, e.g. MMXXVI"
            value={romanInput}
            onChange={(e) => setRomanInput(e.target.value)}
            style={{ textTransform: "uppercase" }}
          />
        </div>
      </div>

      {romanInvalid ? (
        <p className="tool-error">
          {bad.length > 0
            ? `Not a Roman numeral. Unexpected character${
                bad.length > 1 ? "s" : ""
              }: ${bad.map((c) => `"${c}"`).join(", ")}. Use only I, V, X, L, C, D, M.`
            : "Not a valid Roman numeral. Check the letter order — for example use IV, not IIII."}
        </p>
      ) : null}

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">Number</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="tool-result-value">
            {decoded !== null ? decoded.toLocaleString("en-US") : "—"}
          </div>
          <button
            type="button"
            className="btn"
            disabled={decoded === null}
            onClick={() => copy(decoded !== null ? String(decoded) : "", "number")}
          >
            {copied === "number" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        {REFERENCE.map(([sym, val]) => (
          <div className="tool-stat" key={sym}>
            <div className="tool-stat-num">{sym}</div>
            <div className="tool-stat-label">{val}</div>
          </div>
        ))}
      </div>

      <p className="tool-note">
        Type a whole number from 1 to 3999 to get its Roman numeral, or type a
        Roman numeral to read off its value. Both directions convert instantly
        and only the standard, subtractive form (IV, IX, XL, XC, CD, CM) is
        accepted. Everything runs in your browser — nothing is uploaded.
      </p>
    </div>
  );
}
