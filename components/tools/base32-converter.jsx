"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const ALPHABETS = {
  standard: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  hex: "0123456789ABCDEFGHIJKLMNOPQRSTUV",
};

function bytesToBase32(bytes, variant, pad) {
  const alphabet = ALPHABETS[variant];
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  if (pad) {
    while (output.length % 8 !== 0) {
      output += "=";
    }
  }

  return output;
}

function base32ToBytes(str, variant) {
  const alphabet = ALPHABETS[variant];
  const lookup = {};
  for (let i = 0; i < alphabet.length; i++) {
    lookup[alphabet[i]] = i;
  }

  // Strip whitespace and padding; normalize case for the standard alphabet.
  const cleaned = str.replace(/[\s=]/g, "").toUpperCase();
  if (!cleaned) return new Uint8Array(0);

  let bits = 0;
  let value = 0;
  const out = [];

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (!(ch in lookup)) {
      throw new Error(`Invalid Base32 character: "${cleaned[i]}"`);
    }
    value = (value << 5) | lookup[ch];
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(out);
}

export default function Base32Converter() {
  const [mode, setMode] = useState("encode");
  const [variant, setVariant] = useState("standard");
  const [pad, setPad] = useState(true);
  const [input, setInput] = useState("Hello, Base32!");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input) {
      return { output: "", error: "" };
    }

    try {
      if (mode === "encode") {
        const bytes = new TextEncoder().encode(input);
        return { output: bytesToBase32(bytes, variant, pad), error: "" };
      }

      const bytes = base32ToBytes(input, variant);
      const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      return { output: text, error: "" };
    } catch (e) {
      return {
        output: "",
        error:
          mode === "decode"
            ? (e && e.message) ||
              "That is not valid Base32. Check for stray characters."
            : "Could not encode this text.",
      };
    }
  }, [input, mode, variant, pad]);

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
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="b32-mode">
              Mode
            </label>
            <select
              id="b32-mode"
              className="tool-select"
              value={mode}
              onChange={(e) => switchMode(e.target.value)}
            >
              <option value="encode">Encode text to Base32</option>
              <option value="decode">Decode Base32 to text</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="b32-variant">
              Alphabet
            </label>
            <select
              id="b32-variant"
              className="tool-select"
              value={variant}
              onChange={(e) => {
                setVariant(e.target.value);
                setCopied(false);
              }}
            >
              <option value="standard">Standard (RFC 4648, A–Z 2–7)</option>
              <option value="hex">Base32hex (0–9 A–V)</option>
            </select>
          </div>
        </div>

        {mode === "encode" ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="b32-pad">
              Padding
            </label>
            <select
              id="b32-pad"
              className="tool-select"
              value={pad ? "yes" : "no"}
              onChange={(e) => {
                setPad(e.target.value === "yes");
                setCopied(false);
              }}
            >
              <option value="yes">Add "=" padding (standard)</option>
              <option value="no">No padding</option>
            </select>
          </div>
        ) : null}

        <div className="tool-field">
          <label className="tool-label" htmlFor="b32-input">
            {mode === "encode" ? "Text to encode" : "Base32 to decode"}
          </label>
          <textarea
            id="b32-input"
            className="tool-textarea"
            value={input}
            onChange={handleInputChange}
            placeholder={
              mode === "encode"
                ? "Type or paste text here…"
                : "Paste Base32 here (spaces, line breaks and padding are ignored)…"
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
          <label className="tool-label" htmlFor="b32-output">
            {mode === "encode" ? "Base32 output" : "Decoded text"}
          </label>
          <pre className="tool-output" id="b32-output">
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
            ? "Enter text above to convert it to Base32. UTF-8 characters and emoji are encoded correctly."
            : "Paste Base32 above to convert it back to readable text. Everything runs live in your browser."}
        </p>
      ) : null}
    </div>
  );
}
