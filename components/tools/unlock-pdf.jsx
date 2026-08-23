"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

export default function UnlockPdf() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Release the previous output blob. React runs this cleanup before the next
  // effect, so re-running a tool frees the old result instead of pinning every
  // output (video results can be hundreds of MB) for the life of the tab.
  useEffect(() => {
    return () => {
      if (result && result.url) URL.revokeObjectURL(result.url);
    };
  }, [result]);
  const inputRef = useRef(null);

  function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setResult(null);
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") { setError("Please choose a PDF file."); return; }
    setFile(f);
  }

  const run = useCallback(async () => {
    if (!file) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const out = await pdf.save();
      const blob = new Blob([out], { type: "application/pdf" });
      const base = file.name.replace(/\.pdf$/i, "") || "document";
      setResult({ url: URL.createObjectURL(blob), name: `${base}-unlocked.pdf`, size: blob.size });
    } catch {
      setError("Couldn't unlock this PDF. If it requires a password just to open, this tool can't remove it — open it in a PDF viewer using the password, then choose Print → Save as PDF to make an unrestricted copy.");
    } finally {
      setBusy(false);
    }
  }, [file]);

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
      >
        <input ref={inputRef} type="file" accept="application/pdf" onChange={onPick} hidden />
        <p className="dropzone-title">{file ? file.name : "Choose a PDF file"}</p>
        <p className="dropzone-sub">{file ? fmtBytes(file.size) + " — nothing uploaded" : "Removes owner passwords & restrictions"}</p>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!file || busy}>
          {busy ? "Unlocking…" : "Unlock PDF"}
        </button>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">Done — {fmtBytes(result.size)}</p>
          <div className="tool-actions" style={{ marginTop: 8 }}>
            <a className="btn btn-success" href={result.url} download={result.name}>↓ Download {result.name}</a>
          </div>
        </div>
      )}

      <p className="tool-note">
        Removes owner-password <em>restrictions</em> (the ones that block printing, copying or editing) and saves an
        unrestricted copy — entirely in your browser, nothing uploaded. Only unlock PDFs you own or have the right to.
        PDFs that need a password just to open can't be unlocked here.
      </p>
    </div>
  );
}
