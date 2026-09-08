"use client";

import { useMemo, useState } from "react";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// Body-fat category thresholds (ACE), keyed by sex. Each entry is the upper
// bound (exclusive) for that label; the final label has no upper bound.
const CATEGORIES = {
  male: [
    { max: 6, label: "Essential fat" },
    { max: 14, label: "Athletes" },
    { max: 18, label: "Fitness" },
    { max: 25, label: "Average" },
    { max: Infinity, label: "Obese" },
  ],
  female: [
    { max: 14, label: "Essential fat" },
    { max: 21, label: "Athletes" },
    { max: 25, label: "Fitness" },
    { max: 32, label: "Average" },
    { max: Infinity, label: "Obese" },
  ],
};

function categorize(sex, bf) {
  const list = CATEGORIES[sex] || CATEGORIES.male;
  for (const c of list) {
    if (bf < c.max) return c.label;
  }
  return list[list.length - 1].label;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

export default function BodyFatCalculator() {
  const [unit, setUnit] = useState("metric"); // "metric" | "imperial"
  const [sex, setSex] = useState("male"); // "male" | "female"

  // Prefilled with a realistic example so the tool shows a result on load.
  const [heightCm, setHeightCm] = useState("178");
  const [neckCm, setNeckCm] = useState("38");
  const [waistCm, setWaistCm] = useState("90");
  const [hipCm, setHipCm] = useState("95");
  const [weightKg, setWeightKg] = useState("80");

  const [heightIn, setHeightIn] = useState("70");
  const [neckIn, setNeckIn] = useState("15");
  const [waistIn, setWaistIn] = useState("35.5");
  const [hipIn, setHipIn] = useState("37.5");
  const [weightLb, setWeightLb] = useState("176");

  // Resolve all measurements to metric (cm / kg) regardless of input unit.
  const m = useMemo(() => {
    if (unit === "metric") {
      return {
        height: toNumber(heightCm),
        neck: toNumber(neckCm),
        waist: toNumber(waistCm),
        hip: toNumber(hipCm),
        weight: toNumber(weightKg),
      };
    }
    const inToCm = (v) => {
      const n = toNumber(v);
      return n === null ? null : n * 2.54;
    };
    const lb = toNumber(weightLb);
    return {
      height: inToCm(heightIn),
      neck: inToCm(neckIn),
      waist: inToCm(waistIn),
      hip: inToCm(hipIn),
      weight: lb === null ? null : lb * 0.45359237,
    };
  }, [
    unit,
    heightCm,
    neckCm,
    waistCm,
    hipCm,
    weightKg,
    heightIn,
    neckIn,
    waistIn,
    hipIn,
    weightLb,
  ]);

  const needHip = sex === "female";

  const error = useMemo(() => {
    const { height, neck, waist, hip } = m;
    if (height !== null && (height < 100 || height > 250)) {
      return "Enter a realistic height.";
    }
    if (neck !== null && (neck < 15 || neck > 80)) {
      return "Enter a realistic neck measurement.";
    }
    if (waist !== null && (waist < 40 || waist > 200)) {
      return "Enter a realistic waist measurement.";
    }
    if (needHip && hip !== null && (hip < 50 || hip > 200)) {
      return "Enter a realistic hip measurement.";
    }
    if (waist !== null && neck !== null) {
      // Log argument must be positive for the Navy formula.
      const arg = needHip ? waist + (m.hip || 0) - neck : waist - neck;
      if (arg <= 0) {
        return needHip
          ? "Waist + hip must be greater than neck."
          : "Waist must be greater than neck.";
      }
    }
    return null;
  }, [m, needHip]);

  const result = useMemo(() => {
    if (error) return null;
    const { height, neck, waist, hip, weight } = m;
    if (height === null || neck === null || waist === null) return null;
    if (needHip && hip === null) return null;
    if (height <= 0) return null;

    // U.S. Navy circumference method (metric, log base 10).
    let bf;
    if (sex === "male") {
      const arg = waist - neck;
      if (arg <= 0) return null;
      bf =
        495 /
          (1.0324 -
            0.19077 * Math.log10(arg) +
            0.15456 * Math.log10(height)) -
        450;
    } else {
      const arg = waist + hip - neck;
      if (arg <= 0) return null;
      bf =
        495 /
          (1.29579 -
            0.35004 * Math.log10(arg) +
            0.221 * Math.log10(height)) -
        450;
    }

    if (!Number.isFinite(bf)) return null;
    // Clamp to a sensible display range.
    bf = Math.min(Math.max(bf, 2), 70);

    const category = categorize(sex, bf);

    let fatMass = null;
    let leanMass = null;
    if (weight !== null && weight > 0) {
      fatMass = (bf / 100) * weight; // kg
      leanMass = weight - fatMass; // kg
    }

    return { bf, category, fatMass, leanMass };
  }, [error, m, sex, needHip]);

  // Format a kg mass back into the display unit.
  const fmtMass = (kg) => {
    if (kg === null) return null;
    if (unit === "imperial") {
      return `${round1(kg / 0.45359237)} lb`;
    }
    return `${round1(kg)} kg`;
  };

  const metricInputs = (
    <>
      <div className="tool-row">
        <div className="tool-field">
          <label className="tool-label" htmlFor="bf-height-cm">
            Height (cm)
          </label>
          <input
            className="tool-input"
            id="bf-height-cm"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="e.g. 178"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
          />
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="bf-neck-cm">
            Neck (cm)
          </label>
          <input
            className="tool-input"
            id="bf-neck-cm"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="e.g. 38"
            value={neckCm}
            onChange={(e) => setNeckCm(e.target.value)}
          />
        </div>
      </div>
      <div className="tool-row">
        <div className="tool-field">
          <label className="tool-label" htmlFor="bf-waist-cm">
            Waist (cm)
          </label>
          <input
            className="tool-input"
            id="bf-waist-cm"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="e.g. 90"
            value={waistCm}
            onChange={(e) => setWaistCm(e.target.value)}
          />
        </div>
        {needHip ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="bf-hip-cm">
              Hip (cm)
            </label>
            <input
              className="tool-input"
              id="bf-hip-cm"
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="e.g. 95"
              value={hipCm}
              onChange={(e) => setHipCm(e.target.value)}
            />
          </div>
        ) : null}
        <div className="tool-field">
          <label className="tool-label" htmlFor="bf-weight-kg">
            Weight (kg) — optional
          </label>
          <input
            className="tool-input"
            id="bf-weight-kg"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="e.g. 80"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>
      </div>
    </>
  );

  const imperialInputs = (
    <>
      <div className="tool-row">
        <div className="tool-field">
          <label className="tool-label" htmlFor="bf-height-in">
            Height (in)
          </label>
          <input
            className="tool-input"
            id="bf-height-in"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="e.g. 70"
            value={heightIn}
            onChange={(e) => setHeightIn(e.target.value)}
          />
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="bf-neck-in">
            Neck (in)
          </label>
          <input
            className="tool-input"
            id="bf-neck-in"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="e.g. 15"
            value={neckIn}
            onChange={(e) => setNeckIn(e.target.value)}
          />
        </div>
      </div>
      <div className="tool-row">
        <div className="tool-field">
          <label className="tool-label" htmlFor="bf-waist-in">
            Waist (in)
          </label>
          <input
            className="tool-input"
            id="bf-waist-in"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="e.g. 35.5"
            value={waistIn}
            onChange={(e) => setWaistIn(e.target.value)}
          />
        </div>
        {needHip ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="bf-hip-in">
              Hip (in)
            </label>
            <input
              className="tool-input"
              id="bf-hip-in"
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="e.g. 37.5"
              value={hipIn}
              onChange={(e) => setHipIn(e.target.value)}
            />
          </div>
        ) : null}
        <div className="tool-field">
          <label className="tool-label" htmlFor="bf-weight-lb">
            Weight (lb) — optional
          </label>
          <input
            className="tool-input"
            id="bf-weight-lb"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="e.g. 176"
            value={weightLb}
            onChange={(e) => setWeightLb(e.target.value)}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bf-unit">
              Units
            </label>
            <select
              className="tool-select"
              id="bf-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="metric">Metric (cm, kg)</option>
              <option value="imperial">Imperial (in, lb)</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="bf-sex">
              Sex
            </label>
            <select
              className="tool-select"
              id="bf-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        {unit === "metric" ? metricInputs : imperialInputs}
      </div>

      {error ? <p className="tool-error">{error}</p> : null}

      <div className="tool-result" role="status" aria-live="polite">
        <p className="tool-result-label">ESTIMATED BODY FAT</p>
        <div className="tool-result-value">
          {result ? `${round1(result.bf)}%` : "—"}
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{result.category}</div>
              <div className="tool-stat-label">Category</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.fatMass !== null ? fmtMass(result.fatMass) : "—"}
              </div>
              <div className="tool-stat-label">Fat mass</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.leanMass !== null ? fmtMass(result.leanMass) : "—"}
              </div>
              <div className="tool-stat-label">Lean mass</div>
            </div>
          </div>
          <p className="tool-note">
            Estimated with the U.S. Navy circumference (tape measure) method.
            Measure your neck below the larynx, your waist at the navel, and (for
            women) your hips at the widest point, all relaxed. Enter weight to
            see fat and lean mass. This is an estimate — for precise results use
            DEXA or hydrostatic weighing. Not medical advice.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter your height, neck and waist{needHip ? " and hip" : ""}{" "}
          measurements to estimate your body fat percentage. Everything is
          calculated privately in your browser.
        </p>
      )}
    </div>
  );
}
