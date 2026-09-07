"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const TYPES = [["bar", "Bar"], ["line", "Line"], ["pie", "Pie"], ["scatter", "Scatter"]];
const W = 880, H = 480;

function parseLV(input) {
  return input.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const idx = l.lastIndexOf(",");
    const label = idx >= 0 ? l.slice(0, idx).trim() : l;
    const num = parseFloat((idx >= 0 ? l.slice(idx + 1) : "").replace(/[^0-9.\-]/g, ""));
    return { label, value: Number.isFinite(num) ? num : 0 };
  });
}
function parseXY(input) {
  const out = [];
  for (const raw of input.replace(/\r/g, "").split("\n")) {
    const nums = (raw.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    if (nums.length >= 2) out.push({ x: nums[nums.length - 2], y: nums[nums.length - 1] });
  }
  return out;
}

export default function ChartMaker({ initialType = "bar" } = {}) {
  const [type, setType] = useState(initialType);
  const [input, setInput] = useState("Mon, 12\nTue, 19\nWed, 7\nThu, 15\nFri, 22");
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#2f7d43");
  const [error, setError] = useState("");
  const canvasRef = useRef(null);
  const scatter = type === "scatter";

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    setError("");

    const padT = title ? 56 : 28;
    if (title) { ctx.fillStyle = "#111827"; ctx.font = "bold 22px Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText(title.slice(0, 60), W / 2, 32); }

    if (scatter) {
      const pts = parseXY(input);
      if (pts.length === 0) { setError('Enter at least one "x, y" pair per line, e.g.  3, 8'); return; }
      const padL = 60, padR = 24, padB = 50, plotW = W - padL - padR, plotH = H - padT - padB;
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      let xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(0, ...ys), yMax = Math.max(...ys);
      if (xMin === xMax) { xMin -= 1; xMax += 1; } if (yMin === yMax) yMax += 1;
      const mapX = (x) => padL + ((x - xMin) / (xMax - xMin)) * plotW;
      const mapY = (y) => padT + plotH - ((y - yMin) / (yMax - yMin)) * plotH;
      ctx.strokeStyle = "#eef1f4"; ctx.fillStyle = "#6b7280"; ctx.font = "12px Arial";
      for (let g = 0; g <= 4; g++) {
        const y = padT + plotH - (plotH * g / 4); const v = yMin + (yMax - yMin) * g / 4;
        ctx.textAlign = "right"; ctx.fillStyle = "#6b7280"; ctx.fillText(String(Math.round(v * 100) / 100), padL - 8, y + 4);
        ctx.strokeStyle = "#eef1f4"; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
      }
      for (let g = 0; g <= 4; g++) { const x = padL + plotW * g / 4; const v = xMin + (xMax - xMin) * g / 4; ctx.textAlign = "center"; ctx.fillStyle = "#6b7280"; ctx.fillText(String(Math.round(v * 100) / 100), x, padT + plotH + 20); }
      ctx.strokeStyle = "#d1d5db"; ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke();
      ctx.fillStyle = color;
      for (const p of pts) { ctx.beginPath(); ctx.arc(mapX(p.x), mapY(p.y), 5, 0, Math.PI * 2); ctx.fill(); }
      return;
    }

    const rows = parseLV(input);
    if (rows.length === 0) { setError('Enter at least one line like:  Label, 42'); return; }

    if (type === "pie") {
      const total = rows.reduce((s, r) => s + Math.max(0, r.value), 0) || 1;
      const cx = 250, cy = padT + (H - padT) / 2 - 10, R = Math.min(150, (H - padT) / 2 - 20);
      let a0 = -Math.PI / 2;
      rows.forEach((r, i) => {
        const frac = Math.max(0, r.value) / total; const a1 = a0 + frac * Math.PI * 2;
        ctx.fillStyle = `hsl(${Math.round((i * 360) / rows.length)}, 62%, 55%)`;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath(); ctx.fill();
        a0 = a1;
      });
      // legend
      let ly = padT + 10; ctx.textAlign = "left"; ctx.font = "13px Arial";
      rows.forEach((r, i) => {
        ctx.fillStyle = `hsl(${Math.round((i * 360) / rows.length)}, 62%, 55%)`; ctx.fillRect(470, ly, 14, 14);
        ctx.fillStyle = "#374151"; const pct = Math.round((Math.max(0, r.value) / total) * 100);
        ctx.fillText(`${r.label.slice(0, 22)} — ${pct}%`, 492, ly + 12); ly += 24;
      });
      return;
    }

    // bar + line
    const padL = 60, padR = 24, padB = 68, plotW = W - padL - padR, plotH = H - padT - padB;
    const max = Math.max(1, ...rows.map((r) => r.value));
    ctx.textAlign = "right"; ctx.font = "12px Arial";
    for (let g = 0; g <= 4; g++) {
      const y = padT + plotH - (plotH * g / 4);
      ctx.fillStyle = "#6b7280"; ctx.fillText(String(Math.round(max * g / 4)), padL - 8, y + 4);
      ctx.strokeStyle = "#eef1f4"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
    }
    ctx.strokeStyle = "#d1d5db"; ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke();
    const n = rows.length; ctx.textAlign = "center"; ctx.fillStyle = "#374151"; ctx.font = "12px Arial";

    if (type === "line") {
      const step = n > 1 ? plotW / (n - 1) : 0;
      const px = (i) => padL + (n > 1 ? i * step : plotW / 2);
      const py = (v) => padT + plotH - plotH * (v / max);
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath();
      rows.forEach((r, i) => { const x = px(i), y = py(r.value); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke();
      rows.forEach((r, i) => {
        const x = px(i), y = py(r.value);
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#374151"; ctx.fillText(String(r.value), x, Math.max(padT + 10, y - 8));
        ctx.fillText((r.label.length > 12 ? r.label.slice(0, 11) + "…" : r.label), x, padT + plotH + 18);
      });
      return;
    }

    // bar
    const gap = Math.max(6, (plotW / n) * 0.28), bw = Math.max(2, (plotW - gap * n) / n);
    rows.forEach((r, i) => {
      const x = padL + gap / 2 + i * (bw + gap); const bh = plotH * (r.value / max); const y = padT + plotH - bh;
      ctx.fillStyle = color; ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = "#374151"; ctx.fillText(String(r.value), x + bw / 2, Math.max(padT + 10, y - 6));
      const lbl = r.label.length > 14 ? r.label.slice(0, 13) + "…" : r.label;
      ctx.fillText(lbl, x + bw / 2, padT + plotH + 18);
    });
  }, [type, input, title, color, scatter]);

  useEffect(() => { draw(); }, [draw]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${type}-chart.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }, [type]);

  return (
    <div className="tool">
      <div className="seg-toggle" role="tablist" aria-label="Chart type" style={{ marginBottom: 12 }}>
        {TYPES.map(([v, l]) => (
          <button key={v} type="button" role="tab" aria-selected={type === v} className={`seg-btn ${type === v ? "is-active" : ""}`} onClick={() => setType(v)}>{l}</button>
        ))}
      </div>

      <div className="tool-field">
        <label className="tool-label" htmlFor="cm-in">{scatter ? "Your data — one “x, y” pair per line" : "Your data — one “label, value” per line"}</label>
        <textarea id="cm-in" className="tool-input" style={{ minHeight: 130, fontFamily: "ui-monospace, monospace", fontSize: 13 }} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
        <p className="tool-note">The chart is drawn live in your browser — nothing is uploaded.</p>
      </div>

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cm-title">Title (optional)</label>
            <input id="cm-title" className="tool-input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly visitors" />
          </div>
          {!scatter && type !== "pie" && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cm-color">Color</label>
              <input id="cm-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          )}
          {scatter && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cm-color2">Point color</label>
              <input id="cm-color2" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      <div className="tool-result" style={{ marginTop: 10 }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ maxWidth: "100%", height: "auto", borderRadius: 8, border: "1px solid var(--border)" }} />
      </div>

      <div className="tool-actions" style={{ marginTop: 10 }}>
        <button type="button" className="btn btn-success" onClick={download} disabled={!!error}>↓ Download PNG</button>
      </div>
    </div>
  );
}
