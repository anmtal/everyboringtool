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

export default function AmazonMarginCalculator() {
  const [price, setPrice] = useState("25");
  const [cost, setCost] = useState("8");
  const [referral, setReferral] = useState("15");
  const [fba, setFba] = useState("3.50");
  const [other, setOther] = useState("0");

  const result = useMemo(() => {
    const p = toNumber(price);
    const c = toNumber(cost);
    const r = toNumber(referral);
    const f = toNumber(fba);
    const o = toNumber(other);

    if (p === null || p <= 0) return null;

    const referralPct = r === null ? 0 : r;
    const fbaFee = f === null ? 0 : f;
    const otherFee = o === null ? 0 : o;
    const productCost = c === null ? 0 : c;

    const referralFee = p * (referralPct / 100);
    const totalFees = referralFee + fbaFee + otherFee;
    const netProfit = p - productCost - totalFees;

    const margin = (netProfit / p) * 100;
    const roi = productCost > 0 ? (netProfit / productCost) * 100 : null;

    return {
      referralFee,
      totalFees,
      netProfit,
      margin,
      roi,
      profitable: netProfit >= 0,
    };
  }, [price, cost, referral, fba, other]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="amc-price">
              Sale price ($)
            </label>
            <input
              className="tool-input"
              id="amc-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="25.00"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="amc-cost">
              Product cost ($)
            </label>
            <input
              className="tool-input"
              id="amc-cost"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="8.00"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="amc-referral">
              Amazon referral fee (%)
            </label>
            <input
              className="tool-input"
              id="amc-referral"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              placeholder="15"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="amc-fba">
              FBA / fulfilment fee ($)
            </label>
            <input
              className="tool-input"
              id="amc-fba"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={fba}
              onChange={(e) => setFba(e.target.value)}
              placeholder="3.50"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="amc-other">
              Other costs ($)
            </label>
            <input
              className="tool-input"
              id="amc-other"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Net profit per unit</p>
            <div className="tool-result-value">{usd.format(result.netProfit)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{pct(result.margin)}</div>
              <div className="tool-stat-label">Profit margin</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.roi === null ? "—" : pct(result.roi)}
              </div>
              <div className="tool-stat-label">ROI</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.totalFees)}</div>
              <div className="tool-stat-label">Total fees</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.referralFee)}</div>
              <div className="tool-stat-label">Referral fee</div>
            </div>
          </div>

          {!result.profitable ? (
            <p className="tool-error">
              This product sells at a loss with the current numbers.
            </p>
          ) : null}

          <p className="tool-note">
            Margin is profit ÷ sale price. ROI is profit ÷ product cost. Referral
            fees vary by category (commonly 8–15%); check your category rate for
            an exact figure.
          </p>
        </>
      ) : (
        <p className="tool-note">Enter a sale price above to see your margin.</p>
      )}
    </div>
  );
}
