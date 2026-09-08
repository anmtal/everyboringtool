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
      maximumFractionDigits: 0,
    });
  } catch (e) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }
}

const monthsFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function addMonths(date, months) {
  // months can be fractional; add whole months then the remaining days.
  const whole = Math.floor(months);
  const frac = months - whole;
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + whole);
  // Approximate the fractional part using the length of the landing month.
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(d.getDate() + Math.round(frac * daysInMonth));
  return d;
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
});

export default function BurnRateCalculator() {
  const [cash, setCash] = useState("500000");
  const [revenue, setRevenue] = useState("40000");
  const [expenses, setExpenses] = useState("120000");
  const [currency, setCurrency] = useState("USD");

  const money = useMemo(() => makeMoney(currency), [currency]);

  const result = useMemo(() => {
    const cashOnHand = toNumber(cash);
    const rev = toNumber(revenue);
    const exp = toNumber(expenses);

    if (exp === null || exp < 0) return null;
    if (rev === null || rev < 0) return null;
    if (cashOnHand === null || cashOnHand < 0) return null;

    const grossBurn = exp;
    const netBurn = exp - rev;

    // Cash-flow positive or break-even: revenue covers expenses.
    const profitable = netBurn <= 0;

    let runwayMonths = null;
    let zeroDate = null;
    if (!profitable) {
      runwayMonths = cashOnHand / netBurn;
      zeroDate = addMonths(new Date(), runwayMonths);
    }

    return {
      cashOnHand,
      rev,
      grossBurn,
      netBurn,
      profitable,
      runwayMonths,
      zeroDate,
    };
  }, [cash, revenue, expenses]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="burn-cash">
              Cash on hand
            </label>
            <input
              className="tool-input"
              id="burn-cash"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="500000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="burn-currency">
              Currency
            </label>
            <select
              className="tool-select"
              id="burn-currency"
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
            <label className="tool-label" htmlFor="burn-expenses">
              Monthly expenses (cash out)
            </label>
            <input
              className="tool-input"
              id="burn-expenses"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              placeholder="120000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="burn-revenue">
              Monthly revenue (cash in)
            </label>
            <input
              className="tool-input"
              id="burn-revenue"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              placeholder="40000"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Net monthly burn</p>
            <div className="tool-result-value">
              {result.profitable
                ? "Cash-flow positive"
                : money.format(result.netBurn)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {money.format(result.grossBurn)}
              </div>
              <div className="tool-stat-label">Gross burn / month</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.profitable ? "—" : money.format(result.netBurn)}
              </div>
              <div className="tool-stat-label">Net burn / month</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.profitable
                  ? "∞"
                  : `${monthsFmt.format(result.runwayMonths)} mo`}
              </div>
              <div className="tool-stat-label">Runway</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.profitable
                  ? "None"
                  : dateFmt.format(result.zeroDate)}
              </div>
              <div className="tool-stat-label">Cash runs out</div>
            </div>
          </div>

          {result.profitable ? (
            <p className="tool-note">
              Your monthly revenue ({money.format(result.rev)}) covers or
              exceeds your monthly expenses ({money.format(result.grossBurn)}),
              so you are not burning net cash — your runway is effectively
              unlimited at these figures. Gross burn (total money going out) is
              still {money.format(result.grossBurn)} per month, which matters if
              revenue dips.
            </p>
          ) : (
            <p className="tool-note">
              Gross burn is your total monthly cash out ({" "}
              {money.format(result.grossBurn)}). Net burn subtracts revenue:{" "}
              {money.format(result.grossBurn)} − {money.format(result.rev)} ={" "}
              {money.format(result.netBurn)} per month. Runway = cash on hand ÷
              net burn = {money.format(result.cashOnHand)} ÷{" "}
              {money.format(result.netBurn)} ≈{" "}
              {monthsFmt.format(result.runwayMonths)} months. This assumes your
              current burn and revenue stay flat; it does not model growth, one-
              off costs, or new funding.
            </p>
          )}
        </>
      ) : (
        <p className="tool-note">
          Enter your cash on hand, monthly expenses, and monthly revenue to see
          your gross burn, net burn, and how many months of runway you have.
        </p>
      )}
    </div>
  );
}
