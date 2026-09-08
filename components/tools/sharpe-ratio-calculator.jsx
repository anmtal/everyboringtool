"use client";

import { useMemo, useState } from "react";

// Periods-per-year used to annualize the Sharpe ratio from periodic returns.
const FREQUENCIES = {
  daily: { label: "Daily (252/yr)", periods: 252 },
  weekly: { label: "Weekly (52/yr)", periods: 52 },
  monthly: { label: "Monthly (12/yr)", periods: 12 },
  quarterly: { label: "Quarterly (4/yr)", periods: 4 },
  yearly: { label: "Yearly (1/yr)", periods: 1 },
};

function parseNumbers(text) {
  // Accept numbers separated by commas, whitespace, or new lines.
  return text
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => parseFloat(t))
    .filter((n) => Number.isFinite(n));
}

export default function SharpeRatioCalculator() {
  const [mode, setMode] = useState("simple"); // "simple" | "series"

  // Simple mode: enter the aggregate figures directly.
  const [portfolioReturn, setPortfolioReturn] = useState("12");
  const [riskFreeRate, setRiskFreeRate] = useState("4");
  const [stdDev, setStdDev] = useState("10");

  // Series mode: paste a list of periodic returns (in %).
  const [returnsText, setReturnsText] = useState(
    "2.1, -1.4, 3.2, 0.8, -0.5, 4.1, 1.7, -2.3, 2.9, 1.1, 0.4, 3.6"
  );
  const [seriesRiskFree, setSeriesRiskFree] = useState("4");
  const [frequency, setFrequency] = useState("monthly");
  const [population, setPopulation] = useState(false);

  const numberFmt = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const simpleResult = useMemo(() => {
    const r = parseFloat(portfolioReturn);
    const rf = parseFloat(riskFreeRate);
    const sd = parseFloat(stdDev);

    if (!Number.isFinite(r) || !Number.isFinite(rf) || !Number.isFinite(sd)) {
      return null;
    }
    if (sd <= 0) {
      return { error: "Standard deviation must be greater than 0." };
    }

    const excess = r - rf;
    const sharpe = excess / sd;
    if (!Number.isFinite(sharpe)) return null;

    return { excess, sharpe };
  }, [portfolioReturn, riskFreeRate, stdDev]);

  const seriesResult = useMemo(() => {
    const values = parseNumbers(returnsText);
    const rfAnnual = parseFloat(seriesRiskFree);

    if (values.length < 2) {
      return { error: "Enter at least 2 periodic returns." };
    }
    if (!Number.isFinite(rfAnnual)) {
      return { error: "Enter a valid annual risk-free rate." };
    }

    const freq = FREQUENCIES[frequency] || FREQUENCIES.monthly;
    const periods = freq.periods;

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;

    // Sample (n-1) vs population (n) standard deviation of the periodic returns.
    const divisor = population ? n : n - 1;
    if (divisor <= 0) {
      return { error: "Need more data points for a sample deviation." };
    }
    const variance =
      values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / divisor;
    const periodStdDev = Math.sqrt(variance);

    if (periodStdDev <= 0) {
      return {
        error: "Returns have no variation (standard deviation is 0).",
      };
    }

    // Per-period risk-free return implied by the annual rate.
    const rfPerPeriod = rfAnnual / periods;
    const periodExcess = mean - rfPerPeriod;

    // Sharpe for one period, then annualized by sqrt(periods).
    const periodSharpe = periodExcess / periodStdDev;
    const annualSharpe = periodSharpe * Math.sqrt(periods);

    // Annualized figures for context.
    const annualReturn = mean * periods;
    const annualStdDev = periodStdDev * Math.sqrt(periods);

    if (!Number.isFinite(annualSharpe)) return null;

    return {
      n,
      mean,
      periodStdDev,
      annualReturn,
      annualStdDev,
      annualSharpe,
      periodsLabel: freq.label,
    };
  }, [returnsText, seriesRiskFree, frequency, population]);

  function rating(sharpe) {
    if (sharpe < 1) return "below 1.0 — considered sub-optimal";
    if (sharpe < 2) return "1.0–2.0 — generally considered good";
    if (sharpe < 3) return "2.0–3.0 — considered very good";
    return "3.0+ — considered excellent";
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="sharpe-mode">
            Calculation method
          </label>
          <select
            className="tool-select"
            id="sharpe-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="simple">
              Simple — I know my return, risk-free rate & std deviation
            </option>
            <option value="series">
              From returns — paste a list of periodic returns
            </option>
          </select>
        </div>

        {mode === "simple" ? (
          <>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sharpe-return">
                  Portfolio return (%)
                </label>
                <input
                  className="tool-input"
                  id="sharpe-return"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="12"
                  value={portfolioReturn}
                  onChange={(e) => setPortfolioReturn(e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sharpe-rf">
                  Risk-free rate (%)
                </label>
                <input
                  className="tool-input"
                  id="sharpe-rf"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="4"
                  value={riskFreeRate}
                  onChange={(e) => setRiskFreeRate(e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sharpe-sd">
                  Std. deviation (%)
                </label>
                <input
                  className="tool-input"
                  id="sharpe-sd"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  placeholder="10"
                  value={stdDev}
                  onChange={(e) => setStdDev(e.target.value)}
                />
              </div>
            </div>
            <p className="tool-note">
              Use figures over the same time horizon (e.g. all annual). The
              Sharpe ratio = (return - risk-free rate) / standard deviation.
            </p>
          </>
        ) : (
          <>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sharpe-series">
                Periodic returns (%), separated by commas, spaces, or new lines
              </label>
              <textarea
                className="tool-textarea"
                id="sharpe-series"
                rows={4}
                placeholder="2.1, -1.4, 3.2, 0.8"
                value={returnsText}
                onChange={(e) => setReturnsText(e.target.value)}
              />
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sharpe-freq">
                  Return frequency
                </label>
                <select
                  className="tool-select"
                  id="sharpe-freq"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  {Object.entries(FREQUENCIES).map(([key, f]) => (
                    <option key={key} value={key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sharpe-series-rf">
                  Annual risk-free rate (%)
                </label>
                <input
                  className="tool-input"
                  id="sharpe-series-rf"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="4"
                  value={seriesRiskFree}
                  onChange={(e) => setSeriesRiskFree(e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sharpe-pop">
                  Std. deviation basis
                </label>
                <select
                  className="tool-select"
                  id="sharpe-pop"
                  value={population ? "population" : "sample"}
                  onChange={(e) => setPopulation(e.target.value === "population")}
                >
                  <option value="sample">Sample (n - 1)</option>
                  <option value="population">Population (n)</option>
                </select>
              </div>
            </div>
            <p className="tool-note">
              The annual risk-free rate is split across the chosen frequency, and
              the per-period Sharpe ratio is annualized by multiplying by the
              square root of the number of periods per year.
            </p>
          </>
        )}
      </div>

      {mode === "simple" ? (
        simpleResult && !simpleResult.error ? (
          <>
            <div className="tool-result" role="status" aria-live="polite">
              <p className="tool-result-label">SHARPE RATIO</p>
              <div className="tool-result-value">
                {numberFmt.format(simpleResult.sharpe)}
              </div>
            </div>
            <div className="tool-stat-grid" role="status" aria-live="polite">
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {numberFmt.format(simpleResult.excess)}%
                </div>
                <div className="tool-stat-label">Excess return</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {numberFmt.format(parseFloat(stdDev))}%
                </div>
                <div className="tool-stat-label">Risk (std. deviation)</div>
              </div>
            </div>
            <p className="tool-note">
              A Sharpe ratio of {numberFmt.format(simpleResult.sharpe)} is{" "}
              {rating(simpleResult.sharpe)}. Higher means more return per unit of
              risk.
            </p>
          </>
        ) : (
          <p className="tool-error" role="status" aria-live="polite">
            {simpleResult?.error ||
              "Enter your return, risk-free rate, and standard deviation to calculate the Sharpe ratio."}
          </p>
        )
      ) : seriesResult && !seriesResult.error ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">ANNUALIZED SHARPE RATIO</p>
            <div className="tool-result-value">
              {numberFmt.format(seriesResult.annualSharpe)}
            </div>
          </div>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{seriesResult.n}</div>
              <div className="tool-stat-label">Data points</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {numberFmt.format(seriesResult.mean)}%
              </div>
              <div className="tool-stat-label">Mean period return</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {numberFmt.format(seriesResult.periodStdDev)}%
              </div>
              <div className="tool-stat-label">Period std. deviation</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {numberFmt.format(seriesResult.annualReturn)}%
              </div>
              <div className="tool-stat-label">Annualized return</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {numberFmt.format(seriesResult.annualStdDev)}%
              </div>
              <div className="tool-stat-label">Annualized volatility</div>
            </div>
          </div>
          <p className="tool-note">
            Based on {seriesResult.n} {seriesResult.periodsLabel.toLowerCase()}{" "}
            returns. A Sharpe ratio of{" "}
            {numberFmt.format(seriesResult.annualSharpe)} is{" "}
            {rating(seriesResult.annualSharpe)}.
          </p>
        </>
      ) : (
        <p className="tool-error" role="status" aria-live="polite">
          {seriesResult?.error ||
            "Paste a list of periodic returns to calculate an annualized Sharpe ratio."}
        </p>
      )}
    </div>
  );
}
