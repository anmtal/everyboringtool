"use client";

import { useState, useMemo } from "react";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function makeCurrency(code) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

const unitsFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 4,
});

const priceFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 6,
});

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR", "CHF"];

export default function PositionSizeCalculator() {
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [account, setAccount] = useState("10000");
  const [riskMode, setRiskMode] = useState("percent"); // "percent" | "amount"
  const [riskPercent, setRiskPercent] = useState("1");
  const [riskAmount, setRiskAmount] = useState("100");
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("95");

  const money = useMemo(() => makeCurrency(currencyCode), [currencyCode]);
  const formatMoney = (n) =>
    n === null || n === undefined || !Number.isFinite(n) ? "—" : money.format(n);

  const results = useMemo(() => {
    const acc = toNumber(account);
    const rp = toNumber(riskPercent);
    const ra = toNumber(riskAmount);
    const e = toNumber(entry);
    const s = toNumber(stop);

    const anyInput =
      acc !== null || rp !== null || ra !== null || e !== null || s !== null;
    if (!anyInput) return null;

    // Determine the amount to risk on this trade.
    let riskCash = null;
    let riskPctResolved = null;
    if (riskMode === "percent") {
      if (rp === null || acc === null) return { incomplete: true };
      if (rp < 0 || acc <= 0) return { invalid: true };
      riskCash = acc * (rp / 100);
      riskPctResolved = rp;
    } else {
      if (ra === null) return { incomplete: true };
      if (ra < 0) return { invalid: true };
      riskCash = ra;
      riskPctResolved = acc && acc > 0 ? (ra / acc) * 100 : null;
    }

    if (e === null || s === null) return { incomplete: true };
    if (e <= 0 || s < 0) return { invalid: true };

    const perUnitRisk = Math.abs(e - s);
    if (perUnitRisk === 0) {
      return { sameStop: true, riskCash };
    }
    if (riskCash <= 0) {
      return { zeroRisk: true, riskCash };
    }

    const direction = e > s ? "long" : "short";
    const positionSize = riskCash / perUnitRisk; // units / shares
    const positionValue = positionSize * e;
    const stopDistancePct = (perUnitRisk / e) * 100;
    const leverage = acc && acc > 0 ? positionValue / acc : null;

    return {
      account: acc,
      riskCash,
      riskPctResolved,
      entry: e,
      stop: s,
      perUnitRisk,
      positionSize,
      positionValue,
      stopDistancePct,
      leverage,
      direction,
    };
  }, [account, riskMode, riskPercent, riskAmount, entry, stop]);

  const ready =
    results &&
    !results.incomplete &&
    !results.invalid &&
    !results.sameStop &&
    !results.zeroRisk;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="psc-account">
              Account balance
            </label>
            <input
              className="tool-input"
              id="psc-account"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 10000"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="psc-currency">
              Currency
            </label>
            <select
              className="tool-select"
              id="psc-currency"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="psc-riskmode">
              Risk per trade as
            </label>
            <select
              className="tool-select"
              id="psc-riskmode"
              value={riskMode}
              onChange={(e) => setRiskMode(e.target.value)}
            >
              <option value="percent">% of account</option>
              <option value="amount">Fixed amount</option>
            </select>
          </div>
          {riskMode === "percent" ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="psc-riskpct">
                Risk per trade (%)
              </label>
              <input
                className="tool-input"
                id="psc-riskpct"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="e.g. 1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
              />
            </div>
          ) : (
            <div className="tool-field">
              <label className="tool-label" htmlFor="psc-riskamt">
                Risk per trade (amount)
              </label>
              <input
                className="tool-input"
                id="psc-riskamt"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="e.g. 100"
                value={riskAmount}
                onChange={(e) => setRiskAmount(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="psc-entry">
              Entry price
            </label>
            <input
              className="tool-input"
              id="psc-entry"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 100"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="psc-stop">
              Stop-loss price
            </label>
            <input
              className="tool-input"
              id="psc-stop"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 95"
              value={stop}
              onChange={(e) => setStop(e.target.value)}
            />
          </div>
        </div>

        {ready && (
          <>
            <div className="tool-result" role="status" aria-live="polite">
              <span className="tool-result-label">Position size</span>
              <span className="tool-result-value">
                {unitsFmt.format(results.positionSize)} units
              </span>
            </div>

            <div className="tool-stat-grid" role="status" aria-live="polite">
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {formatMoney(results.riskCash)}
                </div>
                <div className="tool-stat-label">
                  Amount at risk
                  {results.riskPctResolved !== null
                    ? ` (${unitsFmt.format(results.riskPctResolved)}%)`
                    : ""}
                </div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {formatMoney(results.positionValue)}
                </div>
                <div className="tool-stat-label">Position value</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {formatMoney(results.perUnitRisk)}
                </div>
                <div className="tool-stat-label">Risk per unit</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {unitsFmt.format(results.stopDistancePct)}%
                </div>
                <div className="tool-stat-label">Stop distance</div>
              </div>
              {results.leverage !== null && (
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {unitsFmt.format(results.leverage)}×
                  </div>
                  <div className="tool-stat-label">Position / account</div>
                </div>
              )}
            </div>

            <p className="tool-note">
              This is a {results.direction} setup. Buying{" "}
              {unitsFmt.format(results.positionSize)} units at{" "}
              {priceFmt.format(results.entry)} risks{" "}
              {formatMoney(results.perUnitRisk)} per unit down to your stop at{" "}
              {priceFmt.format(results.stop)}, for a total loss of{" "}
              {formatMoney(results.riskCash)} if the stop is hit. Round down to a
              whole number of shares or lots your broker allows — never up.
            </p>
          </>
        )}

        {results && results.sameStop && (
          <p className="tool-error">
            Your entry price and stop-loss price are the same, so there is no
            distance to risk. Set a stop-loss above or below your entry to size
            the position.
          </p>
        )}

        {results && results.zeroRisk && (
          <p className="tool-error">
            The amount you are risking works out to zero. Increase your risk
            percentage or risk amount to size a position.
          </p>
        )}

        {results && results.invalid && (
          <p className="tool-error">
            Please enter positive numbers. Account balance and entry price must
            be greater than zero, and risk values cannot be negative.
          </p>
        )}

        {(!results || results.incomplete) && (
          <p className="tool-note">
            Enter your account balance, how much you want to risk on the trade,
            your entry price, and your stop-loss price to see the exact position
            size that keeps your loss within that risk.
          </p>
        )}
      </div>
    </div>
  );
}
