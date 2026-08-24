"use client";

import { useState, useMemo } from "react";

// Canonical decimals (inches). Number gauge = irregular Stubs steel wire gauge;
// letters A–Z fixed; fractions are exact n/64. Values per ASME B94.11M / BS 328.
const NUMS = {
  1: 0.2280, 2: 0.2210, 3: 0.2130, 4: 0.2090, 5: 0.2055, 6: 0.2040, 7: 0.2010, 8: 0.1990, 9: 0.1960, 10: 0.1935,
  11: 0.1910, 12: 0.1890, 13: 0.1850, 14: 0.1820, 15: 0.1800, 16: 0.1770, 17: 0.1730, 18: 0.1695, 19: 0.1660, 20: 0.1610,
  21: 0.1590, 22: 0.1570, 23: 0.1540, 24: 0.1520, 25: 0.1495, 26: 0.1470, 27: 0.1440, 28: 0.1405, 29: 0.1360, 30: 0.1285,
  31: 0.1200, 32: 0.1160, 33: 0.1130, 34: 0.1110, 35: 0.1100, 36: 0.1065, 37: 0.1040, 38: 0.1015, 39: 0.0995, 40: 0.0980,
  41: 0.0960, 42: 0.0935, 43: 0.0890, 44: 0.0860, 45: 0.0820, 46: 0.0810, 47: 0.0785, 48: 0.0760, 49: 0.0730, 50: 0.0700,
  51: 0.0670, 52: 0.0635, 53: 0.0595, 54: 0.0550, 55: 0.0520, 56: 0.0465, 57: 0.0430, 58: 0.0420, 59: 0.0410, 60: 0.0400,
  61: 0.0390, 62: 0.0380, 63: 0.0370, 64: 0.0360, 65: 0.0350, 66: 0.0330, 67: 0.0320, 68: 0.0310, 69: 0.0292, 70: 0.0280,
  71: 0.0260, 72: 0.0250, 73: 0.0240, 74: 0.0225, 75: 0.0210, 76: 0.0200, 77: 0.0180, 78: 0.0160, 79: 0.0145, 80: 0.0135,
};
const LETTERS = {
  A: 0.234, B: 0.238, C: 0.242, D: 0.246, E: 0.250, F: 0.257, G: 0.261, H: 0.266, I: 0.272, J: 0.277, K: 0.281, L: 0.290, M: 0.295,
  N: 0.302, O: 0.316, P: 0.323, Q: 0.332, R: 0.339, S: 0.348, T: 0.358, U: 0.368, V: 0.377, W: 0.386, X: 0.397, Y: 0.404, Z: 0.413,
};

function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function fracLabel(n) { const g = gcd(n, 64); return `${n / g}/${64 / g}`; }

// Merge every standard designation into one sorted table keyed by decimal inch.
const TABLE = (() => {
  const map = new Map();
  const add = (dec, field, val) => {
    const k = dec.toFixed(4);
    if (!map.has(k)) map.set(k, { dec, mm: dec * 25.4 });
    map.get(k)[field] = val;
  };
  for (const [n, d] of Object.entries(NUMS)) add(d, "num", `#${n}`);
  for (const [l, d] of Object.entries(LETTERS)) add(d, "letter", l);
  for (let n = 1; n <= 64; n++) add(n / 64, "frac", fracLabel(n));
  return [...map.values()].sort((a, b) => a.dec - b.dec);
})();

const FRACS = TABLE.filter((r) => r.frac);
const NUM_ROWS = TABLE.filter((r) => r.num);
const LETTER_ROWS = TABLE.filter((r) => r.letter);

// Common tap → recommended drill (curated; imperial + metric coarse).
const TAPS = [
  ["#4-40 UNC", "#43"], ["#6-32 UNC", "#36"], ["#8-32 UNC", "#29"], ["#10-24 UNC", "#25"], ["#10-32 UNF", "#21"],
  ["1/4-20 UNC", "#7"], ["1/4-28 UNF", "#3"], ["5/16-18 UNC", "F"], ["5/16-24 UNF", "I"], ["3/8-16 UNC", "5/16\""],
  ["3/8-24 UNF", "Q"], ["7/16-14 UNC", "U"], ["1/2-13 UNC", "27/64\""], ["1/2-20 UNF", "29/64\""],
  ["M3 × 0.5", "2.5 mm"], ["M4 × 0.7", "3.3 mm"], ["M5 × 0.8", "4.2 mm"], ["M6 × 1.0", "5.0 mm"],
  ["M8 × 1.25", "6.8 mm"], ["M10 × 1.5", "8.5 mm"], ["M12 × 1.75", "10.2 mm"],
];

