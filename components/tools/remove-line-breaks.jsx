"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const SAMPLE = `The quick brown fox
jumps over the lazy dog.
It was a bright cold day
in April.

The clocks were
striking thirteen.`;

const MODES = [
  {
    value: "spaces",
    label: "Replace line breaks with spaces",
  },
  {
    value: "remove",
    label: "Remove line breaks entirely (join)",
  },
  {
    value: "paragraphs",
    label: "Unwrap lines, keep paragraph breaks",
  },
  {
    value: "blank",
    label: "Remove only blank (empty) lines",
  },
];

// Normalize all newline styles (Windows \r\n, old Mac \r) to \n first.
function normalize(text) {
  return text.replace(/\r\n?/g, "\n");
}

function collapseSpaces(text, on) {
  if (!on) return text;
  // Collapse runs of spaces/tabs into a single space, but leave newlines alone.
  return text.replace(/[ \t]{2,}/g, " ");
}

function process(text, mode, opts) {
  if (!text) return "";
  let out = normalize(text);

  if (opts.trimLines) {
    out = out
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/g, "").replace(/^[ \t]+/g, ""))
      .join("\n");
  }

  if (mode === "spaces") {
    // Every line break becomes a single space.
    out = out.replace(/\n+/g, " ");
    out = collapseSpaces(out, opts.collapseSpaces);
  } else if (mode === "remove") {
    // Line breaks vanish with nothing between the joined text.
    out = out.replace(/\n+/g, "");
    out = collapseSpaces(out, opts.collapseSpaces);
  } else if (mode === "paragraphs") {
    // A blank line (two+ newlines) separates paragraphs and is preserved as
    // one blank line. Single newlines inside a paragraph become spaces.
    out = out
      .split(/\n[ \t]*\n+/)
      .map((para) => collapseSpaces(para.replace(/\n+/g, " ").trim(), opts.collapseSpaces))
      .filter((para) => para.length > 0)
      .join("\n\n");
  } else if (mode === "blank") {
    // Keep real line breaks; only drop lines that are empty/whitespace-only.
    out = out
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .join("\n");
    out = collapseSpaces(out, opts.collapseSpaces);
  }

  if (opts.trimResult) out = out.trim();
  return out;
}

export default function RemoveLineBreaks() {
  const [text, setText] = useState(SAMPLE);
  const [mode, setMode] = useState("spaces");
  const [collapseSpacesOpt, setCollapseSpacesOpt] = useState(true);
  const [trimLines, setTrimLines] = useState(true);
  const [trimResult, setTrimResult] = useState(true);
  const [copied, setCopied] = useState(false);

  const output = useMemo(
    () =>
      process(text, mode, {
        collapseSpaces: collapseSpacesOpt,
        trimLines,
        trimResult,
      }),
    [text, mode, collapseSpacesOpt, trimLines, trimResult]
  );

  const stats = useMemo(() => {
    const norm = normalize(text);
    const breaksBefore = (norm.match(/\n/g) || []).length;
    const breaksAfter = (normalize(output).match(/\n/g) || []).length;
    return {
      breaksBefore,
      breaksAfter,
      removed: Math.max(breaksBefore - breaksAfter, 0),
      charsOut: output.length,
    };
  }, [text, output]);

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
    } catch (err) {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="rlb-mode">
            What to do with line breaks
          </label>
          <select
            id="rlb-mode"
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
          <label className="tool-label" htmlFor="rlb-input">
            Your text
          </label>
          <textarea
            id="rlb-input"
            className="tool-textarea"
            value={text}
            onChange={handleTextChange}
            placeholder="Paste text with unwanted line breaks here…"
            rows={8}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rlb-collapse">
              <input
                id="rlb-collapse"
                type="checkbox"
                checked={collapseSpacesOpt}
                onChange={(e) => {
                  setCollapseSpacesOpt(e.target.checked);
                  setCopied(false);
                }}
              />{" "}
              Collapse double spaces
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rlb-trimlines">
              <input
                id="rlb-trimlines"
                type="checkbox"
                checked={trimLines}
                onChange={(e) => {
                  setTrimLines(e.target.checked);
                  setCopied(false);
                }}
              />{" "}
              Trim spaces at line ends
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rlb-trimresult">
              <input
                id="rlb-trimresult"
                type="checkbox"
                checked={trimResult}
                onChange={(e) => {
                  setTrimResult(e.target.checked);
                  setCopied(false);
                }}
              />{" "}
              Trim final result
            </label>
          </div>
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
          <label className="tool-label" htmlFor="rlb-output">
            Cleaned text
          </label>
          <pre className="tool-output" id="rlb-output">
            {output}
          </pre>
        </div>
      ) : (
        <p className="tool-note">
          Paste some text above to strip out its line breaks. Your text stays on
          this page and is never uploaded.
        </p>
      )}

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.breaksBefore)}</div>
          <div className="tool-stat-label">Line breaks in</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.removed)}</div>
          <div className="tool-stat-label">Breaks removed</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.charsOut)}</div>
          <div className="tool-stat-label">Characters out</div>
        </div>
      </div>

      <p className="tool-note">
        Handles Windows, Mac, and Unix line endings automatically. Use
        &ldquo;keep paragraph breaks&rdquo; to unwrap text copied from PDFs or
        emails while preserving where each paragraph starts. Everything runs
        live in your browser.
      </p>
    </div>
  );
}
