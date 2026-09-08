"use client";

import { useMemo, useState } from "react";

// Standard normal probability density function.
function normPdf(x) {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
}

// Standard normal cumulative distribution function via the
// Abramowitz & Stegun 7.1.26 error-function approximation
// (accurate to ~1e-7, well beyond what an options quote needs).
function normCdf(x) {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * z);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

export default function BlackScholesCalculator() {
  const [type, setType] = useState("call");
  const [spot, setSpot] = useState("100");
  const [strike, setStrike] = useState("100");
  const [days, setDays] = useState("30");
  const [rate, setRate] = useState("4.5");
  const [vol, setVol] = useState("25");
  const [dividend, setDividend] = useState("0");

  const money = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const num = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }),
    []
  );

  const result = useMemo(() => {
    const S = parseFloat(spot);
    const K = parseFloat(strike);
    const T = parseFloat(days) / 365;
    const r = parseFloat(rate) / 100;
    const sigma = parseFloat(vol) / 100;
    const q = parseFloat(dividend) / 100;

    if (
      !Number.isFinite(S) ||
      !Number.isFinite(K) ||
      !Number.isFinite(T) ||
      !Number.isFinite(r) ||
      !Number.isFinite(sigma) ||
      !Number.isFinite(q) ||
      S <= 0 ||
      K <= 0 ||
      T <= 0 ||
      sigma <= 0
    ) {
      return null;
    }

    const sqrtT = Math.sqrt(T);
    const d1 =
      (Math.log(S / K) + (r - q + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
    const d2 = d1 - sigma * sqrtT;

    const Nd1 = normCdf(d1);
    const Nd2 = normCdf(d2);
    const Nnd1 = normCdf(-d1);
    const Nnd2 = normCdf(-d2);
    const pdfd1 = normPdf(d1);

    const eqt = Math.exp(-q * T);
    const ert = Math.exp(-r * T);

    const isCall = type === "call";

    const price = isCall
      ? S * eqt * Nd1 - K * ert * Nd2
      : K * ert * Nnd2 - S * eqt * Nnd1;

    // Greeks. Theta and rho are expressed per-year, then also per-day for theta.
    const delta = isCall ? eqt * Nd1 : -eqt * Nnd1;

    const gamma = (eqt * pdfd1) / (S * sigma * sqrtT);

    // Vega per 1% (0.01) change in volatility.
    const vega = (S * eqt * pdfd1 * sqrtT) / 100;

    const thetaAnnual = isCall
      ? -(S * eqt * pdfd1 * sigma) / (2 * sqrtT) -
        r * K * ert * Nd2 +
        q * S * eqt * Nd1
      : -(S * eqt * pdfd1 * sigma) / (2 * sqrtT) +
        r * K * ert * Nnd2 -
        q * S * eqt * Nnd1;
    const thetaDaily = thetaAnnual / 365;

    // Rho per 1% (0.01) change in the interest rate.
    const rho = isCall
      ? (K * T * ert * Nd2) / 100
      : (-K * T * ert * Nnd2) / 100;

    if (!Number.isFinite(price)) return null;

    return {
      price,
      d1,
      d2,
      delta,
      gamma,
      vega,
      thetaDaily,
      rho,
    };
  }, [type, spot, strike, days, rate, vol, dividend]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="bs-type">
            Option type
          </label>
          <select
            className="tool-select"
            id="bs-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bs-spot">
              Spot price (S)
            </label>
            <input
              className="tool-input"
              id="bs-spot"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="100"
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="bs-strike">
              Strike price (K)
            </label>
            <input
              className="tool-input"
              id="bs-strike"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="100"
              value={strike}
              onChange={(e) => setStrike(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bs-days">
              Days to expiration
            </label>
            <input
              className="tool-input"
              id="bs-days"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="30"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="bs-vol">
              Volatility (% annual)
            </label>
            <input
              className="tool-input"
              id="bs-vol"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="25"
              value={vol}
              onChange={(e) => setVol(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bs-rate">
              Risk-free rate (% annual)
            </label>
            <input
              className="tool-input"
              id="bs-rate"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="4.5"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="bs-dividend">
              Dividend yield (% annual)
            </label>
            <input
              className="tool-input"
              id="bs-dividend"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="0"
              value={dividend}
              onChange={(e) => setDividend(e.target.value)}
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              {type === "call" ? "CALL" : "PUT"} OPTION PRICE
            </p>
            <div className="tool-result-value">{money.format(result.price)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{num.format(result.delta)}</div>
              <div className="tool-stat-label">Delta (Δ)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{num.format(result.gamma)}</div>
              <div className="tool-stat-label">Gamma (Γ)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{num.format(result.vega)}</div>
              <div className="tool-stat-label">Vega (per 1% vol)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{num.format(result.thetaDaily)}</div>
              <div className="tool-stat-label">Theta (per day)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{num.format(result.rho)}</div>
              <div className="tool-stat-label">Rho (per 1% rate)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{num.format(result.d1)}</div>
              <div className="tool-stat-label">d1</div>
            </div>
          </div>

          <p className="tool-note">
            Black-Scholes-Merton price for a European option, with a continuous
            dividend yield. Vega is shown per 1 percentage-point change in
            volatility, theta as the daily time decay, and rho per 1
            percentage-point change in the rate. Time to expiration uses a
            365-day year. This is a theoretical model estimate, not a live market
            quote or trading advice.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a positive spot price, strike price, days to expiration, and a
          volatility greater than zero to see the option price and Greeks.
        </p>
      )}
    </div>
  );
}
