"use client";

import { useMemo, useState } from "react";

// Split CSS into segments that are either a preserved string literal
// (single- or double-quoted) or a normal chunk of CSS to be minified.
// Block comments (/* ... */) are stripped here, but never inside strings.
function tokenize(css) {
  const segments = [];
  const len = css.length;
  let buffer = "";
  let i = 0;

  while (i < len) {
    const c = css[i];
    const next = css[i + 1];

    // Start of a string literal — copy it verbatim, honoring escapes.
    if (c === '"' || c === "'") {
      if (buffer) {
        segments.push({ str: false, text: buffer });
        buffer = "";
      }
      let literal = c;
      let j = i + 1;
      while (j < len) {
        const cc = css[j];
        literal += cc;
        if (cc === "\\" && j + 1 < len) {
          literal += css[j + 1];
          j += 2;
          continue;
        }
        if (cc === c) {
          j += 1;
          break;
        }
        j += 1;
      }
      segments.push({ str: true, text: literal });
      i = j;
      continue;
    }

    // Block comment — skip through the closing */ (or to end if unterminated).
    if (c === "/" && next === "*") {
      let j = i + 2;
      while (j < len && !(css[j] === "*" && css[j + 1] === "/")) j += 1;
      i = j < len ? j + 2 : len;
      continue;
    }

    buffer += c;
    i += 1;
  }

  if (buffer) segments.push({ str: false, text: buffer });
  return segments;
}

// Minify a non-string chunk: collapse whitespace, tighten around the
// listed punctuation, and drop redundant semicolons.
function minifyChunk(text) {
  let out = text.replace(/\s+/g, " ");
  // Remove spaces around { } : ; ,
  out = out.replace(/\s*([{}:;,])\s*/g, "$1");
  // Collapse duplicate semicolons and drop the last one before a closing brace.
  out = out.replace(/;{2,}/g, ";");
  out = out.replace(/;}/g, "}");
  return out;
}

function minifyCss(css) {
  const segments = tokenize(css);
  let result = "";
  for (const seg of segments) {
    result += seg.str ? seg.text : minifyChunk(seg.text);
  }
  return result.trim();
}

function byteLength(str) {
  try {
    return new TextEncoder().encode(str).length;
  } catch (e) {
    return str.length;
  }
}

function formatBytes(n) {
  if (n < 1024) return n.toLocaleString("en-US") + " B";
  const kb = n / 1024;
  if (kb < 1024) return (kb < 10 ? kb.toFixed(2) : kb.toFixed(1)) + " KB";
  return (kb / 1024).toFixed(2) + " MB";
}

export default function CssMinifier() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const data = useMemo(() => {
    if (!input.trim()) {
      return { output: "", originalBytes: 0, minifiedBytes: 0, saved: 0 };
    }
    const output = minifyCss(input);
    const originalBytes = byteLength(input);
    const minifiedBytes = byteLength(output);
    const saved =
      originalBytes > 0
        ? Math.max(0, (1 - minifiedBytes / originalBytes) * 100)
        : 0;
    return { output, originalBytes, minifiedBytes, saved };
  }, [input]);

  function handleInputChange(e) {
    setInput(e.target.value);
    setCopied(false);
  }

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  async function handleCopy() {
    if (!data.output) return;
    try {
      await navigator.clipboard.writeText(data.output);
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
          <label className="tool-label" htmlFor="css-input">
            CSS to minify
          </label>
          <textarea
            id="css-input"
            className="tool-textarea"
            value={input}
            onChange={handleInputChange}
            placeholder={
              "/* paste your CSS here */\n.button {\n  color: #ffffff;\n  padding: 12px 20px;\n}"
            }
            rows={12}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {data.output ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatBytes(data.originalBytes)}
              </div>
              <div className="tool-stat-label">Original size</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatBytes(data.minifiedBytes)}
              </div>
              <div className="tool-stat-label">Minified size</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{data.saved.toFixed(1)}%</div>
              <div className="tool-stat-label">Saved</div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy minified CSS"}
              </button>
            </div>
            <label className="tool-label" htmlFor="css-output">
              Minified CSS
            </label>
            <pre className="tool-output" id="css-output">
              {data.output}
            </pre>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Paste CSS above to strip comments and unnecessary whitespace. Spaces
          around {"{ } : ; ,"} are collapsed and the last semicolon in each block
          is removed. Text inside quotes and url() strings is left untouched.
          Everything runs live in your browser.
        </p>
      )}
    </div>
  );
}
