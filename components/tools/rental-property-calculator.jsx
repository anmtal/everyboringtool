"use client";

import { useMemo, useState } from "react";

// 100% client-side rental property analysis. Every figure below is computed in
// your browser from the numbers you type — nothing is uploaded and no network
// calls are made. Operating expenses are treated as monthly amounts; vacancy
// and management are entered as a percentage of the monthly rent.

const money0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const money2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Parse a field into a finite number, falling back to 0 for blank/invalid.
function n(value) {
  const x = parseFloat(value);
  return Number.isFinite(x) ? x : 0;
}

function pct(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

export default function RentalPropertyCalculator() {
  const [price, setPrice] = useState("300000");
  const [closing, setClosing] = useState("9000");
  const [downValue, setDownValue] = useState("20");
  const [downUnit, setDownUnit] = useState("percent"); // "percent" | "dollar"
  const [rate, setRate] = useState("7");
  const [term, setTerm] = useState("30");
  const [rent, setRent] = useState("2500");
  const [tax, setTax] = useState("300");
  const [insurance, setInsurance] = useState("100");
  const [maintenance, setMaintenance] = useState("125");
  const [hoa, setHoa] = useState("0");
  const [vacancy, setVacancy] = useState("5");
  const [management, setManagement] = useState("8");

  const results = useMemo(() => {
    const p = parseFloat(price);
    const r = parseFloat(rate);
    const t = parseFloat(term);
    const rentM = n(rent);

    // Purchase price must be positive; rate can be 0 (cash deal); term positive.
    if (
      !Number.isFinite(p) ||
      p <= 0 ||
      !Number.isFinite(r) ||
      r < 0 ||
      !Number.isFinite(t) ||
      t <= 0 ||
      rentM < 0
    ) {
      return null;
    }

    // Down payment can be a percentage of price or a flat dollar amount.
    let down;
    if (downUnit === "percent") {
      const dpPct = Math.min(Math.max(n(downValue), 0), 100);
      down = (p * dpPct) / 100;
    } else {
      down = Math.min(Math.max(n(downValue), 0), p);
    }

    const closingCosts = Math.max(0, n(closing));
    const loan = Math.max(0, p - down);

    // Standard fixed-rate amortization for monthly principal & interest.
    const months = Math.round(t * 12);
    const monthlyRate = r / 100 / 12;
    let pi = 0;
    if (loan > 0 && months > 0) {
      if (monthlyRate === 0) {
        pi = loan / months;
      } else {
        const factor = Math.pow(1 + monthlyRate, months);
        pi = (loan * monthlyRate * factor) / (factor - 1);
      }
    }
    if (!Number.isFinite(pi)) pi = 0;

    // Monthly operating expenses (mortgage is intentionally excluded from NOI).
    const vacancyCost = (Math.max(0, n(vacancy)) / 100) * rentM;
    const managementCost = (Math.max(0, n(management)) / 100) * rentM;
    const opExpenses =
      Math.max(0, n(tax)) +
      Math.max(0, n(insurance)) +
      Math.max(0, n(maintenance)) +
      Math.max(0, n(hoa)) +
      vacancyCost +
      managementCost;

    const noiMonthly = rentM - opExpenses;
    const noiAnnual = noiMonthly * 12;
    const cashFlowMonthly = noiMonthly - pi;
    const cashFlowAnnual = cashFlowMonthly * 12;

    const capRate = (noiAnnual / p) * 100;

    const cashInvested = down + closingCosts;
    const cashOnCash =
      cashInvested > 0 ? (cashFlowAnnual / cashInvested) * 100 : null;

    return {
      down,
      loan,
      pi,
      opExpenses,
      noiMonthly,
      noiAnnual,
      cashFlowMonthly,
      cashFlowAnnual,
      capRate,
      cashInvested,
      cashOnCash,
    };
  }, [
    price,
    closing,
    downValue,
    downUnit,
    rate,
    term,
    rent,
    tax,
    insurance,
    maintenance,
    hoa,
    vacancy,
    management,
  ]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-price">
              Purchase price ($)
            </label>
            <input
              className="tool-input"
              id="rp-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="300000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-closing">
              Closing costs ($)
            </label>
            <input
              className="tool-input"
              id="rp-closing"
              type="number"
              inputMode="decimal"
              min="0"
              step="500"
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
              placeholder="9000"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-down">
              Down payment
            </label>
            <input
              className="tool-input"
              id="rp-down"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={downValue}
              onChange={(e) => setDownValue(e.target.value)}
              placeholder="20"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-down-unit">
              Down payment unit
            </label>
            <select
              className="tool-select"
              id="rp-down-unit"
              value={downUnit}
              onChange={(e) => setDownUnit(e.target.value)}
            >
              <option value="percent">% of price</option>
              <option value="dollar">$ amount</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-rate">
              Loan interest rate (%)
            </label>
            <input
              className="tool-input"
              id="rp-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="7"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-term">
              Loan term (years)
            </label>
            <input
              className="tool-input"
              id="rp-term"
              type="number"
              inputMode="decimal"
              min="1"
              step="1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="30"
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="rp-rent">
            Monthly rent ($)
          </label>
          <input
            className="tool-input"
            id="rp-rent"
            type="number"
            inputMode="decimal"
            min="0"
            step="50"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            placeholder="2500"
          />
        </div>

        <p className="tool-note">Monthly operating expenses (mortgage excluded)</p>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-tax">
              Property tax ($/mo)
            </label>
            <input
              className="tool-input"
              id="rp-tax"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              placeholder="300"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-insurance">
              Insurance ($/mo)
            </label>
            <input
              className="tool-input"
              id="rp-insurance"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              placeholder="100"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-maintenance">
              Maintenance ($/mo)
            </label>
            <input
              className="tool-input"
              id="rp-maintenance"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={maintenance}
              onChange={(e) => setMaintenance(e.target.value)}
              placeholder="125"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-hoa">
              HOA ($/mo)
            </label>
            <input
              className="tool-input"
              id="rp-hoa"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={hoa}
              onChange={(e) => setHoa(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-vacancy">
              Vacancy (% of rent)
            </label>
            <input
              className="tool-input"
              id="rp-vacancy"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={vacancy}
              onChange={(e) => setVacancy(e.target.value)}
              placeholder="5"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rp-management">
              Management (% of rent)
            </label>
            <input
              className="tool-input"
              id="rp-management"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={management}
              onChange={(e) => setManagement(e.target.value)}
              placeholder="8"
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">MONTHLY CASH FLOW</p>
            <div className="tool-result-value">
              {money2.format(results.cashFlowMonthly)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{pct(results.capRate)}</div>
              <div className="tool-stat-label">Cap rate</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {results.cashOnCash === null ? "—" : pct(results.cashOnCash)}
              </div>
              <div className="tool-stat-label">Cash-on-cash return</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {money0.format(results.cashFlowAnnual)}
              </div>
              <div className="tool-stat-label">Annual cash flow</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {money0.format(results.noiMonthly)}
              </div>
              <div className="tool-stat-label">Monthly NOI</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money2.format(results.pi)}</div>
              <div className="tool-stat-label">Mortgage P&amp;I / mo</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {money0.format(results.cashInvested)}
              </div>
              <div className="tool-stat-label">Total cash invested</div>
            </div>
          </div>

          <p className="tool-note">
            Loan amount {money0.format(results.loan)} on a {money0.format(results.down)} down
            payment. NOI = rent − operating expenses (mortgage excluded). Cash flow = NOI −
            mortgage P&amp;I. Cap rate = annual NOI ÷ price. Cash-on-cash = annual cash flow ÷
            (down payment + closing costs).
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a purchase price above 0, a loan term, and a monthly rent to see cash flow,
          cap rate, and cash-on-cash return.
        </p>
      )}

      <p className="tool-note">
        This is a simplified estimate for education, not financial or investment advice.
        It assumes a fixed-rate mortgage and steady rent, and it excludes income taxes,
        depreciation, principal paydown, appreciation, and one-off repairs. Verify every
        figure before making a purchase decision. All math runs in your browser — nothing
        is uploaded.
      </p>
    </div>
  );
}
