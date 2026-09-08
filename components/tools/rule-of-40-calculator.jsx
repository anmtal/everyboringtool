"use client";

import { useMemo, useState } from "react";

const MARGIN_METRICS = [
  { value: "ebitda", label: "EBITDA margin" },
  { value: "fcf", label: "Free cash flow margin" },
  { value: "operating", label: "Operating (EBIT) margin" },
  { value: "net", label: "Net profit margin" },
];

const pctFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function verdictFor(score) {
  if (score >= 40) {
    return {
      tone: "good",
      label: "Passes the Rule of 40",
      note:
        "Growth and profitability together clear the 40% bar. The mix of expansion and margin is considered healthy and efficient.",
    };
  }
  if (score >= 30) {
    return {
      tone: "warn",
      label: "Close, but below 40",
      note:
        "You are within striking distance. A few points of extra growth or margin would tip this over the line.",
    };
  }
  return {
    tone: "bad",
    label: "Below the Rule of 40",
    note:
      "The combined score is under 40%. Investors typically read this as growth that is too costly, or margin that is too thin for the growth on offer.",
  };
}

export default function RuleOf40Calculator() {
  const [growthMode, setGrowthMode] = useState("direct"); // direct | revenue
  const [growth, setGrowth] = useState("35");
  const [priorRevenue, setPriorRevenue] = useState("");
  const [currentRevenue, setCurrentRevenue] = useState("");
  const [margin, setMargin] = useState("10");
  const [metric, setMetric] = useState("ebitda");

  const derivedGrowth = useMemo(() => {
    if (growthMode !== "revenue") return null;
    const prior = toNumber(priorRevenue);
    const current = toNumber(currentRevenue);
    if (prior === null || prior <= 0) return null;
    if (current === null) return null;
    return ((current - prior) / prior) * 100;
  }, [growthMode, priorRevenue, currentRevenue]);

  const growthValue = useMemo(() => {
    if (growthMode === "revenue") return derivedGrowth;
    return toNumber(growth);
  }, [growthMode, growth, derivedGrowth]);

  const marginValue = toNumber(margin);

  const result = useMemo(() => {
    if (growthValue === null || marginValue === null) return null;
    const score = growthValue + marginValue;
    const gap = score - 40;
    return {
      score,
      growth: growthValue,
      margin: marginValue,
      gap,
      verdict: verdictFor(score),
    };
  }, [growthValue, marginValue]);

  const metricLabel =
    MARGIN_METRICS.find((m) => m.value === metric)?.label || "profit margin";

  const revenueInvalid =
    growthMode === "revenue" &&
    toNumber(priorRevenue) !== null &&
    toNumber(priorRevenue) <= 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="r40-growth-mode">
              Revenue growth input
            </label>
            <select
              className="tool-select"
              id="r40-growth-mode"
              value={growthMode}
              onChange={(e) => setGrowthMode(e.target.value)}
            >
              <option value="direct">Enter growth rate directly</option>
              <option value="revenue">Calculate from two revenue figures</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="r40-metric">
              Profitability metric
            </label>
            <select
              className="tool-select"
              id="r40-metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            >
              {MARGIN_METRICS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {growthMode === "direct" ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="r40-growth">
                Year-over-year revenue growth (%)
              </label>
              <input
                className="tool-input"
                id="r40-growth"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={growth}
                onChange={(e) => setGrowth(e.target.value)}
                placeholder="35"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="r40-margin">
                {metricLabel} (%)
              </label>
              <input
                className="tool-input"
                id="r40-margin"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                placeholder="10"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="r40-prior">
                  Prior period revenue
                </label>
                <input
                  className="tool-input"
                  id="r40-prior"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={priorRevenue}
                  onChange={(e) => setPriorRevenue(e.target.value)}
                  placeholder="e.g. 8000000"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="r40-current">
                  Current period revenue
                </label>
                <input
                  className="tool-input"
                  id="r40-current"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={currentRevenue}
                  onChange={(e) => setCurrentRevenue(e.target.value)}
                  placeholder="e.g. 10800000"
                />
              </div>
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="r40-margin2">
                  {metricLabel} (%)
                </label>
                <input
                  className="tool-input"
                  id="r40-margin2"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {revenueInvalid ? (
        <p className="tool-error">
          Prior period revenue must be greater than zero to calculate a growth
          rate.
        </p>
      ) : null}

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Rule of 40 score</p>
            <div className="tool-result-value">
              {pctFmt.format(result.score)}%
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {pctFmt.format(result.growth)}%
              </div>
              <div className="tool-stat-label">Revenue growth</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {pctFmt.format(result.margin)}%
              </div>
              <div className="tool-stat-label">{metricLabel}</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.gap >= 0 ? "+" : ""}
                {pctFmt.format(result.gap)}
              </div>
              <div className="tool-stat-label">Points vs. 40 target</div>
            </div>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">{result.verdict.label}</p>
            <p className="tool-note">{result.verdict.note}</p>
          </div>

          <p className="tool-note">
            Rule of 40 score = revenue growth rate + profit margin. The idea,
            popular for evaluating SaaS and growth companies, is that a healthy
            business should have the two add up to at least 40%. High growth can
            justify thin (or negative) margins, and strong margins can offset
            slower growth. Pick the margin metric your investors use — EBITDA and
            free cash flow are the most common.
          </p>
        </>
      ) : !revenueInvalid ? (
        <p className="tool-note">
          {growthMode === "revenue"
            ? "Enter your prior and current period revenue plus your profit margin to see the Rule of 40 score."
            : "Enter your revenue growth rate and profit margin to see the Rule of 40 score."}
        </p>
      ) : null}
    </div>
  );
}
