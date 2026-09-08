"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { ENCRYPTED_MSG, isEncryptedError } from "../../lib/pdfLoad";

const NUM_FMT = new Intl.NumberFormat("en-US");

// Keep a number inside [min, max]; fall back to `fallback` for NaN/blank.
function clampNum(value, min, max, fallback) {
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Replace {page}, {total}, {date}, {filename} tokens for a given page.
function fillTokens(template, { page, total, date, filename }) {
  return template
    .replace(/\{page\}/gi, String(page))
    .replace(/\{total\}/gi, String(total))
    .replace(/\{date\}/gi, date)
    .replace(/\{filename\}/gi, filename);
}

export default function PdfHeaderFooter() {
  const [file, setFile] = useState(null); // the chosen File
  const [pageCount, setPageCount] = useState(0);

  // Header cells
  const [headerLeft, setHeaderLeft] = useState("");
  const [headerCenter, setHeaderCenter] = useState("Company Confidential");
  const [headerRight, setHeaderRight] = useState("{date}");

  // Footer cells
  const [footerLeft, setFooterLeft] = useState("{filename}");
  const [footerCenter, setFooterCenter] = useState("Page {page} of {total}");
  const [footerRight, setFooterRight] = useState("");

  const [fontSize, setFontSize] = useState(10);
  const [margin, setMargin] = useState(28);
  const [startNumber, setStartNumber] = useState(1);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(""); // transient progress note
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url }

  const resultUrlRef = useRef(""); // object URL backing the stamped download

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
    } catch (err) {
      setError(
        isEncryptedError(err)
          ? ENCRYPTED_MSG
          : "Couldn't read that PDF — it may be corrupted, password-protected, or not a valid PDF."
      );
      reset();
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "document";

  const hasAnyText = [
    headerLeft,
    headerCenter,
    headerRight,
    footerLeft,
    footerCenter,
    footerRight,
  ].some((v) => v.trim().length > 0);

  async function stamp() {
    if (!file || !pageCount) return;
    if (!hasAnyText) {
      setError("Enter some header or footer text first.");
      return;
    }
    setError("");
    clearResult();
    setBusy(true);
    setStatus("Adding header and footer…");
    try {
      const size = clampNum(fontSize, 6, 48, 10);
      const marginPt = clampNum(margin, 8, 200, 28);
      const start = Math.round(clampNum(startNumber, 0, 1000000, 1));

      // Date is computed once so every page shows the same value.
      const dateStr = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date());

      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const black = rgb(0, 0, 0);

      const pages = doc.getPages();
      const total = start + pages.length - 1;

      pages.forEach((page, i) => {
        const { width, height } = page.getSize();
        const ctx = {
          page: start + i,
          total,
          date: dateStr,
          filename: file.name,
        };

        // Draw one cell at a horizontal alignment on a fixed baseline y.
        const drawCell = (template, align, y) => {
          const text = fillTokens(template, ctx).trim();
          if (!text) return;
          const textWidth = font.widthOfTextAtSize(text, size);
          let x;
          if (align === "left") x = marginPt;
          else if (align === "right") x = width - marginPt - textWidth;
          else x = (width - textWidth) / 2;
          // Keep inside the page even on narrow documents.
          x = Math.max(2, Math.min(x, Math.max(2, width - textWidth - 2)));
          page.drawText(text, { x, y, size, font, color: black });
        };

        const headerY = Math.max(2, height - marginPt - size);
        const footerY = Math.max(2, Math.min(marginPt, height - size - 2));

        drawCell(headerLeft, "left", headerY);
        drawCell(headerCenter, "center", headerY);
        drawCell(headerRight, "right", headerY);
        drawCell(footerLeft, "left", footerY);
        drawCell(footerCenter, "center", footerY);
        drawCell(footerRight, "right", footerY);
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({ url });
    } catch (err) {
      setError(
        isEncryptedError(err)
          ? ENCRYPTED_MSG
          : "Something went wrong stamping that PDF. It may be corrupted or protected."
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const cellField = (id, label, value, setter) => (
    <div className="tool-field">
      <label className="tool-label" htmlFor={id}>
        {label}
      </label>
      <input
        className="tool-input"
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          setter(e.target.value);
          if (error) setError("");
          clearResult();
        }}
      />
    </div>
  );

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="hf-file">
              Choose a PDF
            </label>
            <input
              className="tool-input"
              id="hf-file"
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

      {!file && !busy && (
        <p className="tool-note">
          Choose a PDF to add a header and footer. You can place text in the
          left, center, and right of both the top and bottom of every page.
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
              <div className="tool-stat-num">{Math.round(clampNum(fontSize, 6, 48, 10))}pt</div>
              <div className="tool-stat-label">Font size</div>
            </div>
          </div>

          <div className="tool-fields">
            <div className="tool-row">
              {cellField("hf-hl", "Header left", headerLeft, setHeaderLeft)}
              {cellField("hf-hc", "Header center", headerCenter, setHeaderCenter)}
              {cellField("hf-hr", "Header right", headerRight, setHeaderRight)}
            </div>
            <div className="tool-row">
              {cellField("hf-fl", "Footer left", footerLeft, setFooterLeft)}
              {cellField("hf-fc", "Footer center", footerCenter, setFooterCenter)}
              {cellField("hf-fr", "Footer right", footerRight, setFooterRight)}
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="hf-size">
                  Font size (pt)
                </label>
                <input
                  className="tool-input"
                  id="hf-size"
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
              <div className="tool-field">
                <label className="tool-label" htmlFor="hf-margin">
                  Margin from edge (pt)
                </label>
                <input
                  className="tool-input"
                  id="hf-margin"
                  type="number"
                  min="8"
                  max="200"
                  step="1"
                  value={margin}
                  onChange={(e) => {
                    setMargin(e.target.value);
                    clearResult();
                  }}
                  onBlur={() => setMargin(clampNum(margin, 8, 200, 28))}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="hf-start">
                  First page number
                </label>
                <input
                  className="tool-input"
                  id="hf-start"
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  value={startNumber}
                  onChange={(e) => {
                    setStartNumber(e.target.value);
                    clearResult();
                  }}
                  onBlur={() =>
                    setStartNumber(Math.round(clampNum(startNumber, 0, 1000000, 1)))
                  }
                />
              </div>
            </div>
          </div>

          <p className="tool-note">
            Leave any cell blank to skip it. Use these tokens and they are
            filled in per page: <strong>{"{page}"}</strong> current page number,{" "}
            <strong>{"{total}"}</strong> total pages, <strong>{"{date}"}</strong>{" "}
            today&apos;s date, <strong>{"{filename}"}</strong> the file name. Text
            is drawn in black Helvetica; long text is not wrapped, so keep cells
            short.
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={stamp}
              disabled={busy || !hasAnyText}
            >
              {busy ? "Working…" : "Add header & footer"}
            </button>
            {result && (
              <a
                className="btn btn-success"
                href={result.url}
                download={`${baseName}-header-footer.pdf`}
              >
                ↓ Download PDF
              </a>
            )}
          </div>

          {result && (
            <div className="tool-result" role="status" aria-live="polite">
              <div className="tool-result-label">Done</div>
              <div className="tool-result-value">
                Added header and footer to {NUM_FMT.format(pageCount)}{" "}
                {pageCount === 1 ? "page" : "pages"}.
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
