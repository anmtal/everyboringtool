"use client";

import { useState, useMemo } from "react";

export default function MortgageCalculator() {
  const [price, setPrice] = useState("400000");
  const [downPayment, setDownPayment] = useState("80000");
  const [rate, setRate] = useState("6.5");
  const [term, setTerm] = useState("30");

  const results = useMemo(() => {
    const p = parseFloat(price);
    const dp = parseFloat(downPayment);
    const r = parseFloat(rate);
    const t = parseFloat(term);

    if (
      !isFinite(p) ||
      !isFinite(dp) ||
      !isFinite(r) ||
      !isFinite(t) ||
      p <= 0 ||
      t <= 0 ||
      dp < 0 ||
      r < 0 ||
      dp >= p
    ) {
      return null;
    }

    const loan = p - dp;
    const n = t * 12;
    const monthlyRate = r / 100 / 12;

    let monthly;
    if (monthlyRate === 0) {
      monthly = loan / n;
    } else {
      const factor = Math.pow(1 + monthlyRate, n);
      monthly = (loan * monthlyRate * factor) / (factor - 1);
    }

    const totalPaid = monthly * n;
    const totalInterest = totalPaid - loan;

    return { loan, monthly, totalPaid, totalInterest };
  }, [price, downPayment, rate, term]);

  const money = (value) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="mc-price">
              Home price ($)
            </label>
            <input
              className="tool-input"
              id="mc-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="400000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="mc-down">
              Down payment ($)
            </label>
            <input
              className="tool-input"
              id="mc-down"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              placeholder="80000"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="mc-rate">
              Annual interest rate (%)
            </label>
            <input
              className="tool-input"
              id="mc-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="6.5"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="mc-term">
              Loan term (years)
            </label>
            <input
              className="tool-input"
              id="mc-term"
              type="number"
              inputMode="decimal"
              min="1"
              step="1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="30"
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result">
            <p className="tool-result-label">MONTHLY PAYMENT</p>
            <div className="tool-result-value">{money(results.monthly)}</div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.loan)}</div>
              <div className="tool-stat-label">Loan amount</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.totalInterest)}</div>
              <div className="tool-stat-label">Total interest</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.totalPaid)}</div>
              <div className="tool-stat-label">Total paid</div>
            </div>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Enter a home price, down payment, rate, and term to see your monthly
          payment. Down payment must be less than the home price.
        </p>
      )}
    </div>
  );
}
