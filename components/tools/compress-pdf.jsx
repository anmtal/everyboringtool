"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { ENCRYPTED_MSG, isEncryptedError } from "../../lib/pdfLoad";

// Number formatters — created once, reused on every render.
const KB_FMT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const MB_FMT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const PCT_FMT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

// Human-friendly size string (KB, or MB once it's large enough).
function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes >= 1024 * 1024) return `${MB_FMT.format(bytes / (1024 * 1024))} MB`;
  return `${KB_FMT.format(bytes / 1024)} KB`;
}

// Render scale (how many device pixels per PDF point) and JPEG quality.
// Lower scale = fewer pixels to store; lower quality = harsher JPEG.
const PRESETS = {
  small: { label: "Small — smallest file", scale: 1.0, quality: 0.6 },
  balanced: { label: "Balanced — recommended", scale: 1.4, quality: 0.75 },
  high: { label: "High — best quality", scale: 2.0, quality: 0.85 },
};

// Browsers refuse to allocate canvases beyond a few thousand pixels per side.
const MAX_CANVAS_SIDE = 5000;
// Above this, rendering every page can take a while on a phone.
const SLOW_PAGE_COUNT = 50;

const ENCRYPTED_RE = /password|encrypt/i;

function looksEncrypted(err) {
  if (isEncryptedError(err)) return true;
  const name = String((err && err.name) || "");
  const msg = String((err && err.message) || "");
  return name === "PasswordException" || ENCRYPTED_RE.test(msg);
}

