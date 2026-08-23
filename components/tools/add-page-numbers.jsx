"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { ENCRYPTED_MSG, isEncryptedError } from "../../lib/pdfLoad";

const NUM_FMT = new Intl.NumberFormat("en-US");

const POSITIONS = [
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "top-right", label: "Top right" },
];

const FORMATS = [
  { value: "plain", label: "Just the number (1)" },
  { value: "of", label: "Page X of N" },
];

// Keep a number inside [min, max]; fall back to `fallback` for NaN/blank.
function clampNum(value, min, max, fallback) {
  const n = typeof value === "number" ? value : parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export default function AddPageNumbers() {
  const [file, setFile] = useState(null); // the chosen File
  const [pageCount, setPageCount] = useState(0);
  const [position, setPosition] = useState("bottom-center");
  const [startNumber, setStartNumber] = useState(1);
  const [fontSize, setFontSize] = useState(12);
  const [format, setFormat] = useState("plain");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(""); // transient progress note
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url }

  const resultUrlRef = useRef(""); // object URL backing the numbered download

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

  function reset() {
    setFile(null);
    setPageCount(0);
    setStatus("");
    clearResult();
  }

  async function onFile(e) {
    const chosen = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!chosen) return;

    const isPdf =
      chosen.type === "application/pdf" ||
      chosen.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Please choose a PDF file.");
      reset();
      return;
    }

    setError("");
    reset();
    setBusy(true);
    setStatus("Reading PDF…");
    try {
      const bytes = await chosen.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const count = doc.getPageCount();
      if (!count) throw new Error("empty");
      setFile(chosen);
      setPageCount(count);
    } catch (e) {
      setError(isEncryptedError(e) ? ENCRYPTED_MSG : "Couldn't read that PDF — it may be corrupted, password-protected, or not a valid PDF.");
      reset();
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "document";

  // Build the label a given page should show, based on its 0-based index.
  function labelFor(index, start, total) {
    const shown = start + index;
    if (format === "of") return `Page ${shown} of ${start + total - 1}`;
    return String(shown);
  }

  async function stamp() {
    if (!file || !pageCount) return;
    setError("");
    clearResult();
    setBusy(true);
    setStatus("Adding page numbers…");
    try {
      const size = clampNum(fontSize, 6, 72, 12);
      const start = clampNum(startNumber, 0, 100000, 1);

      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const black = rgb(0, 0, 0);
      const margin = 28; // ~0.4in from the page edge

      const pages = doc.getPages();
      pages.forEach((page, i) => {
        const { width, height } = page.getSize();
        const label = labelFor(i, start, pages.length);
        const textWidth = font.widthOfTextAtSize(label, size);

        let x;
        let y;
        if (position === "bottom-center") {
          x = (width - textWidth) / 2;
          y = margin;
        } else if (position === "bottom-right") {
          x = width - margin - textWidth;
          y = margin;
        } else {
          // top-right
          x = width - margin - textWidth;
          y = height - margin - size;
        }

        // Guard against tiny pages where the margin math could push text off-page.
        x = Math.max(2, Math.min(x, Math.max(2, width - textWidth - 2)));
        y = Math.max(2, Math.min(y, Math.max(2, height - size - 2)));

        page.drawText(label, { x, y, size, font, color: black });
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({ url });
    } catch (e) {
      setError(isEncryptedError(e) ? ENCRYPTED_MSG : "Something went wrong numbering that PDF. It may be corrupted or protected.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const posLabel =
    POSITIONS.find((p) => p.value === position)?.label || position;
  const previewLabel = labelFor(
    0,
    clampNum(startNumber, 0, 100000, 1),
    pageCount || 1
  );

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pn-file">
              Choose a PDF
            </label>
            <input
              className="tool-input"
              id="pn-file"
              type="file"
              accept="application/pdf"
              onChange={onFile}
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
        <p className="tool-note" role="status">
          {status}
        </p>
      )}

      {file && pageCount > 0 && (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{NUM_FMT.format(pageCount)}</div>
              <div className="tool-stat-label">
                {pageCount === 1 ? "Page" : "Pages"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{previewLabel}</div>
              <div className="tool-stat-label">First page shows</div>
            </div>
          </div>

          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="pn-position">
                  Position
                </label>
                <select
                  className="tool-select"
                  id="pn-position"
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
                <label className="tool-label" htmlFor="pn-format">
                  Format
                </label>
                <select
                  className="tool-select"
                  id="pn-format"
                  value={format}
                  onChange={(e) => {
                    setFormat(e.target.value);
                    clearResult();
                  }}
                >
                  {FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="pn-start">
                  Starting number
                </label>
                <input
                  className="tool-input"
                  id="pn-start"
                  type="number"
                  min="0"
                  max="100000"
                  step="1"
                  value={startNumber}
                  onChange={(e) => {
                    setStartNumber(e.target.value);
                    clearResult();
                  }}
                  onBlur={() =>
                    setStartNumber(clampNum(startNumber, 0, 100000, 1))
                  }
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="pn-size">
                  Font size
                </label>
                <input
                  className="tool-input"
                  id="pn-size"
                  type="number"
                  min="6"
                  max="72"
                  step="1"
                  value={fontSize}
                  onChange={(e) => {
                    setFontSize(e.target.value);
                    clearResult();
                  }}
                  onBlur={() => setFontSize(clampNum(fontSize, 6, 72, 12))}
                />
              </div>
            </div>
          </div>

          <p className="tool-note">
            Numbers are drawn in black Helvetica on every page. With “Page X of
            N” the total counts from your starting number, so page one reads
            “{previewLabel}”.
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={stamp}
              disabled={busy}
            >
              {busy ? "Working…" : "Add page numbers"}
            </button>
            {result && (
              <a
                className="btn btn-success"
                href={result.url}
                download={`${baseName}-numbered.pdf`}
              >
                ↓ Download numbered PDF
              </a>
            )}
          </div>

          {result && (
            <div className="tool-result" role="status" aria-live="polite">
              <div className="tool-result-label">Done</div>
              <div className="tool-result-value">
                Numbered {NUM_FMT.format(pageCount)}{" "}
                {pageCount === 1 ? "page" : "pages"} ({posLabel}, starting at{" "}
                {clampNum(startNumber, 0, 100000, 1)}).
              </div>
            </div>
          )}
        </>
      )}

      <p className="tool-note">
        Everything runs in your browser — your PDF is never uploaded to a
        server.
      </p>
    </div>
  );
}
