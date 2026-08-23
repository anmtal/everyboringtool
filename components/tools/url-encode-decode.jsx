"use client";

import { useState, useMemo } from "react";

export default function UrlEncodeDecode() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("encode"); // "encode" | "decode"
  const [scope, setScope] = useState("component"); // "component" | "full"
  const [copied, setCopied] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input) return { output: "", error: "" };
    try {
      let result;
      if (mode === "encode") {
        result =
          scope === "component"
            ? encodeURIComponent(input)
            : encodeURI(input);
      } else {
        result =
          scope === "component"
            ? decodeURIComponent(input)
            : decodeURI(input);
      }
      return { output: result, error: "" };
    } catch (e) {
      return {
        output: "",
        error:
          mode === "decode"
            ? "Could not decode: the input contains malformed percent-encoding (for example a stray % or an incomplete %XX sequence)."
            : "Could not encode the input.",
      };
    }
  }, [input, mode, scope]);

  function handleCopy() {
    if (!output) return;
    try {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function handleSwap() {
    // Move the current output into the input and flip the mode, so users
    // can chain encode -> decode (or vice versa) without retyping.
    if (output) setInput(output);
    setMode((m) => (m === "encode" ? "decode" : "encode"));
  }

  function handleClear() {
    setInput("");
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="url-mode">
              Mode
            </label>
            <select
              id="url-mode"
              className="tool-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="encode">Encode</option>
              <option value="decode">Decode</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="url-scope">
              Scope
            </label>
            <select
              id="url-scope"
              className="tool-select"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="component">
                Component (encodeURIComponent)
              </option>
              <option value="full">Full URL (encodeURI)</option>
            </select>
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="url-input">
            {mode === "encode" ? "Text to encode" : "Text to decode"}
          </label>
          <textarea
            id="url-input"
            className="tool-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "encode"
                ? "https://example.com/search?q=hello world & more"
                : "https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world"
            }
            rows={5}
            spellCheck="false"
          />
        </div>

        <p className="tool-note">
          {scope === "component"
            ? "Component mode encodes reserved characters like : / ? & = # — use it for a single query value or path segment."
            : "Full URL mode keeps reserved characters like : / ? & = # intact — use it to encode a complete URL."}
        </p>

        <div className="tool-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSwap}
            disabled={!input}
          >
            Swap (use result as input)
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleClear}
            disabled={!input}
          >
            Clear
          </button>
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}

      {output && !error ? (
        <>
          <div className="tool-result">
            <span className="tool-result-label">
              {mode === "encode" ? "Encoded output" : "Decoded output"}
            </span>
            <span className="tool-result-value" style={{ wordBreak: "break-all" }}>
              {output}
            </span>
          </div>

          <pre className="tool-output">{output}</pre>

          <div className="tool-actions">
            <button
              type="button"
              className={copied ? "btn btn-success" : "btn"}
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy result"}
            </button>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <span className="tool-stat-num">{input.length}</span>
              <span className="tool-stat-label">Input characters</span>
            </div>
            <div className="tool-stat">
              <span className="tool-stat-num">{output.length}</span>
              <span className="tool-stat-label">Output characters</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
