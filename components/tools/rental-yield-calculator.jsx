"use client";

import { useState, useMemo } from "react";

// 100% client-side rental yield calculator. Every figure is worked out in your
// browser with plain arithmetic — nothing is uploaded and no network calls are made.

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function RentalYieldCalculator() {
  const [propertyValue, setPropertyValue] = useState("250000");
  const [rent, setRent] = useState("1500");
  const [rentPeriod, setRentPeriod] = useState("monthly"); // "monthly" | "annual"
  const [expenses, setExpenses] = useState("3000");

  const results = useMemo(() => {
    const value = toNumber(propertyValue);
    const rentAmount = toNumber(rent);
    const annualExpenses = toNumber(expenses);

    if (value === null || rentAmount === null) return { incomplete: true };
    if (value <= 0 || rentAmount < 0) return { invalid: true };

    const annualRent = rentPeriod === "monthly" ? rentAmount * 12 : rentAmount;
    const exp = annualExpenses === null ? 0 : Math.max(0, annualExpenses);

    const grossYield = (annualRent / value) * 100;
    const netAnnualRent = annualRent - exp;
    const netYield = (netAnnualRent / value) * 100;

    return {
      annualRent,
      exp,
      grossYield,
      netYield,
      netAnnualRent,
    };
  }, [propertyValue, rent, rentPeriod, expenses]);

  const money = (n) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const percent = (n) => `${n.toFixed(2)}%`;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ry-value">
              Property value / price ($)
            </label>
            <input
              className="tool-input"
              id="ry-value"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={propertyValue}
              onChange={(e) => setPropertyValue(e.target.value)}
              placeholder="250000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ry-expenses">
              Annual expenses ($)
            </label>
            <input
              className="tool-input"
              id="ry-expenses"
              type="number"
              inputMode="decimal"
              min="0"
              step="100"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              placeholder="3000"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ry-rent">
              Rent ($)
            </label>
            <input
              className="tool-input"
              id="ry-rent"
              type="number"
              inputMode="decimal"
              min="0"
              step="50"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              placeholder="1500"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ry-period">
              Rent period
            </label>
            <select
              className="tool-select"
              id="ry-period"
              value={rentPeriod}
              onChange={(e) => setRentPeriod(e.target.value)}
            >
              <option value="monthly">Per month</option>
              <option value="annual">Per year</option>
            </select>
          </div>
        </div>
      </div>

      {results.incomplete ? (
        <p className="tool-note">
          Enter the property value and the rent to see the gross and net rental
          yield. Annual expenses are optional and used only for the net figure.
        </p>
      ) : results.invalid ? (
        <p className="tool-note">
          Please enter a property value greater than zero and a rent that is zero
          or more.
        </p>
      ) : (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">GROSS RENTAL YIELD</p>
            <div className="tool-result-value">{percent(results.grossYield)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{percent(results.grossYield)}</div>
              <div className="tool-stat-label">Gross rental yield</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{percent(results.netYield)}</div>
              <div className="tool-stat-label">Net rental yield</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.annualRent)}</div>
              <div className="tool-stat-label">Annual rent</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.netAnnualRent)}</div>
              <div className="tool-stat-label">Net annual income</div>
            </div>
          </div>

          <p className="tool-note">
            Gross yield = (annual rent ÷ property value) × 100. Net yield =
            ((annual rent − annual expenses) ÷ property value) × 100.
          </p>
        </>
      )}

      <p className="tool-note">
        This is an estimate for education only, not financial or investment
        advice. Yields ignore financing, taxes, vacancy, and one-off costs —
        confirm the numbers with a qualified professional before you invest.
      </p>
    </div>
  );
}
