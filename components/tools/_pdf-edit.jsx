"use client";

// Shared shell for pdf-lib edit tools (delete pages, extract, crop, add text).
// A tool supplies process(doc, opts, count, PDFDocument): mutate `doc` in place,
// or return a NEW PDFDocument to save instead. Everything runs in the browser —
// the PDF is never uploaded.
import { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";

export default function PdfEdit({ hint, actionLabel = "Save PDF", renderOptions, defaultOptions = {}, process, outSuffix = "edited", note }) {
  const [file, setFile] = useState(null);
  const [count, setCount] = useState(0);
  const [opts, setOpts] = useState(defaultOptions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const bytesRef = useRef(null);
  const outRef = useRef("");

  useEffect(() => () => { if (outRef.current) URL.revokeObjectURL(outRef.current); }, []);

  async function onFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") { setError("Please choose a PDF file."); return; }
    setError(""); setResult(null);
    try {
      const bytes = await f.arrayBuffer();
      bytesRef.current = bytes.slice(0);
      const doc = await PDFDocument.load(bytes);
      setCount(doc.getPageCount());
      setFile(f);
    } catch {
      setFile(null); setCount(0);
      setError("Couldn't read that PDF — it may be encrypted or corrupted.");
    }
  }

  const setOpt = (k, v) => { setOpts((o) => ({ ...o, [k]: v })); setResult(null); };

  async function run() {
    if (!file) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const doc = await PDFDocument.load(bytesRef.current);
      const maybe = await process(doc, opts, count, PDFDocument);
      const target = maybe || doc;
      const out = await target.save();
      const blob = new Blob([out], { type: "application/pdf" });
      if (outRef.current) URL.revokeObjectURL(outRef.current);
      const url = URL.createObjectURL(blob); outRef.current = url;
      setResult({ url, name: (file.name.replace(/\.pdf$/i, "") || "document") + "-" + outSuffix + ".pdf" });
    } catch (err) {
      setError((err && err.message) || "Couldn't process that PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="pe-file">Choose a PDF file</label>
        <input id="pe-file" className="tool-input" type="file" accept="application/pdf" onChange={onFile} />
        <p className="tool-note">{hint || "Everything happens in your browser — your PDF is never uploaded."}</p>
      </div>

      {file && count > 0 && (
        <>
          <p className="tool-note" style={{ fontWeight: 600 }}>{file.name} — {count} page{count === 1 ? "" : "s"}</p>
          {renderOptions && <div className="tool-fields">{renderOptions(count, opts, setOpt, busy)}</div>}
          {error && <p className="tool-error" role="alert">{error}</p>}
          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>{busy ? "Working…" : actionLabel}</button>
            {result && <a className="btn btn-success" href={result.url} download={result.name}>↓ Download PDF</a>}
          </div>
        </>
      )}

      {!file && error && <p className="tool-error" role="alert">{error}</p>}
      {note}
    </div>
  );
}
