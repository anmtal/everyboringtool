"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

// Alignment options for each column. The value is the marker used in the
// separator row of a GitHub-Flavored Markdown table.
const ALIGN = {
  left: { label: "Left", left: ":", right: "-" },
  center: { label: "Center", left: ":", right: ":" },
  right: { label: "Right", left: "-", right: ":" },
  none: { label: "Default", left: "-", right: "-" },
};

// Escape a pipe so it does not break the markdown table structure. Also
// collapse hard line breaks inside a cell to <br> (markdown cells are single
// line) and trim surrounding whitespace.
function escapeCell(value) {
  return String(value == null ? "" : value)
    .replace(/\r\n?|\n/g, "<br>")
    .replace(/\|/g, "\\|")
    .trim();
}

// Split pasted text into a grid. Auto-detects tab vs comma. Handles simple
// double-quoted CSV fields so a pasted spreadsheet selection works.
function parseGrid(text, delimiter) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  // Drop a single trailing empty line from a final newline.
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();

  return lines.map((line) => {
    const cells = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }
      if (ch === '"' && field === "") {
        inQuotes = true;
        continue;
      }
      if (ch === delimiter) {
        cells.push(field);
        field = "";
        continue;
      }
      field += ch;
    }
    cells.push(field);
    return cells;
  });
}

function detectDelimiter(text) {
  const firstLine = text.replace(/\r\n?/g, "\n").split("\n")[0] || "";
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs >= commas && tabs > 0 ? "\t" : ",";
}

// Build a rectangular grid with a fixed column count.
function normalizeGrid(rows, cols) {
  return rows.map((row) => {
    const next = row.slice(0, cols);
    while (next.length < cols) next.push("");
    return next;
  });
}

const START_HEADERS = ["Name", "Role", "Location"];
const START_ROWS = [
  ["Ada Lovelace", "Engineer", "London"],
  ["Grace Hopper", "Admiral", "New York"],
];

