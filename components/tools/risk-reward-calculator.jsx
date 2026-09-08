"use client";

import { useState, useMemo } from "react";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

const priceFmt = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 4,
});

function formatMoney(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return currency.format(n);
}

function formatPrice(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return priceFmt.format(n);
}

export default function RiskRewardCalculator() {
  const [direction, setDirection] = useState("long");
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("95");
  const [target, setTarget] = useState("115");
  const [accountSize, setAccountSize] = useState("10000");
  const [riskPercent, setRiskPercent] = useState("1");

  const results = useMemo(() => {
    const e = toNumber(entry);
    const s = toNumber(stop);
    const t = toNumber(target);

    if (e === null && s === null && t === null) return null;
    if (e === null || s === null || t === null) return { incomplete: true };
    if (e <= 0) return { badEntry: true };

    // Risk = distance from entry to stop; Reward = distance from entry to target.
    const riskPerShare =
      direction === "long" ? e - s : s - e;
    const rewardPerShare =
      direction === "long" ? t - e : e - t;

    const errors = [];
    if (riskPerShare <= 0) {
      errors.push(
        direction === "long"
          ? "For a long trade the stop-loss must be below the entry price."
          : "For a short trade the stop-loss must be above the entry price."
      );
    }
    if (rewardPerShare <= 0) {
      errors.push(
        direction === "long"
          ? "For a long trade the target must be above the entry price."
          : "For a short trade the target must be below the entry price."
      );
    }
    if (errors.length) return { errors };

    // Risk : reward ratio expressed as 1 : X
    const ratio = rewardPerShare / riskPerShare;
    // Break-even win rate: risk / (risk + reward)
    const breakEvenWinRate = riskPerShare / (riskPerShare + rewardPerShare);
    const riskPct = (riskPerShare / e) * 100;
    const rewardPct = (rewardPerShare / e) * 100;

    // Optional position sizing
    const acct = toNumber(accountSize);
    const rp = toNumber(riskPercent);
    let sizing = null;
    if (acct !== null && rp !== null && acct > 0 && rp > 0) {
      const dollarRisk = acct * (rp / 100);
      const shares = dollarRisk / riskPerShare;
      const positionValue = shares * e;
      const potentialProfit = shares * rewardPerShare;
      const potentialLoss = shares * riskPerShare;
      sizing = {
        dollarRisk,
        shares,
        positionValue,
        potentialProfit,
        potentialLoss,
      };
    }

    return {
      direction,
      entry: e,
      stop: s,
      target: t,
      riskPerShare,
      rewardPerShare,
      ratio,
      breakEvenWinRate,
      riskPct,
      rewardPct,
      sizing,
    };
  }, [direction, entry, stop, target, accountSize, riskPercent]);

  const ready =
    results &&
    !results.incomplete &&
    !results.badEntry &&
    !results.errors;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rrc-direction">
              Trade direction
            </label>
            <select
              className="tool-select"
              id="rrc-direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="long">Long (buy)</option>
              <option value="short">Short (sell)</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rrc-entry">
              Entry price
            </label>
            <input
              className="tool-input"
              id="rrc-entry"
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
            <label className="tool-label" htmlFor="rrc-stop">
              Stop-loss price
            </label>
            <input
              className="tool-input"
              id="rrc-stop"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 95"
              value={stop}
              onChange={(e) => setStop(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rrc-target">
              Target (take-profit) price
            </label>
            <input
              className="tool-input"
              id="rrc-target"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 115"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rrc-account">
              Account size (optional)
            </label>
            <input
              className="tool-input"
              id="rrc-account"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 10000"
              value={accountSize}
              onChange={(e) => setAccountSize(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rrc-risk">
              Risk per trade (% of account)
            </label>
            <input
              className="tool-input"
              id="rrc-risk"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
            />
          </div>
        </div>

        {ready && (
          <>
            <div className="tool-result" role="status" aria-live="polite">
              <span className="tool-result-label">Risk / reward ratio</span>
              <span className="tool-result-value">
                1 : {numberFmt.format(results.ratio)}
              </span>
            </div>

            <div className="tool-stat-grid" role="status" aria-live="polite">
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {formatPrice(results.riskPerShare)}
                </div>
                <div className="tool-stat-label">
                  Risk per share ({numberFmt.format(results.riskPct)}%)
                </div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {formatPrice(results.rewardPerShare)}
                </div>
                <div className="tool-stat-label">
                  Reward per share ({numberFmt.format(results.rewardPct)}%)
                </div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {numberFmt.format(results.breakEvenWinRate * 100)}%
                </div>
                <div className="tool-stat-label">Break-even win rate</div>
              </div>
            </div>

            {results.sizing && (
              <div className="tool-stat-grid" role="status" aria-live="polite">
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {numberFmt.format(results.sizing.shares)}
                  </div>
                  <div className="tool-stat-label">Position size (shares)</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {formatMoney(results.sizing.potentialProfit)}
                  </div>
                  <div className="tool-stat-label">Profit if target hit</div>
                </div>
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {formatMoney(results.sizing.potentialLoss)}
                  </div>
                  <div className="tool-stat-label">Loss if stop hit</div>
                </div>
              </div>
            )}

            <p className="tool-note">
              This trade risks {formatPrice(results.riskPerShare)} per share to
              make {formatPrice(results.rewardPerShare)} per share, a risk/reward
              of 1 : {numberFmt.format(results.ratio)}. To come out ahead over
              many trades at this ratio you need to win more than{" "}
              {numberFmt.format(results.breakEvenWinRate * 100)}% of the time
              (before fees and slippage).
              {results.sizing
                ? ` Risking ${formatMoney(
                    results.sizing.dollarRisk
                  )} of your account means buying about ${numberFmt.format(
                    results.sizing.shares
                  )} shares, a position worth ${formatMoney(
                    results.sizing.positionValue
                  )}.`
                : ""}
            </p>
          </>
        )}

        {results && results.errors && (
          <p className="tool-error">{results.errors.join(" ")}</p>
        )}

        {results && results.badEntry && (
          <p className="tool-error">
            Entry price must be greater than zero.
          </p>
        )}

        {(!results || results.incomplete) && (
          <p className="tool-note">
            Enter your entry price, stop-loss, and target to see the risk/reward
            ratio, the break-even win rate you need, and (if you add an account
            size and risk %) your position size.
          </p>
        )}
      </div>
    </div>
  );
}
