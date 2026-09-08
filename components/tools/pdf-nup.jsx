"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ENCRYPTED_MSG, isEncryptedError } from "../../lib/pdfLoad";

// pdf-lib is ~425 KB — load it on demand so the UI paints first.
let pdfLibPromise = null;
function loadPdfLib() {
  if (!pdfLibPromise) {
    pdfLibPromise = import("pdf-lib").catch((e) => {
      pdfLibPromise = null; // let a later attempt retry the download
      throw e;
    });
  }
  return pdfLibPromise;
}

// Output sheet sizes in PDF points (1 pt = 1/72 inch).
const SHEETS = {
  fit: { label: "Match first source page", w: 0, h: 0 },
  a4: { label: "A4 (210 × 297 mm)", w: 595.28, h: 841.89 },
  letter: { label: "US Letter (8.5 × 11 in)", w: 612, h: 792 },
  legal: { label: "US Legal (8.5 × 14 in)", w: 612, h: 1008 },
  a3: { label: "A3 (297 × 420 mm)", w: 841.89, h: 1190.55 },
};

// N-up grid layouts: columns × rows.
const LAYOUTS = {
  2: { cols: 2, rows: 1 }, // 2-up (side by side, portrait sheet rotated feel)
  4: { cols: 2, rows: 2 },
  6: { cols: 2, rows: 3 },
  8: { cols: 2, rows: 4 },
  9: { cols: 3, rows: 3 },
  16: { cols: 4, rows: 4 },
};

