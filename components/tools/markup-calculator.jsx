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

function formatMoney(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return currency.format(n);
}

export default function MarkupCalculator() {
  const [mode, setMode] = useState("markup"); // "markup" = Cost + Markup% -> Sale; "price" = Cost + Sale -> Markup%
  const [cost, setCost] = useState("");
  const [markup, setMarkup] = useState("");
  const [salePrice, setSalePrice] = useState("");

  const results = useMemo(() => {
    const c = toNumber(cost);

    if (mode === "markup") {
      const m = toNumber(markup);
      if (c === null && m === null) return null;
      if (c === null || m === null) return { incomplete: true };

      const profit = c * (m / 100);
      const sale = c + profit;
      const margin = sale === 0 ? null : (profit / sale) * 100;

      return {
        cost: c,
        markup: m,
        sale,
        profit,
        margin,
      };
    }

    // mode === "price"
    const s = toNumber(salePrice);
    if (c === null && s === null) return null;
    if (c === null || s === null) return { incomplete: true };

    const profit = s - c;
    const markupPct = c === 0 ? null : (profit / c) * 100;
    const margin = s === 0 ? null : (profit / s) * 100;

    return {
      cost: c,
      sale: s,
      profit,
      markup: markupPct,
      margin,
    };
  }, [mode, cost, markup, salePrice]);

  const ready = results && !results.incomplete;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="mc-mode">
              What do you want to calculate?
            </label>
            <select
              className="tool-select"
              id="mc-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="markup">Cost + Markup % → Sale price</option>
              <option value="price">Cost + Sale price → Markup %</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="mc-cost">
              Cost
            </label>
            <input
              className="tool-input"
              id="mc-cost"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 40"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>

          {mode === "markup" ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="mc-markup">
                Markup %
              </label>
              <input
                className="tool-input"
                id="mc-markup"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="e.g. 50"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
              />
            </div>
          ) : (
            <div className="tool-field">
              <label className="tool-label" htmlFor="mc-sale">
                Sale price
              </label>
              <input
                className="tool-input"
                id="mc-sale"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="e.g. 60"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
          )}
        </div>

        {ready ? (
          <>
            <div className="tool-result" role="status" aria-live="polite">
              <span className="tool-result-label">
                {mode === "markup" ? "Sale price" : "Markup"}
              </span>
              <span className="tool-result-value">
                {mode === "markup"
                  ? formatMoney(results.sale)
                  : formatPercent(results.markup)}
              </span>
            </div>

            <div className="tool-stat-grid" role="status" aria-live="polite">
              {mode === "markup" ? (
                <div className="tool-stat">
                  <div className="tool-stat-num">{formatMoney(results.sale)}</div>
                  <div className="tool-stat-label">Sale price</div>
                </div>
              ) : (
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {formatPercent(results.markup)}
                  </div>
                  <div className="tool-stat-label">Markup</div>
                </div>
              )}
              <div className="tool-stat">
                <div className="tool-stat-num">{formatMoney(results.profit)}</div>
                <div className="tool-stat-label">Profit</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{formatPercent(results.margin)}</div>
                <div className="tool-stat-label">Margin</div>
              </div>
            </div>
          </>
        ) : (
          <p className="tool-note">
            {mode === "markup"
              ? "Enter a cost and a markup percentage to see the sale price, profit, and margin."
              : "Enter a cost and a sale price to see the markup, profit, and margin."}
          </p>
        )}

        {ready && mode === "price" && results.cost === 0 && (
          <p className="tool-note">
            Markup needs a cost above zero, so it shows a dash here.
          </p>
        )}
        {ready && results.sale === 0 && (
          <p className="tool-note">
            Margin needs a sale price above zero, so it shows a dash here.
          </p>
        )}

        <p className="tool-note">
          Markup is profit as a percentage of cost; margin is profit as a
          percentage of the sale price.
        </p>
      </div>
    </div>
  );
}
