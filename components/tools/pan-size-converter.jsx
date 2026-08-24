"use client";

import { useState, useMemo } from "react";

const SHAPES = [
  { key: "round", label: "Round" },
  { key: "square", label: "Square" },
  { key: "rect", label: "Rectangular" },
];

function area(p) {
  const a = parseFloat(p.size) || 0;
  const b = parseFloat(p.w) || 0;
  if (p.shape === "round") return Math.PI * (a / 2) ** 2;
  if (p.shape === "square") return a * a;
  return a * b;
}
function label(p) {
  if (p.shape === "round") return `${p.size}″ round`;
  if (p.shape === "square") return `${p.size}″ square`;
  return `${p.size}×${p.w}″`;
}

const COMMON = [
  ["6″ round", 28.3], ["7″ round", 38.5], ["8″ round", 50.3], ["9″ round", 63.6], ["10″ round", 78.5], ["12″ round", 113.1],
  ["8″ square", 64], ["9″ square", 81], ["9×13″", 117], ["11×7″", 77], ["10×15″ jelly roll", 150],
];

function PanFields({ id, val, set }) {
  return (
    <div className="tool-fields" style={{ marginTop: 0 }}>
      <div className="tool-field">
        <label className="tool-label" htmlFor={`${id}-shape`}>Shape</label>
        <select id={`${id}-shape`} className="tool-input" value={val.shape} onChange={(e) => set({ ...val, shape: e.target.value })}>
          {SHAPES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <div className="tool-field">
        <label className="tool-label" htmlFor={`${id}-size`}>{val.shape === "round" ? "Diameter (in)" : val.shape === "square" ? "Side (in)" : "Length (in)"}</label>
        <input id={`${id}-size`} className="tool-input" type="number" step="0.5" min="0" value={val.size} onChange={(e) => set({ ...val, size: e.target.value })} />
      </div>
      {val.shape === "rect" && (
        <div className="tool-field">
          <label className="tool-label" htmlFor={`${id}-w`}>Width (in)</label>
          <input id={`${id}-w`} className="tool-input" type="number" step="0.5" min="0" value={val.w} onChange={(e) => set({ ...val, w: e.target.value })} />
        </div>
      )}
    </div>
  );
}

export default function PanSizeConverter() {
  const [src, setSrc] = useState({ shape: "round", size: "9", w: "13" });
  const [tgt, setTgt] = useState({ shape: "square", size: "8", w: "8" });

  const { sa, ta, ratio } = useMemo(() => {
    const s = area(src), t = area(tgt);
    return { sa: s, ta: t, ratio: s > 0 ? t / s : 0 };
  }, [src, tgt]);

  const pct = Math.round(ratio * 100);
  const same = ratio >= 0.9 && ratio <= 1.1;
  const bigger = ratio > 1.1;

  return (
    <div className="tool">
      <p className="tool-label" style={{ margin: "0 0 4px" }}>The pan the recipe calls for</p>
      <PanFields id="src" val={src} set={setSrc} />
      <p className="tool-label" style={{ margin: "16px 0 4px" }}>The pan you want to use</p>
      <PanFields id="tgt" val={tgt} set={setTgt} />

      {ratio > 0 && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">{label(src)} → {label(tgt)}</p>
          <p className="tool-result-value" style={{ fontSize: 30, fontWeight: 800 }}>
            × {ratio.toFixed(2)} ingredients
          </p>
          <p className="tool-note" style={{ margin: "6px 0 0" }}>
            Your pan holds about <strong>{pct}%</strong> of the original.{" "}
            {same
              ? "That's close enough to use the recipe as-is."
              : bigger
              ? `Multiply every ingredient by ${ratio.toFixed(2)}. The batter will be shallower, so start checking for doneness a little earlier.`
              : `Multiply every ingredient by ${ratio.toFixed(2)} (or scale the recipe down). The batter will be deeper, so it may need a few extra minutes.`}
          </p>
        </div>
      )}

      <div className="csc-table-wrap" style={{ marginTop: 22 }}>
        <table className="csc-table">
          <thead><tr><th>Common pan</th><th>Area (sq in)</th></tr></thead>
          <tbody>
            {COMMON.map(([n, a]) => (<tr key={n}><td>{n}</td><td>{a}</td></tr>))}
          </tbody>
        </table>
      </div>

      <p className="tool-note">
        This compares pans by base area (round = π×r², square/rectangular = length×width), which is what determines how
        thickly the batter spreads. It assumes both pans are the same depth — a deeper or shallower tin changes the volume,
        so treat the bake time as a starting point and keep the oven temperature the same. Free, runs in your browser.
      </p>
    </div>
  );
}
