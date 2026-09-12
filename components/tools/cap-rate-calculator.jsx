"use client";

import { useMemo, useState } from "react";

// 100% client-side capitalization-rate (cap rate) calculator. Everything is
// computed in this browser from the numbers you type — nothing is uploaded and
// no network calls are made. Cap rate % = annual NOI ÷ property value × 100.

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

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
  const rounded = Number(n.toFixed(2));
  return `${rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

export default function CapRateCalculator() {
  const [propertyValue, setPropertyValue] = useState("500000");
  const [noiMode, setNoiMode] = useState("breakdown"); // "breakdown" | "direct"
  const [income, setIncome] = useState("48000");
  const [expenses, setExpenses] = useState("12000");
  const [noiDirect, setNoiDirect] = useState("36000");
  const [targetRate, setTargetRate] = useState("6");

  const results = useMemo(() => {
    const value = toNumber(propertyValue);

    // Net operating income, from either input mode.
    let noi;
    if (noiMode === "direct") {
      noi = toNumber(noiDirect);
    } else {
      const inc = toNumber(income);
      const exp = toNumber(expenses);
      if (inc === null && exp === null) noi = null;
      else noi = (inc ?? 0) - (exp ?? 0);
    }

    if (noi === null || value === null) return null;

    // Cap rate needs a positive property value (divide-by-zero guard).
    const capRate = value > 0 ? (noi / value) * 100 : null;

    // Implied property value for a target cap rate: value = NOI ÷ (rate ÷ 100).
    const target = toNumber(targetRate);
    const impliedValue =
      target !== null && target > 0 ? noi / (target / 100) : null;

    return {
      value,
      noi,
      capRate,
      target,
      impliedValue,
    };
  }, [propertyValue, noiMode, income, expenses, noiDirect, targetRate]);

  const ready = results !== null;
  const validCapRate =
    ready && results.capRate !== null && Number.isFinite(results.capRate);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cap-value">
              Property value / purchase price ($)
            </label>
            <input
              className="tool-input"
              id="cap-value"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={propertyValue}
              onChange={(e) => setPropertyValue(e.target.value)}
              placeholder="500000"
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="cap-mode">
              Net operating income
            </label>
            <select
              className="tool-select"
              id="cap-mode"
              value={noiMode}
              onChange={(e) => setNoiMode(e.target.value)}
            >
              <option value="breakdown">From income &amp; expenses</option>
              <option value="direct">Enter NOI directly</option>
            </select>
          </div>
        </div>

        {noiMode === "direct" ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="cap-noi">
              Annual net operating income ($)
            </label>
            <input
              className="tool-input"
              id="cap-noi"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={noiDirect}
              onChange={(e) => setNoiDirect(e.target.value)}
              placeholder="36000"
            />
          </div>
        ) : (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="cap-income">
                Annual rental income ($)
              </label>
              <input
                className="tool-input"
                id="cap-income"
                type="number"
                inputMode="decimal"
                min="0"
                step="1000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="48000"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="cap-expenses">
                Annual operating expenses ($)
              </label>
              <input
                className="tool-input"
                id="cap-expenses"
                type="number"
                inputMode="decimal"
                min="0"
                step="1000"
                value={expenses}
                onChange={(e) => setExpenses(e.target.value)}
                placeholder="12000"
              />
            </div>
          </div>
        )}

        <div className="tool-field">
          <label className="tool-label" htmlFor="cap-target">
            Target cap rate for implied value (%)
          </label>
          <input
            className="tool-input"
            id="cap-target"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            value={targetRate}
            onChange={(e) => setTargetRate(e.target.value)}
            placeholder="6"
          />
        </div>
      </div>

      {ready ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <span className="tool-result-label">CAP RATE</span>
            <span className="tool-result-value">
              {formatPercent(results.capRate)}
            </span>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatMoney(results.noi)}</div>
              <div className="tool-stat-label">Annual NOI</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatMoney(results.value)}</div>
              <div className="tool-stat-label">Property value</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {formatMoney(results.impliedValue)}
              </div>
              <div className="tool-stat-label">
                Value at {formatPercent(results.target)} cap rate
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Enter a property value and either an annual NOI or your rental income
          and operating expenses to see the cap rate.
        </p>
      )}

      {ready && !validCapRate && (
        <p className="tool-note">
          Property value must be greater than zero to calculate a cap rate.
        </p>
      )}

      <p className="tool-note">
        Cap rate = annual NOI ÷ property value × 100, where NOI = rental income −
        operating expenses (excluding mortgage payments). Implied value = NOI ÷
        (target cap rate ÷ 100). This is a rough estimate for education, not
        financial or investment advice. Everything is calculated in your browser
        — nothing is uploaded.
      </p>
    </div>
  );
}
