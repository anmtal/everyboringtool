"use client";

import { useState, useMemo } from "react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function pct(value) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function SalesTaxCalculator() {
  const [amount, setAmount] = useState("100");
  const [rate, setRate] = useState("8.25");
  const [mode, setMode] = useState("add");

  const result = useMemo(() => {
    const amt = toNumber(amount);
    const rt = toNumber(rate);

    if (amt === null || amt < 0) return null;
    if (rt === null || rt < 0) return null;

    const rateFraction = rt / 100;

    if (mode === "remove") {
      // Amount is a gross total that already includes tax.
      const net = amt / (1 + rateFraction);
      const tax = amt - net;
      return {
        mode,
        rate: rt,
        primaryLabel: "Net amount (before tax)",
        primaryValue: net,
        tax,
        otherLabel: "Total entered (with tax)",
        otherValue: amt,
      };
    }

    // Add tax to a pre-tax amount.
    const tax = amt * rateFraction;
    const total = amt + tax;
    return {
      mode,
      rate: rt,
      primaryLabel: "Total (with tax)",
      primaryValue: total,
      tax,
      otherLabel: "Amount (before tax)",
      otherValue: amt,
    };
  }, [amount, rate, mode]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="stc-amount">
              {mode === "remove" ? "Total amount (tax included) ($)" : "Amount ($)"}
            </label>
            <input
              className="tool-input"
              id="stc-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100.00"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="stc-rate">
              Tax rate (%)
            </label>
            <input
              className="tool-input"
              id="stc-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 8.25"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="stc-mode">
              Mode
            </label>
            <select
              className="tool-select"
              id="stc-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="add">Add tax to amount</option>
              <option value="remove">Remove tax from total</option>
            </select>
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">{result.primaryLabel}</p>
            <div className="tool-result-value">{usd.format(result.primaryValue)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.tax)}</div>
              <div className="tool-stat-label">Sales tax ({pct(result.rate)})</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.otherValue)}</div>
              <div className="tool-stat-label">{result.otherLabel}</div>
            </div>
          </div>

          <p className="tool-note">
            {result.mode === "remove"
              ? "Remove mode treats the amount as a tax-inclusive total: net = total ÷ (1 + rate), and tax = total − net."
              : "Add mode applies the rate to a pre-tax amount: tax = amount × rate, and total = amount + tax."}
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a non-negative amount and tax rate to see the tax and{" "}
          {mode === "remove" ? "the net amount before tax." : "the total with tax."}
        </p>
      )}
    </div>
  );
}
