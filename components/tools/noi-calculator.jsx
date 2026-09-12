"use client";

import { useState, useMemo } from "react";

export default function NoiCalculator() {
  // A single period selector keeps every dollar input consistent; vacancy is a percentage.
  const [period, setPeriod] = useState("annual");

  const [grossRent, setGrossRent] = useState("60000");
  const [otherIncome, setOtherIncome] = useState("3000");
  const [vacancy, setVacancy] = useState("5");

  const [tax, setTax] = useState("6000");
  const [insurance, setInsurance] = useState("2000");
  const [maintenance, setMaintenance] = useState("4000");
  const [management, setManagement] = useState("4800");
  const [utilities, setUtilities] = useState("3000");

  const results = useMemo(() => {
    const num = (v) => {
      const n = parseFloat(v);
      return isFinite(n) && n >= 0 ? n : 0;
    };

    const rawRent = parseFloat(grossRent);
    if (!isFinite(rawRent) || rawRent < 0) return null;

    // Everything is normalised to annual figures; monthly entries are x12.
    const mult = period === "monthly" ? 12 : 1;

    const grossRentAnnual = rawRent * mult;
    const otherAnnual = num(otherIncome) * mult;

    let vac = parseFloat(vacancy);
    if (!isFinite(vac) || vac < 0) vac = 0;
    if (vac > 100) vac = 100;

    // Vacancy & credit loss applies to gross rental income; other income is added after.
    const vacancyLoss = grossRentAnnual * (vac / 100);
    const effectiveRent = grossRentAnnual - vacancyLoss;
    const grossOperatingIncome = effectiveRent + otherAnnual;

    // Operating expenses only — no mortgage / debt service, no capital expenditures.
    const operatingExpenses =
      (num(tax) + num(insurance) + num(maintenance) + num(management) + num(utilities)) * mult;

    const noiAnnual = grossOperatingIncome - operatingExpenses;
    const noiMonthly = noiAnnual / 12;

    return {
      grossOperatingIncome,
      operatingExpenses,
      vacancyLoss,
      noiAnnual,
      noiMonthly,
    };
  }, [
    period,
    grossRent,
    otherIncome,
    vacancy,
    tax,
    insurance,
    maintenance,
    management,
    utilities,
  ]);

  const money = (value) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const periodLabel = period === "monthly" ? "monthly" : "annual";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="noi-period">
              Enter amounts as
            </label>
            <select
              className="tool-select"
              id="noi-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="annual">Annual figures</option>
              <option value="monthly">Monthly figures</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="noi-vacancy">
              Vacancy &amp; credit loss (%)
            </label>
            <input
              className="tool-input"
              id="noi-vacancy"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.5"
              value={vacancy}
              onChange={(e) => setVacancy(e.target.value)}
              placeholder="5"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="noi-rent">
              Gross rental income ($ {periodLabel})
            </label>
            <input
              className="tool-input"
              id="noi-rent"
              type="number"
              inputMode="decimal"
              min="0"
              step="100"
              value={grossRent}
              onChange={(e) => setGrossRent(e.target.value)}
              placeholder="60000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="noi-other">
              Other income ($ {periodLabel})
            </label>
            <input
              className="tool-input"
              id="noi-other"
              type="number"
              inputMode="decimal"
              min="0"
              step="100"
              value={otherIncome}
              onChange={(e) => setOtherIncome(e.target.value)}
              placeholder="3000"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="noi-tax">
              Property tax ($ {periodLabel})
            </label>
            <input
              className="tool-input"
              id="noi-tax"
              type="number"
              inputMode="decimal"
              min="0"
              step="100"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              placeholder="6000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="noi-insurance">
              Insurance ($ {periodLabel})
            </label>
            <input
              className="tool-input"
              id="noi-insurance"
              type="number"
              inputMode="decimal"
              min="0"
              step="100"
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              placeholder="2000"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="noi-maintenance">
              Maintenance &amp; repairs ($ {periodLabel})
            </label>
            <input
              className="tool-input"
              id="noi-maintenance"
              type="number"
              inputMode="decimal"
              min="0"
              step="100"
              value={maintenance}
              onChange={(e) => setMaintenance(e.target.value)}
              placeholder="4000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="noi-management">
              Property management ($ {periodLabel})
            </label>
            <input
              className="tool-input"
              id="noi-management"
              type="number"
              inputMode="decimal"
              min="0"
              step="100"
              value={management}
              onChange={(e) => setManagement(e.target.value)}
              placeholder="4800"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="noi-utilities">
              Utilities ($ {periodLabel})
            </label>
            <input
              className="tool-input"
              id="noi-utilities"
              type="number"
              inputMode="decimal"
              min="0"
              step="100"
              value={utilities}
              onChange={(e) => setUtilities(e.target.value)}
              placeholder="3000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label">Operating expenses (annual)</label>
            <input
              className="tool-input"
              type="text"
              readOnly
              value={results ? money(results.operatingExpenses) : "—"}
              tabIndex={-1}
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">ANNUAL NET OPERATING INCOME</p>
            <div className="tool-result-value">{money(results.noiAnnual)}</div>
            <p className="tool-note" style={{ marginTop: "0.5rem" }}>
              {money(results.noiMonthly)} per month. NOI excludes mortgage payments and
              capital expenditures.
            </p>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.noiAnnual)}</div>
              <div className="tool-stat-label">Annual NOI</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.noiMonthly)}</div>
              <div className="tool-stat-label">Monthly NOI</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.grossOperatingIncome)}</div>
              <div className="tool-stat-label">Gross operating income</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.operatingExpenses)}</div>
              <div className="tool-stat-label">Operating expenses</div>
            </div>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Enter a gross rental income of zero or more to calculate net operating income.
        </p>
      )}

      <p className="tool-note">
        Net operating income = gross operating income (effective rent after vacancy, plus
        other income) minus operating expenses. It deliberately leaves out mortgage or debt
        service and capital expenditures. This is an estimate for educational purposes only,
        not financial advice. Everything is calculated in your browser — nothing you enter is
        uploaded.
      </p>
    </div>
  );
}
