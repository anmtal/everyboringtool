"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// 0-19 spelled out directly; 20-90 handled with TENS + a hyphenated one.
const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
  "sixteen", "seventeen", "eighteen", "nineteen",
];

const TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty",
  "ninety",
];

// Scale names for each group of three digits, lowest first. Index 0 is the
// units group (no scale word); the list reaches decillion (10^33), so the
// tool covers whole numbers up to 36 digits — far past the trillions.
const SCALES = [
  "", "thousand", "million", "billion", "trillion", "quadrillion",
  "quintillion", "sextillion", "septillion", "octillion", "nonillion",
  "decillion",
];

const MAX_DIGITS = SCALES.length * 3; // 36

// Convert a plain number 0-999 into words ("two hundred thirty-four").
function chunkToWords(n) {
  const parts = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(ONES[hundreds] + " hundred");
  if (rest) {
    if (rest < 20) {
      parts.push(ONES[rest]);
    } else {
      const t = Math.floor(rest / 10);
      const o = rest % 10;
      parts.push(o ? TENS[t] + "-" + ONES[o] : TENS[t]);
    }
  }
  return parts.join(" ");
}

// Convert a non-negative BigInt magnitude into words. Returns null when the
// value is larger than the highest supported scale.
function magnitudeToWords(mag) {
  if (mag === 0n) return "zero";

  // Split into three-digit groups, lowest first.
  const groups = [];
  let n = mag;
  while (n > 0n) {
    groups.push(Number(n % 1000n));
    n = n / 1000n;
  }
  if (groups.length > SCALES.length) return null; // out of range

  const words = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const chunk = chunkToWords(g);
    const scale = SCALES[i];
    words.push(scale ? chunk + " " + scale : chunk);
  }
  return words.join(" ");
}

// Parse an integer input: optional sign, grouping commas/underscores/spaces,
// digits only. Returns { empty }, { error } or { sign, mag }.
function parseInteger(raw) {
  let s = String(raw).trim();
  if (s === "") return { empty: true };
  let sign = 1;
  if (s[0] === "+" || s[0] === "-") {
    if (s[0] === "-") sign = -1;
    s = s.slice(1);
  }
  // The note under the tool promises a leading $ is ignored, but Words mode
  // rejected "$1,234" as invalid. Drop the currency symbol before the grouping
  // separators come off.
  s = s.replace(/^\$/, "");
  s = s.replace(/[,_\s]/g, "");
  if (s === "") return { error: "empty" };
  if (s.includes(".")) return { error: "decimal" };
  if (!/^[0-9]+$/.test(s)) return { error: "invalid" };
  const trimmed = s.replace(/^0+(?=\d)/, "");
  if (trimmed.length > MAX_DIGITS) return { error: "big" };
  return { sign, mag: BigInt(trimmed) };
}

// Parse a currency input into whole dollars and 0-99 cents (BigInt), rounding
// half-up on the third decimal. Handles $ signs and grouping separators.
function parseCurrency(raw) {
  let s = String(raw).trim();
  if (s === "") return { empty: true };
  let sign = 1;
  if (s[0] === "+" || s[0] === "-") {
    if (s[0] === "-") sign = -1;
    s = s.slice(1);
  }
  s = s.replace(/[$,_\s]/g, "");
  if (s === "" || s === ".") return { error: "empty" };
  if (!/^[0-9]*\.?[0-9]*$/.test(s)) return { error: "invalid" };

  let [intPart = "", fracPart = ""] = s.split(".");
  intPart = intPart.replace(/^0+(?=\d)/, "") || "0";
  if (intPart.length > MAX_DIGITS) return { error: "big" };

  let cents;
  if (fracPart.length <= 2) {
    cents = BigInt((fracPart + "00").slice(0, 2) || "0");
  } else {
    cents = BigInt(fracPart.slice(0, 2));
    if (fracPart.charCodeAt(2) - 48 >= 5) cents += 1n; // round half-up
  }
  let dollars = BigInt(intPart);
  if (cents === 100n) {
    dollars += 1n;
    cents = 0n;
  }
  return { sign, dollars, cents };
}

