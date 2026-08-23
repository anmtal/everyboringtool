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

// Etsy fee constants (US defaults)
const LISTING_FEE = 0.2;
const TRANSACTION_RATE = 0.065; // 6.5% of item price + shipping charged
const PROCESSING_RATE = 0.03; // 3% of item price + shipping charged
const PROCESSING_FIXED = 0.25; // + $0.25 per order

export default function EtsyFeeCalculator() {
  const [price, setPrice] = useState("25");
  const [shipping, setShipping] = useState("5");
  const [itemCost, setItemCost] = useState("");
  const [shippingCost, setShippingCost] = useState("");

  const result = useMemo(() => {
    const p = toNumber(price);
    const ship = toNumber(shipping) ?? 0;

    if (p === null || p < 0 || ship < 0) return null;
    if (p === 0 && ship === 0) return null;

    // Etsy charges transaction + processing on price + shipping charged to buyer
    const revenue = p + ship;
    const transactionFee = revenue * TRANSACTION_RATE;
    const processingFee = revenue * PROCESSING_RATE + PROCESSING_FIXED;
    const totalFees = LISTING_FEE + transactionFee + processingFee;

    const cost = toNumber(itemCost);
    const shipCost = toNumber(shippingCost);
    const hasCost =
      (cost !== null && cost >= 0) || (shipCost !== null && shipCost >= 0);
    const costTotal = (cost ?? 0) + (shipCost ?? 0);

    const netProfit = revenue - costTotal - totalFees;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : null;

    return {
      revenue,
      listingFee: LISTING_FEE,
      transactionFee,
      processingFee,
      totalFees,
      hasCost,
      costTotal,
      netProfit,
      margin,
      profitable: netProfit >= 0,
    };
  }, [price, shipping, itemCost, shippingCost]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="efc-price">
              Item price ($)
            </label>
            <input
              className="tool-input"
              id="efc-price"
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
            <label className="tool-label" htmlFor="efc-shipping">
              Shipping charged ($)
            </label>
            <input
              className="tool-input"
              id="efc-shipping"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              placeholder="5.00"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="efc-item-cost">
              Item cost ($, optional)
            </label>
            <input
              className="tool-input"
              id="efc-item-cost"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={itemCost}
              onChange={(e) => setItemCost(e.target.value)}
              placeholder="e.g. 8.00"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="efc-ship-cost">
              Shipping cost ($, optional)
            </label>
            <input
              className="tool-input"
              id="efc-ship-cost"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              placeholder="e.g. 4.50"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result">
            <p className="tool-result-label">
              {result.hasCost ? "Net profit" : "Total Etsy fees"}
            </p>
            <div className="tool-result-value">
              {result.hasCost
                ? usd.format(result.netProfit)
                : usd.format(result.totalFees)}
            </div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.totalFees)}</div>
              <div className="tool-stat-label">Total fees</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {usd.format(result.listingFee)}
              </div>
              <div className="tool-stat-label">Listing fee</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {usd.format(result.transactionFee)}
              </div>
              <div className="tool-stat-label">Transaction (6.5%)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {usd.format(result.processingFee)}
              </div>
              <div className="tool-stat-label">Payment processing</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.hasCost ? usd.format(result.netProfit) : "—"}
              </div>
              <div className="tool-stat-label">Net profit</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.hasCost && result.margin !== null
                  ? pct(result.margin)
                  : "—"}
              </div>
              <div className="tool-stat-label">Profit margin</div>
            </div>
          </div>

          {result.hasCost && !result.profitable ? (
            <p className="tool-error">
              This order loses money after Etsy fees and your costs.
            </p>
          ) : null}

          <p className="tool-note">
            Fees = $0.20 listing + 6.5% transaction on (item + shipping) + payment
            processing (3% of item + shipping, plus $0.25 per order). Net profit =
            item price + shipping charged − item cost − shipping cost − fees.
            Payment processing rates and the fixed fee vary by country, so your
            actual charges may differ.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter an item price above to estimate your Etsy fees and profit.
        </p>
      )}
    </div>
  );
}
