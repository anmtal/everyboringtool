"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

const NUM_FMT = new Intl.NumberFormat("en-US");

const POSITIONS = [
  { value: "diagonal", label: "Diagonal center (45°)" },
  { value: "top", label: "Top of page" },
  { value: "bottom", label: "Bottom of page" },
];

// Keep a number inside [min, max]; fall back to `fallback` for NaN/blank.
function clampNum(value, min, max, fallback) {
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export default function WatermarkPdf() {
  const [file, setFile] = useState(null); // the chosen File
  const [pageCount, setPageCount] = useState(0);
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.3);
  const [position, setPosition] = useState("diagonal");
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
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = doc.getPageCount();
      if (!count) throw new Error("empty");
      setFile(chosen);
      setPageCount(count);
    } catch {
      setError(
        "Couldn't read that PDF — it may be corrupted, password-protected, or not a valid PDF."
      );
      reset();
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "document";
  const trimmedText = text.trim();

  async function stamp() {
    if (!file || !pageCount) return;
    if (!trimmedText) {
      setError("Enter some watermark text first.");
      return;
    }
    setError("");
    clearResult();
    setBusy(true);
    setStatus("Stamping watermark…");
    try {
      const size = clampNum(fontSize, 6, 300, 48);
      const alpha = clampNum(opacity, 0, 1, 0.3);

      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const gray = rgb(0.5, 0.5, 0.5);

      const textWidth = font.widthOfTextAtSize(trimmedText, size);
      const textHeight = font.heightAtSize(size);

      const pages = doc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();

        if (position === "diagonal") {
          // Draw along a 45° baseline whose midpoint sits at the page centre.
          const rad = Math.PI / 4;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const cx = width / 2;
          const cy = height / 2;
          // Baseline start so the text block centres on (cx, cy). The extra
          // half-height term nudges the glyph body onto centre, not the baseline.
          const x = cx - (textWidth / 2) * cos + (textHeight / 2) * sin;
          const y = cy - (textWidth / 2) * sin - (textHeight / 2) * cos;
          page.drawText(trimmedText, {
            x,
            y,
            size,
            font,
            color: gray,
            opacity: alpha,
            rotate: degrees(45),
          });
        } else {
          // Horizontal, centred left-to-right; top or bottom band.
          const x = (width - textWidth) / 2;
          const margin = Math.min(48, height * 0.08);
          const y =
            position === "top" ? height - margin - textHeight : margin;
          page.drawText(trimmedText, {
            x,
            y,
            size,
            font,
            color: gray,
            opacity: alpha,
            rotate: degrees(0),
          });
        }
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({ url });
    } catch {
      setError(
        "Something went wrong stamping that PDF. It may be corrupted or protected."
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
            <label className="tool-label" htmlFor="wm-file">
              Choose a PDF
            </label>
            <input
              className="tool-input"
              id="wm-file"
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
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{NUM_FMT.format(pageCount)}</div>
              <div className="tool-stat-label">
                {pageCount === 1 ? "Page" : "Pages"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{Math.round(opacity * 100)}%</div>
              <div className="tool-stat-label">Opacity</div>
            </div>
          </div>

          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="wm-text">
                  Watermark text
                </label>
                <input
                  className="tool-input"
                  id="wm-text"
                  type="text"
                  value={text}
                  placeholder="e.g. CONFIDENTIAL"
                  onChange={(e) => {
                    setText(e.target.value);
                    if (error) setError("");
                    clearResult();
                  }}
                />
              </div>
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="wm-size">
                  Font size
                </label>
                <input
                  className="tool-input"
                  id="wm-size"
                  type="number"
                  min="6"
                  max="300"
                  step="1"
                  value={fontSize}
                  onChange={(e) => {
                    setFontSize(e.target.value);
                    clearResult();
                  }}
                  onBlur={() =>
                    setFontSize(clampNum(fontSize, 6, 300, 48))
                  }
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="wm-position">
                  Position
                </label>
                <select
                  className="tool-select"
                  id="wm-position"
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
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="wm-opacity">
                  Opacity — {Math.round(opacity * 100)}%
                </label>
                <input
                  id="wm-opacity"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => {
                    setOpacity(clampNum(e.target.value, 0, 1, 0.3));
                    clearResult();
                  }}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>

          <p className="tool-note">
            The text is stamped on every page in gray Helvetica. Lower the
            opacity for a subtle background mark, or raise the font size for a
            bold overlay.
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={stamp}
              disabled={busy || !trimmedText}
            >
              {busy ? "Working…" : "Add watermark"}
            </button>
            {result && (
              <a
                className="btn btn-success"
                href={result.url}
                download={`${baseName}-watermarked.pdf`}
              >
                ↓ Download watermarked PDF
              </a>
            )}
          </div>

          {result && (
            <div className="tool-result">
              <div className="tool-result-label">Done</div>
              <div className="tool-result-value">
                Stamped “{trimmedText}” on {NUM_FMT.format(pageCount)}{" "}
                {pageCount === 1 ? "page" : "pages"} ({posLabel},{" "}
                {Math.round(opacity * 100)}% opacity).
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
