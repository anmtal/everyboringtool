"use client";

import { useState } from "react";
import { copyText } from "../../lib/copyText";

// JSON.parse turns every number into a JS double, so integers past 2^53 come
// back rounded (12345678901234567890 -> 12345678901234567000). We can't fix
// that without a custom parser, but we can warn. Scan the raw text, skipping
// anything inside a "..." string literal, and flag runs of 16+ digits.
function hasUnsafeLongNumber(src) {
  if (!src) return false;
  let inString = false;
  let escaped = false;
  let run = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      run = 0;
      continue;
    }
    if (ch >= "0" && ch <= "9") {
      run++;
      if (run >= 16) return true;
    } else {
      run = 0;
    }
  }
  return false;
}

export default function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [repaired, setRepaired] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [precisionWarning, setPrecisionWarning] = useState(false);

  function process(minify) {
    setCopied(false);
    setRepaired(false);
    if (!input.trim()) {
      setOutput("");
      setError("");
      setPrecisionWarning(false);
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const result = minify
        ? JSON.stringify(parsed)
        : JSON.stringify(parsed, null, 2);
      setOutput(result);
      setError("");
      setPrecisionWarning(hasUnsafeLongNumber(input));
    } catch (e) {
      setOutput("");
      setError(e && e.message ? e.message : "Invalid JSON");
      setPrecisionWarning(false);
    }
  }

  function handleFormat() {
    process(false);
  }

  function handleMinify() {
    process(true);
  }

  // Opt-in: only offered after strict parsing fails. Fixes missing/trailing
  // commas, single quotes, unquoted keys, comments, etc., then pretty-prints.
  async function handleRepair() {
    if (!input.trim()) return;
    setRepairing(true);
    setCopied(false);
    try {
      const { jsonrepair } = await import("jsonrepair");
      const fixed = jsonrepair(input);
      const parsed = JSON.parse(fixed);
      setOutput(JSON.stringify(parsed, null, 2));
      setError("");
      setRepaired(true);
      setPrecisionWarning(hasUnsafeLongNumber(fixed));
    } catch (e) {
      setError(
        "Couldn't auto-repair this — it may be too malformed. Fix the spot the error points to and try Format again."
      );
      setOutput("");
      setRepaired(false);
      setPrecisionWarning(false);
    } finally {
      setRepairing(false);
    }
  }

  function handleClear() {
    setInput("");
    setOutput("");
    setError("");
    setCopied(false);
    setRepaired(false);
    setPrecisionWarning(false);
  }

  async function handleCopy() {
    if (!output) return;
    try {
      await copyText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="json-input">
            JSON input
          </label>
          <textarea
            className="tool-textarea"
            id="json-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setRepaired(false);
              setPrecisionWarning(false);
            }}
            placeholder='{"hello": "world", "items": [1, 2, 3]}'
            rows={10}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={handleFormat}
        >
          Format
        </button>
        <button className="btn" type="button" onClick={handleMinify}>
          Minify
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {error ? (
        <div className="tool-error" role="alert">
          <p style={{ margin: 0 }}>{error}</p>
          <button
            className="btn btn-sm"
            type="button"
            onClick={handleRepair}
            disabled={repairing}
            style={{ marginTop: 8 }}
          >
            {repairing ? "Repairing…" : "🔧 Repair & format"}
          </button>
        </div>
      ) : null}

      {output ? (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          {repaired ? (
            <p className="tool-note" style={{ color: "var(--live, #16a34a)" }}>
              ✓ Auto-repaired and formatted. Double-check the result matches what
              you intended.
            </p>
          ) : null}
          {precisionWarning ? (
            <p className="tool-note" style={{ color: "#b45309" }} role="status">
              Heads-up: numbers longer than 15 digits were rounded by
              JavaScript’s number precision. Wrap IDs in quotes to keep them
              exact.
            </p>
          ) : null}
          <label className="tool-label" htmlFor="json-output">
            Result
          </label>
          <pre className="tool-output" id="json-output">
            {output}
          </pre>
        </div>
      ) : null}

      {!output && !error ? (
        <p className="tool-note">
          Paste JSON above, then click Format to pretty-print it with 2-space
          indentation, or Minify to strip whitespace. If it’s broken, Format
          points to the error and offers a one-click repair.
        </p>
      ) : null}
    </div>
  );
}
