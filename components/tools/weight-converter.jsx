"use client";

import { useState, useMemo } from "react";

// Conversion factors: how many grams are in one of each unit.
const TO_GRAMS = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  t: 1000000,
  oz: 28.349523125,
  lb: 453.59237,
  st: 6350.29318,
};

const UNIT_LABELS = {
  mg: "Milligrams (mg)",
  g: "Grams (g)",
  kg: "Kilograms (kg)",
  t: "Metric tons (t)",
  oz: "Ounces (oz)",
  lb: "Pounds (lb)",
  st: "Stone (st)",
};

// Short symbols used in the result sentence.
const UNIT_SYMBOLS = {
  mg: "mg",
  g: "g",
  kg: "kg",
  t: "t",
  oz: "oz",
  lb: "lb",
  st: "st",
};

const UNIT_ORDER = ["mg", "g", "kg", "t", "oz", "lb", "st"];

function formatNumber(n) {
  if (!isFinite(n)) return "-";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 0.0001 || abs >= 1e15)) {
    // Very small or very large: exponential keeps it readable.
    return n.toExponential(4);
  }
  // More decimals for smaller magnitudes.
  let decimals;
  if (abs === 0) decimals = 0;
  else if (abs >= 100) decimals = 2;
  else if (abs >= 1) decimals = 4;
  else decimals = 6;

  const rounded = Number(n.toFixed(decimals));
  const parts = String(rounded).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export default function WeightConverter() {
  const [value, setValue] = useState("1");
  const [fromUnit, setFromUnit] = useState("kg");
  const [toUnit, setToUnit] = useState("lb");

  const parsed = useMemo(() => {
    if (value.trim() === "") return null;
    const n = Number(value);
    if (!isFinite(n)) return null;
    return n;
  }, [value]);

  const grams = useMemo(() => {
    if (parsed === null) return null;
    return parsed * TO_GRAMS[fromUnit];
  }, [parsed, fromUnit]);

  const result = useMemo(() => {
    if (grams === null) return null;
    return grams / TO_GRAMS[toUnit];
  }, [grams, toUnit]);

  const hasResult = result !== null && isFinite(result);

  function swapUnits() {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  }

  const sentence = hasResult
    ? `${formatNumber(parsed)} ${UNIT_SYMBOLS[fromUnit]} = ${formatNumber(result)} ${UNIT_SYMBOLS[toUnit]}`
    : "Enter a number to see the converted weight.";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="weight-value">
              Value
            </label>
            <input
              className="tool-input"
              id="weight-value"
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter a weight"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="weight-from">
              From
            </label>
            <select
              className="tool-select"
              id="weight-from"
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
            >
              {UNIT_ORDER.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="weight-to">
              To
            </label>
            <select
              className="tool-select"
              id="weight-to"
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
            >
              {UNIT_ORDER.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn" onClick={swapUnits}>
          Swap units
        </button>
      </div>

      <div className="tool-result">
        <p className="tool-result-label">RESULT</p>
        <div className="tool-result-value">
          {hasResult
            ? `${formatNumber(result)} ${UNIT_SYMBOLS[toUnit]}`
            : "-"}
        </div>
      </div>

      <p className="tool-note">{sentence}</p>
    </div>
  );
}
