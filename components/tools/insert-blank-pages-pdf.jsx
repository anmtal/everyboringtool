"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { PDFDocument } from "pdf-lib";
import { loadPdf, ENCRYPTED_MSG, isEncryptedError } from "../../lib/pdfLoad";

const NUM_FMT = new Intl.NumberFormat("en-US");

// Standard blank-page dimensions in PDF points (1pt = 1/72 inch), portrait.
const SIZES = {
  match: { label: "Match the neighbouring page" },
  a4: { label: "A4 (210 × 297 mm)", w: 595.28, h: 841.89 },
  letter: { label: "US Letter (8.5 × 11 in)", w: 612, h: 792 },
  legal: { label: "US Legal (8.5 × 14 in)", w: 612, h: 1008 },
};

// Trigger a browser download for a blob, cleaning up the object URL afterward.
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

// Parse a free-text page list ("2, 5, 8" or "2-4, 7") into a sorted, unique
// array of 1-based page numbers within [1, max].
function parsePositions(text, max) {
  const out = new Set();
  for (const chunk of String(text).split(",")) {
    const part = chunk.trim();
    if (!part) continue;
    const range = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (range) {
      let a = parseInt(range[1], 10);
      let b = parseInt(range[2], 10);
      if (a > b) [a, b] = [b, a];
      for (let n = a; n <= b; n++) if (n >= 1 && n <= max) out.add(n);
    } else if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n >= 1 && n <= max) out.add(n);
    }
  }
  return Array.from(out).sort((x, y) => x - y);
}

