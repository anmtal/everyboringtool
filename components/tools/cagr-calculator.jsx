"use client";

import { useMemo, useState } from "react";

export default function CagrCalculator() {
  const [beginValue, setBeginValue] = useState("10000");
  const [endValue, setEndValue] = useState("25000");
  const [years, setYears] = useState("5");

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const results = useMemo(() => {
    const begin = parseFloat(beginValue);
    const end = parseFloat(endValue);
    const t = parseFloat(years);

    if (
      !Number.isFinite(begin) ||
      !Number.isFinite(end) ||
      !Number.isFinite(t)
    ) {
      return null;
    }

    if (begin <= 0) {
      return { error: "Beginning value must be greater than zero." };
    }
    if (end < 0) {
      return { error: "Ending value cannot be negative." };
    }
    if (t <= 0) {
      return { error: "Number of years must be greater than zero." };
    }

    // Compound Annual Growth Rate: the constant yearly rate that turns the
    // beginning value into the ending value over the given period.
    const cagr = Math.pow(end / begin, 1 / t) - 1;
    const totalReturn = end / begin - 1;
    const gain = end - begin;

    if (!Number.isFinite(cagr)) return null;

    // Year-by-year path implied by the CAGR (each year grows by the same rate).
    const schedule = [];
    const wholeYears = Math.min(Math.floor(t), 30);
    for (let y = 1; y <= wholeYears; y++) {
      schedule.push({
        year: y,
        value: begin * Math.pow(1 + cagr, y),
      });
    }
    // Always include the final (possibly fractional) point.
    if (schedule.length === 0 || schedule[schedule.length - 1].year !== t) {
      schedule.push({ year: t, value: end, final: true });
    }

    return { cagr, totalReturn, gain, begin, end, t, schedule };
  }, [beginValue, endValue, years]);

  const pct = (v) =>
    `${(v * 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;

  const formatYear = (y) =>
    Number.isInteger(y) ? `Year ${y}` : `Year ${y.toFixed(2)}`;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cagr-begin">
              Beginning value ($)
            </label>
            <input
              className="tool-input"
              id="cagr-begin"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="10000"
              value={beginValue}
              onChange={(e) => setBeginValue(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="cagr-end">
              Ending value ($)
            </label>
            <input
              className="tool-input"
              id="cagr-end"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="25000"
              value={endValue}
              onChange={(e) => setEndValue(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="cagr-years">
              Number of years
            </label>
            <input
              className="tool-input"
              id="cagr-years"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="5"
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>
        </div>
      </div>

      {results && !results.error ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">CAGR (COMPOUND ANNUAL GROWTH RATE)</p>
            <div className="tool-result-value">{pct(results.cagr)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{pct(results.totalReturn)}</div>
              <div className="tool-stat-label">Total return</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{currency.format(results.gain)}</div>
              <div className="tool-stat-label">Total gain</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {results.t.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="tool-stat-label">Years</div>
            </div>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">GROWTH PATH AT THIS CAGR</p>
            <pre className="tool-output">
              {results.schedule
                .map(
                  (s) =>
                    `${formatYear(s.year).padEnd(12)} ${currency.format(
                      s.value
                    )}`
                )
                .join("\n")}
            </pre>
          </div>

          <p className="tool-note">
            CAGR is the single yearly rate that would grow {currency.format(
              results.begin
            )}{" "}
            into {currency.format(results.end)} over{" "}
            {results.t.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
            years, formula: (End / Begin) ^ (1 / years) − 1. It smooths out
            year-to-year ups and downs and ignores any deposits, withdrawals,
            taxes, or inflation during the period.
          </p>
        </>
      ) : results && results.error ? (
        <p className="tool-error" role="status" aria-live="polite">
          {results.error}
        </p>
      ) : (
        <p className="tool-note">
          Enter a beginning value, an ending value, and the number of years to
          calculate the compound annual growth rate.
        </p>
      )}
    </div>
  );
}
