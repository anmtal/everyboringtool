"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

export default function Base64EncodeDecode() {
  const [mode, setMode] = useState("encode");
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input) {
      return { output: "", error: "" };
    }

    try {
      if (mode === "encode") {
        // UTF-8 safe encode: percent-encode, unescape to a binary string, then btoa.
        const output = btoa(unescape(encodeURIComponent(input)));
        return { output, error: "" };
      }

      // Decode: strip whitespace/newlines that often sneak into pasted Base64.
      const cleaned = input.replace(/\s+/g, "");
      if (!cleaned) {
        return { output: "", error: "" };
      }
      // atob throws on invalid Base64; escape/decodeURIComponent restores UTF-8.
      const output = decodeURIComponent(escape(atob(cleaned)));
      return { output, error: "" };
    } catch (e) {
      return {
        output: "",
        error:
          mode === "decode"
            ? "That is not valid Base64. Check for missing characters or bad padding."
            : "Could not encode this text.",
      };
    }
  }, [input, mode]);

  const outputLength = result.output.length;

  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    setCopied(false);
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    setCopied(false);
  }

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  function handleSwap() {
    // Send the current output back into the input and flip the mode.
    if (result.output) {
      setInput(result.output);
    }
    setMode(mode === "encode" ? "decode" : "encode");
    setCopied(false);
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
        <div className="tool-field">
          <label className="tool-label" htmlFor="b64-mode">
            Mode
          </label>
          <select
            id="b64-mode"
            className="tool-select"
            value={mode}
            onChange={(e) => switchMode(e.target.value)}
          >
            <option value="encode">Encode text to Base64</option>
            <option value="decode">Decode Base64 to text</option>
          </select>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="b64-input">
            {mode === "encode" ? "Text to encode" : "Base64 to decode"}
          </label>
          <textarea
            id="b64-input"
            className="tool-textarea"
            value={input}
            onChange={handleInputChange}
            placeholder={
              mode === "encode"
                ? "Type or paste text here…"
                : "Paste Base64 here (spaces and line breaks are ignored)…"
            }
            rows={8}
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

      {result.error ? <p className="tool-error">{result.error}</p> : null}

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
          <label className="tool-label" htmlFor="b64-output">
            {mode === "encode" ? "Base64 output" : "Decoded text"}
          </label>
          <pre className="tool-output" id="b64-output">
            {result.output}
          </pre>
          <p className="tool-note">
            {outputLength.toLocaleString("en-US")} characters
          </p>
        </div>
      ) : null}

      {!result.output && !result.error ? (
        <p className="tool-note">
          {mode === "encode"
            ? "Enter text above to convert it to Base64. UTF-8 characters and emoji are handled correctly."
            : "Paste Base64 above to convert it back to readable text. Everything runs live in your browser."}
        </p>
      ) : null}
    </div>
  );
}
