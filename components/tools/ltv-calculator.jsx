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

function makeMoney(code) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (e) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

const numFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const ratioFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ratioHealth(ratio) {
  if (ratio < 1) {
    return {
      tone: "bad",
      label: "Unsustainable",
      note:
        "You spend more to acquire a customer than they are worth. Each customer loses money at this ratio.",
    };
  }
  if (ratio < 3) {
    return {
      tone: "warn",
      label: "Below benchmark",
      note:
        "Profitable per customer but under the common 3:1 target. There is room to lower CAC or raise LTV.",
    };
  }
  if (ratio <= 5) {
    return {
      tone: "good",
      label: "Healthy",
      note:
        "This sits in the widely cited healthy range (about 3:1 to 5:1). Acquisition pays for itself with margin to spare.",
    };
  }
  return {
    tone: "good",
    label: "Very strong",
    note:
      "Above 5:1 is excellent — though it can also mean you are under-investing in growth and could acquire faster.",
  };
}

export default function LtvCalculator() {
  const [method, setMethod] = useState("subscription");
  const [currency, setCurrency] = useState("USD");

  // Subscription (churn-based) inputs
  const [arpu, setArpu] = useState("50");
  const [churn, setChurn] = useState("5");

  // Transactional (AOV-based) inputs
  const [aov, setAov] = useState("60");
  const [freq, setFreq] = useState("4");
  const [lifespan, setLifespan] = useState("3");

  // Shared
  const [margin, setMargin] = useState("100");
  const [cac, setCac] = useState("");

  const money = useMemo(() => makeMoney(currency), [currency]);

  const result = useMemo(() => {
    const m = toNumber(margin);
    const marginPct = m === null ? 100 : Math.max(0, m);
    const marginRatio = marginPct / 100;
    const cacVal = toNumber(cac);

    if (method === "subscription") {
      const revenue = toNumber(arpu);
      const churnPct = toNumber(churn);
      if (revenue === null || revenue < 0) return null;
      if (churnPct === null || churnPct <= 0) {
        return { error: "churn" };
      }
      const churnRatio = churnPct / 100;
      const lifetimeMonths = 1 / churnRatio;
      const ltv = revenue * marginRatio * lifetimeMonths;
      const grossLtv = revenue * lifetimeMonths;
      return {
        ltv,
        grossLtv,
        marginPct,
        lifetimeLabel: `${numFmt.format(lifetimeMonths)} mo`,
        lifetimeSubLabel: "Avg. customer lifespan",
        perPeriodValue: money.format(revenue * marginRatio),
        perPeriodLabel: "Margin per month",
        cac: cacVal !== null && cacVal >= 0 ? cacVal : null,
      };
    }

    // transactional
    const order = toNumber(aov);
    const perYear = toNumber(freq);
    const years = toNumber(lifespan);
    if (order === null || order < 0) return null;
    if (perYear === null || perYear <= 0) return { error: "freq" };
    if (years === null || years <= 0) return { error: "lifespan" };

    const totalPurchases = perYear * years;
    const grossLtv = order * totalPurchases;
    const ltv = grossLtv * marginRatio;
    return {
      ltv,
      grossLtv,
      marginPct,
      lifetimeLabel: `${numFmt.format(totalPurchases)}`,
      lifetimeSubLabel: "Total purchases / lifetime",
      perPeriodValue: money.format(order * marginRatio),
      perPeriodLabel: "Margin per order",
      cac: cacVal !== null && cacVal >= 0 ? cacVal : null,
    };
  }, [method, arpu, churn, aov, freq, lifespan, margin, cac, money]);

  const hasCac =
    result && !result.error && result.cac !== null && result.cac > 0;
  const ratio = hasCac ? result.ltv / result.cac : null;
  const netValue = hasCac ? result.ltv - result.cac : null;
  const health = ratio !== null ? ratioHealth(ratio) : null;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ltv-method">
              Business model
            </label>
            <select
              className="tool-select"
              id="ltv-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="subscription">
                Subscription / SaaS (churn-based)
              </option>
              <option value="transactional">
                Transactional / ecommerce (order-based)
              </option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ltv-currency">
              Currency
            </label>
            <select
              className="tool-select"
              id="ltv-currency"
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

        {method === "subscription" ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ltv-arpu">
                Average revenue per user / month
              </label>
              <input
                className="tool-input"
                id="ltv-arpu"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={arpu}
                onChange={(e) => setArpu(e.target.value)}
                placeholder="50"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="ltv-churn">
                Monthly churn rate (%)
              </label>
              <input
                className="tool-input"
                id="ltv-churn"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={churn}
                onChange={(e) => setChurn(e.target.value)}
                placeholder="5"
              />
            </div>
          </div>
        ) : (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="ltv-aov">
                Average order value
              </label>
              <input
                className="tool-input"
                id="ltv-aov"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={aov}
                onChange={(e) => setAov(e.target.value)}
                placeholder="60"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="ltv-freq">
                Purchases per year
              </label>
              <input
                className="tool-input"
                id="ltv-freq"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={freq}
                onChange={(e) => setFreq(e.target.value)}
                placeholder="4"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="ltv-lifespan">
                Customer lifespan (years)
              </label>
              <input
                className="tool-input"
                id="ltv-lifespan"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={lifespan}
                onChange={(e) => setLifespan(e.target.value)}
                placeholder="3"
              />
            </div>
          </div>
        )}

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ltv-margin">
              Gross margin (%)
            </label>
            <input
              className="tool-input"
              id="ltv-margin"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ltv-cac">
              Acquisition cost per customer (optional)
            </label>
            <input
              className="tool-input"
              id="ltv-cac"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={cac}
              onChange={(e) => setCac(e.target.value)}
              placeholder="e.g. 120"
            />
          </div>
        </div>
      </div>

      {result && result.error === "churn" ? (
        <p className="tool-error">
          Enter a monthly churn rate greater than zero — lifetime value is
          infinite when no customers ever leave.
        </p>
      ) : null}
      {result && result.error === "freq" ? (
        <p className="tool-error">
          Enter purchases per year greater than zero to calculate lifetime
          value.
        </p>
      ) : null}
      {result && result.error === "lifespan" ? (
        <p className="tool-error">
          Enter a customer lifespan greater than zero to calculate lifetime
          value.
        </p>
      ) : null}

      {result && !result.error ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              Customer lifetime value (LTV)
            </p>
            <div className="tool-result-value">{money.format(result.ltv)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {money.format(result.grossLtv)}
              </div>
              <div className="tool-stat-label">Gross revenue LTV</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.lifetimeLabel}</div>
              <div className="tool-stat-label">{result.lifetimeSubLabel}</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.perPeriodValue}</div>
              <div className="tool-stat-label">{result.perPeriodLabel}</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {hasCac ? `${ratioFmt.format(ratio)} : 1` : "—"}
              </div>
              <div className="tool-stat-label">LTV : CAC ratio</div>
            </div>
          </div>

          {hasCac && health ? (
            <div className="tool-result" role="status" aria-live="polite">
              <p className="tool-result-label">
                LTV : CAC — {health.label} ({money.format(netValue)} net per
                customer)
              </p>
              <p className="tool-note">{health.note}</p>
            </div>
          ) : null}

          <p className="tool-note">
            {method === "subscription"
              ? "Churn model: LTV = (monthly revenue per user × gross margin) ÷ monthly churn rate. Average lifespan is 1 ÷ churn rate. A 5% monthly churn implies customers stay about 20 months."
              : "Order model: LTV = average order value × purchases per year × lifespan × gross margin. Set gross margin to 100% to see revenue instead of profit."}{" "}
            Add your acquisition cost to see the LTV:CAC ratio, where near 3:1 or
            higher is a common healthy target.
          </p>
        </>
      ) : !result || result.error ? null : (
        <p className="tool-note">
          Enter your revenue and retention figures to estimate customer
          lifetime value.
        </p>
      )}
    </div>
  );
}
