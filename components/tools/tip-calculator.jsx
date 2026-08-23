"use client";

import { useState, useMemo } from "react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const QUICK_TIPS = [10, 15, 18, 20, 25];

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function TipCalculator() {
  const [bill, setBill] = useState("50");
  const [tipPct, setTipPct] = useState("18");
  const [people, setPeople] = useState("2");

  const result = useMemo(() => {
    const billAmt = toNumber(bill);
    const tip = toNumber(tipPct);
    const rawPeople = toNumber(people);

    if (billAmt === null || billAmt < 0) return null;
    if (tip === null || tip < 0) return null;

    // Number of people: default to 1, must be a positive whole number.
    const count =
      rawPeople === null || rawPeople < 1
        ? 1
        : Math.floor(rawPeople);

    const tipAmount = billAmt * (tip / 100);
    const total = billAmt + tipAmount;

    return {
      tipAmount,
      total,
      count,
      perPersonTotal: total / count,
      perPersonTip: tipAmount / count,
      tip,
    };
  }, [bill, tipPct, people]);

  const activeQuick = QUICK_TIPS.find((q) => String(q) === String(tipPct));

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="tip-bill">
              Bill amount ($)
            </label>
            <input
              className="tool-input"
              id="tip-bill"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={bill}
              onChange={(e) => setBill(e.target.value)}
              placeholder="50.00"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="tip-pct">
              Tip (%)
            </label>
            <input
              className="tool-input"
              id="tip-pct"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={tipPct}
              onChange={(e) => setTipPct(e.target.value)}
              placeholder="e.g. 18"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="tip-people">
              Number of people
            </label>
            <input
              className="tool-input"
              id="tip-people"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={people}
              onChange={(e) => setPeople(e.target.value)}
              placeholder="1"
            />
          </div>
        </div>

        <div className="tool-field">
          <span className="tool-label" id="tip-quick-label">
            Quick tip %
          </span>
          <div className="tool-actions" role="group" aria-labelledby="tip-quick-label">
            {QUICK_TIPS.map((q) => (
              <button
                key={q}
                type="button"
                className={
                  "btn" + (activeQuick === q ? " btn-primary" : "")
                }
                aria-pressed={activeQuick === q}
                onClick={() => setTipPct(String(q))}
              >
                {q}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              {result.count > 1 ? "Total per person" : "Total (bill + tip)"}
            </p>
            <div className="tool-result-value">
              {usd.format(
                result.count > 1 ? result.perPersonTotal : result.total
              )}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.tipAmount)}</div>
              <div className="tool-stat-label">Tip amount ({result.tip}%)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.total)}</div>
              <div className="tool-stat-label">Grand total</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {usd.format(result.perPersonTotal)}
              </div>
              <div className="tool-stat-label">
                Per person{" "}
                {result.count > 1 ? `(÷ ${result.count})` : "(1 person)"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {usd.format(result.perPersonTip)}
              </div>
              <div className="tool-stat-label">Tip per person</div>
            </div>
          </div>

          <p className="tool-note">
            Tip = bill × tip%, total = bill + tip. Splitting {usd.format(result.total)}{" "}
            across {result.count} {result.count === 1 ? "person" : "people"} gives{" "}
            {usd.format(result.perPersonTotal)} each.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a non-negative bill amount and tip percentage to see the tip,
          total, and per-person share.
        </p>
      )}
    </div>
  );
}
