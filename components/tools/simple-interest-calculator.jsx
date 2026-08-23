"use client";

import { useMemo, useState } from "react";

export default function SimpleInterestCalculator() {
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("5");
  const [years, setYears] = useState("3");

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

  const results = useMemo(() => {
    const P = parseFloat(principal);
    const r = parseFloat(rate);
    const t = parseFloat(years);

    if (
      !Number.isFinite(P) ||
      !Number.isFinite(r) ||
      !Number.isFinite(t) ||
      P < 0 ||
      r < 0 ||
      t < 0
    ) {
      return null;
    }

    // Simple interest: I = P * r * t / 100
    const interest = (P * r * t) / 100;
    const total = P + interest;

    if (!Number.isFinite(interest) || !Number.isFinite(total)) {
      return null;
    }

    return { principal: P, interest, total };
  }, [principal, rate, years]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="si-principal">
            Principal ($)
          </label>
          <input
            className="tool-input"
            id="si-principal"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="10000"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="si-rate">
              Annual interest rate (%)
            </label>
            <input
              className="tool-input"
              id="si-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="5"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="si-years">
              Time (years)
            </label>
            <input
              className="tool-input"
              id="si-years"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="3"
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result">
            <p className="tool-result-label">TOTAL AMOUNT</p>
            <div className="tool-result-value">
              {currency.format(results.total)}
            </div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.principal)}
              </div>
              <div className="tool-stat-label">Principal</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.interest)}
              </div>
              <div className="tool-stat-label">Interest earned</div>
            </div>
          </div>

          <p className="tool-note">
            Simple interest is calculated as Principal × Rate × Time ÷ 100. It is
            charged only on the original principal, not on accumulated interest.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a principal, an annual interest rate, and a time in years to see
          the interest earned and the total amount.
        </p>
      )}
    </div>
  );
}
