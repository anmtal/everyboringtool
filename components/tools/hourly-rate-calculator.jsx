"use client";

import { useState, useMemo } from "react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const num = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function HourlyRateCalculator() {
  const [income, setIncome] = useState("70000");
  const [expenses, setExpenses] = useState("8000");
  const [billableHours, setBillableHours] = useState("25");
  const [weeks, setWeeks] = useState("48");

  const result = useMemo(() => {
    const rawIncome = toNumber(income);
    const rawExpenses = toNumber(expenses);
    const rawHours = toNumber(billableHours);
    const rawWeeks = toNumber(weeks);

    // Income and expenses default to 0 when blank; either alone is enough to
    // start, but we need real positive hours and weeks to avoid dividing by
    // zero (which would produce Infinity/NaN).
    const desiredIncome = rawIncome !== null && rawIncome > 0 ? rawIncome : 0;
    const businessExpenses =
      rawExpenses !== null && rawExpenses > 0 ? rawExpenses : 0;

    const hoursPerWeek = rawHours !== null && rawHours > 0 ? rawHours : 0;
    const weeksPerYear = rawWeeks !== null && rawWeeks > 0 ? rawWeeks : 0;

    // Need something to earn and a schedule to earn it in.
    if (desiredIncome + businessExpenses <= 0) return null;
    if (hoursPerWeek <= 0 || weeksPerYear <= 0) return null;

    const annualBillableHours = hoursPerWeek * weeksPerYear;
    const totalToEarn = desiredIncome + businessExpenses;
    const hourlyRate = totalToEarn / annualBillableHours;

    return {
      hourlyRate,
      dayRate: hourlyRate * 8,
      annualBillableHours,
      totalToEarn,
      desiredIncome,
      businessExpenses,
      hoursPerWeek,
      weeksPerYear,
    };
  }, [income, expenses, billableHours, weeks]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="hrc-income">
              Desired annual take-home income ($)
            </label>
            <input
              className="tool-input"
              id="hrc-income"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="e.g. 70000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="hrc-expenses">
              Annual business expenses ($)
            </label>
            <input
              className="tool-input"
              id="hrc-expenses"
              type="number"
              inputMode="decimal"
              min="0"
              step="500"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              placeholder="e.g. 8000"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="hrc-hours">
              Billable hours per week
            </label>
            <input
              className="tool-input"
              id="hrc-hours"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={billableHours}
              onChange={(e) => setBillableHours(e.target.value)}
              placeholder="e.g. 25"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="hrc-weeks">
              Weeks worked per year
            </label>
            <input
              className="tool-input"
              id="hrc-weeks"
              type="number"
              inputMode="decimal"
              min="0"
              max="52"
              step="1"
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
              placeholder="e.g. 48"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Required hourly rate</p>
            <div className="tool-result-value">
              {usd.format(result.hourlyRate)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {num.format(result.annualBillableHours)}
              </div>
              <div className="tool-stat-label">Annual billable hours</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {usd0.format(result.totalToEarn)}
              </div>
              <div className="tool-stat-label">Total to bill / year</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd0.format(result.dayRate)}</div>
              <div className="tool-stat-label">Day rate (8 hrs)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {num.format(result.hoursPerWeek)}
              </div>
              <div className="tool-stat-label">Billable hrs / week</div>
            </div>
          </div>

          <p className="tool-note">
            To take home {usd0.format(result.desiredIncome)} and cover{" "}
            {usd0.format(result.businessExpenses)} of expenses, you need to bill{" "}
            {usd0.format(result.totalToEarn)} across{" "}
            {num.format(result.annualBillableHours)} billable hours
            ({num.format(result.hoursPerWeek)} hrs/week ×{" "}
            {num.format(result.weeksPerYear)} weeks) — that is{" "}
            {usd.format(result.hourlyRate)} per hour. This is a minimum before
            taxes; add a margin for slow periods.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter your desired income (and optional expenses) plus positive
          billable hours per week and weeks per year to see the hourly rate you
          need to charge.
        </p>
      )}
    </div>
  );
}
