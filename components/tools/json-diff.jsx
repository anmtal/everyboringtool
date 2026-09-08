"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

const EXAMPLE_A = `{
  "name": "Acme Widget",
  "version": "1.4.0",
  "price": 19.99,
  "inStock": true,
  "tags": ["tools", "hardware"],
  "dimensions": { "w": 10, "h": 5, "d": 2 },
  "sku": "AW-1001"
}`;

const EXAMPLE_B = `{
  "name": "Acme Widget Pro",
  "version": "1.5.0",
  "price": 24.99,
  "inStock": true,
  "tags": ["tools", "hardware", "premium"],
  "dimensions": { "w": 12, "h": 5, "d": 2 },
  "weight": 340
}`;

// Return a stable, human-readable type name for a JSON value.
function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

// Render a value compactly for display in the diff list.
function preview(v) {
  if (v === undefined) return "(missing)";
  try {
    const s = JSON.stringify(v);
    if (s === undefined) return String(v);
    return s.length > 120 ? s.slice(0, 117) + "..." : s;
  } catch (e) {
    return String(v);
  }
}

// Escape a path segment for JSONPath-style display.
function joinPath(base, key, isIndex) {
  if (isIndex) return `${base}[${key}]`;
  // Use bracket notation for keys that are not simple identifiers.
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
    return base ? `${base}.${key}` : key;
  }
  return `${base}[${JSON.stringify(key)}]`;
}

// Deep-compare two parsed JSON values, collecting a flat list of differences.
// Each entry: { path, type: "added" | "removed" | "changed", oldVal, newVal }
function diffValues(a, b, path, out) {
  const ta = typeOf(a);
  const tb = typeOf(b);

  if (ta !== tb) {
    out.push({ path: path || "(root)", kind: "changed", oldVal: a, newVal: b });
    return;
  }

  if (ta === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    // Sort keys for deterministic output.
    for (const key of [...keys].sort()) {
      const hasA = Object.prototype.hasOwnProperty.call(a, key);
      const hasB = Object.prototype.hasOwnProperty.call(b, key);
      const childPath = joinPath(path, key, false);
      if (hasA && !hasB) {
        out.push({ path: childPath, kind: "removed", oldVal: a[key], newVal: undefined });
      } else if (!hasA && hasB) {
        out.push({ path: childPath, kind: "added", oldVal: undefined, newVal: b[key] });
      } else {
        diffValues(a[key], b[key], childPath, out);
      }
    }
    return;
  }

  if (ta === "array") {
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      const inA = i < a.length;
      const inB = i < b.length;
      const childPath = joinPath(path, i, true);
      if (inA && !inB) {
        out.push({ path: childPath, kind: "removed", oldVal: a[i], newVal: undefined });
      } else if (!inA && inB) {
        out.push({ path: childPath, kind: "added", oldVal: undefined, newVal: b[i] });
      } else {
        diffValues(a[i], b[i], childPath, out);
      }
    }
    return;
  }

  // Primitives: string, number, boolean, null.
  if (a !== b) {
    out.push({ path: path || "(root)", kind: "changed", oldVal: a, newVal: b });
  }
}

const KIND_LABEL = {
  added: "Added",
  removed: "Removed",
  changed: "Changed",
};