// Re-case the finished lowercase phrase per the selected output style.
function applyCase(text, mode) {
  if (!text) return text;
  switch (mode) {
    case "upper":
      return text.toUpperCase();
    case "sentence":
      return text.charAt(0).toUpperCase() + text.slice(1);
    case "title":
      return text.replace(/(^|[\s-])([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
    default:
      return text;
  }
}

const GROUPER = new Intl.NumberFormat("en-US");

export default function NumberToWords() {
  const [input, setInput] = useState("1234");
  const [mode, setMode] = useState("words"); // "words" | "currency"
  const [letterCase, setLetterCase] = useState("lower");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (mode === "currency") {
      const p = parseCurrency(input);
      if (p.empty) return { empty: true };
      if (p.error) return { error: p.error };
      const dollarWords = magnitudeToWords(p.dollars);
      const centWords = magnitudeToWords(p.cents);
      if (dollarWords === null || centWords === null) return { error: "big" };
      const dollarUnit = p.dollars === 1n ? "dollar" : "dollars";
      const centUnit = p.cents === 1n ? "cent" : "cents";
      let phrase = `${dollarWords} ${dollarUnit} and ${centWords} ${centUnit}`;
      const isZero = p.dollars === 0n && p.cents === 0n;
      if (p.sign === -1 && !isZero) phrase = "negative " + phrase;
      const centStr = p.cents.toString().padStart(2, "0");
      const formatted =
        (p.sign === -1 && !isZero ? "-" : "") +
        "$" +
        GROUPER.format(p.dollars) +
        "." +
        centStr;
      return { words: phrase, formatted, digits: p.dollars.toString().length };
    }

    const p = parseInteger(input);
    if (p.empty) return { empty: true };
    if (p.error) return { error: p.error };
    const words = magnitudeToWords(p.mag);
    if (words === null) return { error: "big" };
    let phrase = words;
    if (p.sign === -1 && p.mag !== 0n) phrase = "negative " + phrase;
    const signed = p.sign === -1 && p.mag !== 0n ? -p.mag : p.mag;
    return {
      words: phrase,
      formatted: GROUPER.format(signed),
      digits: p.mag.toString().length,
    };
  }, [input, mode]);

  const output = result.words ? applyCase(result.words, letterCase) : "";
  const wordCount = result.words
    ? result.words.split(/[\s-]+/).filter(Boolean).length
    : 0;

  const errorText = (() => {
    switch (result.error) {
      case "decimal":
        return "Words mode handles whole numbers only. Switch to Currency (USD) to read cents, or remove the decimal point.";
      case "big":
        return "That number is too large — this tool goes up to 36 digits (decillions).";
      case "invalid":
        return mode === "currency"
          ? "Enter a dollar amount using digits and an optional decimal point, e.g. 1234.56."
          : "Enter a whole number using digits only. Commas, spaces, and a leading minus sign are allowed.";
      default:
        return "Enter a number to convert.";
    }
  })();

  async function copy() {
    if (!output) return;
    try {
      await copyText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard may be blocked (permissions / insecure context); ignore.
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ntw-input">
              Number to convert
            </label>
            <input
              id="ntw-input"
              className="tool-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              inputMode="decimal"
              placeholder={mode === "currency" ? "e.g. 1234.56" : "e.g. 1234"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="ntw-mode">
              Mode
            </label>
            <select
              id="ntw-mode"
              className="tool-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="words">Words</option>
              <option value="currency">Currency (USD)</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="ntw-case">
              Letter case
            </label>
            <select
              id="ntw-case"
              className="tool-select"
              value={letterCase}
              onChange={(e) => setLetterCase(e.target.value)}
            >
              <option value="lower">lowercase</option>
              <option value="sentence">Sentence case</option>
              <option value="title">Title Case</option>
              <option value="upper">UPPERCASE</option>
            </select>
          </div>
        </div>
      </div>

      {result.empty || result.error ? (
        result.error ? (
          <p className="tool-error">{errorText}</p>
        ) : (
          <p className="tool-note">{errorText}</p>
        )
      ) : (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">
              In words{" "}
              {result.formatted ? (
                <span style={{ opacity: 0.7 }}>
                  ({result.formatted})
                </span>
              ) : null}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                className="tool-result-value"
                style={{ lineHeight: 1.4, wordBreak: "break-word" }}
              >
                {output}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={copy}
                disabled={!output}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{result.digits}</div>
              <div className="tool-stat-label">
                {mode === "currency" ? "Dollar digits" : "Digits"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{wordCount}</div>
              <div className="tool-stat-label">Words</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{output.length}</div>
              <div className="tool-stat-label">Characters</div>
            </div>
          </div>
        </>
      )}

      <p className="tool-note">
        Type any whole number and it spells out in English instantly — negatives
        and zero included, all the way into the trillions and beyond. Switch to
        Currency mode to read an amount as dollars and cents. Commas, spaces, and
        a leading $ are ignored, so you can paste figures as-is. Everything runs
        in your browser; nothing is uploaded.
      </p>
    </div>
  );
}
