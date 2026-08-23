"use client";

import { useMemo, useState } from "react";

const FREQUENCIES = [
  { label: "Annually", value: 1 },
  { label: "Semi-annually", value: 2 },
  { label: "Quarterly", value: 4 },
  { label: "Monthly", value: 12 },
  { label: "Daily", value: 365 },
];

export default function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState("10000");
  const [rate, setRate] = useState("7");
  const [years, setYears] = useState("10");
  const [frequency, setFrequency] = useState("12");
  const [contribution, setContribution] = useState("200");

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
    const annualRate = parseFloat(rate);
    const t = parseFloat(years);
    const n = parseInt(frequency, 10);
    // Monthly contribution is optional; treat blank/invalid as 0.
    const rawC = parseFloat(contribution);
    const C = Number.isFinite(rawC) && rawC > 0 ? rawC : 0;

    if (
      !Number.isFinite(P) ||
      !Number.isFinite(annualRate) ||
      !Number.isFinite(t) ||
      !Number.isFinite(n) ||
      n <= 0 ||
      P < 0 ||
      annualRate < 0 ||
      t <= 0
    ) {
      return null;
    }

    // Nothing to grow.
    if (P <= 0 && C <= 0) return null;

    const r = annualRate / 100;

    // Future value of the initial principal, compounded n times per year.
    const fvPrincipal = P * Math.pow(1 + r / n, n * t);

    // Future value of the monthly contributions (ordinary annuity, deposited
    // at the end of each month). Convert the nominal rate to an effective
    // monthly rate so the result stays consistent with the chosen compounding
    // frequency.
    const months = Math.round(t * 12);
    let fvContributions = 0;
    if (C > 0 && months > 0) {
      if (r === 0) {
        fvContributions = C * months;
      } else {
        const effectiveAnnual = Math.pow(1 + r / n, n) - 1;
        const monthlyRate = Math.pow(1 + effectiveAnnual, 1 / 12) - 1;
        if (monthlyRate === 0) {
          fvContributions = C * months;
        } else {
          fvContributions =
            C * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
        }
      }
    }

    const finalBalance = fvPrincipal + fvContributions;
    const totalContributions = P + C * months;
    const totalInterest = finalBalance - totalContributions;

    if (
      !Number.isFinite(finalBalance) ||
      !Number.isFinite(totalContributions) ||
      !Number.isFinite(totalInterest)
    ) {
      return null;
    }

    return { finalBalance, totalContributions, totalInterest };
  }, [principal, rate, years, frequency, contribution]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ci-principal">
            Initial principal ($)
          </label>
          <input
            className="tool-input"
            id="ci-principal"
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
            <label className="tool-label" htmlFor="ci-rate">
              Annual interest rate (%)
            </label>
            <input
              className="tool-input"
              id="ci-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="7"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="ci-years">
              Years
            </label>
            <input
              className="tool-input"
              id="ci-years"
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

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ci-frequency">
              Compounding frequency
            </label>
            <select
              className="tool-select"
              id="ci-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="ci-contribution">
              Monthly contribution ($, optional)
            </label>
            <input
              className="tool-input"
              id="ci-contribution"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="200"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">FINAL BALANCE</p>
            <div className="tool-result-value">
              {currency.format(results.finalBalance)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.totalContributions)}
              </div>
              <div className="tool-stat-label">Total contributions</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.totalInterest)}
              </div>
              <div className="tool-stat-label">Total interest</div>
            </div>
          </div>

          <p className="tool-note">
            Contributions are assumed to be deposited at the end of each month.
            This is an estimate for planning only and does not account for taxes,
            fees, or inflation.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a principal (or a monthly contribution), an interest rate, and a
          number of years to see how your money grows.
        </p>
      )}
    </div>
  );
}
