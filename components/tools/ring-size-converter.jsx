"use client";

import { useState, useMemo } from "react";

// EU column pinned to ISO 8653 (size = inner circumference in mm). Japan per JIS,
// UK per BS EN 28653 letter scale. diameter/circumference are the physical anchor.
const ROWS = [
  { US: "3", UK: "F", EU: "44", JP: "4", dia: 14.05, circ: 44.2 },
  { US: "3.5", UK: "G", EU: "46", JP: "5", dia: 14.45, circ: 45.5 },
  { US: "4", UK: "H½", EU: "47", JP: "7", dia: 14.86, circ: 46.8 },
  { US: "4.5", UK: "I½", EU: "48", JP: "8", dia: 15.27, circ: 48.0 },
  { US: "5", UK: "J½", EU: "49", JP: "9", dia: 15.70, circ: 49.3 },
  { US: "5.5", UK: "L", EU: "51", JP: "10", dia: 16.10, circ: 50.6 },
  { US: "6", UK: "L½", EU: "52", JP: "11", dia: 16.51, circ: 51.9 },
  { US: "6.5", UK: "M½", EU: "53", JP: "13", dia: 16.92, circ: 53.1 },
  { US: "7", UK: "N½", EU: "54", JP: "14", dia: 17.35, circ: 54.4 },
  { US: "7.5", UK: "O½", EU: "56", JP: "15", dia: 17.75, circ: 55.7 },
  { US: "8", UK: "P½", EU: "57", JP: "16", dia: 18.19, circ: 57.0 },
  { US: "8.5", UK: "Q½", EU: "58", JP: "17", dia: 18.53, circ: 58.3 },
  { US: "9", UK: "R½", EU: "59", JP: "18", dia: 18.89, circ: 59.5 },
  { US: "9.5", UK: "S½", EU: "61", JP: "19", dia: 19.41, circ: 60.8 },
  { US: "10", UK: "T½", EU: "62", JP: "20", dia: 19.84, circ: 62.1 },
  { US: "10.5", UK: "U½", EU: "63", JP: "22", dia: 20.20, circ: 63.4 },
  { US: "11", UK: "V½", EU: "65", JP: "23", dia: 20.68, circ: 64.6 },
  { US: "11.5", UK: "W½", EU: "66", JP: "24", dia: 21.08, circ: 65.9 },
  { US: "12", UK: "Y", EU: "67", JP: "25", dia: 21.49, circ: 67.2 },
  { US: "12.5", UK: "Z", EU: "68", JP: "26", dia: 21.89, circ: 68.5 },
  { US: "13", UK: "Z½", EU: "70", JP: "27", dia: 22.33, circ: 69.7 },
];

const SYSTEMS = [
  { key: "US", label: "US / Canada" },
  { key: "UK", label: "UK / Australia" },
  { key: "EU", label: "EU (ISO)" },
  { key: "JP", label: "Japan" },
  { key: "dia", label: "Diameter (mm)" },
  { key: "circ", label: "Circumference (mm)" },
];

export default function RingSizeConverter() {
  const [sys, setSys] = useState("US");
  const [pick, setPick] = useState("7");
  const [measure, setMeasure] = useState("17.3");

  const isMeasure = sys === "dia" || sys === "circ";

  const { row, exact, entered } = useMemo(() => {
    if (isMeasure) {
      const val = parseFloat(measure);
      if (!isFinite(val) || val <= 0) return { row: null, exact: false, entered: null };
      let best = ROWS[0];
      for (const r of ROWS) if (Math.abs(r[sys] - val) < Math.abs(best[sys] - val)) best = r;
      return { row: best, exact: Math.abs(best[sys] - val) < 0.15, entered: val };
    }
    return { row: ROWS.find((r) => r[sys] === pick) || null, exact: true, entered: null };
  }, [sys, pick, measure, isMeasure]);

  const options = isMeasure ? [] : ROWS.map((r) => r[sys]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="rs-sys">I know my size in</label>
          <select id="rs-sys" className="tool-input" value={sys} onChange={(e) => setSys(e.target.value)}>
            {SYSTEMS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="rs-val">{isMeasure ? "Measurement (mm)" : "Size"}</label>
          {isMeasure ? (
            <input id="rs-val" className="tool-input" type="number" step="0.1" min="0" value={measure} onChange={(e) => setMeasure(e.target.value)} placeholder="e.g. 17.3" />
          ) : (
            <select id="rs-val" className="tool-input" value={pick} onChange={(e) => setPick(e.target.value)}>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
        </div>
      </div>

      {row && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">{isMeasure && !exact ? `${entered} mm — closest ring size:` : "Equivalent ring sizes:"}</p>
          <div className="csc-cards">
            <div className={`csc-card ${sys === "US" ? "is-input" : ""}`}><div className="csc-card-country">US/CA</div><div className="csc-card-size">{row.US}</div></div>
            <div className={`csc-card ${sys === "UK" ? "is-input" : ""}`}><div className="csc-card-country">UK/AU</div><div className="csc-card-size">{row.UK}</div></div>
            <div className={`csc-card ${sys === "EU" ? "is-input" : ""}`}><div className="csc-card-country">EU (ISO)</div><div className="csc-card-size">{row.EU}</div></div>
            <div className={`csc-card ${sys === "JP" ? "is-input" : ""}`}><div className="csc-card-country">Japan</div><div className="csc-card-size">{row.JP}</div></div>
            <div className={`csc-card ${sys === "dia" ? "is-input" : ""}`}><div className="csc-card-country">Diameter</div><div className="csc-card-size">{row.dia} mm</div></div>
            <div className={`csc-card ${sys === "circ" ? "is-input" : ""}`}><div className="csc-card-country">Circumf.</div><div className="csc-card-size">{row.circ} mm</div></div>
          </div>
        </div>
      )}

      <div className="csc-table-wrap" style={{ marginTop: 22 }}>
        <table className="csc-table">
          <thead><tr><th>US/CA</th><th>UK/AU</th><th>EU (ISO)</th><th>Japan</th><th>Ø mm</th><th>Circ. mm</th></tr></thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={i} className={row === r ? "is-match" : ""}>
                <td>{r.US}</td><td>{r.UK}</td><td>{r.EU}</td><td>{r.JP}</td><td>{r.dia}</td><td>{r.circ}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tool-note">
        The EU column uses the ISO 8653 standard (size = inner circumference in mm); some French/continental charts number
        rings differently, so match by diameter or circumference when you can. Sizes vary slightly by jeweller — if you're
        between sizes, size up, and measure at the end of the day when fingers are largest. Free, runs in your browser.
      </p>
    </div>
  );
}
