"use client";

import { useState, useMemo } from "react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PERIODS = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function SalaryCalculator() {
  const [amount, setAmount] = useState("25");
  const [period, setPeriod] = useState("hourly");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [daysPerWeek, setDaysPerWeek] = useState("5");
  const [weeksPerYear, setWeeksPerYear] = useState("52");

  const result = useMemo(() => {
    const pay = toNumber(amount);
    if (pay === null || pay < 0) return null;

    // Sanitize schedule inputs, clamping to sensible positive ranges so we
    // never divide by zero or produce NaN/Infinity.
    const rawHours = toNumber(hoursPerWeek);
    const rawDays = toNumber(daysPerWeek);
    const rawWeeks = toNumber(weeksPerYear);

    const hours = rawHours === null || rawHours <= 0 ? 40 : rawHours;
    const days = rawDays === null || rawDays <= 0 ? 5 : rawDays;
    const weeks = rawWeeks === null || rawWeeks <= 0 ? 52 : rawWeeks;

    // Step 1: normalize whatever was entered to an annual figure.
    let annual;
    switch (period) {
      case "hourly":
        annual = pay * hours * weeks;
        break;
      case "daily":
        annual = pay * days * weeks;
        break;
      case "weekly":
        annual = pay * weeks;
        break;
      case "monthly":
        annual = pay * 12;
        break;
      case "annual":
      default:
        annual = pay;
        break;
    }

    // Step 2: derive every equivalent from the annual figure.
    const totalHours = hours * weeks;
    const totalDays = days * weeks;

    return {
      hourly: totalHours > 0 ? annual / totalHours : 0,
      daily: totalDays > 0 ? annual / totalDays : 0,
      weekly: annual / weeks,
      monthly: annual / 12,
      annual,
      hours,
      days,
      weeks,
    };
  }, [amount, period, hoursPerWeek, daysPerWeek, weeksPerYear]);

  const periodLabel =
    PERIODS.find((p) => p.value === period)?.label ?? "Annual";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="salary-amount">
              Pay amount ($)
            </label>
            <input
              className="tool-input"
              id="salary-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 25.00"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="salary-period">
              Pay period
            </label>
            <select
              className="tool-select"
              id="salary-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="salary-hours">
              Hours per week
            </label>
            <input
              className="tool-input"
              id="salary-hours"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
              placeholder="40"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="salary-days">
              Days per week
            </label>
            <input
              className="tool-input"
              id="salary-days"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(e.target.value)}
              placeholder="5"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="salary-weeks">
              Weeks per year
            </label>
            <input
              className="tool-input"
              id="salary-weeks"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={weeksPerYear}
              onChange={(e) => setWeeksPerYear(e.target.value)}
              placeholder="52"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result">
            <p className="tool-result-label">Annual salary</p>
            <div className="tool-result-value">{usd.format(result.annual)}</div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.hourly)}</div>
              <div className="tool-stat-label">Hourly</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.daily)}</div>
              <div className="tool-stat-label">Daily</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.weekly)}</div>
              <div className="tool-stat-label">Weekly</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.monthly)}</div>
              <div className="tool-stat-label">Monthly</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.annual)}</div>
              <div className="tool-stat-label">Annual</div>
            </div>
          </div>

          <p className="tool-note">
            Based on {periodLabel.toLowerCase()} pay, {result.hours} hours and{" "}
            {result.days} days per week over {result.weeks} weeks per year.
            Equivalents are gross figures before taxes and deductions.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a non-negative pay amount and choose a pay period to see the
          hourly, weekly, monthly, and annual equivalents.
        </p>
      )}
    </div>
  );
}
