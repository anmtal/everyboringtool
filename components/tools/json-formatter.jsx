"use client";

import { useState } from "react";
import { copyText } from "../../lib/copyText";

export default function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [repaired, setRepaired] = useState(false);
  const [repairing, setRepairing] = useState(false);

  function process(minify) {
    setCopied(false);
    setRepaired(false);
    if (!input.trim()) {
      setOutput("");
      setError("");
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const result = minify
        ? JSON.stringify(parsed)
        : JSON.stringify(parsed, null, 2);
      setOutput(result);
      setError("");
    } catch (e) {
      setOutput("");
      setError(e && e.message ? e.message : "Invalid JSON");
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
    } catch (e) {
      setError(
        "Couldn't auto-repair this — it may be too malformed. Fix the spot the error points to and try Format again."
      );
      setOutput("");
      setRepaired(false);
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
