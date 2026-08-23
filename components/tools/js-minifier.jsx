"use client";

import { useMemo, useState } from "react";

// Conservative, string/template/regex-aware minifier.
// Strips // line comments and /* */ block comments, trims leading/trailing
// whitespace on each line, and drops blank lines - WITHOUT ever touching the
// contents of string literals, template literals, or regex literals.
const SENT = String.fromCharCode(0); // sentinel that cannot appear in code

function minifyJs(src) {
  if (!src) return "";

  const n = src.length;
  const literals = [];
  let skeleton = "";
  let i = 0;

  // State used only to decide whether a "/" starts a regex or is division.
  let prevChar = ""; // last significant (non-space) code char emitted
  let prevWord = ""; // trailing identifier word (survives spaces)
  let inWord = false;

  const wordRe = /[A-Za-z0-9_$]/;
  const keywords = new Set([
    "return",
    "typeof",
    "instanceof",
    "in",
    "of",
    "new",
    "delete",
    "void",
    "do",
    "else",
    "yield",
    "case",
    "await",
  ]);

  function pushLiteral(text) {
    const idx = literals.length;
    literals.push(text);
    skeleton += SENT + idx + SENT;
    // A literal counts as a value, so a following "/" is division.
    prevChar = "x";
    prevWord = "";
    inWord = false;
  }

  function regexAllowed() {
    if (prevChar === "") return true;
    if ("(){}[,;:?=+-*/%&|^!<>~".indexOf(prevChar) !== -1) return true;
    if (prevWord && keywords.has(prevWord)) return true;
    return false;
  }

  // Returns index just past the closing quote, or a safe stopping point.
  function scanString(start, quote) {
    let j = start + 1;
    while (j < n) {
      const ch = src[j];
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (ch === quote) return j + 1;
      if (ch === "\n" || ch === "\r") return j; // unterminated on this line
      j++;
    }
    return n;
  }

  // Returns index just past the closing backtick. Handles ${ ... } with nested
  // braces, strings and nested templates so their contents stay protected.
  function scanTemplate(start) {
    let j = start + 1;
    while (j < n) {
      const ch = src[j];
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (ch === "`") return j + 1;
      if (ch === "$" && src[j + 1] === "{") {
        j += 2;
        let depth = 1;
        while (j < n && depth > 0) {
          const e = src[j];
          if (e === "\\") {
            j += 2;
            continue;
          }
          if (e === "`") {
            j = scanTemplate(j);
            continue;
          }
          if (e === '"' || e === "'") {
            j = scanString(j, e);
            continue;
          }
          if (e === "{") {
            depth++;
            j++;
            continue;
          }
          if (e === "}") {
            depth--;
            j++;
            continue;
          }
          j++;
        }
        continue;
      }
      j++;
    }
    return n; // unterminated
  }

  // Returns index just past the closing "/" plus flags, or -1 if this is not a
  // valid single-line regex literal.
  function scanRegex(start) {
    let j = start + 1;
    let inClass = false;
    while (j < n) {
      const ch = src[j];
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (ch === "\n" || ch === "\r") return -1; // regex can't span lines
      if (inClass) {
        if (ch === "]") inClass = false;
      } else if (ch === "[") {
        inClass = true;
      } else if (ch === "/") {
        j++;
        while (j < n && /[A-Za-z]/.test(src[j])) j++; // flags
        return j;
      }
      j++;
    }
    return -1;
  }

  while (i < n) {
    const c = src[i];
    const c2 = i + 1 < n ? src[i + 1] : "";

    // Line comment
    if (c === "/" && c2 === "/") {
      i += 2;
      while (i < n && src[i] !== "\n" && src[i] !== "\r") i++;
      inWord = false;
      continue;
    }

    // Block comment (replace with a single space to avoid joining tokens)
    if (c === "/" && c2 === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2; // skip closing */ (safe even if unterminated)
      skeleton += " ";
      inWord = false;
      continue;
    }

    // String literal
    if (c === '"' || c === "'") {
      const end = scanString(i, c);
      pushLiteral(src.slice(i, end));
      i = end;
      continue;
    }

    // Template literal
    if (c === "`") {
      const end = scanTemplate(i);
      pushLiteral(src.slice(i, end));
      i = end;
      continue;
    }

    // Regex literal (only where a regex is grammatically allowed)
    if (c === "/" && regexAllowed()) {
      const end = scanRegex(i);
      if (end !== -1) {
        pushLiteral(src.slice(i, end));
        i = end;
        continue;
      }
      // otherwise fall through and treat "/" as a division operator
    }

    // Ordinary code character
    skeleton += c;
    const isSpace =
      c === " " ||
      c === "\t" ||
      c === "\n" ||
      c === "\r" ||
      c === "\f" ||
      c === "\v";
    if (isSpace) {
      inWord = false; // a space ends the current word but prevWord is preserved
    } else if (wordRe.test(c)) {
      if (!inWord) {
        prevWord = "";
        inWord = true;
      }
      prevWord += c;
      prevChar = c;
    } else {
      inWord = false;
      prevChar = c;
      prevWord = "";
    }
    i++;
  }

  // Per-line trim + blank-line removal on the comment-free skeleton.
  const lines = skeleton.split(/\r\n|\r|\n/);
  const kept = [];
  for (let k = 0; k < lines.length; k++) {
    const t = lines[k].trim();
    if (t !== "") kept.push(t);
  }
  let result = kept.join("\n");

  // Restore protected literals verbatim.
  const restoreRe = new RegExp(SENT + "(\\d+)" + SENT, "g");
  result = result.replace(restoreRe, (m, d) => literals[Number(d)]);
  return result;
}

