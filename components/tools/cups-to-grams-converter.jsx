"use client";

import { useState, useMemo } from "react";

// Grams per US cup (236.6 mL). Anchored to common baking references
// (King Arthur AP flour = 120 g/cup). Spoon-and-level method assumed.
const INGREDIENTS = [
  { name: "Flour (all-purpose)", g: 120 },
  { name: "Flour (bread)", g: 120 },
  { name: "Flour (cake)", g: 114 },
  { name: "Flour (whole wheat)", g: 120 },
  { name: "Sugar (granulated)", g: 200 },
  { name: "Sugar (caster)", g: 225 },
  { name: "Sugar (brown, packed)", g: 220 },
  { name: "Sugar (powdered/icing)", g: 120 },
  { name: "Butter", g: 227 },
  { name: "Cocoa powder", g: 85 },
  { name: "Cornstarch / cornflour", g: 120 },
  { name: "Rolled oats", g: 90 },
  { name: "Rice (uncooked)", g: 185 },
  { name: "Chocolate chips", g: 170 },
  { name: "Chopped nuts", g: 120 },
  { name: "Desiccated coconut", g: 80 },
  { name: "Honey", g: 340 },
  { name: "Maple syrup", g: 322 },
  { name: "Vegetable oil", g: 218 },
  { name: "Milk", g: 240 },
  { name: "Water", g: 237 },
  { name: "Peanut butter", g: 258 },
  { name: "Table salt", g: 273 },
  { name: "Baking soda", g: 220 },
];

const UNITS = [
  { key: "cups", label: "Cups" },
  { key: "tbsp", label: "Tablespoons" },
  { key: "grams", label: "Grams" },
  { key: "oz", label: "Ounces (weight)" },
];

const OZ = 28.3495;
const fmt = (n) => (n >= 100 ? Math.round(n) : n >= 10 ? Math.round(n * 10) / 10 : Math.round(n * 100) / 100).toString();

export default function CupsToGramsConverter() {
  const [ing, setIng] = useState("Flour (all-purpose)");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("cups");

  const out = useMemo(() => {
    const gPerCup = (INGREDIENTS.find((i) => i.name === ing) || INGREDIENTS[0]).g;
    const val = parseFloat(amount);
    if (!isFinite(val) || val < 0) return null;
    let grams;
    if (unit === "cups") grams = val * gPerCup;
    else if (unit === "tbsp") grams = (val / 16) * gPerCup;
    else if (unit === "grams") grams = val;
    else grams = val * OZ;
    const cups = grams / gPerCup;
    return { cups, tbsp: cups * 16, grams, oz: grams / OZ };
  }, [ing, amount, unit]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ctg-ing">Ingredient</label>
          <select id="ctg-ing" className="tool-input" value={ing} onChange={(e) => setIng(e.target.value)}>
            {INGREDIENTS.map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="ctg-amt">Amount</label>
          <input id="ctg-amt" className="tool-input" type="number" step="0.05" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="ctg-unit">Measured in</label>
          <select id="ctg-unit" className="tool-input" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => <option key={u.key} value={u.key}>{u.label}</option>)}
          </select>
        </div>
      </div>

      {out && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">{amount} {UNITS.find((u) => u.key === unit).label.toLowerCase()} of {ing.toLowerCase()} is</p>
          <div className="csc-cards">
            <div className={`csc-card ${unit === "grams" ? "is-input" : ""}`}><div className="csc-card-country">Grams</div><div className="csc-card-size">{fmt(out.grams)} g</div></div>
            <div className={`csc-card ${unit === "cups" ? "is-input" : ""}`}><div className="csc-card-country">Cups</div><div className="csc-card-size">{fmt(out.cups)}</div></div>
            <div className={`csc-card ${unit === "tbsp" ? "is-input" : ""}`}><div className="csc-card-country">Tbsp</div><div className="csc-card-size">{fmt(out.tbsp)}</div></div>
            <div className={`csc-card ${unit === "oz" ? "is-input" : ""}`}><div className="csc-card-country">Ounces</div><div className="csc-card-size">{fmt(out.oz)} oz</div></div>
          </div>
        </div>
      )}

      <p className="tool-note">
        Cups measure volume and grams measure weight, so the conversion depends entirely on the ingredient — a cup of flour
        is about 120 g but a cup of granulated sugar is 200 g, which is why a generic converter gets baking wrong. Values
        assume US cups and the spoon-and-level method; scooping packs more in (flour up to ~150 g/cup), so a kitchen scale
        is always the most accurate. Free, runs in your browser.
      </p>
    </div>
  );
}
