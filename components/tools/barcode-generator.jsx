"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import JsBarcode from "jsbarcode";

const FORMATS = [
  { v: "CODE128", label: "CODE128 (any text)" },
  { v: "EAN13", label: "EAN-13 (12–13 digits)" },
  { v: "EAN8", label: "EAN-8 (7–8 digits)" },
  { v: "UPC", label: "UPC-A (11–12 digits)" },
  { v: "CODE39", label: "CODE39 (letters & digits)" },
  { v: "ITF14", label: "ITF-14 (14 digits)" },
  { v: "MSI", label: "MSI" },
  { v: "codabar", label: "Codabar" },
];

export default function BarcodeGenerator() {
  const [value, setValue] = useState("012345678905");
  const [format, setFormat] = useState("CODE128");
  const [showText, setShowText] = useState(true);
  const [error, setError] = useState("");
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError("");
    if (!value) {
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    let ok = true;
    try {
      JsBarcode(canvas, String(value), {
        format,
        displayValue: showText,
        width: 2,
        height: 90,
        margin: 12,
        background: "#ffffff",
        lineColor: "#000000",
        fontSize: 16,
        valid: (v) => { ok = v; },
      });
    } catch {
      ok = false;
    }
    if (!ok) {
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      setError(`That value isn't valid for the ${format} barcode type.`);
    }
  }, [value, format, showText]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || error) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `barcode-${format}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [format, error]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="bc-value">Value to encode</label>
          <input id="bc-value" className="tool-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Enter text or numbers…" />
        </div>
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bc-format">Barcode type</label>
            <select id="bc-format" className="tool-select" value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
            </select>
          </div>
          <div className="tool-field" style={{ justifyContent: "flex-end" }}>
            <label className="tool-note" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", margin: 0 }}>
              <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} />
              Show the value under the barcode
            </label>
          </div>
        </div>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
        <div style={{ background: "#fff", borderRadius: 10, padding: 8, display: error ? "none" : "inline-block" }}>
          <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "auto", display: "block" }} />
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-success" onClick={download} disabled={!!error || !value}>↓ Download PNG</button>
      </div>

      <p className="tool-note">Generate a scannable barcode from any value. Everything runs in your browser — nothing is uploaded. Pick the type that matches where you'll use it (CODE128 works for almost anything).</p>
    </div>
  );
}
