"use client";

import { useMemo, useState } from "react";

// Measure UTF-8 byte length so the size stats reflect real bytes, not char count.
function byteLength(str) {
  if (!str) return 0;
  try {
    return new TextEncoder().encode(str).length;
  } catch (e) {
    return str.length;
  }
}

// Safe, dependency-free HTML minifier.
// - Preserves the raw contents of <pre>, <textarea>, <script> and <style>.
// - Removes HTML comments (keeps IE conditional comments like <!--[if IE]>).
// - Collapses insignificant whitespace between tags.
function minifyHtml(html) {
  if (!html || !html.trim()) return "";

  const store = [];
  // Null byte: never appears in real HTML source, isn't matched by \s or the
  // whitespace class below, and has no angle brackets, so the placeholder and
  // its stored content survive every later step untouched (and can't collide
  // with real text the way a printable token could).
  const SENT = String.fromCharCode(0);

  // 1. Pull out protected regions and replace them with sentinel placeholders.
  const protectedRe = /<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
  let masked = html.replace(protectedRe, (match) => {
    const token = SENT + store.length + SENT;
    store.push(match);
    return token;
  });

  // 2. Strip comments, but preserve conditional comments (which start with "[").
  masked = masked.replace(/<!--(?!\[)[\s\S]*?-->/g, "");

  // 3. Collapse every run of whitespace down to a single space.
  masked = masked.replace(/[ \t\r\n\f\v]+/g, " ");

  // 4. Drop whitespace that sits directly between two tags.
  masked = masked.replace(/>\s+</g, "><");

  // 5. Trim the document edges.
  masked = masked.trim();

  // 6. Restore the protected regions untouched.
  const restoreRe = new RegExp(SENT + "(\\d+)" + SENT, "g");
  masked = masked.replace(restoreRe, (m, i) => store[Number(i)] || "");

  return masked;
}

export default function HtmlMinifier() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) {
      return { output: "", original: 0, minified: 0, saved: 0, pct: 0 };
    }
    const output = minifyHtml(input);
    const original = byteLength(input);
    const minified = byteLength(output);
    const saved = Math.max(0, original - minified);
    const pct = original > 0 ? (saved / original) * 100 : 0;
    return { output, original, minified, saved, pct };
  }, [input]);

  const hasOutput = result.output.length > 0;
  const fmt = (n) => n.toLocaleString("en-US");

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  async function handleCopy() {
    if (!hasOutput) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // Clipboard can be blocked by the browser; fail quietly rather than crash.
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="html-input">
            HTML input
          </label>
          <textarea
            className="tool-textarea"
            id="html-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder={
              '<!-- page header -->\n<div class="box">\n    <p>Hello   world</p>\n</div>'
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

      {hasOutput ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{fmt(result.original)}</div>
              <div className="tool-stat-label">Original bytes</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{fmt(result.minified)}</div>
              <div className="tool-stat-label">Minified bytes</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{fmt(result.saved)}</div>
              <div className="tool-stat-label">Bytes saved</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.pct.toFixed(1)}%</div>
              <div className="tool-stat-label">Size reduced</div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy minified HTML"}
              </button>
            </div>
            <label className="tool-label" htmlFor="html-output">
              Minified HTML
            </label>
            <pre className="tool-output" id="html-output">
              {result.output}
            </pre>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Paste HTML above to minify it. This is a safe basic minifier: it
          removes comments and collapses insignificant whitespace between tags
          while keeping the contents of &lt;pre&gt;, &lt;textarea&gt;,
          &lt;script&gt; and &lt;style&gt; exactly as written.
        </p>
      )}

      {hasOutput ? (
        <p className="tool-note">
          Safe basic minifier: IE conditional comments and the contents of
          &lt;pre&gt;, &lt;textarea&gt;, &lt;script&gt; and &lt;style&gt; are
          preserved. Everything runs in your browser, so nothing is uploaded.
        </p>
      ) : null}
    </div>
  );
}
