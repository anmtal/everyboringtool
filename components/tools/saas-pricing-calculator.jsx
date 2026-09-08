"use client";

import { useState, useMemo } from "react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const usd2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function pct(value) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

let nextId = 4;

export default function SaasPricingCalculator() {
  const [tiers, setTiers] = useState([
    { id: 1, name: "Starter", price: "19", customers: "120" },
    { id: 2, name: "Pro", price: "49", customers: "60" },
    { id: 3, name: "Business", price: "99", customers: "20" },
  ]);
  const [billing, setBilling] = useState("monthly"); // prices entered as monthly
  const [churn, setChurn] = useState("3");
  const [growth, setGrowth] = useState("8");

  function updateTier(id, field, value) {
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  }

  function addTier() {
    setTiers((prev) => [
      ...prev,
      { id: nextId++, name: `Tier ${prev.length + 1}`, price: "", customers: "" },
    ]);
  }

  function removeTier(id) {
    setTiers((prev) => (prev.length > 1 ? prev.filter((t) => t.id !== id) : prev));
  }

  const result = useMemo(() => {
    const rows = tiers.map((t) => {
      const price = toNumber(t.price) ?? 0;
      const customers = toNumber(t.customers) ?? 0;
      // Normalize each tier's monthly recurring revenue.
      const monthlyPrice = billing === "annual" ? price / 12 : price;
      const mrr = monthlyPrice * customers;
      return {
        id: t.id,
        name: t.name || "Untitled",
        monthlyPrice,
        customers,
        mrr,
      };
    });

    const totalCustomers = rows.reduce((s, r) => s + r.customers, 0);
    const mrr = rows.reduce((s, r) => s + r.mrr, 0);
    const arr = mrr * 12;
    const arpu = totalCustomers > 0 ? mrr / totalCustomers : 0;

    if (totalCustomers <= 0 || mrr <= 0) {
      return { rows, totalCustomers, mrr: 0, arr: 0, arpu: 0, projection: null };
    }

    // 12-month projection: apply monthly customer churn and net-new growth.
    const churnRate = Math.max(0, Math.min(100, toNumber(churn) ?? 0)) / 100;
    const growthRate = Math.max(0, toNumber(growth) ?? 0) / 100;

    let customers = totalCustomers;
    let month12Mrr = mrr;
    for (let m = 0; m < 12; m++) {
      // Net logo movement: gross new adds minus churned customers.
      const churned = customers * churnRate;
      const added = customers * growthRate;
      customers = customers - churned + added;
    }
    month12Mrr = customers * arpu;

    const netMonthlyGrowth = growthRate - churnRate;

    return {
      rows,
      totalCustomers,
      mrr,
      arr,
      arpu,
      projection: {
        month12Customers: customers,
        month12Mrr,
        month12Arr: month12Mrr * 12,
        netMonthlyGrowth: netMonthlyGrowth * 100,
      },
    };
  }, [tiers, billing, churn, growth]);

  const hasRevenue = result.mrr > 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="spc-billing">
              Prices are entered as
            </label>
            <select
              className="tool-select"
              id="spc-billing"
              value={billing}
              onChange={(e) => setBilling(e.target.value)}
            >
              <option value="monthly">Per month</option>
              <option value="annual">Per year</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="spc-growth">
              Monthly new-customer growth (%)
            </label>
            <input
              className="tool-input"
              id="spc-growth"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={growth}
              onChange={(e) => setGrowth(e.target.value)}
              placeholder="8"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="spc-churn">
              Monthly customer churn (%)
            </label>
            <input
              className="tool-input"
              id="spc-churn"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.1"
              value={churn}
              onChange={(e) => setChurn(e.target.value)}
              placeholder="3"
            />
          </div>
        </div>

        {tiers.map((t, i) => (
          <div className="tool-row" key={t.id}>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`spc-name-${t.id}`}>
                Plan name
              </label>
              <input
                className="tool-input"
                id={`spc-name-${t.id}`}
                type="text"
                value={t.name}
                onChange={(e) => updateTier(t.id, "name", e.target.value)}
                placeholder="Starter"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`spc-price-${t.id}`}>
                Price ($ {billing === "annual" ? "/yr" : "/mo"})
              </label>
              <input
                className="tool-input"
                id={`spc-price-${t.id}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={t.price}
                onChange={(e) => updateTier(t.id, "price", e.target.value)}
                placeholder="19"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`spc-cust-${t.id}`}>
                Customers
              </label>
              <input
                className="tool-input"
                id={`spc-cust-${t.id}`}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={t.customers}
                onChange={(e) => updateTier(t.id, "customers", e.target.value)}
                placeholder="120"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`spc-mrr-${t.id}`}>
                Plan MRR
              </label>
              <input
                className="tool-input"
                id={`spc-mrr-${t.id}`}
                type="text"
                readOnly
                value={usd.format(result.rows[i] ? result.rows[i].mrr : 0)}
                tabIndex={-1}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="tool-actions">
        <button type="button" className="btn" onClick={addTier}>
          + Add plan
        </button>
        {tiers.length > 1 ? (
          <button
            type="button"
            className="btn"
            onClick={() => removeTier(tiers[tiers.length - 1].id)}
          >
            Remove last plan
          </button>
        ) : null}
      </div>

      {hasRevenue ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Monthly recurring revenue (MRR)</p>
            <div className="tool-result-value">{usd.format(result.mrr)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.arr)}</div>
              <div className="tool-stat-label">Annual recurring revenue</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd2.format(result.arpu)}</div>
              <div className="tool-stat-label">Blended ARPU / mo</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {new Intl.NumberFormat("en-US").format(result.totalCustomers)}
              </div>
              <div className="tool-stat-label">Total customers</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{tiers.length}</div>
              <div className="tool-stat-label">Pricing tiers</div>
            </div>
          </div>

          {result.projection ? (
            <>
              <p className="tool-result-label">Projected in 12 months</p>
              <div className="tool-stat-grid" role="status" aria-live="polite">
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {usd.format(result.projection.month12Mrr)}
                  </div>
                  <div className="tool-stat-label">MRR (month 12)</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {usd.format(result.projection.month12Arr)}
                  </div>
                  <div className="tool-stat-label">ARR (month 12)</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {new Intl.NumberFormat("en-US").format(
                      Math.round(result.projection.month12Customers)
                    )}
                  </div>
                  <div className="tool-stat-label">Customers (month 12)</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {pct(result.projection.netMonthlyGrowth)}
                  </div>
                  <div className="tool-stat-label">Net growth / mo</div>
                </div>
              </div>
              {result.projection.netMonthlyGrowth < 0 ? (
                <p className="tool-error">
                  Churn is higher than growth, so revenue shrinks over time. Lower
                  churn or raise new-customer growth to reverse this.
                </p>
              ) : null}
            </>
          ) : null}

          <p className="tool-note">
            MRR is the sum of each plan's monthly price times its customer count.
            Annual prices are divided by 12 to normalize. ARR is MRR times 12.
            Blended ARPU is MRR divided by total customers. The 12-month
            projection compounds your net monthly change (new-customer growth
            minus churn) on the customer base and holds ARPU constant; it is a
            simple model, not a forecast, and ignores tier mix shifts, expansion
            revenue, and seasonality. Everything runs privately in your browser.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a price and a customer count for at least one plan to see your
          MRR, ARR, and revenue projection.
        </p>
      )}
    </div>
  );
}
