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
  maximumFractionDigits: 2,
});

const pctFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function CpaCalculator() {
  const [mode, setMode] = useState("conversions"); // "conversions" | "clicks"
  const [currency, setCurrency] = useState("USD");
  const [spend, setSpend] = useState("1000");
  const [conversions, setConversions] = useState("40");
  const [clicks, setClicks] = useState("2000");
  const [convRate, setConvRate] = useState("2");

  const result = useMemo(() => {
    const s = toNumber(spend);

    if (s === null) return { status: "empty" };
    if (s < 0) return { status: "negative" };

    let convs;

    if (mode === "conversions") {
      const c = toNumber(conversions);
      if (c === null) return { status: "empty" };
      if (c < 0) return { status: "negative" };
      if (c === 0) return { status: "zero-conversions" };
      convs = c;
    } else {
      const clk = toNumber(clicks);
      const rate = toNumber(convRate);
      if (clk === null || rate === null) return { status: "empty" };
      if (clk < 0 || rate < 0) return { status: "negative" };
      convs = clk * (rate / 100);
      if (convs <= 0) return { status: "zero-conversions" };
    }

    const cpa = s / convs;

    return {
      status: "ok",
      cpa,
      spend: s,
      conversions: convs,
      clicks: mode === "clicks" ? toNumber(clicks) : null,
      convRate: mode === "clicks" ? toNumber(convRate) : null,
    };
  }, [mode, spend, conversions, clicks, convRate]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpa-mode">
              Calculate from
            </label>
            <select
              className="tool-select"
              id="cpa-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="conversions">Conversions</option>
              <option value="clicks">Clicks &amp; conversion rate</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpa-currency">
              Currency
            </label>
            <select
              className="tool-select"
              id="cpa-currency"
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
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpa-spend">
              Total ad spend
            </label>
            <input
              className="tool-input"
              id="cpa-spend"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={spend}
              onChange={(e) => setSpend(e.target.value)}
              placeholder="1000.00"
            />
          </div>

          {mode === "conversions" ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cpa-conversions">
                Conversions
              </label>
              <input
                className="tool-input"
                id="cpa-conversions"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={conversions}
                onChange={(e) => setConversions(e.target.value)}
                placeholder="40"
              />
            </div>
          ) : (
            <>
              <div className="tool-field">
                <label className="tool-label" htmlFor="cpa-clicks">
                  Clicks
                </label>
                <input
                  className="tool-input"
                  id="cpa-clicks"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={clicks}
                  onChange={(e) => setClicks(e.target.value)}
                  placeholder="2000"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="cpa-conv-rate">
                  Conversion rate (%)
                </label>
                <input
                  className="tool-input"
                  id="cpa-conv-rate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={convRate}
                  onChange={(e) => setConvRate(e.target.value)}
                  placeholder="2"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {result.status === "ok" ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Cost per acquisition (CPA)</p>
            <div className="tool-result-value">
              {money(result.cpa, currency)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {money(result.spend, currency)}
              </div>
              <div className="tool-stat-label">Total ad spend</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {countFmt.format(result.conversions)}
              </div>
              <div className="tool-stat-label">Conversions</div>
            </div>
            {result.clicks !== null && result.clicks > 0 ? (
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {money(result.spend / result.clicks, currency)}
                </div>
                <div className="tool-stat-label">Cost per click</div>
              </div>
            ) : (
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {money(result.cpa, currency)}
                </div>
                <div className="tool-stat-label">Cost / conversion</div>
              </div>
            )}
          </div>

          {mode === "clicks" ? (
            <p className="tool-note">
              {countFmt.format(result.clicks)} clicks at{" "}
              {pctFmt.format(result.convRate)}% convert to{" "}
              {countFmt.format(result.conversions)} conversions. CPA = spend ÷
              conversions.
            </p>
          ) : (
            <p className="tool-note">
              CPA = total ad spend ÷ number of conversions. It tells you what you
              pay, on average, for each acquisition or action.
            </p>
          )}
        </>
      ) : (
        <p
          className={result.status === "empty" ? "tool-note" : "tool-error"}
        >
          {result.status === "empty"
            ? mode === "conversions"
              ? "Enter your total ad spend and number of conversions to calculate CPA."
              : "Enter ad spend, clicks, and a conversion rate to calculate CPA."
            : result.status === "negative"
            ? "Values can't be negative — enter positive numbers."
            : "Conversions must be greater than zero to calculate a cost per acquisition (you can't divide by zero)."}
        </p>
      )}
    </div>
  );
}
