"use client";

import { useState, useMemo } from "react";

// 100% client-side BRRRR (Buy, Rehab, Rent, Refinance, Repeat) calculator.
// All math runs in this browser — nothing is uploaded and no network calls are made.
export default function BrrrrCalculator() {
  const [purchase, setPurchase] = useState("100000");
  const [rehab, setRehab] = useState("30000");
  const [closing, setClosing] = useState("4000");
  const [arv, setArv] = useState("170000");
  const [ltv, setLtv] = useState("75");
  const [rate, setRate] = useState("7.5");
  const [term, setTerm] = useState("30");
  const [rent, setRent] = useState("1600");
  const [opex, setOpex] = useState("500");

  const results = useMemo(() => {
    const p = parseFloat(purchase);
    const rh = parseFloat(rehab);
    const cc = parseFloat(closing);
    const av = parseFloat(arv);
    const l = parseFloat(ltv);
    const r = parseFloat(rate);
    const t = parseFloat(term);
    const rn = parseFloat(rent);
    const ox = parseFloat(opex);

    if (
      !isFinite(p) ||
      !isFinite(rh) ||
      !isFinite(cc) ||
      !isFinite(av) ||
      !isFinite(l) ||
      !isFinite(r) ||
      !isFinite(t) ||
      !isFinite(rn) ||
      !isFinite(ox) ||
      p <= 0 ||
      av <= 0 ||
      t <= 0 ||
      rh < 0 ||
      cc < 0 ||
      l < 0 ||
      l > 100 ||
      r < 0 ||
      rn < 0 ||
      ox < 0
    ) {
      return null;
    }

    // Total cash invested going in (before the refinance pulls money back out).
    const totalCashIn = p + rh + cc;

    // Refinance: new loan is a percentage of the After-Repair Value.
    const refiLoan = av * (l / 100);

    // Cash left in the deal after refinance proceeds pay you back.
    // <= 0 means you recovered all (or more than all) of your cash.
    const cashLeftIn = totalCashIn - refiLoan;
    const allCashOut = cashLeftIn <= 0;

    // New mortgage principal & interest (standard amortization).
    const n = t * 12;
    const mr = r / 100 / 12;
    let mortgage;
    if (mr === 0) {
      mortgage = refiLoan / n;
    } else {
      const factor = Math.pow(1 + mr, n);
      mortgage = (refiLoan * mr * factor) / (factor - 1);
    }

    // Post-refi cash flow.
    const monthlyCashFlow = rn - ox - mortgage;
    const annualCashFlow = monthlyCashFlow * 12;

    // Cash-on-cash return only defined while real cash remains in the deal.
    const coc = allCashOut ? null : (annualCashFlow / cashLeftIn) * 100;

    return {
      totalCashIn,
      refiLoan,
      cashLeftIn,
      allCashOut,
      mortgage,
      monthlyCashFlow,
      annualCashFlow,
      coc,
    };
  }, [purchase, rehab, closing, arv, ltv, rate, term, rent, opex]);

  const money = (value) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const pct = (value) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + "%";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="br-purchase">
              Purchase price ($)
            </label>
            <input
              className="tool-input"
              id="br-purchase"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={purchase}
              onChange={(e) => setPurchase(e.target.value)}
              placeholder="100000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="br-rehab">
              Rehab cost ($)
            </label>
            <input
              className="tool-input"
              id="br-rehab"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={rehab}
              onChange={(e) => setRehab(e.target.value)}
              placeholder="30000"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="br-closing">
              Purchase closing costs ($)
            </label>
            <input
              className="tool-input"
              id="br-closing"
              type="number"
              inputMode="decimal"
              min="0"
              step="500"
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
              placeholder="4000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="br-arv">
              After-Repair Value / ARV ($)
            </label>
            <input
              className="tool-input"
              id="br-arv"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={arv}
              onChange={(e) => setArv(e.target.value)}
              placeholder="170000"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="br-ltv">
              Refinance LTV (%)
            </label>
            <input
              className="tool-input"
              id="br-ltv"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
              value={ltv}
              onChange={(e) => setLtv(e.target.value)}
              placeholder="75"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="br-rate">
              New loan rate (%)
            </label>
            <input
              className="tool-input"
              id="br-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="7.5"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="br-term">
              New loan term (years)
            </label>
            <input
              className="tool-input"
              id="br-term"
              type="number"
              inputMode="decimal"
              min="1"
              step="1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="30"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="br-rent">
              Monthly rent ($)
            </label>
            <input
              className="tool-input"
              id="br-rent"
              type="number"
              inputMode="decimal"
              min="0"
              step="50"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              placeholder="1600"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="br-opex">
              Monthly operating expenses ($)
            </label>
            <input
              className="tool-input"
              id="br-opex"
              type="number"
              inputMode="decimal"
              min="0"
              step="50"
              value={opex}
              onChange={(e) => setOpex(e.target.value)}
              placeholder="500"
            />
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Cash-on-cash return</p>
            <div className="tool-result-value">
              {results.allCashOut ? "Infinite — all cash recovered" : pct(results.coc)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.totalCashIn)}</div>
              <div className="tool-stat-label">Total cash in</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.refiLoan)}</div>
              <div className="tool-stat-label">Refinance loan</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.cashLeftIn)}</div>
              <div className="tool-stat-label">
                {results.allCashOut ? "Cash pulled back out" : "Cash left in deal"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.mortgage)}</div>
              <div className="tool-stat-label">New mortgage P&amp;I / mo</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.monthlyCashFlow)}</div>
              <div className="tool-stat-label">Monthly cash flow</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(results.annualCashFlow)}</div>
              <div className="tool-stat-label">Annual cash flow</div>
            </div>
          </div>

          {results.allCashOut && (
            <p className="tool-note">
              Cash left in the deal is {money(results.cashLeftIn)} — the refinance
              returned all of your invested capital (a true BRRRR "infinite return"),
              so cash-on-cash return is undefined. You can recycle that cash into the
              next deal and repeat.
            </p>
          )}
        </>
      ) : (
        <p className="tool-note">
          Enter a purchase price, ARV, and loan details to see your BRRRR numbers.
          Purchase price and ARV must be greater than zero, the loan term at least
          one year, and refinance LTV between 0 and 100.
        </p>
      )}

      <p className="tool-note">
        This is a simplified estimate for education, not financial or investment
        advice. It uses standard fully-amortizing loan math and does not include
        refinance closing costs, seasoning periods, vacancy, capital-expense
        reserves, property taxes, insurance escrow, or lender-specific rules — check
        real quotes before you buy.
      </p>
    </div>
  );
}
