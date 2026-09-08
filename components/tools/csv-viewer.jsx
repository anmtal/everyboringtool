"use client";

import { useState, useMemo, useRef } from "react";

const DELIMITERS = {
  auto: { label: "Auto-detect", char: null },
  comma: { label: "Comma (,)", char: "," },
  semicolon: { label: "Semicolon (;)", char: ";" },
  tab: { label: "Tab", char: "\t" },
  pipe: { label: "Pipe (|)", char: "|" },
};

const SAMPLE =
  'name,department,salary,start_date\n' +
  '"Smith, John",Engineering,92000,2021-03-15\n' +
  'Jane Doe,Marketing,68000,2019-11-02\n' +
  'Aisha Khan,Engineering,105000,2018-06-21\n' +
  'Carlos Reyes,Sales,74500,2022-01-10\n' +
  '"O\'\'Brien, Pat",Support,58000,2023-07-30';

// Guess the delimiter by counting candidates in the first non-empty line
// that is not inside quotes.
function detectDelimiter(text) {
  const candidates = [",", ";", "\t", "|"];
  const firstLine = (text.split(/\r\n|\r|\n/).find((l) => l.trim() !== "") || "");
  let best = ",";
  let bestCount = -1;
  for (const c of candidates) {
    // Count occurrences outside of quoted sections.
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i];
      if (ch === '"') {
        if (inQuotes && firstLine[i + 1] === '"') {
          i += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && ch === c) count += 1;
    }
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  return best;
}

// RFC-4180-ish CSV parser. Handles quoted fields containing the delimiter,
// embedded newlines, and escaped quotes ("" -> ").
function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let started = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
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

  if (started || field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop trailing fully-empty rows.
  while (
    rows.length > 0 &&
    rows[rows.length - 1].length === 1 &&
    rows[rows.length - 1][0] === ""
  ) {
    rows.pop();
  }

  return rows;
}

// Sort helper that treats numeric-looking columns as numbers and dates
// left as strings (ISO dates sort correctly as strings anyway).
function compareValues(a, b) {
  const an = a.trim();
  const bn = b.trim();
  const af = an === "" ? NaN : Number(an.replace(/,/g, ""));
  const bf = bn === "" ? NaN : Number(bn.replace(/,/g, ""));
  const aNum = an !== "" && !Number.isNaN(af);
  const bNum = bn !== "" && !Number.isNaN(bf);
  if (aNum && bNum) return af - bf;
  // Empty strings sort last.
  if (an === "" && bn !== "") return 1;
  if (bn === "" && an !== "") return -1;
  return an.localeCompare(bn, undefined, { numeric: true, sensitivity: "base" });
}

const MAX_RENDER_ROWS = 1000;

