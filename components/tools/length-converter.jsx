"use client";

import { useState, useMemo } from "react";

// Conversion factors: how many meters in one of each unit.
const TO_METERS = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
};

const UNIT_LABELS = {
  mm: "Millimeters (mm)",
  cm: "Centimeters (cm)",
  m: "Meters (m)",
  km: "Kilometers (km)",
  in: "Inches (in)",
  ft: "Feet (ft)",
  yd: "Yards (yd)",
  mi: "Miles (mi)",
};

const UNIT_ORDER = ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"];

function formatNumber(n) {
  if (!isFinite(n)) return "-";
  const abs = Math.abs(n);
  let str;
  if (abs !== 0 && (abs < 0.0001 || abs >= 1e15)) {
    // Very small or very large: use exponential to stay readable.
    str = n.toExponential(4);
    return str;
  }
  // Choose a sensible number of decimals: more for small values.
  let decimals;
  if (abs === 0) decimals = 0;
  else if (abs >= 100) decimals = 2;
  else if (abs >= 1) decimals = 4;
  else decimals = 6;

  const rounded = Number(n.toFixed(decimals));
  // Split into integer/decimal parts and add thousands separators.
  const parts = String(rounded).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export default function LengthConverter() {
  const [value, setValue] = useState("1");
  const [fromUnit, setFromUnit] = useState("m");
  const [toUnit, setToUnit] = useState("ft");

  const parsed = useMemo(() => {
    if (value.trim() === "") return null;
    const n = Number(value);
    if (!isFinite(n)) return null;
    return n;
  }, [value]);

  const result = useMemo(() => {
    if (parsed === null) return null;
    const meters = parsed * TO_METERS[fromUnit];
    return meters / TO_METERS[toUnit];
  }, [parsed, fromUnit, toUnit]);

  const hasResult = result !== null && isFinite(result);

  const sentence = hasResult
    ? `${formatNumber(parsed)} ${fromUnit} = ${formatNumber(result)} ${toUnit}`
    : "Enter a number to see the converted length.";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="length-value">
              Value
            </label>
            <input
              className="tool-input"
              id="length-value"
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter a length"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="length-from">
              From
            </label>
            <select
              className="tool-select"
              id="length-from"
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
            <label className="tool-label" htmlFor="length-to">
              To
            </label>
            <select
              className="tool-select"
              id="length-to"
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

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">RESULT</p>
        <div className="tool-result-value">
          {hasResult ? `${formatNumber(result)} ${toUnit}` : "-"}
        </div>
      </div>

      <p className="tool-note">{sentence}</p>
    </div>
  );
}