function formatBytes(b) {
  if (b < 1024) return b.toLocaleString("en-US") + " B";
  return (
    (b / 1024).toLocaleString("en-US", { maximumFractionDigits: 1 }) + " KB"
  );
}

export default function JsMinifier() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    try {
      return minifyJs(input);
    } catch (e) {
      return "";
    }
  }, [input]);

  const stats = useMemo(() => {
    const enc = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
    const size = (s) => (enc ? enc.encode(s).length : s.length);
    const original = size(input);
    const minified = size(output);
    const saved = original - minified;
    const pct = original > 0 ? (saved / original) * 100 : 0;
    return { original, minified, saved, pct };
  }, [input, output]);

  async function handleCopy() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // clipboard may be unavailable; ignore silently
    }
  }

  function handleDownload() {
    if (!output) return;
    const blob = new Blob([output], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script.min.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  const hasInput = input.trim() !== "";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="jsmin-input">
            JavaScript source
          </label>
          <textarea
            className="tool-textarea"
            id="jsmin-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              "// Paste your JavaScript here\nfunction greet(name) {\n  const msg = 'Hello, ' + name; // say hi\n  return msg;\n}"
            }
            rows={12}
            spellCheck={false}
          />
        </div>
      </div>

      {hasInput ? (
        <div className="tool-stat-grid">
          <div className="tool-stat">
            <div className="tool-stat-num">{formatBytes(stats.original)}</div>
            <div className="tool-stat-label">Original</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{formatBytes(stats.minified)}</div>
            <div className="tool-stat-label">Minified</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">
              {formatBytes(Math.max(0, stats.saved))}
            </div>
            <div className="tool-stat-label">Saved</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">
              {stats.pct.toLocaleString("en-US", { maximumFractionDigits: 1 })}%
            </div>
            <div className="tool-stat-label">Reduced</div>
          </div>
        </div>
      ) : null}

      {output ? (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button className="btn" type="button" onClick={handleDownload}>
              Download .min.js
            </button>
            <button className="btn" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>
          <label className="tool-label" htmlFor="jsmin-output">
            Minified output
          </label>
          <pre className="tool-output" id="jsmin-output">
            {output}
          </pre>
        </div>
      ) : (
        <p className="tool-note">
          Paste JavaScript above. This is a basic whitespace/comment minifier: it
          removes comments, trims each line, and drops blank lines while leaving
          your strings, template literals, and regexes untouched. It does not
          rename variables or compress code - always test the output before using
          it in production.
        </p>
      )}
    </div>
  );
}
