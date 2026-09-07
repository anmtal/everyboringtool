"use client";

import { useMemo, useState } from "react";

const CURRENCIES = [
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "CAD", label: "CAD ($)" },
  { code: "AUD", label: "AUD ($)" },
  { code: "INR", label: "INR (₹)" },
  { code: "JPY", label: "JPY (¥)" },
  { code: "BRL", label: "BRL (R$)" },
];

function money(value, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

const countFmt = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const SOLVE_LABELS = {
  cpm: "CPM (cost per 1,000 impressions)",
  cost: "Total cost",
  impressions: "Impressions",
};

export default function CpmCalculator({ initialSolveFor = "cpm" } = {}) {
  const [solveFor, setSolveFor] = useState(initialSolveFor);
  const [currency, setCurrency] = useState("USD");
  const [cost, setCost] = useState("500");
  const [impressions, setImpressions] = useState("250000");
  const [cpm, setCpm] = useState("");
  const [clicks, setClicks] = useState("");
  const [conversions, setConversions] = useState("");

  const result = useMemo(() => {
    const c = toNumber(cost);
    const imp = toNumber(impressions);
    const m = toNumber(cpm);

    if (solveFor === "cpm") {
      if (c === null || imp === null) return { status: "empty" };
      if (c < 0 || imp < 0) return { status: "negative" };
      if (imp === 0) return { status: "zero-impressions" };
      return { status: "ok", key: "cpm", value: (c / imp) * 1000, cost: c, impressions: imp };
    }

    if (solveFor === "cost") {
      if (m === null || imp === null) return { status: "empty" };
      if (m < 0 || imp < 0) return { status: "negative" };
      return { status: "ok", key: "cost", value: (m * imp) / 1000, cpm: m, impressions: imp };
    }

    // solveFor === "impressions"
    if (m === null || c === null) return { status: "empty" };
    if (m < 0 || c < 0) return { status: "negative" };
    if (m === 0) return { status: "zero-cpm" };
    return { status: "ok", key: "impressions", value: (c / m) * 1000, cost: c, cpm: m };
  }, [solveFor, cost, impressions, cpm]);

  // Optional extra ad metrics when clicks / conversions are provided, using the
  // canonical cost + impressions resolved by the solve-for calculation above.
  const derived = useMemo(() => {
    if (result.status !== "ok") return null;
    const c = result.cost != null ? result.cost : (result.key === "cost" ? result.value : toNumber(cost));
    const imp = result.impressions != null ? result.impressions : (result.key === "impressions" ? result.value : toNumber(impressions));
    const clk = toNumber(clicks);
    const conv = toNumber(conversions);
    const out = {};
    if (c != null && clk != null && clk > 0) out.cpc = c / clk;
    if (imp != null && clk != null && imp > 0) out.ctr = (clk / imp) * 100;
    if (c != null && conv != null && conv > 0) out.cpa = c / conv;
    return Object.keys(out).length ? out : null;
  }, [result, cost, impressions, clicks, conversions]);

  function renderResultValue() {
    if (result.status !== "ok") return null;
    if (result.key === "cost") return money(result.value, currency);
    if (result.key === "cpm") return money(result.value, currency);
    return countFmt.format(Math.round(result.value));
  }

  const resultLabel =
    result.status === "ok"
      ? result.key === "cost"
        ? "Total campaign cost"
        : result.key === "cpm"
        ? "CPM (cost per 1,000 impressions)"
        : "Impressions delivered"
      : "";

  const showCost = solveFor !== "cost";
  const showImpressions = solveFor !== "impressions";
  const showCpm = solveFor !== "cpm";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpm-solve">
              Solve for
            </label>
            <select
              className="tool-select"
              id="cpm-solve"
              value={solveFor}
              onChange={(e) => setSolveFor(e.target.value)}
            >
              <option value="cpm">CPM</option>
              <option value="cost">Cost</option>
              <option value="impressions">Impressions</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpm-currency">
              Currency
            </label>
            <select
              className="tool-select"
              id="cpm-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          {showCost ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cpm-cost">
                Total cost
              </label>
              <input
                className="tool-input"
                id="cpm-cost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="500.00"
              />
            </div>
          ) : null}

          {showImpressions ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cpm-impressions">
                Impressions
              </label>
              <input
                className="tool-input"
                id="cpm-impressions"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={impressions}
                onChange={(e) => setImpressions(e.target.value)}
                placeholder="250000"
              />
            </div>
          ) : null}

          {showCpm ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cpm-cpm">
                CPM
              </label>
              <input
                className="tool-input"
                id="cpm-cpm"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={cpm}
                onChange={(e) => setCpm(e.target.value)}
                placeholder="2.00"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpm-clicks">Clicks (optional — adds CPC &amp; CTR)</label>
            <input className="tool-input" id="cpm-clicks" type="number" inputMode="numeric" min="0" step="1" value={clicks} onChange={(e) => setClicks(e.target.value)} placeholder="e.g. 1250" />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpm-conv">Conversions (optional — adds CPA)</label>
            <input className="tool-input" id="cpm-conv" type="number" inputMode="numeric" min="0" step="1" value={conversions} onChange={(e) => setConversions(e.target.value)} placeholder="e.g. 40" />
          </div>
        </div>
      </div>

      {result.status === "ok" ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">{resultLabel}</p>
            <div className="tool-result-value">{renderResultValue()}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.key === "cost"
                  ? money(result.value, currency)
                  : money(result.cost, currency)}
              </div>
              <div className="tool-stat-label">Total cost</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.key === "impressions"
                  ? countFmt.format(Math.round(result.value))
                  : countFmt.format(Math.round(result.impressions))}
              </div>
              <div className="tool-stat-label">Impressions</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.key === "cpm"
                  ? money(result.value, currency)
                  : money(result.cpm, currency)}
              </div>
              <div className="tool-stat-label">CPM</div>
            </div>
          </div>

          {derived && (
            <div className="tool-stat-grid" role="status" aria-live="polite" style={{ marginTop: 10 }}>
              {derived.cpc != null && <div className="tool-stat"><div className="tool-stat-num">{money(derived.cpc, currency)}</div><div className="tool-stat-label">CPC (per click)</div></div>}
              {derived.ctr != null && <div className="tool-stat"><div className="tool-stat-num">{derived.ctr.toLocaleString("en-US", { maximumFractionDigits: 2 })}%</div><div className="tool-stat-label">CTR</div></div>}
              {derived.cpa != null && <div className="tool-stat"><div className="tool-stat-num">{money(derived.cpa, currency)}</div><div className="tool-stat-label">CPA (per conversion)</div></div>}
            </div>
          )}
          <p className="tool-note">
            CPM is the cost per 1,000 impressions (eCPM is the same math on ad revenue). CPM = cost ÷ impressions ×
            1,000; cost = CPM × impressions ÷ 1,000; impressions = cost ÷ CPM ×
            1,000. Pick what to solve for and fill in the other two values.
          </p>
        </>
      ) : (
        <p
          className={
            result.status === "empty" ? "tool-note" : "tool-error"
          }
        >
          {result.status === "empty"
            ? `Enter the two known values to calculate ${SOLVE_LABELS[solveFor]}.`
            : result.status === "negative"
            ? "Values can't be negative — enter positive numbers for cost, impressions, and CPM."
            : result.status === "zero-impressions"
            ? "Impressions must be greater than zero to calculate CPM (you can't divide by zero impressions)."
            : "CPM must be greater than zero to calculate impressions (you can't divide by a zero CPM)."}
        </p>
      )}
    </div>
  );
}
