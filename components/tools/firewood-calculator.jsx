"use client";

import { useState, useMemo } from "react";

const M3 = 0.0283168; // cubic feet -> cubic metres
const fmt = (n, d = 2) => Number(n.toFixed(d)).toString();

export default function FirewoodCalculator() {
  const [len, setLen] = useState("8");   // stack length, ft
  const [ht, setHt] = useState("4");     // stack height, ft
  const [log, setLog] = useState("16");  // log length / stack depth, inches

  const out = useMemo(() => {
    const L = parseFloat(len), H = parseFloat(ht), D = parseFloat(log);
    if (![L, H, D].every((x) => isFinite(x) && x > 0)) return null;
    const cuft = L * H * (D / 12);
    const cords = cuft / 128;
    const facePerFull = 48 / D; // a full cord is 48 inches deep
    return { cuft, cords, facePerFull, faceShare: 100 / facePerFull };
  }, [len, ht, log]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="fw-len">Stack length (ft)</label>
          <input id="fw-len" className="tool-input" type="number" step="0.5" min="0" value={len} onChange={(e) => setLen(e.target.value)} />
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="fw-ht">Stack height (ft)</label>
          <input id="fw-ht" className="tool-input" type="number" step="0.5" min="0" value={ht} onChange={(e) => setHt(e.target.value)} />
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="fw-log">Log length / depth (in)</label>
          <input id="fw-log" className="tool-input" type="number" step="1" min="0" value={log} onChange={(e) => setLog(e.target.value)} />
        </div>
      </div>

      {out && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">This stack holds</p>
          <div className="csc-cards">
            <div className="csc-card is-input"><div className="csc-card-country">Full cords</div><div className="csc-card-size">{fmt(out.cords)}</div></div>
            <div className="csc-card"><div className="csc-card-country">Cubic feet</div><div className="csc-card-size">{fmt(out.cuft, 1)}</div></div>
            <div className="csc-card"><div className="csc-card-country">Cubic metres</div><div className="csc-card-size">{fmt(out.cuft * M3)}</div></div>
          </div>
          <p className="tool-note" style={{ margin: "10px 0 0" }}>
            With {log}″ logs, a full cord is <strong>{fmt(out.facePerFull, 1)}</strong> stacks this deep — so a single
            "face cord" of {log}″ logs is only about <strong>{Math.round(out.faceShare)}%</strong> of a full cord. Make
            sure you're buying the one you think you are.
          </p>
        </div>
      )}

      <div className="csc-table-wrap" style={{ marginTop: 22 }}>
        <table className="csc-table">
          <thead><tr><th>Measure</th><th>Dimensions</th><th>Cubic feet</th></tr></thead>
          <tbody>
            <tr><td>Full cord</td><td>4 × 4 × 8 ft</td><td>128</td></tr>
            <tr><td>Face cord (16″ logs)</td><td>4 × 8 ft × 16″</td><td>≈ 43 (⅓ cord)</td></tr>
            <tr><td>Face cord (24″ logs)</td><td>4 × 8 ft × 24″</td><td>64 (½ cord)</td></tr>
            <tr><td>Rick</td><td>varies (= a face cord)</td><td>≈ 43–64</td></tr>
          </tbody>
        </table>
      </div>

      <p className="tool-note">
        A full cord is a stack measuring 4 × 4 × 8 ft = 128 cubic feet. A "face cord" (or "rick") is 4 × 8 ft but only one
        log-length deep, so its size depends entirely on the log length — 16″ logs give about a third of a cord, 24″ logs
        about a half. That ambiguity is where firewood buyers get short-changed, which is why this tool spells it out.
        Free, runs in your browser.
      </p>
    </div>
  );
}
