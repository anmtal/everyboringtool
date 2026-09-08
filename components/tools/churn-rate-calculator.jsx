"use client";

import { useState, useMemo } from "react";

const pct = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function ChurnRateCalculator() {
  const [mode, setMode] = useState("customer"); // "customer" | "revenue"

  // Customer churn inputs
  const [startCustomers, setStartCustomers] = useState("1000");
  const [lostCustomers, setLostCustomers] = useState("50");

  // Revenue churn inputs
  const [startMrr, setStartMrr] = useState("50000");
  const [churnedMrr, setChurnedMrr] = useState("2500");
  const [expansionMrr, setExpansionMrr] = useState("1500");

  const result = useMemo(() => {
    if (mode === "customer") {
      const start = toNumber(startCustomers);
      const lost = toNumber(lostCustomers);

      if (start === null || lost === null) return { status: "empty" };
      if (start < 0 || lost < 0)
        return { status: "error", message: "Values can't be negative." };
      if (start === 0)
        return {
          status: "error",
          message: "Enter a starting customer count above zero.",
        };
      if (lost > start)
        return {
          status: "error",
          message: "Customers lost can't exceed customers at the start.",
        };

      const churn = (lost / start) * 100;
      const retention = 100 - churn;
      // Annualized from a monthly rate: 1 - (retention^12)
      const monthlyRetained = 1 - churn / 100;
      const annualChurn = (1 - Math.pow(monthlyRetained, 12)) * 100;

      return {
        status: "ok",
        headline: pct.format(churn) + "%",
        headlineLabel: "Customer churn rate",
        stats: [
          { label: "Retention rate", value: pct.format(retention) + "%" },
          { label: "Customers retained", value: pct.format(start - lost) },
          {
            label: "Annualized churn (if monthly)",
            value: pct.format(annualChurn) + "%",
          },
        ],
      };
    }

    // Revenue churn mode
    const start = toNumber(startMrr);
    const churned = toNumber(churnedMrr);
    const expansion = toNumber(expansionMrr);

    if (start === null || churned === null) return { status: "empty" };
    const exp = expansion === null ? 0 : expansion;
    if (start < 0 || churned < 0 || exp < 0)
      return { status: "error", message: "Values can't be negative." };
    if (start === 0)
      return {
        status: "error",
        message: "Enter starting MRR above zero.",
      };
    if (churned > start)
      return {
        status: "error",
        message: "Churned MRR can't exceed starting MRR.",
      };

    const grossChurn = (churned / start) * 100;
    const netChurn = ((churned - exp) / start) * 100;
    const nrr = ((start - churned + exp) / start) * 100;

    return {
      status: "ok",
      headline: pct.format(grossChurn) + "%",
      headlineLabel: "Gross revenue churn rate",
      stats: [
        {
          label: "Net revenue churn",
          value: (netChurn < 0 ? "-" : "") + pct.format(Math.abs(netChurn)) + "%",
        },
        { label: "Net revenue retention (NRR)", value: pct.format(nrr) + "%" },
        { label: "Revenue lost", value: usd.format(churned) },
      ],
    };
  }, [
    mode,
    startCustomers,
    lostCustomers,
    startMrr,
    churnedMrr,
    expansionMrr,
  ]);

  const showResult = result.status === "ok";
  const showError = result.status === "error";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="crc-mode">
            What are you measuring?
          </label>
          <select
            id="crc-mode"
            className="tool-select"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="customer">Customer churn (count of customers)</option>
            <option value="revenue">Revenue churn (MRR / ARR)</option>
          </select>
        </div>

        {mode === "customer" ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="crc-start">
                Customers at start of period
              </label>
              <input
                id="crc-start"
                className="tool-input"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="e.g. 1000"
                value={startCustomers}
                onChange={(e) => setStartCustomers(e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="crc-lost">
                Customers lost during period
              </label>
              <input
                id="crc-lost"
                className="tool-input"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="e.g. 50"
                value={lostCustomers}
                onChange={(e) => setLostCustomers(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="crc-start-mrr">
                  MRR at start of period
                </label>
                <input
                  id="crc-start-mrr"
                  className="tool-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="e.g. 50000"
                  value={startMrr}
                  onChange={(e) => setStartMrr(e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="crc-churned-mrr">
                  MRR lost to churn &amp; downgrades
                </label>
                <input
                  id="crc-churned-mrr"
                  className="tool-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="e.g. 2500"
                  value={churnedMrr}
                  onChange={(e) => setChurnedMrr(e.target.value)}
                />
              </div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="crc-expansion-mrr">
                Expansion MRR (upgrades, optional)
              </label>
              <input
                id="crc-expansion-mrr"
                className="tool-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="e.g. 1500"
                value={expansionMrr}
                onChange={(e) => setExpansionMrr(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {showError && <div className="tool-error">{result.message}</div>}

      {showResult && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">{result.headlineLabel}</div>
            <div className="tool-result-value">{result.headline}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            {result.stats.map((stat) => (
              <div className="tool-stat" key={stat.label}>
                <div className="tool-stat-num">{stat.value}</div>
                <div className="tool-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          <p className="tool-note">
            {mode === "customer"
              ? "Churn rate = customers lost ÷ customers at start of period. Retention is 100% minus churn. Annualized churn assumes this same rate repeats each month."
              : "Gross revenue churn = MRR lost ÷ starting MRR. Net churn subtracts expansion; a negative net churn (NRR above 100%) means growth from existing customers outpaced losses."}
          </p>
        </>
      )}

      {result.status === "empty" && (
        <p className="tool-note">
          Enter your numbers above to calculate churn. Switch modes to measure
          customer churn or revenue (MRR) churn.
        </p>
      )}
    </div>
  );
}
