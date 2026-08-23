"use client";

import { useMemo, useState } from "react";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toNum(v) {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : 0;
}

function formatPercent(n) {
  const rounded = Math.round(n * 100) / 100;
  return `${rounded.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

let uid = 0;
const newItem = (description = "", qty = "1", price = "") => ({
  id: ++uid,
  description,
  qty,
  price,
});

export default function QuoteCalculator() {
  const [items, setItems] = useState([
    newItem("Design work (hours)", "10", "75"),
    newItem("Project setup", "1", "250"),
  ]);
  const [discountType, setDiscountType] = useState("percent"); // "percent" | "fixed"
  const [discountValue, setDiscountValue] = useState("10");
  const [taxRate, setTaxRate] = useState("8.5");

  const totals = useMemo(() => {
    const lineAmounts = items.map((it) => toNum(it.qty) * toNum(it.price));
    const subtotal = lineAmounts.reduce((s, a) => s + a, 0);

    const dVal = Math.max(0, toNum(discountValue));
    let discount;
    if (discountType === "percent") {
      const pct = Math.min(dVal, 100); // never discount more than 100%
      discount = subtotal * (pct / 100);
    } else {
      discount = Math.min(dVal, subtotal); // never discount below zero
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const rate = Math.max(0, toNum(taxRate));
    const tax = discountedSubtotal * (rate / 100);
    const total = discountedSubtotal + tax;

    return {
      lineAmounts,
      subtotal,
      discount,
      discountedSubtotal,
      rate,
      tax,
      total,
    };
  }, [items, discountType, discountValue, taxRate]);

  function updateItem(id, field, value) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }
  function removeItem(id) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  const hasDiscount = totals.discount > 0;

  return (
    <div className="tool">
      {/* Line items */}
      <div className="tool-label" style={{ marginBottom: 8 }}>
        Line items
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it, idx) => (
          <div
            key={it.id}
            className="lineitem-row"
          >
            <input
              className="tool-input"
              type="text"
              aria-label={`Item ${idx + 1} description`}
              placeholder="Description"
              value={it.description}
              onChange={(e) => updateItem(it.id, "description", e.target.value)}
            />
            <input
              className="tool-input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              aria-label={`Item ${idx + 1} quantity`}
              placeholder="Qty"
              value={it.qty}
              onChange={(e) => updateItem(it.id, "qty", e.target.value)}
            />
            <input
              className="tool-input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              aria-label={`Item ${idx + 1} unit price`}
              placeholder="Unit price"
              value={it.price}
              onChange={(e) => updateItem(it.id, "price", e.target.value)}
            />
            <div
              aria-label={`Item ${idx + 1} amount`}
              style={{
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
                fontSize: 14,
              }}
            >
              {money.format(totals.lineAmounts[idx] || 0)}
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => removeItem(it.id)}
              disabled={items.length <= 1}
              aria-label={`Remove item ${idx + 1}`}
              title="Remove line"
              style={{ padding: "8px 0", minWidth: 36 }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="tool-actions" style={{ marginTop: 10 }}>
        <button type="button" className="btn" onClick={addItem}>
          + Add line item
        </button>
      </div>

      {/* Discount + tax controls */}
      <div className="tool-fields" style={{ marginTop: 18 }}>
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="qc-discount-type">
              Discount type
            </label>
            <select
              className="tool-select"
              id="qc-discount-type"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
            >
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed amount ($)</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="qc-discount-value">
              {discountType === "percent" ? "Discount (%)" : "Discount ($)"}
            </label>
            <input
              className="tool-input"
              id="qc-discount-value"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder={discountType === "percent" ? "e.g. 10" : "e.g. 50"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="qc-tax">
              Tax rate (%)
            </label>
            <input
              className="tool-input"
              id="qc-tax"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 8.5"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Headline total */}
      <div className="tool-result" role="status" aria-live="polite" style={{ marginTop: 18 }}>
        <span className="tool-result-label">Quote total</span>
        <span className="tool-result-value">{money.format(totals.total)}</span>
      </div>

      {/* Breakdown */}
      <div className="tool-stat-grid" role="status" aria-live="polite" style={{ marginTop: 16 }}>
        <div className="tool-stat">
          <div className="tool-stat-num">{money.format(totals.subtotal)}</div>
          <div className="tool-stat-label">Subtotal</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {hasDiscount ? "−" : ""}
            {money.format(totals.discount)}
          </div>
          <div className="tool-stat-label">
            Discount
            {discountType === "percent" && toNum(discountValue) > 0
              ? ` (${formatPercent(Math.min(Math.max(0, toNum(discountValue)), 100))})`
              : ""}
          </div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{money.format(totals.tax)}</div>
          <div className="tool-stat-label">Tax ({formatPercent(totals.rate)})</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{money.format(totals.total)}</div>
          <div className="tool-stat-label">Total</div>
        </div>
      </div>

      {/* Detailed summary */}
      <div className="tool-label" style={{ marginTop: 22, marginBottom: 8 }}>
        Summary
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            width: "min(320px, 100%)",
            fontVariantNumeric: "tabular-nums",
            border: "1px solid rgba(128,128,128,0.28)",
            borderRadius: 10,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              opacity: 0.85,
            }}
          >
            <span>Subtotal</span>
            <span>{money.format(totals.subtotal)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              opacity: 0.85,
            }}
          >
            <span>
              Discount
              {discountType === "percent" && toNum(discountValue) > 0
                ? ` (${formatPercent(Math.min(Math.max(0, toNum(discountValue)), 100))})`
                : discountType === "fixed"
                ? " (fixed)"
                : ""}
            </span>
            <span>
              {hasDiscount ? "−" : ""}
              {money.format(totals.discount)}
            </span>
          </div>
          {hasDiscount && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 0",
                opacity: 0.85,
              }}
            >
              <span>After discount</span>
              <span>{money.format(totals.discountedSubtotal)}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              opacity: 0.85,
            }}
          >
            <span>Tax ({formatPercent(totals.rate)})</span>
            <span>{money.format(totals.tax)}</span>
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(128,128,128,0.28)",
              margin: "8px 0 2px",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            <span>Total</span>
            <span>{money.format(totals.total)}</span>
          </div>
        </div>
      </div>

      <p className="tool-note" style={{ marginTop: 14 }}>
        Each line’s amount is quantity × unit price. The discount comes off the subtotal, and tax is
        applied to the discounted subtotal. Everything is calculated in your browser — nothing is
        uploaded.
      </p>
    </div>
  );
}
