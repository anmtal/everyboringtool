"use client";

import { useState, useMemo } from "react";

const CURRENCIES = [
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "CAD", label: "CAD ($)" },
  { code: "AUD", label: "AUD ($)" },
  { code: "JPY", label: "JPY (¥)" },
  { code: "INR", label: "INR (₹)" },
  { code: "BRL", label: "BRL (R$)" },
  { code: "MXN", label: "MXN ($)" },
  { code: "SGD", label: "SGD ($)" },
];

function money(value, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);
  } catch (e) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  }
}

function pctLabel(value) {
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

export default function PriceAfterFeesCalculator() {
  const [price, setPrice] = useState("100");
  const [feePct, setFeePct] = useState("2.9");
  const [fixedFee, setFixedFee] = useState("0.30");
  const [currency, setCurrency] = useState("USD");

  const result = useMemo(() => {
    const p = toNumber(price);
    const pctRate = toNumber(feePct);
    const fixed = toNumber(fixedFee);

    if (p === null || p < 0) return null;

    const rate = pctRate === null ? 0 : pctRate;
    const flat = fixed === null ? 0 : fixed;

    if (rate < 0 || flat < 0) return null;

    const percentFee = p * (rate / 100);
    const totalFees = percentFee + flat;
    const net = p - totalFees;
    const effectiveRate = p > 0 ? (totalFees / p) * 100 : null;

    return {
      price: p,
      percentFee,
      flat,
      totalFees,
      net,
      effectiveRate,
      rate,
      negative: net < 0,
    };
  }, [price, feePct, fixedFee]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="paf-price">
              Sale price
            </label>
            <input
              className="tool-input"
              id="paf-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="100.00"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="paf-currency">
              Currency
            </label>
            <select
              className="tool-select"
              id="paf-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="paf-fee-pct">
              Percentage fee (%)
            </label>
            <input
              className="tool-input"
              id="paf-fee-pct"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={feePct}
              onChange={(e) => setFeePct(e.target.value)}
              placeholder="2.9"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="paf-fixed-fee">
              Fixed fee
            </label>
            <input
              className="tool-input"
              id="paf-fixed-fee"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={fixedFee}
              onChange={(e) => setFixedFee(e.target.value)}
              placeholder="0.30"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Net payout</p>
            <div className="tool-result-value">
              {money(result.net, currency)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {money(result.totalFees, currency)}
              </div>
              <div className="tool-stat-label">Total fees</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(result.net, currency)}</div>
              <div className="tool-stat-label">Net payout</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {money(result.percentFee, currency)}
              </div>
              <div className="tool-stat-label">
                Percentage fee ({pctLabel(result.rate)})
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {money(result.flat, currency)}
              </div>
              <div className="tool-stat-label">Fixed fee</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.effectiveRate !== null
                  ? pctLabel(result.effectiveRate)
                  : "—"}
              </div>
              <div className="tool-stat-label">Effective fee rate</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {money(result.price, currency)}
              </div>
              <div className="tool-stat-label">Sale price</div>
            </div>
          </div>

          {result.negative ? (
            <p className="tool-error">
              Fees are larger than the sale price, so the net payout is negative.
              Check your percentage and fixed fee.
            </p>
          ) : null}

          <p className="tool-note">
            Fees = sale price × percentage fee + fixed fee. Net payout = sale
            price − fees. This matches how most payment processors charge, such
            as PayPal, Stripe, Square, and similar services (for example, 2.9% +
            $0.30 per transaction). Enter the exact percentage and fixed fee from
            your provider for a precise result.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a sale price, a percentage fee, and a fixed fee to see the total
          fees and your net payout.
        </p>
      )}
    </div>
  );
}
