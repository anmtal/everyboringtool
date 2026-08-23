"use client";

import { useMemo, useState } from "react";

// Cap the projection so an unreachable goal never spins forever.
const MAX_MONTHS = 1200; // 100 years

function parseAmount(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : NaN;
}

function formatDuration(months) {
  if (months <= 0) return "0 months";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (rem > 0) parts.push(`${rem} ${rem === 1 ? "month" : "months"}`);
  return parts.join(" ");
}

export default function SavingsGoalCalculator() {
  const [goal, setGoal] = useState("25000");
  const [current, setCurrent] = useState("2000");
  const [monthly, setMonthly] = useState("400");
  const [rate, setRate] = useState("4.5");

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const result = useMemo(() => {
    const goalAmt = parseAmount(goal);
    const startAmt = parseAmount(current);
    const contrib = parseAmount(monthly);
    const annualRate = parseAmount(rate);

    // Require a valid, positive goal to compute anything.
    if (!Number.isFinite(goalAmt) || goalAmt <= 0) {
      return { status: "empty" };
    }

    const start = Number.isFinite(startAmt) && startAmt > 0 ? startAmt : 0;
    const monthlyAdd = Number.isFinite(contrib) && contrib > 0 ? contrib : 0;
    const apr = Number.isFinite(annualRate) && annualRate > 0 ? annualRate : 0;
    const monthlyRate = apr / 100 / 12;

    // Already there.
    if (start >= goalAmt) {
      return {
        status: "reached",
        months: 0,
        finalBalance: start,
        principalAdded: 0,
        totalContributed: start,
        interestEarned: 0,
        goalAmt,
        start,
      };
    }

    // No way to grow toward the goal: no contributions and no interest (or
    // interest with a zero starting balance never compounds up from nothing).
    if (monthlyAdd <= 0 && (monthlyRate <= 0 || start <= 0)) {
      return { status: "never", goalAmt, start, monthlyAdd, monthlyRate };
    }

    // Iterate month by month with end-of-month contributions and monthly
    // compounding until the balance reaches the goal (or we hit the cap).
    let balance = start;
    let months = 0;
    while (balance < goalAmt && months < MAX_MONTHS) {
      balance = balance + balance * monthlyRate + monthlyAdd;
      months += 1;
    }

    if (balance < goalAmt) {
      return {
        status: "never",
        goalAmt,
        start,
        monthlyAdd,
        monthlyRate,
        cappedBalance: balance,
      };
    }

    const principalAdded = monthlyAdd * months;
    const totalContributed = start + principalAdded;
    const interestEarned = balance - totalContributed;

    return {
      status: "ok",
      months,
      finalBalance: balance,
      principalAdded,
      totalContributed,
      interestEarned: interestEarned > 0 ? interestEarned : 0,
      goalAmt,
      start,
    };
  }, [goal, current, monthly, rate]);

  // Projected calendar date for a reachable goal, based on today.
  const targetDate = useMemo(() => {
    if (result.status !== "ok" || result.months <= 0) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + result.months);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [result]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="sg-goal">
            Savings goal ($)
          </label>
          <input
            className="tool-input"
            id="sg-goal"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="25000"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sg-current">
              Current savings ($)
            </label>
            <input
              className="tool-input"
              id="sg-current"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="2000"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="sg-monthly">
              Monthly contribution ($)
            </label>
            <input
              className="tool-input"
              id="sg-monthly"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="400"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="sg-rate">
            Annual interest rate (%)
          </label>
          <input
            className="tool-input"
            id="sg-rate"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="4.5"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </div>

      {result.status === "empty" && (
        <p className="tool-note">
          Enter a savings goal, your current balance, a monthly contribution,
          and an interest rate to see how long it will take to get there.
        </p>
      )}

      {result.status === "reached" && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">TIME TO REACH GOAL</p>
            <div className="tool-result-value">Already reached</div>
          </div>
          <p className="tool-note">
            Your current savings of {currency.format(result.start)} already meet
            or exceed your {currency.format(result.goalAmt)} goal. Nice work.
          </p>
        </>
      )}

      {result.status === "never" && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">TIME TO REACH GOAL</p>
            <div className="tool-result-value">Not reachable</div>
          </div>
          <p className="tool-note">
            {result.monthlyAdd <= 0 && (result.monthlyRate <= 0 || result.start <= 0)
              ? "With no monthly contribution and no interest growth, this balance will never reach the goal. Add a monthly contribution or an interest rate to see a timeline."
              : `Even after ${Math.round(
                  MAX_MONTHS / 12
                )} years this plan does not reach the goal. Try a larger monthly contribution or a higher interest rate.`}
          </p>
        </>
      )}

      {result.status === "ok" && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">TIME TO REACH GOAL</p>
            <div className="tool-result-value">
              {formatDuration(result.months)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{result.months}</div>
              <div className="tool-stat-label">Total months</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.finalBalance)}
              </div>
              <div className="tool-stat-label">Balance at goal</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.totalContributed)}
              </div>
              <div className="tool-stat-label">Total contributed</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.interestEarned)}
              </div>
              <div className="tool-stat-label">Interest earned</div>
            </div>
          </div>

          <p className="tool-note">
            {targetDate
              ? `On track to reach ${currency.format(
                  result.goalAmt
                )} around ${targetDate}. `
              : ""}
            Total contributed is your starting balance plus{" "}
            {currency.format(result.principalAdded)} in monthly deposits.
            Contributions are added at the end of each month with monthly
            compounding. This is an estimate for planning only and does not
            account for taxes, fees, or inflation.
          </p>
        </>
      )}
    </div>
  );
}
