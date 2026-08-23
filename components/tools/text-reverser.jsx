"use client";

import { useMemo, useState } from "react";

// Reverse a string by Unicode code points (not UTF-16 units) so that
// emoji and other astral-plane characters are not split into broken halves.
function reverseCharacters(text) {
  return Array.from(text).reverse().join("");
}

// Reverse the order of words on each line, preserving the run of whitespace
// between them so a single line stays a single line.
function reverseWords(text) {
  return text
    .split(/(\r\n|\r|\n)/)
    .map((part) => {
      // Keep line breaks exactly as they were.
      if (part === "\n" || part === "\r" || part === "\r\n") return part;
      // Split on whitespace but keep the separators so spacing is preserved.
      const tokens = part.split(/(\s+)/);
      const words = tokens.filter((t) => t.length > 0 && !/^\s+$/.test(t));
      const seps = tokens.filter((t) => /^\s+$/.test(t));
      const reversed = words.reverse();
      // Re-weave the reversed words with the original separators, honouring
      // any leading/trailing whitespace on the line.
      const leading = /^\s/.test(part) ? seps.shift() || "" : "";
      let out = leading;
      for (let i = 0; i < reversed.length; i++) {
        out += reversed[i];
        if (i < reversed.length - 1) out += seps[i] != null ? seps[i] : " ";
      }
      if (/\s$/.test(part) && seps.length) out += seps[seps.length - 1];
      return out;
    })
    .join("");
}

// Reverse the order of lines, keeping the original newline style.
function reverseLines(text) {
  const parts = text.split(/(\r\n|\r|\n)/);
  const lines = [];
  const breaks = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) lines.push(parts[i]);
    else breaks.push(parts[i]);
  }
  const revLines = lines.slice().reverse();
  let out = "";
  for (let i = 0; i < revLines.length; i++) {
    out += revLines[i];
    if (i < breaks.length) out += breaks[i];
  }
  return out;
}

const MODES = [
  {
    key: "characters",
    label: "Characters reversed",
    hint: "Every character flipped end to end (emoji-safe).",
    transform: reverseCharacters,
  },
  {
    key: "words",
    label: "Word order reversed",
    hint: "Words on each line placed in reverse order.",
    transform: reverseWords,
  },
  {
    key: "lines",
    label: "Line order reversed",
    hint: "The whole text flipped bottom line to top.",
    transform: reverseLines,
  },
];

export default function TextReverser() {
  const [text, setText] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  const results = useMemo(
    () => MODES.map((m) => ({ ...m, value: m.transform(text) })),
    [text]
  );

  const stats = useMemo(() => {
    const chars = Array.from(text).length;
    const words = text.trim() ? (text.trim().match(/\S+/g) || []).length : 0;
    const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
    return { chars, words, lines };
  }, [text]);

  const fmt = (n) => n.toLocaleString("en-US");

  function handleTextChange(e) {
    setText(e.target.value);
    setCopiedKey("");
  }

  function handleClear() {
    setText("");
    setCopiedKey("");
  }

  async function handleCopy(key, value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1500);
    } catch (e) {
      setCopiedKey("");
    }
  }

  const hasInput = text.length > 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="tr-input">
            Your text
          </label>
          <textarea
            id="tr-input"
            className="tool-textarea"
            value={text}
            onChange={handleTextChange}
            placeholder="Type or paste your text here…"
            rows={7}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {hasInput ? (
        <>
          {results.map((r) => (
            <div className="tool-field" key={r.key}>
              <div className="tool-actions">
                <button
                  className={
                    copiedKey === r.key ? "btn btn-success" : "btn btn-primary"
                  }
                  type="button"
                  onClick={() => handleCopy(r.key, r.value)}
                >
                  {copiedKey === r.key ? "Copied!" : "Copy"}
                </button>
              </div>
              <label className="tool-label" htmlFor={`tr-out-${r.key}`}>
                {r.label}
              </label>
              <pre className="tool-output" id={`tr-out-${r.key}`}>
                {r.value}
              </pre>
              <p className="tool-note">{r.hint}</p>
            </div>
          ))}
        </>
      ) : null}

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.chars)}</div>
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
        Enter any text to see it reversed three ways at once: character by
        character, with the word order flipped, and with the line order flipped.
        Emoji and accented characters are handled safely so they never break
        apart. Everything runs live in your browser, and nothing you type is ever
        uploaded.
      </p>
    </div>
  );
}
