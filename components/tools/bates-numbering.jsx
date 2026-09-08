"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ENCRYPTED_MSG, isEncryptedError } from "../../lib/pdfLoad";

const NUM_FMT = new Intl.NumberFormat("en-US");

const POSITIONS = [
  { value: "bottom-right", label: "Bottom right (standard)" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "top-right", label: "Top right" },
  { value: "top-left", label: "Top left" },
];

// Keep a number inside [min, max]; fall back to `fallback` for NaN/blank.
function clampNum(value, min, max, fallback) {
  const n = typeof value === "number" ? value : parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// Build a Bates label, e.g. "ABC" + 42 padded to 6 -> "ABC000042" + suffix.
function batesLabel(prefix, num, digits, suffix) {
  const body = String(Math.max(0, num)).padStart(digits, "0");
  return `${prefix}${body}${suffix}`;
}

export default function BatesNumbering() {
  const [files, setFiles] = useState([]); // [{ file, name, pageCount }]
  const [prefix, setPrefix] = useState("ABC");
  const [suffix, setSuffix] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [digits, setDigits] = useState(6);
  const [position, setPosition] = useState("bottom-right");
  const [fontSize, setFontSize] = useState(10);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url, first, last, total }

  const resultUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  function clearResult() {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = "";
    }
    setResult(null);
  }

  const totalPages = useMemo(
    () => files.reduce((sum, f) => sum + f.pageCount, 0),
    [files]
  );

  const start = clampNum(startNumber, 0, 100000000, 1);
  const pad = clampNum(digits, 1, 12, 6);

  // Live preview of the first and last Bates numbers across the whole set.
  const firstLabel = batesLabel(prefix, start, pad, suffix);
  const lastLabel = batesLabel(
    prefix,
    start + Math.max(1, totalPages) - 1,
    pad,
    suffix
  );

  async function onFiles(e) {
    const chosen = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-selecting the same file(s)
    if (!chosen.length) return;

    setError("");
    clearResult();
    setBusy(true);
    setStatus("Reading PDFs…");
    try {
      const next = [];
      for (const file of chosen) {
        const isPdf =
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          throw new Error(`"${file.name}" is not a PDF.`);
        }
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const count = doc.getPageCount();
        if (!count) throw new Error(`"${file.name}" has no pages.`);
        next.push({ file, name: file.name, pageCount: count });
      }
      setFiles(next);
    } catch (err) {
      setError(
        isEncryptedError(err)
          ? ENCRYPTED_MSG
          : (err && err.message) ||
              "Couldn't read one of those PDFs — it may be corrupted or password-protected."
      );
      setFiles([]);
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    clearResult();
  }

  function reset() {
    setFiles([]);
    clearResult();
    setError("");
    setStatus("");
  }

  async function stamp() {
    if (!files.length) return;
    setError("");
    clearResult();
    setBusy(true);
    setStatus("Applying Bates numbers…");
    try {
      const size = clampNum(fontSize, 6, 48, 10);
      const margin = 24; // ~1/3 inch from the page edge
      const black = rgb(0, 0, 0);

      // Merge every file into one document, numbering pages continuously
      // in the order the files were chosen — the standard Bates workflow.
      const out = await PDFDocument.create();
      const font = await out.embedFont(StandardFonts.Helvetica);

      let counter = start;
      let firstApplied = null;
      let lastApplied = null;

      for (const item of files) {
        const bytes = await item.file.arrayBuffer();
        const src = await PDFDocument.load(bytes);
        const copied = await out.copyPages(src, src.getPageIndices());
        for (const page of copied) {
          out.addPage(page);
          const label = batesLabel(prefix, counter, pad, suffix);
          if (firstApplied === null) firstApplied = label;
          lastApplied = label;

          const { width, height } = page.getSize();
          const textWidth = font.widthOfTextAtSize(label, size);

          let x;
          let y;
          if (position === "bottom-right") {
            x = width - margin - textWidth;
            y = margin;
          } else if (position === "bottom-left") {
            x = margin;
            y = margin;
          } else if (position === "bottom-center") {
            x = (width - textWidth) / 2;
            y = margin;
          } else if (position === "top-right") {
            x = width - margin - textWidth;
            y = height - margin - size;
          } else {
            // top-left
            x = margin;
            y = height - margin - size;
          }

          // Guard tiny pages so the stamp never falls off the page.
          x = Math.max(2, Math.min(x, Math.max(2, width - textWidth - 2)));
          y = Math.max(2, Math.min(y, Math.max(2, height - size - 2)));

          page.drawText(label, { x, y, size, font, color: black });
          counter += 1;
        }
      }

      const outBytes = await out.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({
        url,
        first: firstApplied,
        last: lastApplied,
        total: counter - start,
      });
    } catch (err) {
      setError(
        isEncryptedError(err)
          ? ENCRYPTED_MSG
          : "Something went wrong numbering those PDFs. One may be corrupted or protected."
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const posLabel =
    POSITIONS.find((p) => p.value === position)?.label || position;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bates-files">
              Choose PDF file(s)
            </label>
            <input
              className="tool-input"
              id="bates-files"
              type="file"
              accept="application/pdf"
              multiple
              onChange={onFiles}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {busy && status && (
        <p className="tool-note" role="status" aria-live="polite">
          {status}
        </p>
      )}

      {!files.length && !busy && (
        <p className="tool-note">
          Add one or more PDFs to stamp a unique sequential Bates number on
          every page. Choose several files and they are numbered continuously in
          the order shown, then merged into one numbered PDF.
        </p>
      )}

      {files.length > 0 && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">
              {files.length === 1 ? "1 file" : `${files.length} files`} ·{" "}
              {NUM_FMT.format(totalPages)}{" "}
              {totalPages === 1 ? "page" : "pages"}
            </div>
            <div className="tool-result-value">
              {files.map((f, i) => (
                <div key={i}>
                  {i + 1}. {f.name} — {NUM_FMT.format(f.pageCount)}{" "}
                  {f.pageCount === 1 ? "page" : "pages"}{" "}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => removeFile(i)}
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="bates-prefix">
                  Prefix
                </label>
                <input
                  className="tool-input"
                  id="bates-prefix"
                  type="text"
                  value={prefix}
                  placeholder="e.g. ABC"
                  onChange={(e) => {
                    setPrefix(e.target.value);
                    clearResult();
                  }}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="bates-suffix">
                  Suffix (optional)
                </label>
                <input
                  className="tool-input"
                  id="bates-suffix"
                  type="text"
                  value={suffix}
                  placeholder="e.g. -CONF"
                  onChange={(e) => {
                    setSuffix(e.target.value);
                    clearResult();
                  }}
                />
              </div>
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="bates-start">
                  Starting number
                </label>
                <input
                  className="tool-input"
                  id="bates-start"
                  type="number"
                  min="0"
                  max="100000000"
                  step="1"
                  value={startNumber}
                  onChange={(e) => {
                    setStartNumber(e.target.value);
                    clearResult();
                  }}
                  onBlur={() =>
                    setStartNumber(clampNum(startNumber, 0, 100000000, 1))
                  }
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="bates-digits">
                  Number of digits (zero-padding)
                </label>
                <input
                  className="tool-input"
                  id="bates-digits"
                  type="number"
                  min="1"
                  max="12"
                  step="1"
                  value={digits}
                  onChange={(e) => {
                    setDigits(e.target.value);
                    clearResult();
                  }}
                  onBlur={() => setDigits(clampNum(digits, 1, 12, 6))}
                />
              </div>
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="bates-position">
                  Position
                </label>
                <select
                  className="tool-select"
                  id="bates-position"
                  value={position}
                  onChange={(e) => {
                    setPosition(e.target.value);
                    clearResult();
                  }}
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="bates-size">
                  Font size
                </label>
                <input
                  className="tool-input"
                  id="bates-size"
                  type="number"
                  min="6"
                  max="48"
                  step="1"
                  value={fontSize}
                  onChange={(e) => {
                    setFontSize(e.target.value);
                    clearResult();
                  }}
                  onBlur={() => setFontSize(clampNum(fontSize, 6, 48, 10))}
                />
              </div>
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{firstLabel}</div>
              <div className="tool-stat-label">First page</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{lastLabel}</div>
              <div className="tool-stat-label">Last page</div>
            </div>
          </div>

          <p className="tool-note">
            Each page gets a unique number in black Helvetica: prefix, then the
            count zero-padded to {pad} {pad === 1 ? "digit" : "digits"}, then any
            suffix — stamped at the {posLabel.toLowerCase()}. Numbering runs
            continuously across all files.
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={stamp}
              disabled={busy}
            >
              {busy ? "Working…" : "Apply Bates numbers"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={reset}
              disabled={busy}
            >
              Clear
            </button>
            {result && (
              <a
                className="btn btn-success"
                href={result.url}
                download={`bates-${result.first}-to-${result.last}.pdf`}
              >
                ↓ Download numbered PDF
              </a>
            )}
          </div>

          {result && (
            <div className="tool-result" role="status" aria-live="polite">
              <div className="tool-result-label">Done</div>
              <div className="tool-result-value">
                Stamped {NUM_FMT.format(result.total)}{" "}
                {result.total === 1 ? "page" : "pages"} — Bates range{" "}
                {result.first} to {result.last}.
              </div>
            </div>
          )}
        </>
      )}

      <p className="tool-note">
        Everything runs in your browser — your PDFs are never uploaded to a
        server.
      </p>
    </div>
  );
}
