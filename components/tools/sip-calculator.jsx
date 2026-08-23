"use client";

import { useMemo, useState } from "react";

export default function SipCalculator() {
  const [monthly, setMonthly] = useState("500");
  const [rate, setRate] = useState("12");
  const [years, setYears] = useState("10");

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
    const P = parseFloat(monthly);
    const annualRate = parseFloat(rate);
    const t = parseFloat(years);

    if (
      !Number.isFinite(P) ||
      !Number.isFinite(annualRate) ||
      !Number.isFinite(t) ||
      P <= 0 ||
      annualRate < 0 ||
      t <= 0
    ) {
      return null;
    }

    const n = Math.round(t * 12);
    if (n <= 0) return null;

    const invested = P * n;

    // Monthly rate.
    const i = annualRate / 100 / 12;

    // Future value of a series of monthly deposits (deposited at the start of
    // each month). When the rate is 0 the compounding factor collapses to the
    // plain sum of contributions.
    let futureValue;
    if (i === 0) {
      futureValue = invested;
    } else {
      futureValue = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    }

    const returns = futureValue - invested;

    if (
      !Number.isFinite(futureValue) ||
      !Number.isFinite(invested) ||
      !Number.isFinite(returns)
    ) {
      return null;
    }

    return { invested, returns, futureValue };
  }, [monthly, rate, years]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="sip-monthly">
            Monthly investment ($)
          </label>
          <input
            className="tool-input"
            id="sip-monthly"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="500"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sip-rate">
              Expected annual return (%)
            </label>
            <input
              className="tool-input"
              id="sip-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="12"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="sip-years">
              Time period (years)
            </label>
            <input
              className="tool-input"
              id="sip-years"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="10"
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result">
            <p className="tool-result-label">TOTAL VALUE</p>
            <div className="tool-result-value">
              {currency.format(results.futureValue)}
            </div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.invested)}
              </div>
              <div className="tool-stat-label">Invested amount</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.returns)}
              </div>
              <div className="tool-stat-label">Estimated returns</div>
            </div>
          </div>

          <p className="tool-note">
            Assumes a fixed monthly deposit made at the start of each month and a
            constant annual return. This is an estimate for planning only and does
            not account for taxes, fees, or inflation.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a monthly investment, an expected annual return, and the number of
          years to see your projected SIP value.
        </p>
      )}
    </div>
  );
}
