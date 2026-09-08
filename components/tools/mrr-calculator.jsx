"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

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

// Factor to convert one billing charge into its monthly-equivalent value.
const CYCLES = [
  { code: "monthly", label: "Monthly", factor: 1 },
  { code: "quarterly", label: "Quarterly", factor: 1 / 3 },
  { code: "biannual", label: "Every 6 months", factor: 1 / 6 },
  { code: "annual", label: "Annual", factor: 1 / 12 },
];

function makeMoney(code, decimals) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch (e) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
}

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

let idSeq = 4;
function newId() {
  idSeq += 1;
  return idSeq;
}

export default function MrrCalculator() {
  const [currency, setCurrency] = useState("USD");
  const [plans, setPlans] = useState([
    { id: 1, name: "Starter", price: "19", cycle: "monthly", customers: "120" },
    { id: 2, name: "Pro", price: "49", cycle: "monthly", customers: "60" },
    { id: 3, name: "Business", price: "990", cycle: "annual", customers: "15" },
  ]);
  const [copied, setCopied] = useState(false);

  const money = useMemo(() => makeMoney(currency, 2), [currency]);
  const money0 = useMemo(() => makeMoney(currency, 0), [currency]);

  const updatePlan = (id, field, value) => {
    setCopied(false);
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const addPlan = () => {
    setCopied(false);
    setPlans((prev) => [
      ...prev,
      { id: newId(), name: "", price: "", cycle: "monthly", customers: "" },
    ]);
  };

  const removePlan = (id) => {
    setCopied(false);
    setPlans((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  };

  const result = useMemo(() => {
    const rows = plans.map((p) => {
      const price = toNumber(p.price);
      const customers = toNumber(p.customers);
      const cycle = CYCLES.find((c) => c.code === p.cycle) || CYCLES[0];
      const valid =
        price !== null && price >= 0 && customers !== null && customers >= 0;
      const monthlyPerCustomer = valid ? price * cycle.factor : 0;
      const planMrr = valid ? monthlyPerCustomer * customers : 0;
      return {
        ...p,
        cycleLabel: cycle.label,
        monthlyPerCustomer,
        planMrr,
        customersNum: valid ? customers : 0,
        valid,
      };
    });

    const totalMrr = rows.reduce((s, r) => s + r.planMrr, 0);
    const totalCustomers = rows.reduce((s, r) => s + r.customersNum, 0);
    const arr = totalMrr * 12;
    const arpa = totalCustomers > 0 ? totalMrr / totalCustomers : 0;
    const anyValid = rows.some((r) => r.valid && r.planMrr > 0);

    return { rows, totalMrr, totalCustomers, arr, arpa, anyValid };
  }, [plans]);

  const handleCopy = async () => {
    const lines = [];
    lines.push("MRR breakdown");
    result.rows.forEach((r) => {
      if (!r.valid) return;
      const label = r.name || "(unnamed plan)";
      lines.push(
        `${label} — ${intFmt.format(r.customersNum)} × ${money.format(
          r.monthlyPerCustomer
        )}/mo = ${money.format(r.planMrr)}/mo`
      );
    });
    lines.push("");
    lines.push(`Total MRR: ${money.format(result.totalMrr)}`);
    lines.push(`ARR (MRR × 12): ${money.format(result.arr)}`);
    lines.push(`Customers: ${intFmt.format(result.totalCustomers)}`);
    lines.push(`ARPA (MRR ÷ customers): ${money.format(result.arpa)}`);
    try {
      await copyText(lines.join("\n"));
      setCopied(true);
    } catch (e) {
      setCopied(false);
    }
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="mrr-currency">
              Currency
            </label>
            <select
              className="tool-select"
              id="mrr-currency"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setCopied(false);
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {plans.map((p, i) => (
          <div className="tool-row" key={p.id}>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`mrr-name-${p.id}`}>
                Plan name
              </label>
              <input
                className="tool-input"
                id={`mrr-name-${p.id}`}
                type="text"
                value={p.name}
                onChange={(e) => updatePlan(p.id, "name", e.target.value)}
                placeholder={`Plan ${i + 1}`}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`mrr-price-${p.id}`}>
                Price per customer
              </label>
              <input
                className="tool-input"
                id={`mrr-price-${p.id}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={p.price}
                onChange={(e) => updatePlan(p.id, "price", e.target.value)}
                placeholder="49"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`mrr-cycle-${p.id}`}>
                Billing cycle
              </label>
              <select
                className="tool-select"
                id={`mrr-cycle-${p.id}`}
                value={p.cycle}
                onChange={(e) => updatePlan(p.id, "cycle", e.target.value)}
              >
                {CYCLES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`mrr-cust-${p.id}`}>
                Customers
              </label>
              <input
                className="tool-input"
                id={`mrr-cust-${p.id}`}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={p.customers}
                onChange={(e) => updatePlan(p.id, "customers", e.target.value)}
                placeholder="60"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`mrr-plan-mrr-${p.id}`}>
                Plan MRR
              </label>
              <input
                className="tool-input"
                id={`mrr-plan-mrr-${p.id}`}
                type="text"
                readOnly
                value={money.format(result.rows[i].planMrr)}
                aria-label={`Monthly recurring revenue for ${p.name || `plan ${i + 1}`}`}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`mrr-remove-${p.id}`}>
                &nbsp;
              </label>
              <button
                type="button"
                id={`mrr-remove-${p.id}`}
                className="btn"
                onClick={() => removePlan(p.id)}
                disabled={plans.length <= 1}
                aria-label={`Remove ${p.name || `plan ${i + 1}`}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={addPlan}>
          + Add plan
        </button>
        <button
          type="button"
          className={copied ? "btn btn-success" : "btn"}
          onClick={handleCopy}
          disabled={!result.anyValid}
        >
          {copied ? "Copied!" : "Copy breakdown"}
        </button>
      </div>

      {result.anyValid ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Total Monthly Recurring Revenue (MRR)</p>
            <div className="tool-result-value">{money.format(result.totalMrr)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{money0.format(result.arr)}</div>
              <div className="tool-stat-label">ARR (MRR × 12)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {intFmt.format(result.totalCustomers)}
              </div>
              <div className="tool-stat-label">Total customers</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money.format(result.arpa)}</div>
              <div className="tool-stat-label">ARPA (avg / customer)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{intFmt.format(plans.length)}</div>
              <div className="tool-stat-label">Plans</div>
            </div>
          </div>

          <p className="tool-note">
            Annual, quarterly and 6-month plans are normalized to their
            monthly-equivalent value before adding up, so a {money0.format(990)}
            /year plan counts as {money.format(990 / 12)}/month of MRR. MRR here
            is the recurring subscription revenue only — exclude one-time setup
            fees, usage overages and taxes for a clean number. ARR is simply MRR
            × 12, and ARPA is total MRR ÷ total customers.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Add at least one plan with a price and customer count to calculate your
          MRR. Mix monthly and annual plans freely — the tool converts each to a
          monthly-equivalent value automatically.
        </p>
      )}
    </div>
  );
}
