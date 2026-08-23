"use client";

import { useMemo, useState } from "react";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// Activity multipliers applied to BMR to estimate total daily energy expenditure.
const ACTIVITY_LEVELS = [
  { value: "1.2", label: "Sedentary — little or no exercise" },
  { value: "1.375", label: "Lightly active — 1–3 days/week" },
  { value: "1.55", label: "Moderately active — 3–5 days/week" },
  { value: "1.725", label: "Very active — 6–7 days/week" },
  { value: "1.9", label: "Extra active — hard exercise / physical job" },
];

function formatCalories(n) {
  return Math.round(n).toLocaleString("en-US");
}

export default function CalorieCalculator() {
  const [unit, setUnit] = useState("metric"); // "metric" | "imperial"
  const [sex, setSex] = useState("male"); // "male" | "female"
  const [age, setAge] = useState("");
  const [activity, setActivity] = useState("1.375");

  // Metric inputs
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");

  // Imperial inputs
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLb, setWeightLb] = useState("");

  // Resolve height (cm) and weight (kg) from whichever unit system is active.
  const measures = useMemo(() => {
    if (unit === "metric") {
      const cm = toNumber(heightCm);
      const kg = toNumber(weightKg);
      return { cm, kg };
    }
    const ft = toNumber(heightFt);
    const inch = toNumber(heightIn);
    const lb = toNumber(weightLb);
    let cm = null;
    if (ft !== null || inch !== null) {
      const totalInches = (ft || 0) * 12 + (inch || 0);
      cm = totalInches > 0 ? totalInches * 2.54 : null;
    }
    const kg = lb !== null && lb > 0 ? lb * 0.45359237 : null;
    return { cm, kg };
  }, [unit, heightCm, weightKg, heightFt, heightIn, weightLb]);

  const ageNum = toNumber(age);

  // Validation: collect the first blocking error, but only once the user has
  // started entering the relevant field so the empty state stays quiet.
  const error = useMemo(() => {
    if (ageNum !== null && (ageNum < 1 || ageNum > 120)) {
      return "Enter an age between 1 and 120 years.";
    }
    if (measures.cm !== null && (measures.cm < 50 || measures.cm > 300)) {
      return "Enter a realistic height.";
    }
    if (measures.kg !== null && (measures.kg < 2 || measures.kg > 600)) {
      return "Enter a realistic weight.";
    }
    return null;
  }, [ageNum, measures]);

  const result = useMemo(() => {
    if (error) return null;
    const { cm, kg } = measures;
    if (cm === null || kg === null || ageNum === null) return null;
    if (cm <= 0 || kg <= 0 || ageNum <= 0) return null;

    // Mifflin–St Jeor equation.
    const base = 10 * kg + 6.25 * cm - 5 * ageNum;
    const bmr = sex === "female" ? base - 161 : base + 5;
    if (!Number.isFinite(bmr) || bmr <= 0) return null;

    const multiplier = Number(activity) || 1.2;
    const maintenance = bmr * multiplier;

    return {
      bmr,
      maintenance,
      mildLoss: Math.max(maintenance - 500, 0),
      mildGain: maintenance + 500,
    };
  }, [error, measures, ageNum, sex, activity]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cal-unit">
              Units
            </label>
            <select
              className="tool-select"
              id="cal-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="metric">Metric (cm, kg)</option>
              <option value="imperial">Imperial (ft/in, lb)</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cal-sex">
              Sex
            </label>
            <select
              className="tool-select"
              id="cal-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cal-age">
              Age (years)
            </label>
            <input
              className="tool-input"
              id="cal-age"
              type="number"
              inputMode="numeric"
              min="1"
              max="120"
              placeholder="e.g. 30"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
        </div>

        {unit === "metric" ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="cal-height-cm">
                Height (cm)
              </label>
              <input
                className="tool-input"
                id="cal-height-cm"
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="e.g. 175"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="cal-weight-kg">
                Weight (kg)
              </label>
              <input
                className="tool-input"
                id="cal-weight-kg"
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
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="cal-height-ft">
                Height (ft)
              </label>
              <input
                className="tool-input"
                id="cal-height-ft"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="e.g. 5"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="cal-height-in">
                Height (in)
              </label>
              <input
                className="tool-input"
                id="cal-height-in"
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="e.g. 9"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="cal-weight-lb">
                Weight (lb)
              </label>
              <input
                className="tool-input"
                id="cal-weight-lb"
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="e.g. 154"
                value={weightLb}
                onChange={(e) => setWeightLb(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cal-activity">
              Activity level
            </label>
            <select
              className="tool-select"
              id="cal-activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            >
              {ACTIVITY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}

      <div className="tool-result">
        <p className="tool-result-label">MAINTENANCE CALORIES</p>
        <div className="tool-result-value">
          {result ? `${formatCalories(result.maintenance)} kcal/day` : "—"}
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatCalories(result.bmr)}</div>
              <div className="tool-stat-label">BMR (kcal/day)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatCalories(result.maintenance)}
              </div>
              <div className="tool-stat-label">Maintenance</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatCalories(result.mildLoss)}
              </div>
              <div className="tool-stat-label">Mild weight loss (−500)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatCalories(result.mildGain)}
              </div>
              <div className="tool-stat-label">Mild weight gain (+500)</div>
            </div>
          </div>
          <p className="tool-note">
            BMR is calories burned at rest; maintenance applies your activity
            level. A 500 kcal/day deficit or surplus is roughly 0.45 kg (1 lb)
            per week. Estimates only — consult a professional before big changes.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter your age, sex, height, weight and activity level to estimate your
          daily calorie needs using the Mifflin–St Jeor equation.
        </p>
      )}
    </div>
  );
}
