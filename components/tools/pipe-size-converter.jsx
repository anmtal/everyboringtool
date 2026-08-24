"use client";

import { useState, useMemo } from "react";

// NPS <-> DN <-> outside diameter (ASME B36.10M). OD is constant across
// schedules; below NPS 14 the nominal size is a label, not the real diameter.
const ROWS = [
  { nps: "1/8", dn: "6", odIn: 0.405, odMm: 10.3 },
  { nps: "1/4", dn: "8", odIn: 0.540, odMm: 13.7 },
  { nps: "3/8", dn: "10", odIn: 0.675, odMm: 17.1 },
  { nps: "1/2", dn: "15", odIn: 0.840, odMm: 21.3 },
  { nps: "3/4", dn: "20", odIn: 1.050, odMm: 26.7 },
  { nps: "1", dn: "25", odIn: 1.315, odMm: 33.4 },
  { nps: "1¼", dn: "32", odIn: 1.660, odMm: 42.2 },
  { nps: "1½", dn: "40", odIn: 1.900, odMm: 48.3 },
  { nps: "2", dn: "50", odIn: 2.375, odMm: 60.3 },
  { nps: "2½", dn: "65", odIn: 2.875, odMm: 73.0 },
  { nps: "3", dn: "80", odIn: 3.500, odMm: 88.9 },
  { nps: "3½", dn: "90", odIn: 4.000, odMm: 101.6 },
  { nps: "4", dn: "100", odIn: 4.500, odMm: 114.3 },
  { nps: "5", dn: "125", odIn: 5.563, odMm: 141.3 },
  { nps: "6", dn: "150", odIn: 6.625, odMm: 168.3 },
  { nps: "8", dn: "200", odIn: 8.625, odMm: 219.1 },
  { nps: "10", dn: "250", odIn: 10.750, odMm: 273.1 },
  { nps: "12", dn: "300", odIn: 12.750, odMm: 323.9 },
  { nps: "14", dn: "350", odIn: 14.000, odMm: 355.6 },
  { nps: "16", dn: "400", odIn: 16.000, odMm: 406.4 },
  { nps: "18", dn: "450", odIn: 18.000, odMm: 457.2 },
  { nps: "20", dn: "500", odIn: 20.000, odMm: 508.0 },
  { nps: "24", dn: "600", odIn: 24.000, odMm: 609.6 },
];
const SYS = [
  { key: "nps", label: "NPS (inches)" },
  { key: "dn", label: "DN (metric)" },
  { key: "odMm", label: "Outside diameter (mm)" },
];

export default function PipeSizeConverter() {
  const [sys, setSys] = useState("nps");
  const [pick, setPick] = useState("2");
  const [mm, setMm] = useState("60");

  const isMeasure = sys === "odMm";
  const row = useMemo(() => {
    if (isMeasure) {
      const v = parseFloat(mm);
      if (!isFinite(v) || v <= 0) return null;
      let best = ROWS[0];
      for (const r of ROWS) if (Math.abs(r.odMm - v) < Math.abs(best.odMm - v)) best = r;
      return best;
    }
    return ROWS.find((r) => r[sys] === pick) || null;
  }, [sys, pick, mm, isMeasure]);

  const opts = isMeasure ? [] : ROWS.map((r) => r[sys]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="pp-sys">I have a</label>
          <select id="pp-sys" className="tool-input" value={sys} onChange={(e) => setSys(e.target.value)}>
            {SYS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="pp-val">{isMeasure ? "OD (mm)" : "Size"}</label>
          {isMeasure ? (
            <input id="pp-val" className="tool-input" type="number" step="0.1" min="0" value={mm} onChange={(e) => setMm(e.target.value)} />
          ) : (
            <select id="pp-val" className="tool-input" value={pick} onChange={(e) => setPick(e.target.value)}>
              {opts.map((o) => <option key={o} value={o}>{sys === "nps" ? `NPS ${o}` : `DN ${o}`}</option>)}
            </select>
          )}
        </div>
      </div>

      {row && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">{isMeasure ? "Closest pipe size:" : "Equivalent pipe sizes:"}</p>
          <div className="csc-cards">
            <div className={`csc-card ${sys === "nps" ? "is-input" : ""}`}><div className="csc-card-country">NPS</div><div className="csc-card-size">{row.nps}″</div></div>
            <div className={`csc-card ${sys === "dn" ? "is-input" : ""}`}><div className="csc-card-country">DN</div><div className="csc-card-size">{row.dn}</div></div>
            <div className={`csc-card ${sys === "odMm" ? "is-input" : ""}`}><div className="csc-card-country">OD (mm)</div><div className="csc-card-size">{row.odMm}</div></div>
            <div className="csc-card"><div className="csc-card-country">OD (in)</div><div className="csc-card-size">{row.odIn}″</div></div>
          </div>
        </div>
      )}

      <p className="tool-note">
        Nominal pipe size is not the real diameter: a "2-inch" (NPS 2 / DN 50) pipe actually measures 60.3 mm (2.375 in)
        across the outside. Note DN is a nominal metric label, not NPS × 25.4 (NPS 2 → DN 50, not DN 51). The outside
        diameter stays the same across every schedule — only the wall thickness and bore change — which is why this is a
        clean cross-reference. Free, runs in your browser.
      </p>
    </div>
  );
}
