"use client";

import { useMemo, useState } from "react";

function parseNumbers(text) {
  if (!text) return [];
  // Split on commas, whitespace, and new lines; keep only valid finite numbers.
  const tokens = text.split(/[\s,]+/).filter((t) => t.length > 0);
  const numbers = [];
  for (const token of tokens) {
    const n = Number(token);
    if (Number.isFinite(n)) numbers.push(n);
  }
  return numbers;
}

function formatNumber(n, maxDecimals = 4) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const rounded = Number(n.toFixed(maxDecimals));
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

function computeStats(numbers) {
  const count = numbers.length;
  if (count === 0) return null;

  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  const mean = sum / count;

  // Median
  let median;
  const mid = Math.floor(count / 2);
  if (count % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    median = sorted[mid];
  }

  // Mode(s) — most frequent value(s). If every value appears equally often,
  // there is no mode.
  const freq = new Map();
  for (const n of numbers) {
    freq.set(n, (freq.get(n) || 0) + 1);
  }
  let maxFreq = 0;
  for (const f of freq.values()) {
    if (f > maxFreq) maxFreq = f;
  }
  let mode = null;
  if (maxFreq > 1 && freq.size < count) {
    const modes = [];
    for (const [value, f] of freq.entries()) {
      if (f === maxFreq) modes.push(value);
    }
    modes.sort((a, b) => a - b);
    mode = modes.map((v) => formatNumber(v)).join(", ");
  }

  const min = sorted[0];
  const max = sorted[count - 1];
  const range = max - min;

  // Population standard deviation
  const variance =
    numbers.reduce((acc, n) => acc + (n - mean) * (n - mean), 0) / count;
  const stdDev = Math.sqrt(variance);

  return {
    count,
    sum,
    mean,
    median,
    mode,
    min,
    max,
    range,
    stdDev,
  };
}

export default function AverageCalculator() {
  const [text, setText] = useState("");

  const { stats, ignored } = useMemo(() => {
    const numbers = parseNumbers(text);
    const totalTokens = text ? text.split(/[\s,]+/).filter((t) => t.length > 0).length : 0;
    return {
      stats: computeStats(numbers),
      ignored: totalTokens - numbers.length,
    };
  }, [text]);

  const loadExample = () => {
    setText("12, 7, 22, 7, 15\n9 30 18 7 25");
  };

  const clearAll = () => setText("");

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="avg-numbers">
            Your numbers
          </label>
          <textarea
            id="avg-numbers"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter numbers separated by commas, spaces, or new lines…&#10;e.g. 12, 7, 22, 7, 15"
            rows={8}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn" onClick={loadExample}>
          Load example
        </button>
        <button
          type="button"
          className="btn"
          onClick={clearAll}
          disabled={!text}
        >
          Clear
        </button>
      </div>

      {!stats ? (
        <p className="tool-note">
          Enter some numbers above and your average and other statistics will
          appear here instantly.
        </p>
      ) : (
        <>
          <div className="tool-result">
            <p className="tool-result-label">Average (mean)</p>
            <div className="tool-result-value">{formatNumber(stats.mean)}</div>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(stats.count)}</div>
              <div className="tool-stat-label">Count</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(stats.sum)}</div>
              <div className="tool-stat-label">Sum</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(stats.mean)}</div>
              <div className="tool-stat-label">Mean</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(stats.median)}</div>
              <div className="tool-stat-label">Median</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{stats.mode === null ? "—" : stats.mode}</div>
              <div className="tool-stat-label">Mode</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(stats.min)}</div>
              <div className="tool-stat-label">Min</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(stats.max)}</div>
              <div className="tool-stat-label">Max</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(stats.range)}</div>
              <div className="tool-stat-label">Range</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatNumber(stats.stdDev)}</div>
              <div className="tool-stat-label">Std. deviation</div>
            </div>
          </div>

          <p className="tool-note">
            {stats.mode === null
              ? "No mode — no value repeats more often than the others. "
              : ""}
            {ignored > 0
              ? `${formatNumber(ignored)} non-numeric ${
                  ignored === 1 ? "token was" : "tokens were"
                } ignored. `
              : ""}
            Standard deviation is calculated for the full population. Everything
            is computed live in your browser.
          </p>
        </>
      )}
    </div>
  );
}
