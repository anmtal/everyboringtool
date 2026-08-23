"use client";

import { useState, useMemo } from "react";

// Parse a strictly-positive number from a text input; return null when blank
// or invalid so the UI can stay empty instead of showing NaN.
function parsePositive(value) {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return null;
  return n;
}

// Parse a non-negative number (used for waste %, where 0 is valid).
function parseNonNegative(value) {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!isFinite(n) || n < 0) return null;
  return n;
}

function formatNumber(n, decimals) {
  if (!isFinite(n)) return "-";
  const rounded = Number(n.toFixed(decimals));
  const parts = String(rounded).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export default function FlooringCalculator() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [unit, setUnit] = useState("feet"); // "feet" or "meters"
  const [waste, setWaste] = useState("10");
  const [coverage, setCoverage] = useState("");

  const areaUnit = unit === "feet" ? "ft²" : "m²";

  const result = useMemo(() => {
    const l = parsePositive(length);
    const w = parsePositive(width);
    if (l === null || w === null) return null;

    const wastePct = parseNonNegative(waste);
    if (wastePct === null) return null;

    const area = l * w;
    const areaWithWaste = area * (1 + wastePct / 100);

    // Coverage is optional for the area figures; boxes are only shown when a
    // valid, positive coverage per box has been entered.
    const coveragePerBox = parsePositive(coverage);
    const boxes =
      coveragePerBox !== null
        ? Math.ceil(areaWithWaste / coveragePerBox)
        : null;

    return { area, areaWithWaste, boxes };
  }, [length, width, waste, coverage]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="floor-length">
              Room length
            </label>
            <input
              className="tool-input"
              id="floor-length"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="e.g. 12"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="floor-width">
              Room width
            </label>
            <input
              className="tool-input"
              id="floor-width"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="e.g. 10"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="floor-unit">
              Unit
            </label>
            <select
              className="tool-select"
              id="floor-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="feet">Feet</option>
              <option value="meters">Meters</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="floor-waste">
              Waste allowance (%)
            </label>
            <input
              className="tool-input"
              id="floor-waste"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={waste}
              onChange={(e) => setWaste(e.target.value)}
              placeholder="10"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="floor-coverage">
              Coverage per box ({areaUnit})
            </label>
            <input
              className="tool-input"
              id="floor-coverage"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={coverage}
              onChange={(e) => setCoverage(e.target.value)}
              placeholder={unit === "feet" ? "e.g. 20" : "e.g. 1.86"}
            />
          </div>
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">FLOOR AREA</p>
        <div className="tool-result-value">
          {result ? `${formatNumber(result.area, 2)} ${areaUnit}` : "-"}
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.areaWithWaste, 2) : "-"}
          </div>
          <div className="tool-stat-label">
            Area incl. waste ({areaUnit})
          </div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result && result.boxes !== null
              ? formatNumber(result.boxes, 0)
              : "-"}
          </div>
          <div className="tool-stat-label">Boxes needed</div>
        </div>
      </div>

      {result && result.boxes === null ? (
        <p className="tool-note">
          Enter the coverage per box (the {areaUnit} one box covers, shown on
          the packaging) to calculate how many boxes to buy.
        </p>
      ) : null}

      <p className="tool-note">
        Floor area = length × width. Area including waste adds your waste
        allowance for cuts, offcuts and mistakes (10% is typical; use 15–20% for
        diagonal or herringbone layouts). Boxes needed = area including waste ÷
        coverage per box, rounded up. Keep a spare box for future repairs.
      </p>
    </div>
  );
}
