"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const OPERATIONS = [
  { value: "az", label: "Sort A → Z" },
  { value: "za", label: "Sort Z → A" },
  { value: "num-asc", label: "Numeric ↑" },
  { value: "num-desc", label: "Numeric ↓" },
  { value: "reverse", label: "Reverse" },
  { value: "shuffle", label: "Shuffle" },
];

function splitLines(text) {
  if (!text) return [];
  return text.split(/\r\n|\r|\n/);
}

// Apply the three preprocessing toggles before any ordering operation.
function preprocess(lines, { trim, removeBlank }) {
  let result = lines;
  if (trim) result = result.map((l) => l.trim());
  if (removeBlank) result = result.filter((l) => l.trim() !== "");
  return result;
}

function compareText(a, b, caseInsensitive) {
  const x = caseInsensitive ? a.toLowerCase() : a;
  const y = caseInsensitive ? b.toLowerCase() : b;
  return x.localeCompare(y, undefined, { numeric: false });
}

// Sort numerically. Lines that don't parse to a number keep their original
// order and are appended after the numeric lines so nothing is dropped.
function numericSort(lines, descending) {
  const tagged = lines.map((line, index) => ({
    line,
    index,
    value: parseFloat(line),
  }));
  const numbers = tagged.filter((o) => !Number.isNaN(o.value));
  const others = tagged.filter((o) => Number.isNaN(o.value));
  numbers.sort((a, b) => {
    if (a.value === b.value) return a.index - b.index; // stable for ties
    return descending ? b.value - a.value : a.value - b.value;
  });
  return [...numbers.map((o) => o.line), ...others.map((o) => o.line)];
}

// Fisher–Yates shuffle backed by crypto for a genuinely random order.
function shuffle(lines) {
  const arr = lines.slice();
  const rnd = new Uint32Array(1);
  for (let i = arr.length - 1; i > 0; i--) {
    crypto.getRandomValues(rnd);
    const j = rnd[0] % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function applyOperation(lines, operation, caseInsensitive) {
  const arr = lines.slice();
  switch (operation) {
    case "az":
      return arr.sort((a, b) => compareText(a, b, caseInsensitive));
    case "za":
      return arr.sort((a, b) => compareText(b, a, caseInsensitive));
    case "num-asc":
      return numericSort(arr, false);
    case "num-desc":
      return numericSort(arr, true);
    case "reverse":
      return arr.reverse();
    case "shuffle":
      return shuffle(arr);
    default:
      return arr;
  }
}

export default function SortLines() {
  const [text, setText] = useState("");
  const [operation, setOperation] = useState("az");
  const [caseInsensitive, setCaseInsensitive] = useState(false);
  const [trim, setTrim] = useState(false);
  const [removeBlank, setRemoveBlank] = useState(false);
  // Bumped on every Shuffle click so the shuffle re-runs even for the same input.
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [copied, setCopied] = useState(false);

  const inputLines = useMemo(() => splitLines(text), [text]);

  const outputLines = useMemo(() => {
    if (!text) return [];
    const processed = preprocess(inputLines, { trim, removeBlank });
    // shuffleSeed is read so the memo recomputes on each shuffle request.
    return applyOperation(processed, operation, caseInsensitive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, inputLines, operation, caseInsensitive, trim, removeBlank, shuffleSeed]);

  const output = outputLines.join("\n");

  const fmt = (n) => n.toLocaleString("en-US");

  function handleTextChange(e) {
    setText(e.target.value);
    setCopied(false);
  }

  function handleOperation(op) {
    if (op === "shuffle" && operation === "shuffle") {
      setShuffleSeed((s) => s + 1);
    } else if (op === "shuffle") {
      setShuffleSeed((s) => s + 1);
      setOperation(op);
    } else {
      setOperation(op);
    }
    setCopied(false);
  }

  function toggle(setter) {
    return (e) => {
      setter(e.target.checked);
      setCopied(false);
    };
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

  const inputCount = text ? inputLines.length : 0;
  const outputCount = outputLines.length;
  const removedCount = Math.max(0, inputCount - outputCount);

  const checkboxLabel = {
    display: "flex",
    alignItems: "center",
    gap: "0.5em",
    cursor: "pointer",
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="sl-input">
            Your lines
          </label>
          <textarea
            id="sl-input"
            className="tool-textarea"
            value={text}
            onChange={handleTextChange}
            placeholder={"Paste your list here, one item per line…"}
            rows={10}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" style={checkboxLabel}>
              <input
                type="checkbox"
                checked={caseInsensitive}
                onChange={toggle(setCaseInsensitive)}
              />
              Case-insensitive
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" style={checkboxLabel}>
              <input
                type="checkbox"
                checked={trim}
                onChange={toggle(setTrim)}
              />
              Trim whitespace
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" style={checkboxLabel}>
              <input
                type="checkbox"
                checked={removeBlank}
                onChange={toggle(setRemoveBlank)}
              />
              Remove blank lines
            </label>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        {OPERATIONS.map((op) => (
          <button
            key={op.value}
            type="button"
            className={operation === op.value ? "btn btn-primary" : "btn"}
            onClick={() => handleOperation(op.value)}
          >
            {op.label}
          </button>
        ))}
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
          <label className="tool-label" htmlFor="sl-output">
            Result — {fmt(outputCount)} {outputCount === 1 ? "line" : "lines"}
          </label>
          <textarea
            id="sl-output"
            className="tool-textarea"
            value={output}
            readOnly
            rows={10}
            spellCheck={false}
          />
        </div>
      ) : (
        <p className="tool-note">
          Enter some lines above, then pick a sort order. Sorting, reversing, and
          shuffling all happen instantly as you type or change options.
        </p>
      )}

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(inputCount)}</div>
          <div className="tool-stat-label">Input lines</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(outputCount)}</div>
          <div className="tool-stat-label">Output lines</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(removedCount)}</div>
          <div className="tool-stat-label">Removed</div>
        </div>
      </div>

      <p className="tool-note">
        Sort alphabetically (A → Z or Z → A), numerically, reverse the order, or
        shuffle lines into a random order. Numeric sort reads the number at the
        start of each line and keeps non-numeric lines at the end. Everything runs
        live in your browser, and nothing you paste is ever uploaded.
      </p>
    </div>
  );
}
