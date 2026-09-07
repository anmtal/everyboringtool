"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import JsBarcode from "jsbarcode";
import JSZip from "jszip";

const FORMATS = [
  { v: "CODE128", label: "CODE128 (any text)" },
  { v: "EAN13", label: "EAN-13 (12–13 digits)" },
  { v: "UPC", label: "UPC-A (11–12 digits)" },
  { v: "EAN8", label: "EAN-8 (7–8 digits)" },
  { v: "CODE39", label: "CODE39 (letters & digits)" },
  { v: "ITF14", label: "ITF-14 (14 digits)" },
  { v: "MSI", label: "MSI" },
  { v: "codabar", label: "Codabar" },
];
const SIZES = [{ v: 1.5, label: "Small" }, { v: 2, label: "Medium" }, { v: 3, label: "Large" }];
const MAX_BULK = 250;
const safeName = (s) => String(s).replace(/[^a-z0-9._-]+/gi, "_").slice(0, 40) || "barcode";

function baseOpts(format, showText, width) {
  return { format, displayValue: showText, width, height: 90, margin: 12, background: "#ffffff", lineColor: "#000000", fontSize: 16 };
}

export default function BarcodeGenerator({ initialFormat = "CODE128", initialMode = "single" } = {}) {
  const [mode, setMode] = useState(initialMode); // single | bulk
  const [value, setValue] = useState("012345678905");
  const [bulkText, setBulkText] = useState("");
  const [format, setFormat] = useState(initialFormat);
  const [showText, setShowText] = useState(true);
  const [width, setWidth] = useState(2);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef(null);
  const tmpRef = useRef(null);

  // Single preview.
  useEffect(() => {
    if (mode !== "single") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError("");
    if (!value) { canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height); return; }
    let ok = true;
    try { JsBarcode(canvas, String(value), { ...baseOpts(format, showText, width), valid: (v) => { ok = v; } }); }
    catch { ok = false; }
    if (!ok) { canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height); setError(`That value isn't valid for the ${format} barcode type.`); }
  }, [value, format, showText, width, mode]);

  // Bulk: one value per line ("value" or "value,label caption").
  const bulkItems = useMemo(() => {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, MAX_BULK);
    return lines.map((l) => {
      const c = l.indexOf(",");
      return c === -1 ? { value: l, label: l } : { value: l.slice(0, c).trim(), label: l.slice(c + 1).trim() || l.slice(0, c).trim() };
    }).filter((x) => x.value);
  }, [bulkText]);

  const [bulkResults, setBulkResults] = useState([]);
  useEffect(() => {
    if (mode !== "bulk") return;
    if (!tmpRef.current) tmpRef.current = document.createElement("canvas");
    const tmp = tmpRef.current;
    const out = [];
    for (const it of bulkItems) {
      let ok = true;
      try { JsBarcode(tmp, String(it.value), { ...baseOpts(format, showText, width), valid: (v) => { ok = v; } }); }
      catch { ok = false; }
      if (ok) out.push({ value: it.value, label: it.label, png: tmp.toDataURL("image/png") });
    }
    setBulkResults(out);
  }, [bulkItems, format, showText, width, mode]);

  const bulkSkipped = bulkItems.length - bulkResults.length;

  const downloadPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || error) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png"); a.download = `barcode-${format}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  }, [format, error]);

  const buildSvg = useCallback((val) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, String(val), baseOpts(format, showText, width));
    return new XMLSerializer().serializeToString(svg);
  }, [format, showText, width]);

  const downloadSvg = useCallback(() => {
    if (error || !value) return;
    try {
      const blob = new Blob([buildSvg(value)], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `barcode-${format}.svg`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* ignore */ }
  }, [buildSvg, value, format, error]);

  const downloadZip = useCallback(async () => {
    if (!bulkResults.length) return;
    setBusy(true);
    try {
      const zip = new JSZip();
      const seen = {};
      for (let i = 0; i < bulkResults.length; i++) {
        const r = bulkResults[i];
        let name = safeName(r.value); if (seen[name]) name = `${name}_${seen[name]}`; seen[safeName(r.value)] = (seen[safeName(r.value)] || 0) + 1;
        zip.file(`${String(i + 1).padStart(3, "0")}-${name}.png`, r.png.split(",")[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `barcodes-${format}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* ignore */ } finally { setBusy(false); }
  }, [bulkResults, format]);

  const printSheet = useCallback(() => {
    if (!bulkResults.length) return;
    const cells = bulkResults.map((r) => `<div style="display:inline-block;text-align:center;margin:6px;padding:6px;page-break-inside:avoid"><img src="${r.png}" style="max-width:100%"/></div>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><title>Barcode label sheet</title><body style="margin:12px;font-family:sans-serif">${cells}<script>window.onload=function(){window.print()}<\/script></body>`);
    w.document.close();
  }, [bulkResults]);

  return (
    <div className="tool">
      <div className="seg-toggle" role="tablist" aria-label="Mode" style={{ marginBottom: 12 }}>
        <button type="button" role="tab" aria-selected={mode === "single"} className={`seg-btn ${mode === "single" ? "is-active" : ""}`} onClick={() => setMode("single")}>Single</button>
        <button type="button" role="tab" aria-selected={mode === "bulk"} className={`seg-btn ${mode === "bulk" ? "is-active" : ""}`} onClick={() => setMode("bulk")}>Bulk (batch)</button>
      </div>

      <div className="tool-fields">
        {mode === "single" ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="bc-value">Value to encode</label>
            <input id="bc-value" className="tool-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Enter text or numbers…" spellCheck="false" />
          </div>
        ) : (
          <div className="tool-field">
            <label className="tool-label" htmlFor="bc-bulk">Values — one per line (or “value,caption”)</label>
            <textarea id="bc-bulk" className="tool-textarea" rows={5} value={bulkText} onChange={(e) => setBulkText(e.target.value)}
              placeholder={"012345678905\nSKU-1001,Blue Widget\nSKU-1002,Red Widget"} spellCheck="false" />
          </div>
        )}

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bc-format">Barcode type</label>
            <select id="bc-format" className="tool-select" value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="bc-size">Size</label>
            <select id="bc-size" className="tool-select" value={width} onChange={(e) => setWidth(Number(e.target.value))}>
              {SIZES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <label className="tool-note" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", margin: 0 }}>
          <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} />
          Show the value under each barcode
        </label>
      </div>

      {/* Single output */}
      {mode === "single" && (
        <>
          {error && <p className="tool-error" role="alert">{error}</p>}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: 8, display: error ? "none" : "inline-block" }}>
              <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "auto", display: "block" }} />
            </div>
          </div>
          <div className="tool-actions">
            <button type="button" className="btn btn-success" onClick={downloadPng} disabled={!!error || !value}>↓ PNG</button>
            <button type="button" className="btn" onClick={downloadSvg} disabled={!!error || !value}>↓ SVG (vector)</button>
          </div>
        </>
      )}

      {/* Bulk output */}
      {mode === "bulk" && (
        <>
          {bulkResults.length > 0 ? (
            <>
              <p className="tool-result-label" style={{ marginTop: 6 }}>{bulkResults.length} barcode{bulkResults.length > 1 ? "s" : ""}{bulkSkipped > 0 ? ` · ${bulkSkipped} invalid skipped` : ""}{bulkItems.length >= MAX_BULK ? ` · capped at ${MAX_BULK}` : ""}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 6 }}>
                {bulkResults.slice(0, 60).map((r, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 8, padding: 6 }}><img src={r.png} alt={r.value} style={{ maxWidth: 180, height: "auto", display: "block" }} /></div>
                ))}
              </div>
              {bulkResults.length > 60 && <p className="tool-note" style={{ textAlign: "center" }}>Showing the first 60 — the download includes all {bulkResults.length}.</p>}
              <div className="tool-actions">
                <button type="button" className="btn btn-success" onClick={downloadZip} disabled={busy}>{busy ? "Zipping…" : "↓ Download ZIP (PNGs)"}</button>
                <button type="button" className="btn" onClick={printSheet}>🖨 Print label sheet</button>
              </div>
            </>
          ) : (
            <p className="tool-note" style={{ marginTop: 8 }}>Paste one value per line above to generate a batch. Add a caption after a comma, e.g. <code>SKU-1001,Blue Widget</code>.</p>
          )}
        </>
      )}

      <p className="tool-note">
        Every barcode is generated in your browser — nothing is uploaded. CODE128 works for almost any text; EAN-13/UPC-A are for retail
        product codes. Download a single barcode as PNG or vector SVG, or batch-generate many and export a ZIP or a printable label sheet.
      </p>
    </div>
  );
}
