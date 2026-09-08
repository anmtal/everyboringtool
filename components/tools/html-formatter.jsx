"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Elements that never have a closing tag.
const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "keygen", "link", "meta", "param", "source", "track", "wbr",
]);
// Elements whose inner content is captured verbatim (never parsed as HTML).
const RAW_CAPTURE = new Set(["script", "style", "pre", "textarea"]);
// Of those, ones we re-indent (code) vs. ones we output byte-for-byte.
const RAW_INDENT = new Set(["script", "style"]);
const PRESERVE = new Set(["pre", "textarea"]);

const INLINE_MAX = 80;

// ---- Tokenizer -----------------------------------------------------------

function tokenize(html) {
  const tokens = [];
  const n = html.length;
  const lower = html.toLowerCase();
  let i = 0;

  while (i < n) {
    if (html[i] === "<") {
      // Comment
      if (html.startsWith("<!--", i)) {
        let end = html.indexOf("-->", i + 4);
        end = end === -1 ? n : end + 3;
        tokens.push({ type: "comment", text: html.slice(i, end) });
        i = end;
        continue;
      }
      // Doctype / declaration
      if (html[i + 1] === "!") {
        let end = html.indexOf(">", i);
        end = end === -1 ? n : end + 1;
        tokens.push({ type: "doctype", text: html.slice(i, end) });
        i = end;
        continue;
      }
      // Processing instruction (e.g. <?xml ... ?>)
      if (html[i + 1] === "?") {
        let end = html.indexOf(">", i);
        end = end === -1 ? n : end + 1;
        tokens.push({ type: "doctype", text: html.slice(i, end) });
        i = end;
        continue;
      }
      // Closing tag
      if (html[i + 1] === "/") {
        let end = html.indexOf(">", i);
        end = end === -1 ? n : end + 1;
        const inner = html.slice(i + 2, end - 1).trim();
        const name = inner.split(/\s/)[0];
        tokens.push({ type: "close", lname: name.toLowerCase() });
        i = end;
        continue;
      }
      // Opening tag — scan to the matching ">" while respecting quotes.
      let j = i + 1;
      let quote = null;
      while (j < n) {
        const c = html[j];
        if (quote) {
          if (c === quote) quote = null;
        } else if (c === '"' || c === "'") {
          quote = c;
        } else if (c === ">") {
          break;
        }
        j += 1;
      }
      const end = j < n ? j + 1 : n;
      let inner = html.slice(i + 1, j);
      let selfClose = false;
      if (inner.endsWith("/")) {
        selfClose = true;
        inner = inner.slice(0, -1);
      }
      const nameMatch = inner.match(/^([a-zA-Z][\w:-]*)/);
      if (!nameMatch) {
        // Stray "<" — treat as text.
        tokens.push({ type: "text", text: html.slice(i, end) });
        i = end;
        continue;
      }
      const name = nameMatch[1];
      const lname = name.toLowerCase();
      const attrs = inner.slice(name.length).trim();
      tokens.push({ type: "open", name, lname, attrs, selfClose });
      i = end;

      // Capture verbatim content for raw elements.
      if (!selfClose && !VOID.has(lname) && RAW_CAPTURE.has(lname)) {
        const closeIdx = lower.indexOf("</" + lname, i);
        const contentEnd = closeIdx === -1 ? n : closeIdx;
        tokens.push({ type: "rawtext", text: html.slice(i, contentEnd) });
        i = contentEnd;
      }
      continue;
    }

    // Text run
    let end = html.indexOf("<", i);
    if (end === -1) end = n;
    tokens.push({ type: "text", text: html.slice(i, end) });
    i = end;
  }

  return tokens;
}

// ---- Tree builder --------------------------------------------------------

function buildTree(tokens) {
  const root = { type: "root", children: [] };
  const stack = [root];

  for (const t of tokens) {
    const parent = stack[stack.length - 1];
    if (t.type === "open") {
      const el = {
        type: "element",
        name: t.name,
        lname: t.lname,
        attrs: t.attrs,
        selfClose: t.selfClose,
        isVoid: t.selfClose || VOID.has(t.lname),
        raw: RAW_INDENT.has(t.lname),
        preserve: PRESERVE.has(t.lname),
        children: [],
      };
      parent.children.push(el);
      if (!el.isVoid) stack.push(el);
    } else if (t.type === "close") {
      // Pop to the nearest matching open element; ignore unmatched closers.
      for (let k = stack.length - 1; k >= 1; k -= 1) {
        if (stack[k].type === "element" && stack[k].lname === t.lname) {
          stack.length = k;
          break;
        }
      }
    } else {
      parent.children.push(t);
    }
  }

  return root;
}

// ---- Printer -------------------------------------------------------------

