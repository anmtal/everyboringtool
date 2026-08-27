"use client";

import { useState, useRef, useEffect } from "react";

function fmtBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

export default function CreateZip() {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const outRef = useRef("");
  useEffect(() => () => { if (outRef.current) URL.revokeObjectURL(outRef.current); }, []);

  function onFiles(e) {
    const fs = [...(e.target.files || [])];
    e.target.value = "";
    setError(""); setResult(null);
    setFiles(fs);
  }

  async function run() {
    if (files.length === 0) { setError("Choose one or more files."); return; }
    setBusy(true); setError(""); setResult(null);
    try {
      const jz = await import("jszip");
      const JSZip = jz.default || jz;
      const zip = new JSZip();
      const used = new Set();
      for (const f of files) {
        const base = f.name || "file";
        let name = base, i = 1;
        while (used.has(name)) {
          const dot = base.lastIndexOf(".");
          name = dot > 0 ? `${base.slice(0, dot)}(${i})${base.slice(dot)}` : `${base}(${i})`;
          i++;
        }
        used.add(name);
        zip.file(name, f);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      if (outRef.current) URL.revokeObjectURL(outRef.current);
      const url = URL.createObjectURL(blob); outRef.current = url;
      setResult({ url, count: files.length, size: blob.size });
    } catch {
      setError("Couldn't build the zip — the files may be too large for the browser's memory.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="cz-files">Choose files to zip</label>
        <input id="cz-files" className="tool-input" type="file" multiple onChange={onFiles} disabled={busy} />
        <p className="tool-note">The zip is built in your browser — your files are never uploaded.</p>
      </div>

      {files.length > 0 && <p className="tool-note" style={{ fontWeight: 600 }}>{files.length} file{files.length === 1 ? "" : "s"} selected</p>}
      {error && <p className="tool-error" role="alert">{error}</p>}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy || files.length === 0}>{busy ? "Zipping…" : "Create ZIP"}</button>
        {result && <a className="btn btn-success" href={result.url} download="archive.zip">↓ Download archive.zip ({fmtBytes(result.size)})</a>}
      </div>
    </div>
  );
}
