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
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const PLANS = {
  basic: { label: "Basic (2.9% + $0.30)", rate: 2.9 },
  shopify: { label: "Shopify (2.7% + $0.30)", rate: 2.7 },
  advanced: { label: "Advanced (2.5% + $0.30)", rate: 2.5 },
};

const FIXED_FEE = 0.3;

export default function ShopifyFeeCalculator() {
  const [price, setPrice] = useState("50");
  const [plan, setPlan] = useState("basic");
  const [cost, setCost] = useState("");

  const result = useMemo(() => {
    const p = toNumber(price);
    if (p === null || p <= 0) return null;

    const rate = PLANS[plan].rate;
    const fee = p * (rate / 100) + FIXED_FEE;
    const payout = p - fee;

    const c = toNumber(cost);
    const hasCost = c !== null && c >= 0;
    const profit = hasCost ? payout - c : null;
    const margin = hasCost && p > 0 ? (profit / p) * 100 : null;

    return {
      rate,
      fee,
      payout,
      hasCost,
      profit,
      margin,
      profitable: profit === null ? true : profit >= 0,
    };
  }, [price, plan, cost]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sfc-price">
              Sale price ($)
            </label>
            <input
              className="tool-input"
              id="sfc-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="50.00"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sfc-plan">
              Shopify plan
            </label>
            <select
              className="tool-select"
              id="sfc-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              {Object.entries(PLANS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sfc-cost">
              Product cost ($, optional)
            </label>
            <input
              className="tool-input"
              id="sfc-cost"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g. 18.00"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result">
            <p className="tool-result-label">Net payout</p>
            <div className="tool-result-value">{usd.format(result.payout)}</div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.fee)}</div>
              <div className="tool-stat-label">Transaction fee</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.hasCost ? usd.format(result.profit) : "—"}
              </div>
              <div className="tool-stat-label">Profit</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.margin === null ? "—" : pct(result.margin)}
              </div>
              <div className="tool-stat-label">Profit margin</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{pct(result.rate)}</div>
              <div className="tool-stat-label">Card rate</div>
            </div>
          </div>

          {result.hasCost && !result.profitable ? (
            <p className="tool-error">
              This sale loses money after fees and product cost.
            </p>
          ) : null}

          <p className="tool-note">
            Fee = sale price × card rate + $0.30 fixed per transaction. Net payout
            = sale price − fee. Rates shown are Shopify Payments online (card-present)
            defaults; third-party gateways add extra fees, and rates vary by
            region and card type.
          </p>
        </>
      ) : (
        <p className="tool-note">Enter a sale price above to see your net payout.</p>
      )}
    </div>
  );
}