export default function MarkdownTableGenerator() {
  const [headers, setHeaders] = useState(START_HEADERS);
  const [rows, setRows] = useState(START_ROWS);
  const [aligns, setAligns] = useState(START_HEADERS.map(() => "none"));
  const [pretty, setPretty] = useState(true);
  const [firstRowHeader, setFirstRowHeader] = useState(true);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  const cols = headers.length;

  function reset() {
    setCopied(false);
  }

  function updateHeader(idx, value) {
    setHeaders((h) => h.map((c, i) => (i === idx ? value : c)));
    reset();
  }

  function updateCell(r, c, value) {
    setRows((rs) =>
      rs.map((row, i) =>
        i === r ? row.map((cell, j) => (j === c ? value : cell)) : row
      )
    );
    reset();
  }

  function updateAlign(idx, value) {
    setAligns((a) => a.map((v, i) => (i === idx ? value : v)));
    reset();
  }

  function addColumn() {
    setHeaders((h) => [...h, `Column ${h.length + 1}`]);
    setRows((rs) => rs.map((row) => [...row, ""]));
    setAligns((a) => [...a, "none"]);
    reset();
  }

  function removeColumn(idx) {
    if (cols <= 1) return;
    setHeaders((h) => h.filter((_, i) => i !== idx));
    setRows((rs) => rs.map((row) => row.filter((_, i) => i !== idx)));
    setAligns((a) => a.filter((_, i) => i !== idx));
    reset();
  }

  function addRow() {
    setRows((rs) => [...rs, Array(cols).fill("")]);
    reset();
  }

  function removeRow(idx) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
    reset();
  }

  function doImport() {
    const text = importText;
    if (!text.trim()) {
      setShowImport(false);
      return;
    }
    const delim = detectDelimiter(text);
    let grid = parseGrid(text, delim);
    if (grid.length === 0) {
      setShowImport(false);
      return;
    }
    const colCount = grid.reduce((m, r) => Math.max(m, r.length), 1);
    grid = normalizeGrid(grid, colCount);

    if (firstRowHeader && grid.length > 0) {
      const head = grid[0].map((c) => c.trim());
      setHeaders(head);
      setRows(grid.slice(1));
      setAligns(head.map(() => "none"));
    } else {
      setHeaders(Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`));
      setRows(grid);
      setAligns(Array.from({ length: colCount }, () => "none"));
    }
    setImportText("");
    setShowImport(false);
    reset();
  }

  const markdown = useMemo(() => {
    const cleanHeaders = headers.map((h) => escapeCell(h));
    const cleanRows = rows.map((row) => {
      const r = row.map((cell) => escapeCell(cell));
      while (r.length < cols) r.push("");
      return r.slice(0, cols);
    });

    // Column widths for padded ("pretty") output.
    const widths = cleanHeaders.map((h, c) => {
      let w = h.length;
      for (const row of cleanRows) {
        if (row[c] && row[c].length > w) w = row[c].length;
      }
      // Separator needs room for at least 3 dashes plus any colons.
      return Math.max(w, 3);
    });

    const pad = (text, c) => {
      if (!pretty) return text;
      const gap = widths[c] - text.length;
      if (gap <= 0) return text;
      if (aligns[c] === "right") return " ".repeat(gap) + text;
      if (aligns[c] === "center") {
        const l = Math.floor(gap / 2);
        return " ".repeat(l) + text + " ".repeat(gap - l);
      }
      return text + " ".repeat(gap);
    };

    const headerLine =
      "| " + cleanHeaders.map((h, c) => pad(h, c)).join(" | ") + " |";

    const sepLine =
      "| " +
      cleanHeaders
        .map((_, c) => {
          const a = ALIGN[aligns[c]] || ALIGN.none;
          const inner = pretty ? widths[c] : 3;
          // a.left and a.right each occupy one character, so the fill is
          // inner - 2 to keep the separator the same width as the content.
          const dashes = "-".repeat(Math.max(1, inner - 2));
          return a.left + dashes + a.right;
        })
        .join(" | ") +
      " |";

    const bodyLines = cleanRows.map(
      (row) => "| " + row.map((cell, c) => pad(cell, c)).join(" | ") + " |"
    );

    return [headerLine, sepLine, ...bodyLines].join("\n");
  }, [headers, rows, aligns, pretty, cols]);

  const hasContent =
    headers.some((h) => h.trim() !== "") ||
    rows.some((row) => row.some((c) => c.trim() !== ""));

  async function handleCopy() {
    if (!markdown) return;
    try {
      await copyText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-actions">
        <button className="btn" type="button" onClick={addColumn}>
          + Column
        </button>
        <button className="btn" type="button" onClick={addRow}>
          + Row
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => setShowImport((s) => !s)}
        >
          {showImport ? "Cancel import" : "Paste data"}
        </button>
      </div>

      {showImport ? (
        <div className="tool-field">
          <label className="tool-label" htmlFor="mtg-import">
            Paste CSV or tab-separated data (e.g. copied from a spreadsheet)
          </label>
          <textarea
            className="tool-textarea"
            id="mtg-import"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"Name, Role, Location\nAda, Engineer, London"}
            rows={5}
            spellCheck={false}
          />
          <label
            htmlFor="mtg-firstrow"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              minHeight: "2.5rem",
            }}
          >
            <input
              id="mtg-firstrow"
              type="checkbox"
              checked={firstRowHeader}
              onChange={(e) => setFirstRowHeader(e.target.checked)}
            />
            <span>First row is the header</span>
          </label>
          <div className="tool-actions">
            <button className="btn btn-primary" type="button" onClick={doImport}>
              Load into table
            </button>
          </div>
        </div>
      ) : null}

      <div className="tool-field">
        <label className="tool-label">Table editor</label>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {headers.map((h, c) => (
                  <th key={c} style={{ padding: "0.25rem", textAlign: "left" }}>
                    <input
                      className="tool-input"
                      aria-label={`Header for column ${c + 1}`}
                      value={h}
                      onChange={(e) => updateHeader(c, e.target.value)}
                    />
                    <div
                      style={{
                        display: "flex",
                        gap: "0.25rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      <select
                        className="tool-select"
                        aria-label={`Alignment for column ${c + 1}`}
                        value={aligns[c]}
                        onChange={(e) => updateAlign(c, e.target.value)}
                      >
                        {Object.keys(ALIGN).map((k) => (
                          <option key={k} value={k}>
                            {ALIGN[k].label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn"
                        type="button"
                        aria-label={`Remove column ${c + 1}`}
                        onClick={() => removeColumn(c)}
                        disabled={cols <= 1}
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} style={{ padding: "0.25rem" }}>
                      <input
                        className="tool-input"
                        aria-label={`Row ${r + 1}, column ${c + 1}`}
                        value={cell}
                        onChange={(e) => updateCell(r, c, e.target.value)}
                      />
                    </td>
                  ))}
                  <td style={{ padding: "0.25rem", whiteSpace: "nowrap" }}>
                    <button
                      className="btn"
                      type="button"
                      aria-label={`Remove row ${r + 1}`}
                      onClick={() => removeRow(r)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <p className="tool-note">
            No data rows. Click "+ Row" to add one, or "Paste data" to import.
          </p>
        ) : null}
      </div>

      <div className="tool-row">
        <div className="tool-field">
          <label
            htmlFor="mtg-pretty"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              minHeight: "2.5rem",
            }}
          >
            <input
              id="mtg-pretty"
              type="checkbox"
              checked={pretty}
              onChange={(e) => {
                setPretty(e.target.checked);
                reset();
              }}
            />
            <span>Pad columns (aligned, readable source)</span>
          </label>
        </div>
      </div>

      {hasContent ? (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy Markdown"}
            </button>
          </div>
          <label className="tool-label" htmlFor="mtg-output">
            Markdown output
          </label>
          <pre
            className="tool-output"
            id="mtg-output"
            role="status"
            aria-live="polite"
          >
            {markdown}
          </pre>
          <p className="tool-note">
            This is GitHub-Flavored Markdown. Paste it into GitHub, GitLab,
            Reddit, Obsidian, or any Markdown editor. Pipes in your text are
            escaped automatically and line breaks inside a cell become{" "}
            {"<br>"}.
          </p>
        </div>
      ) : (
        <p className="tool-note">
          Fill in the table above to generate a Markdown table. Everything runs
          in your browser.
        </p>
      )}
    </div>
  );
}
