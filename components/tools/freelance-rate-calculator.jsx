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

const num1 = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampPct(value, fallback) {
  const n = toNumber(value);
  if (n === null || n < 0) return fallback;
  if (n > 99) return 99;
  return n;
}

export default function FreelanceRateCalculator() {
  // What you want to actually keep, after taxes.
  const [takeHome, setTakeHome] = useState("70000");
  // Annual business costs: software, hardware, insurance, subscriptions, etc.
  const [expenses, setExpenses] = useState("6000");
  // Combined income + self-employment tax rate you set aside for.
  const [taxRate, setTaxRate] = useState("25");
  // Profit / buffer margin on top, for slow months and reinvestment.
  const [profit, setProfit] = useState("10");

  // Schedule.
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [weeksOff, setWeeksOff] = useState("6"); // vacation + holidays + sick
  // Share of working hours that are actually billable (rest = admin, sales,
  // learning, unpaid revisions). 60-70% is realistic for most solo freelancers.
  const [billablePct, setBillablePct] = useState("65");

  const result = useMemo(() => {
    const wantKeep = toNumber(takeHome);
    const rawExpenses = toNumber(expenses);
    const tax = clampPct(taxRate, 0);
    const margin = clampPct(profit, 0);
    const hrs = toNumber(hoursPerWeek);
    const off = toNumber(weeksOff);
    const billable = clampPct(billablePct, 100);

    const desiredKeep = wantKeep !== null && wantKeep > 0 ? wantKeep : 0;
    const businessExpenses =
      rawExpenses !== null && rawExpenses > 0 ? rawExpenses : 0;

    if (desiredKeep + businessExpenses <= 0) return null;
    if (hrs === null || hrs <= 0) return null;

    const weeksOffSafe = off !== null && off >= 0 && off < 52 ? off : 0;
    const workingWeeks = 52 - weeksOffSafe;
    if (workingWeeks <= 0) return null;

    const billableFraction = billable / 100;
    if (billableFraction <= 0) return null;

    // Gross the take-home up so that after tax you keep what you want.
    // keep = grossProfit * (1 - tax) -> grossProfit = keep / (1 - tax)
    const preTaxIncome = desiredKeep / (1 - tax / 100);

    // Revenue must cover pre-tax income + business expenses.
    const baseRevenue = preTaxIncome + businessExpenses;

    // Add the profit/buffer margin on top of the whole revenue target.
    const targetRevenue = baseRevenue / (1 - margin / 100);

    const totalWorkHours = hrs * workingWeeks;
    const billableHours = totalWorkHours * billableFraction;
    if (billableHours <= 0) return null;

    const hourlyRate = targetRevenue / billableHours;

    return {
      hourlyRate,
      dayRate: hourlyRate * 8,
      weekRate: hourlyRate * hrs * billableFraction,
      targetRevenue,
      preTaxIncome,
      desiredKeep,
      businessExpenses,
      taxSetAside: preTaxIncome - desiredKeep,
      profitBuffer: targetRevenue - baseRevenue,
      totalWorkHours,
      billableHours,
      workingWeeks,
      billablePct: billable,
      taxRate: tax,
      margin,
    };
  }, [takeHome, expenses, taxRate, profit, hoursPerWeek, weeksOff, billablePct]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="frc-takehome">
              Take-home pay you want ($/year)
            </label>
            <input
              className="tool-input"
              id="frc-takehome"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={takeHome}
              onChange={(e) => setTakeHome(e.target.value)}
              placeholder="e.g. 70000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="frc-expenses">
              Annual business expenses ($)
            </label>
            <input
              className="tool-input"
              id="frc-expenses"
              type="number"
              inputMode="decimal"
              min="0"
              step="500"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              placeholder="e.g. 6000"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="frc-tax">
              Tax set-aside (%)
            </label>
            <input
              className="tool-input"
              id="frc-tax"
              type="number"
              inputMode="decimal"
              min="0"
              max="99"
              step="1"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="e.g. 25"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="frc-profit">
              Profit / buffer margin (%)
            </label>
            <input
              className="tool-input"
              id="frc-profit"
              type="number"
              inputMode="decimal"
              min="0"
              max="99"
              step="1"
              value={profit}
              onChange={(e) => setProfit(e.target.value)}
              placeholder="e.g. 10"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="frc-hours">
              Working hours per week
            </label>
            <input
              className="tool-input"
              id="frc-hours"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
              placeholder="e.g. 40"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="frc-off">
              Weeks off per year
            </label>
            <input
              className="tool-input"
              id="frc-off"
              type="number"
              inputMode="decimal"
              min="0"
              max="51"
              step="1"
              value={weeksOff}
              onChange={(e) => setWeeksOff(e.target.value)}
              placeholder="e.g. 6"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="frc-billable">
              Billable hours (% of working time)
            </label>
            <input
              className="tool-input"
              id="frc-billable"
              type="number"
              inputMode="decimal"
              min="1"
              max="99"
              step="5"
              value={billablePct}
              onChange={(e) => setBillablePct(e.target.value)}
              placeholder="e.g. 65"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Rate to charge</p>
            <div className="tool-result-value">
              {usd.format(result.hourlyRate)}
              <span className="tool-result-label"> / hour</span>
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{usd0.format(result.dayRate)}</div>
              <div className="tool-stat-label">Day rate (8 hrs)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd0.format(result.weekRate)}</div>
              <div className="tool-stat-label">Weekly billing</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {num.format(result.billableHours)}
              </div>
              <div className="tool-stat-label">Billable hrs / year</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {usd0.format(result.targetRevenue)}
              </div>
              <div className="tool-stat-label">Revenue target / year</div>
            </div>
          </div>

          <p className="tool-note">
            To keep {usd0.format(result.desiredKeep)} after setting aside{" "}
            {num1.format(result.taxRate)}% for taxes
            ({usd0.format(result.taxSetAside)}), cover{" "}
            {usd0.format(result.businessExpenses)} of expenses, and add a{" "}
            {num1.format(result.margin)}% buffer
            ({usd0.format(result.profitBuffer)}), you need to bring in{" "}
            {usd0.format(result.targetRevenue)} a year. Spread across{" "}
            {num.format(result.billableHours)} billable hours (
            {num.format(result.workingWeeks)} working weeks at{" "}
            {num1.format(result.billablePct)}% billable), that is{" "}
            {usd.format(result.hourlyRate)} per hour. Round up to a clean number
            when you quote clients.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter the take-home pay you want (and optional expenses) plus a
          positive number of working hours, weeks off under 52, and a billable
          percentage to see the freelance rate you should charge.
        </p>
      )}
    </div>
  );
}
