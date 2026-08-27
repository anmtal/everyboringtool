"use client";

import { useState, useRef, useEffect } from "react";

export default function ChartMaker() {
  const [input, setInput] = useState("Mon, 12\nTue, 19\nWed, 7\nThu, 15\nFri, 22");
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#2f7d43");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const outRef = useRef("");
  useEffect(() => () => { if (outRef.current) URL.revokeObjectURL(outRef.current); }, []);

  function parseData() {
    return input.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const idx = l.lastIndexOf(",");
      const label = idx >= 0 ? l.slice(0, idx).trim() : l;
      const num = parseFloat((idx >= 0 ? l.slice(idx + 1) : "").replace(/[^0-9.\-]/g, ""));
      return { label, value: Number.isFinite(num) ? num : 0 };
    });
  }

  function run() {
    setError(""); setResult(null);
    const rows = parseData();
    if (rows.length === 0) { setError("Enter at least one line like:  Label, 42"); return; }
    setBusy(true);
    try {
      const W = 880, H = 480, padL = 60, padR = 24, padT = title ? 56 : 28, padB = 68;
      const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
      const max = Math.max(1, ...rows.map((r) => r.value));
      const plotW = W - padL - padR, plotH = H - padT - padB;
      if (title) { ctx.fillStyle = "#111827"; ctx.font = "bold 22px Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText(title.slice(0, 60), W / 2, 32); }
      ctx.textAlign = "right"; ctx.font = "12px Arial";
      for (let g = 0; g <= 4; g++) {
        const y = padT + plotH - (plotH * g / 4);
        ctx.fillStyle = "#6b7280"; ctx.fillText(String(Math.round(max * g / 4)), padL - 8, y + 4);
        ctx.strokeStyle = "#eef1f4"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
      }
      ctx.strokeStyle = "#d1d5db"; ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke();
      const n = rows.length, gap = Math.max(6, (plotW / n) * 0.28), bw = Math.max(2, (plotW - gap * n) / n);
      ctx.textAlign = "center";
      rows.forEach((r, i) => {
        const x = padL + gap / 2 + i * (bw + gap);
        const bh = plotH * (r.value / max);
        const y = padT + plotH - bh;
        ctx.fillStyle = color; ctx.fillRect(x, y, bw, bh);
        ctx.fillStyle = "#374151"; ctx.font = "12px Arial";
        ctx.fillText(String(r.value), x + bw / 2, Math.max(padT + 10, y - 6));
        const lbl = r.label.length > 14 ? r.label.slice(0, 13) + "…" : r.label;
        ctx.fillText(lbl, x + bw / 2, padT + plotH + 18);
      });
      canvas.toBlob((blob) => {
        if (!blob) { setBusy(false); setError("Export failed."); return; }
        if (outRef.current) URL.revokeObjectURL(outRef.current);
        const url = URL.createObjectURL(blob); outRef.current = url;
        setResult({ url }); setBusy(false);
      }, "image/png");
    } catch {
      setError("Couldn't build the chart."); setBusy(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="cm-in">Your data — one &quot;label, value&quot; per line</label>
        <textarea id="cm-in" className="tool-input" style={{ minHeight: 130, fontFamily: "ui-monospace, monospace", fontSize: 13 }} value={input} onChange={(e) => { setInput(e.target.value); setResult(null); }} spellCheck={false} />
        <p className="tool-note">The chart is drawn in your browser — nothing is uploaded.</p>
      </div>
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cm-title">Title (optional)</label>
            <input id="cm-title" className="tool-input" type="text" value={title} onChange={(e) => { setTitle(e.target.value); setResult(null); }} placeholder="Weekly visitors" />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cm-color">Bar color</label>
            <input id="cm-color" type="color" value={color} onChange={(e) => { setColor(e.target.value); setResult(null); }} />
          </div>
        </div>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy || !input.trim()}>{busy ? "Drawing…" : "Make chart"}</button>
        {result && <a className="btn btn-success" href={result.url} download="chart.png">↓ Download PNG</a>}
      </div>

      {result && (
        <div className="tool-result" style={{ marginTop: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.url} alt="Bar chart" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
        </div>
      )}
    </div>
  );
}
