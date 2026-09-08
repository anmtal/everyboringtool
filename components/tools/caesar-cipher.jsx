"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Shift a single message by `shift` letters (0-25). Case is preserved and
// any non-letter (spaces, digits, punctuation) passes through untouched.
function shiftText(text, shift) {
  const s = ((shift % 26) + 26) % 26;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      // Uppercase A-Z
      out += String.fromCharCode(((code - 65 + s) % 26) + 65);
    } else if (code >= 97 && code <= 122) {
      // Lowercase a-z
      out += String.fromCharCode(((code - 97 + s) % 26) + 97);
    } else {
      out += text[i];
    }
  }
  return out;
}

export default function CaesarCipher() {
  const [mode, setMode] = useState("encrypt");
  const [shift, setShift] = useState(3);
  const [input, setInput] = useState("The quick brown fox jumps over the lazy dog.");
  const [copied, setCopied] = useState(false);

  // Encrypting shifts forward by N; decrypting shifts backward by N.
  const effectiveShift = mode === "encrypt" ? shift : -shift;

  const output = useMemo(
    () => shiftText(input, effectiveShift),
    [input, effectiveShift]
  );

  // Brute-force table: every possible shift of the current input, so a user
  // trying to crack an unknown Caesar cipher can eyeball which one is English.
  const allShifts = useMemo(() => {
    if (!input) return [];
    const rows = [];
    for (let k = 1; k <= 25; k++) {
      rows.push({ shift: k, text: shiftText(input, -k) });
    }
    return rows;
  }, [input]);

  function handleShiftChange(e) {
    const v = parseInt(e.target.value, 10);
    setShift(Number.isNaN(v) ? 0 : ((v % 26) + 26) % 26);
    setCopied(false);
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    setCopied(false);
  }

  function handleSwap() {
    // Feed the result back in and flip mode, so encrypt -> decrypt round-trips.
    setInput(output);
    setMode(mode === "encrypt" ? "decrypt" : "encrypt");
    setCopied(false);
  }

  function handleRot13() {
    setShift(13);
    setCopied(false);
  }

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  async function handleCopy() {
    if (!output) return;
    try {
      await copyText(output);
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
            <label className="tool-label" htmlFor="cc-mode">
              Mode
            </label>
            <select
              id="cc-mode"
              className="tool-select"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setCopied(false);
              }}
            >
              <option value="encrypt">Encrypt (shift forward)</option>
              <option value="decrypt">Decrypt (shift back)</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="cc-shift">
              Shift (0-25)
            </label>
            <input
              id="cc-shift"
              className="tool-input"
              type="number"
              min={0}
              max={25}
              value={shift}
              onChange={handleShiftChange}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="cc-shift-range">
            Slide the shift
          </label>
          <input
            id="cc-shift-range"
            className="tool-input"
            type="range"
            min={0}
            max={25}
            value={shift}
            onChange={handleShiftChange}
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="cc-input">
            {mode === "encrypt" ? "Plaintext" : "Ciphertext"}
          </label>
          <textarea
            id="cc-input"
            className="tool-textarea"
            value={input}
            onChange={handleInputChange}
            placeholder="Type or paste your message here…"
            rows={5}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleSwap}>
          {mode === "encrypt" ? "Switch to decrypt" : "Switch to encrypt"}
        </button>
        <button className="btn" type="button" onClick={handleRot13}>
          ROT13 (shift 13)
        </button>
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
          <label className="tool-label" htmlFor="cc-output">
            {mode === "encrypt" ? "Ciphertext" : "Plaintext"}
          </label>
          <pre className="tool-output" id="cc-output" role="status" aria-live="polite">
            {output}
          </pre>
          <p className="tool-note">
            Shift {shift} {mode === "encrypt" ? "forward" : "back"} · letters
            move A→
            {String.fromCharCode(((0 + ((effectiveShift % 26) + 26) % 26) % 26) + 65)}.
            Spaces, numbers, and punctuation are left unchanged, and letter case
            is preserved.
          </p>
        </div>
      ) : (
        <p className="tool-note">
          Enter a message above to encode or decode it. Everything runs locally
          in your browser — nothing is uploaded.
        </p>
      )}

      {input ? (
        <div className="tool-result">
          <div className="tool-result-label">
            Cracking an unknown shift? Every possible decode
          </div>
          <p className="tool-note">
            If you do not know the key, scan the 25 rows below and pick the one
            that reads as plain English — that shift is the answer.
          </p>
          <pre className="tool-output" aria-label="All 25 possible decryptions">
            {allShifts
              .map(
                (r) =>
                  "shift " +
                  String(r.shift).padStart(2, " ") +
                  " | " +
                  r.text
              )
              .join("\n")}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
