"use client";

import { useState } from "react";
import { copyText } from "../../lib/copyText";

export default function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function process(minify) {
    setCopied(false);
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

  function handleClear() {
    setInput("");
    setOutput("");
    setError("");
    setCopied(false);
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
            onChange={(e) => setInput(e.target.value)}
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

      {error ? <p className="tool-error">{error}</p> : null}

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
          indentation or Minify to strip whitespace.
        </p>
      ) : null}
    </div>
  );
}
