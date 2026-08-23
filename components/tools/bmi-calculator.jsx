"use client";

import { useState, useMemo } from "react";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// Categorize a BMI value per standard adult ranges.
function categorize(bmi) {
  if (bmi < 18.5) return { label: "Underweight", range: "BMI below 18.5" };
  if (bmi < 25) return { label: "Normal weight", range: "BMI 18.5 – 24.9" };
  if (bmi < 30) return { label: "Overweight", range: "BMI 25 – 29.9" };
  return { label: "Obese", range: "BMI 30 and above" };
}

export default function BmiCalculator() {
  const [unit, setUnit] = useState("metric"); // "metric" | "imperial"

  // Metric inputs
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");

  // Imperial inputs
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLb, setWeightLb] = useState("");

  const bmi = useMemo(() => {
    if (unit === "metric") {
      const cm = toNumber(heightCm);
      const kg = toNumber(weightKg);
      if (cm === null || kg === null) return null;
      if (cm <= 0 || kg <= 0) return null;
      const meters = cm / 100;
      return kg / (meters * meters);
    }

    // Imperial: BMI = 703 * lb / (totalInches^2)
    const ft = toNumber(heightFt);
    const inch = toNumber(heightIn);
    const lb = toNumber(weightLb);
    // Allow either feet or inches to be blank (treated as 0), but need at least one.
    if (lb === null || lb <= 0) return null;
    if (ft === null && inch === null) return null;
    const totalInches = (ft || 0) * 12 + (inch || 0);
    if (totalInches <= 0) return null;
    return (703 * lb) / (totalInches * totalInches);
  }, [unit, heightCm, weightKg, heightFt, heightIn, weightLb]);

  const hasResult = bmi !== null && Number.isFinite(bmi) && bmi > 0;
  const category = hasResult ? categorize(bmi) : null;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bmi-unit">
              Units
            </label>
            <select
              className="tool-select"
              id="bmi-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="metric">Metric (cm, kg)</option>
              <option value="imperial">Imperial (ft/in, lb)</option>
            </select>
          </div>
        </div>

        {unit === "metric" ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="bmi-height-cm">
                Height (cm)
              </label>
              <input
                className="tool-input"
                id="bmi-height-cm"
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="e.g. 175"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="bmi-weight-kg">
                Weight (kg)
              </label>
              <input
                className="tool-input"
                id="bmi-weight-kg"
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="e.g. 70"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="bmi-height-ft">
                  Height (ft)
                </label>
                <input
                  className="tool-input"
                  id="bmi-height-ft"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="e.g. 5"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="bmi-height-in">
                  Height (in)
                </label>
                <input
                  className="tool-input"
                  id="bmi-height-in"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="e.g. 9"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                />
              </div>
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="bmi-weight-lb">
                  Weight (lb)
                </label>
                <input
                  className="tool-input"
                  id="bmi-weight-lb"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="e.g. 154"
                  value={weightLb}
                  onChange={(e) => setWeightLb(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="tool-result">
        <p className="tool-result-label">YOUR BMI</p>
        <div className="tool-result-value">
          {hasResult ? bmi.toFixed(1) : "—"}
        </div>
      </div>

      {hasResult ? (
        <p className="tool-note">
          {`Category: ${category.label} (${category.range}).`}
        </p>
      ) : (
        <p className="tool-note">
          Enter your height and weight to see your BMI and category.
        </p>
      )}
    </div>
  );
}
