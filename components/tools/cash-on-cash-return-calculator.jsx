"use client";

import { useState, useMemo } from "react";

export default function CashOnCashReturnCalculator() {
  const [basis, setBasis] = useState("monthly");
  const [cashFlow, setCashFlow] = useState("400");
  const [downPayment, setDownPayment] = useState("50000");
  const [closingCosts, setClosingCosts] = useState("6000");
  const [rehab, setRehab] = useState("9000");

  const results = useMemo(() => {
    const cf = parseFloat(cashFlow);
    const dp = parseFloat(downPayment);
    const cc = parseFloat(closingCosts);
    const rh = parseFloat(rehab);

    if (
      !isFinite(cf) ||
      !isFinite(dp) ||
      !isFinite(cc) ||
      !isFinite(rh) ||
      dp < 0 ||
      cc < 0 ||
      rh < 0
    ) {
      return null;
    }

    const totalInvested = dp + cc + rh;
    if (totalInvested <= 0) return null;

    const annualCashFlow = basis === "monthly" ? cf * 12 : cf;
    const monthlyCashFlow = basis === "monthly" ? cf : cf / 12;
    const coc = (annualCashFlow / totalInvested) * 100;

    return { totalInvested, annualCashFlow, monthlyCashFlow, coc };
  }, [basis, cashFlow, downPayment, closingCosts, rehab]);

  const money = (value) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const pct = (value) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="coc-basis">
              Cash flow entered as
            </label>
            <select
              className="tool-select"
              id="coc-basis"
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="coc-cashflow">
              {basis === "monthly"
                ? "Monthly pre-tax cash flow ($)"
                : "Annual pre-tax cash flow ($)"}
            </label>
            <input
              className="tool-input"
              id="coc-cashflow"
              type="number"
              inputMode="decimal"
              step="50"
              value={cashFlow}
              onChange={(e) => setCashFlow(e.target.value)}
              placeholder={basis === "monthly" ? "400" : "4800"}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="coc-down">
              Down payment ($)
            </label>
            <input
              className="tool-input"
              id="coc-down"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              placeholder="50000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="coc-closing">
              Closing costs ($)
            </label>
            <input
              className="tool-input"
              id="coc-closing"
              type="number"
              inputMode="decimal"
              min="0"
              step="500"
              value={closingCosts}
              onChange={(e) => setClosingCosts(e.target.value)}
              placeholder="6000"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="coc-rehab">
              Rehab / repairs ($)
            </label>
            <input
              className="tool-input"
              id="coc-rehab"
              type="number"
              inputMode="decimal"
              min="0"
              step="500"
              value={rehab}
              onChange={(e) => setRehab(e.target.value)}
              placeholder="9000"
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">CASH-ON-CASH RETURN</p>
            <div className="tool-result-value">{pct(results.coc)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.annualCashFlow)}</div>
              <div className="tool-stat-label">Annual cash flow</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.monthlyCashFlow)}</div>
              <div className="tool-stat-label">Monthly cash flow</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.totalInvested)}</div>
              <div className="tool-stat-label">Total cash invested</div>
            </div>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Enter your cash flow and the cash you put in (down payment, closing
          costs, and rehab). Total cash invested must be greater than zero.
        </p>
      )}

      <p className="tool-note">
        Cash-on-cash return = (annual pre-tax cash flow / total cash invested)
        &times; 100. Total cash invested here is your down payment plus closing
        costs plus rehab. This is a rough estimate for education only, not
        financial, investment, or tax advice.
      </p>
    </div>
  );
}