function collapse(text) {
  return text.replace(/\s+/g, " ").trim();
}

function isBlankText(node) {
  return node.type === "text" && !node.text.trim();
}

function normalizeAttrs(s) {
  // Collapse runs of whitespace that fall outside quoted values.
  let out = "";
  let quote = null;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (quote) {
      out += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      out += c;
      continue;
    }
    if (/\s/.test(c)) {
      if (out.length && !out.endsWith(" ")) out += " ";
      continue;
    }
    out += c;
  }
  return out.trim();
}

function openTag(node, opt) {
  const name = opt.lowercase ? node.lname : node.name;
  const attrs = node.attrs ? " " + normalizeAttrs(node.attrs) : "";
  const slash = node.selfClose ? " /" : "";
  return "<" + name + attrs + slash + ">";
}

function closeTag(node, opt) {
  return "</" + (opt.lowercase ? node.lname : node.name) + ">";
}

function pushMultiline(out, pad, text) {
  const lines = text.split("\n");
  if (lines.length === 1) {
    out.push(pad + text.trim());
    return;
  }
  out.push(pad + lines[0].trim());
  for (let k = 1; k < lines.length; k += 1) {
    const l = lines[k].trim();
    out.push(l ? pad + l : "");
  }
}

// Re-indent raw code (script/style) under the given depth, keeping relative
// indentation but dropping the shared leading whitespace and blank edges.
function pushRawIndented(out, depth, opt, text) {
  const pad = opt.indent.repeat(depth);
  let lines = text.replace(/\t/g, "  ").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  let min = Infinity;
  for (const l of lines) {
    if (!l.trim()) continue;
    const m = l.match(/^\s*/)[0].length;
    if (m < min) min = m;
  }
  if (!isFinite(min)) min = 0;
  for (const l of lines) out.push(l.trim() ? pad + l.slice(min) : "");
}

function renderNode(node, depth, opt, out) {
  const pad = opt.indent.repeat(depth);

  if (node.type === "text") {
    const t = collapse(node.text);
    if (t) out.push(pad + t);
    return;
  }
  if (node.type === "comment") {
    pushMultiline(out, pad, node.text);
    return;
  }
  if (node.type === "doctype") {
    out.push(pad + node.text.replace(/\s+/g, " ").trim());
    return;
  }
  if (node.type === "rawtext") {
    pushRawIndented(out, depth, opt, node.text);
    return;
  }
  if (node.type !== "element") return;

  const open = openTag(node, opt);

  if (node.isVoid) {
    out.push(pad + open);
    return;
  }

  const close = closeTag(node, opt);

  // pre / textarea — emit inner content byte-for-byte.
  if (node.preserve) {
    const inner = node.children.map((c) => c.text || "").join("");
    out.push(pad + open + inner + close);
    return;
  }

  // script / style — re-indent the captured code.
  if (node.raw) {
    const inner = node.children.map((c) => c.text || "").join("");
    if (!inner.trim()) {
      out.push(pad + open + close);
      return;
    }
    out.push(pad + open);
    pushRawIndented(out, depth + 1, opt, inner);
    out.push(pad + close);
    return;
  }

  const kids = node.children.filter((c) => !isBlankText(c));

  if (kids.length === 0) {
    out.push(pad + open + close);
    return;
  }

  // Element whose only content is text — keep it on one line when short.
  if (kids.every((k) => k.type === "text")) {
    const text = collapse(kids.map((k) => k.text).join(""));
    if (text.length <= INLINE_MAX) {
      out.push(pad + open + text + close);
    } else {
      out.push(pad + open);
      out.push(opt.indent.repeat(depth + 1) + text);
      out.push(pad + close);
    }
    return;
  }

  out.push(pad + open);
  for (const k of kids) renderNode(k, depth + 1, opt, out);
  out.push(pad + close);
}

