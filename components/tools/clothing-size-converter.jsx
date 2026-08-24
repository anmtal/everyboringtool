"use client";

import { useState } from "react";

// Standard (approximate) size conversions. Real fit varies by brand.
const CATEGORIES = {
  "womens-clothing": {
    label: "Women's clothing",
    countries: ["US", "UK", "EU", "IT", "Intl"],
    rows: [
      { US: "0", UK: "4", EU: "32", IT: "36", Intl: "XXS" },
      { US: "2", UK: "6", EU: "34", IT: "38", Intl: "XS" },
      { US: "4", UK: "8", EU: "36", IT: "40", Intl: "S" },
      { US: "6", UK: "10", EU: "38", IT: "42", Intl: "S" },
      { US: "8", UK: "12", EU: "40", IT: "44", Intl: "M" },
      { US: "10", UK: "14", EU: "42", IT: "46", Intl: "M" },
      { US: "12", UK: "16", EU: "44", IT: "48", Intl: "L" },
      { US: "14", UK: "18", EU: "46", IT: "50", Intl: "L" },
      { US: "16", UK: "20", EU: "48", IT: "52", Intl: "XL" },
      { US: "18", UK: "22", EU: "50", IT: "54", Intl: "XXL" },
    ],
  },
  "mens-clothing": {
    label: "Men's clothing",
    countries: ["US/UK", "EU", "Intl", "Chest (in)"],
    rows: [
      { "US/UK": "34", EU: "44", Intl: "XS", "Chest (in)": "34" },
      { "US/UK": "36", EU: "46", Intl: "S", "Chest (in)": "36" },
      { "US/UK": "38", EU: "48", Intl: "M", "Chest (in)": "38" },
      { "US/UK": "40", EU: "50", Intl: "L", "Chest (in)": "40" },
      { "US/UK": "42", EU: "52", Intl: "XL", "Chest (in)": "42" },
      { "US/UK": "44", EU: "54", Intl: "XXL", "Chest (in)": "44" },
      { "US/UK": "46", EU: "56", Intl: "XXXL", "Chest (in)": "46" },
    ],
  },
  "womens-shoes": {
    label: "Women's shoes",
    countries: ["US", "UK", "EU", "CM"],
    rows: [
      { US: "5", UK: "3", EU: "35.5", CM: "22" },
      { US: "5.5", UK: "3.5", EU: "36", CM: "22.5" },
      { US: "6", UK: "4", EU: "36.5", CM: "23" },
      { US: "6.5", UK: "4.5", EU: "37.5", CM: "23.5" },
      { US: "7", UK: "5", EU: "38", CM: "24" },
      { US: "7.5", UK: "5.5", EU: "38.5", CM: "24.5" },
      { US: "8", UK: "6", EU: "39", CM: "25" },
      { US: "8.5", UK: "6.5", EU: "40", CM: "25.5" },
      { US: "9", UK: "7", EU: "40.5", CM: "26" },
      { US: "9.5", UK: "7.5", EU: "41", CM: "26.5" },
      { US: "10", UK: "8", EU: "42", CM: "27" },
      { US: "11", UK: "9", EU: "43", CM: "28" },
    ],
  },
  "mens-shoes": {
    label: "Men's shoes",
    countries: ["US", "UK", "EU", "CM"],
    rows: [
      { US: "7", UK: "6", EU: "40", CM: "25" },
      { US: "7.5", UK: "6.5", EU: "40.5", CM: "25.5" },
      { US: "8", UK: "7", EU: "41", CM: "26" },
      { US: "8.5", UK: "7.5", EU: "42", CM: "26.5" },
      { US: "9", UK: "8", EU: "42.5", CM: "27" },
      { US: "9.5", UK: "8.5", EU: "43", CM: "27.5" },
      { US: "10", UK: "9", EU: "44", CM: "28" },
      { US: "10.5", UK: "9.5", EU: "44.5", CM: "28.5" },
      { US: "11", UK: "10", EU: "45", CM: "29" },
      { US: "12", UK: "11", EU: "46", CM: "30" },
      { US: "13", UK: "12", EU: "47", CM: "31" },
    ],
  },
};

export default function ClothingSizeConverter() {
  const cats = Object.keys(CATEGORIES);
  const [cat, setCat] = useState("womens-clothing");
  const [fromRaw, setFromRaw] = useState("US");
  const [sizeRaw, setSizeRaw] = useState("4");

  const data = CATEGORIES[cat];
  const from = data.countries.includes(fromRaw) ? fromRaw : data.countries[0];
  const sizeOpts = data.rows.map((r) => r[from]);
  const size = sizeOpts.includes(sizeRaw) ? sizeRaw : sizeOpts[0];
  const row = data.rows.find((r) => r[from] === size) || null;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="csc-cat">What are you converting?</label>
          <select id="csc-cat" className="tool-input" value={cat} onChange={(e) => setCat(e.target.value)}>
            {cats.map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="csc-from">Your size is measured in</label>
          <select id="csc-from" className="tool-input" value={from} onChange={(e) => setFromRaw(e.target.value)}>
            {data.countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="csc-size">Your size</label>
          <select id="csc-size" className="tool-input" value={size} onChange={(e) => setSizeRaw(e.target.value)}>
            {sizeOpts.map((s, i) => <option key={`${s}-${i}`} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {row && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">{data.label} — {from} size {size} converts to</p>
          <div className="csc-cards">
            {data.countries.map((c) => (
              <div key={c} className={`csc-card ${c === from ? "is-input" : ""}`}>
                <div className="csc-card-country">{c}</div>
                <div className="csc-card-size">{row[c]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="csc-table-wrap">
        <table className="csc-table">
          <thead>
            <tr>{data.countries.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={i} className={row && r[from] === size ? "is-match" : ""}>
                {data.countries.map((c) => <td key={c}>{r[c]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tool-note">
        Sizes are approximate and vary between brands — when in doubt, check the retailer's own size guide. CM values for
        shoes are the approximate foot length. Free, no sign-up, and it runs entirely in your browser.
      </p>
    </div>
  );
}