export default function CsvViewer() {
  const [input, setInput] = useState(SAMPLE);
  const [delimiterKey, setDelimiterKey] = useState("auto");
  const [hasHeader, setHasHeader] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ col: null, dir: "asc" });
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);

  const parsed = useMemo(() => {
    if (!input.trim()) {
      return { headers: [], rows: [], delimiter: ",", error: "" };
    }

    const delimiter =
      DELIMITERS[delimiterKey].char !== null
        ? DELIMITERS[delimiterKey].char
        : detectDelimiter(input);

    let all;
    try {
      all = parseCsv(input, delimiter);
    } catch (e) {
      return { headers: [], rows: [], delimiter, error: "Could not parse this CSV." };
    }

    if (all.length === 0) {
      return { headers: [], rows: [], delimiter, error: "" };
    }

    // Normalize width so every row has the same number of cells.
    const width = all.reduce((m, r) => Math.max(m, r.length), 0);

    let headers;
    let bodyRows;
    if (hasHeader) {
      headers = [];
      for (let c = 0; c < width; c++) {
        const raw = (all[0][c] || "").trim();
        headers.push(raw === "" ? `Column ${c + 1}` : raw);
      }
      bodyRows = all.slice(1);
    } else {
      headers = [];
      for (let c = 0; c < width; c++) headers.push(`Column ${c + 1}`);
      bodyRows = all;
    }

    const rows = bodyRows.map((r) => {
      const cells = r.slice();
      while (cells.length < width) cells.push("");
      return cells;
    });

    return { headers, rows, delimiter, error: "" };
  }, [input, delimiterKey, hasHeader]);

  const viewRows = useMemo(() => {
    let rows = parsed.rows;

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        r.some((cell) => cell.toLowerCase().includes(q))
      );
    }

    if (sort.col !== null && sort.col < parsed.headers.length) {
      const idx = sort.col;
      rows = rows.slice().sort((ra, rb) => {
        const res = compareValues(ra[idx] || "", rb[idx] || "");
        return sort.dir === "asc" ? res : -res;
      });
    }

    return rows;
  }, [parsed, search, sort]);

  function toggleSort(colIdx) {
    setSort((prev) => {
      if (prev.col !== colIdx) return { col: colIdx, dir: "asc" };
      if (prev.dir === "asc") return { col: colIdx, dir: "desc" };
      return { col: null, dir: "asc" };
    });
  }

  function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setInput(typeof reader.result === "string" ? reader.result : "");
      setSort({ col: null, dir: "asc" });
      setSearch("");
    };
    reader.onerror = () => {
      setInput("");
    };
    reader.readAsText(file);
  }

  function handleClear() {
    setInput("");
    setSearch("");
    setSort({ col: null, dir: "asc" });
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function loadSample() {
    setInput(SAMPLE);
    setSearch("");
    setSort({ col: null, dir: "asc" });
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const delimiterName = (() => {
    const d = parsed.delimiter;
    if (d === ",") return "comma";
    if (d === ";") return "semicolon";
    if (d === "\t") return "tab";
    if (d === "|") return "pipe";
    return "custom";
  })();

  const totalRows = parsed.rows.length;
  const shownRows = viewRows.length;
  const capped = viewRows.slice(0, MAX_RENDER_ROWS);
  const isCapped = viewRows.length > MAX_RENDER_ROWS;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="csv-file">
            Open a CSV file
          </label>
          <input
            className="tool-input"
            id="csv-file"
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            ref={fileRef}
            onChange={handleFile}
          />
          {fileName ? (
            <p className="tool-note">Loaded: {fileName}</p>
          ) : (
            <p className="tool-note">
              Choose a file, or paste CSV text below. Nothing is uploaded — the
              file is read and parsed entirely in your browser.
            </p>
          )}
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="csv-text">
            Or paste CSV text
          </label>
          <textarea
            className="tool-textarea"
            id="csv-text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setFileName("");
            }}
            placeholder={"name,age,city\nJane,29,Boston"}
            rows={6}
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
              onChange={(e) => setDelimiterKey(e.target.value)}
            >
              {Object.keys(DELIMITERS).map((key) => (
                <option key={key} value={key}>
                  {DELIMITERS[key].label}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="csv-search">
              Search rows
            </label>
            <input
              className="tool-input"
              id="csv-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter across all columns"
            />
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
                onChange={(e) => setHasHeader(e.target.checked)}
              />
              <span>First row is header</span>
            </label>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={loadSample}>
          Load sample
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {parsed.error ? <p className="tool-error">{parsed.error}</p> : null}

      {parsed.headers.length > 0 ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {parsed.headers.length.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Columns</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {totalRows.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Rows</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {shownRows.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Matching</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{delimiterName}</div>
              <div className="tool-stat-label">Delimiter</div>
            </div>
          </div>

          <div className="tool-field">
            <div style={{ overflowX: "auto", width: "100%" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: "0.9rem",
                }}
              >
                <thead>
                  <tr>
                    <th
                      scope="col"
                      style={{
                        textAlign: "right",
                        padding: "0.4rem 0.6rem",
                        borderBottom: "2px solid currentColor",
                        opacity: 0.55,
                        whiteSpace: "nowrap",
                      }}
                    >
                      #
                    </th>
                    {parsed.headers.map((h, idx) => {
                      const active = sort.col === idx;
                      const arrow = active
                        ? sort.dir === "asc"
                          ? " ▲"
                          : " ▼"
                        : "";
                      return (
                        <th
                          key={idx}
                          scope="col"
                          onClick={() => toggleSort(idx)}
                          title="Click to sort"
                          style={{
                            textAlign: "left",
                            padding: "0.4rem 0.6rem",
                            borderBottom: "2px solid currentColor",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            userSelect: "none",
                          }}
                        >
                          {h}
                          {arrow}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {capped.map((r, ri) => (
                    <tr key={ri}>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "0.35rem 0.6rem",
                          borderBottom: "1px solid rgba(128,128,128,0.25)",
                          opacity: 0.5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ri + 1}
                      </td>
                      {parsed.headers.map((h, ci) => (
                        <td
                          key={ci}
                          style={{
                            padding: "0.35rem 0.6rem",
                            borderBottom:
                              "1px solid rgba(128,128,128,0.25)",
                            verticalAlign: "top",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {r[ci]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {shownRows === 0 ? (
              <p className="tool-note">
                No rows match your search. Clear the search box to see all rows.
              </p>
            ) : null}

            {isCapped ? (
              <p className="tool-note">
                Showing the first {MAX_RENDER_ROWS.toLocaleString("en-US")} of{" "}
                {shownRows.toLocaleString("en-US")} matching rows for
                performance. Use the search box to narrow the view.
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {parsed.headers.length === 0 && !parsed.error ? (
        <p className="tool-note">
          Open a CSV file or paste CSV text to view it as a clean, sortable
          table. Click any column heading to sort; type in the search box to
          filter rows. Quoted fields, embedded commas, line breaks, and escaped
          quotes are handled. Everything runs privately in your browser.
        </p>
      ) : null}
    </div>
  );
}
