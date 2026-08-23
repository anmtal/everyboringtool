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

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

function formatMoney(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return currency.format(n);
}

export default function BreakEvenCalculator() {
  const [fixedCosts, setFixedCosts] = useState("");
  const [price, setPrice] = useState("");
  const [variableCost, setVariableCost] = useState("");

  const results = useMemo(() => {
    const fc = toNumber(fixedCosts);
    const p = toNumber(price);
    const vc = toNumber(variableCost);

    if (fc === null && p === null && vc === null) return null;
    if (fc === null || p === null || vc === null) return { incomplete: true };

    const contribution = p - vc;
    if (contribution <= 0) return { noBreakEven: true, contribution };

    const exactUnits = fc / contribution;
    const units = Math.ceil(exactUnits);
    const revenue = units * p;

    return {
      fixedCosts: fc,
      price: p,
      variableCost: vc,
      contribution,
      exactUnits,
      units,
      revenue,
    };
  }, [fixedCosts, price, variableCost]);

  const ready = results && !results.incomplete && !results.noBreakEven;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bec-fixed">
              Fixed costs
            </label>
            <input
              className="tool-input"
              id="bec-fixed"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 5000"
              value={fixedCosts}
              onChange={(e) => setFixedCosts(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bec-price">
              Price per unit
            </label>
            <input
              className="tool-input"
              id="bec-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 25"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="bec-variable">
              Variable cost per unit
            </label>
            <input
              className="tool-input"
              id="bec-variable"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 10"
              value={variableCost}
              onChange={(e) => setVariableCost(e.target.value)}
            />
          </div>
        </div>

        {ready && (
          <>
            <div className="tool-result">
              <span className="tool-result-label">Break-even point</span>
              <span className="tool-result-value">
                {numberFmt.format(results.units)} units
              </span>
            </div>

            <div className="tool-stat-grid">
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {numberFmt.format(results.units)}
                </div>
                <div className="tool-stat-label">Units to break even</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {formatMoney(results.revenue)}
                </div>
                <div className="tool-stat-label">Break-even revenue</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {formatMoney(results.contribution)}
                </div>
                <div className="tool-stat-label">Contribution margin / unit</div>
              </div>
            </div>

            <p className="tool-note">
              Selling {numberFmt.format(results.units)} units at{" "}
              {formatMoney(results.price)} each brings in{" "}
              {formatMoney(results.revenue)}, which covers your{" "}
              {formatMoney(results.fixedCosts)} in fixed costs plus the variable
              cost of every unit. Units are rounded up to the next whole unit.
            </p>
          </>
        )}

        {results && results.noBreakEven && (
          <p className="tool-error">
            There is no break-even point: the price per unit must be greater than
            the variable cost per unit. Right now each unit sold loses money
            {results.contribution < 0
              ? ` (${formatMoney(results.contribution)} per unit)`
              : results.contribution === 0
              ? " (each unit only breaks even on its own variable cost)"
              : ""}
            , so higher volume never covers the fixed costs.
          </p>
        )}

        {(!results || results.incomplete) && (
          <p className="tool-note">
            Enter your fixed costs, the price per unit, and the variable cost per
            unit to see how many units you need to sell to break even.
          </p>
        )}
      </div>
    </div>
  );
}