export default function JsonDiff() {
  const [leftText, setLeftText] = useState(EXAMPLE_A);
  const [rightText, setRightText] = useState(EXAMPLE_B);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const leftTrim = leftText.trim();
    const rightTrim = rightText.trim();

    if (!leftTrim || !rightTrim) {
      return { status: "empty" };
    }

    let a;
    let b;
    try {
      a = JSON.parse(leftTrim);
    } catch (e) {
      return { status: "error", side: "left", message: e.message };
    }
    try {
      b = JSON.parse(rightTrim);
    } catch (e) {
      return { status: "error", side: "right", message: e.message };
    }

    const diffs = [];
    diffValues(a, b, "", diffs);

    const counts = { added: 0, removed: 0, changed: 0 };
    for (const d of diffs) counts[d.kind] += 1;

    return { status: "ok", diffs, counts };
  }, [leftText, rightText]);

  const copyOutput = useMemo(() => {
    if (result.status !== "ok" || result.diffs.length === 0) return "";
    return result.diffs
      .map((d) => {
        if (d.kind === "added") return `+ ${d.path}: ${preview(d.newVal)}`;
        if (d.kind === "removed") return `- ${d.path}: ${preview(d.oldVal)}`;
        return `~ ${d.path}: ${preview(d.oldVal)} -> ${preview(d.newVal)}`;
      })
      .join("\n");
  }, [result]);

  async function handleCopy() {
    if (!copyOutput) return;
    try {
      await copyText(copyOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function loadExample() {
    setLeftText(EXAMPLE_A);
    setRightText(EXAMPLE_B);
    setCopied(false);
  }

  function handleClear() {
    setLeftText("");
    setRightText("");
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="json-left">
              Original JSON (A)
            </label>
            <textarea
              className="tool-textarea"
              id="json-left"
              value={leftText}
              onChange={(e) => {
                setLeftText(e.target.value);
                setCopied(false);
              }}
              placeholder='{ "key": "value" }'
              rows={12}
              spellCheck={false}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="json-right">
              Changed JSON (B)
            </label>
            <textarea
              className="tool-textarea"
              id="json-right"
              value={rightText}
              onChange={(e) => {
                setRightText(e.target.value);
                setCopied(false);
              }}
              placeholder='{ "key": "new value" }'
              rows={12}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={loadExample}>
          Load example
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {result.status === "error" ? (
        <p className="tool-error">
          {result.side === "left" ? "Original (A)" : "Changed (B)"} is not valid
          JSON: {result.message}
        </p>
      ) : null}

      {result.status === "ok" ? (
        <div role="status" aria-live="polite">
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{result.counts.added}</div>
              <div className="tool-stat-label">Added</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.counts.removed}</div>
              <div className="tool-stat-label">Removed</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.counts.changed}</div>
              <div className="tool-stat-label">Changed</div>
            </div>
          </div>

          {result.diffs.length === 0 ? (
            <div className="tool-result">
              <div className="tool-result-label">Result</div>
              <div className="tool-result-value">
                The two JSON documents are identical in value.
              </div>
            </div>
          ) : (
            <>
              <div className="tool-actions">
                <button
                  className={copied ? "btn btn-success" : "btn btn-primary"}
                  type="button"
                  onClick={handleCopy}
                >
                  {copied ? "Copied!" : "Copy diff"}
                </button>
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="json-diff-output">
                  Differences ({result.diffs.length})
                </label>
                <pre className="tool-output" id="json-diff-output">
                  {result.diffs
                    .map((d) => {
                      const label = KIND_LABEL[d.kind];
                      if (d.kind === "added") {
                        return `+ [${label}] ${d.path}\n    ${preview(d.newVal)}`;
                      }
                      if (d.kind === "removed") {
                        return `- [${label}] ${d.path}\n    ${preview(d.oldVal)}`;
                      }
                      return `~ [${label}] ${d.path}\n    ${preview(
                        d.oldVal
                      )}  ->  ${preview(d.newVal)}`;
                    })
                    .join("\n\n")}
                </pre>
              </div>
            </>
          )}
        </div>
      ) : null}

      {result.status === "empty" ? (
        <p className="tool-note">
          Paste JSON into both boxes to compare them. This tool parses each side,
          walks every key and array index recursively, and lists exactly what was
          added, removed, or changed with its full path (like{" "}
          <code>dimensions.w</code> or <code>tags[2]</code>). Key order and
          whitespace are ignored, so only real value differences are reported.
          Everything runs privately in your browser.
        </p>
      ) : null}
    </div>
  );
}
