"use client";

import { useState, useRef, useEffect } from "react";
import { parseCsv } from "../../lib/dataConvert";

function csvLine(r) {
  return r.map((v) => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(",");
}

export default function SplitCsv() {
  const [input, setInput] = useState("");
  const [size, setSize] = useState("1000");
  const [header, setHeader] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const outRef = useRef("");
  useEffect(() => () => { if (outRef.current) URL.revokeObjectURL(outRef.current); }, []);

  async function run() {
    setError(""); setResult(null);
    const rows = parseCsv(input);
    if (rows.length === 0) { setError("Paste some CSV to split."); return; }
    const per = Math.max(1, parseInt(size, 10) || 1000);
    const hdr = header ? rows[0] : null;
    const data = header ? rows.slice(1) : rows;
    if (data.length === 0) { setError("There are no data rows to split."); return; }
    setBusy(true);
    try {
      const jz = await import("jszip");
      const JSZip = jz.default || jz;
      const zip = new JSZip();
      let part = 0;
      for (let i = 0; i < data.length; i += per) {
        part++;
        const chunk = data.slice(i, i + per);
        const lines = [];
        if (hdr) lines.push(csvLine(hdr));
        for (const r of chunk) lines.push(csvLine(r));
        zip.file(`part-${part}.csv`, lines.join("\n"));
      }
      const zblob = await zip.generateAsync({ type: "blob" });
      if (outRef.current) URL.revokeObjectURL(outRef.current);
      const url = URL.createObjectURL(zblob); outRef.current = url;
      setResult({ url, parts: part, rows: data.length });
    } catch {
      setError("Couldn't split the CSV.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="sc-in">Paste your CSV</label>
        <textarea id="sc-in" className="tool-input" style={{ minHeight: 150, fontFamily: "ui-monospace, monospace", fontSize: 13 }} value={input} onChange={(e) => { setInput(e.target.value); setResult(null); }} placeholder={"name,email\nAda,ada@example.com\n… thousands of rows …"} spellCheck={false} />
        <p className="tool-note">Split in your browser — nothing is uploaded.</p>
      </div>

      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="sc-size">Rows per file</label>
          <input id="sc-size" className="tool-input" type="number" min="1" value={size} onChange={(e) => { setSize(e.target.value); setResult(null); }} disabled={busy} />
        </div>
        <div className="tool-field">
          <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={header} onChange={(e) => { setHeader(e.target.checked); setResult(null); }} disabled={busy} />
            <span>First row is a header — repeat it in every file</span>
          </label>
        </div>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy || !input.trim()}>{busy ? "Splitting…" : "Split CSV"}</button>
        {result && <a className="btn btn-success" href={result.url} download="csv-parts.zip">↓ Download {result.parts} file{result.parts === 1 ? "" : "s"} (.zip)</a>}
      </div>
    </div>
  );
}
