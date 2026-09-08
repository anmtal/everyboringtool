"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const MODES = [
  { value: "chars", label: "Reverse characters (backwards text)" },
  { value: "words", label: "Reverse word order" },
  { value: "wordChars", label: "Reverse letters in each word" },
  { value: "lines", label: "Reverse line order" },
  { value: "eachLine", label: "Reverse characters, keep lines in place" },
  { value: "upsideDown", label: "Flip upside down (ʇxǝʇ)" },
];

// Split a string into grapheme clusters so emoji and accented characters
// survive being reversed. Falls back to code points where Segmenter is missing.
function toGraphemes(str) {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try {
      const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(seg.segment(str), (s) => s.segment);
    } catch (e) {
      // fall through to code-point split
    }
  }
  return Array.from(str); // code-point aware (keeps surrogate pairs intact)
}

function reverseString(str) {
  return toGraphemes(str).reverse().join("");
}

// Character map for flipping text upside down (rotated 180°).
const FLIP_MAP = {
  a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ᴉ",
  j: "ɾ", k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ",
  s: "s", t: "ʇ", u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z",
  A: "∀", B: "𐐒", C: "Ɔ", D: "◖", E: "Ǝ", F: "Ⅎ", G: "⅁", H: "H", I: "I",
  J: "ſ", K: "⋊", L: "˥", M: "W", N: "N", O: "O", P: "Ԁ", Q: "Ό", R: "ᴚ",
  S: "S", T: "⊥", U: "∩", V: "Λ", W: "M", X: "X", Y: "⅄", Z: "Z",
  "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "ϛ", "6": "9",
  "7": "ㄥ", "8": "8", "9": "6",
  ".": "˙", ",": "'", "'": ",", '"': "„", "`": ",", "?": "¿", "!": "¡",
  "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">",
  ">": "<", "&": "⅋", "_": "‾", "^": "v", ";": "؛",
};

function flipUpsideDown(str) {
  const flipped = Array.from(str)
    .map((ch) => FLIP_MAP[ch] || FLIP_MAP[ch.toLowerCase()] || ch)
    .join("");
  return reverseString(flipped);
}

function transform(text, mode) {
  switch (mode) {
    case "chars":
      return reverseString(text);
    case "words":
      // Reverse the order of whitespace-separated words per line.
      return text
        .split(/(\r\n|\r|\n)/)
        .map((part) =>
          /\r|\n/.test(part)
            ? part
            : part.split(/(\s+)/).reverse().join("")
        )
        .join("");
    case "wordChars":
      // Reverse the letters inside each word but keep word positions.
      return text.replace(/\S+/g, (w) => reverseString(w));
    case "lines":
      return text.split(/\r\n|\r|\n/).reverse().join("\n");
    case "eachLine":
      return text
        .split(/\r\n|\r|\n/)
        .map((line) => reverseString(line))
        .join("\n");
    case "upsideDown":
      // Flip characters and reverse so the whole string reads upside down.
      return flipUpsideDown(text);
    default:
      return text;
  }
}

export default function ReverseText() {
  const [text, setText] = useState("Hello, world!");
  const [mode, setMode] = useState("chars");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => transform(text, mode), [text, mode]);

  const stats = useMemo(() => {
    const words = text.trim() ? (text.trim().match(/\S+/g) || []).length : 0;
    const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
    return { characters: toGraphemes(text).length, words, lines };
  }, [text]);

  const fmt = (n) => n.toLocaleString("en-US");

  function handleTextChange(e) {
    setText(e.target.value);
    setCopied(false);
  }

  function handleModeChange(e) {
    setMode(e.target.value);
    setCopied(false);
  }

  function handleClear() {
    setText("");
    setCopied(false);
  }

  async function handleCopy() {
    if (!output) return;
    try {
      await copyText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="rt-mode">
            Reverse mode
          </label>
          <select
            id="rt-mode"
            className="tool-select"
            value={mode}
            onChange={handleModeChange}
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="rt-input">
            Your text
          </label>
          <textarea
            id="rt-input"
            className="tool-textarea"
            value={text}
            onChange={handleTextChange}
            placeholder="Type or paste your text here…"
            rows={8}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {output ? (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy result"}
            </button>
          </div>
          <label className="tool-label" htmlFor="rt-output">
            Reversed text
          </label>
          <pre className="tool-output" id="rt-output">
            {output}
          </pre>
        </div>
      ) : (
        <p className="tool-note">
          Type or paste some text above to see it reversed instantly.
        </p>
      )}

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.characters)}</div>
          <div className="tool-stat-label">Characters</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.words)}</div>
          <div className="tool-stat-label">Words</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.lines)}</div>
          <div className="tool-stat-label">Lines</div>
        </div>
      </div>

      <p className="tool-note">
        Reversing is grapheme-aware, so emoji and accented letters stay intact
        instead of breaking apart. "Reverse word order" flips each line's words,
        while the line modes keep your paragraph structure. Everything runs live
        in your browser and nothing you type is ever uploaded.
      </p>
    </div>
  );
}
