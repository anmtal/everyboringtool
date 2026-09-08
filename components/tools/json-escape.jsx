"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const EXAMPLE = 'She said "Hello",\n\tand left.\nPath: C:\\Users\\me';

// Turn raw text into a JSON-safe string.
function escapeJson(input, { wrapQuotes, escapeUnicode, escapeSlash }) {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const code = input.charCodeAt(i);
    switch (ch) {
      case "\\":
        out += "\\\\";
        break;
      case '"':
        out += '\\"';
        break;
      case "\b":
        out += "\\b";
        break;
      case "\f":
        out += "\\f";
        break;
      case "\n":
        out += "\\n";
        break;
      case "\r":
        out += "\\r";
        break;
      case "\t":
        out += "\\t";
        break;
      case "/":
        out += escapeSlash ? "\\/" : "/";
        break;
      default:
        if (code < 0x20) {
          // Other control characters must be \u escaped in JSON.
          out += "\\u" + code.toString(16).padStart(4, "0");
        } else if (escapeUnicode && code > 0x7e) {
          out += "\\u" + code.toString(16).padStart(4, "0");
        } else {
          out += ch;
        }
    }
  }
  return wrapQuotes ? '"' + out + '"' : out;
}

// Turn a JSON-escaped string back into raw text.
// Accepts input with or without surrounding double quotes.
function unescapeJson(raw) {
  let s = raw;
  // Strip one layer of matching surrounding double quotes if present.
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    s = s.slice(1, -1);
  }
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = s[i + 1];
    if (next === undefined) {
      throw new Error("Input ends with a lone backslash (\\).");
    }
    switch (next) {
      case '"':
        out += '"';
        i++;
        break;
      case "\\":
        out += "\\";
        i++;
        break;
      case "/":
        out += "/";
        i++;
        break;
      case "b":
        out += "\b";
        i++;
        break;
      case "f":
        out += "\f";
        i++;
        break;
      case "n":
        out += "\n";
        i++;
        break;
      case "r":
        out += "\r";
        i++;
        break;
      case "t":
        out += "\t";
        i++;
        break;
      case "u": {
        const hex = s.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          throw new Error(
            "Invalid \\u escape: expected 4 hex digits after \\u."
          );
        }
        out += String.fromCharCode(parseInt(hex, 16));
        i += 5;
        break;
      }
      default:
        throw new Error(
          "Invalid escape sequence: \\" + next + " is not valid in JSON."
        );
    }
  }
  return out;
}

export default function JsonEscape() {
  const [mode, setMode] = useState("escape");
  const [input, setInput] = useState(EXAMPLE);
  const [wrapQuotes, setWrapQuotes] = useState(false);
  const [escapeUnicode, setEscapeUnicode] = useState(false);
  const [escapeSlash, setEscapeSlash] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input) {
      return { output: "", error: "" };
    }
    try {
      if (mode === "escape") {
        return {
          output: escapeJson(input, { wrapQuotes, escapeUnicode, escapeSlash }),
          error: "",
        };
      }
      return { output: unescapeJson(input), error: "" };
    } catch (e) {
      return { output: "", error: e.message || "Could not process input." };
    }
  }, [input, mode, wrapQuotes, escapeUnicode, escapeSlash]);

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
    setMode(mode === "escape" ? "unescape" : "escape");
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
          <label className="tool-label" htmlFor="json-escape-mode">
            Mode
          </label>
          <select
            id="json-escape-mode"
            className="tool-select"
            value={mode}
            onChange={(e) => switchMode(e.target.value)}
          >
            <option value="escape">Escape — raw text to JSON string</option>
            <option value="unescape">
              Unescape — JSON string to raw text
            </option>
          </select>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="json-escape-input">
            {mode === "escape" ? "Text to escape" : "JSON string to unescape"}
          </label>
          <textarea
            id="json-escape-input"
            className="tool-textarea"
            value={input}
            onChange={handleInputChange}
            placeholder={
              mode === "escape"
                ? "Type or paste raw text with quotes, newlines, tabs…"
                : 'Paste an escaped JSON string, e.g. Line 1\\nLine 2'
            }
            rows={8}
            spellCheck={false}
          />
        </div>

        {mode === "escape" ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="json-escape-wrap">
                Wrap in quotes
              </label>
              <input
                id="json-escape-wrap"
                type="checkbox"
                checked={wrapQuotes}
                onChange={(e) => {
                  setWrapQuotes(e.target.checked);
                  setCopied(false);
                }}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="json-escape-unicode">
                Escape non-ASCII as \u
              </label>
              <input
                id="json-escape-unicode"
                type="checkbox"
                checked={escapeUnicode}
                onChange={(e) => {
                  setEscapeUnicode(e.target.checked);
                  setCopied(false);
                }}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="json-escape-slash">
                Escape forward slash
              </label>
              <input
                id="json-escape-slash"
                type="checkbox"
                checked={escapeSlash}
                onChange={(e) => {
                  setEscapeSlash(e.target.checked);
                  setCopied(false);
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleSwap}>
          {mode === "escape" ? "Switch to unescape" : "Switch to escape"}
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {result.error ? <p className="tool-error">{result.error}</p> : null}

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
          <label className="tool-label" htmlFor="json-escape-output">
            {mode === "escape" ? "Escaped JSON string" : "Unescaped raw text"}
          </label>
          <pre className="tool-output" id="json-escape-output">
            {result.output}
          </pre>
          <p className="tool-note">
            {result.output.length.toLocaleString("en-US")} characters
          </p>
        </div>
      ) : null}

      {!result.output && !result.error ? (
        <p className="tool-note">
          {mode === "escape"
            ? "Enter text above to escape quotes, backslashes, newlines, tabs, and control characters into a JSON-safe string."
            : "Paste an escaped JSON string above to turn escape sequences like \\n, \\t, and \\uXXXX back into readable text. Everything runs live in your browser."}
        </p>
      ) : null}
    </div>
  );
}
