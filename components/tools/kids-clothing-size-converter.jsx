"use client";

import { useState } from "react";

// US/UK kids sizes are age-based; EU is height in cm. Approximate — brands vary.
const TYPES = {
  baby: {
    label: "Baby (0–24m)",
    cols: ["Age", "EU"],
    rows: [
      { Age: "Newborn", EU: "50–56" },
      { Age: "0–3m", EU: "56–62" },
      { Age: "3–6m", EU: "62–68" },
      { Age: "6–9m", EU: "68–74" },
      { Age: "9–12m", EU: "74–80" },
      { Age: "12–18m", EU: "80–86" },
      { Age: "18–24m", EU: "86–92" },
    ],
  },
  kids: {
    label: "Kids clothing",
    cols: ["US", "UK", "EU", "Age"],
    rows: [
      { US: "2T", UK: "2–3y", EU: "92", Age: "2y" },
      { US: "3T", UK: "3–4y", EU: "98", Age: "3y" },
      { US: "4", UK: "4–5y", EU: "104", Age: "4y" },
      { US: "5", UK: "5–6y", EU: "110", Age: "5y" },
      { US: "6", UK: "6–7y", EU: "116", Age: "6y" },
      { US: "7", UK: "7–8y", EU: "122", Age: "7y" },
      { US: "8", UK: "8–9y", EU: "128", Age: "8y" },
      { US: "10", UK: "9–10y", EU: "140", Age: "9–10y" },
      { US: "12", UK: "11–12y", EU: "152", Age: "11–12y" },
      { US: "14", UK: "12–13y", EU: "164", Age: "13y" },
      { US: "16", UK: "13–14y", EU: "176", Age: "14–15y" },
    ],
  },
  shoes: {
    label: "Kids shoes",
    cols: ["US", "UK", "EU"],
    rows: [
      { US: "5", UK: "4.5", EU: "21" },
      { US: "6", UK: "5.5", EU: "22" },
      { US: "7", UK: "6.5", EU: "24" },
      { US: "8", UK: "7.5", EU: "25" },
      { US: "9", UK: "8.5", EU: "26" },
      { US: "10", UK: "9.5", EU: "27" },
      { US: "11", UK: "10.5", EU: "29" },
      { US: "12", UK: "11.5", EU: "30" },
      { US: "13", UK: "12.5", EU: "32" },
      { US: "1Y", UK: "13.5", EU: "33" },
      { US: "2Y", UK: "1.5", EU: "34" },
      { US: "3Y", UK: "2.5", EU: "35" },
      { US: "4Y", UK: "3.5", EU: "36" },
      { US: "5Y", UK: "4", EU: "37" },
    ],
  },
};

export default function KidsClothingSizeConverter() {
  const [type, setType] = useState("kids");
  const [fromRaw, setFromRaw] = useState("US");
  const [sizeRaw, setSizeRaw] = useState("4");

  const data = TYPES[type];
  const from = data.cols.includes(fromRaw) ? fromRaw : data.cols[0];
  const opts = data.rows.map((r) => r[from]);
  const size = opts.includes(sizeRaw) ? sizeRaw : opts[0];
  const row = data.rows.find((r) => r[from] === size) || null;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <span className="tool-label">Category</span>
          <div className="seg-toggle" role="group" aria-label="Category">
            {Object.entries(TYPES).map(([k, t]) => (
              <button key={k} type="button" className={`seg-btn ${type === k ? "is-active" : ""}`} aria-pressed={type === k} onClick={() => setType(k)}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="kc-from">Size given in</label>
          <select id="kc-from" className="tool-input" value={from} onChange={(e) => setFromRaw(e.target.value)}>
            {data.cols.map((c) => <option key={c} value={c}>{c === "EU" ? "EU (height cm)" : c}</option>)}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="kc-size">Size</label>
          <select id="kc-size" className="tool-input" value={size} onChange={(e) => setSizeRaw(e.target.value)}>
            {opts.map((s, i) => <option key={`${s}-${i}`} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {row && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">{data.label} — {from} {size} converts to</p>
          <div className="csc-cards">
            {data.cols.map((c) => (
              <div key={c} className={`csc-card ${c === from ? "is-input" : ""}`}>
                <div className="csc-card-country">{c === "EU" ? "EU (cm)" : c}</div>
                <div className="csc-card-size">{row[c]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="csc-table-wrap" style={{ marginTop: 22 }}>
        <table className="csc-table">
          <thead><tr>{data.cols.map((c) => <th key={c}>{c === "EU" ? "EU (cm)" : c}</th>)}</tr></thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={i} className={row === r ? "is-match" : ""}>{data.cols.map((c) => <td key={c}>{r[c]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tool-note">
        US and UK children's sizes are based on age — the UK labels clothes as an age range (e.g. "4–5 years"), not a single
        number — while EU sizes are the child's height in centimetres, so the best fit comes from measuring height rather than
        trusting the label. The US "4T" and "4" share a chest/height but 4T is cut roomier for a nappy. Sizes vary a lot between
        brands — always check the retailer's own chart. Free, runs in your browser.
      </p>
    </div>
  );
}
