"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const EXAMPLE = `/* Example stylesheet */
.card{margin:0;padding:16px 20px;border:1px solid #e2e2e2;border-radius:8px}
.card h2,.card .title{font-size:20px;line-height:1.4;color:#111}
@media (max-width:600px){.card{padding:12px}.card h2{font-size:18px}}
:root{--gap:8px;--accent:#2b6cff}
.btn{display:inline-flex;gap:var(--gap);width:calc(100% - 40px);background:var(--accent)}`;

const INDENTS = {
  "2": "  ",
  "4": "    ",
  tab: "\t",
};

// Remove /* ... */ comments while respecting quoted strings.
function stripComments(css) {
  let out = "";
  let i = 0;
  const n = css.length;
  while (i < n) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < n && css[j] !== q) {
        if (css[j] === "\\") j++;
        j++;
      }
      out += css.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// Split on top-level commas, ignoring commas inside (), [], or strings.
function splitTopLevel(str) {
  const parts = [];
  let depth = 0;
  let buf = "";
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '"' || c === "'") {
      const q = c;
      buf += c;
      i++;
      while (i < str.length && str[i] !== q) {
        if (str[i] === "\\") {
          buf += str[i];
          i++;
        }
        buf += str[i];
        i++;
      }
      if (i < str.length) buf += str[i];
      continue;
    }
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth = Math.max(0, depth - 1);
    if (c === "," && depth === 0) {
      parts.push(buf);
      buf = "";
      continue;
    }
    buf += c;
  }
  parts.push(buf);
  return parts;
}

function formatDeclaration(decl) {
  const clean = decl.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  // At-statements like @import "x"; or @charset "utf-8"; have no property colon.
  if (clean.startsWith("@")) return clean;
  const idx = clean.indexOf(":");
  if (idx === -1) return clean;
  const prop = clean.slice(0, idx).trim();
  const val = clean.slice(idx + 1).trim();
  return prop + ": " + val;
}

function formatSelector(sel, indentStr, depth) {
  const clean = sel.replace(/\s+/g, " ").trim();
  // Keep at-rule preludes (@media, @supports, @keyframes ...) on one line.
  if (clean.startsWith("@")) return clean;
  const groups = splitTopLevel(clean)
    .map((s) => s.trim())
    .filter(Boolean);
  if (groups.length <= 1) return clean;
  return groups.join(",\n" + indentStr.repeat(depth));
}

function beautify(css, indentStr) {
  let out = "";
  let i = 0;
  const n = css.length;
  let depth = 0;
  let buffer = "";
  const pad = (d) => indentStr.repeat(d);

  while (i < n) {
    const c = css[i];

    if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      const comment = css.slice(i, stop);
      const pending = buffer.trim();
      if (pending) {
        out += pad(depth) + pending.replace(/\s+/g, " ") + " " + comment + "\n";
        buffer = "";
      } else {
        out += pad(depth) + comment + "\n";
      }
      i = stop;
      continue;
    }

    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      while (j < n && css[j] !== q) {
        if (css[j] === "\\") j++;
        j++;
      }
      buffer += css.slice(i, j + 1);
      i = j + 1;
      continue;
    }

    if (c === "{") {
      const sel = formatSelector(buffer, indentStr, depth);
      out += pad(depth) + sel + " {\n";
      buffer = "";
      depth++;
      i++;
      continue;
    }

    if (c === "}") {
      const decl = buffer.trim();
      if (decl) {
        out += pad(depth) + formatDeclaration(decl) + ";\n";
        buffer = "";
      }
      depth = Math.max(0, depth - 1);
      out += pad(depth) + "}\n";
      buffer = "";
      i++;
      continue;
    }

    if (c === ";") {
      const decl = buffer.trim();
      if (decl) out += pad(depth) + formatDeclaration(decl) + ";\n";
      buffer = "";
      i++;
      continue;
    }

    buffer += c;
    i++;
  }

  const rest = buffer.trim();
  if (rest) out += pad(depth) + rest.replace(/\s+/g, " ") + "\n";

  // Add a blank line between blocks for readability (but not before a closing brace).
  out = out.replace(/}\n(?=[^\s}])/g, "}\n\n");
  return out.trim() + "\n";
}

function minify(css) {
  const strings = [];
  let s = stripComments(css);
  s = s.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (m) => {
    strings.push(m);
    return "\u0000" + (strings.length - 1) + "\u0000";
  });
  s = s.replace(/\s+/g, " ");
  // Trim whitespace around structural symbols. Leave +, ~, - alone so calc() and
  // combinators with meaningful spacing keep working.
  s = s.replace(/\s*([{}:;,>])\s*/g, "$1");
  s = s.replace(/;}/g, "}");
  s = s.trim();
  s = s.replace(/\u0000(\d+)\u0000/g, (_, idx) => strings[Number(idx)]);
  return s;
}

function countRules(css) {
  // Count declaration blocks (opening braces not part of at-rule-only nesting).
  const cleaned = stripComments(css);
  const matches = cleaned.match(/\{/g);
  return matches ? matches.length : 0;
}

function byteLength(str) {
  try {
    return new Blob([str]).size;
  } catch (e) {
    return str.length;
  }
}

export default function CssFormatter() {
  const [input, setInput] = useState(EXAMPLE);
  const [mode, setMode] = useState("beautify");
  const [indent, setIndent] = useState("2");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) return { output: "", error: "" };
    try {
      const output =
        mode === "minify" ? minify(input) : beautify(input, INDENTS[indent] || "  ");
      return { output, error: "" };
    } catch (e) {
      return { output: "", error: "Could not process this CSS. Check for unbalanced braces." };
    }
  }, [input, mode, indent]);

  const stats = useMemo(() => {
    if (!result.output) return null;
    const inBytes = byteLength(input);
    const outBytes = byteLength(result.output);
    const saved = inBytes - outBytes;
    const pct = inBytes > 0 ? Math.round((saved / inBytes) * 100) : 0;
    return {
      rules: countRules(input),
      inBytes,
      outBytes,
      saved,
      pct,
    };
  }, [result.output, input]);

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

  function handleDownload() {
    if (!result.output) return;
    const name = mode === "minify" ? "styles.min.css" : "styles.css";
    const blob = new Blob([result.output], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  function handleExample() {
    setInput(EXAMPLE);
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="css-mode">
              Action
            </label>
            <select
              id="css-mode"
              className="tool-select"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setCopied(false);
              }}
            >
              <option value="beautify">Beautify (format &amp; indent)</option>
              <option value="minify">Minify (compress)</option>
            </select>
          </div>

          {mode === "beautify" ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="css-indent">
                Indentation
              </label>
              <select
                id="css-indent"
                className="tool-select"
                value={indent}
                onChange={(e) => {
                  setIndent(e.target.value);
                  setCopied(false);
                }}
              >
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
                <option value="tab">Tab</option>
              </select>
            </div>
          ) : null}
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="css-input">
            CSS input
          </label>
          <textarea
            id="css-input"
            className="tool-textarea"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder="Paste your CSS here…"
            rows={10}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleExample}>
          Load example
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
            <button className="btn" type="button" onClick={handleDownload}>
              Download .css
            </button>
          </div>

          <label className="tool-label" htmlFor="css-output">
            {mode === "minify" ? "Minified CSS" : "Formatted CSS"}
          </label>
          <pre className="tool-output" id="css-output" role="status" aria-live="polite">
            {result.output}
          </pre>

          {stats ? (
            <div className="tool-stat-grid">
              <div className="tool-stat">
                <div className="tool-stat-num">{stats.rules.toLocaleString("en-US")}</div>
                <div className="tool-stat-label">Rule blocks</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{stats.inBytes.toLocaleString("en-US")}</div>
                <div className="tool-stat-label">Input bytes</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{stats.outBytes.toLocaleString("en-US")}</div>
                <div className="tool-stat-label">Output bytes</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {mode === "minify" && stats.pct > 0 ? stats.pct + "%" : "-"}
                </div>
                <div className="tool-stat-label">Saved</div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!result.output && !result.error ? (
        <p className="tool-note">
          Paste CSS above to format it. Beautify adds clean indentation and line breaks; Minify
          strips comments and whitespace to shrink the file. Everything runs in your browser.
        </p>
      ) : null}
    </div>
  );
}