const SYSTEMS = [
  { key: "frac", label: "Fraction (inch)" },
  { key: "num", label: "Number gauge (#)" },
  { key: "letter", label: "Letter (A–Z)" },
  { key: "mm", label: "Metric (mm)" },
  { key: "inch", label: "Decimal inch" },
];

const fmt = (n, d = 4) => Number(n.toFixed(d)).toString();

export default function DrillBitSizeConverter() {
  const [sys, setSys] = useState("frac");
  const [pick, setPick] = useState("1/4");
  const [measure, setMeasure] = useState("6");

  const isMeasure = sys === "mm" || sys === "inch";
  const options = sys === "frac" ? FRACS.map((r) => r.frac) : sys === "num" ? NUM_ROWS.map((r) => r.num) : sys === "letter" ? LETTER_ROWS.map((r) => r.letter) : [];
  // Coerce a carried-over `pick` to a valid option for the current system.
  const pickSafe = options.includes(pick) ? pick : options[0];

  const { row, exact, entered } = useMemo(() => {
    if (sys === "mm" || sys === "inch") {
      const val = parseFloat(measure);
      if (!isFinite(val) || val <= 0) return { row: null, exact: false, entered: null };
      const dec = sys === "mm" ? val / 25.4 : val;
      let best = TABLE[0];
      for (const r of TABLE) if (Math.abs(r.dec - dec) < Math.abs(best.dec - dec)) best = r;
      return { row: best, exact: Math.abs(best.dec - dec) < 0.0005, entered: { dec, val, unit: sys === "mm" ? "mm" : "in" } };
    }
    const r = TABLE.find((x) => x[sys] === pickSafe) || null;
    return { row: r, exact: true, entered: null };
  }, [sys, pickSafe, measure]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="db-sys">I have a</label>
          <select id="db-sys" className="tool-input" value={sys} onChange={(e) => setSys(e.target.value)}>
            {SYSTEMS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="db-val">{isMeasure ? "Measurement" : "Size"}</label>
          {isMeasure ? (
            <input id="db-val" className="tool-input" type="number" step="0.01" min="0" value={measure} onChange={(e) => setMeasure(e.target.value)} placeholder={sys === "mm" ? "e.g. 6.5" : "e.g. 0.25"} />
          ) : (
            <select id="db-val" className="tool-input" value={pickSafe} onChange={(e) => setPick(e.target.value)}>
              {options.map((o) => <option key={o} value={o}>{o}{sys === "frac" ? "″" : ""}</option>)}
            </select>
          )}
        </div>
      </div>

      {row && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">
            {isMeasure && !exact
              ? `${fmt(entered.val, 3)} ${entered.unit} — nearest standard drill:`
              : "Equivalent drill sizes:"}
          </p>
          <div className="csc-cards">
            <div className="csc-card"><div className="csc-card-country">Fraction</div><div className="csc-card-size">{row.frac ? row.frac + "″" : "—"}</div></div>
            <div className="csc-card"><div className="csc-card-country">Decimal in</div><div className="csc-card-size">{fmt(row.dec, 4)}″</div></div>
            <div className="csc-card"><div className="csc-card-country">Metric</div><div className="csc-card-size">{fmt(row.mm, 2)} mm</div></div>
            <div className="csc-card"><div className="csc-card-country">Number</div><div className="csc-card-size">{row.num || "—"}</div></div>
            <div className="csc-card"><div className="csc-card-country">Letter</div><div className="csc-card-size">{row.letter || "—"}</div></div>
          </div>
        </div>
      )}

      <section className="tool-about" style={{ marginTop: 26 }}>
        <h2 className="tool-h2">Common tap-drill sizes</h2>
        <div className="csc-table-wrap">
          <table className="csc-table">
            <thead><tr><th>Tap</th><th>Drill</th><th>Tap</th><th>Drill</th></tr></thead>
            <tbody>
              {Array.from({ length: Math.ceil(TAPS.length / 2) }, (_, i) => (
                <tr key={i}>
                  <td>{TAPS[i * 2][0]}</td><td>{TAPS[i * 2][1]}</td>
                  <td>{TAPS[i * 2 + 1] ? TAPS[i * 2 + 1][0] : ""}</td><td>{TAPS[i * 2 + 1] ? TAPS[i * 2 + 1][1] : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="tool-note">
        Number gauge (#1–#80) and letter (A–Z) sizes are a North-American convention and don't map exactly to metric — a
        fraction, letter or number bit rarely equals a round millimetre, so for a measurement the tool shows the
        <em> nearest</em> standard drill, not an exact match. Values follow ASME B94.11M / BS 328. Free, runs in your browser.
      </p>
    </div>
  );
}
