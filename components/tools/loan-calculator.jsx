"use client";

import { useMemo, useState } from "react";

export default function LoanCalculator() {
  const [amount, setAmount] = useState("250000");
  const [rate, setRate] = useState("6.5");
  const [years, setYears] = useState("30");

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
    const principal = parseFloat(amount);
    const annualRate = parseFloat(rate);
    const term = parseFloat(years);

    if (
      !Number.isFinite(principal) ||
      !Number.isFinite(annualRate) ||
      !Number.isFinite(term) ||
      principal <= 0 ||
      term <= 0 ||
      annualRate < 0
    ) {
      return null;
    }

    const months = Math.round(term * 12);
    if (months <= 0) return null;

    const monthlyRate = annualRate / 100 / 12;

    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = principal / months;
    } else {
      monthlyPayment =
        (principal * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -months));
    }

    if (!Number.isFinite(monthlyPayment)) return null;

    const totalPaid = monthlyPayment * months;
    const totalInterest = totalPaid - principal;

    return { monthlyPayment, totalPaid, totalInterest, months };
  }, [amount, rate, years]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="loan-amount">
            Loan amount ($)
          </label>
          <input
            className="tool-input"
            id="loan-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="250000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="loan-rate">
              Annual interest rate (%)
            </label>
            <input
              className="tool-input"
              id="loan-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="6.5"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="loan-term">
              Term (years)
            </label>
            <input
              className="tool-input"
              id="loan-term"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="30"
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result">
            <p className="tool-result-label">MONTHLY PAYMENT</p>
            <div className="tool-result-value">
              {currency.format(results.monthlyPayment)}
            </div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.totalInterest)}
              </div>
              <div className="tool-stat-label">Total interest</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.totalPaid)}
              </div>
              <div className="tool-stat-label">Total paid</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{results.months}</div>
              <div className="tool-stat-label">Payments</div>
            </div>
          </div>

          <p className="tool-note">
            Estimate based on a fixed rate and equal monthly payments. Taxes,
            insurance, and fees are not included.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a loan amount, interest rate, and term to see your monthly
          payment.
        </p>
      )}
    </div>
  );
}
