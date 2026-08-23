"use client";

import { useMemo, useState } from "react";

const MAX_ATTRIBUTES = 6;
const MAX_SKUS = 20000;

// Split a comma- or newline-separated list into trimmed, de-duplicated,
// order-preserving values. Empty entries are dropped.
function parseValues(text) {
  if (typeof text !== "string") return [];
  const seen = new Set();
  const out = [];
  for (const raw of text.split(/[\n,]/)) {
    const v = raw.trim();
    if (v === "" || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

// Parse a field into a non-negative integer, or null when invalid.
function parseNonNegInt(text) {
  if (typeof text !== "string") return null;
  const t = text.trim();
  if (t === "" || !/^\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

// Cartesian product of an array of value-arrays. Returns [[]] for no lists.
function cartesian(lists) {
  let acc = [[]];
  for (const list of lists) {
    const next = [];
    for (const combo of acc) {
      for (const item of list) {
        next.push([...combo, item]);
      }
    }
    acc = next;
  }
  return acc;
}

// Quote a CSV field when it contains a comma, quote, or line break.
function csvEscape(value) {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function sanitizeFilename(name) {
  const base = String(name || "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return base || "skus";
}

let attrKeySeq = 0;
function makeAttribute(name, values) {
  attrKeySeq += 1;
  return { key: `attr-${attrKeySeq}`, name, values };
}

export default function SkuGenerator() {
  const [prefix, setPrefix] = useState("TSHIRT");
  const [attributes, setAttributes] = useState(() => [
    makeAttribute("Color", "Red, Blue, Black"),
    makeAttribute("Size", "S, M, L"),
  ]);
  const [separator, setSeparator] = useState("-");
  const [includeNumber, setIncludeNumber] = useState(true);
  const [startText, setStartText] = useState("1");
  const [padText, setPadText] = useState("3");
  const [uppercase, setUppercase] = useState(true);
  const [copied, setCopied] = useState(false);

  function updateAttribute(key, patch) {
    setAttributes((prev) =>
      prev.map((a) => (a.key === key ? { ...a, ...patch } : a))
    );
    setCopied(false);
  }

  function addAttribute() {
    setAttributes((prev) =>
      prev.length >= MAX_ATTRIBUTES ? prev : [...prev, makeAttribute("", "")]
    );
    setCopied(false);
  }

  function removeAttribute(key) {
    setAttributes((prev) => prev.filter((a) => a.key !== key));
    setCopied(false);
  }

  const start = useMemo(() => parseNonNegInt(startText), [startText]);
  const pad = useMemo(() => parseNonNegInt(padText), [padText]);

  const result = useMemo(() => {
    if (includeNumber && start === null) {
      return { skus: [], rows: [], error: "Enter a valid starting number (0 or higher)." };
    }
    if (includeNumber && (pad === null || pad > 12)) {
      return { skus: [], rows: [], error: "Enter a zero-padding width between 0 and 12." };
    }

    const xform = (v) => (uppercase ? String(v).toUpperCase() : String(v));

    // Only attributes that actually have values contribute to combinations.
    const activeLists = [];
    for (const a of attributes) {
      const vals = parseValues(a.values);
      if (vals.length > 0) activeLists.push(vals);
    }

    const cleanPrefix = prefix.trim();
    const hasContent =
      cleanPrefix !== "" || activeLists.length > 0 || includeNumber;
    if (!hasContent) {
      return { skus: [], rows: [], error: "" };
    }

    const total = activeLists.reduce((n, l) => n * l.length, 1);
    if (total > MAX_SKUS) {
      return {
        skus: [],
        rows: [],
        error: `That would produce ${total.toLocaleString(
          "en-US"
        )} SKUs. Reduce your attribute values to ${MAX_SKUS.toLocaleString(
          "en-US"
        )} combinations or fewer.`,
      };
    }

    const combos = cartesian(activeLists);
    const skus = [];
    const rows = [];

    combos.forEach((combo, i) => {
      const parts = [];
      if (cleanPrefix !== "") parts.push(xform(cleanPrefix));
      for (const val of combo) parts.push(xform(val));

      let numStr = "";
      if (includeNumber) {
        numStr = String(start + i).padStart(pad, "0");
        parts.push(uppercase ? numStr.toUpperCase() : numStr);
      }

      const sku = parts.join(separator);
      skus.push(sku);
      rows.push({ sku, values: combo.map(xform), number: numStr });
    });

    return { skus, rows, error: "" };
  }, [
    attributes,
    prefix,
    separator,
    includeNumber,
    start,
    pad,
    uppercase,
  ]);

  const joined = useMemo(() => result.skus.join("\n"), [result.skus]);

  // Column headers for the CSV / preview, derived from attribute names.
  const attrHeaders = useMemo(() => {
    const headers = [];
    attributes.forEach((a, idx) => {
      if (parseValues(a.values).length > 0) {
        const name = a.name.trim();
        headers.push(name === "" ? `Attribute ${idx + 1}` : name);
      }
    });
    return headers;
  }, [attributes]);

  async function handleCopy() {
    if (result.skus.length === 0) return;
    try {
      await navigator.clipboard.writeText(joined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function handleDownload() {
    if (result.rows.length === 0) return;

    const header = ["SKU", ...attrHeaders];
    if (includeNumber) header.push("Number");

    const lines = [header.map(csvEscape).join(",")];
    for (const row of result.rows) {
      const cells = [row.sku, ...row.values];
      if (includeNumber) cells.push(row.number);
      lines.push(cells.map(csvEscape).join(","));
    }

    const csv = lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(prefix)}-skus.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const count = result.skus.length;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sku-prefix">
              Product name / prefix
            </label>
            <input
              id="sku-prefix"
              className="tool-input"
              type="text"
              value={prefix}
              onChange={(e) => {
                setPrefix(e.target.value);
                setCopied(false);
              }}
              placeholder="TSHIRT"
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="sku-separator">
              Separator
            </label>
            <input
              id="sku-separator"
              className="tool-input"
              type="text"
              value={separator}
              onChange={(e) => {
                setSeparator(e.target.value);
                setCopied(false);
              }}
              placeholder="-"
              maxLength={5}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label">Attributes (comma-separated values)</label>
          {attributes.map((attr, idx) => (
            <div
              key={attr.key}
              className="tool-row"
              style={{ alignItems: "flex-end", marginBottom: "0.5rem" }}
            >
              <div className="tool-field" style={{ flex: "0 0 8rem" }}>
                <label
                  className="tool-label"
                  htmlFor={`${attr.key}-name`}
                  style={{ fontWeight: "normal", fontSize: "0.85em" }}
                >
                  Name
                </label>
                <input
                  id={`${attr.key}-name`}
                  className="tool-input"
                  type="text"
                  value={attr.name}
                  onChange={(e) => updateAttribute(attr.key, { name: e.target.value })}
                  placeholder={`Attribute ${idx + 1}`}
                />
              </div>
              <div className="tool-field">
                <label
                  className="tool-label"
                  htmlFor={`${attr.key}-values`}
                  style={{ fontWeight: "normal", fontSize: "0.85em" }}
                >
                  Values
                </label>
                <input
                  id={`${attr.key}-values`}
                  className="tool-input"
                  type="text"
                  value={attr.values}
                  onChange={(e) => updateAttribute(attr.key, { values: e.target.value })}
                  placeholder="Red, Blue, Black"
                />
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => removeAttribute(attr.key)}
                aria-label={`Remove attribute ${idx + 1}`}
                title="Remove attribute"
                style={{ flex: "0 0 auto" }}
              >
                Remove
              </button>
            </div>
          ))}
          {attributes.length < MAX_ATTRIBUTES ? (
            <div className="tool-actions">
              <button type="button" className="btn" onClick={addAttribute}>
                + Add attribute
              </button>
            </div>
          ) : (
            <p className="tool-note">Maximum of {MAX_ATTRIBUTES} attributes.</p>
          )}
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="sku-include-number" style={{ fontWeight: "normal" }}>
            <input
              id="sku-include-number"
              type="checkbox"
              checked={includeNumber}
              onChange={(e) => {
                setIncludeNumber(e.target.checked);
                setCopied(false);
              }}
              style={{ marginRight: "0.5rem" }}
            />
            Append a running number
          </label>
        </div>

        {includeNumber ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="sku-start">
                Starting number
              </label>
              <input
                id="sku-start"
                className="tool-input"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={startText}
                onChange={(e) => {
                  setStartText(e.target.value);
                  setCopied(false);
                }}
                placeholder="1"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sku-pad">
                Zero-padding width
              </label>
              <input
                id="sku-pad"
                className="tool-input"
                type="number"
                inputMode="numeric"
                min={0}
                max={12}
                step={1}
                value={padText}
                onChange={(e) => {
                  setPadText(e.target.value);
                  setCopied(false);
                }}
                placeholder="3"
              />
            </div>
          </div>
        ) : null}

        <div className="tool-field">
          <label className="tool-label" htmlFor="sku-uppercase" style={{ fontWeight: "normal" }}>
            <input
              id="sku-uppercase"
              type="checkbox"
              checked={uppercase}
              onChange={(e) => {
                setUppercase(e.target.checked);
                setCopied(false);
              }}
              style={{ marginRight: "0.5rem" }}
            />
            Force uppercase
          </label>
        </div>
      </div>

      {result.error ? <p className="tool-error">{result.error}</p> : null}

      {count > 0 ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{count.toLocaleString("en-US")}</div>
              <div className="tool-stat-label">{count === 1 ? "SKU" : "SKUs"}</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{attrHeaders.length}</div>
              <div className="tool-stat-label">
                {attrHeaders.length === 1 ? "Attribute" : "Attributes"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.skus[0].length}</div>
              <div className="tool-stat-label">Chars (first SKU)</div>
            </div>
          </div>

          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : count === 1 ? "Copy" : "Copy all"}
            </button>
            <button className="btn" type="button" onClick={handleDownload}>
              Download CSV
            </button>
          </div>

          <label className="tool-label" htmlFor="sku-output">
            Generated SKUs
          </label>
          <pre className="tool-output" id="sku-output" aria-label="Generated SKUs">
            {joined}
          </pre>
        </>
      ) : null}

      {count === 0 && !result.error ? (
        <p className="tool-note">
          Enter a prefix and one or more attribute lists (like colors and sizes)
          to build every combination as a SKU code. Everything runs entirely in
          your browser — nothing is uploaded or stored.
        </p>
      ) : null}
    </div>
  );
}
