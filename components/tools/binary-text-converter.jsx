"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Convert a JS string to binary using UTF-8 byte encoding, one group per byte.
function textToBinary(text, bits, separator) {
  const bytes = new TextEncoder().encode(text);
  const groups = [];
  for (const byte of bytes) {
    groups.push(byte.toString(2).padStart(bits, "0"));
  }
  return groups.join(separator);
}

// Convert binary back to text. Accepts any whitespace/punctuation as separators
// and also handles a solid run of bits with no separators.
function binaryToText(input, bits) {
  // Strip everything that is not a 0 or 1, but remember where the breaks were.
  const tokens = input.trim().split(/[^01]+/).filter(Boolean);

  let bitString;
  if (tokens.length === 0) {
    return { output: "", error: "" };
  } else if (tokens.length === 1) {
    // One solid run of bits, e.g. "0100100001101001" — chunk it ourselves.
    bitString = tokens[0];
  } else {
    // Separated groups — validate each is a clean byte-ish chunk, then join.
    bitString = tokens.join("");
  }

  if (bitString.length % bits !== 0) {
    return {
      output: "",
      error: `The binary has ${bitString.length} bits, which is not a multiple of ${bits}. Check for a missing or extra digit.`,
    };
  }

  const bytes = [];
  for (let i = 0; i < bitString.length; i += bits) {
    const chunk = bitString.slice(i, i + bits);
    const value = parseInt(chunk, 2);
    if (Number.isNaN(value)) {
      return { output: "", error: "Could not parse the binary digits." };
    }
    bytes.push(value);
  }

  try {
    // Decode the byte stream as UTF-8 so multi-byte characters and emoji work.
    const output = new TextDecoder("utf-8", { fatal: false }).decode(
      new Uint8Array(bytes)
    );
    return { output, error: "" };
  } catch (e) {
    return { output: "", error: "Could not decode those bytes as text." };
  }
}

const EXAMPLE_TEXT = "Hello, world!";

export default function BinaryTextConverter() {
  const [mode, setMode] = useState("binaryToText");
  const [input, setInput] = useState(
    "01001000 01100101 01101100 01101100 01101111 00101100 00100000 01110111 01101111 01110010 01101100 01100100 00100001"
  );
  const [bits, setBits] = useState("8");
  const [separator, setSeparator] = useState("space");
  const [copied, setCopied] = useState(false);

  const sepChar = separator === "none" ? "" : separator === "comma" ? ", " : " ";
  const bitWidth = bits === "7" ? 7 : 8;

  const result = useMemo(() => {
    if (!input.trim()) {
      return { output: "", error: "" };
    }
    if (mode === "textToBinary") {
      try {
        return { output: textToBinary(input, bitWidth, sepChar), error: "" };
      } catch (e) {
        return { output: "", error: "Could not convert that text to binary." };
      }
    }
    return binaryToText(input, bitWidth);
  }, [input, mode, bitWidth, sepChar]);

  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    setCopied(false);
    if (next === "textToBinary") {
      setInput(EXAMPLE_TEXT);
    } else {
      setInput(textToBinary(EXAMPLE_TEXT, bitWidth, sepChar));
    }
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
    if (result.output) {
      setInput(result.output);
    }
    setMode(mode === "textToBinary" ? "binaryToText" : "textToBinary");
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

  const charCount = mode === "binaryToText" ? [...result.output].length : 0;
  const byteCount =
    mode === "textToBinary" && input
      ? new TextEncoder().encode(input).length
      : 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bt-mode">
              Direction
            </label>
            <select
              id="bt-mode"
              className="tool-select"
              value={mode}
              onChange={(e) => switchMode(e.target.value)}
            >
              <option value="binaryToText">Binary to text</option>
              <option value="textToBinary">Text to binary</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="bt-bits">
              Bits per character
            </label>
            <select
              id="bt-bits"
              className="tool-select"
              value={bits}
              onChange={(e) => {
                setBits(e.target.value);
                setCopied(false);
              }}
            >
              <option value="8">8-bit (bytes / UTF-8)</option>
              <option value="7">7-bit (ASCII)</option>
            </select>
          </div>

          {mode === "textToBinary" ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="bt-sep">
                Separator
              </label>
              <select
                id="bt-sep"
                className="tool-select"
                value={separator}
                onChange={(e) => {
                  setSeparator(e.target.value);
                  setCopied(false);
                }}
              >
                <option value="space">Space</option>
                <option value="comma">Comma</option>
                <option value="none">None</option>
              </select>
            </div>
          ) : null}
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="bt-input">
            {mode === "binaryToText" ? "Binary to decode" : "Text to encode"}
          </label>
          <textarea
            id="bt-input"
            className="tool-textarea"
            value={input}
            onChange={handleInputChange}
            placeholder={
              mode === "binaryToText"
                ? "Paste binary here — spaces, commas or line breaks between bytes are fine…"
                : "Type or paste text here…"
            }
            rows={8}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleSwap}>
          {mode === "binaryToText" ? "Switch to encode" : "Switch to decode"}
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
          <label className="tool-label" htmlFor="bt-output">
            {mode === "binaryToText" ? "Decoded text" : "Binary output"}
          </label>
          <pre className="tool-output" id="bt-output" role="status" aria-live="polite">
            {result.output}
          </pre>
          <div className="tool-stat-grid">
            {mode === "binaryToText" ? (
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {charCount.toLocaleString("en-US")}
                </div>
                <div className="tool-stat-label">Characters</div>
              </div>
            ) : (
              <>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {byteCount.toLocaleString("en-US")}
                  </div>
                  <div className="tool-stat-label">Bytes</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {(byteCount * bitWidth).toLocaleString("en-US")}
                  </div>
                  <div className="tool-stat-label">Bits</div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {!result.output && !result.error ? (
        <p className="tool-note" role="status" aria-live="polite">
          {mode === "binaryToText"
            ? "Paste binary above (for example 01001000 01101001) to convert it back to readable text. Spaces, commas and line breaks between groups are ignored, and a solid run of bits works too."
            : "Enter text above to convert each character to binary. UTF-8 characters and emoji are encoded as their real byte values."}
        </p>
      ) : null}
    </div>
  );
}
