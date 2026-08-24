"use client";

import { useState, useMemo } from "react";

// Standard oven chart. Fan/convection = conventional −20 °C (rule of thumb).
const ROWS = [
  { gas: "¼", c: 110, f: 225, fan: 90, desc: "Very cool" },
  { gas: "½", c: 120, f: 250, fan: 100, desc: "Very cool" },
  { gas: "1", c: 140, f: 275, fan: 120, desc: "Cool" },
  { gas: "2", c: 150, f: 300, fan: 130, desc: "Cool" },
  { gas: "3", c: 160, f: 325, fan: 140, desc: "Warm" },
  { gas: "4", c: 180, f: 350, fan: 160, desc: "Moderate" },
  { gas: "5", c: 190, f: 375, fan: 170, desc: "Moderately hot" },
  { gas: "6", c: 200, f: 400, fan: 180, desc: "Fairly hot" },
  { gas: "7", c: 220, f: 425, fan: 200, desc: "Hot" },
  { gas: "8", c: 230, f: 450, fan: 210, desc: "Very hot" },
  { gas: "9", c: 240, f: 475, fan: 220, desc: "Very hot" },
];

const MODES = [
  { key: "c", label: "°C (conventional)" },
  { key: "f", label: "°F (conventional)" },
  { key: "gas", label: "Gas mark" },
];

export default function OvenTemperatureConverter() {
  const [mode, setMode] = useState("c");
  const [temp, setTemp] = useState("180");
  const [gas, setGas] = useState("4");

  const row = useMemo(() => {
    if (mode === "gas") return ROWS.find((r) => r.gas === gas) || null;
    const val = parseFloat(temp);
    if (!isFinite(val)) return null;
    let best = ROWS[0];
    for (const r of ROWS) if (Math.abs(r[mode] - val) < Math.abs(best[mode] - val)) best = r;
    return best;
  }, [mode, temp, gas]);

  const exact = mode === "gas" || (row && Math.abs(row[mode] - parseFloat(temp)) < 3);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ot-mode">I have a temperature in</label>
          <select id="ot-mode" className="tool-input" value={mode} onChange={(e) => setMode(e.target.value)}>
            {MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="ot-val">{mode === "gas" ? "Gas mark" : "Temperature"}</label>
          {mode === "gas" ? (
            <select id="ot-val" className="tool-input" value={gas} onChange={(e) => setGas(e.target.value)}>
              {ROWS.map((r) => <option key={r.gas} value={r.gas}>Gas {r.gas}</option>)}
            </select>
          ) : (
            <input id="ot-val" className="tool-input" type="number" step="5" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder={mode === "c" ? "e.g. 180" : "e.g. 350"} />
          )}
        </div>
      </div>

      {row && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">{!exact ? "Closest standard oven setting:" : "Oven setting:"} {row.desc.toLowerCase()}</p>
          <div className="csc-cards">
            <div className={`csc-card ${mode === "c" ? "is-input" : ""}`}><div className="csc-card-country">°C</div><div className="csc-card-size">{row.c}°</div></div>
            <div className={`csc-card ${mode === "f" ? "is-input" : ""}`}><div className="csc-card-country">°F</div><div className="csc-card-size">{row.f}°</div></div>
            <div className={`csc-card ${mode === "gas" ? "is-input" : ""}`}><div className="csc-card-country">Gas mark</div><div className="csc-card-size">{row.gas}</div></div>
            <div className="csc-card"><div className="csc-card-country">Fan / convection</div><div className="csc-card-size">{row.fan}°C</div></div>
          </div>
        </div>
      )}

      <div className="csc-table-wrap" style={{ marginTop: 22 }}>
        <table className="csc-table">
          <thead><tr><th>°C</th><th>Fan °C</th><th>°F</th><th>Gas</th><th>Description</th></tr></thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.gas} className={row === r ? "is-match" : ""}>
                <td>{r.c}</td><td>{r.fan}</td><td>{r.f}</td><td>{r.gas}</td><td>{r.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tool-note">
        Gas mark is a UK/Ireland scale that generic temperature converters skip. Fan (convection) ovens run hotter, so the
        rule of thumb is to set them about 20 °C (25 °F) below the conventional temperature — the fan column already does
        this. Gas-mark-to-°C values are rounded and vary slightly between recipe sources. Free, runs in your browser.
      </p>
    </div>
  );
}
