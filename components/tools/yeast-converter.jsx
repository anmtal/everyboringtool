"use client";

import { useState, useMemo } from "react";

// Weight factors relative to instant = 1. Common ratio: 1 instant = 1.25 active
// dry = 3 fresh/cake (King Arthur / SAF guidance).
const TYPES = [
  { key: "active", label: "Active dry", factor: 1.25 },
  { key: "instant", label: "Instant / rapid-rise", factor: 1 },
  { key: "fresh", label: "Fresh / cake", factor: 3 },
];
const PACKET_G = 7; // one standard sachet of active dry
const fmt = (n) => (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10).toString();

export default function YeastConverter() {
  const [type, setType] = useState("active");
  const [amount, setAmount] = useState("7");
  const [unit, setUnit] = useState("grams");

  const out = useMemo(() => {
    const from = TYPES.find((t) => t.key === type);
    let grams = parseFloat(amount);
    if (!isFinite(grams) || grams < 0) return null;
    if (unit === "packets") grams = grams * PACKET_G;
    return TYPES.map((t) => ({ ...t, grams: grams * (t.factor / from.factor) }));
  }, [type, amount, unit]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ye-amt">Amount</label>
          <input id="ye-amt" className="tool-input" type="number" step="0.5" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="ye-unit">Unit</label>
          <select id="ye-unit" className="tool-input" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="grams">Grams</option>
            <option value="packets">Packets (7 g)</option>
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="ye-type">Type of yeast</label>
          <select id="ye-type" className="tool-input" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {out && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">Equivalent amount of each yeast</p>
          <div className="csc-cards">
            {out.map((t) => (
              <div key={t.key} className={`csc-card ${t.key === type ? "is-input" : ""}`}>
                <div className="csc-card-country">{t.label}</div>
                <div className="csc-card-size">{fmt(t.grams)} g</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="tool-note">
        Ratios used: 1 part instant ≈ 1.25 parts active dry ≈ 3 parts fresh (cake/compressed) yeast, by weight — because
        fresh yeast is mostly water and instant is the most concentrated. A standard sachet is about 7 g of active dry
        (≈ 2¼ teaspoons). Sources differ slightly on these ratios and small amounts affect the rise, so treat results as a
        close guide. Fresh, cake and compressed yeast are the same thing. Free, runs in your browser.
      </p>
    </div>
  );
}