export default function PdfNup() {
  const [file, setFile] = useState(null);
  const [perSheet, setPerSheet] = useState(4);
  const [sheet, setSheet] = useState("letter");
  const [orientation, setOrientation] = useState("auto");
  const [order, setOrder] = useState("row"); // row-major or column-major
  const [gap, setGap] = useState(8); // pt between cells
  const [margin, setMargin] = useState(24); // pt page margin
  const [drawBorder, setDrawBorder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [result, setResult] = useState(null); // { srcPages, sheets, name }

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const inputRef = useRef(null);

  const pickFile = useCallback((list) => {
    const f = Array.from(list).find(
      (x) => x.type === "application/pdf" || x.name.toLowerCase().endsWith(".pdf")
    );
    if (!f) return;
    loadPdfLib().catch(() => {});
    setFile(f);
    setDownloadUrl("");
    setResult(null);
    setError("");
  }, []);

  function onInput(e) {
    pickFile(e.target.files);
    e.target.value = "";
  }
  function onDrop(e) {
    e.preventDefault();
    pickFile(e.dataTransfer.files);
  }

  async function build() {
    if (!file) {
      setError("Choose a PDF first.");
      return;
    }
    setBusy(true);
    setError("");
    setDownloadUrl("");
    setResult(null);
    try {
      const { PDFDocument } = await loadPdfLib();
      const bytes = await file.arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const srcCount = src.getPageCount();
      if (srcCount === 0) {
        setError("That PDF has no pages.");
        setBusy(false);
        return;
      }

      const out = await PDFDocument.create();
      const { cols, rows } = LAYOUTS[perSheet];

      // Decide output sheet size.
      let sheetW, sheetH;
      if (sheet === "fit") {
        const first = src.getPage(0);
        const { width, height } = first.getSize();
        sheetW = width;
        sheetH = height;
      } else {
        sheetW = SHEETS[sheet].w;
        sheetH = SHEETS[sheet].h;
      }

      // Orientation: "auto" picks the orientation whose cell aspect best
      // matches the source pages so they scale up as large as possible.
      const firstSize = src.getPage(0).getSize();
      const srcAspect = firstSize.width / firstSize.height;
      let landscape;
      if (orientation === "landscape") landscape = true;
      else if (orientation === "portrait") landscape = false;
      else {
        // Try both and see which yields a larger scale for the source aspect.
        const scaleFor = (pw, ph) => {
          const cw = (pw - 2 * margin - (cols - 1) * gap) / cols;
          const ch = (ph - 2 * margin - (rows - 1) * gap) / rows;
          if (cw <= 0 || ch <= 0) return 0;
          return Math.min(cw / srcAspect, ch); // proportional target
        };
        const portraitScore = scaleFor(sheetW, sheetH);
        const landscapeScore = scaleFor(sheetH, sheetW);
        landscape = landscapeScore > portraitScore;
      }
      let pageW = sheetW;
      let pageH = sheetH;
      if (landscape && pageW < pageH) [pageW, pageH] = [pageH, pageW];
      if (!landscape && pageW > pageH) [pageW, pageH] = [pageH, pageW];

      // Cell geometry.
      const usableW = pageW - 2 * margin - (cols - 1) * gap;
      const usableH = pageH - 2 * margin - (rows - 1) * gap;
      const cellW = usableW / cols;
      const cellH = usableH / rows;
      if (cellW <= 1 || cellH <= 1) {
        setError("Margin and gap are too large for that many pages per sheet. Reduce them and try again.");
        setBusy(false);
        return;
      }

      // Embed every source page once, then stamp them onto the output sheets.
      const indices = src.getPageIndices();
      const embedded = await out.embedPages(indices.map((i) => src.getPage(i)));

      const cellsPerSheet = cols * rows;
      const sheetsNeeded = Math.ceil(srcCount / cellsPerSheet);

      for (let s = 0; s < sheetsNeeded; s++) {
        const page = out.addPage([pageW, pageH]);
        for (let slot = 0; slot < cellsPerSheet; slot++) {
          const srcIndex = s * cellsPerSheet + slot;
          if (srcIndex >= srcCount) break;

          // Grid position for this slot (row-major or column-major).
          let colPos, rowPos;
          if (order === "col") {
            colPos = Math.floor(slot / rows);
            rowPos = slot % rows;
          } else {
            colPos = slot % cols;
            rowPos = Math.floor(slot / cols);
          }

          // Cell origin (PDF origin is bottom-left; rows fill top-down).
          const cellX = margin + colPos * (cellW + gap);
          const cellY = pageH - margin - (rowPos + 1) * cellH - rowPos * gap;

          const ep = embedded[srcIndex];
          const ew = ep.width;
          const eh = ep.height;
          const scale = Math.min(cellW / ew, cellH / eh);
          const drawW = ew * scale;
          const drawH = eh * scale;
          // Center the scaled page inside its cell.
          const x = cellX + (cellW - drawW) / 2;
          const y = cellY + (cellH - drawH) / 2;

          page.drawPage(ep, { x, y, width: drawW, height: drawH });

          if (drawBorder) {
            const { rgb } = await loadPdfLib();
            page.drawRectangle({
              x,
              y,
              width: drawW,
              height: drawH,
              borderColor: rgb(0.7, 0.7, 0.7),
              borderWidth: 0.75,
            });
          }
        }
      }

      const outBytes = await out.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      setResult({ srcPages: srcCount, sheets: sheetsNeeded, name: file.name });
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(
        isEncryptedError(e)
          ? ENCRYPTED_MSG
          : "Couldn't process that PDF — it may be corrupted or password-protected."
      );
    } finally {
      setBusy(false);
    }
  }

  const outName = file ? file.name.replace(/\.pdf$/i, "") + `-${perSheet}up.pdf` : "nup.pdf";

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())
        }
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <input ref={inputRef} type="file" accept="application/pdf" onChange={onInput} hidden />
        <p className="dropzone-title">
          {file ? file.name : "Drop a PDF here, or click to choose"}
        </p>
        <p className="dropzone-sub">
          Your file never leaves your device — everything runs in your browser.
        </p>
      </div>

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="nup-per">Pages per sheet</label>
            <select
              id="nup-per"
              className="tool-select"
              value={perSheet}
              onChange={(e) => {
                setPerSheet(Number(e.target.value));
                setDownloadUrl("");
              }}
            >
              <option value={2}>2 (2-up)</option>
              <option value={4}>4 (4-up)</option>
              <option value={6}>6 (6-up)</option>
              <option value={8}>8 (8-up)</option>
              <option value={9}>9 (9-up)</option>
              <option value={16}>16 (16-up)</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="nup-sheet">Output sheet size</label>
            <select
              id="nup-sheet"
              className="tool-select"
              value={sheet}
              onChange={(e) => {
                setSheet(e.target.value);
                setDownloadUrl("");
              }}
            >
              {Object.entries(SHEETS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="nup-orient">Orientation</label>
            <select
              id="nup-orient"
              className="tool-select"
              value={orientation}
              onChange={(e) => {
                setOrientation(e.target.value);
                setDownloadUrl("");
              }}
            >
              <option value="auto">Auto (fit pages largest)</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="nup-order">Page order</label>
            <select
              id="nup-order"
              className="tool-select"
              value={order}
              onChange={(e) => {
                setOrder(e.target.value);
                setDownloadUrl("");
              }}
            >
              <option value="row">Left to right, then down</option>
              <option value="col">Top to bottom, then across</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="nup-margin">Page margin (pt)</label>
            <input
              id="nup-margin"
              className="tool-input"
              type="number"
              min="0"
              max="144"
              value={margin}
              onChange={(e) => {
                setMargin(Math.max(0, Number(e.target.value) || 0));
                setDownloadUrl("");
              }}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="nup-gap">Gap between pages (pt)</label>
            <input
              id="nup-gap"
              className="tool-input"
              type="number"
              min="0"
              max="72"
              value={gap}
              onChange={(e) => {
                setGap(Math.max(0, Number(e.target.value) || 0));
                setDownloadUrl("");
              }}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="nup-border">Cell borders</label>
            <select
              id="nup-border"
              className="tool-select"
              value={drawBorder ? "yes" : "no"}
              onChange={(e) => {
                setDrawBorder(e.target.value === "yes");
                setDownloadUrl("");
              }}
            >
              <option value="no">No border</option>
              <option value="yes">Thin gray border</option>
            </select>
          </div>
        </div>
      </div>

      <p className="tool-note">
        N-up places several of your pages, scaled down, onto each larger sheet — handy for handouts,
        thumbnails, or saving paper. Pages keep their aspect ratio and are centered in each slot; the
        original page order is preserved. 72 pt = 1 inch.
      </p>

      {error && <p className="tool-error" role="alert">{error}</p>}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={build} disabled={busy || !file}>
          {busy ? "Building…" : "Create N-up PDF"}
        </button>
        {downloadUrl && (
          <a className="btn btn-success" href={downloadUrl} download={outName}>
            ↓ Download {perSheet}-up PDF
          </a>
        )}
      </div>

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">Done</div>
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{result.srcPages}</div>
              <div className="tool-stat-label">source pages</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{perSheet}</div>
              <div className="tool-stat-label">pages per sheet</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.sheets}</div>
              <div className="tool-stat-label">output sheets</div>
            </div>
          </div>
        </div>
      )}

      {!file && (
        <p className="tool-note">Add a PDF above to combine its pages onto fewer, larger sheets.</p>
      )}
    </div>
  );
}
