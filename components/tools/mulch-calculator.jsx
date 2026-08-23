"use client";

import { useState, useMemo } from "react";

// Length conversion: how many feet in one unit.
const FEET_PER_UNIT = {
  feet: 1,
  meters: 3.280839895,
};

// Area conversion: how many square feet in one square unit.
const SQFT_PER_UNIT = {
  feet: 1,
  meters: 10.763910417,
};

const CUBIC_FEET_PER_YARD = 27;

function parsePositive(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return null;
  return n;
}

function formatNumber(n, decimals) {
  if (!isFinite(n)) return "-";
  const rounded = Number(n.toFixed(decimals));
  const parts = String(rounded).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export default function MulchCalculator() {
  const [mode, setMode] = useState("dimensions"); // "dimensions" | "area"
  const [unit, setUnit] = useState("feet"); // "feet" | "meters"
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [area, setArea] = useState("");
  const [depth, setDepth] = useState("3"); // inches
  const [bagSize, setBagSize] = useState("2"); // cubic feet

  const areaLabel = unit === "meters" ? "m²" : "ft²";

  const result = useMemo(() => {
    // Determine coverage area in square feet.
    let areaSqFt = null;
    if (mode === "area") {
      const a = parsePositive(area);
      if (a === null) return null;
      areaSqFt = a * SQFT_PER_UNIT[unit];
    } else {
      const l = parsePositive(length);
      const w = parsePositive(width);
      if (l === null || w === null) return null;
      const lengthFt = l * FEET_PER_UNIT[unit];
      const widthFt = w * FEET_PER_UNIT[unit];
      areaSqFt = lengthFt * widthFt;
    }

    const depthIn = parsePositive(depth);
    if (depthIn === null) return null;

    if (!isFinite(areaSqFt) || areaSqFt <= 0) return null;

    // Depth is always entered in inches -> convert to feet.
    const depthFt = depthIn / 12;
    const cubicFeet = areaSqFt * depthFt;
    if (!isFinite(cubicFeet) || cubicFeet <= 0) return null;

    const cubicYards = cubicFeet / CUBIC_FEET_PER_YARD;

    const bagCf = parsePositive(bagSize);
    const bags = bagCf ? Math.ceil(cubicFeet / bagCf) : null;

    return {
      areaSqFt,
      cubicFeet,
      cubicYards,
      bags,
      bagCf,
    };
  }, [mode, unit, length, width, area, depth, bagSize]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="mulch-mode">
              Measure by
            </label>
            <select
              className="tool-select"
              id="mulch-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="dimensions">Length &times; Width</option>
              <option value="area">Total area</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="mulch-unit">
              Units
            </label>
            <select
              className="tool-select"
              id="mulch-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="feet">Feet</option>
              <option value="meters">Meters</option>
            </select>
          </div>
        </div>

        {mode === "dimensions" ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="mulch-length">
                Bed length ({unit === "meters" ? "m" : "ft"})
              </label>
              <input
                className="tool-input"
                id="mulch-length"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="e.g. 20"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="mulch-width">
                Bed width ({unit === "meters" ? "m" : "ft"})
              </label>
              <input
                className="tool-input"
                id="mulch-width"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="e.g. 4"
              />
            </div>
          </div>
        ) : (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="mulch-area">
                Total area ({areaLabel})
              </label>
              <input
                className="tool-input"
                id="mulch-area"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. 80"
              />
            </div>
          </div>
        )}

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="mulch-depth">
              Mulch depth (inches)
            </label>
            <input
              className="tool-input"
              id="mulch-depth"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              placeholder="e.g. 3"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="mulch-bag">
              Bag size (cubic feet)
            </label>
            <input
              className="tool-input"
              id="mulch-bag"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={bagSize}
              onChange={(e) => setBagSize(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>
        </div>
      </div>

      <div className="tool-result">
        <p className="tool-result-label">MULCH NEEDED</p>
        <div className="tool-result-value">
          {result ? `${formatNumber(result.cubicYards, 2)} yd³` : "-"}
        </div>
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.cubicYards, 2) : "-"}
          </div>
          <div className="tool-stat-label">Cubic Yards (yd³)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.cubicFeet, 1) : "-"}
          </div>
          <div className="tool-stat-label">Cubic Feet (ft³)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result && result.bags !== null ? formatNumber(result.bags, 0) : "-"}
          </div>
          <div className="tool-stat-label">
            Bags{result && result.bagCf ? ` (${formatNumber(result.bagCf, 1)} ft³)` : ""}
          </div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.areaSqFt, 0) : "-"}
          </div>
          <div className="tool-stat-label">Coverage Area (ft²)</div>
        </div>
      </div>

      <p className="tool-note">
        Enter your bed dimensions (or total area), how deep you want the mulch,
        and the size of the bags you are buying. A depth of 2-3 inches suits most
        beds; 3-4 inches helps suppress weeds. Order about 10% extra to cover
        settling and uneven ground.
      </p>
    </div>
  );
}
