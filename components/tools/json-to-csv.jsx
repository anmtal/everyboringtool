"use client";

import { useState, useMemo } from "react";

// Turn a single cell value into its CSV string representation.
// Objects/arrays are JSON-encoded; null/undefined become empty strings.
function cellToString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return "";
    }
  }
  return String(value);
}

// Escape a value for CSV per RFC 4180: wrap in double quotes when it
// contains a comma, double quote, or line break, and double any quotes.
function escapeCsv(value) {
  const str = cellToString(value);
  if (/[",\r\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Convert an array of objects into CSV text.
// The header is the union of all keys, ordered by first appearance.
function buildCsv(rows) {
  const headers = [];
  const seen = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }

  const lines = [];
  lines.push(headers.map(escapeCsv).join(","));
  for (const row of rows) {
    const cells = headers.map((key) =>
      Object.prototype.hasOwnProperty.call(row, key) ? escapeCsv(row[key]) : ""
    );
    lines.push(cells.join(","));
  }

  return { csv: lines.join("\r\n"), headers };
}

export default function JsonToCsv() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) {
      return { output: "", rowCount: 0, colCount: 0, error: "" };
    }

    let parsed;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      return {
        output: "",
        rowCount: 0,
        colCount: 0,
        error: "Invalid JSON. Please check for typos, missing commas, or unmatched brackets.",
      };
    }

    // Accept a single object by treating it as a one-row array.
    let rows;
    if (Array.isArray(parsed)) {
      rows = parsed;
    } else if (parsed && typeof parsed === "object") {
      rows = [parsed];
    } else {
      return {
        output: "",
        rowCount: 0,
        colCount: 0,
        error: "Expected a JSON array of objects (or a single object).",
      };
    }

    if (rows.length === 0) {
      return {
        output: "",
        rowCount: 0,
        colCount: 0,
        error: "The array is empty — nothing to convert.",
      };
    }

    // Every element must be a plain (non-array) object to form a row.
    const allObjects = rows.every(
      (r) => r !== null && typeof r === "object" && !Array.isArray(r)
    );
    if (!allObjects) {
      return {
        output: "",
        rowCount: 0,
        colCount: 0,
        error: "Every item in the array must be an object, e.g. [{\"name\":\"Ada\"}].",
      };
    }

    let csv, headers;
    try {
      ({ csv, headers } = buildCsv(rows));
    } catch (e) {
      return {
        output: "",
        rowCount: 0,
        colCount: 0,
        error: "Could not convert the data to CSV.",
      };
    }

    return {
      output: csv,
      rowCount: rows.length,
      colCount: headers.length,
      error: "",
    };
  }, [input]);

  async function handleCopy() {
    if (!result.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleDownload() {
    if (!result.output) return;
    const blob = new Blob([result.output], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="json-input">
            JSON input
          </label>
          <textarea
            className="tool-textarea"
            id="json-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder={
              '[\n  {"name": "Ada", "role": "Engineer", "city": "London"},\n  {"name": "Grace, Jr.", "role": "Admiral", "note": "Says \\"hi\\""}\n]'
            }
            rows={10}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {result.error ? <p className="tool-error">{result.error}</p> : null}

      {result.output ? (
        <>
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.rowCount.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">
                {result.rowCount === 1 ? "Row" : "Rows"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.colCount.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">
                {result.colCount === 1 ? "Column" : "Columns"}
              </div>
            </div>
          </div>

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
                Download .csv
              </button>
            </div>
            <label className="tool-label" htmlFor="csv-output">
              CSV output
            </label>
            <pre className="tool-output" id="csv-output">
              {result.output}
            </pre>
          </div>
        </>
      ) : null}

      {!result.output && !result.error ? (
        <p className="tool-note">
          Paste a JSON array of objects above to convert it to CSV instantly. The
          header row is the union of every object&apos;s keys, and values
          containing commas, quotes, or line breaks are quoted and escaped
          automatically. Everything runs in your browser.
        </p>
      ) : null}
    </div>
  );
}
