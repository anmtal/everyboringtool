"use client";

import { useMemo, useState } from "react";

// Cap the projection table so a large "months" value stays sane.
const MAX_MONTHS = 120;

let uid = 0;
function makeRow(label, amount) {
  uid += 1;
  return { id: `r${uid}`, label, amount: String(amount) };
}

function parseAmount(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const n = parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function CashFlowCalculator() {
  const [starting, setStarting] = useState("10000");
  const [months, setMonths] = useState("12");
  const [inflows, setInflows] = useState(() => [
    makeRow("Sales revenue", 12000),
    makeRow("Other income", 800),
  ]);
  const [outflows, setOutflows] = useState(() => [
    makeRow("Payroll", 6500),
    makeRow("Rent", 2200),
    makeRow("Software & tools", 900),
    makeRow("Marketing", 1500),
  ]);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  );
  const currency2 = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    []
  );

  function updateRow(setter, id, field, value) {
    setter((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }
  function addRow(setter) {
    setter((rows) => [...rows, makeRow("", "")]);
  }
  function removeRow(setter, id) {
    setter((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }

  const result = useMemo(() => {
    const totalIn = inflows.reduce((s, r) => s + parseAmount(r.amount), 0);
    const totalOut = outflows.reduce((s, r) => s + parseAmount(r.amount), 0);
    const net = totalIn - totalOut;

    const startBal = (() => {
      const n = parseFloat(String(starting).replace(/,/g, ""));
      return Number.isFinite(n) ? n : 0;
    })();

    let m = parseInt(months, 10);
    if (!Number.isFinite(m) || m < 1) m = 1;
    if (m > MAX_MONTHS) m = MAX_MONTHS;

    // Build month-by-month projection assuming the same net flow each month.
    const schedule = [];
    let balance = startBal;
    let runwayMonth = null;
    for (let i = 1; i <= m; i += 1) {
      const opening = balance;
      const closing = opening + net;
      balance = closing;
      if (runwayMonth === null && closing < 0) runwayMonth = i;
      schedule.push({ month: i, opening, inflow: totalIn, outflow: totalOut, net, closing });
    }

    const endingBalance = startBal + net * m;
    const hasData = totalIn > 0 || totalOut > 0;

    return {
      totalIn,
      totalOut,
      net,
      startBal,
      months: m,
      schedule,
      endingBalance,
      runwayMonth,
      hasData,
    };
  }, [inflows, outflows, starting, months]);

  const netClass =
    result.net > 0 ? "btn-success" : result.net < 0 ? "" : "";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cf-start">
              Starting cash balance ($)
            </label>
            <input
              className="tool-input"
              id="cf-start"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="10000"
              value={starting}
              onChange={(e) => setStarting(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cf-months">
              Months to project (1–{MAX_MONTHS})
            </label>
            <input
              className="tool-input"
              id="cf-months"
              type="number"
              inputMode="numeric"
              min="1"
              max={MAX_MONTHS}
              step="1"
              placeholder="12"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label">Monthly cash in (income)</label>
          {inflows.map((r, i) => (
            <div className="tool-row" key={r.id}>
              <div className="tool-field">
                <label className="tool-label" htmlFor={`in-label-${r.id}`}>
                  {i === 0 ? "Source" : ""}
                </label>
                <input
                  className="tool-input"
                  id={`in-label-${r.id}`}
                  type="text"
                  placeholder="e.g. Sales revenue"
                  value={r.label}
                  onChange={(e) =>
                    updateRow(setInflows, r.id, "label", e.target.value)
                  }
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor={`in-amt-${r.id}`}>
                  {i === 0 ? "Amount / month ($)" : ""}
                </label>
                <input
                  className="tool-input"
                  id={`in-amt-${r.id}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={r.amount}
                  onChange={(e) =>
                    updateRow(setInflows, r.id, "amount", e.target.value)
                  }
                />
              </div>
              <div className="tool-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => removeRow(setInflows, r.id)}
                  aria-label="Remove income row"
                  disabled={inflows.length <= 1}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <div className="tool-actions">
            <button
              type="button"
              className="btn"
              onClick={() => addRow(setInflows)}
            >
              + Add income
            </button>
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label">Monthly cash out (expenses)</label>
          {outflows.map((r, i) => (
            <div className="tool-row" key={r.id}>
              <div className="tool-field">
                <label className="tool-label" htmlFor={`out-label-${r.id}`}>
                  {i === 0 ? "Expense" : ""}
                </label>
                <input
                  className="tool-input"
                  id={`out-label-${r.id}`}
                  type="text"
                  placeholder="e.g. Rent"
                  value={r.label}
                  onChange={(e) =>
                    updateRow(setOutflows, r.id, "label", e.target.value)
                  }
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor={`out-amt-${r.id}`}>
                  {i === 0 ? "Amount / month ($)" : ""}
                </label>
                <input
                  className="tool-input"
                  id={`out-amt-${r.id}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={r.amount}
                  onChange={(e) =>
                    updateRow(setOutflows, r.id, "amount", e.target.value)
                  }
                />
              </div>
              <div className="tool-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => removeRow(setOutflows, r.id)}
                  aria-label="Remove expense row"
                  disabled={outflows.length <= 1}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <div className="tool-actions">
            <button
              type="button"
              className="btn"
              onClick={() => addRow(setOutflows)}
            >
              + Add expense
            </button>
          </div>
        </div>
      </div>

      {!result.hasData && (
        <p className="tool-note">
          Enter your monthly income and expenses above to see your net cash
          flow, projected ending balance, and how long your cash lasts.
        </p>
      )}

      {result.hasData && (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">NET MONTHLY CASH FLOW</p>
            <div className="tool-result-value">
              {result.net >= 0 ? "+" : "−"}
              {currency2.format(Math.abs(result.net))}
              {result.net >= 0 ? " surplus" : " shortfall"}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.totalIn)}
              </div>
              <div className="tool-stat-label">Cash in / month</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.totalOut)}
              </div>
              <div className="tool-stat-label">Cash out / month</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(result.endingBalance)}
              </div>
              <div className="tool-stat-label">
                Balance after {result.months} mo
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.net >= 0
                  ? "∞"
                  : result.runwayMonth
                  ? `${result.runwayMonth} mo`
                  : `> ${result.months} mo`}
              </div>
              <div className="tool-stat-label">Cash runway</div>
            </div>
          </div>

          {result.net < 0 && result.runwayMonth && (
            <p className="tool-note">
              Warning: at this burn rate your cash balance goes negative in month{" "}
              {result.runwayMonth}. You are spending{" "}
              {currency2.format(Math.abs(result.net))} more than you bring in
              each month.
            </p>
          )}
          {result.net >= 0 && (
            <p className="tool-note">
              You have a positive cash flow of{" "}
              {currency2.format(result.net)} per month, so your balance grows
              over time and never runs out at this rate.
            </p>
          )}

          <p className="tool-result-label">MONTH-BY-MONTH PROJECTION</p>
          <pre className="tool-output">
{`Month  Opening      Net        Closing
${result.schedule
  .map((s) => {
    const mo = String(s.month).padStart(3, " ");
    const open = currency.format(s.opening).padStart(11, " ");
    const net = `${s.net >= 0 ? "+" : "-"}${currency.format(Math.abs(s.net))}`.padStart(10, " ");
    const close = currency.format(s.closing).padStart(11, " ");
    return `${mo}  ${open}  ${net}  ${close}`;
  })
  .join("\n")}`}
          </pre>

          <p className="tool-note">
            This projection assumes the same income and expenses repeat every
            month. Closing balance = opening balance + (cash in − cash out).
            Runway is the first month your balance would go below zero. It is a
            simple planning estimate and does not model timing of payments,
            taxes, one-off items, or interest. Everything runs privately in your
            browser — nothing is uploaded.
          </p>
        </>
      )}
    </div>
  );
}
