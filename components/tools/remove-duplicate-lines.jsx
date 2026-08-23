"use client";

import { useMemo, useState } from "react";

// Split text into lines, preserving the split so counts stay predictable.
function splitLines(text) {
  if (!text) return [];
  return text.split(/\r\n|\r|\n/);
}

// Build the deduplicated output plus counts. Keeps the first occurrence of
// each line in its original order.
function dedupe(text, { caseInsensitive, trimLines, removeBlank }) {
  const rawLines = splitLines(text);
  const seen = new Set();
  const kept = [];

  for (const raw of rawLines) {
    const line = trimLines ? raw.trim() : raw;

    // Drop blank lines when requested (blank is judged after optional trim).
    if (removeBlank && line.trim() === "") continue;

    // The comparison key normalizes case when case-insensitive is on. When
    // trimming is off we still compare on the raw text so identical-looking
    // lines with different leading/trailing spaces count as distinct.
    const key = caseInsensitive ? line.toLowerCase() : line;

    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(line);
  }

  // Original count reflects the number of content lines considered. An empty
  // string has zero lines; a trailing newline is a real (empty) line.
  const originalCount = text === "" ? 0 : rawLines.length;
  const uniqueCount = kept.length;
  const removedCount = Math.max(0, originalCount - uniqueCount);

  return {
    output: kept.join("\n"),
    originalCount,
    uniqueCount,
    removedCount,
  };
}

export default function RemoveDuplicateLines() {
  const [text, setText] = useState("");
  const [caseInsensitive, setCaseInsensitive] = useState(false);
  const [trimLines, setTrimLines] = useState(true);
  const [removeBlank, setRemoveBlank] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => dedupe(text, { caseInsensitive, trimLines, removeBlank }),
    [text, caseInsensitive, trimLines, removeBlank]
  );

  const fmt = (n) => n.toLocaleString("en-US");

  function handleTextChange(e) {
    setText(e.target.value);
    setCopied(false);
  }

  function handleClear() {
    setText("");
    setCopied(false);
  }

  async function handleCopy() {
    if (!result.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
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
          <label className="tool-label" htmlFor="rdl-input">
            Your text
          </label>
          <textarea
            id="rdl-input"
            className="tool-textarea"
            value={text}
            onChange={handleTextChange}
            placeholder="Paste your list here, one item per line…"
            rows={8}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rdl-case">
              <input
                id="rdl-case"
                type="checkbox"
                checked={caseInsensitive}
                onChange={(e) => {
                  setCaseInsensitive(e.target.checked);
                  setCopied(false);
                }}
              />{" "}
              Case-insensitive
            </label>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="rdl-trim">
              <input
                id="rdl-trim"
                type="checkbox"
                checked={trimLines}
                onChange={(e) => {
                  setTrimLines(e.target.checked);
                  setCopied(false);
                }}
              />{" "}
              Trim each line
            </label>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="rdl-blank">
              <input
                id="rdl-blank"
                type="checkbox"
                checked={removeBlank}
                onChange={(e) => {
                  setRemoveBlank(e.target.checked);
                  setCopied(false);
                }}
              />{" "}
              Remove blank lines
            </label>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {result.output ? (
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
          <label className="tool-label" htmlFor="rdl-output">
            Unique lines
          </label>
          <textarea
            id="rdl-output"
            className="tool-textarea"
            value={result.output}
            readOnly
            rows={8}
            spellCheck={false}
          />
        </div>
      ) : null}

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(result.originalCount)}</div>
          <div className="tool-stat-label">Original lines</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(result.uniqueCount)}</div>
          <div className="tool-stat-label">Unique lines</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(result.removedCount)}</div>
          <div className="tool-stat-label">Duplicates removed</div>
        </div>
      </div>

      <p className="tool-note">
        Duplicate lines are removed while the first occurrence of each line
        keeps its original position. Everything runs live in your browser, and
        nothing you paste is ever uploaded.
      </p>
    </div>
  );
}
