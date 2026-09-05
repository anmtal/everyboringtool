"use client";

// Shared shell for "upload a file -> get a result" tools (spreadsheet, zip, PDF
// image extraction). A tool supplies process(file) which returns
// { url, name, text?, note? }: `url`+`name` make a download, and an optional
// `text` shows a copyable preview. All processing is client-side — nothing is
// uploaded.
import { useState, useRef, useEffect } from "react";

export default function FileTool({ accept = "", fileLabel = "Choose a file", hint, working = "Working…", process, note }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const outRef = useRef("");

  useEffect(() => () => { if (outRef.current) URL.revokeObjectURL(outRef.current); }, []);

  async function onFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true); setError(""); setResult(null); setCopied(false);
    try {
      const r = await process(f);
      if (outRef.current) URL.revokeObjectURL(outRef.current);
      outRef.current = r && r.url ? r.url : "";
      setResult(r);
    } catch (err) {
      setError((err && err.message) || "Couldn't process that file.");
    } finally {
      setBusy(false);
    }
  }
  function copy() {
    if (result && result.text != null) navigator.clipboard?.writeText(result.text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="ft-file">{fileLabel}</label>
        <input id="ft-file" className="tool-input" type="file" accept={accept} onChange={onFile} disabled={busy} />
        <p className="tool-note">{hint || "Everything happens in your browser — your file is never uploaded."}</p>
      </div>

      {busy && <p className="tool-note" aria-live="polite">{working}</p>}
      {error && <p className="tool-error" role="alert">{error}</p>}

      {result && (
        <div style={{ marginTop: 8 }}>
          {result.text != null && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="ft-out">Result</label>
              <textarea id="ft-out" readOnly className="tool-input" style={{ minHeight: 180, fontFamily: "ui-monospace, monospace", fontSize: 13 }} value={result.text} spellCheck={false} />
            </div>
          )}
          <div className="tool-actions" style={{ marginTop: 8 }}>
            {result.text != null && <button type="button" className="btn" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>}
            {result.url && <a className="btn btn-success" href={result.url} download={result.name}>↓ Download {(result.name.split(".").pop() || "file").toUpperCase()}</a>}
          </div>
          {result.note && <p className="tool-note">{result.note}</p>}
        </div>
      )}

      {note}
    </div>
  );
}
