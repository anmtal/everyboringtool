"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";

export default function EsignPdf() {
  const [file, setFile] = useState(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState("1");
  const [position, setPosition] = useState("bottom-right");
  const [scale, setScale] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const bytesRef = useRef(null);
  const outRef = useRef("");
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => () => { if (outRef.current) URL.revokeObjectURL(outRef.current); }, []);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111827";
  }, [file]);

  function point(e) {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - r.left) * (c.width / r.width), y: (cy - r.top) * (c.height / r.height) };
  }
  function start(e) { e.preventDefault(); drawing.current = true; const { x, y } = point(e); const ctx = canvasRef.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(x, y); }
  function move(e) { if (!drawing.current) return; e.preventDefault(); const { x, y } = point(e); const ctx = canvasRef.current.getContext("2d"); ctx.lineTo(x, y); ctx.stroke(); hasInk.current = true; }
  function end() { drawing.current = false; }
  function clearSig() { const c = canvasRef.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); hasInk.current = false; setResult(null); }

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
      setCount(doc.getPageCount()); setFile(f);
    } catch {
      setFile(null); setError("Couldn't read that PDF — it may be encrypted or corrupted.");
    }
  }

  async function run() {
    if (!file) return;
    if (!hasInk.current) { setError("Draw your signature in the box first."); return; }
    setBusy(true); setError(""); setResult(null);
    try {
      const pngUrl = canvasRef.current.toDataURL("image/png");
      const pngBytes = await (await fetch(pngUrl)).arrayBuffer();
      const doc = await PDFDocument.load(bytesRef.current);
      const png = await doc.embedPng(pngBytes);
      const pageNum = Math.min(Math.max(parseInt(page, 10) || 1, 1), count);
      const pg = doc.getPage(pageNum - 1);
      const { width, height } = pg.getSize();
      const sw = width * (Math.max(10, Math.min(80, parseInt(scale, 10) || 30)) / 100);
      const sh = sw * (png.height / png.width);
      const pad = 24;
      const [v, h] = position.split("-");
      const x = h === "left" ? pad : width - sw - pad;
      const y = v === "top" ? height - sh - pad : pad;
      pg.drawImage(png, { x, y, width: sw, height: sh });
      const out = await doc.save();
      const blob = new Blob([out], { type: "application/pdf" });
      if (outRef.current) URL.revokeObjectURL(outRef.current);
      const url = URL.createObjectURL(blob); outRef.current = url;
      setResult({ url, name: (file.name.replace(/\.pdf$/i, "") || "document") + "-signed.pdf" });
    } catch {
      setError("Couldn't sign the PDF. Try a smaller signature or a different file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="es-file">Choose a PDF file</label>
        <input id="es-file" className="tool-input" type="file" accept="application/pdf" onChange={onFile} />
        <p className="tool-note">Everything happens in your browser — your PDF and signature are never uploaded.</p>
      </div>

      {file && count > 0 && (
        <>
          <p className="tool-note" style={{ fontWeight: 600 }}>{file.name} — {count} page{count === 1 ? "" : "s"}</p>

          <div className="tool-field">
            <label className="tool-label">Draw your signature</label>
            <canvas
              ref={canvasRef}
              width={520}
              height={180}
              style={{ width: "100%", maxWidth: 520, height: "auto", aspectRatio: "520 / 180", border: "1px dashed var(--border)", borderRadius: 8, background: "#fff", touchAction: "none", cursor: "crosshair" }}
              onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
              onTouchStart={start} onTouchMove={move} onTouchEnd={end}
            />
            <div className="tool-actions" style={{ marginTop: 6 }}>
              <button type="button" className="btn" onClick={clearSig} disabled={busy}>Clear</button>
            </div>
          </div>

          <div className="tool-fields">
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="es-page">Page (1–{count})</label>
                <input id="es-page" className="tool-input" type="number" min="1" max={count} value={page} onChange={(e) => { setPage(e.target.value); setResult(null); }} disabled={busy} />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="es-pos">Position</label>
                <select id="es-pos" className="tool-select" value={position} onChange={(e) => { setPosition(e.target.value); setResult(null); }} disabled={busy}>
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="top-right">Top right</option>
                  <option value="top-left">Top left</option>
                </select>
              </div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="es-scale">Signature size: {scale}% of page width</label>
              <input id="es-scale" type="range" min="10" max="60" step="5" value={scale} onChange={(e) => { setScale(e.target.value); setResult(null); }} disabled={busy} />
            </div>
          </div>

          {error && <p className="tool-error" role="alert">{error}</p>}

          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>{busy ? "Working…" : "Sign PDF"}</button>
            {result && <a className="btn btn-success" href={result.url} download={result.name}>↓ Download signed PDF</a>}
          </div>
        </>
      )}

      {!file && error && <p className="tool-error" role="alert">{error}</p>}
    </div>
  );
}
