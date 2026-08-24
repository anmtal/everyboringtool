"use client";

import { useState, useMemo } from "react";

// Dimensions in mm (portrait), per ISO 216 / 269 and US standards.
const GROUPS = {
  "A series": {
    A0: [841, 1189], A1: [594, 841], A2: [420, 594], A3: [297, 420], A4: [210, 297],
    A5: [148, 210], A6: [105, 148], A7: [74, 105], A8: [52, 74], A9: [37, 52], A10: [26, 37],
  },
  "B series": {
    B0: [1000, 1414], B1: [707, 1000], B2: [500, 707], B3: [353, 500], B4: [250, 353],
    B5: [176, 250], B6: [125, 176], B7: [88, 125], B8: [62, 88], B9: [44, 62], B10: [31, 44],
  },
  "C series (envelopes)": {
    C0: [917, 1297], C1: [648, 917], C2: [458, 648], C3: [324, 458], C4: [229, 324],
    C5: [162, 229], C6: [114, 162], C7: [81, 114], C8: [57, 81],
  },
  "US / Imperial": {
    Letter: [216, 279], Legal: [216, 356], "Tabloid / Ledger": [279, 432], Executive: [184, 267],
    "Half Letter": [140, 216], "Junior Legal": [127, 203],
  },
};
const ALL = {};
for (const g of Object.values(GROUPS)) Object.assign(ALL, g);
const NAMES = Object.keys(ALL);

const inch = (mm) => (mm / 25.4).toFixed(2);

export default function PaperSizeConverter() {
  const [size, setSize] = useState("A4");
  const [from, setFrom] = useState("A4");
  const [to, setTo] = useState("Letter");

  const dims = ALL[size];
  const scale = useMemo(() => {
    const s = ALL[from], t = ALL[to];
    if (!s || !t) return null;
    return Math.round(Math.min(t[0] / s[0], t[1] / s[1]) * 100);
  }, [from, to]);

  const groupSelect = (id, val, set) => (
    <select id={id} className="tool-input" value={val} onChange={(e) => set(e.target.value)}>
      {Object.entries(GROUPS).map(([g, sizes]) => (
        <optgroup key={g} label={g}>
          {Object.keys(sizes).map((n) => <option key={n} value={n}>{n}</option>)}
        </optgroup>
      ))}
    </select>
  );

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ps-size">Paper size</label>
          {groupSelect("ps-size", size, setSize)}
        </div>
      </div>

      {dims && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">{size} measures</p>
          <div className="csc-cards">
            <div className="csc-card"><div className="csc-card-country">Millimetres</div><div className="csc-card-size">{dims[0]} × {dims[1]}</div></div>
            <div className="csc-card"><div className="csc-card-country">Centimetres</div><div className="csc-card-size">{(dims[0] / 10).toFixed(1)} × {(dims[1] / 10).toFixed(1)}</div></div>
            <div className="csc-card"><div className="csc-card-country">Inches</div><div className="csc-card-size">{inch(dims[0])} × {inch(dims[1])}</div></div>
          </div>
        </div>
      )}

      <section className="tool-about" style={{ marginTop: 26 }}>
        <h2 className="tool-h2">Print-scaling calculator</h2>
        <div className="tool-fields" style={{ marginTop: 0 }}>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ps-from">I have content sized</label>
            {groupSelect("ps-from", from, setFrom)}
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ps-to">I want to print it on</label>
            {groupSelect("ps-to", to, setTo)}
          </div>
        </div>
        {scale != null && (
          <p className="tool-result-value" style={{ fontSize: 26, fontWeight: 800, marginTop: 12 }}>
            Set your printer scale to {scale}%
          </p>
        )}
        <p className="tool-note" style={{ margin: "6px 0 0" }}>
          Choose "Fit to page" or enter this percentage in the print dialog so nothing is cut off. (For example {from} onto {to}.)
        </p>
      </section>

      <p className="tool-note">
        The ISO A, B and C series each halve at every step, with dimensions rounded down to whole millimetres, and the C
        (envelope) series is the geometric mean of A and B — which is why an A-series letter fits a C-series envelope. A
        generic converter gives you the dimensions but not the print-scaling percentage, which is the number you actually
        need. Free, runs in your browser.
      </p>
    </div>
  );
}
