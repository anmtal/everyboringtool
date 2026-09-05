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

export default function MergePdf() {
  const [files, setFiles] = useState([]); // { id, file, name }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [mergedCount, setMergedCount] = useState(0);

  // Free the previous merged PDF when a new merge replaces it, and on unmount.
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);
  const inputRef = useRef(null);
  const idRef = useRef(0);

  const addFiles = useCallback((list) => {
    const pdfs = Array.from(list).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (!pdfs.length) return;
    loadPdfLib().catch(() => {}); // warm the chunk while the user picks the order
    setFiles((prev) => [...prev, ...pdfs.map((f) => ({ id: ++idRef.current, file: f, name: f.name }))]);
    setDownloadUrl("");
    setError("");
  }, []);

  function onInput(e) {
    addFiles(e.target.files);
    e.target.value = "";
  }
  function onDrop(e) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }
  function move(i, dir) {
    setFiles((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDownloadUrl("");
  }
  function remove(id) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setDownloadUrl("");
  }
  function clearAll() {
    setFiles([]);
    setDownloadUrl("");
    setError("");
  }

  async function merge() {
    if (files.length < 2) {
      setError("Add at least two PDFs to merge.");
      return;
    }
    setBusy(true);
    setError("");
    setDownloadUrl("");
    try {
      const { PDFDocument } = await loadPdfLib();
      const out = await PDFDocument.create();
      for (const item of files) {
        const bytes = await item.file.arrayBuffer();
        const src = await PDFDocument.load(bytes);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const mergedBytes = await out.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      setMergedCount(files.length);
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(isEncryptedError(e) ? ENCRYPTED_MSG : "Couldn't merge those files — one may be corrupted or password-protected.");
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
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <input ref={inputRef} type="file" accept="application/pdf" multiple onChange={onInput} hidden />
        <p className="dropzone-title">Drop PDFs here, or click to choose</p>
        <p className="dropzone-sub">Your files never leave your device — merging happens in your browser.</p>
      </div>

      {files.length > 0 && (
        <ul className="filelist">
          {files.map((f, i) => (
            <li className="fileitem" key={f.id}>
              <span className="fileidx">{i + 1}</span>
              <span className="filename">{f.name}</span>
              <span className="fileactions">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === files.length - 1} aria-label="Move down">↓</button>
                <button type="button" onClick={() => remove(f.id)} aria-label={`Remove ${f.name}`}>✕</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="tool-error" role="alert">{error}</p>}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={merge} disabled={busy || files.length < 2}>
          {busy ? "Merging…" : `Merge ${files.length > 1 ? files.length + " PDFs" : "PDFs"}`}
        </button>
        {files.length > 0 && (
          <button type="button" className="btn" onClick={clearAll} disabled={busy}>Clear all</button>
        )}
        {downloadUrl && (
          <a className="btn btn-success" href={downloadUrl} download="merged.pdf">↓ Download merged PDF</a>
        )}
      </div>

      {/* Always in the DOM so screen readers announce the result when it appears. */}
      <p
        role="status"
        aria-live="polite"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}
      >
        {downloadUrl ? `Merged ${mergedCount} PDFs — download ready` : ""}
      </p>
    </div>
  );
}
