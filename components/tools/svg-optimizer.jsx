"use client";

import { useMemo, useRef, useState } from "react";
import { copyText } from "../../lib/copyText";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Created with a vector editor -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.0.dtd" width="240" height="240" viewBox="0 0 240 240">
  <metadata id="meta1">
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"></rdf:RDF>
  </metadata>
  <sodipodi:namedview id="base" pagecolor="#ffffff" inkscape:zoom="1.4142136"/>
  <title>My Logo</title>
  <desc>An example illustration</desc>
  <g inkscape:label="Layer 1" inkscape:groupmode="layer" id="layer1">
    <circle cx="120.00000000" cy="120.00000000" r="100.123456789" fill="#3366cc"/>
    <path d="M60.000000,120.500000 C60.000000,86.86291500 87.36291500,60.00000000 120.99999999,60.00000000" fill="none" stroke="#ffffff" stroke-width="8.0000000"/>
  </g>
</svg>`;

const EDITOR_PREFIXES = ["inkscape", "sodipodi", "sketch", "figma", "adobe", "illustrator", "ns0"];

function byteLength(str) {
  try {
    return new TextEncoder().encode(str).length;
  } catch (e) {
    return str ? str.length : 0;
  }
}

function formatBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  if (n < 1024) return n.toLocaleString("en-US") + " B";
  const kb = n / 1024;
  if (kb < 1024) return (kb < 10 ? kb.toFixed(2) : kb.toFixed(1)) + " KB";
  return (kb / 1024).toFixed(2) + " MB";
}

// Round every decimal number inside a single string (an attribute value) to
// the requested number of places. Integers are left untouched, and non-numeric
// text is preserved. Only touches numbers that actually have a fractional part,
// so ids like "shape2" or hex colors are never altered.
function roundNumbers(str, precision) {
  return str.replace(/-?\d*\.\d+(?:[eE][-+]?\d+)?/g, (match) => {
    const n = Number(match);
    if (!Number.isFinite(n)) return match;
    const rounded = Number(n.toFixed(precision));
    // Number() drops any trailing zeros the toFixed produced.
    return String(rounded);
  });
}

function hasEditorPrefix(name) {
  const lower = name.toLowerCase();
  return EDITOR_PREFIXES.some((p) => lower.startsWith(p + ":"));
}

function optimize(source, opts) {
  const text = String(source || "");
  if (!text.trim()) {
    return { ok: true, output: "", removed: 0 };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    return {
      ok: false,
      error:
        "This SVG could not be parsed. Check for unclosed or mismatched tags, then try again.",
    };
  }
  const svg = doc.documentElement;
  if (!svg || svg.tagName.toLowerCase() !== "svg") {
    return {
      ok: false,
      error: "No <svg> root element was found. Paste markup containing <svg> … </svg>.",
    };
  }

  const elements = Array.from(doc.getElementsByTagName("*"));

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();

    // 1. Drop editor-only and metadata elements.
    if (opts.removeEditorData && (hasEditorPrefix(tag) || tag === "sodipodi:namedview")) {
      el.remove();
      continue;
    }
    if (opts.removeMetadata && (tag === "metadata" || tag === "title" || tag === "desc")) {
      el.remove();
      continue;
    }

    // 2. Clean up attributes on the surviving elements.
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name;
      const lower = name.toLowerCase();

      if (opts.removeEditorData) {
        if (hasEditorPrefix(name)) {
          el.removeAttribute(name);
          continue;
        }
        // Namespace declarations for editor tooling (xmlns:inkscape, etc.).
        if (lower.startsWith("xmlns:")) {
          const suffix = lower.slice("xmlns:".length);
          if (
            EDITOR_PREFIXES.includes(suffix) ||
            suffix === "dc" ||
            suffix === "cc" ||
            suffix === "rdf"
          ) {
            el.removeAttribute(name);
            continue;
          }
        }
      }

      if (opts.removeEmptyAttrs && attr.value.trim() === "" && lower !== "d") {
        el.removeAttribute(name);
        continue;
      }

      if (opts.roundNumbers && attr.value) {
        const rounded = roundNumbers(attr.value, opts.precision);
        if (rounded !== attr.value) el.setAttribute(name, rounded);
      }
    }
  }

  // Remove now-empty <g> groups that carry no attributes and no children.
  if (opts.removeEmptyGroups) {
    let changed = true;
    while (changed) {
      changed = false;
      const groups = Array.from(doc.getElementsByTagName("g"));
      for (const g of groups) {
        if (g.attributes.length === 0 && g.childNodes.length === 0) {
          g.remove();
          changed = true;
        }
      }
    }
  }

  let out = new XMLSerializer().serializeToString(svg);

  // Text-level cleanups on the serialized string.
  if (opts.removeComments) {
    out = out.replace(/<!--[\s\S]*?-->/g, "");
  }
  if (opts.collapseWhitespace) {
    // Whitespace that sits purely between tags carries no visual meaning.
    out = out.replace(/>\s+</g, "><");
    // Trim runs of spaces/newlines inside the markup down to single spaces.
    out = out.replace(/[\t\r\n]+/g, " ").replace(/  +/g, " ");
  }
  // Strip a leading XML declaration / doctype (browsers render SVG without it).
  if (opts.removeXmlDecl) {
    out = out.replace(/<\?xml[\s\S]*?\?>/gi, "").replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  }

  out = out.trim();

  return { ok: true, output: out };
}

const DEFAULT_OPTS = {
  removeComments: true,
  removeEditorData: true,
  removeMetadata: true,
  removeEmptyAttrs: true,
  removeEmptyGroups: true,
  collapseWhitespace: true,
  removeXmlDecl: true,
  roundNumbers: true,
  precision: 3,
};

export default function SvgOptimizer() {
  const [input, setInput] = useState(SAMPLE);
  const [opts, setOpts] = useState(DEFAULT_OPTS);
  const [fileName, setFileName] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  const result = useMemo(() => optimize(input, opts), [input, opts]);

  const originalBytes = useMemo(() => byteLength(input), [input]);
  const optimizedBytes = result.ok ? byteLength(result.output) : 0;
  const saved =
    result.ok && originalBytes > 0
      ? Math.max(0, (1 - optimizedBytes / originalBytes) * 100)
      : 0;

  function toggle(key) {
    setOpts((prev) => ({ ...prev, [key]: !prev[key] }));
    setCopied(false);
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    setCopied(false);
  }

  function handleFile(file) {
    if (!file) return;
    const name = file.name || "";
    const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(name);
    if (!isSvg) {
      setFileName("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setInput(typeof reader.result === "string" ? reader.result : "");
      setFileName(name);
      setCopied(false);
    };
    reader.readAsText(file);
  }

  function onFileChange(e) {
    const file = e.target.files && e.target.files[0];
    handleFile(file);
    e.target.value = "";
  }

  function handleClear() {
    setInput("");
    setFileName("");
    setCopied(false);
  }

  function handleSample() {
    setInput(SAMPLE);
    setFileName("");
    setCopied(false);
  }

  async function handleCopy() {
    if (!result.ok || !result.output) return;
    try {
      await copyText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleDownload() {
    if (!result.ok || !result.output) return;
    const blob = new Blob([result.output], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const base = (fileName || "image").replace(/\.[^./\\]+$/, "");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base || "image"}.min.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const OPTION_LIST = [
    ["removeComments", "Remove comments"],
    ["removeEditorData", "Remove editor data (Inkscape, Illustrator…)"],
    ["removeMetadata", "Remove metadata, title & desc"],
    ["removeEmptyAttrs", "Remove empty attributes"],
    ["removeEmptyGroups", "Remove empty groups"],
    ["collapseWhitespace", "Collapse whitespace"],
    ["removeXmlDecl", "Remove XML declaration & doctype"],
    ["roundNumbers", "Round numbers"],
  ];

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="svg-optimizer-file">
              Upload an .svg file (optional)
            </label>
            <input
              id="svg-optimizer-file"
              ref={inputRef}
              className="tool-input"
              type="file"
              accept=".svg,image/svg+xml"
              onChange={onFileChange}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="svg-optimizer-input">
            SVG markup
          </label>
          <textarea
            id="svg-optimizer-input"
            className="tool-textarea"
            value={input}
            onChange={handleInputChange}
            rows={12}
            spellCheck={false}
            placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">…</svg>'
          />
          <p className="tool-note">
            Paste SVG code or upload a file. Optimization runs live, entirely in
            your browser — nothing is uploaded.
          </p>
        </div>

        <div className="tool-field">
          <label className="tool-label">Optimizations</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "6px 16px",
              marginTop: "4px",
            }}
          >
            {OPTION_LIST.map(([key, label]) => (
              <label
                key={key}
                htmlFor={`svg-opt-${key}`}
                style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
              >
                <input
                  id={`svg-opt-${key}`}
                  type="checkbox"
                  checked={opts[key]}
                  onChange={() => toggle(key)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {opts.roundNumbers ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="svg-optimizer-precision">
                Number precision (decimal places)
              </label>
              <select
                id="svg-optimizer-precision"
                className="tool-select"
                value={String(opts.precision)}
                onChange={(e) => {
                  setOpts((prev) => ({ ...prev, precision: parseInt(e.target.value, 10) }));
                  setCopied(false);
                }}
              >
                <option value="0">0 — whole numbers</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3 (recommended)</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
              <p className="tool-note">
                Fewer decimals means smaller files. 2–3 places is visually lossless
                for most icons and logos.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleSample}>
          Load example
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {!result.ok ? <div className="tool-error">{result.error}</div> : null}

      {result.ok && result.output ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(originalBytes)}</div>
              <div className="tool-stat-label">Original size</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(optimizedBytes)}</div>
              <div className="tool-stat-label">Optimized size</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{saved.toFixed(1)}%</div>
              <div className="tool-stat-label">Smaller</div>
            </div>
          </div>

          <div className="tool-result">
            <div className="tool-result-label">Preview</div>
            <div className="tool-result-value">
              <div
                style={{
                  display: "inline-block",
                  maxWidth: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(128,128,128,0.35)",
                  backgroundColor: "#ffffff",
                }}
                // The optimized SVG is generated from user input in this same
                // browser session and never leaves the page; rendering it here
                // is the whole point of an SVG preview.
                dangerouslySetInnerHTML={{ __html: result.output }}
              />
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy optimized SVG"}
              </button>
              <button className="btn btn-success" type="button" onClick={handleDownload}>
                Download .min.svg
              </button>
            </div>
            <label className="tool-label" htmlFor="svg-optimizer-output">
              Optimized SVG
            </label>
            <pre className="tool-output" id="svg-optimizer-output">
              {result.output}
            </pre>
          </div>
        </>
      ) : null}

      {result.ok && !result.output ? (
        <p className="tool-note">
          Paste SVG markup or upload an .svg file above to shrink it. The tool
          removes comments, editor metadata, and redundant whitespace, and rounds
          long decimal coordinates — all live in your browser.
        </p>
      ) : null}
    </div>
  );
}