function beautify(html, opt) {
  const tree = buildTree(tokenize(html));
  const out = [];
  for (const child of tree.children) renderNode(child, 0, opt, out);
  // Collapse 3+ consecutive blank lines down to one.
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// ---- Minify --------------------------------------------------------------

function minifyNode(node, opt) {
  if (node.type === "text") return node.text.replace(/\s+/g, " ");
  if (node.type === "rawtext") return node.text;
  if (node.type === "comment") return ""; // comments dropped when minifying
  if (node.type === "doctype") return node.text.replace(/\s+/g, " ").trim();
  if (node.type === "root") {
    return node.children.map((c) => minifyNode(c, opt)).join("");
  }
  if (node.type === "element") {
    const open = openTag(node, opt);
    if (node.isVoid) return open;
    const inner = node.children.map((c) => minifyNode(c, opt)).join("");
    return open + inner + closeTag(node, opt);
  }
  return "";
}

function minify(html, opt) {
  const tree = buildTree(tokenize(html));
  return minifyNode(tree, opt).replace(/\s+/g, (m) =>
    m.includes("\n") ? " " : m
  ).trim();
}

// ---- Sizing helpers ------------------------------------------------------

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

const SAMPLE =
  '<!DOCTYPE html><html><head><title>Demo</title>' +
  '<style>body{margin:0;font-family:system-ui}</style></head>' +
  '<body><header class="top"><h1>Hello   world</h1>' +
  "<nav><ul><li><a href=\"/\">Home</a></li><li><a href='/about'>About</a></li></ul></nav>" +
  "</header><main><p>A short paragraph of text.</p><img src=\"logo.png\" alt=\"logo\">" +
  "<!-- footer below --><footer><p>&copy; 2026</p></footer></main></body></html>";

// ---- Component -----------------------------------------------------------

export default function HtmlFormatter() {
  const [input, setInput] = useState(SAMPLE);
  const [indentKind, setIndentKind] = useState("2");
  const [lowercase, setLowercase] = useState(false);
  const [mode, setMode] = useState("beautify");
  const [copied, setCopied] = useState(false);

  const opt = useMemo(() => {
    const indent =
      indentKind === "tab" ? "\t" : " ".repeat(parseInt(indentKind, 10) || 2);
    return { indent, lowercase };
  }, [indentKind, lowercase]);

  const result = useMemo(() => {
    if (!input.trim()) return { output: "", error: "" };
    try {
      const output =
        mode === "minify" ? minify(input, opt) : beautify(input, opt);
      return { output, error: "" };
    } catch (e) {
      return { output: "", error: "Could not process this HTML: " + e.message };
    }
  }, [input, opt, mode]);

  const stats = useMemo(() => {
    const inBytes = byteLength(input);
    const outBytes = byteLength(result.output);
    const lines = result.output ? result.output.replace(/\n$/, "").split("\n").length : 0;
    const delta =
      inBytes > 0 ? (1 - outBytes / inBytes) * 100 : 0;
    return { inBytes, outBytes, lines, delta };
  }, [input, result.output]);

  function handleInput(e) {
    setInput(e.target.value);
    setCopied(false);
  }

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  function handleSample() {
    setInput(SAMPLE);
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

  function handleDownload() {
    if (!result.output) return;
    const blob = new Blob([result.output], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mode === "minify" ? "minified.html" : "formatted.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="html-input">
            HTML to {mode === "minify" ? "minify" : "format"}
          </label>
          <textarea
            id="html-input"
            className="tool-textarea"
            value={input}
            onChange={handleInput}
            placeholder="Paste your HTML here…"
            rows={12}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="html-mode">
              Mode
            </label>
            <select
              id="html-mode"
              className="tool-select"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setCopied(false);
              }}
            >
              <option value="beautify">Beautify (indent)</option>
              <option value="minify">Minify (compress)</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="html-indent">
              Indentation
            </label>
            <select
              id="html-indent"
              className="tool-select"
              value={indentKind}
              onChange={(e) => setIndentKind(e.target.value)}
              disabled={mode === "minify"}
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="tab">Tab</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="html-lowercase">
              Tag names
            </label>
            <select
              id="html-lowercase"
              className="tool-select"
              value={lowercase ? "lower" : "keep"}
              onChange={(e) => setLowercase(e.target.value === "lower")}
            >
              <option value="keep">Keep as typed</option>
              <option value="lower">Force lowercase</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleSample}>
          Load sample
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {result.error ? (
        <p className="tool-error" role="status" aria-live="polite">
          {result.error}
        </p>
      ) : result.output ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(stats.inBytes)}</div>
              <div className="tool-stat-label">Input size</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(stats.outBytes)}</div>
              <div className="tool-stat-label">Output size</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {stats.lines.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Lines</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {(stats.delta >= 0 ? "-" : "+") +
                  Math.abs(stats.delta).toFixed(1) +
                  "%"}
              </div>
              <div className="tool-stat-label">Size change</div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy output"}
              </button>
              <button className="btn" type="button" onClick={handleDownload}>
                Download .html
              </button>
            </div>
            <label className="tool-label" htmlFor="html-output">
              {mode === "minify" ? "Minified HTML" : "Formatted HTML"}
            </label>
            <pre className="tool-output" id="html-output">
              {result.output}
            </pre>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Paste HTML above to clean it up. Beautify re-indents nested tags and
          puts each element on its own line; Minify strips comments and
          collapses whitespace. Content inside{" "}
          <code>pre</code>, <code>textarea</code>, <code>script</code> and{" "}
          <code>style</code> is kept intact. Everything runs in your browser —
          nothing is uploaded.
        </p>
      )}
    </div>
  );
}
