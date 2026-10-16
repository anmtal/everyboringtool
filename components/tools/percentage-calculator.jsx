"use client";

import { useState, useMemo } from "react";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// Rounds to at most maxDecimals places. A small nonzero number is shown to 4
// significant figures instead, so a working line never states a false step
// (e.g. "30 ÷ 0 = 300,000,000" or "234.68 ÷ 0.000004 = 65,188,888").
// Negatives use a real minus sign (U+2212) everywhere, so labels, results and
// working lines in one box never mix "-" and "−".
function formatNumber(n, maxDecimals = 4) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  // `|| 0` turns a rounded -0 into 0.
  const rounded = Number(n.toFixed(maxDecimals)) || 0;
  // Small values (below 0.1 at 4 decimals, below 0.001 at 6) use significant
  // figures: fixed decimals would round 0.00036 to 0.0004 and make a working
  // line false.
  const s =
    n !== 0 && Math.abs(n) < 10 ** (3 - maxDecimals)
      ? n.toLocaleString(undefined, { maximumSignificantDigits: 4 })
      : rounded.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: maxDecimals,
        });
  return s.replace(/-/g, "−");
}

// --- Working-line helpers -------------------------------------------------
// Intermediate decimals (P ÷ 100, X ÷ Y, 1 ± P ÷ 100) keep up to 6 places so
// a percentage typed with 4 decimals still shows its exact decimal form.
const STEP_DECIMALS = 6;

// A number in a working line (formatNumber already uses a real minus sign).
function fw(n, maxDecimals = 4) {
  return formatNumber(n, maxDecimals);
}

// A number that follows an operator: negatives go in brackets, "100 − (−80)".
function fo(n, maxDecimals = 4) {
  const s = fw(n, maxDecimals);
  return s.startsWith("−") ? `(${s})` : s;
}

// A number shown as an absolute value: "|−80|" when negative.
function fabs(n) {
  const s = fw(n);
  return s.startsWith("−") ? `|${s}|` : s;
}

// A signed result: "+25", "−25" or "0".
function fsigned(n) {
  const s = fw(n);
  return n > 0 && s !== "0" ? `+${s}` : s;
}

// --- Calculations (pure) --------------------------------------------------
// Each returns null when an input is missing, { error } when there is no
// answer, or { value, working, ... } when there is one.

// (1) What is P% of Y?
function percentOf(p, y) {
  if (p === null || y === null) return null;
  const value = (p / 100) * y;
  return {
    value,
    working: `${fw(p)} ÷ 100 × ${fo(y)} = ${fw(p / 100, STEP_DECIMALS)} × ${fo(y)} = ${fw(value)}`,
  };
}

// (2) X is what percent of Y?
function whatPercent(part, whole) {
  if (part === null || whole === null) return null;
  if (whole === 0) return { error: "Can't divide by zero." };
  const value = (part / whole) * 100;
  return {
    value,
    working: `${fw(part)} ÷ ${fo(whole)} × 100 = ${fw(part / whole, STEP_DECIMALS)} × 100 = ${fw(value)}%`,
  };
}

// (3) Percentage change from A to B. Divides by |A| so the sign always shows
// the direction, even when the starting value is negative.
function percentChange(a, b) {
  if (a === null || b === null) return null;
  if (a === 0) return { error: "Change from zero can't be expressed as a percent." };
  const diff = b - a;
  const value = (diff / Math.abs(a)) * 100;
  return {
    value,
    diff,
    working: `(${fw(b)} − ${fo(a)}) ÷ ${fabs(a)} × 100 = ${fw(diff)} ÷ ${fw(Math.abs(a))} × 100 = ${fsigned(value)}%`,
  };
}

// (4) X increased or decreased by P%.
function addSubtract(x, p, mode) {
  if (x === null || p === null) return null;
  const down = mode === "decrease";
  const factor = down ? 1 - p / 100 : 1 + p / 100;
  const value = x * factor;
  const delta = (down ? -1 : 1) * ((x * p) / 100);
  return {
    value,
    delta,
    working: `${fw(x)} × (1 ${down ? "−" : "+"} ${fo(p)} ÷ 100) = ${fw(x)} × ${fo(factor, STEP_DECIMALS)} = ${fw(value)}`,
  };
}

