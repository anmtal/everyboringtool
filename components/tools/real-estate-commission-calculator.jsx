"use client";

import { useState, useMemo } from "react";

export default function RealEstateCommissionCalculator() {
  const [price, setPrice] = useState("400000");
  const [rate, setRate] = useState("6");
  const [listingShare, setListingShare] = useState("50");

  const results = useMemo(() => {
    const p = parseFloat(price);
    const r = parseFloat(rate);
    const share = parseFloat(listingShare);

    if (
      !isFinite(p) ||
      !isFinite(r) ||
      !isFinite(share) ||
      p <= 0 ||
      r < 0 ||
      share < 0 ||
      share > 100
    ) {
      return null;
    }

    const total = p * (r / 100);
    const listing = total * (share / 100);
    const buyer = total - listing;
    const netProceeds = p - total;

    return { total, listing, buyer, netProceeds };
  }, [price, rate, listingShare]);

  const money = (value) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const buyerShare = (() => {
    const s = parseFloat(listingShare);
    if (!isFinite(s)) return "";
    return (100 - s).toLocaleString("en-US", { maximumFractionDigits: 2 });
  })();

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rec-price">
              Sale price ($)
            </label>
            <input
              className="tool-input"
              id="rec-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="400000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rec-rate">
              Commission rate (%)
            </label>
            <input
              className="tool-input"
              id="rec-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="6"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rec-split">
              Listing agent share (%)
            </label>
            <input
              className="tool-input"
              id="rec-split"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
              value={listingShare}
              onChange={(e) => setListingShare(e.target.value)}
              placeholder="50"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label">Buyer agent share (%)</label>
            <input
              className="tool-input"
              type="text"
              value={buyerShare}
              readOnly
              aria-label="Buyer agent share, calculated automatically"
              tabIndex={-1}
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">TOTAL COMMISSION</p>
            <div className="tool-result-value">{money(results.total)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.listing)}</div>
              <div className="tool-stat-label">Listing agent side</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.buyer)}</div>
              <div className="tool-stat-label">Buyer agent side</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.netProceeds)}</div>
              <div className="tool-stat-label">Net proceeds to seller</div>
            </div>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Enter a sale price, commission rate, and listing agent share (0–100%) to
          see the total commission and how it splits.
        </p>
      )}

      <p className="tool-note">
        This is an estimate for education, not financial advice. Commission rates
        are always negotiable and vary by market and agreement; net proceeds shown
        here do not include closing costs, taxes, or your remaining mortgage
        balance. Everything is calculated in your browser — nothing is uploaded.
      </p>
    </div>
  );
}
