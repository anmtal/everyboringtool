"use client";

import { useState, useMemo } from "react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function pct(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function DropshippingProfitCalculator() {
  const [price, setPrice] = useState("29.99");
  const [productCost, setProductCost] = useState("8.50");
  const [shipping, setShipping] = useState("4.00");
  const [feePct, setFeePct] = useState("2.9");
  const [adCost, setAdCost] = useState("6.00");
  const [orders, setOrders] = useState("300");

  const result = useMemo(() => {
    const p = toNumber(price);
    const cost = toNumber(productCost);
    const ship = toNumber(shipping);
    const fee = toNumber(feePct);
    const ads = toNumber(adCost);

    if (p === null || p <= 0) return null;

    const productCostVal = cost !== null && cost > 0 ? cost : 0;
    const shippingVal = ship !== null && ship > 0 ? ship : 0;
    const feeRate = fee !== null && fee > 0 ? fee : 0;
    const adCostVal = ads !== null && ads > 0 ? ads : 0;

    const feeAmount = p * (feeRate / 100);
    const profitPerOrder =
      p - productCostVal - shippingVal - feeAmount - adCostVal;
    const margin = (profitPerOrder / p) * 100;

    const monthlyOrders = toNumber(orders);
    const hasOrders =
      monthlyOrders !== null && monthlyOrders > 0 && Number.isFinite(monthlyOrders);
    const monthlyProfit = hasOrders ? profitPerOrder * monthlyOrders : null;
    const monthlyRevenue = hasOrders ? p * monthlyOrders : null;

    return {
      profitPerOrder,
      margin,
      feeAmount,
      hasOrders,
      monthlyOrders: hasOrders ? monthlyOrders : null,
      monthlyProfit,
      monthlyRevenue,
      profitable: profitPerOrder >= 0,
    };
  }, [price, productCost, shipping, feePct, adCost, orders]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="dpc-price">
              Selling price ($)
            </label>
            <input
              className="tool-input"
              id="dpc-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 29.99"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="dpc-product-cost">
              Product cost ($)
            </label>
            <input
              className="tool-input"
              id="dpc-product-cost"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={productCost}
              onChange={(e) => setProductCost(e.target.value)}
              placeholder="e.g. 8.50"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="dpc-shipping">
              Shipping cost ($)
            </label>
            <input
              className="tool-input"
              id="dpc-shipping"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              placeholder="e.g. 4.00"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="dpc-fee">
              Transaction fee (%)
            </label>
            <input
              className="tool-input"
              id="dpc-fee"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.1"
              value={feePct}
              onChange={(e) => setFeePct(e.target.value)}
              placeholder="e.g. 2.9"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="dpc-ad-cost">
              Ad cost per order ($)
            </label>
            <input
              className="tool-input"
              id="dpc-ad-cost"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={adCost}
              onChange={(e) => setAdCost(e.target.value)}
              placeholder="e.g. 6.00"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="dpc-orders">
              Monthly orders (optional)
            </label>
            <input
              className="tool-input"
              id="dpc-orders"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={orders}
              onChange={(e) => setOrders(e.target.value)}
              placeholder="e.g. 300"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Profit per order</p>
            <div className="tool-result-value">
              {usd.format(result.profitPerOrder)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{pct(result.margin)}</div>
              <div className="tool-stat-label">Profit margin</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.feeAmount)}</div>
              <div className="tool-stat-label">Transaction fee / order</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.hasOrders ? usd.format(result.monthlyProfit) : "—"}
              </div>
              <div className="tool-stat-label">
                {result.hasOrders
                  ? `Monthly profit (${result.monthlyOrders} orders)`
                  : "Monthly profit"}
              </div>
            </div>
          </div>

          {result.hasOrders ? (
            <p className="tool-note">
              At {result.monthlyOrders} orders/month you would take in{" "}
              {usd.format(result.monthlyRevenue)} in revenue and keep{" "}
              {usd.format(result.monthlyProfit)} in profit.
            </p>
          ) : (
            <p className="tool-note">
              Add a monthly orders figure to project your monthly profit and
              revenue.
            </p>
          )}

          {result.profitable === false ? (
            <p className="tool-error">
              This product loses money on every sale — your costs and fees are
              higher than the selling price. Raise the price or cut a cost to get
              above break-even.
            </p>
          ) : null}

          <p className="tool-note">
            Profit per order = selling price − product cost − shipping −
            (selling price × fee%) − ad cost per order. Margin = profit ÷ selling
            price. Blank or zero cost fields are treated as $0.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a selling price above $0 to calculate your dropshipping profit per
          order and margin.
        </p>
      )}
    </div>
  );
}