// (5) X is P% of what number?
function reversePercent(x, p) {
  if (x === null || p === null) return null;
  if (p === 0) {
    return x === 0
      ? { error: "0 is 0% of every number, so there's no single answer." }
      : { error: "A percentage of 0 can't give you that number, so there is no answer." };
  }
  const value = (x * 100) / p;
  return {
    value,
    working: `${fw(x)} ÷ (${fw(p)} ÷ 100) = ${fw(x)} ÷ ${fo(p / 100, STEP_DECIMALS)} = ${fw(value)}`,
  };
}

// (6) Percentage difference: |A − B| ÷ average(|A|, |B|) × 100. Symmetric.
function percentDifference(a, b) {
  if (a === null || b === null) return null;
  if (a === b) {
    return { value: 0, working: "the two values are equal, so the difference is 0%." };
  }
  const gap = Math.abs(a - b);
  const mean = (Math.abs(a) + Math.abs(b)) / 2;
  const value = (gap / mean) * 100;
  return {
    value,
    working: `|${fw(a)} − ${fo(b)}| ÷ ((${fabs(a)} + ${fabs(b)}) ÷ 2) × 100 = ${fw(gap)} ÷ ${fw(mean)} × 100 = ${fw(value)}%`,
  };
}

const QUICK_PERCENTS = [1, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100];

// Literal strings (no locale formatting) so this table is identical wherever
// it renders.
const CONVERSIONS = [
  ["1%", "0.01", "1/100"],
  ["5%", "0.05", "1/20"],
  ["10%", "0.1", "1/10"],
  ["12.5%", "0.125", "1/8"],
  ["20%", "0.2", "1/5"],
  ["25%", "0.25", "1/4"],
  ["33⅓%", "0.333…", "1/3"],
  ["40%", "0.4", "2/5"],
  ["50%", "0.5", "1/2"],
  ["60%", "0.6", "3/5"],
  ["66⅔%", "0.666…", "2/3"],
  ["75%", "0.75", "3/4"],
  ["80%", "0.8", "4/5"],
  ["100%", "1", "1/1"],
  ["150%", "1.5", "3/2"],
];

