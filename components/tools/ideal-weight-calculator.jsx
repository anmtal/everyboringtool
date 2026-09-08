"use client";

import { useState, useMemo } from "react";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// The classic ideal-body-weight formulas are all defined in terms of
// inches over 5 feet (60 inches). Each gives a base weight in kg at 5'0"
// plus a per-inch increment. Below 60 inches the formulas are not defined,
// so we extrapolate downward with the same per-inch slope (a common
// convention) and flag it as an estimate.
const FORMULAS = [
  {
    key: "devine",
    name: "Devine (1974)",
    male: { base: 50, perInch: 2.3 },
    female: { base: 45.5, perInch: 2.3 },
  },
  {
    key: "robinson",
    name: "Robinson (1983)",
    male: { base: 52, perInch: 1.9 },
    female: { base: 49, perInch: 1.7 },
  },
  {
    key: "miller",
    name: "Miller (1983)",
    male: { base: 56.2, perInch: 1.41 },
    female: { base: 53.1, perInch: 1.36 },
  },
  {
    key: "hamwi",
    name: "Hamwi (1964)",
    male: { base: 48, perInch: 2.7 },
    female: { base: 45.5, perInch: 2.2 },
  },
];

const KG_PER_LB = 0.45359237;

export default function IdealWeightCalculator() {
  const [unit, setUnit] = useState("imperial"); // "imperial" | "metric"
  const [sex, setSex] = useState("male"); // "male" | "female"

  // Metric input
  const [heightCm, setHeightCm] = useState("178");

  // Imperial input
  const [heightFt, setHeightFt] = useState("5");
  const [heightIn, setHeightIn] = useState("10");

  const totalInches = useMemo(() => {
    if (unit === "metric") {
      const cm = toNumber(heightCm);
      if (cm === null || cm <= 0) return null;
      return cm / 2.54;
    }
    const ft = toNumber(heightFt);
    const inch = toNumber(heightIn);
    if (ft === null && inch === null) return null;
    const inches = (ft || 0) * 12 + (inch || 0);
    if (inches <= 0) return null;
    return inches;
  }, [unit, heightCm, heightFt, heightIn]);

  const results = useMemo(() => {
    if (totalInches === null) return null;
    const inchesOver5ft = totalInches - 60;

    const rows = FORMULAS.map((f) => {
      const params = sex === "female" ? f.female : f.male;
      const kg = params.base + params.perInch * inchesOver5ft;
      return { name: f.name, kg: kg > 0 ? kg : 0 };
    });

    const valid = rows.filter((r) => r.kg > 0);
    const avgKg =
      valid.length > 0
        ? valid.reduce((sum, r) => sum + r.kg, 0) / valid.length
        : 0;

    // Healthy weight range from the normal BMI band (18.5 – 24.9).
    const meters = (totalInches * 2.54) / 100;
    const lowKg = 18.5 * meters * meters;
    const highKg = 24.9 * meters * meters;

    return {
      rows,
      avgKg,
      bmiLowKg: lowKg,
      bmiHighKg: highKg,
      below5ft: totalInches < 60,
    };
  }, [totalInches, sex]);

  const displayWeight = (kg) => {
    if (unit === "metric") return `${kg.toFixed(1)} kg`;
    return `${(kg / KG_PER_LB).toFixed(1)} lb`;
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="iw-unit">
              Units
            </label>
            <select
              className="tool-select"
              id="iw-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="imperial">Imperial (ft/in, lb)</option>
              <option value="metric">Metric (cm, kg)</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="iw-sex">
              Sex
            </label>
            <select
              className="tool-select"
              id="iw-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        {unit === "metric" ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="iw-height-cm">
                Height (cm)
              </label>
              <input
                className="tool-input"
                id="iw-height-cm"
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="e.g. 178"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="iw-height-ft">
                Height (ft)
              </label>
              <input
                className="tool-input"
                id="iw-height-ft"
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="e.g. 5"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="iw-height-in">
                Height (in)
              </label>
              <input
                className="tool-input"
                id="iw-height-in"
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="e.g. 10"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">ESTIMATED IDEAL WEIGHT (AVERAGE)</p>
        <div className="tool-result-value">
          {results && results.avgKg > 0
            ? displayWeight(results.avgKg)
            : "—"}
        </div>
      </div>

      {results && results.avgKg > 0 ? (
        <>
          <div className="tool-stat-grid">
            {results.rows.map((r) => (
              <div className="tool-stat" key={r.name}>
                <div className="tool-stat-num">
                  {r.kg > 0 ? displayWeight(r.kg) : "—"}
                </div>
                <div className="tool-stat-label">{r.name}</div>
              </div>
            ))}
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">HEALTHY RANGE (NORMAL BMI 18.5–24.9)</p>
            <div className="tool-result-value">
              {`${displayWeight(results.bmiLowKg)} – ${displayWeight(
                results.bmiHighKg
              )}`}
            </div>
          </div>

          <p className="tool-note">
            These formulas estimate a single &quot;ideal&quot; figure from height
            and sex alone; they don&apos;t account for age, frame size, muscle
            mass, or body composition. The healthy BMI range is usually the more
            practical target. This is general information, not medical advice.
            {results.below5ft
              ? " Note: your height is under 5 ft, which is below the range these formulas were designed for, so the ideal-weight figures are extrapolated and less reliable."
              : ""}
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter your height to estimate an ideal weight range using the Devine,
          Robinson, Miller, and Hamwi formulas plus the healthy BMI range.
        </p>
      )}
    </div>
  );
}
