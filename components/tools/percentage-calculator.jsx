"use client";

import { useState, useMemo } from "react";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function formatNumber(n, maxDecimals = 4) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const rounded = Number(n.toFixed(maxDecimals));
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

export default function PercentageCalculator() {
  // Section 1: What is X% of Y?
  const [pct1, setPct1] = useState("");
  const [base1, setBase1] = useState("");

  // Section 2: X is what percent of Y?
  const [part2, setPart2] = useState("");
  const [whole2, setWhole2] = useState("");

  // Section 3: Percentage change from X to Y
  const [from3, setFrom3] = useState("");
  const [to3, setTo3] = useState("");

  const result1 = useMemo(() => {
    const p = toNumber(pct1);
    const b = toNumber(base1);
    if (p === null || b === null) return null;
    return (p / 100) * b;
  }, [pct1, base1]);

  const result2 = useMemo(() => {
    const part = toNumber(part2);
    const whole = toNumber(whole2);
    if (part === null || whole === null) return null;
    if (whole === 0) return { error: "Can't divide by zero." };
    return { value: (part / whole) * 100 };
  }, [part2, whole2]);

  const result3 = useMemo(() => {
    const a = toNumber(from3);
    const b = toNumber(to3);
    if (a === null || b === null) return null;
    if (a === 0) return { error: "Change from zero can't be expressed as a percent." };
    const change = ((b - a) / Math.abs(a)) * 100;
    return { value: change, diff: b - a };
  }, [from3, to3]);

  return (
    <div className="tool">
      {/* Section 1 — What is X% of Y? */}
      <div className="tool-fields">
        <p className="tool-note">What is X% of Y?</p>
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pct1">Percentage (X%)</label>
            <input
              className="tool-input"
              id="pct1"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 15"
              value={pct1}
              onChange={(e) => setPct1(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="base1">Of value (Y)</label>
            <input
              className="tool-input"
              id="base1"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 200"
              value={base1}
              onChange={(e) => setBase1(e.target.value)}
            />
          </div>
        </div>
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">
            {toNumber(pct1) !== null && toNumber(base1) !== null
              ? `${formatNumber(toNumber(pct1))}% of ${formatNumber(toNumber(base1))} is`
              : "Result"}
          </p>
          <div className="tool-result-value">{formatNumber(result1)}</div>
        </div>
      </div>

      {/* Section 2 — X is what percent of Y? */}
      <div className="tool-fields">
        <p className="tool-note">X is what percent of Y?</p>
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="part2">Value (X)</label>
            <input
              className="tool-input"
              id="part2"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 30"
              value={part2}
              onChange={(e) => setPart2(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="whole2">Out of (Y)</label>
            <input
              className="tool-input"
              id="whole2"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 120"
              value={whole2}
              onChange={(e) => setWhole2(e.target.value)}
            />
          </div>
        </div>
        {result2 && result2.error ? (
          <p className="tool-error" role="alert">{result2.error}</p>
        ) : (
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              {result2
                ? `${formatNumber(toNumber(part2))} is this percent of ${formatNumber(toNumber(whole2))}`
                : "Result"}
            </p>
            <div className="tool-result-value">
              {result2 ? `${formatNumber(result2.value)}%` : "—"}
            </div>
          </div>
        )}
      </div>

      {/* Section 3 — Percentage change from X to Y */}
      <div className="tool-fields">
        <p className="tool-note">Percentage change from X to Y</p>
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="from3">Starting value (X)</label>
            <input
              className="tool-input"
              id="from3"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 80"
              value={from3}
              onChange={(e) => setFrom3(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="to3">Ending value (Y)</label>
            <input
              className="tool-input"
              id="to3"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 100"
              value={to3}
              onChange={(e) => setTo3(e.target.value)}
            />
          </div>
        </div>
        {result3 && result3.error ? (
          <p className="tool-error" role="alert">{result3.error}</p>
        ) : (
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              {result3
                ? result3.value > 0
                  ? "Increase"
                  : result3.value < 0
                  ? "Decrease"
                  : "No change"
                : "Result"}
            </p>
            <div className="tool-result-value">
              {result3
                ? `${result3.value > 0 ? "+" : ""}${formatNumber(result3.value)}%`
                : "—"}
            </div>
            {result3 && (
              <p className="tool-note">
                {`${result3.diff > 0 ? "+" : ""}${formatNumber(result3.diff)} from ${formatNumber(
                  toNumber(from3)
                )} to ${formatNumber(toNumber(to3))}`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