export default function CompressPdf() {
  // { name, size } of the chosen file
  const [source, setSource] = useState(null);
  // { url, size, unchanged } of the compressed result
  const [output, setOutput] = useState(null);
  const [preset, setPreset] = useState("balanced");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  const outputUrlRef = useRef(""); // object URL backing the download link
  const fileRef = useRef(null); // keep the File so the preset can be changed
  const runRef = useRef(0); // guards against an older run finishing last

  // Revoke any outstanding object URL on unmount.
  useEffect(() => {
    return () => {
      runRef.current += 1;
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    };
  }, []);

  function resetOutput() {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = "";
    }
    setOutput(null);
  }

  /**
   * Re-render every page to a JPEG and rebuild the PDF around those images.
   * This is what actually shrinks the file: the original fonts, vector art and
   * oversized embedded images are replaced by one right-sized raster per page.
   */
  async function compress(file, presetKey) {
    const cfg = PRESETS[presetKey] || PRESETS.balanced;
    const runId = runRef.current + 1;
    runRef.current = runId;

    setError("");
    setWarning("");
    resetOutput();
    setSource({ name: file.name, size: file.size });
    setBusy(true);
    setProgress("Reading PDF…");

    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

      const data = await file.arrayBuffer();
      const originalBytes = new Uint8Array(data.slice(0));

      // isEvalSupported must stay false: with it enabled, a crafted font in a
      // malicious PDF can execute arbitrary JS on this origin (CVE-2024-4367).
      const pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
      if (runRef.current !== runId) return;

      const total = pdf.numPages;
      if (total > SLOW_PAGE_COUNT) {
        setWarning(
          `This PDF has ${total} pages — compressing it can take a minute or two and use a lot of memory. Leave this tab open while it works.`
        );
      }

      const out = await PDFDocument.create();

      for (let p = 1; p <= total; p++) {
        if (runRef.current !== runId) return;
        setProgress(`Compressing page ${p} of ${total}…`);

        const page = await pdf.getPage(p);
        // scale 1 gives the page's true size in PDF points (rotation applied).
        const base = page.getViewport({ scale: 1 });
        const ptW = base.width;
        const ptH = base.height;

        // Clamp so we never ask for a canvas the browser will refuse.
        let scale = cfg.scale;
        const biggest = Math.max(ptW, ptH) * scale;
        if (biggest > MAX_CANVAS_SIDE) scale = MAX_CANVAS_SIDE / Math.max(ptW, ptH);

        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext("2d");
        // JPEG has no alpha channel — paint white first or transparency turns black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", cfg.quality));
        // Free the backing store before the next page allocates its own.
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
        if (!blob) throw new Error("Could not encode page image.");

        const jpg = await out.embedJpg(await blob.arrayBuffer());
        const newPage = out.addPage([ptW, ptH]);
        newPage.drawImage(jpg, { x: 0, y: 0, width: ptW, height: ptH });
      }

      if (runRef.current !== runId) return;
      setProgress("Writing the new PDF…");
      const bytes = await out.save({ useObjectStreams: true });
      if (runRef.current !== runId) return;

      const smaller = bytes.byteLength < file.size;
      // Never hand back something bigger than what the user gave us.
      const finalBytes = smaller ? bytes : originalBytes;
      const blob = new Blob([finalBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      outputUrlRef.current = url;
      setOutput({ url, size: blob.size, unchanged: !smaller });
    } catch (e) {
      if (runRef.current !== runId) return;
      setError(
        looksEncrypted(e)
          ? ENCRYPTED_MSG
          : "Couldn't read that PDF — it may be corrupted, password-protected, or not a valid PDF."
      );
      setSource(null);
      fileRef.current = null;
      resetOutput();
    } finally {
      if (runRef.current === runId) {
        setBusy(false);
        setProgress("");
      }
    }
  }

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Please choose a PDF file.");
      setWarning("");
      setSource(null);
      fileRef.current = null;
      resetOutput();
      return;
    }

    fileRef.current = file;
    await compress(file, preset);
  }

  function onPreset(e) {
    const next = e.target.value;
    setPreset(next);
    if (fileRef.current && !busy) compress(fileRef.current, next);
  }

  // Percent smaller (positive = shrank). Guard against divide-by-zero.
  const change =
    source && output && source.size > 0
      ? (1 - output.size / source.size) * 100
      : null;

  const baseName = source ? source.name.replace(/\.[^.]+$/, "") : "document";
  const downloadName = `${baseName}-compressed.pdf`;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cp-file">
              Choose a PDF
            </label>
            <input
              className="tool-input"
              id="cp-file"
              type="file"
              accept="application/pdf"
              onChange={onFile}
              disabled={busy}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cp-preset">
              Quality
            </label>
            <select
              className="tool-select"
              id="cp-preset"
              value={preset}
              onChange={onPreset}
              disabled={busy}
            >
              {Object.keys(PRESETS).map((key) => (
                <option key={key} value={key}>
                  {PRESETS[key].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {warning && !error && (
        <p className="tool-note" role="status">
          {warning}
        </p>
      )}

      {busy && (
        <p className="tool-note" role="status">
          {progress || "Compressing…"}
        </p>
      )}

      {source && output && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">NEW SIZE</p>
            <div className="tool-result-value">{formatSize(output.size)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatSize(source.size)}</div>
              <div className="tool-stat-label">Original</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatSize(output.size)}</div>
              <div className="tool-stat-label">Compressed</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {change === null || output.unchanged
                  ? "0%"
                  : `${PCT_FMT.format(Math.max(0, change))}%`}
              </div>
              <div className="tool-stat-label">Smaller</div>
            </div>
          </div>

          {output.unchanged && (
            <p className="tool-note" role="status">
              This PDF is already compact — text-only PDFs can&rsquo;t shrink much; this
              tool works best on scanned or image-heavy files. You&rsquo;re getting your
              original file back, untouched.
            </p>
          )}

          <div className="tool-actions">
            <a className="btn btn-success" href={output.url} download={downloadName}>
              ↓ Download compressed PDF
            </a>
          </div>
        </>
      )}

      <p className="tool-note">
        Each page is re-rendered as a right-sized JPEG and packed into a fresh PDF, so
        scans, photos and image-heavy files shrink a lot. The trade-off: text in the
        result is a picture, so it&rsquo;s no longer selectable or searchable. Pick a
        higher quality if pages look soft. Everything runs in your browser — your file
        is never uploaded.
      </p>
    </div>
  );
}
