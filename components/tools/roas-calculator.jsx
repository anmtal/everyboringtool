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

export default function RoasCalculator() {
  const [revenue, setRevenue] = useState("4000");
  const [spend, setSpend] = useState("1000");
  const [margin, setMargin] = useState("");

  const result = useMemo(() => {
    const rev = toNumber(revenue);
    const sp = toNumber(spend);
    const mg = toNumber(margin);

    if (rev === null || rev < 0 || sp === null || sp <= 0) return null;

    const roas = rev / sp;
    const acos = (sp / rev) * 100;

    const hasMargin = mg !== null && mg > 0;
    const grossProfit = hasMargin ? rev * (mg / 100) : null;
    const netProfit = hasMargin ? grossProfit - sp : null;
    const breakEvenRoas = hasMargin ? 100 / mg : null;

    return {
      roas,
      acos,
      hasMargin,
      netProfit,
      breakEvenRoas,
      profitable: hasMargin ? netProfit >= 0 : null,
    };
  }, [revenue, spend, margin]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="roas-revenue">
              Revenue from ads ($)
            </label>
            <input
              className="tool-input"
              id="roas-revenue"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              placeholder="4000.00"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="roas-spend">
              Ad spend ($)
            </label>
            <input
              className="tool-input"
              id="roas-spend"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={spend}
              onChange={(e) => setSpend(e.target.value)}
              placeholder="1000.00"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="roas-margin">
              Profit margin (%, optional)
            </label>
            <input
              className="tool-input"
              id="roas-margin"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.1"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              placeholder="e.g. 40"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Return on ad spend (ROAS)</p>
            <div className="tool-result-value">
              {`${new Intl.NumberFormat("en-US", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
              }).format(result.roas)}x`}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{pct(result.acos)}</div>
              <div className="tool-stat-label">ACOS (spend ÷ revenue)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.hasMargin ? usd.format(result.netProfit) : "—"}
              </div>
              <div className="tool-stat-label">Profit after ad spend</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.hasMargin
                  ? `${new Intl.NumberFormat("en-US", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    }).format(result.breakEvenRoas)}x`
                  : "—"}
              </div>
              <div className="tool-stat-label">Break-even ROAS</div>
            </div>
          </div>

          {result.hasMargin && result.profitable === false ? (
            <p className="tool-error">
              These ads are running at a loss — your ROAS is below the break-even
              point for this margin.
            </p>
          ) : null}

          <p className="tool-note">
            ROAS = revenue ÷ ad spend. ACOS = ad spend ÷ revenue. With a profit
            margin, profit = (revenue × margin%) − ad spend, and break-even ROAS =
            1 ÷ margin. Enter your margin to see whether the campaign clears its
            cost.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter revenue and a non-zero ad spend to calculate ROAS and ACOS.
        </p>
      )}
    </div>
  );
}
