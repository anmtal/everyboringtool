"use client";

import { useMemo, useState } from "react";

const FRACTIONS = [
  { label: "Full Kelly (1x)", value: "1" },
  { label: "Half Kelly (0.5x)", value: "0.5" },
  { label: "Quarter Kelly (0.25x)", value: "0.25" },
];

export default function KellyCriterionCalculator() {
  // Inputs
  const [winProb, setWinProb] = useState("55");
  const [odds, setOdds] = useState("2"); // net odds received on a win (b)
  const [bankroll, setBankroll] = useState("10000");
  const [fraction, setFraction] = useState("1");

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
    const pPct = parseFloat(winProb);
    const b = parseFloat(odds);
    const B = parseFloat(bankroll);
    const kFrac = parseFloat(fraction);

    if (
      !Number.isFinite(pPct) ||
      !Number.isFinite(b) ||
      pPct < 0 ||
      pPct > 100 ||
      b <= 0
    ) {
      return null;
    }

    const p = pPct / 100; // probability of winning
    const q = 1 - p; // probability of losing

    // Kelly fraction of bankroll to wager:
    // f* = (b*p - q) / b  =  p - q/b
    const fullKelly = (b * p - q) / b;

    // Apply the chosen fractional-Kelly multiplier (Half/Quarter etc.).
    const kMult = Number.isFinite(kFrac) && kFrac > 0 ? kFrac : 1;
    const appliedKelly = fullKelly * kMult;

    // Expected value per $1 staked: p*b - q
    const evPerUnit = p * b - q;
    const edgePct = evPerUnit * 100;

    // Stake amount (only meaningful if bankroll is a valid positive number and
    // the edge is positive; a non-positive Kelly means "don't bet").
    const hasBankroll = Number.isFinite(B) && B > 0;
    const stakeFraction = Math.max(0, appliedKelly);
    const stake = hasBankroll ? B * stakeFraction : null;

    return {
      p,
      b,
      fullKelly,
      appliedKelly,
      kMult,
      evPerUnit,
      edgePct,
      stake,
      hasBankroll,
    };
  }, [winProb, odds, bankroll, fraction]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="kelly-prob">
              Win probability (%)
            </label>
            <input
              className="tool-input"
              id="kelly-prob"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="any"
              placeholder="55"
              value={winProb}
              onChange={(e) => setWinProb(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="kelly-odds">
              Net odds on a win (b)
            </label>
            <input
              className="tool-input"
              id="kelly-odds"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="2"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="kelly-bankroll">
              Bankroll ($)
            </label>
            <input
              className="tool-input"
              id="kelly-bankroll"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="10000"
              value={bankroll}
              onChange={(e) => setBankroll(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="kelly-fraction">
              Kelly fraction
            </label>
            <select
              className="tool-select"
              id="kelly-fraction"
              value={fraction}
              onChange={(e) => setFraction(e.target.value)}
            >
              {FRACTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="tool-note">
          Net odds <strong>b</strong> is the profit per $1 risked if you win.
          Even money = 1, 3-to-1 = 3, decimal odds 2.50 = 1.50. For investing,
          use your average win/loss ratio (avg win ÷ avg loss).
        </p>
      </div>

      {results ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              {results.appliedKelly > 0
                ? "SUGGESTED STAKE (% OF BANKROLL)"
                : "KELLY SAYS: DO NOT BET"}
            </p>
            <div className="tool-result-value">
              {results.appliedKelly > 0
                ? `${(results.appliedKelly * 100).toFixed(2)}%`
                : "0%"}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {(results.fullKelly * 100).toFixed(2)}%
              </div>
              <div className="tool-stat-label">Full Kelly</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {results.hasBankroll && results.stake !== null
                  ? currency.format(results.stake)
                  : "—"}
              </div>
              <div className="tool-stat-label">
                Stake ({results.kMult}x Kelly)
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {results.edgePct >= 0 ? "+" : ""}
                {results.edgePct.toFixed(1)}%
              </div>
              <div className="tool-stat-label">Edge per $1 staked</div>
            </div>
          </div>

          {results.fullKelly <= 0 ? (
            <p className="tool-note">
              With these inputs the bet has no positive edge, so the Kelly
              criterion recommends staking nothing. Increase the win probability
              or the payout odds to see a positive stake.
            </p>
          ) : (
            <p className="tool-note">
              Full Kelly maximises long-run growth but is highly volatile — many
              practitioners use Half or Quarter Kelly to cut swings. This is an
              estimate based on your inputs; real win probabilities are rarely
              known exactly, and overestimating them causes over-betting.
            </p>
          )}
        </>
      ) : (
        <p className="tool-note">
          Enter a win probability between 0 and 100% and net odds greater than 0
          to see the Kelly-optimal stake.
        </p>
      )}
    </div>
  );
}
