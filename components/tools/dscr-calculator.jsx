"use client";

import { useState, useMemo } from "react";

export default function DscrCalculator() {
  const [noiMode, setNoiMode] = useState("direct");
  const [noi, setNoi] = useState("90000");
  const [grossIncome, setGrossIncome] = useState("120000");
  const [operatingExpenses, setOperatingExpenses] = useState("30000");

  const [debtMode, setDebtMode] = useState("annual");
  const [annualDebt, setAnnualDebt] = useState("60000");
  const [monthlyDebt, setMonthlyDebt] = useState("5000");

  const [minDscr, setMinDscr] = useState("1.25");

  const results = useMemo(() => {
    // Net Operating Income: entered directly, or income minus operating expenses.
    let income;
    if (noiMode === "direct") {
      income = parseFloat(noi);
    } else {
      const gi = parseFloat(grossIncome);
      const oe = parseFloat(operatingExpenses);
      if (!isFinite(gi) || !isFinite(oe)) return null;
      income = gi - oe;
    }

    // Annual debt service: entered directly, or a monthly payment x 12.
    let debt;
    if (debtMode === "annual") {
      debt = parseFloat(annualDebt);
    } else {
      const m = parseFloat(monthlyDebt);
      if (!isFinite(m)) return null;
      debt = m * 12;
    }

    const min = parseFloat(minDscr);

    if (!isFinite(income) || !isFinite(debt) || debt <= 0) {
      return null;
    }

    const dscr = income / debt;
    const threshold = isFinite(min) && min > 0 ? min : 1.25;
    const clears = dscr >= threshold;

    return { income, debt, dscr, threshold, clears };
  }, [noiMode, noi, grossIncome, operatingExpenses, debtMode, annualDebt, monthlyDebt, minDscr]);

  const money = (value) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="dscr-noi-mode">
              Net operating income (NOI)
            </label>
            <select
              className="tool-select"
              id="dscr-noi-mode"
              value={noiMode}
              onChange={(e) => setNoiMode(e.target.value)}
            >
              <option value="direct">Enter NOI directly</option>
              <option value="components">Calculate from income &amp; expenses</option>
            </select>
          </div>

          {noiMode === "direct" ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="dscr-noi">
                Annual NOI ($)
              </label>
              <input
                className="tool-input"
                id="dscr-noi"
                type="number"
                inputMode="decimal"
                step="1000"
                value={noi}
                onChange={(e) => setNoi(e.target.value)}
                placeholder="90000"
              />
            </div>
          ) : (
            <div className="tool-field">
              <label className="tool-label" htmlFor="dscr-income">
                Gross annual income ($)
              </label>
              <input
                className="tool-input"
                id="dscr-income"
                type="number"
                inputMode="decimal"
                min="0"
                step="1000"
                value={grossIncome}
                onChange={(e) => setGrossIncome(e.target.value)}
                placeholder="120000"
              />
            </div>
          )}
        </div>

        {noiMode === "components" && (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="dscr-expenses">
                Annual operating expenses ($)
              </label>
              <input
                className="tool-input"
                id="dscr-expenses"
                type="number"
                inputMode="decimal"
                min="0"
                step="1000"
                value={operatingExpenses}
                onChange={(e) => setOperatingExpenses(e.target.value)}
                placeholder="30000"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label">Resulting NOI</label>
              <input
                className="tool-input"
                type="text"
                readOnly
                value={results ? money(results.income) : "—"}
                tabIndex={-1}
              />
            </div>
          </div>
        )}

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="dscr-debt-mode">
              Debt service
            </label>
            <select
              className="tool-select"
              id="dscr-debt-mode"
              value={debtMode}
              onChange={(e) => setDebtMode(e.target.value)}
            >
              <option value="annual">Enter annual debt service</option>
              <option value="monthly">Use monthly payment &times; 12</option>
            </select>
          </div>

          {debtMode === "annual" ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="dscr-annual-debt">
                Annual debt service ($)
              </label>
              <input
                className="tool-input"
                id="dscr-annual-debt"
                type="number"
                inputMode="decimal"
                min="0"
                step="1000"
                value={annualDebt}
                onChange={(e) => setAnnualDebt(e.target.value)}
                placeholder="60000"
              />
            </div>
          ) : (
            <div className="tool-field">
              <label className="tool-label" htmlFor="dscr-monthly-debt">
                Monthly loan payment ($)
              </label>
              <input
                className="tool-input"
                id="dscr-monthly-debt"
                type="number"
                inputMode="decimal"
                min="0"
                step="100"
                value={monthlyDebt}
                onChange={(e) => setMonthlyDebt(e.target.value)}
                placeholder="5000"
              />
            </div>
          )}
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="dscr-min">
              Lender minimum DSCR
            </label>
            <input
              className="tool-input"
              id="dscr-min"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.05"
              value={minDscr}
              onChange={(e) => setMinDscr(e.target.value)}
              placeholder="1.25"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label">Annual debt service</label>
            <input
              className="tool-input"
              type="text"
              readOnly
              value={results ? money(results.debt) : "—"}
              tabIndex={-1}
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">DEBT SERVICE COVERAGE RATIO</p>
            <div className="tool-result-value">{results.dscr.toFixed(2)}</div>
            <p className="tool-note" style={{ marginTop: "0.5rem" }}>
              {results.clears
                ? `Clears the ${results.threshold.toFixed(2)} minimum — income covers ${results.dscr.toFixed(
                    2
                  )}× the debt.`
                : `Below the ${results.threshold.toFixed(
                    2
                  )} minimum — most lenders would decline at this ratio.`}
            </p>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{results.dscr.toFixed(2)}</div>
              <div className="tool-stat-label">DSCR</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.income)}</div>
              <div className="tool-stat-label">Net operating income</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.debt)}</div>
              <div className="tool-stat-label">Annual debt service</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{results.clears ? "Pass" : "Below"}</div>
              <div className="tool-stat-label">vs {results.threshold.toFixed(2)} minimum</div>
            </div>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Enter net operating income and an annual debt service greater than zero to
          calculate the ratio. Debt service cannot be zero.
        </p>
      )}

      <p className="tool-note">
        This is an estimate for educational purposes only, not financial or lending
        advice. Actual underwriting varies by lender, property type, and how NOI is
        defined. Everything is calculated in your browser — nothing you enter is
        uploaded.
      </p>
    </div>
  );
}
