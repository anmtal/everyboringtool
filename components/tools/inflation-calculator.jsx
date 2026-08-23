"use client";

import { useMemo, useState } from "react";

export default function InflationCalculator() {
  const [amount, setAmount] = useState("100");
  const [startYear, setStartYear] = useState("2000");
  const [endYear, setEndYear] = useState("2025");
  const [rate, setRate] = useState("3");

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
    const P = parseFloat(amount);
    const y1 = parseFloat(startYear);
    const y2 = parseFloat(endYear);
    const r = parseFloat(rate);

    if (
      !Number.isFinite(P) ||
      !Number.isFinite(y1) ||
      !Number.isFinite(y2) ||
      !Number.isFinite(r)
    ) {
      return null;
    }

    if (P < 0) return null;
    // Keep years within a sensible range so the math stays meaningful.
    if (y1 < 0 || y2 < 0 || y1 > 9999 || y2 > 9999) return null;
    // A rate at or below -100% would wipe out (or invert) value entirely.
    if (r <= -100) return null;

    // Number of years between the two points. Positive => moving forward in
    // time (inflating), negative => moving backward (deflating / discounting).
    const years = y2 - y1;
    const multiplier = Math.pow(1 + r / 100, years);

    if (!Number.isFinite(multiplier)) return null;

    const equivalent = P * multiplier;
    if (!Number.isFinite(equivalent)) return null;

    // Total percentage change in price level between the two years.
    const totalChange = (multiplier - 1) * 100;

    return {
      equivalent,
      multiplier,
      totalChange,
      years,
      forward: years >= 0,
      startYear: y1,
      endYear: y2,
      original: P,
    };
  }, [amount, startYear, endYear, rate]);

  const yearsLabel =
    results && Math.abs(results.years) === 1 ? "year" : "years";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="inf-amount">
            Amount ($)
          </label>
          <input
            className="tool-input"
            id="inf-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="inf-start">
              Start year
            </label>
            <input
              className="tool-input"
              id="inf-start"
              type="number"
              inputMode="numeric"
              step="1"
              placeholder="2000"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="inf-end">
              End year
            </label>
            <input
              className="tool-input"
              id="inf-end"
              type="number"
              inputMode="numeric"
              step="1"
              placeholder="2025"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="inf-rate">
            Average annual inflation rate (%)
          </label>
          <input
            className="tool-input"
            id="inf-rate"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="3"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result">
            <p className="tool-result-label">
              EQUIVALENT VALUE IN {results.endYear}
            </p>
            <div className="tool-result-value">
              {currency.format(results.equivalent)}
            </div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {results.totalChange >= 0 ? "+" : ""}
                {results.totalChange.toLocaleString("en-US", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                %
              </div>
              <div className="tool-stat-label">Total price change</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {results.multiplier.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                &times;
              </div>
              <div className="tool-stat-label">Cumulative multiplier</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{Math.abs(results.years)}</div>
              <div className="tool-stat-label">{yearsLabel} spanned</div>
            </div>
          </div>

          <p className="tool-note">
            {results.years === 0 ? (
              <>
                The start and end years are the same, so buying power is
                unchanged.
              </>
            ) : results.forward ? (
              <>
                {currency.format(results.original)} in {results.startYear} has
                the same buying power as{" "}
                {currency.format(results.equivalent)} in {results.endYear},
                assuming {rate}% average annual inflation. Prices rose about{" "}
                {Math.abs(results.totalChange).toLocaleString("en-US", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                % over {Math.abs(results.years)} {yearsLabel}.
              </>
            ) : (
              <>
                {currency.format(results.original)} in {results.startYear} was
                worth about {currency.format(results.equivalent)} in{" "}
                {results.endYear} — earlier dollars had more buying power.
                This estimate assumes {rate}% average annual inflation.
              </>
            )}
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter an amount, a start year, an end year, and an average annual
          inflation rate to see the equivalent value and the total change in
          buying power.
        </p>
      )}
    </div>
  );
}
