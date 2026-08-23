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

export default function CompressPdf() {
  // { name, size } of the chosen file
  const [source, setSource] = useState(null);
  // { url, size } of the compressed result
  const [output, setOutput] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const outputUrlRef = useRef(""); // object URL backing the download link

  // Revoke any outstanding object URL on unmount.
  useEffect(() => {
    return () => {
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

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Please choose a PDF file.");
      setSource(null);
      resetOutput();
      return;
    }

    setError("");
    resetOutput();
    setSource({ name: file.name, size: file.size });
    setBusy(true);

    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const out = await doc.save({ useObjectStreams: true });
      const blob = new Blob([out], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      outputUrlRef.current = url;
      setOutput({ url, size: blob.size });
    } catch (e) {
      setError(isEncryptedError(e) ? ENCRYPTED_MSG : "Couldn't read that PDF — it may be corrupted, password-protected, or not a valid PDF.");
      setSource(null);
      resetOutput();
    } finally {
      setBusy(false);
    }
  }

  // Percent smaller (positive = shrank, negative = grew). Guard against divide-by-zero.
  const change =
    source && output && source.size > 0
      ? (1 - output.size / source.size) * 100
      : null;
  const grew = change !== null && change < 0;

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
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {busy && !output && (
        <p className="tool-note" role="status">
          Compressing…
        </p>
      )}

      {source && output && (
        <>
          <div className="tool-result">
            <p className="tool-result-label">NEW SIZE</p>
            <div className="tool-result-value">{formatSize(output.size)}</div>
          </div>

          <div className="tool-stat-grid">
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
                {change === null ? "—" : `${PCT_FMT.format(Math.abs(change))}%`}
              </div>
              <div className="tool-stat-label">{grew ? "Larger" : "Smaller"}</div>
            </div>
          </div>

          <div className="tool-actions">
            <a className="btn btn-success" href={output.url} download={downloadName}>
              ↓ Download compressed PDF
            </a>
          </div>
        </>
      )}

      <p className="tool-note">
        In-browser compression mainly re-packs and de-duplicates the PDF's internal
        objects using object streams — it does not downsample images or re-encode
        fonts. Text-heavy or older PDFs can shrink noticeably, while image-heavy or
        already-optimised files may shrink only a little, or not at all. Everything
        runs in your browser — your file is never uploaded.
      </p>
    </div>
  );
}