export default function InsertBlankPagesPdf() {
  const [file, setFile] = useState(null);
  const [originalCount, setOriginalCount] = useState(0);

  // Where to insert: start | end | after | before | every
  const [mode, setMode] = useState("after");
  const [positions, setPositions] = useState("1");
  const [count, setCount] = useState(1); // blank pages per insertion point
  const [size, setSize] = useState("match");
  const [orientation, setOrientation] = useState("portrait");

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const inputRef = useRef(null);

  function reset() {
    setFile(null);
    setOriginalCount(0);
    setStatus("");
  }

  const loadFile = useCallback(async (chosen) => {
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
      const doc = await loadPdf(bytes);
      const c = doc.getPageCount();
      if (!c) throw new Error("empty");
      setFile(chosen);
      setOriginalCount(c);
    } catch (e) {
      setError(
        isEncryptedError(e)
          ? ENCRYPTED_MSG
          : "Couldn't read that PDF — it may be corrupted or not a valid PDF."
      );
      reset();
    } finally {
      setBusy(false);
      setStatus("");
    }
  }, []);

  function onInput(e) {
    const chosen = e.target.files && e.target.files[0];
    e.target.value = "";
    loadFile(chosen);
  }

  function onDrop(e) {
    e.preventDefault();
    const chosen = e.dataTransfer.files && e.dataTransfer.files[0];
    loadFile(chosen);
  }

  const perCount = Math.max(1, Math.min(50, Math.floor(Number(count) || 1)));
  const needsPositions = mode === "after" || mode === "before";

  // Compute how many blanks will be added and the final page count, so the
  // user sees the effect before saving.
  const plan = useMemo(() => {
    if (!originalCount) return null;
    let points = 0;
    if (mode === "start" || mode === "end") points = 1;
    else if (mode === "every") points = originalCount;
    else points = parsePositions(positions, originalCount).length;
    const inserted = points * perCount;
    return { points, inserted, total: originalCount + inserted };
  }, [originalCount, mode, positions, perCount]);

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "document";

  // Resolve the dimensions of a blank page to insert next to source page index
  // `refIndex` (0-based, may be null for start/end with no neighbour).
  function blankDims(srcPages, refIndex) {
    if (size === "match" && refIndex != null && srcPages[refIndex]) {
      const { width, height } = srcPages[refIndex].getSize();
      return [width, height];
    }
    const s = SIZES[size] && SIZES[size].w ? SIZES[size] : SIZES.a4;
    let w = s.w;
    let h = s.h;
    if (orientation === "landscape") [w, h] = [h, w];
    return [w, h];
  }

  async function save() {
    if (!file) return;
    if (plan && plan.inserted === 0) {
      setError(
        needsPositions
          ? "Enter at least one valid page number to insert blank pages next to."
          : "Nothing to insert — check your options."
      );
      return;
    }
    setError("");
    setBusy(true);
    setStatus("Inserting blank pages…");
    try {
      const bytes = await file.arrayBuffer();
      const src = await loadPdf(bytes);
      const total = src.getPageCount();
      const srcPages = src.getPages();

      const out = await PDFDocument.create();
      const copied = await out.copyPages(
        src,
        Array.from({ length: total }, (_, i) => i)
      );

      // Build a set of insertion instructions keyed to positions in the source.
      // "before page N": add blanks, then page N. "after page N": page N, then blanks.
      const beforeSet = new Set(); // 1-based source page numbers
      const afterSet = new Set();
      if (mode === "start") {
        beforeSet.add(1);
      } else if (mode === "end") {
        afterSet.add(total);
      } else if (mode === "every") {
        for (let n = 1; n <= total; n++) afterSet.add(n);
      } else if (mode === "before") {
        for (const n of parsePositions(positions, total)) beforeSet.add(n);
      } else {
        for (const n of parsePositions(positions, total)) afterSet.add(n);
      }

      const addBlank = (refIndex) => {
        const [w, h] = blankDims(srcPages, refIndex);
        out.addPage([w, h]);
      };

      for (let i = 0; i < total; i++) {
        const pageNo = i + 1;
        if (beforeSet.has(pageNo)) {
          for (let k = 0; k < perCount; k++) addBlank(i);
        }
        out.addPage(copied[i]);
        if (afterSet.has(pageNo)) {
          for (let k = 0; k < perCount; k++) addBlank(i);
        }
      }

      const outBytes = await out.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      downloadBlob(blob, `${baseName}-with-blank-pages.pdf`);
      setStatus(
        `Done — added ${NUM_FMT.format(
          out.getPageCount() - total
        )} blank page(s). Downloaded your new PDF.`
      );
      setTimeout(() => setStatus(""), 5000);
    } catch (e) {
      setError(
        isEncryptedError(e)
          ? ENCRYPTED_MSG
          : "Something went wrong building that PDF. Please try again."
      );
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") &&
          (e.preventDefault(), inputRef.current?.click())
        }
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={onInput}
          hidden
        />
        <p className="dropzone-title">Drop a PDF here, or click to choose</p>
        <p className="dropzone-sub">
          Your file never leaves your device — blank pages are inserted in your
          browser.
        </p>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {status && (
        <p className="tool-note" role="status" aria-live="polite">
          {status}
        </p>
      )}

      {file && originalCount > 0 && (
        <>
          <div className="tool-fields">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ibp-mode">
                Where to insert blank pages
              </label>
              <select
                id="ibp-mode"
                className="tool-select"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="after">After specific page(s)</option>
                <option value="before">Before specific page(s)</option>
                <option value="start">At the very beginning</option>
                <option value="end">At the very end</option>
                <option value="every">After every page</option>
              </select>
            </div>

            {needsPositions && (
              <div className="tool-field">
                <label className="tool-label" htmlFor="ibp-pos">
                  Page number(s)
                </label>
                <input
                  id="ibp-pos"
                  className="tool-input"
                  type="text"
                  inputMode="numeric"
                  value={positions}
                  onChange={(e) => setPositions(e.target.value)}
                  placeholder="e.g. 1, 3, 5-7"
                />
              </div>
            )}
          </div>

          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ibp-count">
                Blank pages per spot
              </label>
              <input
                id="ibp-count"
                className="tool-input"
                type="number"
                min="1"
                max="50"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor="ibp-size">
                Blank page size
              </label>
              <select
                id="ibp-size"
                className="tool-select"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                {Object.entries(SIZES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {size !== "match" && (
              <div className="tool-field">
                <label className="tool-label" htmlFor="ibp-orient">
                  Orientation
                </label>
                <select
                  id="ibp-orient"
                  className="tool-select"
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            )}
          </div>

          {plan && (
            <div className="tool-stat-grid" role="status" aria-live="polite">
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {NUM_FMT.format(originalCount)}
                </div>
                <div className="tool-stat-label">
                  Original {originalCount === 1 ? "page" : "pages"}
                </div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {NUM_FMT.format(plan.inserted)}
                </div>
                <div className="tool-stat-label">Blank pages added</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{NUM_FMT.format(plan.total)}</div>
                <div className="tool-stat-label">Pages in new PDF</div>
              </div>
            </div>
          )}

          <p className="tool-note">
            {mode === "every"
              ? "A blank page is added after every existing page — handy for double-sided printing or leaving room for notes."
              : mode === "start"
                ? "Blank pages are added before page 1."
                : mode === "end"
                  ? "Blank pages are added after the last page."
                  : `Blank pages are inserted ${mode} the page number(s) you list. Numbering refers to the original PDF.`}
            {" "}
            {size === "match"
              ? "Each blank page matches the size of its neighbouring page."
              : "Every blank page uses the fixed size chosen above."}
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
              disabled={busy || (plan && plan.inserted === 0)}
            >
              {busy ? "Working…" : "Insert blank pages & download"}
            </button>
            <button type="button" className="btn" onClick={reset} disabled={busy}>
              Choose another PDF
            </button>
          </div>
        </>
      )}

      {!file && (
        <p className="tool-note">
          Choose a PDF above to add empty pages at the start, the end, after
          every page, or before/after any pages you name. Nothing is uploaded —
          everything runs privately in your browser.
        </p>
      )}

      <p className="tool-note">
        Blank pages are truly empty (white, no content). The rebuilt file
        downloads straight to your device — your PDF is never sent to a server.
      </p>
    </div>
  );
}
