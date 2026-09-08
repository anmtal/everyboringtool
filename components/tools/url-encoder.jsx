"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Encode/decode helpers.
// "component" uses encodeURIComponent (escapes / ? & = # etc.) — for a single query value or path segment.
// "full" uses encodeURI (leaves URL structure chars like / ? & = # intact) — for a whole address.
function doEncode(text, scope) {
  return scope === "full" ? encodeURI(text) : encodeURIComponent(text);
}

function doDecode(text, scope) {
  // Many pasted URLs use "+" for spaces in the query string. Only expand it for component decoding.
  const prepared = scope === "component" ? text.replace(/\+/g, " ") : text;
  return scope === "full" ? decodeURI(prepared) : decodeURIComponent(prepared);
}

const EXAMPLE = "https://example.com/search?q=café & cream&page=2";

export default function UrlEncoder() {
  const [mode, setMode] = useState("encode");
  const [scope, setScope] = useState("component");
  const [input, setInput] = useState(EXAMPLE);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input) {
      return { output: "", error: "" };
    }
    try {
      const output =
        mode === "encode" ? doEncode(input, scope) : doDecode(input, scope);
      return { output, error: "" };
    } catch (e) {
      return {
        output: "",
        error:
          mode === "decode"
            ? "That is not valid percent-encoding. Check for a stray % or an incomplete %XX sequence."
            : "Could not encode this text.",
      };
    }
  }, [input, mode, scope]);

  function resetCopied() {
    setCopied(false);
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    resetCopied();
  }

  function handleClear() {
    setInput("");
    resetCopied();
  }

  function handleSwap() {
    // Push the current output back into the input and flip the mode.
    if (result.output) {
      setInput(result.output);
    }
    setMode(mode === "encode" ? "decode" : "encode");
    resetCopied();
  }

  async function handleCopy() {
    if (!result.output) return;
    try {
      await copyText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
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
              onChange={(e) => {
                setMode(e.target.value);
                resetCopied();
              }}
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
              onChange={(e) => {
                setScope(e.target.value);
                resetCopied();
              }}
            >
              <option value="component">
                Component (query value / path piece)
              </option>
              <option value="full">Whole URL (keep / ? &amp; = #)</option>
            </select>
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="url-input">
            {mode === "encode" ? "Text or URL to encode" : "Encoded text to decode"}
          </label>
          <textarea
            id="url-input"
            className="tool-textarea"
            value={input}
            onChange={handleInputChange}
            placeholder={
              mode === "encode"
                ? "Type or paste text here…"
                : "Paste percent-encoded text here…"
            }
            rows={6}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleSwap}>
          {mode === "encode" ? "Switch to decode" : "Switch to encode"}
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {result.error ? (
        <p className="tool-error" role="status" aria-live="polite">
          {result.error}
        </p>
      ) : null}

      {result.output ? (
        <div className="tool-field" role="status" aria-live="polite">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy result"}
            </button>
          </div>
          <label className="tool-label" htmlFor="url-output">
            {mode === "encode" ? "Encoded output" : "Decoded output"}
          </label>
          <pre className="tool-output" id="url-output">
            {result.output}
          </pre>
          <p className="tool-note">
            {result.output.length.toLocaleString("en-US")} characters
          </p>
        </div>
      ) : null}

      {!result.output && !result.error ? (
        <p className="tool-note">
          {mode === "encode"
            ? "Enter text above to percent-encode it for use in a URL. Use Component mode for a single query value and Whole URL mode to escape spaces and unsafe characters while keeping the address structure. Everything runs live in your browser."
            : "Paste percent-encoded text above to turn it back into readable characters. Component mode also converts + to a space, the way query strings do."}
        </p>
      ) : null}
    </div>
  );
}
