"use client";

import { useMemo, useState } from "react";

const MODES = [
  { value: "upper", label: "UPPERCASE" },
  { value: "lower", label: "lowercase" },
  { value: "title", label: "Title Case" },
  { value: "sentence", label: "Sentence case" },
  { value: "camel", label: "camelCase" },
  { value: "snake", label: "snake_case" },
  { value: "kebab", label: "kebab-case" },
];

// Small set of words kept lowercase in Title Case unless they lead the string.
const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "if", "in",
  "into", "nor", "of", "off", "on", "onto", "or", "over", "per", "so",
  "the", "to", "up", "via", "vs", "with", "yet",
]);

function toTitleCase(text) {
  return text.replace(/\S+/g, (word, offset, full) => {
    const lower = word.toLowerCase();
    // Preserve the boundary: first word of the whole string is always capitalized.
    const isFirst = offset === 0 || /^\s*$/.test(full.slice(0, offset));
    if (!isFirst && MINOR_WORDS.has(lower.replace(/[^a-z]/g, ""))) {
      return lower;
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

function toSentenceCase(text) {
  const lower = text.toLowerCase();
  // Capitalize the first letter after the start or after ., !, ? terminators.
  return lower.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, lead, letter) => lead + letter.toUpperCase());
}

// Break arbitrary text into word tokens for programmer-style cases.
function splitWords(text) {
  return text
    // Insert a break between a lowercase/digit and an uppercase letter (camelCase input).
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // Split on anything that is not a letter or number.
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function toCamelCase(text) {
  const words = splitWords(text);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

function toSnakeCase(text) {
  return splitWords(text)
    .map((w) => w.toLowerCase())
    .join("_");
}

function toKebabCase(text) {
  return splitWords(text)
    .map((w) => w.toLowerCase())
    .join("-");
}

function convert(text, mode) {
  switch (mode) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return toTitleCase(text);
    case "sentence":
      return toSentenceCase(text);
    case "camel":
      return toCamelCase(text);
    case "snake":
      return toSnakeCase(text);
    case "kebab":
      return toKebabCase(text);
    default:
      return text;
  }
}

export default function CaseConverter() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("upper");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => convert(text, mode), [text, mode]);

  const stats = useMemo(() => {
    const words = text.trim() ? (text.trim().match(/\S+/g) || []).length : 0;
    const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
    return { characters: text.length, words, lines };
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
      await navigator.clipboard.writeText(output);
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
          <label className="tool-label" htmlFor="cc-mode">
            Convert to
          </label>
          <select
            id="cc-mode"
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
          <label className="tool-label" htmlFor="cc-input">
            Your text
          </label>
          <textarea
            id="cc-input"
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
          <label className="tool-label" htmlFor="cc-output">
            Converted text
          </label>
          <pre className="tool-output" id="cc-output">
            {output}
          </pre>
        </div>
      ) : null}

      <div className="tool-stat-grid">
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
        Choose a style to transform your text instantly. camelCase, snake_case,
        and kebab-case ignore punctuation and split on spaces and capital
        letters. Everything runs live in your browser, and nothing you type is
        ever uploaded.
      </p>
    </div>
  );
}
