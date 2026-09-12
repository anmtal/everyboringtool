"use client";

import { useState, useMemo } from "react";

export default function AirbnbCalculator() {
  const [nightlyRate, setNightlyRate] = useState("150");
  const [occupancy, setOccupancy] = useState("65");
  const [platformFee, setPlatformFee] = useState("3");
  const [mortgage, setMortgage] = useState("1200");
  const [utilities, setUtilities] = useState("200");
  const [supplies, setSupplies] = useState("100");
  const [cleaning, setCleaning] = useState("300");
  const [management, setManagement] = useState("0");

  const results = useMemo(() => {
    const rate = parseFloat(nightlyRate);
    const occ = parseFloat(occupancy);
    const fee = parseFloat(platformFee);
    const mort = parseFloat(mortgage);
    const util = parseFloat(utilities);
    const sup = parseFloat(supplies);
    const clean = parseFloat(cleaning);
    const mgmt = parseFloat(management);

    if (
      !isFinite(rate) ||
      !isFinite(occ) ||
      !isFinite(fee) ||
      !isFinite(mort) ||
      !isFinite(util) ||
      !isFinite(sup) ||
      !isFinite(clean) ||
      !isFinite(mgmt) ||
      rate < 0 ||
      occ < 0 ||
      fee < 0 ||
      mort < 0 ||
      util < 0 ||
      sup < 0 ||
      clean < 0 ||
      mgmt < 0
    ) {
      return null;
    }

    // Cap occupancy and fee at 100% so the math stays sensible.
    const occRate = Math.min(occ, 100) / 100;
    const feeRate = Math.min(fee, 100) / 100;

    // Gross booking income before the platform/host fee is taken out.
    const grossRevenue = rate * 30 * occRate;
    // Airbnb (or any host) fee is a percentage of that gross revenue.
    const platformFeeAmount = grossRevenue * feeRate;
    // Revenue you actually collect after the fee.
    const monthlyRevenue = grossRevenue - platformFeeAmount;

    const monthlyExpenses = mort + util + sup + clean + mgmt;
    const monthlyProfit = monthlyRevenue - monthlyExpenses;

    const annualRevenue = monthlyRevenue * 12;
    const annualProfit = monthlyProfit * 12;

    return {
      monthlyRevenue,
      annualRevenue,
      monthlyExpenses,
      monthlyProfit,
      annualProfit,
      platformFeeAmount,
    };
  }, [
    nightlyRate,
    occupancy,
    platformFee,
    mortgage,
    utilities,
    supplies,
    cleaning,
    management,
  ]);

  const money = (value) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="abc-rate">
              Average nightly rate ($)
            </label>
            <input
              className="tool-input"
              id="abc-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="5"
              value={nightlyRate}
              onChange={(e) => setNightlyRate(e.target.value)}
              placeholder="150"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="abc-occ">
              Occupancy rate (%)
            </label>
            <input
              className="tool-input"
              id="abc-occ"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
              value={occupancy}
              onChange={(e) => setOccupancy(e.target.value)}
              placeholder="65"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="abc-fee">
              Platform / host fee (% of revenue)
            </label>
            <input
              className="tool-input"
              id="abc-fee"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.5"
              value={platformFee}
              onChange={(e) => setPlatformFee(e.target.value)}
              placeholder="3"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="abc-mortgage">
              Mortgage / rent ($/mo)
            </label>
            <input
              className="tool-input"
              id="abc-mortgage"
              type="number"
              inputMode="decimal"
              min="0"
              step="50"
              value={mortgage}
              onChange={(e) => setMortgage(e.target.value)}
              placeholder="1200"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="abc-utilities">
              Utilities ($/mo)
            </label>
            <input
              className="tool-input"
              id="abc-utilities"
              type="number"
              inputMode="decimal"
              min="0"
              step="10"
              value={utilities}
              onChange={(e) => setUtilities(e.target.value)}
              placeholder="200"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="abc-supplies">
              Supplies ($/mo)
            </label>
            <input
              className="tool-input"
              id="abc-supplies"
              type="number"
              inputMode="decimal"
              min="0"
              step="10"
              value={supplies}
              onChange={(e) => setSupplies(e.target.value)}
              placeholder="100"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="abc-cleaning">
              Cleaning ($/mo)
            </label>
            <input
              className="tool-input"
              id="abc-cleaning"
              type="number"
              inputMode="decimal"
              min="0"
              step="10"
              value={cleaning}
              onChange={(e) => setCleaning(e.target.value)}
              placeholder="300"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="abc-management">
              Management ($/mo)
            </label>
            <input
              className="tool-input"
              id="abc-management"
              type="number"
              inputMode="decimal"
              min="0"
              step="10"
              value={management}
              onChange={(e) => setManagement(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">MONTHLY PROFIT</p>
            <div className="tool-result-value">{money(results.monthlyProfit)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.monthlyRevenue)}</div>
              <div className="tool-stat-label">Monthly revenue</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.annualRevenue)}</div>
              <div className="tool-stat-label">Annual revenue</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.monthlyExpenses)}</div>
              <div className="tool-stat-label">Monthly expenses</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.annualProfit)}</div>
              <div className="tool-stat-label">Annual profit</div>
            </div>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Enter a nightly rate, occupancy rate, and your monthly expenses to
          estimate your short-term rental income. All values must be zero or
          greater.
        </p>
      )}

      <p className="tool-note">
        Estimate only, for education — not financial advice. Revenue is projected
        as nightly rate x 30 nights x occupancy, less your platform/host fee.
        Actual bookings, seasonality, cleaning fees, taxes, and vacancies will
        change your real numbers. Everything is calculated in your browser and
        nothing is uploaded.
      </p>
    </div>
  );
}
