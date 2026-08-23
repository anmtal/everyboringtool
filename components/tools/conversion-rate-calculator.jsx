"use client";

import { useState, useMemo } from "react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
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

export default function ConversionRateCalculator() {
  const [visitors, setVisitors] = useState("");
  const [conversions, setConversions] = useState("");
  const [revenue, setRevenue] = useState("");
  const [cost, setCost] = useState("");

  const result = useMemo(() => {
    const v = toNumber(visitors);
    const c = toNumber(conversions);
    const rev = toNumber(revenue);
    const cst = toNumber(cost);

    // Validation
    if (v === null || c === null) {
      return { status: "empty" };
    }
    if (v < 0 || c < 0) {
      return { status: "error", message: "Visitors and conversions can't be negative." };
    }
    if (v === 0) {
      return { status: "error", message: "Enter a visitor count above zero to calculate a rate." };
    }
    if (c > v) {
      return { status: "error", message: "Conversions can't be greater than visitors." };
    }

    const rate = (c / v) * 100;

    const extras = [];
    const hasRevenue = rev !== null && rev >= 0;
    const hasCost = cst !== null && cst >= 0;

    if (hasRevenue) {
      const revPerVisitor = rev / v;
      const revPerConversion = c > 0 ? rev / c : 0;
      extras.push({
        label: "Revenue / visitor",
        value: usd.format(revPerVisitor),
      });
      extras.push({
        label: "Revenue / conversion",
        value: c > 0 ? usd.format(revPerConversion) : "—",
      });
    }

    if (hasRevenue && hasCost) {
      const profit = rev - cst;
      const roi = cst > 0 ? (profit / cst) * 100 : null;
      extras.push({
        label: "Net profit",
        value: usd.format(profit),
      });
      extras.push({
        label: "ROI",
        value: roi === null ? "—" : pct.format(roi) + "%",
      });
    } else if (hasCost) {
      const costPerConversion = c > 0 ? cst / c : 0;
      extras.push({
        label: "Cost / conversion",
        value: c > 0 ? usd.format(costPerConversion) : "—",
      });
      extras.push({
        label: "Cost / visitor",
        value: usd.format(cst / v),
      });
    }

    return { status: "ok", rate, extras };
  }, [visitors, conversions, revenue, cost]);

  const showResult = result.status === "ok";
  const showError = result.status === "error";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="crc-visitors">
              Visitors
            </label>
            <input
              id="crc-visitors"
              className="tool-input"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="e.g. 5000"
              value={visitors}
              onChange={(e) => setVisitors(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="crc-conversions">
              Conversions
            </label>
            <input
              id="crc-conversions"
              className="tool-input"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="e.g. 125"
              value={conversions}
              onChange={(e) => setConversions(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="crc-revenue">
              Revenue (optional)
            </label>
            <input
              id="crc-revenue"
              className="tool-input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 8750"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="crc-cost">
              Cost / ad spend (optional)
            </label>
            <input
              id="crc-cost"
              className="tool-input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 3000"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showError && <div className="tool-error">{result.message}</div>}

      {showResult && (
        <>
          <div className="tool-result">
            <div className="tool-result-label">Conversion rate</div>
            <div className="tool-result-value">{pct.format(result.rate)}%</div>
          </div>

          {result.extras.length > 0 && (
            <div className="tool-stat-grid">
              {result.extras.map((stat) => (
                <div className="tool-stat" key={stat.label}>
                  <div className="tool-stat-num">{stat.value}</div>
                  <div className="tool-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {result.status === "empty" && (
        <p className="tool-note">
          Enter visitors and conversions to get your rate. Add revenue and cost
          to also see revenue per visitor and ROI.
        </p>
      )}
    </div>
  );
}
