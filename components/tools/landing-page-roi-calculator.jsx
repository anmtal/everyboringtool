"use client";

import { useState, useMemo } from "react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const num = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const pct = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function LandingPageRoiCalculator() {
  const [visitors, setVisitors] = useState("");
  const [currentRate, setCurrentRate] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [improvedRate, setImprovedRate] = useState("");

  const result = useMemo(() => {
    const v = toNumber(visitors);
    const cr = toNumber(currentRate);
    const aov = toNumber(orderValue);
    const ir = toNumber(improvedRate);

    // Nothing meaningful entered yet
    if (v === null && cr === null && aov === null) {
      return { status: "empty" };
    }
    if (v === null || cr === null || aov === null) {
      return { status: "empty" };
    }

    if (v < 0 || cr < 0 || aov < 0) {
      return {
        status: "error",
        message: "Visitors, conversion rate, and order value can't be negative.",
      };
    }
    if (cr > 100) {
      return {
        status: "error",
        message: "Current conversion rate can't be above 100%.",
      };
    }

    const currentConversions = v * (cr / 100);
    const currentRevenue = currentConversions * aov;

    const stats = [
      {
        label: "Monthly conversions",
        value: num.format(currentConversions),
      },
      {
        label: "Monthly revenue",
        value: usd0.format(currentRevenue),
      },
      {
        label: "Annual revenue",
        value: usd0.format(currentRevenue * 12),
      },
    ];

    let improved = null;
    if (ir !== null) {
      if (ir < 0) {
        return {
          status: "error",
          message: "Improved conversion rate can't be negative.",
        };
      }
      if (ir > 100) {
        return {
          status: "error",
          message: "Improved conversion rate can't be above 100%.",
        };
      }

      const newConversions = v * (ir / 100);
      const newRevenue = newConversions * aov;
      const monthlyUplift = newRevenue - currentRevenue;
      const annualUplift = monthlyUplift * 12;
      const upliftPct =
        currentRevenue > 0 ? (monthlyUplift / currentRevenue) * 100 : null;

      improved = {
        newConversions,
        newRevenue,
        monthlyUplift,
        annualUplift,
        upliftPct,
        stats: [
          {
            label: "New monthly conversions",
            value: num.format(newConversions),
          },
          {
            label: "New monthly revenue",
            value: usd0.format(newRevenue),
          },
          {
            label: "Monthly uplift",
            value:
              (monthlyUplift >= 0 ? "+" : "") + usd0.format(monthlyUplift),
          },
          {
            label: "Annual uplift",
            value: (annualUplift >= 0 ? "+" : "") + usd0.format(annualUplift),
          },
        ],
      };
    }

    return {
      status: "ok",
      currentRevenue,
      stats,
      improved,
    };
  }, [visitors, currentRate, orderValue, improvedRate]);

  const showResult = result.status === "ok";
  const showError = result.status === "error";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="lpr-visitors">
              Monthly visitors
            </label>
            <input
              id="lpr-visitors"
              className="tool-input"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="e.g. 10000"
              value={visitors}
              onChange={(e) => setVisitors(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="lpr-aov">
              Average order value
            </label>
            <input
              id="lpr-aov"
              className="tool-input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 75"
              value={orderValue}
              onChange={(e) => setOrderValue(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="lpr-current-rate">
              Current conversion rate (%)
            </label>
            <input
              id="lpr-current-rate"
              className="tool-input"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="any"
              placeholder="e.g. 2.5"
              value={currentRate}
              onChange={(e) => setCurrentRate(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="lpr-improved-rate">
              Improved conversion rate (%, optional)
            </label>
            <input
              id="lpr-improved-rate"
              className="tool-input"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="any"
              placeholder="e.g. 3.5"
              value={improvedRate}
              onChange={(e) => setImprovedRate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showError && <div className="tool-error">{result.message}</div>}

      {showResult && (
        <>
          <div className="tool-result">
            <div className="tool-result-label">Current monthly revenue</div>
            <div className="tool-result-value">
              {usd.format(result.currentRevenue)}
            </div>
          </div>

          <div className="tool-stat-grid">
            {result.stats.map((stat) => (
              <div className="tool-stat" key={stat.label}>
                <div className="tool-stat-num">{stat.value}</div>
                <div className="tool-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {result.improved && (
            <>
              <div className="tool-result">
                <div className="tool-result-label">
                  Extra revenue from the improvement
                </div>
                <div className="tool-result-value">
                  {(result.improved.annualUplift >= 0 ? "+" : "") +
                    usd.format(result.improved.annualUplift)}
                  <span
                    style={{
                      fontSize: "0.5em",
                      opacity: 0.7,
                      marginLeft: "0.5em",
                    }}
                  >
                    / year
                  </span>
                </div>
              </div>

              <div className="tool-stat-grid">
                {result.improved.stats.map((stat) => (
                  <div className="tool-stat" key={stat.label}>
                    <div className="tool-stat-num">{stat.value}</div>
                    <div className="tool-stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>

              {result.improved.upliftPct !== null && (
                <p className="tool-note">
                  That's a {pct.format(result.improved.upliftPct)}% lift over your
                  current revenue — from the same traffic, just a better
                  converting page.
                </p>
              )}
            </>
          )}
        </>
      )}

      {result.status === "empty" && (
        <p className="tool-note">
          Enter monthly visitors, your current conversion rate, and average order
          value to see your revenue. Add an improved rate to project the uplift
          from optimizing your landing page.
        </p>
      )}
    </div>
  );
}
