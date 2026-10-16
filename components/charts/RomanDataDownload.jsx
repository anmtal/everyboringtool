"use client";

import { ROMAN_MAX, toRoman } from "../../lib/roman";
import { trackEvent } from "../../lib/analytics";

// Builds the full 1-3999 dataset in the browser (nothing is fetched) and hands
// it over as a CSV or JSON file.
function rows() {
  const out = [];
  for (let n = 1; n <= ROMAN_MAX; n++) {
    const r = toRoman(n);
    out.push({ number: n, numeral: r, lowercase: r.toLowerCase(), letters: r.length });
  }
  return out;
}

function save(name, type, text) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function RomanDataDownload({ source }) {
  function csv() {
    const lines = ["number,numeral,lowercase,letters", ...rows().map((r) => `${r.number},${r.numeral},${r.lowercase},${r.letters}`)];
    save("roman-numerals-1-3999.csv", "text/csv;charset=utf-8", lines.join("\r\n") + "\r\n");
    trackEvent("chart_download", { chart: "roman-numerals", format: "csv" });
  }
  function json() {
    save("roman-numerals-1-3999.json", "application/json", JSON.stringify({ source, range: [1, ROMAN_MAX], numerals: rows() }, null, 1));
    trackEvent("chart_download", { chart: "roman-numerals", format: "json" });
  }
  return (
    <div className="tool-actions">
      <button type="button" className="btn btn-sm" onClick={csv}>Download CSV (1–3999)</button>
      <button type="button" className="btn btn-sm" onClick={json}>Download JSON (1–3999)</button>
    </div>
  );
}