const H2_STYLE = { margin: 0, fontSize: 16 };
const H3_STYLE = { margin: 0, fontSize: 14 };
const DIVIDER = { borderTop: "1px solid var(--border)", paddingTop: 16 };
// Working lines sit inside the result box but outside its aria-live region, so
// screen readers announce the answer, not the long working, on each keystroke.
// overflowWrap lets a very long number wrap instead of widening the box.
const WORKING_STYLE = { overflowWrap: "anywhere" };
const WRAP_TH = { whiteSpace: "normal" };

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

  // Section 4: Add or subtract a percentage
  const [num4, setNum4] = useState("");
  const [pct4, setPct4] = useState("");
  const [mode4, setMode4] = useState("increase");

  // Section 5: X is P% of what number?
  const [part5, setPart5] = useState("");
  const [pct5, setPct5] = useState("");

  // Section 6: Percentage difference
  const [a6, setA6] = useState("");
  const [b6, setB6] = useState("");

  const result1 = useMemo(() => percentOf(toNumber(pct1), toNumber(base1)), [pct1, base1]);
  const result2 = useMemo(() => whatPercent(toNumber(part2), toNumber(whole2)), [part2, whole2]);
  const result3 = useMemo(() => percentChange(toNumber(from3), toNumber(to3)), [from3, to3]);
  const result4 = useMemo(
    () => addSubtract(toNumber(num4), toNumber(pct4), mode4),
    [num4, pct4, mode4]
  );
  const result5 = useMemo(() => reversePercent(toNumber(part5), toNumber(pct5)), [part5, pct5]);
  const result6 = useMemo(() => percentDifference(toNumber(a6), toNumber(b6)), [a6, b6]);

  const y1 = toNumber(base1);
  const p1 = toNumber(pct1);
  const x4 = toNumber(num4);
  const p4 = toNumber(pct4);
  const down4 = mode4 === "decrease";

  return (
    <div className="tool">
      {/* Section 1 — What is P% of a number? */}
      <div className="tool-fields">
        <h2 className="tool-h2" style={H2_STYLE}>What is P% of a number?</h2>
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pct1">Percentage (P%)</label>
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
            <label className="tool-label" htmlFor="base1">Number</label>
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
        <div className="tool-result">
          <div role="status" aria-live="polite" style={{ overflowWrap: "anywhere" }}>
            <p className="tool-result-label">
              {result1
                ? `${formatNumber(p1)}% of ${formatNumber(y1)} is`
                : "Result"}
            </p>
            <div className="tool-result-value">{formatNumber(result1 ? result1.value : null)}</div>
          </div>
          {result1 && <p className="tool-note" style={WORKING_STYLE}>Working: {result1.working}</p>}
        </div>
        {y1 !== null && (
          // minWidth 0 lets this grid item shrink so the table scrolls inside
          // its wrap instead of widening the page on phones.
          <div style={{ minWidth: 0 }}>
            <h3 className="tool-h2" style={H3_STYLE}>Percentages of {formatNumber(y1)}</h3>
            <div className="csc-table-wrap" style={{ marginTop: 8 }}>
              <table className="csc-table">
                <thead>
                  <tr>
                    <th>Percent</th>
                    <th>Amount</th>
                    {/* Short headers that may wrap, so a long number in them
                        doesn't push the table past a phone-width card. */}
                    <th style={WRAP_TH}>{formatNumber(y1)} + %</th>
                    <th style={WRAP_TH}>{formatNumber(y1)} − %</th>
                  </tr>
                </thead>
                <tbody>
                  {QUICK_PERCENTS.map((r) => {
                    const amount = (r / 100) * y1;
                    return (
                      <tr key={r} className={p1 === r ? "is-match" : ""}>
                        <td>{r}%</td>
                        <td>{formatNumber(amount)}</td>
                        <td>{formatNumber(y1 + amount)}</td>
                        <td>{formatNumber(y1 - amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Section 2 — X is what percent of Y? */}
      <div className="tool-fields" style={DIVIDER}>
        <h2 className="tool-h2" style={H2_STYLE}>X is what percent of Y?</h2>
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
          <div className="tool-result">
            <div role="status" aria-live="polite" style={{ overflowWrap: "anywhere" }}>
              <p className="tool-result-label">
                {result2
                  ? `${formatNumber(toNumber(part2))} is this percent of ${formatNumber(toNumber(whole2))}`
                  : "Result"}
              </p>
              <div className="tool-result-value">
                {result2 ? `${formatNumber(result2.value)}%` : "—"}
              </div>
            </div>
            {result2 && <p className="tool-note" style={WORKING_STYLE}>Working: {result2.working}</p>}
          </div>
        )}
      </div>

      {/* Section 3 — Percentage change from X to Y */}
      <div className="tool-fields" style={DIVIDER}>
        <h2 className="tool-h2" style={H2_STYLE}>Percentage change: increase or decrease from X to Y</h2>
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
          <div className="tool-result">
            <div role="status" aria-live="polite" style={{ overflowWrap: "anywhere" }}>
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
            {result3 && <p className="tool-note" style={WORKING_STYLE}>Working: {result3.working}</p>}
          </div>
        )}
      </div>

      {/* Section 4 — Add or subtract a percentage */}
      <div className="tool-fields" style={DIVIDER}>
        <h2 className="tool-h2" style={H2_STYLE}>Add or subtract a percentage</h2>
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="num4">Number</label>
            <input
              className="tool-input"
              id="num4"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 200"
              value={num4}
              onChange={(e) => setNum4(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pct4">Percentage (%)</label>
            <input
              className="tool-input"
              id="pct4"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 15"
              value={pct4}
              onChange={(e) => setPct4(e.target.value)}
            />
          </div>
        </div>
        <div
          className="seg-toggle"
          role="group"
          aria-label="Increase or decrease"
          style={{ justifySelf: "start" }}
        >
          <button
            type="button"
            aria-pressed={!down4}
            className={`seg-btn ${!down4 ? "is-active" : ""}`}
            onClick={() => setMode4("increase")}
          >
            Increase (+)
          </button>
          <button
            type="button"
            aria-pressed={down4}
            className={`seg-btn ${down4 ? "is-active" : ""}`}
            onClick={() => setMode4("decrease")}
          >
            Decrease (−)
          </button>
        </div>
        <div className="tool-result">
          <div role="status" aria-live="polite" style={{ overflowWrap: "anywhere" }}>
            <p className="tool-result-label">
              {result4
                ? `${formatNumber(x4)} ${down4 ? "decreased" : "increased"} by ${formatNumber(p4)}% is`
                : "Result"}
            </p>
            <div className="tool-result-value">{formatNumber(result4 ? result4.value : null)}</div>
            {result4 && <p className="tool-note">Change: {fsigned(result4.delta)}</p>}
            {result4 && down4 && p4 > 100 && x4 > 0 && (
              <p className="tool-note">A decrease of more than 100% goes below zero.</p>
            )}
          </div>
          {result4 && <p className="tool-note" style={WORKING_STYLE}>Working: {result4.working}</p>}
        </div>
      </div>

      {/* Section 5 — X is P% of what number? (reverse percentage) */}
      <div className="tool-fields" style={DIVIDER}>
        <h2 className="tool-h2" style={H2_STYLE}>X is P% of what number?</h2>
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="part5">Value (X)</label>
            <input
              className="tool-input"
              id="part5"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 30"
              value={part5}
              onChange={(e) => setPart5(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pct5">Percentage (P%)</label>
            <input
              className="tool-input"
              id="pct5"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 15"
              value={pct5}
              onChange={(e) => setPct5(e.target.value)}
            />
          </div>
        </div>
        {result5 && result5.error ? (
          <p className="tool-error" role="alert">{result5.error}</p>
        ) : (
          <div className="tool-result">
            <div role="status" aria-live="polite" style={{ overflowWrap: "anywhere" }}>
              <p className="tool-result-label">
                {result5
                  ? `${formatNumber(toNumber(part5))} is ${formatNumber(toNumber(pct5))}% of`
                  : "Result"}
              </p>
              <div className="tool-result-value">{formatNumber(result5 ? result5.value : null)}</div>
            </div>
            {result5 && <p className="tool-note" style={WORKING_STYLE}>Working: {result5.working}</p>}
          </div>
        )}
        <p className="tool-note">
          Tip: to remove a percentage that was already added, enter 100 + that percent. A $54 total including 8% tax:
          54 is 108% of 50.
        </p>
      </div>

      {/* Section 6 — Percentage difference between two numbers */}
      <div className="tool-fields" style={DIVIDER}>
        <h2 className="tool-h2" style={H2_STYLE}>Percentage difference between two numbers</h2>
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="a6">Value A</label>
            <input
              className="tool-input"
              id="a6"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 10"
              value={a6}
              onChange={(e) => setA6(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="b6">Value B</label>
            <input
              className="tool-input"
              id="b6"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 6"
              value={b6}
              onChange={(e) => setB6(e.target.value)}
            />
          </div>
        </div>
        <div className="tool-result">
          <div role="status" aria-live="polite" style={{ overflowWrap: "anywhere" }}>
            <p className="tool-result-label">
              {result6
                ? `Difference between ${formatNumber(toNumber(a6))} and ${formatNumber(toNumber(b6))}`
                : "Result"}
            </p>
            <div className="tool-result-value">
              {result6 ? `${formatNumber(result6.value)}%` : "—"}
            </div>
          </div>
          {result6 && <p className="tool-note" style={WORKING_STYLE}>Working: {result6.working}</p>}
        </div>
        <p className="tool-note">
          Order doesn't matter. To measure a change from an old value to a new one, use Percentage change above.
        </p>
      </div>

      {/* Static reference: common percentages as decimals and fractions */}
      <div className="tool-fields" style={DIVIDER}>
        <h2 className="tool-h2" style={H2_STYLE}>Common percentages as decimals and fractions</h2>
        <div className="csc-table-wrap" style={{ marginTop: 0, minWidth: 0 }}>
          <table className="csc-table">
            <thead>
              <tr>
                <th>Percent</th>
                <th>Decimal</th>
                <th>Fraction</th>
              </tr>
            </thead>
            <tbody>
              {CONVERSIONS.map(([pct, dec, frac]) => (
                <tr key={pct}>
                  <td>{pct}</td>
                  <td>{dec}</td>
                  <td>{frac}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tool-note">
          Results are rounded to at most 4 decimal places; a number between −0.1 and 0.1 is given to 4
          significant figures.
        </p>
      </div>
    </div>
  );
}
