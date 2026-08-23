"use client";

import { useState, useMemo } from "react";

// Conversion factors: how many meters in one of each unit.
const TO_METERS = {
  ft: 0.3048,
  in: 0.0254,
  m: 1,
  cm: 0.01,
};

const UNIT_LABELS = {
  ft: "Feet (ft)",
  in: "Inches (in)",
  m: "Meters (m)",
  cm: "Centimeters (cm)",
};

const UNIT_ORDER = ["ft", "in", "m", "cm"];

// Approximate conversions / estimates.
const CUBIC_YARDS_PER_M3 = 1.30795;
const BAGS_PER_M3 = 85; // A 25 kg bag yields ~0.0116 m3, so ~85-86 bags fill 1 m3.
// (Was 60, which under-ordered by ~30% — enough to leave a pour short.)

function parseDimension(value) {
  if (value.trim() === "") return null;
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

export default function ConcreteCalculator() {
  const [length, setLength] = useState("");
  const [lengthUnit, setLengthUnit] = useState("ft");
  const [width, setWidth] = useState("");
  const [widthUnit, setWidthUnit] = useState("ft");
  const [thickness, setThickness] = useState("");
  const [thicknessUnit, setThicknessUnit] = useState("in");

  const result = useMemo(() => {
    const l = parseDimension(length);
    const w = parseDimension(width);
    const t = parseDimension(thickness);
    if (l === null || w === null || t === null) return null;

    const lengthM = l * TO_METERS[lengthUnit];
    const widthM = w * TO_METERS[widthUnit];
    const thicknessM = t * TO_METERS[thicknessUnit];

    const volumeM3 = lengthM * widthM * thicknessM;
    if (!isFinite(volumeM3) || volumeM3 <= 0) return null;

    return {
      volumeM3,
      cubicYards: volumeM3 * CUBIC_YARDS_PER_M3,
      bags: Math.ceil(volumeM3 * BAGS_PER_M3),
    };
  }, [length, lengthUnit, width, widthUnit, thickness, thicknessUnit]);

  const renderDimensionField = (
    id,
    labelText,
    value,
    setValue,
    unit,
    setUnit,
    placeholder
  ) => (
    <div className="tool-field">
      <label className="tool-label" htmlFor={id}>
        {labelText}
      </label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          className="tool-input"
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1 }}
        />
        <select
          className="tool-select"
          id={`${id}-unit`}
          aria-label={`${labelText} unit`}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          style={{ flex: "0 0 auto", width: "auto" }}
        >
          {UNIT_ORDER.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABELS[u]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          {renderDimensionField(
            "concrete-length",
            "Length",
            length,
            setLength,
            lengthUnit,
            setLengthUnit,
            "e.g. 10"
          )}
        </div>
        <div className="tool-row">
          {renderDimensionField(
            "concrete-width",
            "Width",
            width,
            setWidth,
            widthUnit,
            setWidthUnit,
            "e.g. 10"
          )}
        </div>
        <div className="tool-row">
          {renderDimensionField(
            "concrete-thickness",
            "Thickness / Depth",
            thickness,
            setThickness,
            thicknessUnit,
            setThicknessUnit,
            "e.g. 4"
          )}
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">CONCRETE VOLUME NEEDED</p>
        <div className="tool-result-value">
          {result ? `${formatNumber(result.volumeM3, 3)} m³` : "-"}
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.cubicYards, 3) : "-"}
          </div>
          <div className="tool-stat-label">Cubic Yards (yd³)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.volumeM3, 3) : "-"}
          </div>
          <div className="tool-stat-label">Cubic Meters (m³)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {result ? formatNumber(result.bags, 0) : "-"}
          </div>
          <div className="tool-stat-label">25 kg Bags (approx.)</div>
        </div>
      </div>

      <p className="tool-note">
        Enter length, width, and thickness with their units to estimate concrete
        volume. Bag count assumes roughly 85 x 25 kg bags per cubic meter — check the yield printed on your bags, and add
        5-10% extra to allow for spillage and uneven ground.
      </p>
    </div>
  );
}
