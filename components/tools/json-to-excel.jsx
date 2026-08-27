"use client";

import { useState, useRef, useEffect } from "react";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function JsonToExcel() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const outRef = useRef("");
  useEffect(() => () => { if (outRef.current) URL.revokeObjectURL(outRef.current); }, []);

  async function run() {
    setError(""); setResult(null);
    const s = input.trim();
    if (!s) { setError("Paste a JSON array of objects."); return; }
    let data;
    try { data = JSON.parse(s); } catch { setError("That isn't valid JSON."); return; }
    if (!Array.isArray(data)) { setError('Expected a JSON array of objects, e.g. [ { "name": "Ada" }, … ].'); return; }
    setBusy(true);
    try {
      const m = await import("xlsx");
      const XLSX = m.utils ? m : m.default;
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], { type: XLSX_MIME });
      if (outRef.current) URL.revokeObjectURL(outRef.current);
      const url = URL.createObjectURL(blob); outRef.current = url;
      setResult({ url, rows: data.length });
    } catch {
      setError("Couldn't build the spreadsheet — check the JSON is a flat array of objects.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="je-in">Paste a JSON array of objects</label>
        <textarea id="je-in" className="tool-input" style={{ minHeight: 180, fontFamily: "ui-monospace, monospace", fontSize: 13 }} value={input} onChange={(e) => { setInput(e.target.value); setResult(null); }} placeholder={'[\n  { "name": "Ada", "role": "Engineer" },\n  { "name": "Grace", "role": "Admiral" }\n]'} spellCheck={false} />
        <p className="tool-note">The spreadsheet is built in your browser — nothing is uploaded.</p>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy || !input.trim()}>{busy ? "Working…" : "Convert to Excel"}</button>
        {result && <a className="btn btn-success" href={result.url} download="data.xlsx">↓ Download .xlsx ({result.rows} row{result.rows === 1 ? "" : "s"})</a>}
      </div>
    </div>
  );
}
