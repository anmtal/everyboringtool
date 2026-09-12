"use client";

import { useState, useMemo } from "react";

// 100% client-side fix-and-flip calculator. All math runs in this browser using
// plain arithmetic — nothing is uploaded and there are no network calls.

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatMoney(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return currency.format(n);
}

function formatPercent(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const rounded = Number(n.toFixed(1));
  return `${rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function HouseFlippingCalculator() {
  // Sensible defaults so the tool shows a real result on first load.
  const [arv, setArv] = useState("300000");
  const [purchase, setPurchase] = useState("180000");
  const [repairs, setRepairs] = useState("40000");
  const [holding, setHolding] = useState("8000");
  const [closing, setClosing] = useState("10");
  const [closingMode, setClosingMode] = useState("percent"); // "percent" | "dollars"

  const results = useMemo(() => {
    const a = toNumber(arv);
    const p = toNumber(purchase);
    const r = toNumber(repairs);
    const h = toNumber(holding);
    const c = toNumber(closing);

    // Need the core figures to compute anything meaningful.
    if (a === null || p === null || r === null) return { incomplete: true };
    if (a < 0 || p < 0 || r < 0 || (h !== null && h < 0) || (c !== null && c < 0)) {
      return { negative: true };
    }

    const holdingCosts = h === null ? 0 : h;
    // Buying + selling costs: either a flat dollar figure or a percentage of ARV.
    const closingRaw = c === null ? 0 : c;
    const closingCosts =
      closingMode === "percent" ? a * (closingRaw / 100) : closingRaw;

    // Projected profit = ARV - purchase - repairs - holding - buying/selling costs.
    const profit = a - p - r - holdingCosts - closingCosts;

    // Total cash invested is what you actually put into the deal.
    const cashInvested = p + r + holdingCosts + closingCosts;

    // ROI % = profit / total cash invested (guard against divide-by-zero).
    const roi = cashInvested > 0 ? (profit / cashInvested) * 100 : null;

    // 70% rule: Maximum Allowable Offer = ARV × 0.70 − repair costs.
    const mao = a * 0.7 - r;

    return {
      arv: a,
      profit,
      cashInvested,
      roi,
      closingCosts,
      mao,
    };
  }, [arv, purchase, repairs, holding, closing, closingMode]);

  const ready = results && !results.incomplete && !results.negative;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="hfc-arv">
              After-repair value / ARV ($)
            </label>
            <input
              className="tool-input"
              id="hfc-arv"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              placeholder="e.g. 300000"
              value={arv}
              onChange={(e) => setArv(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="hfc-purchase">
              Purchase price ($)
            </label>
            <input
              className="tool-input"
              id="hfc-purchase"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              placeholder="e.g. 180000"
              value={purchase}
              onChange={(e) => setPurchase(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="hfc-repairs">
              Repair / rehab costs ($)
            </label>
            <input
              className="tool-input"
              id="hfc-repairs"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              placeholder="e.g. 40000"
              value={repairs}
              onChange={(e) => setRepairs(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="hfc-holding">
              Holding costs ($)
            </label>
            <input
              className="tool-input"
              id="hfc-holding"
              type="number"
              inputMode="decimal"
              min="0"
              step="500"
              placeholder="e.g. 8000"
              value={holding}
              onChange={(e) => setHolding(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="hfc-closing">
              {closingMode === "percent"
                ? "Buying + selling costs (% of ARV)"
                : "Buying + selling costs ($)"}
            </label>
            <input
              className="tool-input"
              id="hfc-closing"
              type="number"
              inputMode="decimal"
              min="0"
              step={closingMode === "percent" ? "0.5" : "500"}
              placeholder={closingMode === "percent" ? "e.g. 10" : "e.g. 30000"}
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="hfc-closing-mode">
              Cost type
            </label>
            <select
              className="tool-select"
              id="hfc-closing-mode"
              value={closingMode}
              onChange={(e) => setClosingMode(e.target.value)}
            >
              <option value="percent">% of ARV</option>
              <option value="dollars">Dollars ($)</option>
            </select>
          </div>
        </div>
      </div>

      {results && results.negative && (
        <p className="tool-note">
          Please enter non-negative numbers for the ARV, purchase price, repairs,
          holding, and buying/selling costs.
        </p>
      )}

      {ready ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <span className="tool-result-label">Projected profit</span>
            <span className="tool-result-value">
              {formatMoney(results.profit)}
            </span>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatMoney(results.profit)}</div>
              <div className="tool-stat-label">Projected profit</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatPercent(results.roi)}</div>
              <div className="tool-stat-label">ROI on cash invested</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatMoney(results.mao)}</div>
              <div className="tool-stat-label">Max offer (70% rule)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatMoney(results.cashInvested)}
              </div>
              <div className="tool-stat-label">Total cash invested</div>
            </div>
          </div>

          <p className="tool-note">
            Projected profit = ARV − purchase price − repairs − holding costs −
            buying/selling costs ({formatMoney(results.closingCosts)} here). ROI =
            profit ÷ total cash invested. The 70 percent rule caps your Maximum
            Allowable Offer at ARV × 0.70 − repair costs, so you leave room for
            costs and a margin on the flip.
          </p>
        </>
      ) : (
        results &&
        results.incomplete && (
          <p className="tool-note">
            Enter the after-repair value, purchase price, and repair costs to see
            your projected fix-and-flip profit, ROI, and the 70% rule maximum
            offer.
          </p>
        )
      )}

      <p className="tool-note">
        This house flipping calculator is an estimate for education, not
        financial advice. Real deals carry financing, taxes, agent commissions,
        and market risk not captured here — verify every number before making an
        offer.
      </p>
    </div>
  );
}
