"use client";

import { useMemo, useState } from "react";

let nextId = 1;
function makeRow(shares, price) {
  return { id: nextId++, shares, price };
}

export default function StockAverageCalculator() {
  const [rows, setRows] = useState(() => [
    makeRow("100", "50"),
    makeRow("50", "40"),
  ]);
  const [currentPrice, setCurrentPrice] = useState("55");

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

  const numberFmt = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      }),
    []
  );

  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => setRows((prev) => [...prev, makeRow("", "")]);

  const removeRow = (id) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const reset = () => {
    setRows([makeRow("100", "50"), makeRow("50", "40")]);
    setCurrentPrice("55");
  };

  const results = useMemo(() => {
    let totalShares = 0;
    let totalCost = 0;
    let counted = 0;

    for (const r of rows) {
      const shares = parseFloat(r.shares);
      const price = parseFloat(r.price);
      if (
        !Number.isFinite(shares) ||
        !Number.isFinite(price) ||
        shares <= 0 ||
        price < 0
      ) {
        continue;
      }
      totalShares += shares;
      totalCost += shares * price;
      counted += 1;
    }

    if (counted === 0 || totalShares <= 0) return null;

    const averagePrice = totalCost / totalShares;

    let marketValue = null;
    let gainLoss = null;
    let gainLossPct = null;
    const cp = parseFloat(currentPrice);
    if (Number.isFinite(cp) && cp >= 0) {
      marketValue = cp * totalShares;
      gainLoss = marketValue - totalCost;
      gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
    }

    return {
      totalShares,
      totalCost,
      averagePrice,
      marketValue,
      gainLoss,
      gainLossPct,
    };
  }, [rows, currentPrice]);

  return (
    <div className="tool">
      <div className="tool-fields">
        {rows.map((r, i) => (
          <div className="tool-row" key={r.id}>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`sac-shares-${r.id}`}>
                Buy {i + 1} — shares / units
              </label>
              <input
                className="tool-input"
                id={`sac-shares-${r.id}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="100"
                value={r.shares}
                onChange={(e) => updateRow(r.id, "shares", e.target.value)}
              />
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor={`sac-price-${r.id}`}>
                Buy {i + 1} — price per share ($)
              </label>
              <input
                className="tool-input"
                id={`sac-price-${r.id}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="50"
                value={r.price}
                onChange={(e) => updateRow(r.id, "price", e.target.value)}
              />
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor={`sac-remove-${r.id}`}>
                &nbsp;
              </label>
              <button
                type="button"
                id={`sac-remove-${r.id}`}
                className="btn"
                onClick={() => removeRow(r.id)}
                disabled={rows.length <= 1}
                aria-label={`Remove buy ${i + 1}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="tool-field">
          <label className="tool-label" htmlFor="sac-current">
            Current price per share ($, optional)
          </label>
          <input
            className="tool-input"
            id="sac-current"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="55"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={addRow}>
          Add another buy
        </button>
        <button type="button" className="btn" onClick={reset}>
          Reset
        </button>
      </div>

      {results ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">AVERAGE COST PER SHARE</p>
            <div className="tool-result-value">
              {currency.format(results.averagePrice)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {numberFmt.format(results.totalShares)}
              </div>
              <div className="tool-stat-label">Total shares</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.totalCost)}
              </div>
              <div className="tool-stat-label">Total cost (basis)</div>
            </div>
            {results.marketValue !== null && (
              <>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {currency.format(results.marketValue)}
                  </div>
                  <div className="tool-stat-label">Current value</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {results.gainLoss >= 0 ? "+" : "-"}
                    {currency.format(Math.abs(results.gainLoss))}
                  </div>
                  <div className="tool-stat-label">
                    {results.gainLoss >= 0 ? "Unrealized gain" : "Unrealized loss"} (
                    {results.gainLossPct >= 0 ? "+" : ""}
                    {results.gainLossPct.toFixed(2)}%)
                  </div>
                </div>
              </>
            )}
          </div>

          <p className="tool-note">
            Average cost = total amount invested ÷ total shares. Enter a current
            price to see your position&rsquo;s market value and unrealized gain or
            loss. This does not include brokerage commissions, fees, or taxes, and
            is for informational purposes only, not financial advice.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter the number of shares and price per share for each purchase to get
          your average cost per share. Add a row for every buy at a different
          price.
        </p>
      )}
    </div>
  );
}
