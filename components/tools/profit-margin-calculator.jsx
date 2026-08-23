"use client";

import { useState, useMemo } from "react";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPercent(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const rounded = Number(n.toFixed(2));
  return `${rounded.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

export default function ProfitMarginCalculator() {
  const [cost, setCost] = useState("");
  const [revenue, setRevenue] = useState("");

  const results = useMemo(() => {
    const c = toNumber(cost);
    const r = toNumber(revenue);
    if (c === null && r === null) return null;
    if (c === null || r === null) return { incomplete: true };

    const profit = r - c;
    const margin = r === 0 ? null : (profit / r) * 100;
    const markup = c === 0 ? null : (profit / c) * 100;

    return { profit, margin, markup, cost: c, revenue: r };
  }, [cost, revenue]);

  const ready = results && !results.incomplete;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pmc-cost">
              Cost
            </label>
            <input
              className="tool-input"
              id="pmc-cost"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 40"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pmc-revenue">
              Revenue (selling price)
            </label>
            <input
              className="tool-input"
              id="pmc-revenue"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 100"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
            />
          </div>
        </div>

        {ready ? (
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{currency.format(results.profit)}</div>
              <div className="tool-stat-label">Profit</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatPercent(results.margin)}</div>
              <div className="tool-stat-label">Margin</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatPercent(results.markup)}</div>
              <div className="tool-stat-label">Markup</div>
            </div>
          </div>
        ) : (
          <p className="tool-note">
            Enter a cost and a selling price to see profit, margin, and markup.
          </p>
        )}

        {ready && results.revenue === 0 && (
          <p className="tool-note">
            Margin needs revenue above zero, so it shows a dash here.
          </p>
        )}
        {ready && results.cost === 0 && (
          <p className="tool-note">
            Markup needs a cost above zero, so it shows a dash here.
          </p>
        )}
      </div>
    </div>
  );
}
