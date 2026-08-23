"use client";

import { useState, useMemo } from "react";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return currency.format(n);
}

function formatPercent(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const rounded = Number(n.toFixed(2));
  return `${rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function DiscountCalculator() {
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [mode, setMode] = useState("percent"); // "percent" | "amount"

  const result = useMemo(() => {
    const p = toNumber(price);
    const d = toNumber(discount);

    if (p === null && d === null) return null;
    if (p === null || d === null) return { incomplete: true };
    if (p < 0 || d < 0) return { negative: true };

    let saved;
    if (mode === "percent") {
      // Clamp the percentage to 0–100 so you can never save more than the price.
      const clampedPct = Math.min(d, 100);
      saved = p * (clampedPct / 100);
    } else {
      // Fixed amount can't exceed the original price.
      saved = Math.min(d, p);
    }

    const finalPrice = p - saved;
    const savedPct = p === 0 ? null : (saved / p) * 100;

    return {
      price: p,
      saved,
      finalPrice,
      savedPct,
      overDiscount:
        (mode === "percent" && d > 100) || (mode === "amount" && d > p),
    };
  }, [price, discount, mode]);

  const ready = result && !result.incomplete && !result.negative;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="dc-price">
              Original price ($)
            </label>
            <input
              className="tool-input"
              id="dc-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="e.g. 80"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="dc-discount">
              {mode === "percent" ? "Discount (%)" : "Discount amount ($)"}
            </label>
            <input
              className="tool-input"
              id="dc-discount"
              type="number"
              inputMode="decimal"
              min="0"
              step={mode === "percent" ? "0.01" : "0.01"}
              placeholder={mode === "percent" ? "e.g. 25" : "e.g. 15"}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="dc-mode">
              Discount type
            </label>
            <select
              className="tool-select"
              id="dc-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="percent">Percentage off</option>
              <option value="amount">Fixed amount off</option>
            </select>
          </div>
        </div>
      </div>

      {result && result.negative && (
        <p className="tool-error">
          Please enter non-negative numbers for the price and discount.
        </p>
      )}

      {ready ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <span className="tool-result-label">Final price</span>
            <span className="tool-result-value">
              {formatMoney(result.finalPrice)}
            </span>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatMoney(result.saved)}</div>
              <div className="tool-stat-label">You save</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatMoney(result.finalPrice)}
              </div>
              <div className="tool-stat-label">Final price</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatPercent(result.savedPct)}
              </div>
              <div className="tool-stat-label">Percent off</div>
            </div>
          </div>

          {result.overDiscount && (
            <p className="tool-note">
              {mode === "percent"
                ? "A discount over 100% is capped at 100%, so the final price stops at $0.00."
                : "The discount is larger than the price, so it's capped at the price and the final price is $0.00."}
            </p>
          )}

          <p className="tool-note">
            Amount saved = price × discount% (or the fixed amount), and the final
            price is the original price minus what you save.
          </p>
        </>
      ) : (
        !result?.negative && (
          <p className="tool-note">
            Enter an original price and a{" "}
            {mode === "percent" ? "discount percentage" : "discount amount"} to
            see how much you save and the final price.
          </p>
        )
      )}
    </div>
  );
}
