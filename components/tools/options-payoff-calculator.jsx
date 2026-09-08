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

const currency0 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function money(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return currency.format(n);
}

let legId = 0;
function newLeg(partial) {
  legId += 1;
  return {
    id: `leg-${legId}`,
    type: "call",
    position: "long",
    strike: "",
    premium: "",
    qty: "1",
    ...partial,
  };
}

// Payoff (profit/loss) of a single leg at expiration for underlying price s.
function legPayoff(leg, s, contractSize) {
  const strike = toNumber(leg.strike);
  const premium = toNumber(leg.premium);
  const qty = toNumber(leg.qty);
  if (strike === null || premium === null || qty === null) return 0;
  const intrinsic =
    leg.type === "call" ? Math.max(s - strike, 0) : Math.max(strike - s, 0);
  const perShare =
    leg.position === "long" ? intrinsic - premium : premium - intrinsic;
  return perShare * qty * contractSize;
}

export default function OptionsPayoffCalculator() {
  const [contractSize, setContractSize] = useState("100");
  const [spot, setSpot] = useState("100");
  const [legs, setLegs] = useState(() => [
    newLeg({ type: "call", position: "long", strike: "105", premium: "2.50", qty: "1" }),
  ]);

  const cs = useMemo(() => {
    const n = toNumber(contractSize);
    return n && n > 0 ? n : 100;
  }, [contractSize]);

  const validLegs = useMemo(
    () =>
      legs.filter(
        (l) =>
          toNumber(l.strike) !== null &&
          toNumber(l.premium) !== null &&
          toNumber(l.qty) !== null &&
          toNumber(l.qty) > 0
      ),
    [legs]
  );

  const analysis = useMemo(() => {
    if (validLegs.length === 0) return null;

    const strikes = validLegs.map((l) => toNumber(l.strike));
    const minK = Math.min(...strikes);
    const maxK = Math.max(...strikes);
    // Chart / scan range: pad around strikes, always start at 0.
    const pad = Math.max(maxK * 0.5, (maxK - minK) * 1.5, 10);
    const hi = maxK + pad;
    const lo = 0;

    const steps = 480;
    const dx = (hi - lo) / steps;
    const points = [];
    for (let i = 0; i <= steps; i += 1) {
      const s = lo + dx * i;
      let p = 0;
      for (const leg of validLegs) p += legPayoff(leg, s, cs);
      points.push({ s, p });
    }

    // Net premium (debit positive = you pay, credit negative = you receive).
    let netCost = 0;
    for (const leg of validLegs) {
      const premium = toNumber(leg.premium);
      const qty = toNumber(leg.qty);
      const sign = leg.position === "long" ? 1 : -1;
      netCost += sign * premium * qty * cs;
    }

    // Max profit / loss over scan, plus unbounded detection from edge slopes.
    let maxP = -Infinity;
    let minP = Infinity;
    for (const pt of points) {
      if (pt.p > maxP) maxP = pt.p;
      if (pt.p < minP) minP = pt.p;
    }
    const leftSlope = points[1].p - points[0].p;
    const rightSlope =
      points[points.length - 1].p - points[points.length - 2].p;
    // As price -> infinity (right) and price -> 0 (left, bounded floor at 0).
    const profitUnlimited = rightSlope > 1e-6;
    // Downside "unlimited" would require rising price too; to the left price
    // is floored at 0 so the loss there is finite. A short-heavy position can
    // still lose without bound to the upside.
    const lossUnlimited = rightSlope < -1e-6;

    // Breakevens: sign changes of p across the grid, linearly interpolated.
    const breakevens = [];
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      if ((a.p <= 0 && b.p > 0) || (a.p >= 0 && b.p < 0)) {
        const t = a.p / (a.p - b.p);
        const be = a.s + t * (b.s - a.s);
        if (be >= 0) breakevens.push(be);
      }
    }
    // De-duplicate near-identical breakevens.
    const dedup = [];
    for (const be of breakevens) {
      if (!dedup.some((x) => Math.abs(x - be) < dx * 1.5)) dedup.push(be);
    }

    // P/L at the user's chosen expiration price.
    const sVal = toNumber(spot);
    let atSpot = null;
    if (sVal !== null && sVal >= 0) {
      let p = 0;
      for (const leg of validLegs) p += legPayoff(leg, sVal, cs);
      atSpot = { s: sVal, p };
    }

    return {
      points,
      lo,
      hi,
      minK,
      maxK,
      netCost,
      maxProfit: profitUnlimited ? Infinity : maxP,
      maxLoss: lossUnlimited ? -Infinity : minP,
      profitUnlimited,
      lossUnlimited,
      breakevens: dedup.sort((a, b) => a - b),
      atSpot,
    };
  }, [validLegs, cs, spot]);

  // Build an SVG payoff diagram from the computed points.
  const chart = useMemo(() => {
    if (!analysis) return null;
    const W = 640;
    const H = 260;
    const padL = 56;
    const padR = 16;
    const padT = 16;
    const padB = 28;
    const { points, lo, hi } = analysis;

    let yMin = Infinity;
    let yMax = -Infinity;
    for (const pt of points) {
      if (pt.p < yMin) yMin = pt.p;
      if (pt.p > yMax) yMax = pt.p;
    }
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }
    const yPad = (yMax - yMin) * 0.1 || 1;
    yMin -= yPad;
    yMax += yPad;

    const xTo = (s) =>
      padL + ((s - lo) / (hi - lo)) * (W - padL - padR);
    const yTo = (p) =>
      padT + (1 - (p - yMin) / (yMax - yMin)) * (H - padT - padB);

    // Split path into profit (>=0) and loss (<0) segments for two-color fill.
    const line = points
      .map((pt, i) => `${i === 0 ? "M" : "L"}${xTo(pt.s).toFixed(1)},${yTo(pt.p).toFixed(1)}`)
      .join(" ");

    const zeroY = yTo(0);
    const zeroInRange = yMin < 0 && yMax > 0;

    return { W, H, padL, padR, padT, padB, xTo, yTo, line, zeroY, zeroInRange, yMin, yMax };
  }, [analysis]);

  function updateLeg(id, patch) {
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLeg(id) {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  }
  function addLeg() {
    setLegs((prev) => [...prev, newLeg({ strike: "", premium: "", qty: "1" })]);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="opc-spot">
              Underlying price at expiration
            </label>
            <input
              className="tool-input"
              id="opc-spot"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 100"
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="opc-cs">
              Contract multiplier
            </label>
            <input
              className="tool-input"
              id="opc-cs"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              placeholder="100"
              value={contractSize}
              onChange={(e) => setContractSize(e.target.value)}
            />
          </div>
        </div>

        <p className="tool-note">
          Add one leg per option. Premium is the price per share (per contract it
          is multiplied by the contract multiplier, usually 100). Buy = you pay
          the premium; Sell = you collect it.
        </p>

        {legs.map((leg, idx) => (
          <div className="tool-row" key={leg.id}>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`${leg.id}-pos`}>
                {`Leg ${idx + 1}: action`}
              </label>
              <select
                className="tool-select"
                id={`${leg.id}-pos`}
                value={leg.position}
                onChange={(e) => updateLeg(leg.id, { position: e.target.value })}
              >
                <option value="long">Buy (long)</option>
                <option value="short">Sell (short)</option>
              </select>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`${leg.id}-type`}>
                Type
              </label>
              <select
                className="tool-select"
                id={`${leg.id}-type`}
                value={leg.type}
                onChange={(e) => updateLeg(leg.id, { type: e.target.value })}
              >
                <option value="call">Call</option>
                <option value="put">Put</option>
              </select>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`${leg.id}-strike`}>
                Strike
              </label>
              <input
                className="tool-input"
                id={`${leg.id}-strike`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="105"
                value={leg.strike}
                onChange={(e) => updateLeg(leg.id, { strike: e.target.value })}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`${leg.id}-prem`}>
                Premium
              </label>
              <input
                className="tool-input"
                id={`${leg.id}-prem`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="2.50"
                value={leg.premium}
                onChange={(e) => updateLeg(leg.id, { premium: e.target.value })}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`${leg.id}-qty`}>
                Contracts
              </label>
              <input
                className="tool-input"
                id={`${leg.id}-qty`}
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="1"
                value={leg.qty}
                onChange={(e) => updateLeg(leg.id, { qty: e.target.value })}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor={`${leg.id}-rm`}>
                &nbsp;
              </label>
              <button
                className="btn"
                id={`${leg.id}-rm`}
                type="button"
                onClick={() => removeLeg(leg.id)}
                disabled={legs.length <= 1}
                aria-label={`Remove leg ${idx + 1}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="tool-actions">
          <button className="btn btn-primary" type="button" onClick={addLeg}>
            + Add leg
          </button>
        </div>

        {analysis ? (
          <>
            {analysis.atSpot && (
              <div className="tool-result" role="status" aria-live="polite">
                <span className="tool-result-label">
                  Profit / loss at{" "}
                  {money(analysis.atSpot.s)} underlying
                </span>
                <span className="tool-result-value">
                  {analysis.atSpot.p >= 0 ? "+" : "−"}
                  {money(Math.abs(analysis.atSpot.p))}
                </span>
              </div>
            )}

            <div className="tool-stat-grid" role="status" aria-live="polite">
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {analysis.profitUnlimited
                    ? "Unlimited"
                    : money(analysis.maxProfit)}
                </div>
                <div className="tool-stat-label">Max profit</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {analysis.lossUnlimited
                    ? "Unlimited"
                    : money(analysis.maxLoss)}
                </div>
                <div className="tool-stat-label">Max loss</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {analysis.netCost >= 0
                    ? `${money(analysis.netCost)}`
                    : `${money(Math.abs(analysis.netCost))}`}
                </div>
                <div className="tool-stat-label">
                  {analysis.netCost >= 0 ? "Net debit (you pay)" : "Net credit (you receive)"}
                </div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {analysis.breakevens.length === 0
                    ? "—"
                    : analysis.breakevens
                        .map((b) => currency.format(b))
                        .join(", ")}
                </div>
                <div className="tool-stat-label">
                  Breakeven{analysis.breakevens.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            {chart && (
              <div className="tool-result">
                <span className="tool-result-label">
                  Payoff at expiration
                </span>
                <svg
                  viewBox={`0 0 ${chart.W} ${chart.H}`}
                  width="100%"
                  role="img"
                  aria-label="Payoff diagram: profit and loss versus underlying price at expiration"
                  style={{ maxWidth: "100%", height: "auto" }}
                >
                  {/* zero P/L line */}
                  {chart.zeroInRange && (
                    <line
                      x1={chart.padL}
                      y1={chart.zeroY}
                      x2={chart.W - chart.padR}
                      y2={chart.zeroY}
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                      opacity="0.45"
                    />
                  )}
                  {/* axes */}
                  <line
                    x1={chart.padL}
                    y1={chart.padT}
                    x2={chart.padL}
                    y2={chart.H - chart.padB}
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.35"
                  />
                  <line
                    x1={chart.padL}
                    y1={chart.H - chart.padB}
                    x2={chart.W - chart.padR}
                    y2={chart.H - chart.padB}
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.35"
                  />
                  {/* breakeven markers */}
                  {analysis.breakevens.map((b, i) => (
                    <line
                      key={i}
                      x1={chart.xTo(b)}
                      y1={chart.padT}
                      x2={chart.xTo(b)}
                      y2={chart.H - chart.padB}
                      stroke="currentColor"
                      strokeDasharray="2 3"
                      strokeWidth="1"
                      opacity="0.4"
                    />
                  ))}
                  {/* current expiration price marker */}
                  {analysis.atSpot &&
                    analysis.atSpot.s >= analysis.lo &&
                    analysis.atSpot.s <= analysis.hi && (
                      <line
                        x1={chart.xTo(analysis.atSpot.s)}
                        y1={chart.padT}
                        x2={chart.xTo(analysis.atSpot.s)}
                        y2={chart.H - chart.padB}
                        stroke="currentColor"
                        strokeWidth="1.5"
                        opacity="0.6"
                      />
                    )}
                  {/* payoff line */}
                  <path
                    d={chart.line}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  {/* y-axis labels */}
                  <text
                    x={chart.padL - 6}
                    y={chart.padT + 8}
                    textAnchor="end"
                    fontSize="11"
                    fill="currentColor"
                    opacity="0.7"
                  >
                    {currency0.format(chart.yMax)}
                  </text>
                  <text
                    x={chart.padL - 6}
                    y={chart.H - chart.padB}
                    textAnchor="end"
                    fontSize="11"
                    fill="currentColor"
                    opacity="0.7"
                  >
                    {currency0.format(chart.yMin)}
                  </text>
                  {/* x-axis labels */}
                  <text
                    x={chart.padL}
                    y={chart.H - chart.padB + 18}
                    textAnchor="start"
                    fontSize="11"
                    fill="currentColor"
                    opacity="0.7"
                  >
                    {currency0.format(analysis.lo)}
                  </text>
                  <text
                    x={chart.W - chart.padR}
                    y={chart.H - chart.padB + 18}
                    textAnchor="end"
                    fontSize="11"
                    fill="currentColor"
                    opacity="0.7"
                  >
                    {currency0.format(analysis.hi)}
                  </text>
                </svg>
                <p className="tool-note">
                  Horizontal axis: underlying price at expiration. Vertical axis:
                  total profit or loss. Dashed vertical lines mark breakeven
                  prices; the solid vertical line marks your chosen expiration
                  price.
                </p>
              </div>
            )}

            <p className="tool-note">
              This is the payoff at expiration only — it ignores time value,
              implied volatility, early assignment, dividends, commissions and
              taxes, so it is not a live option price. American options can be
              assigned before expiration. Values assume every leg is on the same
              underlying and expiration date.
            </p>
          </>
        ) : (
          <p className="tool-note">
            Enter at least one option leg with a strike, premium and number of
            contracts to see the payoff diagram, breakeven price, and maximum
            profit and loss.
          </p>
        )}
      </div>
    </div>
  );
}
