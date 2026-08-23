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

const ratioFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const intFmt = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function healthFor(ratio) {
  if (ratio < 1) {
    return {
      tone: "bad",
      label: "Unsustainable",
      note:
        "You are spending more to acquire a customer than they are worth. Every sale loses money at this ratio.",
    };
  }
  if (ratio < 3) {
    return {
      tone: "warn",
      label: "Below benchmark",
      note:
        "You are profitable per customer but under the common 3:1 target. There is room to lower CAC or raise LTV.",
    };
  }
  if (ratio <= 5) {
    return {
      tone: "good",
      label: "Healthy",
      note:
        "This sits in the widely cited healthy range (around 3:1 to 5:1). Acquisition is paying for itself with margin to spare.",
    };
  }
  return {
    tone: "good",
    label: "Very strong",
    note:
      "A ratio above 5:1 is excellent — though it can also signal you are under-investing in growth and could spend more to acquire faster.",
  };
}

export default function CacCalculator() {
  const [spend, setSpend] = useState("10000");
  const [customers, setCustomers] = useState("200");
  const [ltv, setLtv] = useState("");
  const [currency, setCurrency] = useState("USD");

  const money = useMemo(() => makeMoney(currency), [currency]);

  const result = useMemo(() => {
    const sp = toNumber(spend);
    const cust = toNumber(customers);
    const lifetime = toNumber(ltv);

    if (sp === null || sp < 0) return null;
    if (cust === null || cust <= 0) return null;

    const cac = sp / cust;

    const hasLtv = lifetime !== null && lifetime > 0;
    const ratio = hasLtv && cac > 0 ? lifetime / cac : null;
    const netPerCustomer = hasLtv ? lifetime - cac : null;
    const health = ratio !== null ? healthFor(ratio) : null;

    return {
      cac,
      customers: cust,
      spend: sp,
      hasLtv,
      ltv: hasLtv ? lifetime : null,
      ratio,
      netPerCustomer,
      health,
    };
  }, [spend, customers, ltv]);

  const zeroCustomers =
    toNumber(customers) !== null && toNumber(customers) <= 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cac-spend">
              Total sales + marketing spend
            </label>
            <input
              className="tool-input"
              id="cac-spend"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={spend}
              onChange={(e) => setSpend(e.target.value)}
              placeholder="10000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cac-customers">
              New customers acquired
            </label>
            <input
              className="tool-input"
              id="cac-customers"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={customers}
              onChange={(e) => setCustomers(e.target.value)}
              placeholder="200"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cac-ltv">
              Customer lifetime value (optional)
            </label>
            <input
              className="tool-input"
              id="cac-ltv"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={ltv}
              onChange={(e) => setLtv(e.target.value)}
              placeholder="e.g. 450"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cac-currency">
              Currency
            </label>
            <select
              className="tool-select"
              id="cac-currency"
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
      </div>

      {zeroCustomers ? (
        <p className="tool-error">
          Enter a customer count greater than zero — CAC cannot be calculated
          when no customers were acquired.
        </p>
      ) : null}

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Customer acquisition cost (CAC)</p>
            <div className="tool-result-value">{money.format(result.cac)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{money.format(result.spend)}</div>
              <div className="tool-stat-label">Total spend</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {intFmt.format(result.customers)}
              </div>
              <div className="tool-stat-label">Customers acquired</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.hasLtv ? `${ratioFmt.format(result.ratio)} : 1` : "—"}
              </div>
              <div className="tool-stat-label">LTV : CAC ratio</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.hasLtv ? money.format(result.netPerCustomer) : "—"}
              </div>
              <div className="tool-stat-label">Net value per customer</div>
            </div>
          </div>

          {result.hasLtv && result.health ? (
            <div
              className="tool-result" role="status" aria-live="polite"
              style={{
                borderColor:
                  result.health.tone === "bad"
                    ? "rgba(220, 38, 38, 0.5)"
                    : result.health.tone === "warn"
                    ? "rgba(217, 119, 6, 0.5)"
                    : "rgba(22, 163, 74, 0.5)",
              }}
            >
              <p className="tool-result-label">
                LTV : CAC health — {result.health.label}
              </p>
              <p className="tool-note" style={{ marginTop: "0.35rem" }}>
                {result.health.note}
              </p>
            </div>
          ) : null}

          <p className="tool-note">
            CAC = total sales &amp; marketing spend ÷ new customers acquired. A
            common rule of thumb is an LTV:CAC ratio near 3:1 — below that,
            acquisition is eating your margin; well above it, you may be able to
            invest more to grow faster. Add your customer LTV to see the ratio
            and a quick health read.
          </p>
        </>
      ) : !zeroCustomers ? (
        <p className="tool-note">
          Enter your total spend and the number of new customers acquired to
          calculate CAC. Add an optional lifetime value to see the LTV:CAC
          ratio.
        </p>
      ) : null}
    </div>
  );
}
