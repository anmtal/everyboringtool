"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { ENCRYPTED_MSG, isEncryptedError, loadPdf } from "../../lib/pdfLoad";

const NUM_FMT = new Intl.NumberFormat("en-US");

// Standard page sizes in PostScript points (1 pt = 1/72 inch), portrait.
const SIZES = [
  { value: "a4", label: "A4 (210 × 297 mm)", w: 595.28, h: 841.89 },
  { value: "letter", label: "US Letter (8.5 × 11 in)", w: 612, h: 792 },
  { value: "legal", label: "US Legal (8.5 × 14 in)", w: 612, h: 1008 },
  { value: "a3", label: "A3 (297 × 420 mm)", w: 841.89, h: 1190.55 },
  { value: "a5", label: "A5 (148 × 210 mm)", w: 419.53, h: 595.28 },
  { value: "tabloid", label: "Tabloid (11 × 17 in)", w: 792, h: 1224 },
];

const ORIENTATIONS = [
  { value: "auto", label: "Keep each page's orientation" },
  { value: "portrait", label: "Force portrait" },
  { value: "landscape", label: "Force landscape" },
];

function sizeFor(target) {
  return SIZES.find((s) => s.value === target) || SIZES[0];
}

export default function ResizePdf() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [firstPageDims, setFirstPageDims] = useState(null); // { w, h } in pt
  const [target, setTarget] = useState("a4");
  const [orientation, setOrientation] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url, changed, total }

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

  function reset() {
    setFile(null);
    setPageCount(0);
    setFirstPageDims(null);
    setStatus("");
    clearResult();
  }

  async function onFile(e) {
    const chosen = e.target.files && e.target.files[0];
    e.target.value = "";
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
      const count = doc.getPageCount();
      if (!count) throw new Error("empty");
      const first = doc.getPage(0).getSize();
      setFile(chosen);
      setPageCount(count);
      setFirstPageDims({ w: first.width, h: first.height });
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

  // Resolve the target width/height for a given source page (points).
  function targetDimsFor(srcW, srcH) {
    const base = sizeFor(target);
    let landscape;
    if (orientation === "portrait") landscape = false;
    else if (orientation === "landscape") landscape = true;
    else landscape = srcW > srcH; // auto: mirror the source page
    return landscape
      ? { w: base.h, h: base.w }
      : { w: base.w, h: base.h };
  }

  async function run() {
    if (!file || !pageCount) return;
    setError("");
    clearResult();
    setBusy(true);
    setStatus("Resizing pages…");
    try {
      const bytes = await file.arrayBuffer();
      const src = await loadPdf(bytes);
      const out = await PDFDocument.create();

      const indices = src.getPageIndices();
      // Embed every source page into the fresh document at once.
      const embedded = await out.embedPages(src.getPages());

      let changed = 0;
      for (let i = 0; i < indices.length; i++) {
        const srcPage = src.getPage(i);
        const { width: sw, height: sh } = srcPage.getSize();
        const { w: tw, h: th } = targetDimsFor(sw, sh);

        if (Math.abs(tw - sw) > 0.5 || Math.abs(th - sh) > 0.5) changed++;

        const page = out.addPage([tw, th]);
        const emb = embedded[i];

        // Scale to fit inside the target while preserving aspect ratio.
        const scale = Math.min(tw / sw, th / sh);
        const drawW = sw * scale;
        const drawH = sh * scale;
        page.drawPage(emb, {
          x: (tw - drawW) / 2,
          y: (th - drawH) / 2,
          xScale: scale,
          yScale: scale,
        });
      }

      const outBytes = await out.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({ url, changed, total: indices.length });
    } catch (err) {
      setError(
        isEncryptedError(err)
          ? ENCRYPTED_MSG
          : "Something went wrong resizing that PDF. It may be corrupted or protected."
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const targetLabel = sizeFor(target).label;
  const origLabel = firstPageDims
    ? `${Math.round(firstPageDims.w / 72 * 100) / 100} × ${
        Math.round(firstPageDims.h / 72 * 100) / 100
      } in`
    : "";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-file">
              Choose a PDF
            </label>
            <input
              className="tool-input"
              id="rp-file"
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
              <div className="tool-stat-num">{origLabel}</div>
              <div className="tool-stat-label">First page size</div>
            </div>
          </div>

          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="rp-size">
                  Resize pages to
                </label>
                <select
                  className="tool-select"
                  id="rp-size"
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    clearResult();
                  }}
                >
                  {SIZES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="rp-orient">
                  Orientation
                </label>
                <select
                  className="tool-select"
                  id="rp-orient"
                  value={orientation}
                  onChange={(e) => {
                    setOrientation(e.target.value);
                    clearResult();
                  }}
                >
                  {ORIENTATIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <p className="tool-note">
            Each page is scaled to fit the new {targetLabel.split(" (")[0]}{" "}
            size, keeping its proportions and centering it — so nothing is
            stretched or cropped. Any leftover space becomes an even white
            margin.
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={run}
              disabled={busy}
            >
              {busy ? "Working…" : "Resize PDF"}
            </button>
            {result && (
              <a
                className="btn btn-success"
                href={result.url}
                download={`${baseName}-${target}.pdf`}
              >
                ↓ Download resized PDF
              </a>
            )}
          </div>

          {result && (
            <div className="tool-result" role="status" aria-live="polite">
              <div className="tool-result-label">Done</div>
              <div className="tool-result-value">
                Resized {NUM_FMT.format(result.total)}{" "}
                {result.total === 1 ? "page" : "pages"} to {targetLabel}.{" "}
                {result.changed === 0
                  ? "The pages already matched this size."
                  : `${NUM_FMT.format(result.changed)} ${
                      result.changed === 1 ? "page was" : "pages were"
                    } a different size and got rescaled.`}
              </div>
            </div>
          )}
        </>
      )}

      {!file && (
        <p className="tool-note">
          Pick a PDF to change its page size — resize to A4, US Letter, Legal,
          A3, A5, or Tabloid. Your content is scaled to fit each new page.
        </p>
      )}

      <p className="tool-note">
        Everything runs in your browser — your PDF is never uploaded to a
        server.
      </p>
    </div>
  );
}
