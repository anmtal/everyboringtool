"use client";

import { useMemo, useState } from "react";

// Cap the projection so an unreachable target never spins forever.
const MAX_YEARS = 100;

function parseAmount(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : NaN;
}

export default function FireCalculator() {
  const [age, setAge] = useState("30");
  const [portfolio, setPortfolio] = useState("50000");
  const [income, setIncome] = useState("80000");
  const [expenses, setExpenses] = useState("40000");
  const [ret, setRet] = useState("7");
  const [inflation, setInflation] = useState("3");
  const [withdrawal, setWithdrawal] = useState("4");

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    []
  );

  const pct = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    []
  );

  const result = useMemo(() => {
    const startAge = parseAmount(age);
    const start = parseAmount(portfolio);
    const inc = parseAmount(income);
    const spend = parseAmount(expenses);
    const nominalReturn = parseAmount(ret);
    const infl = parseAmount(inflation);
    const wr = parseAmount(withdrawal);

    // Need valid, positive annual spending and a positive withdrawal rate to
    // define a FIRE number at all.
    if (!Number.isFinite(spend) || spend <= 0) return { status: "empty" };
    if (!Number.isFinite(wr) || wr <= 0) return { status: "empty" };

    const currentPortfolio = Number.isFinite(start) && start > 0 ? start : 0;
    const annualIncome = Number.isFinite(inc) && inc > 0 ? inc : 0;
    const annualReturn = Number.isFinite(nominalReturn) ? nominalReturn / 100 : 0;
    const inflationRate = Number.isFinite(infl) ? infl / 100 : 0;

    // FIRE number in today's dollars: the "4% rule" generalized to any rate.
    const fireNumber = spend / (wr / 100);

    // Annual amount invested (income minus spending). Never negative.
    const annualSavings = Math.max(0, annualIncome - spend);
    const savingsRate = annualIncome > 0 ? annualSavings / annualIncome : 0;

    // Work in real (inflation-adjusted) terms so the whole projection stays in
    // today's dollars and lines up with the FIRE number above.
    const realReturn = (1 + annualReturn) / (1 + inflationRate) - 1;

    // Already financially independent.
    if (currentPortfolio >= fireNumber) {
      return {
        status: "reached",
        fireNumber,
        savingsRate,
        annualSavings,
        currentPortfolio,
        startAge,
        spend,
        realReturn,
      };
    }

    // Nothing to grow the portfolio: no savings and no (or negative) real
    // growth from the existing balance.
    if (annualSavings <= 0 && (realReturn <= 0 || currentPortfolio <= 0)) {
      return {
        status: "never",
        fireNumber,
        savingsRate,
        annualSavings,
        currentPortfolio,
        realReturn,
      };
    }

    // Grow year by year: real growth on the balance plus this year's savings,
    // contributions added at year end.
    let balance = currentPortfolio;
    let years = 0;
    const rows = [];
    while (balance < fireNumber && years < MAX_YEARS) {
      balance = balance * (1 + realReturn) + annualSavings;
      years += 1;
      rows.push({ year: years, balance });
    }

    if (balance < fireNumber) {
      return {
        status: "never",
        fireNumber,
        savingsRate,
        annualSavings,
        currentPortfolio,
        realReturn,
        cappedBalance: balance,
      };
    }

    const contributed = annualSavings * years;
    const growth = balance - currentPortfolio - contributed;
    const fiAge = Number.isFinite(startAge) ? startAge + years : null;

    return {
      status: "ok",
      years,
      balance,
      fireNumber,
      savingsRate,
      annualSavings,
      contributed,
      growth: growth > 0 ? growth : 0,
      currentPortfolio,
      fiAge,
      spend,
      realReturn,
    };
  }, [age, portfolio, income, expenses, ret, inflation, withdrawal]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fire-age">
              Current age
            </label>
            <input
              className="tool-input"
              id="fire-age"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              placeholder="30"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="fire-portfolio">
              Current invested savings ($)
            </label>
            <input
              className="tool-input"
              id="fire-portfolio"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="50000"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fire-income">
              Annual take-home income ($)
            </label>
            <input
              className="tool-input"
              id="fire-income"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="80000"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="fire-expenses">
              Annual expenses ($)
            </label>
            <input
              className="tool-input"
              id="fire-expenses"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="40000"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fire-return">
              Investment return (%/yr)
            </label>
            <input
              className="tool-input"
              id="fire-return"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="7"
              value={ret}
              onChange={(e) => setRet(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="fire-inflation">
              Inflation (%/yr)
            </label>
            <input
              className="tool-input"
              id="fire-inflation"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="3"
              value={inflation}
              onChange={(e) => setInflation(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="fire-withdrawal">
              Withdrawal rate (%)
            </label>
            <input
              className="tool-input"
              id="fire-withdrawal"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="4"
              value={withdrawal}
              onChange={(e) => setWithdrawal(e.target.value)}
            />
          </div>
        </div>
      </div>

      {result.status === "empty" && (
        <p className="tool-note">
          Enter your annual expenses and a withdrawal rate to see your FIRE
          number and how many years it takes to reach financial independence.
        </p>
      )}

      {result.status === "reached" && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">YOU ARE FINANCIALLY INDEPENDENT</p>
            <div className="tool-result-value">0 years to FI</div>
          </div>
          <p className="tool-note">
            Your current portfolio of {currency.format(result.currentPortfolio)}{" "}
            already meets your FIRE number of{" "}
            {currency.format(result.fireNumber)} (annual expenses of{" "}
            {currency.format(result.spend)} at your withdrawal rate). At that
            withdrawal rate your portfolio could cover your spending.
          </p>
        </>
      )}

      {result.status === "never" && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">YEARS TO FINANCIAL INDEPENDENCE</p>
            <div className="tool-result-value">Not reachable</div>
          </div>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.fireNumber)}
              </div>
              <div className="tool-stat-label">FIRE number</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.annualSavings)}
              </div>
              <div className="tool-stat-label">Annual savings</div>
            </div>
          </div>
          <p className="tool-note">
            {result.annualSavings <= 0
              ? "Your expenses are at or above your income, so there is nothing left to invest. Lower expenses or raise income to build a timeline."
              : `Even after ${MAX_YEARS} years this plan does not reach your FIRE number, largely because inflation outpaces your return. Try a higher return, lower inflation, or higher savings.`}
          </p>
        </>
      )}

      {result.status === "ok" && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">YEARS TO FINANCIAL INDEPENDENCE</p>
            <div className="tool-result-value">
              {result.years} {result.years === 1 ? "year" : "years"}
              {result.fiAge !== null ? ` • age ${result.fiAge}` : ""}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.fireNumber)}
              </div>
              <div className="tool-stat-label">FIRE number (today's $)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{pct.format(result.savingsRate)}</div>
              <div className="tool-stat-label">Savings rate</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.annualSavings)}
              </div>
              <div className="tool-stat-label">Invested per year</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.growth)}
              </div>
              <div className="tool-stat-label">Growth earned</div>
            </div>
          </div>

          <p className="tool-note">
            Your FIRE number is your annual expenses divided by your withdrawal
            rate ({currency.format(result.spend)} at {parseFloat(withdrawal)}%).
            The projection uses a real return of{" "}
            {pct.format(result.realReturn)} per year
            (investment return adjusted for inflation), so every figure is in
            today's dollars. Savings are added at the end of each year. This is
            an estimate for planning only, ignores taxes, fees, variable
            returns, and sequence-of-returns risk, and is not financial advice.
          </p>
        </>
      )}
    </div>
  );
}
