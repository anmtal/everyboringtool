"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

const DELIMITERS = {
  comma: { label: "Comma (,)", char: "," },
  semicolon: { label: "Semicolon (;)", char: ";" },
  tab: { label: "Tab", char: "\t" },
};

// Parse CSV text into an array of row arrays.
// Handles double-quoted fields containing the delimiter, newlines, and
// escaped quotes ("" inside a quoted field becomes a literal ").
function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;
  let started = false; // whether the current row has any content yet

  while (i < len) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // Escaped quote
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    // A double-quote only opens a quoted field at the START of a field. Treating
    // any bare quote as an opener meant a value like  5" pipe  put the parser into
    // quoted mode, and because the quote never closed, the entire rest of the file
    // was swallowed into one field with no error. Mid-field quotes are literal.
    if (ch === '"' && field === "") {
      inQuotes = true;
      started = true;
      i += 1;
      continue;
    }

    if (ch === delimiter) {
      row.push(field);
      field = "";
      started = true;
      i += 1;
      continue;
    }

    if (ch === "\r") {
      // Handle CRLF and lone CR as a line break
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      started = false;
      if (text[i + 1] === "\n") i += 2;
      else i += 1;
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      started = false;
      i += 1;
      continue;
    }

    field += ch;
    started = true;
    i += 1;
  }

  // Flush the final field/row if there is any pending content.
  if (started || field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export default function CsvToJson() {
  const [input, setInput] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [delimiterKey, setDelimiterKey] = useState("comma");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) {
      return { output: "", rowCount: 0, error: "" };
    }

    const delimiter = DELIMITERS[delimiterKey].char;

    let rows;
    try {
      rows = parseCsv(input, delimiter);
    } catch (e) {
      return { output: "", rowCount: 0, error: "Could not parse the CSV input." };
    }

    // Drop trailing fully-empty rows (e.g. a single blank line at the end).
    while (
      rows.length > 0 &&
      rows[rows.length - 1].length === 1 &&
      rows[rows.length - 1][0] === ""
    ) {
      rows.pop();
    }

    if (rows.length === 0) {
      return { output: "", rowCount: 0, error: "" };
    }

    let data;
    let rowCount;

    if (hasHeader) {
      const headers = rows[0].map((h, idx) => {
        const name = h.trim();
        return name === "" ? `column_${idx + 1}` : name;
      });
      const dataRows = rows.slice(1);
      rowCount = dataRows.length;
      data = dataRows.map((cells) => {
        const obj = {};
        headers.forEach((key, idx) => {
          obj[key] = idx < cells.length ? cells[idx] : "";
        });
        return obj;
      });
    } else {
      rowCount = rows.length;
      data = rows;
    }

    let output;
    try {
      output = JSON.stringify(data, null, 2);
    } catch (e) {
      return { output: "", rowCount: 0, error: "Could not convert the data to JSON." };
    }

    return { output, rowCount, error: "" };
  }, [input, hasHeader, delimiterKey]);

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

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="csv-input">
            CSV input
          </label>
          <textarea
            className="tool-textarea"
            id="csv-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCopied(false);
            }}
            placeholder={
              'name,age,city\n"Smith, John",42,"New York"\nJane,29,Boston'
            }
            rows={10}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="csv-delimiter">
              Delimiter
            </label>
            <select
              className="tool-select"
              id="csv-delimiter"
              value={delimiterKey}
              onChange={(e) => {
                setDelimiterKey(e.target.value);
                setCopied(false);
              }}
            >
              {Object.keys(DELIMITERS).map((key) => (
                <option key={key} value={key}>
                  {DELIMITERS[key].label}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="csv-header">
              Options
            </label>
            <label
              htmlFor="csv-header"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                minHeight: "2.5rem",
              }}
            >
              <input
                id="csv-header"
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => {
                  setHasHeader(e.target.checked);
                  setCopied(false);
                }}
              />
              <span>First row is header</span>
            </label>
          </div>
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
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.rowCount.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">
                {hasHeader ? "Data rows" : "Rows"}
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
            </div>
            <label className="tool-label" htmlFor="csv-output">
              JSON output
            </label>
            <pre className="tool-output" id="csv-output">
              {result.output}
            </pre>
          </div>
        </>
      ) : null}

      {!result.output && !result.error ? (
        <p className="tool-note">
          Paste CSV above to convert it to JSON instantly. Quoted fields
          containing the delimiter, line breaks, or escaped quotes ("") are
          handled correctly. Everything runs in your browser.
        </p>
      ) : null}
    </div>
  );
}
