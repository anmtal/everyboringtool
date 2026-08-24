"use client";

import { useState, useMemo } from "react";

// Thickness in INCHES per gauge, by material. Steel/galvanised/stainless use
// their standard gauge tables; aluminium/brass/copper use Brown & Sharpe (AWG).
const GAUGE = {
  steel: { 7: 0.1793, 8: 0.1644, 9: 0.1495, 10: 0.1345, 11: 0.1196, 12: 0.1046, 13: 0.0897, 14: 0.0747, 15: 0.0673, 16: 0.0598, 17: 0.0538, 18: 0.0478, 19: 0.0418, 20: 0.0359, 21: 0.0329, 22: 0.0299, 23: 0.0269, 24: 0.0239, 25: 0.0209, 26: 0.0179, 27: 0.0164, 28: 0.0149, 29: 0.0135, 30: 0.0120 },
  galvanized: { 8: 0.1681, 9: 0.1532, 10: 0.1382, 11: 0.1233, 12: 0.1084, 13: 0.0934, 14: 0.0785, 15: 0.0710, 16: 0.0635, 17: 0.0575, 18: 0.0516, 19: 0.0456, 20: 0.0396, 21: 0.0366, 22: 0.0336, 23: 0.0306, 24: 0.0276, 25: 0.0247, 26: 0.0217, 27: 0.0202, 28: 0.0187, 29: 0.0172, 30: 0.0157 },
  stainless: { 7: 0.1875, 8: 0.1719, 9: 0.1563, 10: 0.1406, 11: 0.1250, 12: 0.1094, 13: 0.0938, 14: 0.0781, 15: 0.0703, 16: 0.0625, 17: 0.0563, 18: 0.0500, 19: 0.0438, 20: 0.0375, 21: 0.0344, 22: 0.0312, 23: 0.0281, 24: 0.0250, 25: 0.0219, 26: 0.0188, 27: 0.0172, 28: 0.0156, 29: 0.0141, 30: 0.0125 },
  aluminum: { 6: 0.1620, 7: 0.1443, 8: 0.1285, 9: 0.1144, 10: 0.1019, 11: 0.0907, 12: 0.0808, 13: 0.0720, 14: 0.0641, 15: 0.0571, 16: 0.0508, 17: 0.0453, 18: 0.0403, 19: 0.0359, 20: 0.0320, 21: 0.0285, 22: 0.0253, 23: 0.0226, 24: 0.0201, 25: 0.0179, 26: 0.0159, 27: 0.0142, 28: 0.0126, 29: 0.0113, 30: 0.0100 },
};
const MATERIALS = [
  { key: "steel", label: "Steel (standard)" },
  { key: "galvanized", label: "Galvanised steel" },
  { key: "stainless", label: "Stainless steel" },
  { key: "aluminum", label: "Aluminium / brass / copper" },
];
const GAUGES = []; { const s = new Set(); for (const m of Object.values(GAUGE)) for (const g of Object.keys(m)) s.add(+g); GAUGES.push(...[...s].sort((a, b) => a - b)); }
const mm = (inch) => (inch * 25.4).toFixed(2);

export default function SheetMetalGaugeConverter() {
  const [mat, setMat] = useState("steel");
  const [mode, setMode] = useState("gauge");
  const [gaugePick, setGaugePick] = useState("16");
  const [thick, setThick] = useState("1.5");

  const avail = Object.keys(GAUGE[mat]);
  const result = useMemo(() => {
    if (mode === "gauge") {
      const g = avail.includes(gaugePick) ? gaugePick : avail[0];
      const inch = GAUGE[mat][g];
      return { gauge: g, inch, exact: true };
    }
    const target = parseFloat(thick) / 25.4;
    if (!isFinite(target) || target <= 0) return null;
    let bestG = avail[0];
    for (const g of avail) if (Math.abs(GAUGE[mat][g] - target) < Math.abs(GAUGE[mat][bestG] - target)) bestG = g;
    return { gauge: bestG, inch: GAUGE[mat][bestG], exact: Math.abs(GAUGE[mat][bestG] - target) < 0.0005 };
  }, [mat, mode, gaugePick, thick, avail]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="smg-mat">Metal</label>
          <select id="smg-mat" className="tool-input" value={mat} onChange={(e) => setMat(e.target.value)}>
            {MATERIALS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="smg-mode">I have a</label>
          <select id="smg-mode" className="tool-input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="gauge">Gauge number</option>
            <option value="mm">Thickness (mm)</option>
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="smg-val">{mode === "gauge" ? "Gauge" : "Thickness (mm)"}</label>
          {mode === "gauge" ? (
            <select id="smg-val" className="tool-input" value={avail.includes(gaugePick) ? gaugePick : avail[0]} onChange={(e) => setGaugePick(e.target.value)}>
              {avail.map((g) => <option key={g} value={g}>{g} ga</option>)}
            </select>
          ) : (
            <input id="smg-val" className="tool-input" type="number" step="0.01" min="0" value={thick} onChange={(e) => setThick(e.target.value)} />
          )}
        </div>
      </div>

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">{MATERIALS.find((m) => m.key === mat).label}{mode === "mm" && !result.exact ? " — nearest gauge:" : ":"}</p>
          <div className="csc-cards">
            <div className={`csc-card ${mode === "gauge" ? "is-input" : ""}`}><div className="csc-card-country">Gauge</div><div className="csc-card-size">{result.gauge} ga</div></div>
            <div className={`csc-card ${mode === "mm" ? "is-input" : ""}`}><div className="csc-card-country">Millimetres</div><div className="csc-card-size">{mm(result.inch)} mm</div></div>
            <div className="csc-card"><div className="csc-card-country">Inches</div><div className="csc-card-size">{result.inch.toFixed(4)}″</div></div>
          </div>
        </div>
      )}

      <div className="csc-table-wrap" style={{ marginTop: 22 }}>
        <table className="csc-table">
          <thead><tr><th>Gauge</th><th>Steel mm</th><th>Galv. mm</th><th>Stainless mm</th><th>Alum. mm</th></tr></thead>
          <tbody>
            {GAUGES.map((g) => (
              <tr key={g} className={result && +result.gauge === g ? "is-match" : ""}>
                <td>{g} ga</td>
                <td>{GAUGE.steel[g] ? mm(GAUGE.steel[g]) : "—"}</td>
                <td>{GAUGE.galvanized[g] ? mm(GAUGE.galvanized[g]) : "—"}</td>
                <td>{GAUGE.stainless[g] ? mm(GAUGE.stainless[g]) : "—"}</td>
                <td>{GAUGE.aluminum[g] ? mm(GAUGE.aluminum[g]) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tool-note">
        Gauge is not a universal thickness — the same number is a different thickness in each metal, which is why a generic
        gauge chart gets it wrong. 16 gauge is 1.52 mm in steel but 1.29 mm in aluminium. Steel, galvanised and stainless
        use their standard gauge tables; aluminium, brass and copper use the AWG (Brown &amp; Sharpe) scale. Galvanised
        includes the zinc coating. Free, runs in your browser.
      </p>
    </div>
  );
}
